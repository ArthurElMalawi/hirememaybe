"use client";

import { useOptimistic } from "react";
import { Button } from "@/components/ui/button";

export default function LikeButtonApi({ liked, candidateId }: { liked: boolean; candidateId: string; }) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);

  async function like() {
    if (optimisticLiked) return;
    setOptimisticLiked(true);
    try {
      await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
    } catch (_) {
      // No-op: keep optimistic state; backend upsert is idempotent
    }
  }

  return (
    <Button type="button" onClick={like} disabled={optimisticLiked}>
      {optimisticLiked ? "Liked" : "Like"}
    </Button>
  );
}