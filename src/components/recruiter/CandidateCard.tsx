"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { topSkills } from "@/lib/format";

type Candidate = {
  id: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  likes_count: number;
};

type Props = {
  candidate: Candidate;
  addedAt: string;
  removeAction: (candidateId: string) => Promise<void>;
};

export default function CandidateCard({ candidate, addedAt, removeAction }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{candidate.headline}</CardTitle>
        <CardDescription>
          {candidate.location}
          {addedAt && (
            <span className="ml-2">· Ajouté le {new Date(addedAt).toLocaleDateString()}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 items-center">
        {topSkills(candidate.skills, 6).map((s) => (
          <Badge key={s} variant="secondary">{s}</Badge>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{candidate.likes_count ?? 0} likes</span>
        <Link href={`/c/${candidate.id}`} className="underline text-sm">Ouvrir le profil</Link>
        <form action={removeAction.bind(null, candidate.id)}>
          <Button type="submit" variant="outline">Retirer des favoris</Button>
        </form>
      </CardContent>
    </Card>
  );
}