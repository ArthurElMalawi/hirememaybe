"use client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  allSkills: string[];
  onFilterChange: (filter: { q: string; skills: string[]; sort: "recent" | "liked" }) => void;
};

export default function Toolbar({ allSkills, onFilterChange }: Props) {
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [sort, setSort] = useState<"recent" | "liked">("recent");

  const uniqSkills = useMemo(() => Array.from(new Set(allSkills)).sort(), [allSkills]);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Filter headline/about"
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          onFilterChange({ q: v, skills, sort });
        }}
        className="w-64"
      />

      <div className="flex flex-wrap gap-2 items-center">
        {uniqSkills.slice(0, 12).map((s) => {
          const active = skills.includes(s);
          return (
            <button
              key={s}
              type="button"
              className={`text-xs border rounded px-2 py-0.5 ${active ? "bg-secondary" : ""}`}
              onClick={() => {
                const next = active ? skills.filter((k) => k !== s) : [...skills, s];
                setSkills(next);
                onFilterChange({ q, skills: next, sort });
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      <Select
        value={sort}
        onValueChange={(v) => {
          const next = (v as "recent" | "liked") || "recent";
          setSort(next);
          onFilterChange({ q, skills, sort: next });
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Ajout récent</SelectItem>
          <SelectItem value="liked">+ Likés</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}