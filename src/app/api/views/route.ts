// app/api/views/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { candidateId } = await req.json();
    if (!candidateId) return NextResponse.json({ ok: false }, { status: 200 });

    const supa = await createClientServer();
    const { data: { user } } = await supa.auth.getUser();
    const ua = req.headers.get("user-agent") ?? undefined;
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0] || undefined;

    await supa.from("candidate_views").insert({
      candidate_id: candidateId,
      viewer_id: user?.id ?? null,
      user_agent: ua,
      ip,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Ne casse jamais l'UI
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
