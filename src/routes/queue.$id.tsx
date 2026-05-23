import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/queue/$id")({
  head: () => ({ meta: [{ title: "Live queue — QueueBite" }] }),
  component: QueueTracker,
});

type Entry = {
  id: string; restaurant_id: string; token_number: number; party_size: number;
  status: "waiting" | "called" | "seated" | "cancelled" | "completed"; created_at: string;
  seating_preference: string | null; notes: string | null;
};

type Rest = { id: string; name: string; slug: string; image_url: string | null; address: string | null; avg_service_minutes: number | null; current_serving_token: number | null };

function QueueTracker() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [restaurant, setRestaurant] = useState<Rest | null>(null);
  const [aheadCount, setAheadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: e } = await supabase.from("queue_entries").select("*").eq("id", id).maybeSingle();
      if (!e) { setLoading(false); return; }
      setEntry(e as Entry);
      const { data: r } = await supabase.from("restaurants").select("id,name,slug,image_url,address,avg_service_minutes,current_serving_token").eq("id", e.restaurant_id).maybeSingle();
      setRestaurant(r as Rest);
      const { count } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", e.restaurant_id)
        .in("status", ["waiting"])
        .lt("token_number", e.token_number);
      setAheadCount(count ?? 0);
      setLoading(false);
    }
    load();

    const channel = supabase.channel(`queue-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "queue_entries", filter: `id=eq.${id}` }, (payload) => {
        const next = payload.new as Entry;
        setEntry(next);
        if (next.status === "called") toast.success("Your table is ready! 🎉", { duration: 10000 });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function cancelQueue() {
    if (!entry) return;
    const { error } = await supabase.from("queue_entries").update({ status: "cancelled" }).eq("id", entry.id);
    if (error) return toast.error(error.message);
    toast.success("Cancelled");
    navigate({ to: "/restaurants" });
  }

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><p className="p-12 text-muted-foreground">Loading…</p></div>;
  if (!entry || !restaurant) return <div className="min-h-screen bg-background"><SiteHeader /><p className="p-12 text-muted-foreground">Queue entry not found.</p></div>;

  const eta = aheadCount * (restaurant.avg_service_minutes ?? 8);
  const progress = entry.token_number > 0
    ? Math.min(100, Math.max(5, 100 - (aheadCount / Math.max(entry.token_number, 1)) * 100))
    : 0;

  const statusBadge = {
    waiting: { text: "Waiting", color: "bg-muted text-foreground" },
    called: { text: "Your table is ready!", color: "bg-ember text-ember-foreground" },
    seated: { text: "Seated · enjoy!", color: "bg-foreground text-background" },
    cancelled: { text: "Cancelled", color: "bg-muted text-muted-foreground" },
    completed: { text: "Completed", color: "bg-muted text-muted-foreground" },
  }[entry.status];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-5 py-12">
        <Link to="/restaurants/$slug" params={{ slug: restaurant.slug }} className="text-sm text-muted-foreground hover:text-foreground">
          ← {restaurant.name}
        </Link>

        <div className="mt-4 overflow-hidden rounded-3xl bg-charcoal text-background shadow-soft">
          <div className="p-8 sm:p-10">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadge.color}`}>
              {entry.status === "waiting" && <span className="mr-2 inline-block size-1.5 translate-y-[-1px] rounded-full bg-ember pulse-dot" />}
              {statusBadge.text}
            </span>

            <div className="mt-8 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-background/60">Your token</p>
                <p className="mt-1 font-serif text-7xl text-ember">#{entry.token_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-background/60">Now serving</p>
                <p className="mt-1 font-serif text-4xl text-background/80">#{restaurant.current_serving_token}</p>
              </div>
            </div>

            <div className="mt-8 h-2 overflow-hidden rounded-full bg-background/10">
              <div className="h-full rounded-full bg-ember transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl bg-background/5 p-4">
                <p className="text-xs uppercase tracking-widest text-background/60">Ahead of you</p>
                <p className="mt-1 font-serif text-3xl">{aheadCount}</p>
              </div>
              <div className="rounded-2xl bg-background/5 p-4">
                <p className="text-xs uppercase tracking-widest text-background/60">ETA</p>
                <p className="mt-1 font-serif text-3xl">~{eta || (restaurant.avg_service_minutes ?? 8)} min</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="text-muted-foreground">Party of <span className="text-foreground">{entry.party_size}</span> · {entry.seating_preference ?? "no preference"}</p>
          {entry.notes && <p className="mt-1 text-muted-foreground">Notes: {entry.notes}</p>}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border p-4 text-sm">
            <Bell className="size-4 text-ember" />
            <p className="mt-2 font-medium">Notify me</p>
            <p className="text-xs text-muted-foreground">We'll alert when it's almost your turn.</p>
          </div>
          <div className="rounded-2xl border border-border p-4 text-sm">
            <Check className="size-4 text-ember" />
            <p className="mt-2 font-medium">Walk in calmly</p>
            <p className="text-xs text-muted-foreground">No need to crowd the door.</p>
          </div>
          <div className="rounded-2xl border border-border p-4 text-sm">
            <X className="size-4 text-ember" />
            <p className="mt-2 font-medium">Change plans?</p>
            <Button variant="ghost" size="sm" className="mt-1 h-auto p-0 text-xs text-destructive hover:bg-transparent hover:text-destructive/80" onClick={cancelQueue}>
              Cancel my spot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
