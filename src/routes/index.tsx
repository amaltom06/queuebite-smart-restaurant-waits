import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Clock, MapPin, Smartphone, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QueueBite — Skip the line at your favourite restaurants" },
      { name: "description", content: "Join restaurant waitlists remotely, track your spot live, and arrive right when your table is ready." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: featured = [] } = useQuery({
    queryKey: ["featured-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, slug, name, cuisine, image_url, rating, avg_service_minutes, current_serving_token")
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden grain">
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
                <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-ember pulse-dot" />
                Live queues across 240+ restaurants
              </span>
              <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Never wait <em className="italic text-ember">awkwardly</em> at the door again.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                QueueBite lets you join the waitlist before you leave the house. Track your token in real time and walk in the moment your table is ready.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-6 text-base text-background hover:bg-foreground/90">
                  <Link to="/restaurants">
                    Browse restaurants <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="h-12 rounded-full px-5 text-base">
                  <a href="#how">See how it works</a>
                </Button>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="size-7 rounded-full border-2 border-background bg-gradient-to-br from-ember to-foreground" />
                    ))}
                  </div>
                  <span>12k diners this week</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="size-4 fill-ember text-ember" />
                  <span>4.9 average wait accuracy</span>
                </div>
              </div>
            </div>

            {/* Hero card visual */}
            <div className="relative">
              <div className="absolute -top-8 -right-8 size-72 rounded-full bg-ember/20 blur-3xl" />
              <div className="relative rounded-3xl bg-card p-6 shadow-soft">
                <img
                  src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80"
                  alt="Restaurant interior"
                  className="aspect-[4/5] w-full rounded-2xl object-cover"
                />
                <div className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium backdrop-blur">
                  <span className="relative inline-block size-1.5 rounded-full bg-ember pulse-dot mr-2" />
                  Live · 8 waiting
                </div>
                <div className="absolute bottom-10 left-10 right-10 rounded-2xl bg-background/95 p-5 shadow-soft backdrop-blur">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Your token</span>
                    <span>Now serving</span>
                  </div>
                  <div className="mt-1 flex items-end justify-between">
                    <span className="font-serif text-5xl text-ember">#27</span>
                    <span className="font-serif text-3xl text-muted-foreground">24</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[75%] rounded-full bg-ember transition-all" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">~12 min until your table</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid gap-10 md:grid-cols-4">
            {[
              { icon: Smartphone, title: "Join remotely", body: "Tap a restaurant, drop your party size, you're in line." },
              { icon: Clock, title: "Live ETA", body: "Smart predictions update every time a table turns over." },
              { icon: Bell, title: "Walk-in alerts", body: "We ping you exactly when it's time to head in." },
              { icon: Sparkles, title: "No-show shield", body: "Restaurants keep tables full. You skip the awkward queue." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="size-6 text-ember" />
                <h3 className="mt-4 font-serif text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESTAURANTS */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Tonight</p>
            <h2 className="mt-2 font-serif text-4xl sm:text-5xl">Trending in your city</h2>
          </div>
          <Link to="/restaurants" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-flex">
            See all →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {featured.map((r) => (
            <Link key={r.id} to="/restaurants/$slug" params={{ slug: r.slug }} className="group">
              <div className="overflow-hidden rounded-2xl bg-card shadow-soft transition-shadow hover:shadow-glow">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={r.image_url ?? ""} alt={r.name} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs backdrop-blur">
                    Serving #{r.current_serving_token}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-serif text-2xl">{r.name}</h3>
                    <span className="text-sm text-muted-foreground">{r.rating}★</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.cuisine} · ~{r.avg_service_minutes} min/table</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-border bg-charcoal text-background">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <h2 className="max-w-2xl font-serif text-4xl sm:text-5xl">Three taps between you and dinner.</h2>
          <div className="mt-14 grid gap-12 md:grid-cols-3">
            {[
              { n: "01", t: "Pick your spot", b: "Browse open restaurants nearby. See live waits and crowd levels at a glance." },
              { n: "02", t: "Join the queue", b: "Choose party size and any preferences. Get a token instantly." },
              { n: "03", t: "Show up on time", b: "Track your position live. We notify you the second you should leave." },
            ].map(s => (
              <div key={s.n}>
                <span className="font-serif text-6xl text-ember">{s.n}</span>
                <h3 className="mt-4 font-serif text-2xl">{s.t}</h3>
                <p className="mt-2 text-sm text-background/70">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { q: "I haven't stood at a hostess stand in months. It just works.", a: "Maya R.", r: "Brooklyn" },
            { q: "We turn 30% more tables on Friday nights. Our walk-in chaos is gone.", a: "Carlos D.", r: "Owner, Saffron House" },
            { q: "Got a ping at the subway, walked in, sat down. Magic.", a: "Theo K.", r: "Manhattan" },
          ].map(t => (
            <figure key={t.a} className="rounded-2xl border border-border bg-card p-6">
              <blockquote className="font-serif text-xl leading-snug">"{t.q}"</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">— {t.a}, {t.r}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="text-center">
            <h2 className="font-serif text-4xl sm:text-5xl">Simple pricing for restaurants</h2>
            <p className="mt-3 text-muted-foreground">Diners always use QueueBite free.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {[
              { name: "Starter", price: "$49", per: "/mo", feats: ["Up to 200 covers/day", "Live queue dashboard", "SMS alerts", "Email support"] },
              { name: "Service", price: "$129", per: "/mo", feats: ["Unlimited covers", "TV display mode", "Analytics & peak hours", "Multiple staff seats", "Priority support"], highlight: true },
            ].map(p => (
              <div key={p.name} className={`rounded-2xl border p-8 ${p.highlight ? "border-ember bg-card shadow-glow" : "border-border bg-card"}`}>
                <h3 className="font-serif text-2xl">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-serif text-5xl">{p.price}</span>
                  <span className="text-muted-foreground">{p.per}</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                  {p.feats.map(f => <li key={f}>· {f}</li>)}
                </ul>
                <Button className={`mt-8 w-full rounded-full ${p.highlight ? "bg-ember text-ember-foreground hover:bg-ember/90" : ""}`} variant={p.highlight ? "default" : "outline"}>
                  Start free trial
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="rounded-3xl bg-charcoal p-12 text-background md:p-16">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-serif text-4xl">Hungry yet?</h2>
              <p className="mt-2 text-background/70">Find a table near you and join the line in seconds.</p>
            </div>
            <Button asChild size="lg" className="h-12 rounded-full bg-ember px-7 text-base text-ember-foreground hover:bg-ember/90">
              <Link to="/restaurants">
                <MapPin className="mr-2 size-4" /> Find a table
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© 2026 QueueBite</span>
          <span>Made for hungry humans.</span>
        </div>
      </footer>
    </div>
  );
}
