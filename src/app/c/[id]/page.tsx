import { createClientServer, createClientAction } from "@/lib/supabase/server";
import ViewTracker from "./ViewTracker";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import LikeButtonApi from "@/components/LikeButtonApi";
import { toggleFavorite as toggleFavoriteServer } from "@/app/actions/toggle-favorite";
export const runtime = "nodejs";

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClientServer();
  const { id } = await params;
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, user_id, headline, location, about, skills, visibility, cv_path")
    .eq("id", id)
    .single();
  if (!candidate) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  if (candidate.visibility === "private" && (!user || user.id !== candidate.user_id)) {
    notFound();
  }

  const cvPath = candidate?.cv_path ?? null;
  async function getCv() {
    "use server";
    const supabase = await createClientAction();
    if (!cvPath) return;
    const { data } = await supabase.storage.from("cvs").createSignedUrl(cvPath, 60);
    if (data?.signedUrl) redirect(data.signedUrl);
  }

  const candidateId = candidate?.id ?? null;

  let initialLiked = false;
  if (user) {
    const { data: likedRow } = await supabase
      .from("candidate_likes")
      .select("id")
      .eq("candidate_id", candidate.id)
      .eq("user_id", user.id)
      .limit(1);
    initialLiked = (likedRow || []).length > 0;
  }

  const { count: likesCount } = await supabase
    .from("candidate_likes")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidate.id);

  // Initial favorite state
  let initialFavorited = false;
  if (user && candidateId) {
    const { data: favRow } = await supabase
      .from("favorites")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("user_id", user.id)
      .limit(1);
    initialFavorited = (favRow || []).length > 0;
  }

  async function toggleFavorite() {
    "use server";
    if (!candidateId) return;
    await toggleFavoriteServer(candidateId);
    revalidatePath(`/c/${candidateId}`);
  }

  return (
    <div className="space-y-6">
      {candidateId && <ViewTracker candidateId={candidateId} />}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{candidate.headline}</h1>
          <p className="text-sm text-muted-foreground">{candidate.location}</p>
        </div>
        <form action={getCv}>
          <Button type="submit" variant="outline" disabled={!cvPath}>Get CV</Button>
        </form>
      </div>
      {candidate.about && <p className="text-sm whitespace-pre-wrap">{candidate.about}</p>}
      <div className="flex flex-wrap gap-2">
        {(candidate.skills || []).map((s: string) => (
          <span key={s} className="text-xs border rounded px-2 py-0.5">{s}</span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {candidateId && <LikeButtonApi liked={initialLiked} candidateId={candidateId} />}
        <span className="text-sm text-muted-foreground">{likesCount || 0} likes</span>
        {candidateId && (
          <form action={toggleFavorite}>
            <Button type="submit" variant="secondary">
              {initialFavorited ? "Remove favorite" : "Add to favorites"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}