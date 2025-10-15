"use client";

import { useOptimistic } from "react";
import { Button } from "@/components/ui/button";

export default function LikeButtonApi({ liked, candidateId }: { liked: boolean; candidateId: string; }) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);

  async function like() {
    if (optimisticLiked) return;
    setOptimisticLiked(true);
    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (res.status === 401) {
        // Revert optimistic state if user is not authenticated
        setOptimisticLiked(false);
        // Minimal UX hint; replace with a toast if available
        alert("Connectez-vous pour liker ce profil.");
      }
    } catch {
      // No-op: keep optimistic state; backend upsert is idempotent
    }
  }

  return (
    <Button type="button" onClick={like} disabled={optimisticLiked}>
      {optimisticLiked ? "Liked" : "Like"}
    </Button>
  );
}