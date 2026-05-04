import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { slugify } from "@/lib/slug";
import { AddressMapPicker } from "@/components/AddressMapPicker";

export const Route = createFileRoute("/workshops/new")({
  head: () => ({
    meta: [
      { title: "Agregar un taller — MecaRate" },
      { name: "description", content: "Agrega un taller mecánico al directorio de MecaRate." },
    ],
  }),
  component: NewWorkshop,
});

const SUGGESTED = [
  "Mecánica general",
  "Frenos",
  "Eléctrico",
  "Hojalatería",
  "Llantas",
  "Diagnóstico",
  "Motor",
  "Transmisión",
  "Aire acondicionado",
  "Híbrido/Eléctrico",
];

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
});

function NewWorkshop() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState<{ slug: string; name: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (name.trim().length < 3) {
      setDuplicate(null);
      return;
    }
    const t = setTimeout(async () => {
      const slug = slugify(name);
      if (!slug) return;
      const { data } = await supabase
        .from("workshops")
        .select("name, slug")
        .eq("slug", slug)
        .maybeSingle();
      setDuplicate(data ?? null);
    }, 400);
    return () => clearTimeout(t);
  }, [name]);

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotos((prev) => [...prev, ...files].slice(0, 8));
    setPhotoPreviews((prev) =>
      [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, 8),
    );
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = schema.safeParse({ name, city, address, phone, website, description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    try {
      const baseSlug = slugify(parsed.data.name);
      let slug = baseSlug;
      for (let i = 2; i < 10; i++) {
        const { data: exists } = await supabase
          .from("workshops")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!exists) break;
        slug = `${baseSlug}-${i}`;
      }

      let photo_url: string | null = null;
      const uploaded: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const f = photos[i];
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${slug}-${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("workshop-photos")
          .upload(path, f, { upsert: false, contentType: f.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("workshop-photos").getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      if (uploaded.length) photo_url = uploaded[0];

      const { error } = await supabase.from("workshops").insert({
        created_by: user.id,
        name: parsed.data.name,
        slug,
        city: parsed.data.city,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        website: parsed.data.website || null,
        description: parsed.data.description,
        photo_url,
        photos: uploaded,
        specialties,
      });
      if (error) throw error;

      toast.success("¡Taller agregado!");
      navigate({ to: "/workshops/$slug", params: { slug } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Algo salió mal";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">Agregar un taller</h1>
      <p className="mt-2 text-muted-foreground">
        Comparte un taller mecánico para que otros puedan encontrarlo — o evitarlo.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del taller *</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          {duplicate && (
            <p className="text-sm text-destructive">
              Parece que “{duplicate.name}” ya está listado.{" "}
              <Link
                to="/workshops/$slug"
                params={{ slug: duplicate.slug }}
                className="font-medium underline"
              >
                Verlo
              </Link>
              .
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="city">Ciudad *</Label>
            <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Ubicación</Label>
          <AddressMapPicker
            address={address}
            city={city}
            onChange={({ address: a, city: c }) => {
              setAddress(a);
              if (c) setCity(c);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website">Sitio web</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label>Especialidades</Label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => {
              const active = specialties.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción *</Label>
          <Textarea
            id="description"
            required
            rows={5}
            placeholder="¿Qué tipo de trabajo hacen? ¿Algo que se deba saber?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">{description.length}/2000</p>
        </div>

        <div className="space-y-2">
          <Label>Fotos <span className="text-xs text-muted-foreground">(hasta 8)</span></Label>
          <div className="flex flex-wrap gap-3">
            {photoPreviews.map((src, idx) => (
              <div
                key={src}
                className="relative overflow-hidden rounded-xl border border-border"
              >
                <img src={src} alt={`vista previa ${idx + 1}`} className="h-32 w-32 object-cover" />
                {idx === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Portada
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 shadow"
                  aria-label="Quitar foto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photoPreviews.length < 8 && (
              <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-card/40 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <ImagePlus className="h-5 w-5" />
                Agregar foto
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPhotoChange}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground">La primera foto se usa como portada.</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={busy} size="lg">
            {busy ? "Publicando…" : "Publicar taller"}
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link to="/">Cancelar</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
