import { createClientServer } from "@/lib/supabase/server";
import AdminReportsTable from "./AdminReportsTable";
import { ToasterProvider } from "@/components/ui/toaster";

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

  // Guard: ensure current user is admin
  const supa = await createClientServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Vous devez être authentifié.</p>
      </div>
    );
  }

  const { data: me } = await supa
    .from("users_public")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Accès refusé (rôle requis: admin).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Moderation queue</h1>
      <ToasterProvider>
        <AdminReportsTable />
      </ToasterProvider>
    </div>
  );
}