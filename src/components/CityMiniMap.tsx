import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "loading" | "granted" | "denied";

type Props = {
  onCityDetected?: (city: string) => void;
};

// Lazy-loaded react-leaflet bits live here so SSR is happy.
type LeafletBits = {
  MapContainer: typeof import("react-leaflet").MapContainer;
  TileLayer: typeof import("react-leaflet").TileLayer;
  Marker: typeof import("react-leaflet").Marker;
  Popup: typeof import("react-leaflet").Popup;
  icon: typeof import("leaflet").Icon;
};

export function CityMiniMap({ onCityDetected }: Props) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [bits, setBits] = useState<LeafletBits | null>(null);
  const [defaultIcon, setDefaultIcon] = useState<unknown>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lazy-load Leaflet after mount so it never touches the SSR bundle.
  useEffect(() => {
    if (!mounted || status !== "granted") return;
    let cancelled = false;
    (async () => {
      const [rl, L] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      if (cancelled) return;
      const icon = new L.Icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setDefaultIcon(icon);
      setBits({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
        icon: L.Icon,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, status]);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        setStatus("granted");
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1&accept-language=es`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json();
            const detected =
              data?.address?.city ||
              data?.address?.town ||
              data?.address?.village ||
              data?.address?.county ||
              null;
            if (detected) {
              setCity(detected);
              onCityDetected?.(detected);
            }
          }
        } catch {
          /* silent */
        }
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  };

  if (!mounted) return null;
  if (status === "denied") return null;

  if (status === "idle") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Ver talleres cerca de ti</p>
          <p className="text-xs text-muted-foreground">
            Permite la ubicación para ver tu ciudad en el mapa.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={requestLocation}>
          Mostrar mapa
        </Button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-card)] backdrop-blur">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Localizándote…</p>
      </div>
    );
  }

  // status === "granted"
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">
          {city ? (
            <>
              Talleres cerca de <span className="text-primary">{city}</span>
            </>
          ) : (
            "Tu ubicación"
          )}
        </p>
      </div>
      <div className="h-48 w-full sm:h-56">
        {bits && coords && defaultIcon ? (
          <bits.MapContainer
            center={[coords.lat, coords.lon]}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
          >
            <bits.TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <bits.Marker
              position={[coords.lat, coords.lon]}
              icon={defaultIcon as InstanceType<typeof bits.icon>}
            >
              <bits.Popup>Estás aquí</bits.Popup>
            </bits.Marker>
          </bits.MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
