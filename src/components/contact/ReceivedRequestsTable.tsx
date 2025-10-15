"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

type Item = {
  id: string;
  company?: string | null;
  role?: string | null;
  message?: string | null;
  created_at?: string | null;
  status: "pending" | "approved" | "declined" | "canceled";
};

type Props = {
  items: Item[];
};

export default function ReceivedRequestsTable({ items }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState(items || []);

  async function decide(request_id: string, decision: "approved" | "declined") {
    try {
      const res = await fetch("/api/contact/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id, decision }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast({ title: "Échec", description: String(json.error || "Impossible de traiter la demande.") });
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === request_id ? { ...r, status: decision } : r)));
      toast({ title: "Succès", description: decision === "approved" ? "Demande acceptée." : "Demande refusée." });
    } catch {
      toast({ title: "Erreur réseau", description: "Réessayez plus tard." });
    }
  }

  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">Aucune demande reçue.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Entreprise</th>
            <th className="text-left py-2">Rôle</th>
            <th className="text-left py-2">Message</th>
            <th className="text-left py-2">Date</th>
            <th className="text-left py-2">Statut</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b align-top">
              <td className="py-2">{r.company || "—"}</td>
              <td className="py-2">{r.role || "—"}</td>
              <td className="py-2 whitespace-pre-wrap">{r.message || ""}</td>
              <td className="py-2">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
              <td className="py-2">{statusLabel(r.status)}</td>
              <td className="py-2">
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => decide(r.id, "approved")}>Accepter</Button>
                    <Button type="button" variant="ghost" onClick={() => decide(r.id, "declined")}>Refuser</Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusLabel(st: Item["status"]) {
  switch (st) {
    case "pending": return "En attente";
    case "approved": return "Acceptée";
    case "declined": return "Refusée";
    case "canceled": return "Annulée";
  }
}