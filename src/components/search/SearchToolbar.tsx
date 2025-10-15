"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Props = {
  locationOptions?: string[];
};

export default function SearchToolbar({ locationOptions = [] }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") || "");
  const [skillsCsv, setSkillsCsv] = useState(sp.get("skills") || "");
  const [location, setLocation] = useState(sp.get("location") || "");
  const [sort, setSort] = useState(sp.get("sort") || "relevance");
  const [minYears, setMinYears] = useState(sp.get("min_years") || "0");
  const [langCode, setLangCode] = useState(sp.get("language_code") || "");
  const [langMinLevel, setLangMinLevel] = useState(sp.get("language_min_level") || "");
  const [remoteOk, setRemoteOk] = useState((sp.get("remote_ok") || "").toLowerCase() === "true");
  const [relocationOk, setRelocationOk] = useState((sp.get("relocation_ok") || "").toLowerCase() === "true");

  useEffect(() => {
    setQ(sp.get("q") || "");
    setSkillsCsv(sp.get("skills") || "");
    setLocation(sp.get("location") || "");
    setSort(sp.get("sort") || "relevance");
    setMinYears(sp.get("min_years") || "0");
    setLangCode(sp.get("language_code") || "");
    setLangMinLevel(sp.get("language_min_level") || "");
    setRemoteOk((sp.get("remote_ok") || "").toLowerCase() === "true");
    setRelocationOk((sp.get("relocation_ok") || "").toLowerCase() === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (skillsCsv.trim()) params.set("skills", skillsCsv.trim());
    if (location.trim()) params.set("location", location.trim());
    if (sort) params.set("sort", sort);
    if (minYears) params.set("min_years", String(minYears));
    if (langCode) params.set("language_code", langCode);
    if (langMinLevel) params.set("language_min_level", langMinLevel);
    if (remoteOk) params.set("remote_ok", "true");
    if (relocationOk) params.set("relocation_ok", "true");
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form className="grid gap-2 md:grid-cols-6" onSubmit={submit}>
      <Input
        name="q"
        placeholder="Texte (headline, about...)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <Input
        name="skills"
        placeholder="Compétences (CSV: react,ts,scss)"
        value={skillsCsv}
        onChange={(e) => setSkillsCsv(e.target.value)}
      />
      <Select value={location || undefined} onValueChange={(val) => setLocation(val)}>
        <SelectTrigger>
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          {locationOptions.map((loc) => (
            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={minYears} onValueChange={(val) => setMinYears(val)}>
        <SelectTrigger>
          <SelectValue placeholder="Min années" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 11 }).map((_, i) => (
            <SelectItem key={i} value={String(i)}>{i === 10 ? "10+" : String(i)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={langCode || undefined} onValueChange={(val) => setLangCode(val)}>
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
          ].map((l) => (
            <SelectItem key={l.c} value={l.c}>{l.n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-3">
        <Select value={langMinLevel || undefined} onValueChange={(val) => setLangMinLevel(val)}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Niveau" />
          </SelectTrigger>
          <SelectContent>
            {["A1","A2","B1","B2","C1","C2"].map((lvl) => (
              <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={remoteOk} onCheckedChange={(v) => setRemoteOk(Boolean(v))} />
          <span className="text-xs">Remote OK</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={relocationOk} onCheckedChange={(v) => setRelocationOk(Boolean(v))} />
          <span className="text-xs">Relocation OK</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Select value={sort} onValueChange={(val) => setSort(val)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tri" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Pertinence</SelectItem>
            <SelectItem value="likes">+ Likés</SelectItem>
            <SelectItem value="recent">+ Récents</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Rechercher</Button>
      </div>
    </form>
  );
}