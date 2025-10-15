import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ModerateButtons } from "./ModerateButtons";

export const runtime = "nodejs";

export default async function AdminPage() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Service role key not configured. Set SUPABASE_SERVICE_ROLE_KEY in your environment.</p>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("reports")
    .select("id, status, reason, candidate_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Moderation queue</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {(reports || []).map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle>Candidate {r.candidate_id}</CardTitle>
              <CardDescription>Created {new Date(r.created_at).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.reason && <p className="text-sm whitespace-pre-wrap">{r.reason}</p>}
              <ModerateButtons reportId={r.id} initialStatus={r.status} />
            </CardContent>
          </Card>
        ))}
        {(reports || []).length === 0 && (
          <div className="text-sm text-muted-foreground">No reports.</div>
        )}
      </div>
    </div>
  );
}