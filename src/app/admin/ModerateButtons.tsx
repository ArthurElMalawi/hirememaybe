"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ModerateButtons({ reportId, initialStatus }: { reportId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  async function updateStatus(next: "pending" | "reviewed" | "resolved") {
    const confirmed = window.confirm(`Confirmer l'action: ${next}?`);
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/report/${encodeURIComponent(reportId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) setStatus(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-muted-foreground">Status: {status}</span>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => updateStatus("reviewed")}>Mark reviewed</Button>
      <Button size="sm" disabled={loading} onClick={() => updateStatus("resolved")}>Resolve</Button>
    </div>
  );
}