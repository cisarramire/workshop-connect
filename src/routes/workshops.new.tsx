import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ImagePlus, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/workshops/new")({
  head: () => ({
    meta: [
      { title: "Agregar un taller — MecaRate" },
      { name: "description", content: "Agrega un taller mecánico al directorio de MecaRate." },
    ],
  }),
  component: NewWorkshop,
});

const SPECIALTIES = [
  "Mecánica general",
  "Frenos",
  "Eléctrico",
  "Hojalatería",
  "Llantas",
  "Diagnóstico",
  "Motor",
  "Transmisión",
  "Aire acondicionado",
  "Híbrido / Eléctrico",
];

const schema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(100),
  city: z.string().trim().min(2, "Escribe la ciudad").max(80),
  address: z.string().trim().min(5, "Escribe la dirección").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .url("URL inválida — incluye https://")
    .max(200)
    .optional()
    .or(z.literal("")),
});

function NewWorkshop() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState<{ slug: string; name: string } | null>(null);
  // Map pin coords — null means not placed yet
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const marker = useRef<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Duplicate check
  useEffect(() => {
    if (name.trim().length < 3) { setDuplicate(null); return; }
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

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    // Dynamically load Leaflet so it doesn't break SSR
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [25.4232, -100.9963], // Saltillo
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        setPin({ lat, lng });
        if (marker.current) {
          marker.current.setLatLng([lat, lng]);
        } else {
          marker.current = L.marker([lat, lng]).addTo(map);
        }
      });

      leafletMap.current = map;
    });

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
      marker.current = null;
    };
  }, []);

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotos((prev) => [...prev, ...files].slice(0, 6));
    setPhotoPreviews((prev) =>
      [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, 6),
    );
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleSpecialty = (s: string) =>
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (specialties.length === 0) {
      toast.error("Selecciona al menos una especialidad");
      return;
    }

    const parsed = schema.safeParse({ name, city, address, phone, website });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    try {
      let baseSlug = slugify(parsed.data.name);
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

      // Upload photos
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
        address: parsed.data.address,
        phone: parsed.data.phone || null,
        website: parsed.data.website || null,
        description: "", // kept for DB compatibility
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

      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">

        {/* Nombre */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del taller *</Label>
          <Input
            id="name"
            required
            placeholder="Ej. Taller Ramírez"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          {duplicate && (
            <p className="text-sm text-destructive">
              "{duplicate.name}" ya está en el directorio.{" "}
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

        {/* Ciudad */}
        <div className="space-y-1.5">
          <Label htmlFor="city">Ciudad *</Label>
          <Input
            id="city"
            required
            placeholder="Ej. Saltillo"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
          />
        </div>

        {/* Especialidades */}
        <div className="space-y-2">
          <Label>
            Especialidades *{" "}
            <span className="text-xs text-muted-foreground">(selecciona las que apliquen)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => {
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

        {/* Dirección + Mapa */}
        <div className="space-y-2">
          <Label htmlFor="address">Dirección *</Label>
          <Input
            id="address"
            required
            placeholder="Ej. Av. Constitución 123, Col. Centro"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
          />
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {pin
                ? `Pin colocado: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
                : "Opcional — haz clic en el mapa para marcar la ubicación exacta"}
            </div>
            <div ref={mapRef} style={{ height: 240, width: "100%" }} />
          </div>
        </div>

        {/* Datos opcionales del dueño */}
        <div className="rounded-xl border border-dashed border-border p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Solo si eres el dueño del taller</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estos datos son opcionales y solo se muestran si los proporcionas.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="Ej. 844 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
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
          </div>
        </div>

        {/* Fotos opcionales */}
        <div className="space-y-2">
          <Label>
            Fotos{" "}
            <span className="text-xs text-muted-foreground">(opcional, hasta 6)</span>
          </Label>
          <div className="flex flex-wrap gap-3">
            {photoPreviews.map((src, idx) => (
              <div key={src} className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={src}
                  alt={`vista previa ${idx + 1}`}
                  className="h-28 w-28 object-cover"
                />
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
            {photoPreviews.length < 6 && (
              <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-card/40 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
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
          <Button type="submit" disabled={busy || !!duplicate} size="lg">
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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { slugify } from "@/lib/slug";

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
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().url("URL inválida").max(200).optional().or(z.literal("")),
  description: z.string().trim().min(20, "Mínimo 20 caracteres").max(2000),
});

function NewWorkshop() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
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
      let baseSlug = slugify(parsed.data.name);
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

        <div className="space-y-1.5">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
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
