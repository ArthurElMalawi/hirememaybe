"use client";

import { useEffect, useMemo, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type KPI = {
  favorites_added: number;
  profiles_viewed: number;
  contact_requests_sent: number;
  contact_requests_approved: number;
  acceptance_rate: number; // percent
  avg_time_to_decision: number; // hours
};

type TSItem = { date: string; favorites_added: number; profiles_viewed: number; contact_requests_sent: number };

export default function StatsTab() {
  const [days, setDays] = useState<"7" | "30">("7");
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [series, setSeries] = useState<TSItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [statsRes, tsRes] = await Promise.all([
          fetch(`/api/recruiter/stats?days=${days}`),
          fetch(`/api/recruiter/timeseries?days=${days}`),
        ]);
        const statsJson = await statsRes.json();
        const tsJson = await tsRes.json();
        if (mounted) {
          setKpi((statsJson?.stats as KPI) || null);
          setSeries(Array.isArray(tsJson?.items) ? (tsJson.items as TSItem[]) : []);
        }
      } catch {
        if (mounted) {
          setKpi(null);
          setSeries([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [days]);

  const favValues = useMemo(() => series.map((s) => s.favorites_added), [series]);
  const viewValues = useMemo(() => series.map((s) => s.profiles_viewed), [series]);
  const sentValues = useMemo(() => series.map((s) => s.contact_requests_sent), [series]);

  function Sparkline({ values, color }: { values: number[]; color: string }) {
    const w = 300;
    const h = 80;
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const points = values.map((v, i) => {
      const x = Math.round(i * step);
      const y = Math.round(h - (v / max) * (h - 6)) - 2;
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg width={w} height={h} className="block">
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
      </svg>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Période</span>
        <Select value={days} onValueChange={(v) => setDays((v as "7" | "30") || "7")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Favoris ajoutés</CardTitle>
            <CardDescription>Pendant la période</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold">{kpi?.favorites_added ?? 0}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profils vus</CardTitle>
            <CardDescription>Où viewer = recruteur</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold">{kpi?.profiles_viewed ?? 0}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demandes envoyées</CardTitle>
            <CardDescription>Total et taux d’acceptation</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-semibold">{kpi?.contact_requests_sent ?? 0}</div>
                <div className="text-sm text-muted-foreground">Acceptées: {kpi?.contact_requests_approved ?? 0} ({kpi?.acceptance_rate ?? 0}%)</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Favoris (par jour)</CardTitle>
            <CardDescription>Sparkline</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-20 w-full" /> : <Sparkline values={favValues} color="#6366f1" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vues (par jour)</CardTitle>
            <CardDescription>Sparkline</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-20 w-full" /> : <Sparkline values={viewValues} color="#10b981" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Demandes (par jour)</CardTitle>
            <CardDescription>Sparkline</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-20 w-full" /> : <Sparkline values={sentValues} color="#ef4444" />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Temps moyen de décision</CardTitle>
          <CardDescription>Heures jusqu’à acceptation/refus</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold">{kpi?.avg_time_to_decision ?? 0} h</div>}
        </CardContent>
      </Card>
    </div>
  );
}