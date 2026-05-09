import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { StarRating } from "@/components/StarRating";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [{ title: "Mi cuenta — MecaRate" }],
  }),
  component: MePage,
});

type MyWorkshop = { id: string; name: string; slug: string; city: string };
type MyReview = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  workshop: { name: string; slug: string } | null;
};
type MyComment = {
  id: string;
  body: string;
  created_at: string;
  review_id: string;
};

function MePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [workshops, setWorkshops] = useState<MyWorkshop[]>([]);
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    setName(profile?.display_name ?? "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ws }, { data: rs }, { data: cs }] = await Promise.all([
        supabase
          .from("workshops")
          .select("id,name,slug,city")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("id,rating,body,created_at,workshop:workshops(name,slug)")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("review_comments")
          .select("id,body,created_at,review_id")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setWorkshops((ws ?? []) as MyWorkshop[]);
      setReviews((rs ?? []) as unknown as MyReview[]);
      setComments((cs ?? []) as MyComment[]);
    })();
  }, [user]);

  if (loading || !user) {
    return <main className="container mx-auto px-4 py-20 text-center text-muted-foreground">Cargando…</main>;
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) return toast.error("El nombre debe tener 2–50 caracteres");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil actualizado");
    setEditing(false);
    refreshProfile();
  };

  const onAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecciona una imagen");
    if (file.size > 3 * 1024 * 1024) return toast.error("La imagen debe pesar menos de 3 MB");

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("id", user.id);
    setUploading(false);
    if (updErr) return toast.error(updErr.message);
    toast.success("Foto de perfil actualizada");
    refreshProfile();
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xl">
              {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-60"
            aria-label="Cambiar foto de perfil"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />
        </div>
        <div className="flex-1">
          {editing ? (
            <form onSubmit={saveProfile} className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="name" className="text-xs">
                  Nombre para mostrar
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
              </div>
              <Button type="submit" disabled={busy}>
                Guardar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </form>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold">{profile?.display_name ?? "—"}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </>
          )}
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-4 w-4" /> Editar
          </Button>
        )}
      </div>

      <Tabs defaultValue="workshops" className="mt-10">
        <TabsList>
          <TabsTrigger value="workshops">Talleres ({workshops.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reseñas ({reviews.length})</TabsTrigger>
          <TabsTrigger value="comments">Comentarios ({comments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="workshops" className="mt-6">
          {workshops.length === 0 ? (
            <EmptyState text="Aún no has agregado ningún taller." cta />
          ) : (
            <ul className="space-y-3">
              {workshops.map((w) => (
                <li key={w.id}>
                  <Link
                    to="/workshops/$slug"
                    params={{ slug: w.slug }}
                    className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
                  >
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.city}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          {reviews.length === 0 ? (
            <EmptyState text="Aún no has escrito ninguna reseña." />
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    {r.workshop ? (
                      <Link
                        to="/workshops/$slug"
                        params={{ slug: r.workshop.slug }}
                        className="font-medium hover:text-primary"
                      >
                        {r.workshop.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Taller eliminado</span>
                    )}
                    <StarRating value={r.rating} size={14} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          {comments.length === 0 ? (
            <EmptyState text="Aún no has publicado ningún comentario." />
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                  <p>{c.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function EmptyState({ text, cta }: { text: string; cta?: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
      {text}
      {cta && (
        <div className="mt-4">
          <Button asChild>
            <Link to="/workshops/new">Agregar un taller</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
