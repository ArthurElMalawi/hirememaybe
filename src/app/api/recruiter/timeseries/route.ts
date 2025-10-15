import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function clampDays(v: string | null): 7 | 30 {
  const n = Number((v || "").trim());
  return n === 30 ? 30 : 7;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_recruiter_timeseries", { days });
    if (!rpcError && Array.isArray(rpcData)) {
      return NextResponse.json({ items: rpcData }, { status: 200 });
    }

    // Fallback: aggregate daily from base tables
    const [favRowsRes, viewRowsRes, sentRowsRes] = await Promise.all([
      supabase.from("favorites").select("created_at").eq("user_id", user.id).gte("created_at", sinceIso),
      supabase.from("candidate_views").select("created_at").eq("viewer_id", user.id).gte("created_at", sinceIso),
      supabase.from("contact_requests").select("created_at").eq("requester_id", user.id).gte("created_at", sinceIso),
    ]);

    const favRows = (favRowsRes.data || []) as { created_at: string }[];
    const viewRows = (viewRowsRes.data || []) as { created_at: string }[];
    const sentRows = (sentRowsRes.data || []) as { created_at: string }[];

    const map = new Map<string, { favorites_added: number; profiles_viewed: number; contact_requests_sent: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      map.set(formatDate(d), { favorites_added: 0, profiles_viewed: 0, contact_requests_sent: 0 });
    }

    favRows.forEach((r) => {
      const k = formatDate(new Date(r.created_at));
      const v = map.get(k);
      if (v) v.favorites_added += 1;
    });
    viewRows.forEach((r) => {
      const k = formatDate(new Date(r.created_at));
      const v = map.get(k);
      if (v) v.profiles_viewed += 1;
    });
    sentRows.forEach((r) => {
      const k = formatDate(new Date(r.created_at));
      const v = map.get(k);
      if (v) v.contact_requests_sent += 1;
    });

    const items = Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
    return NextResponse.json({ items, note: rpcError ? "fallback_no_rpc" : undefined }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}