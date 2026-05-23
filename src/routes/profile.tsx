import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your queues — QueueBite" }] }),
  component: ProfilePage,
});

type Row = {
  id: string; token_number: number; status: string; party_size: number; created_at: string;
  restaurants: { name: string; slug: string; image_url: string | null } | null;
};

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    async function load() {
      const { data } = await supabase
        .from("queue_entries")
        .select("id, token_number, status, party_size, created_at, restaurants(name, slug, image_url)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as any);
      setLoading(false);
    }
    load();
  }, [user, authLoading, navigate]);

  const active = rows.filter(r => r.status === "waiting" || r.status === "called");
  const history = rows.filter(r => r.status !== "waiting" && r.status !== "called");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="font-serif text-4xl">Your queues</h1>
        <p className="mt-1 text-muted-foreground">Active waits and recent visits.</p>

        {loading ? <p className="mt-10 text-muted-foreground">Loading…</p> : (
          <>
            <h2 className="mt-10 font-serif text-2xl">Active</h2>
            {active.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                You're not in any queues. <Link to="/restaurants" className="text-ember underline">Find a table</Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">{active.map(r => <RowCard key={r.id} r={r} />)}</div>
            )}

            <h2 className="mt-12 font-serif text-2xl">History</h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <div className="mt-4 space-y-3">{history.map(r => <RowCard key={r.id} r={r} muted />)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RowCard({ r, muted = false }: { r: Row; muted?: boolean }) {
  return (
    <Link to="/queue/$id" params={{ id: r.id }} className={`flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-soft ${muted ? "opacity-70" : ""}`}>
      <img src={r.restaurants?.image_url ?? ""} alt="" className="size-16 rounded-xl object-cover" />
      <div className="flex-1">
        <p className="font-serif text-xl">{r.restaurants?.name}</p>
        <p className="text-xs text-muted-foreground">Token #{r.token_number} · party of {r.party_size} · {r.status}</p>
      </div>
      <span className="text-sm text-muted-foreground">→</span>
    </Link>
  );
}
