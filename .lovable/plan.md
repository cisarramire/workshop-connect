## Goal
Enhance the home page (`src/routes/index.tsx`) with two new features:
1. A **Specialty filter** so users can narrow workshops by service (e.g. "Brakes", "Engine", "Electrical").
2. A **City minimap** as the first visual element of the page, showing a map centered on the user's city — but only if they grant location permission.

---

## 1. Specialty filter

**Where:** Next to the existing City + Sort selects in the results header.

**How:**
- Derive a unique, sorted `specialties` list from all loaded workshops (similar to how `cities` is computed today).
- Add a new `specialty` state (default `"all"`).
- Add a `<Select>` dropdown labeled "Specialty" with options: `All specialties` + every unique specialty string.
- Extend the existing `filtered` memo so a workshop only matches when `specialty === "all"` OR `w.specialties.includes(specialty)`.
- The free-text search box keeps working alongside it (search still matches name/city/specialty text).

On mobile (current viewport ~384px), the three filter selects will wrap below the heading — already handled by the existing `flex flex-wrap` container.

---

## 2. City minimap (geolocation-based)

**Placement:** Inside the hero section, shown as a compact card *above the search bar* (or to its side on desktop) so it's the first visual the user sees on load.

**Library:** Use **Leaflet + OpenStreetMap tiles** via `react-leaflet`.
- Free, no API key required (unlike Google Maps / Mapbox).
- Lightweight, works fine in a Worker SSR context because the map only renders client-side (we'll guard with a `useEffect` mount flag to avoid SSR issues).
- Packages to add: `leaflet`, `react-leaflet`, `@types/leaflet`.
- Leaflet's CSS will be imported in `src/styles.css`.

**Permission flow:**
- On mount, call `navigator.geolocation.getCurrentPosition(...)`.
- Three states handled:
  - **`idle` / `prompt`** — show a small placeholder card with a "📍 Show my city" button that triggers the request (so we don't auto-prompt aggressively; user clicks first). This is friendlier than a surprise browser prompt.
  - **`granted`** — render the Leaflet map (~h-48 on mobile, h-64 on desktop) centered on the user's coords with a marker. Reverse-geocode the coords with the free Nominatim API (`https://nominatim.openstreetmap.org/reverse?...&format=json`) to extract the city name, then display it as a caption: "Workshops near {city}".
  - **`denied` / `error`** — hide the map block entirely (no nagging). Hero falls back to its current layout.
- Optional bonus: when a city is detected, auto-set the existing City filter dropdown to that city if it matches one in the workshops list (so the list immediately scopes to nearby shops). User can change it back to "All cities".

**New component:** `src/components/CityMiniMap.tsx`
- Encapsulates the geolocation request, the Nominatim reverse-geocode, the loading/denied states, and the Leaflet `<MapContainer>`.
- Accepts an optional `onCityDetected?: (city: string) => void` callback so `index.tsx` can sync the City filter.
- Renders nothing during SSR (uses a `mounted` flag) to avoid `window`/`document` issues.

---

## Files changed
- **edit** `src/routes/index.tsx` — add specialty state + filter dropdown, render `<CityMiniMap />` in hero, wire `onCityDetected` to set city filter.
- **create** `src/components/CityMiniMap.tsx` — geolocation + Leaflet map + reverse geocode.
- **edit** `src/styles.css` — `@import "leaflet/dist/leaflet.css";`
- **install** `leaflet`, `react-leaflet`, `@types/leaflet`.

## Out of scope
- Showing workshop pins on the map (this iteration only shows the user's location; workshop coordinates aren't stored in the DB yet).
- Storing user-chosen location persistently.
- Storing workshop lat/lng — would require schema changes + a geocoder on the "Add workshop" form. Happy to do that as a follow-up if you want pins on the map.
