"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

type ReportItem = {
  id: string;
  candidate_id: string;
  reason?: string | null;
  status: "pending" | "reviewed" | "resolved" | string;
  created_at?: string | null;
};

export default function AdminReportsTable() {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>("");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchItems = useCallback(async (nextStatus?: string) => {
    setLoading(true);
    try {
      const q = nextStatus && nextStatus !== "" ? `?status=${encodeURIComponent(nextStatus)}` : "";
      const res = await fetch(`/api/admin/reports${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      toast({ title: "Erreur de chargement", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchItems(status); }, [status, fetchItems]);

  async function updateStatus(id: string, next: "reviewed" | "resolved") {
    const confirmed = window.confirm(`Confirmer l'action: ${next}?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/report/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: next } : it)));
      toast({ title: "Statut mis à jour", description: `Report ${id} → ${next}` });
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message });
    }
  }

  function renderStatusBadge(s: string) {
    const base = "px-2 py-0.5 text-xs rounded";
    if (s === "pending") return <Badge className={`${base} bg-yellow-500 text-black`}>pending</Badge>;
    if (s === "reviewed") return <Badge className={`${base} bg-blue-500 text-white`}>reviewed</Badge>;
    if (s === "resolved") return <Badge className={`${base} bg-green-600 text-white`}>resolved</Badge>;
    return <Badge className={`${base}`}>{s}</Badge>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm">Filtrer par statut</label>
        <Select value={status} onValueChange={(v) => setStatus(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="px-3 py-2">id</th>
              <th className="px-3 py-2">candidate</th>
              <th className="px-3 py-2">reason</th>
              <th className="px-3 py-2">status</th>
              <th className="px-3 py-2">created_at</th>
              <th className="px-3 py-2">actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={6}>Chargement…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={6}>Aucun report</td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2">
                    <Link href={`/c/${r.candidate_id}`} className="underline">{r.candidate_id}</Link>
                  </td>
                  <td className="px-3 py-2 max-w-[320px] truncate" title={r.reason || undefined}>{r.reason}</td>
                  <td className="px-3 py-2">{renderStatusBadge(r.status)}</td>
                  <td className="px-3 py-2">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "reviewed")}>Mark reviewed</Button>
                      <Button size="sm" onClick={() => updateStatus(r.id, "resolved")}>Resolve</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}