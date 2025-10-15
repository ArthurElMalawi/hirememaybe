"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";

type RequestStatus = "pending" | "approved" | "declined" | "canceled";

type ExistingRequest = {
  id: string;
  status: RequestStatus;
  created_at?: string | null;
};

type Props = {
  candidateId: string;
  isRecruiter: boolean;
  hasCompany: boolean;
  isSelf: boolean;
  existingRequest?: ExistingRequest | null;
};

export default function ContactRequestButton({ candidateId, isRecruiter, hasCompany, isSelf, existingRequest }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [localRequest, setLocalRequest] = useState<ExistingRequest | null>(existingRequest || null);

  const statusLabel = (st?: RequestStatus | null) => {
    switch (st) {
      case "pending": return "En attente";
      case "approved": return "Acceptée";
      case "declined": return "Refusée";
      case "canceled": return "Annulée";
      default: return undefined;
    }
  };

  const disabledReason = (() => {
    if (!isRecruiter) return "Réservé aux recruteurs.";
    if (!hasCompany) return "Profil recruteur incomplet (entreprise manquante).";
    if (isSelf) return "Auto-demande interdite.";
    if (localRequest?.status === "pending") return "Une demande est déjà en attente.";
    return null;
  })();

  async function submitRequest() {
    try {
      if (disabledReason) {
        toast({ title: "Action impossible", description: disabledReason });
        return;
      }

      setLoading(true);
      const res = await fetch("/api/contact/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId, message: message.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.ok) {
        const err: string = String(json.error || "Une erreur est survenue.");
        toast({ title: "Échec de la demande", description: err });
        return;
      }
      const req = json.request as { id: string; status: RequestStatus; created_at?: string };
      setLocalRequest({ id: req.id, status: req.status, created_at: req.created_at || null });
      setOpen(false);
      setMessage("");
      toast({ title: "Demande envoyée", description: "La demande de contact a été créée." });
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible d’envoyer la demande." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!!disabledReason}
        title={disabledReason || undefined}
      >
        Demander le contact
      </Button>
      {statusLabel(localRequest?.status) && (
        <Badge variant="secondary" title={localRequest?.created_at ? `Créée le ${new Date(localRequest.created_at).toLocaleString()}` : undefined}>
          {statusLabel(localRequest?.status)}
        </Badge>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !loading && setOpen(false)} />
          <Card className="relative z-10 w-[90%] max-w-md">
            <CardHeader>
              <CardTitle>Demander le contact</CardTitle>
              <CardDescription>Message optionnel à destination du candidat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm">Message (optionnel)</label>
                <textarea
                  className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Expliquez brièvement votre intérêt..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => !loading && setOpen(false)} disabled={loading}>Annuler</Button>
                <Button type="button" onClick={submitRequest} disabled={loading}>Envoyer</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}