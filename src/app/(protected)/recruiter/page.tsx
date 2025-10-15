import { createClientServer } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RecruiterTabs from "@/components/recruiter/RecruiterTabs";
import { ToasterProvider } from "@/components/ui/toaster";

export const runtime = "nodejs";


type FavoriteDetailed = {
  candidate_id: string;
  headline: string | null;
  about: string | null;
  location: string | null;
  skills: string[];
  likes_count: number;
  added_at: string;
  note?: string | null;
};

export default async function RecruiterPage() {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const { data: recruiterRow } = await supabase
    .from("recruiters")
    .select("company")
    .eq("user_id", user.id)
    .maybeSingle();
  const hasCompany = Boolean((recruiterRow as Record<string, unknown> | null)?.["company"] || "");

  const { data, error } = await supabase
    .from("v_favorites_detailed")
    .select("user_id, candidate_id, headline, about, location, skills, likes_count, added_at, note")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false })
    .limit(300);

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

  const favorites: FavoriteDetailed[] = (data || [])
    .map((row: Record<string, unknown>) => ({
      candidate_id: String(row["candidate_id"] ?? ""),
      headline: (row["headline"] as string | null) ?? null,
      about: (row["about"] as string | null) ?? null,
      location: (row["location"] as string | null) ?? null,
      skills: Array.isArray(row["skills"]) ? (row["skills"] as string[]) : [],
      likes_count: Number(row["likes_count"] ?? 0),
      added_at: String(row["added_at"] ?? ""),
      note: (row["note"] as string | null) ?? null,
    }))
    .filter((f) => f.candidate_id.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Espace recruteur</h1>
        <Link href="/search" prefetch={false} className="underline text-sm">Voir les candidats</Link>
      </div>

      {!hasCompany && (
        <Card className="border-yellow-300 bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <Badge>Profil incomplet</Badge>
            <span className="text-sm">Ajoutez votre entreprise dans votre profil recruteur pour débloquer toutes les fonctionnalités.</span>
          </div>
        </Card>
      )}

      <ToasterProvider>
        <RecruiterTabs initialFavorites={favorites} />
      </ToasterProvider>
    </div>
  );
}
