import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

type Props = {
  lat: number;
  lon: number;
  name: string;
};

type LeafletBits = {
  MapContainer: typeof import("react-leaflet").MapContainer;
  TileLayer: typeof import("react-leaflet").TileLayer;
  Marker: typeof import("react-leaflet").Marker;
  Popup: typeof import("react-leaflet").Popup;
};

export function WorkshopLocationMap({ lat, lon, name }: Props) {
  const [mounted, setMounted] = useState(false);
  const [bits, setBits] = useState<LeafletBits | null>(null);
  const [icon, setIcon] = useState<unknown>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const [rl, L] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      if (cancelled) return;
      const wIcon = (L as typeof import("leaflet")).divIcon({
        className: "",
        html: `<div style="position:relative;width:34px;height:42px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><svg viewBox="0 0 30 38" width="34" height="42" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 23 15 23s15-12 15-23C30 6.7 23.3 0 15 0z" fill="hsl(24 95% 53%)"/><circle cx="15" cy="15" r="6" fill="white"/><path d="M12 13l3-2 3 2v4l-3 2-3-2z" fill="hsl(24 95% 53%)"/></svg></div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -38],
      });
      setIcon(wIcon);
      setBits({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Ubicación</p>
      </div>
      <div className="h-56 w-full">
        {bits && icon ? (
          <bits.MapContainer
            center={[lat, lon]}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
          >
            <bits.TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <bits.Marker position={[lat, lon]} icon={icon as never}>
              <bits.Popup>{name}</bits.Popup>
            </bits.Marker>
          </bits.MapContainer>
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>
    </div>
  );
}
