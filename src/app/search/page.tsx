import { createClientServer } from "@/lib/supabase/server";
import SearchToolbar from "@/components/search/SearchToolbar";
import SearchResults from "@/components/search/SearchResults";
import { ToasterProvider } from "@/components/ui/toaster";


export default async function SearchPage() {
  const supabase = await createClientServer();

  // Options de location (distinct côté serveur)
  const { data: locRows } = await supabase
    .from("candidates")
    .select("location")
    .in("visibility", ["public", "anonymized"])
    .neq("location", null)
    .limit(200);

  const locationOptions = Array.from(new Set((locRows || []).map((r: { location: string | null }) => r.location).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <SearchToolbar locationOptions={locationOptions} />
      <ToasterProvider>
        <SearchResults />
      </ToasterProvider>
    </div>
  );
}