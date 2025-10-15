"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import FavoritesTab from "@/components/recruiter/FavoritesTab";
import StatsTab from "@/components/recruiter/StatsTab";

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

export default function RecruiterTabs({ initialFavorites }: { initialFavorites: FavoriteDetailed[] }) {
  const [tab, setTab] = useState<"favorites" | "stats">("favorites");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button type="button" variant={tab === "favorites" ? "secondary" : "outline"} onClick={() => setTab("favorites")}>Favoris</Button>
        <Button type="button" variant={tab === "stats" ? "secondary" : "outline"} onClick={() => setTab("stats")}>Stats</Button>
      </div>
      {tab === "favorites" ? (
        <FavoritesTab initialItems={initialFavorites} />
      ) : (
        <StatsTab />
      )}
    </div>
  );
}