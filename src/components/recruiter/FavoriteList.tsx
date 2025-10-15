"use client";
import { useMemo, useState } from "react";
import Toolbar from "./Toolbar";
import CandidateCard from "./CandidateCard";

type Candidate = {
  id: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  likes_count: number;
};

type FavoriteItem = {
  added_at: string;
  candidate: Candidate;
};

type Props = {
  favorites: FavoriteItem[];
  removeAction: (candidateId: string) => Promise<void>;
};

export default function FavoriteList({ favorites, removeAction }: Props) {
  const [filter, setFilter] = useState<{ q: string; skills: string[]; sort: "recent" | "liked" }>({ q: "", skills: [], sort: "recent" });

  const allSkills = useMemo(() => favorites.flatMap(f => f.candidate.skills || []), [favorites]);

  const filtered = useMemo(() => {
    let arr = favorites.slice();
    const q = filter.q.toLowerCase();
    if (q) {
      arr = arr.filter(f =>
        (f.candidate.headline || "").toLowerCase().includes(q) ||
        // about non disponible ici, on reste sur headline
        false
      );
    }
    if (filter.skills.length) {
      arr = arr.filter(f => (f.candidate.skills || []).some(s => filter.skills.includes(s)));
    }
    if (filter.sort === "liked") {
      arr = arr.sort((a, b) => (b.candidate.likes_count || 0) - (a.candidate.likes_count || 0));
    } else {
      arr = arr.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
    }
    return arr;
  }, [favorites, filter]);

  return (
    <div className="space-y-4">
      <Toolbar allSkills={allSkills} onFilterChange={setFilter} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((f) => (
          <CandidateCard key={`${f.candidate.id}-${f.added_at}`} candidate={f.candidate} addedAt={f.added_at} removeAction={removeAction} />
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">Aucun favori. <a href="/search" className="underline">Voir les candidats</a></div>
        )}
      </div>
    </div>
  );
}