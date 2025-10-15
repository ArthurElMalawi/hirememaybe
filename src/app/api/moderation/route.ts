// app/api/moderation/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const { reportId, status } = await req.json(); // "open" | "reviewed" | "resolved"
    if (!reportId || !["open","reviewed","resolved"].includes(status)) {
      return NextResponse.json({ error: "Bad payload" }, { status: 400 });
    }

    // 1) Vérifier que l'appelant est admin (client standard, RLS)
    const supa = await createClientServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    const { data: me } = await supa
      .from("users_public")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (me?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Effectuer l'update avec la service role
    const admin = createAdminClient();
    const { error } = await admin
      .from("reports")
      .update({ status })
      .eq("id", reportId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
