import { NextRequest, NextResponse } from "next/server";
import { createClientAction } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { candidate_id, note } = await req.json();
    if (!candidate_id || typeof candidate_id !== "string") {
      return NextResponse.json({ ok: false, error: "candidate_id requis" }, { status: 400 });
    }

    const supabase = await createClientAction();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });

    const { error } = await supabase
      .from("favorite_notes")
      .upsert(
        { candidate_id, user_id: user.id, note: String(note ?? "") },
        { onConflict: "candidate_id,user_id" }
      );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { candidate_id } = await req.json();
    if (!candidate_id || typeof candidate_id !== "string") {
      return NextResponse.json({ ok: false, error: "candidate_id requis" }, { status: 400 });
    }

    const supabase = await createClientAction();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });

    const { error } = await supabase
      .from("favorite_notes")
      .delete()
      .eq("candidate_id", candidate_id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide" }, { status: 400 });
  }
}