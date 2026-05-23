import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — QueueBite" }] }),
  component: RestaurantsPage,
});

type R = {
  id: string; slug: string; name: string; cuisine: string;
  image_url: string | null; rating: number | null; capacity: number | null;
  avg_service_minutes: number | null; is_open: boolean | null;
  current_serving_token: number | null; address: string | null;
};

function RestaurantsPage() {
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurants").select("*").order("rating", { ascending: false });
      if (error) throw error;
      return data as R[];
    },
  });

  // Live waiting counts per restaurant
  const [waitingByRest, setWaitingByRest] = useState<Record<string, number>>({});
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("queue_entries").select("restaurant_id").eq("status", "waiting");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((e: any) => { counts[e.restaurant_id] = (counts[e.restaurant_id] ?? 0) + 1; });
      setWaitingByRest(counts);
    }
    load();
    const channel = supabase.channel("queue-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cuisines = useMemo(() => Array.from(new Set(restaurants.map(r => r.cuisine))), [restaurants]);

  const filtered = restaurants.filter(r => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase()) && !r.cuisine.toLowerCase().includes(q.toLowerCase())) return false;
    if (cuisine && r.cuisine !== cuisine) return false;
    if (openOnly && !r.is_open) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <h1 className="font-serif text-4xl sm:text-5xl">Find your table tonight</h1>
          <p className="mt-2 text-muted-foreground">Live waits across {restaurants.length} restaurants near you.</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search restaurants or cuisines" className="h-12 rounded-full pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={cuisine === null ? "default" : "outline"} className="rounded-full" onClick={() => setCuisine(null)}>All</Button>
              {cuisines.map(c => (
                <Button key={c} variant={cuisine === c ? "default" : "outline"} className="rounded-full" onClick={() => setCuisine(c)}>{c}</Button>
              ))}
              <Button variant={openOnly ? "default" : "outline"} className="rounded-full" onClick={() => setOpenOnly(!openOnly)}>Open now</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        {filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No restaurants match those filters.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(r => {
              const waiting = waitingByRest[r.id] ?? 0;
              const eta = waiting * (r.avg_service_minutes ?? 8);
              const crowd = waiting > 8 ? "Packed" : waiting > 3 ? "Busy" : "Open seats";
              return (
                <Link key={r.id} to="/restaurants/$slug" params={{ slug: r.slug }} className="group">
                  <article className="overflow-hidden rounded-2xl bg-card shadow-soft transition-shadow hover:shadow-glow">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img src={r.image_url ?? ""} alt={r.name} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-xs backdrop-blur">
                        <span className="relative inline-block size-1.5 rounded-full bg-ember pulse-dot" />
                        {waiting} waiting
                      </div>
                      <div className="absolute right-3 top-3 rounded-full bg-background/95 px-2.5 py-1 text-xs backdrop-blur">{crowd}</div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-serif text-2xl">{r.name}</h3>
                        <span className="shrink-0 text-sm text-muted-foreground">{r.rating}★</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.cuisine} · {r.address}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                        <span className="text-muted-foreground">Now serving #{r.current_serving_token}</span>
                        <span className="font-medium text-ember">~{eta || r.avg_service_minutes} min</span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
