import { NextRequest, NextResponse } from "next/server";
import { createClientAction } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/admin/report
// body: { candidate_id: string, reason?: string }
export async function POST(req: NextRequest) {
  try {
    const { candidate_id, reason } = await req.json();
    if (!candidate_id || typeof candidate_id !== "string") {
      return NextResponse.json({ error: "candidate_id is required" }, { status: 400 });
    }

    const supabase = await createClientAction();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Simple rate-limit: max 1 report per candidate per user within 10 minutes
    const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", candidate_id)
      .gte("created_at", sinceIso);

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { error } = await supabase
      .from("reports")
      .insert({ candidate_id, reason: String(reason ?? ""), status: "pending" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}