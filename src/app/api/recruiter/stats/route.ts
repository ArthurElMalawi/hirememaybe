import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function clampDays(v: string | null): 7 | 30 {
  const n = Number((v || "").trim());
  return n === 30 ? 30 : 7;
}

export async function GET(req: Request) {
  try {
    const supabase = await createClientServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const days = clampDays(url.searchParams.get("days"));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sinceIso = since.toISOString();

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_recruiter_stats", { days });
    if (!rpcError && rpcData && typeof rpcData === "object") {
      return NextResponse.json({ stats: rpcData }, { status: 200 });
    }

    // Fallback: compute from tables
    const [{ count: favCount }, { count: viewsCount }, { data: sentRows }, { data: approvedRows }] = await Promise.all([
      supabase
        .from("favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", sinceIso),
      supabase
        .from("candidate_views")
        .select("id", { count: "exact", head: true })
        .eq("viewer_id", user.id)
        .gte("created_at", sinceIso),
      supabase
        .from("contact_requests")
        .select("id, created_at, updated_at")
        .eq("requester_id", user.id)
        .gte("created_at", sinceIso),
      supabase
        .from("contact_requests")
        .select("id, created_at, updated_at")
        .eq("requester_id", user.id)
        .eq("status", "approved")
        .gte("created_at", sinceIso),
    ]);

    const sent = (sentRows || []).length;
    const approved = (approvedRows || []).length;
    const acceptance_rate = sent > 0 ? Math.round((approved / sent) * 100) : 0;

    // avg time to decision in hours (created_at -> updated_at) for decided requests in period
    const decidedRows = (sentRows || []).filter((r: Record<string, unknown>) => typeof r["updated_at"] === "string");
    let avg_time_to_decision = 0;
    if (decidedRows.length) {
      const hours = decidedRows.map((r) => {
        const c = new Date(String(r["created_at"]))
        const u = new Date(String(r["updated_at"]))
        return Math.max(0, (u.getTime() - c.getTime()) / (1000 * 60 * 60));
      });
      avg_time_to_decision = Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10;
    }

    return NextResponse.json({
      stats: {
        favorites_added: Number(favCount ?? 0),
        profiles_viewed: Number(viewsCount ?? 0),
        contact_requests_sent: sent,
        contact_requests_approved: approved,
        acceptance_rate,
        avg_time_to_decision,
      },
      note: rpcError ? "fallback_no_rpc" : undefined,
    }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}