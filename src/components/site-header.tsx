import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ember text-ember-foreground font-serif text-lg">
            Q
          </span>
          <span className="font-serif text-2xl leading-none">QueueBite</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link to="/restaurants" className="transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Restaurants
          </Link>
          <a href="/#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="/#pricing" className="transition-colors hover:text-foreground">Pricing</a>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile">My queues</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-ember text-ember-foreground hover:bg-ember/90">
                <Link to="/restaurants">Find a table</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
