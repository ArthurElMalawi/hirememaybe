import { createClientServer } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SearchParams = { q?: string; skills?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClientServer();
  const params = await searchParams;
  const q = (params.q || "").trim();
  const skillsParam = (params.skills || "").trim();
  const skills = skillsParam ? skillsParam.split(",").map(s => s.trim()).filter(Boolean) : [];

  let query = supabase
    .from("candidates")
    .select("id, headline, location, skills")
    .in("visibility", ["public", "anonymized"]);

  if (q) query = query.ilike("headline", `%${q}%`);
  if (skills.length) query = query.overlaps("skills", skills);

  const { data } = await query.limit(24);

  return (
    <div className="space-y-6">
      <form className="flex gap-2" method="get">
        <Input name="q" placeholder="Search headline" defaultValue={q} />
        <Input name="skills" placeholder="react,ts,scss" defaultValue={skillsParam} />
        <Button type="submit">Search</Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {(data || []).map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{c.headline}</CardTitle>
              <CardDescription>{c.location}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(c.skills || []).slice(0, 6).map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
              <a href={`/c/${c.id}`} className="ml-auto underline text-sm">View profile</a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}