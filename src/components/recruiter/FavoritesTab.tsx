"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";

type Item = {
  candidate_id: string;
  headline: string | null;
  about: string | null;
  location: string | null;
  skills: string[];
  likes_count: number;
  added_at: string;
  note?: string | null;
};

type Props = {
  initialItems: Item[];
};

export default function FavoritesTab({ initialItems }: Props) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [sort, setSort] = useState<"recent" | "liked">("recent");
  const [rows, setRows] = useState(initialItems || []);
  const [saving, setSaving] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (initialItems || []).forEach((r) => {
      if (r.candidate_id) map[r.candidate_id] = r.note || "";
    });
    return map;
  });

  const skillFilters = useMemo(() => skillsText.split(",").map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0), [skillsText]);

  const filtered = useMemo(() => {
    const out = rows.filter((r) => {
      const matchQ = q.trim().length === 0 || [r.headline || "", r.about || ""].some((t) => t.toLowerCase().includes(q.toLowerCase()));
      const matchSkills = skillFilters.length === 0 || (r.skills || []).some((s) => skillFilters.includes(s.toLowerCase()));
      const ts = new Date(r.added_at).getTime();
      const inFrom = !fromDate || ts >= new Date(fromDate).getTime();
      const inTo = !toDate || ts <= new Date(toDate).getTime();
      return matchQ && matchSkills && inFrom && inTo;
    });
    out.sort((a, b) => sort === "recent" ? new Date(b.added_at).getTime() - new Date(a.added_at).getTime() : (b.likes_count - a.likes_count));
    return out;
  }, [rows, q, skillFilters, fromDate, toDate, sort]);

  async function saveNote(candidate_id: string, note: string) {
    try {
      setSaving((s) => ({ ...s, [candidate_id]: "saving" }));
      const method = note.trim().length ? "POST" : "DELETE";
      const res = await fetch("/api/favorite-note", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id, note }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(String(json.error || "Erreur lors de la sauvegarde."));
      setRows((prev) => prev.map((r) => (r.candidate_id === candidate_id ? { ...r, note: note.trim().length ? note : null } : r)));
      setDraftNotes((prev) => ({ ...prev, [candidate_id]: note }));
      setSaving((s) => ({ ...s, [candidate_id]: "saved" }));
      toast({ title: "Sauvegardé", description: "La note a été mise à jour." });
    } catch {
      setSaving((s) => ({ ...s, [candidate_id]: "error" }));
      toast({ title: "Échec", description: "Impossible d’enregistrer la note." });
    } finally {
      setTimeout(() => setSaving((s) => ({ ...s, [candidate_id]: "idle" })), 1500);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Input placeholder="Filtrer texte (headline/about)" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input placeholder="Skills (séparés par des virgules)" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
        <input type="date" className="border rounded px-2 py-1 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" className="border rounded px-2 py-1 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <Select value={sort} onValueChange={(v) => setSort((v as "recent" | "liked") || "recent")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Trier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Ajout récent</SelectItem>
            <SelectItem value="liked">+Likés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Candidat</th>
              <th className="text-left py-2">Lieu</th>
              <th className="text-left py-2">Skills</th>
              <th className="text-left py-2">Likes</th>
              <th className="text-left py-2">Ajouté</th>
              <th className="text-left py-2">Note privée</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.candidate_id} className="border-b align-top">
                <td className="py-2">
                  <div className="font-medium">{r.headline || "—"}</div>
                  <div className="text-muted-foreground">{(r.about || "").slice(0, 120)}</div>
                </td>
                <td className="py-2">{r.location || "—"}</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {(r.skills || []).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </td>
                <td className="py-2">{r.likes_count}</td>
                <td className="py-2">{new Date(r.added_at).toLocaleDateString()}</td>
                <td className="py-2 w-[320px]">
                  <div className="space-y-2">
                    <Textarea
                      rows={4}
                      value={draftNotes[r.candidate_id] ?? r.note ?? ""}
                      onChange={(e) => setDraftNotes((prev) => ({ ...prev, [r.candidate_id]: e.target.value }))}
                      onBlur={(e) => e.currentTarget.value = e.currentTarget.value.trim()}
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        const value = (draftNotes[r.candidate_id] ?? r.note ?? "").trim();
                        saveNote(r.candidate_id, value);
                      }}>Save</Button>
                      <Button type="button" variant="ghost" onClick={() => saveNote(r.candidate_id, "")}>Clear</Button>
                      {saving[r.candidate_id] === "saving" && <Badge>Saving…</Badge>}
                      {saving[r.candidate_id] === "saved" && <Badge variant="secondary">Saved</Badge>}
                      {saving[r.candidate_id] === "error" && <Badge className="bg-red-600 text-white">Error</Badge>}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}