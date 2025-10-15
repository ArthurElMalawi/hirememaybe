"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GlobeIcon, PlaneIcon } from "lucide-react";

type Experience = {
  title: string;
  company: string;
  start: string;
  end: string | null;
  skills: string[];
};

type Study = {
  school: string;
  degree: string;
  start: string;
  end: string | null;
};

type Lang = {
  code: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
};

type Props = {
  initialExperiences?: Experience[];
  initialStudies?: Study[];
  initialLanguages?: Lang[];
  initialRemoteOk?: boolean;
  initialRelocationOk?: boolean;
  seniorityYears?: number;
};

export default function CandidateProfileForm({
  initialExperiences = [],
  initialStudies = [],
  initialLanguages = [],
  initialRemoteOk = false,
  initialRelocationOk = false,
  seniorityYears,
}: Props) {
  const [experiences, setExperiences] = useState<Experience[]>(initialExperiences);
  const [studies, setStudies] = useState<Study[]>(initialStudies);
  const [languages, setLanguages] = useState<Lang[]>(initialLanguages);
  const [remoteOk, setRemoteOk] = useState<boolean>(initialRemoteOk);
  const [relocationOk, setRelocationOk] = useState<boolean>(initialRelocationOk);

  const experiencesJson = useMemo(() => JSON.stringify(experiences), [experiences]);
  const studiesJson = useMemo(() => JSON.stringify(studies), [studies]);
  const languagesJson = useMemo(() => JSON.stringify(languages), [languages]);

  // Hidden inputs to include arrays + preferences in the parent form submission
  // React keeps these values updated
  // Minimal visual validation helper
  function validDateOrder(start?: string, end?: string | null): boolean {
    if (!start || !end) return true;
    const s = Date.parse(start);
    const e = Date.parse(end);
    if (Number.isNaN(s) || Number.isNaN(e)) return true;
    return s <= e;
  }

  // Experience helpers
  function addExperience() {
    setExperiences((arr) => arr.concat([{ title: "", company: "", start: "", end: null, skills: [] }]));
  }
  function removeExperience(idx: number) {
    setExperiences((arr) => arr.filter((_, i) => i !== idx));
  }
  function updateExperience(idx: number, patch: Partial<Experience>) {
    setExperiences((arr) => arr.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  // Study helpers
  function addStudy() {
    setStudies((arr) => arr.concat([{ school: "", degree: "", start: "", end: null }]));
  }
  function removeStudy(idx: number) {
    setStudies((arr) => arr.filter((_, i) => i !== idx));
  }
  function updateStudy(idx: number, patch: Partial<Study>) {
    setStudies((arr) => arr.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  // Language helpers
  function addLang() {
    setLanguages((arr) => arr.concat([{ code: "", level: "B1" }]));
  }
  function removeLang(idx: number) {
    setLanguages((arr) => arr.filter((_, i) => i !== idx));
  }
  function updateLang(idx: number, patch: Partial<Lang>) {
    setLanguages((arr) => arr.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-6">
      {/* Hidden inputs bound to state */}
      <input type="hidden" name="experiences_json" value={experiencesJson} readOnly />
      <input type="hidden" name="studies_json" value={studiesJson} readOnly />
      <input type="hidden" name="languages_json" value={languagesJson} readOnly />
      <input type="hidden" name="remote_ok" value={remoteOk ? "true" : "false"} readOnly />
      <input type="hidden" name="relocation_ok" value={relocationOk ? "true" : "false"} readOnly />

      {/* Experiences */}
      <Card>
        <CardHeader>
          <CardTitle>Expériences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {experiences.map((e, idx) => {
            const okDates = validDateOrder(e.start, e.end);
            return (
              <div key={idx} className="border rounded p-3 space-y-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Titre (ex: Senior Frontend)" value={e.title} onChange={(ev) => updateExperience(idx, { title: ev.target.value })} />
                  <Input placeholder="Entreprise" value={e.company} onChange={(ev) => updateExperience(idx, { company: ev.target.value })} />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input type="date" placeholder="Début" value={e.start} onChange={(ev) => updateExperience(idx, { start: ev.target.value })} />
                  <Input type="date" placeholder="Fin (optionnel)" value={e.end || ""} onChange={(ev) => updateExperience(idx, { end: ev.target.value || null })} />
                </div>
                {!okDates && <p className="text-xs text-red-600">La date de fin doit être ≥ début.</p>}
                <div>
                  <Input
                    placeholder="Ajoutez une compétence… (Entrée ou , pour valider)"
                    defaultValue=""
                    onKeyDown={(ev) => {
                      if (ev.key === "," || ev.key === "Enter") {
                        ev.preventDefault();
                        const token = ev.currentTarget.value.trim();
                        if (token) {
                          updateExperience(idx, { skills: [...(e.skills || []), token] });
                          ev.currentTarget.value = "";
                        }
                      }
                      if (ev.key === "Backspace" && ev.currentTarget.value === "") {
                        const arr = (e.skills || []);
                        if (arr.length > 0) {
                          updateExperience(idx, { skills: arr.slice(0, -1) });
                        }
                      }
                    }}
                    onBlur={(ev) => {
                      const token = ev.currentTarget.value.trim();
                      if (token) {
                        updateExperience(idx, { skills: [...(e.skills || []), token] });
                        ev.currentTarget.value = "";
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(e.skills || []).map((s, si) => (
                      <Badge
                        key={`${s}-${si}`}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => {
                          const arr = (e.skills || []).filter((_, i) => i !== si);
                          updateExperience(idx, { skills: arr });
                        }}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Cliquez une compétence pour la retirer.</p>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => removeExperience(idx)}>Supprimer</Button>
                </div>
              </div>
            );
          })}
          <Button type="button" onClick={addExperience}>Ajouter une expérience</Button>
        </CardContent>
      </Card>

      {/* Studies */}
      <Card>
        <CardHeader>
          <CardTitle>Études</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {studies.map((e, idx) => {
            const okDates = validDateOrder(e.start, e.end);
            return (
              <div key={idx} className="border rounded p-3 space-y-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="École" value={e.school} onChange={(ev) => updateStudy(idx, { school: ev.target.value })} />
                  <Input placeholder="Diplôme" value={e.degree} onChange={(ev) => updateStudy(idx, { degree: ev.target.value })} />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input type="date" placeholder="Début" value={e.start} onChange={(ev) => updateStudy(idx, { start: ev.target.value })} />
                  <Input type="date" placeholder="Fin (optionnel)" value={e.end || ""} onChange={(ev) => updateStudy(idx, { end: ev.target.value || null })} />
                </div>
                {!okDates && <p className="text-xs text-red-600">La date de fin doit être ≥ début.</p>}
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => removeStudy(idx)}>Supprimer</Button>
                </div>
              </div>
            );
          })}
          <Button type="button" onClick={addStudy}>Ajouter une étude</Button>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Langues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Ajoutez vos langues parlées et niveaux (CEFR).</p>
          {languages.map((l, idx) => (
            <div key={idx} className="border rounded p-3 space-y-2">
              <div className="grid gap-2 md:grid-cols-3 items-center">
                <Select value={l.code || undefined} onValueChange={(val) => updateLang(idx, { code: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Langue" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { c: "fr", n: "Français" },
                      { c: "en", n: "English" },
                      { c: "es", n: "Español" },
                      { c: "de", n: "Deutsch" },
                      { c: "it", n: "Italiano" },
                      { c: "pt", n: "Português" },
                      { c: "ar", n: "العربية" },
                      { c: "zh", n: "中文" },
                      { c: "ja", n: "日本語" },
                      { c: "ko", n: "한국어" },
                    ].map((opt) => (
                      <SelectItem key={opt.c} value={opt.c}>{opt.n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={l.level || undefined} onValueChange={(val) => updateLang(idx, { level: val as Lang["level"] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A1","A2","B1","B2","C1","C2"].map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => removeLang(idx)}>Supprimer</Button>
                </div>
              </div>
              {(l.code && l.level) && (
                <Badge variant="secondary">{displayLang(l.code)} {l.level}</Badge>
              )}
            </div>
          ))}
          <Button type="button" onClick={addLang}>Ajouter une langue</Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Préférences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={remoteOk} onCheckedChange={(v) => setRemoteOk(Boolean(v))} />
            <span className="text-sm inline-flex items-center gap-1">
              <GlobeIcon className="size-4 opacity-80" /> Remote OK
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={relocationOk} onCheckedChange={(v) => setRelocationOk(Boolean(v))} />
            <span className="text-sm inline-flex items-center gap-1">
              <PlaneIcon className="size-4 opacity-80" /> Relocation OK
            </span>
          </div>
          {seniorityYears !== undefined && seniorityYears !== null && (
            <span className="ml-auto text-xs text-muted-foreground">Années d’expérience calculées: {String(seniorityYears)}</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function displayLang(code: string): string {
  const map: Record<string, string> = {
    fr: "Français",
    en: "English",
    es: "Español",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português",
    ar: "العربية",
    zh: "中文",
    ja: "日本語",
    ko: "한국어",
  };
  return map[code] || code;
}
