import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/workshops/new")({
  head: () => ({
    meta: [
      { title: "Add a workshop — WrenchRate" },
      { name: "description", content: "Add a mechanic workshop to the WrenchRate directory." },
    ],
  }),
  component: NewWorkshop,
});

const SUGGESTED = [
  "General repair",
  "Brakes",
  "Electrical",
  "Bodywork",
  "Tires",
  "Diagnostics",
  "Engine",
  "Transmission",
  "AC",
  "Hybrid/EV",
];

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().url("Invalid URL").max(200).optional().or(z.literal("")),
  description: z.string().trim().min(20, "At least 20 characters").max(2000),
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

  // Duplicate name check (debounced)
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
      // Resolve slug collisions
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
      if (photo) {
        const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${slug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("workshop-photos")
          .upload(path, photo, { upsert: false, contentType: photo.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("workshop-photos").getPublicUrl(path);
        photo_url = pub.publicUrl;
      }

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
        specialties,
      });
      if (error) throw error;

      toast.success("Workshop added!");
      navigate({ to: "/workshops/$slug", params: { slug } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">Add a workshop</h1>
      <p className="mt-2 text-muted-foreground">
        Share a mechanic shop so others can find — or avoid — it.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Workshop name *</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          {duplicate && (
            <p className="text-sm text-destructive">
              Looks like “{duplicate.name}” is already listed.{" "}
              <Link
                to="/workshops/$slug"
                params={{ slug: duplicate.slug }}
                className="font-medium underline"
              >
                View it
              </Link>
              .
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="city">City *</Label>
            <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
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
          <Label>Specialties</Label>
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
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            required
            rows={5}
            placeholder="What kind of work do they do? Anything to know?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">{description.length}/2000</p>
        </div>

        <div className="space-y-2">
          <Label>Photo</Label>
          {photoPreview ? (
            <div className="relative inline-block overflow-hidden rounded-xl border border-border">
              <img src={photoPreview} alt="preview" className="h-40 w-auto object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 px-6 py-10 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <ImagePlus className="h-5 w-5" />
              Upload a photo
              <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
            </label>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={busy} size="lg">
            {busy ? "Publishing…" : "Publish workshop"}
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link to="/">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
