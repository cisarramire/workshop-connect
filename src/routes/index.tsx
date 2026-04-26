import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, MessageSquare, ShieldAlert, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "@/components/StarRating";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: Home,
});

type WorkshopRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string;
  photo_url: string | null;
  specialties: string[];
  created_at: string;
};

type WorkshopWithStats = WorkshopRow & {
  avg_rating: number;
  review_count: number;
};

type SortKey = "top" | "worst" | "popular" | "newest";

function Home() {
  const [workshops, setWorkshops] = useState<WorkshopWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("top");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: ws } = await supabase
        .from("workshops")
        .select("id,name,slug,city,description,photo_url,specialties,created_at")
        .order("created_at", { ascending: false });

      if (!ws || cancelled) {
        setLoading(false);
        return;
      }

      const ids = ws.map((w) => w.id);
      let stats = new Map<string, { sum: number; count: number }>();
      if (ids.length) {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("workshop_id, rating")
          .in("workshop_id", ids);
        reviews?.forEach((r) => {
          const cur = stats.get(r.workshop_id) ?? { sum: 0, count: 0 };
          cur.sum += r.rating;
          cur.count += 1;
          stats.set(r.workshop_id, cur);
        });
      }

      const merged: WorkshopWithStats[] = ws.map((w) => {
        const s = stats.get(w.id);
        return {
          ...w,
          avg_rating: s ? s.sum / s.count : 0,
          review_count: s?.count ?? 0,
        };
      });
      if (!cancelled) {
        setWorkshops(merged);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => {
    return Array.from(new Set(workshops.map((w) => w.city))).sort();
  }, [workshops]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = workshops.filter((w) => {
      const matchesQ =
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.city.toLowerCase().includes(q) ||
        w.specialties.some((s) => s.toLowerCase().includes(q));
      const matchesCity = city === "all" || w.city === city;
      return matchesQ && matchesCity;
    });
    arr = [...arr].sort((a, b) => {
      switch (sort) {
        case "top":
          return b.avg_rating - a.avg_rating || b.review_count - a.review_count;
        case "worst":
          return (a.review_count ? a.avg_rating : 99) - (b.review_count ? b.avg_rating : 99);
        case "popular":
          return b.review_count - a.review_count;
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return arr;
  }, [workshops, query, city, sort]);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-accent/40 via-background to-background">
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              Real reviews from real drivers
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
              Find a mechanic
              <br />
              <span className="text-primary">you can actually trust.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Browse workshops added by the community, see honest ratings, and warn others
              about the bad apples. Add a shop in seconds.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, city, or specialty…"
                  className="h-12 pl-10"
                />
              </div>
              <Button asChild size="lg" className="h-12">
                <Link to="/workshops/new">Add a workshop</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container mx-auto px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">
            {loading ? "Loading…" : `${filtered.length} workshop${filtered.length === 1 ? "" : "s"}`}
          </h2>
          <div className="flex items-center gap-2">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top rated</SelectItem>
                <SelectItem value="worst">Worst rated</SelectItem>
                <SelectItem value="popular">Most reviewed</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <Wrench className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="mt-4 font-display text-xl font-semibold">No workshops yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to put a mechanic on the map.
            </p>
            <Button asChild className="mt-5">
              <Link to="/workshops/new">Add a workshop</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w) => (
              <li key={w.id}>
                <Link
                  to="/workshops/$slug"
                  params={{ slug: w.slug }}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-accent">
                    {w.photo_url ? (
                      <img
                        src={w.photo_url}
                        alt={w.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/40">
                        <Wrench className="h-12 w-12" />
                      </div>
                    )}
                    {w.review_count > 0 && (
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-sm font-semibold shadow-sm backdrop-blur">
                        <StarRating value={w.avg_rating} size={14} />
                        <span>{w.avg_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-semibold leading-tight">{w.name}</h3>
                    <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {w.city}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {w.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {w.specialties.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {w.review_count} review{w.review_count === 1 ? "" : "s"}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
