'use server';

import { createClientAction } from "@/lib/supabase/server";

export async function toggleFavorite(candidateId: string): Promise<{ isFavorited: boolean }> {
  if (!candidateId) return { isFavorited: false };
  const supabase = await createClientAction();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isFavorited: false };

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("user_id", user.id)
    .limit(1);

  if ((existing || []).length > 0) {
    await supabase
      .from("favorites")
      .delete()
      .eq("candidate_id", candidateId)
      .eq("user_id", user.id);
    return { isFavorited: false };
  }

  await supabase
    .from("favorites")
    .upsert(
      { candidate_id: candidateId, user_id: user.id },
      { onConflict: "candidate_id,user_id", ignoreDuplicates: true }
    );
  return { isFavorited: true };
}