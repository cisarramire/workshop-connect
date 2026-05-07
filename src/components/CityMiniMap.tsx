import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "loading" | "granted" | "denied";

type Props = {
  onCityDetected?: (city: string) => void;
  workshops?: Array<{ id: string; name: string; slug: string; lat: number; lon: number }>;
};

// Lazy-loaded react-leaflet bits live here so SSR is happy.
type LeafletBits = {
  MapContainer: typeof import("react-leaflet").MapContainer;
  TileLayer: typeof import("react-leaflet").TileLayer;
  Marker: typeof import("react-leaflet").Marker;
  Popup: typeof import("react-leaflet").Popup;
  icon: typeof import("leaflet").Icon;
};

export function CityMiniMap({ onCityDetected, workshops = [] }: Props) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [bits, setBits] = useState<LeafletBits | null>(null);
  const [defaultIcon, setDefaultIcon] = useState<unknown>(null);
  const [workshopIcon, setWorkshopIcon] = useState<unknown>(null);

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
      // Workshop pin: use a colored divIcon so it stands out from the user pin
      const wIcon = (L as typeof import("leaflet")).divIcon({
        className: "",
        html: `<div style="position:relative;width:30px;height:38px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><svg viewBox="0 0 30 38" width="30" height="38" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 23 15 23s15-12 15-23C30 6.7 23.3 0 15 0z" fill="hsl(24 95% 53%)"/><circle cx="15" cy="15" r="6" fill="white"/><path d="M12 13l3-2 3 2v4l-3 2-3-2z" fill="hsl(24 95% 53%)"/></svg></div>`,
        iconSize: [30, 38],
        iconAnchor: [15, 38],
        popupAnchor: [0, -34],
      });
      setWorkshopIcon(wIcon);
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
            {workshopIcon ? (<>
              {workshops
                .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lon))
                .map((w) => (
                  <bits.Marker
                    key={w.id}
                    position={[w.lat, w.lon]}
                    icon={workshopIcon as InstanceType<typeof bits.icon>}
                  >
                    <bits.Popup>
                      <a href={`/workshops/${w.slug}`} className="font-medium text-primary underline">
                        {w.name}
                      </a>
                    </bits.Popup>
                  </bits.Marker>
                ))}
            </>) : null}
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
