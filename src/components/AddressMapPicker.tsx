import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Coords = { lat: number; lon: number };

type Props = {
  address: string;
  city: string;
  onChange: (next: { address: string; city: string; coords: Coords | null }) => void;
};

type LeafletBits = {
  MapContainer: typeof import("react-leaflet").MapContainer;
  TileLayer: typeof import("react-leaflet").TileLayer;
  Marker: typeof import("react-leaflet").Marker;
  useMapEvents: typeof import("react-leaflet").useMapEvents;
  Icon: typeof import("leaflet").Icon;
};

export function AddressMapPicker({ address, city, onChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const [bits, setBits] = useState<LeafletBits | null>(null);
  const [icon, setIcon] = useState<unknown>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const lastReverseRef = useRef<string>("");

  useEffect(() => {
    setMounted(true);
    // Try to center map on the user's current location on first mount
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords((prev) => prev ?? { lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          /* denied — fall back to default center */
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
      );
    }
  }, []);

  // Auto-center map on city when it changes (debounced)
  useEffect(() => {
    if (!city || city.trim().length < 3) return;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=es`,
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setCoords({ lat, lon });
        }
      } catch {
        /* silent */
      }
    }, 600);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const [rl, L] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      if (cancelled) return;
      const ic = new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setIcon(ic);
      setBits({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        useMapEvents: rl.useMapEvents,
        Icon: L.Icon,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const reverseGeocode = async (lat: number, lon: number) => {
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (lastReverseRef.current === key) return;
    lastReverseRef.current = key;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1&accept-language=es`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const a = data?.address ?? {};
      const street = [a.road, a.house_number].filter(Boolean).join(" ");
      const newAddress =
        street ||
        a.neighbourhood ||
        a.suburb ||
        data?.display_name?.split(",").slice(0, 2).join(", ") ||
        address;
      const newCity = a.city || a.town || a.village || a.county || city;
      onChange({ address: newAddress, city: newCity, coords: { lat, lon } });
    } catch {
      /* silent */
    }
  };

  const forwardGeocode = async () => {
    const q = [address, city].filter(Boolean).join(", ").trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=es`,
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const next = { lat, lon };
        setCoords(next);
        onChange({ address, city, coords: next });
      }
    } catch {
      /* silent */
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        reverseGeocode(lat, lon);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  function MapClickHandler() {
    if (!bits) return null;
    bits.useMapEvents({
      click(e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        setCoords({ lat, lon });
        reverseGeocode(lat, lon);
      },
    });
    return null;
  }

  const center: [number, number] = coords
    ? [coords.lat, coords.lon]
    : [19.4326, -99.1332]; // Mexico City fallback

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="address">Dirección</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) =>
              onChange({ address: e.target.value, city, coords })
            }
            placeholder="Calle y número"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={forwardGeocode}
            disabled={searching || (!address && !city)}
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            <span className="ml-2">Ubicar en el mapa</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={useMyLocation}
            disabled={locating}
            title="Usar mi ubicación actual"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Haz clic en el mapa para ajustar el punto exacto. La dirección y la ciudad se
        sincronizan con el mapa automáticamente.
      </p>

      <div className="h-64 w-full overflow-hidden rounded-xl border border-border bg-muted">
        {bits && icon ? (
          <bits.MapContainer
            center={center}
            zoom={coords ? 16 : 11}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <bits.TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapClickHandler />
            {coords && (
              <bits.Marker
                position={[coords.lat, coords.lon]}
                icon={icon as InstanceType<typeof bits.Icon>}
              />
            )}
          </bits.MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {coords && (
        <p className="text-xs text-muted-foreground">
          Coordenadas: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
        </p>
      )}
    </div>
  );
}
