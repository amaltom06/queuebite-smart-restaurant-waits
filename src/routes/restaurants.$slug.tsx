import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, MapPin, Users, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/restaurants/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — QueueBite` }] }),
  component: RestaurantDetail,
});

function RestaurantDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(0);
  const [open, setOpen] = useState(false);
  const [partySize, setPartySize] = useState(2);
  const [seating, setSeating] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: r, isLoading } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!r) return;
    async function load() {
      const { count } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", r!.id)
        .in("status", ["waiting", "called"]);
      setWaiting(count ?? 0);
    }
    load();
    const channel = supabase.channel(`r-${r.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries", filter: `restaurant_id=eq.${r.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [r]);

  if (isLoading) return <div className="min-h-screen bg-background"><SiteHeader /><p className="p-12 text-muted-foreground">Loading…</p></div>;
  if (!r) return <div className="min-h-screen bg-background"><SiteHeader /><p className="p-12 text-muted-foreground">Restaurant not found.</p></div>;

  const eta = waiting * (r.avg_service_minutes ?? 8);

  async function joinQueue() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("queue_entries").insert({
      restaurant_id: r!.id,
      user_id: user.id,
      token_number: 0,
      party_size: partySize,
      seating_preference: seating || null,
      notes: notes || null,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("You're in line!");
    setOpen(false);
    navigate({ to: "/queue/$id", params: { id: data.id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="relative h-72 sm:h-96">
        <img src={r.image_url ?? ""} alt={r.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>

      <div className="mx-auto -mt-24 max-w-5xl px-5 pb-20">
        <div className="rounded-3xl bg-card p-8 shadow-soft md:p-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">{r.cuisine}</p>
              <h1 className="mt-2 font-serif text-5xl">{r.name}</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">{r.description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {r.address}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {r.opens_at?.slice(0,5)} – {r.closes_at?.slice(0,5)}</span>
                <span className="inline-flex items-center gap-1.5"><Users className="size-4" /> Seats {r.capacity}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-charcoal p-6 text-background">
              <p className="text-xs uppercase tracking-widest text-background/60">Live queue</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-serif text-5xl text-ember">{waiting}</span>
                <span className="text-sm text-background/70">parties waiting</span>
              </div>
              <p className="mt-1 text-sm text-background/70">Now serving #{r.current_serving_token} · ~{eta || r.avg_service_minutes} min</p>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="mt-5 w-full rounded-full bg-ember text-ember-foreground hover:bg-ember/90">
                    Join the queue
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-serif text-2xl">Join the queue at {r.name}</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="party">Party size</Label>
                      <Input id="party" type="number" min={1} max={20} value={partySize} onChange={(e) => setPartySize(parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seat">Seating preference (optional)</Label>
                      <Input id="seat" value={seating} onChange={(e) => setSeating(e.target.value)} placeholder="Booth, patio, bar…" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, celebrating something…" />
                    </div>
                    <Button onClick={joinQueue} disabled={submitting} className="w-full rounded-full bg-ember text-ember-foreground hover:bg-ember/90">
                      {submitting ? "Joining…" : "Confirm & get my token"}
                    </Button>
                    {!user && <p className="text-center text-xs text-muted-foreground">You'll be asked to sign in first.</p>}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mt-12 grid gap-6 border-t border-border pt-10 sm:grid-cols-3">
            {[
              { icon: Utensils, t: "Menu", b: "Wood-fired mains, seasonal pastas, and curated wine pairings." },
              { icon: Clock, t: "Best times", b: "Walk-in easy 5–6:30pm. Peak 7:30–9:30pm." },
              { icon: Users, t: "Group friendly", b: "Tables up to 8. Larger groups: contact restaurant." },
            ].map(({ icon: Icon, t, b }) => (
              <div key={t}>
                <Icon className="size-5 text-ember" />
                <h3 className="mt-3 font-serif text-xl">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
        </div>

        <Link to="/restaurants" className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground">← Back to all restaurants</Link>
      </div>
    </div>
  );
}
