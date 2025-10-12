"use client";

import { useOptimistic } from "react";
import { Button } from "@/components/ui/button";

export default function LikeButton({ liked, likeAction }: { liked: boolean; likeAction: () => Promise<void>; }) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);

  return (
    <form action={likeAction} onSubmit={() => setOptimisticLiked(true)}>
      <Button type="submit" disabled={optimisticLiked}>
        {optimisticLiked ? "Liked" : "Like"}
      </Button>
    </form>
  );
}