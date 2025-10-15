import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /api/admin/reports?status=pending|reviewed|resolved
export async function GET(req: Request) {
  try {
    // 1) Auth: ensure caller is an admin user
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

    // 2) Fetch with service role (no RLS restrictions)
    const admin = createAdminClient();
    const url = new URL(req.url);
    const statusParam = (url.searchParams.get("status") || "").trim();
    const allowed = ["pending", "reviewed", "resolved"];
    const statusFilter = allowed.includes(statusParam) ? statusParam : undefined;

    let query = admin
      .from("reports")
      .select("id, candidate_id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}