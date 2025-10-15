"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SearchItem } from "@/types/search";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { HeartIcon, GlobeIcon, PlaneIcon, MapPinIcon, ClockIcon } from "lucide-react";

export default function SearchResults() {
  const sp = useSearchParams();
  const { toast } = useToast();
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const qs = useMemo(() => sp.toString(), [sp]);

  useEffect(() => {
    let disposed = false;
    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`/api/search${qs ? `?${qs}` : ""}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json.error) {
          toast({ title: "Erreur de recherche", description: json.error || "Une erreur est survenue." });
          if (!disposed) setItems([]);
        } else {
          if (!disposed) setItems(json.items || []);
        }
      } catch {
        toast({ title: "Erreur de recherche", description: "Impossible d’atteindre l’API." });
        if (!disposed) setItems([]);
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    run();
    return () => { disposed = true; };
  }, [qs, toast]);

  async function favorite(candidateId: string) {
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (res.status === 401) {
        toast({ title: "Connexion requise", description: "Connectez-vous pour ajouter un favori." });
      }
    } catch {
      toast({ title: "Échec du favori", description: "Veuillez réessayer plus tard." });
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent className="flex gap-2">
              {Array.from({ length: 5 }).map((__, j) => (
                <Skeleton key={j} className="h-6 w-16" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const list = items || [];
  if (!list.length) {
    return <div className="text-sm text-muted-foreground">Aucun résultat.</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {list.map((c) => {
        const skills = c.skills || [];
        const langs = c.languages || [];
        const skillsExtra = Math.max(0, skills.length - 6);
        const langsExtra = Math.max(0, langs.length - 6);
        return (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{c.headline}</CardTitle>
              <CardDescription className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-3.5 opacity-70" />
                  {c.location || "—"}
                </span>
                {typeof c.seniority_years === "number" && (
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="size-3.5 opacity-70" />
                    {String(c.seniority_years)} ans
                  </span>
                )}
                {c.remote_ok && (
                  <span className="inline-flex items-center gap-1">
                    <GlobeIcon className="size-3.5 opacity-70" /> Remote OK
                  </span>
                )}
                {c.relocation_ok && (
                  <span className="inline-flex items-center gap-1">
                    <PlaneIcon className="size-3.5 opacity-70" /> Relocation OK
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 items-center">
              {skills.slice(0, 6).map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
              {skillsExtra > 0 && (
                <Badge variant="outline">+{skillsExtra}</Badge>
              )}
              {langs.slice(0, 6).map((l) => (
                <Badge key={`${l.code}-${l.level}`} variant="outline">
                  {displayLang(l.code)} {l.level}
                </Badge>
              ))}
              {langsExtra > 0 && (
                <Badge variant="outline">+{langsExtra}</Badge>
              )}
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <HeartIcon className="size-3.5" /> {c.likes_count ?? 0}
              </span>
              <Button asChild variant="link" className="px-0"> 
                <a href={`/c/${c.id}`}>Voir</a>
              </Button>
              <Button type="button" variant="outline" onClick={() => favorite(c.id)}>Favori</Button>
            </CardContent>
          </Card>
        );
      })}
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