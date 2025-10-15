"use client";
import { useEffect } from "react";

export default function ViewTracker({ candidateId }: { candidateId: string }) {
  useEffect(() => {
    if (!candidateId) return;
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId })
    }).catch(() => {});
  }, [candidateId]);
  return null;
}