import { createClientServer } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import FavoriteList from "@/components/recruiter/FavoriteList";
import { toggleFavorite } from "@/app/actions/toggle-favorite";

export const runtime = "nodejs";

type Candidate = { id: string; headline: string | null; location: string | null; skills: string[]; likes_count: number };
type FavoriteItem = { added_at: string; candidate: Candidate };

export default async function RecruiterPage() {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("created_at, candidate:candidate_id(id, headline, location, skills, likes_count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Espace recruteur</h1>
        <p className="text-sm text-red-600">Impossible de charger les favoris.</p>
        <form action={async () => { 'use server'; }}>
          <button className="underline text-sm" type="submit">Réessayer</button>
        </form>
      </div>
    );
  }

  const favorites: FavoriteItem[] = (data || [])
    .map((row: Record<string, unknown>) => {
      const cand = row["candidate"] as Candidate | Candidate[] | undefined;
      const candidateObj: Candidate | undefined = Array.isArray(cand) ? cand[0] : cand;
      const id = String((candidateObj as Record<string, unknown> | undefined)?.["id"] ?? "");
      return {
        added_at: String(row["created_at"] ?? ""),
        candidate: {
          id,
          headline: (candidateObj as Record<string, unknown> | undefined)?.["headline"] as string | null ?? null,
          location: (candidateObj as Record<string, unknown> | undefined)?.["location"] as string | null ?? null,
          skills: Array.isArray((candidateObj as Record<string, unknown> | undefined)?.["skills"]) ? ((candidateObj as Record<string, unknown>)?.["skills"] as string[]) : [],
          likes_count: Number((candidateObj as Record<string, unknown> | undefined)?.["likes_count"] ?? 0),
        },
      } as FavoriteItem;
    })
    .filter((f) => f.candidate.id.length > 0);

  async function removeFavorite(candidateId: string) {
    "use server";
    await toggleFavorite(candidateId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vos favoris</h1>
        <Link href="/search" className="underline text-sm">Voir les candidats</Link>
      </div>
      <FavoriteList favorites={favorites} removeAction={removeFavorite} />
    </div>
  );
}
