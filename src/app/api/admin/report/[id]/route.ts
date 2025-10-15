import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// PATCH /api/admin/report/[id]
// body: { status: "pending" | "reviewed" | "resolved" }
export async function PATCH(req: Request, context: unknown) {
  try {
    const { id } = (context as { params?: { id?: string } })?.params ?? {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const payload = await req.json().catch(() => ({}));
    const status = String(payload?.status || "").trim();
    if (!["pending", "reviewed", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // 1) Auth: ensure caller is admin
    const supa = await createClientServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: me } = await supa
      .from("users_public")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (me?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Update with service role
    const admin = createAdminClient();
    const { data: before } = await admin
      .from("reports")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin
      .from("reports")
      .update({ status })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 3) Optional logging
    try {
      const old_status = before?.status ?? null;
      await admin
        .from("events_admin")
        .insert({
          type: "report_status_change",
          report_id: id,
          admin_id: user.id,
          old_status,
          new_status: status,
        });
    } catch {
      // swallow logging errors
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}