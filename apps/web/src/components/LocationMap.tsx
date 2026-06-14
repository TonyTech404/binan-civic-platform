import { useEffect, useRef } from "react";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BINAN_CENTER } from "@bantay/shared";

// Free raster basemap from OpenStreetMap tiles via the MapLibre demo style pattern.
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

interface Props {
  value?: { lat: number; lng: number } | null;
  onChange?: (coords: { lat: number; lng: number }) => void;
  interactive?: boolean;
  className?: string;
}

/** Map for picking (interactive) or displaying (read-only) a report location. */
export function LocationMap({ value, onChange, interactive = true, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Init once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: value ? [value.lng, value.lat] : [BINAN_CENTER.lng, BINAN_CENTER.lat],
      zoom: value ? 16 : BINAN_CENTER.zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const placeMarker = (lng: number, lat: number) => {
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: "#1d62f0", draggable: interactive })
          .setLngLat([lng, lat])
          .addTo(map);
        if (interactive) {
          markerRef.current.on("dragend", () => {
            const p = markerRef.current!.getLngLat();
            onChangeRef.current?.({ lat: p.lat, lng: p.lng });
          });
        }
      }
    };

    if (value) placeMarker(value.lng, value.lat);

    if (interactive) {
      map.on("click", (e) => {
        placeMarker(e.lngLat.lng, e.lngLat.lat);
        onChangeRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. "use my location").
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (markerRef.current) {
      markerRef.current.setLngLat([value.lng, value.lat]);
    } else {
      markerRef.current = new maplibregl.Marker({ color: "#1d62f0", draggable: interactive })
        .setLngLat([value.lng, value.lat])
        .addTo(map);
    }
    map.easeTo({ center: [value.lng, value.lat], zoom: Math.max(map.getZoom(), 16) });
  }, [value, interactive]);

  return <div ref={containerRef} className={className} />;
}
