import "leaflet/dist/leaflet.css";
import "mapbox-gl/dist/mapbox-gl.css";

import L from "leaflet";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import type { RouteCollection, RouteFeature } from "../types";

interface RouteMapProps {
  routes?: RouteCollection;
  selectedRouteId?: string;
  onSelectRoute: (routeId: string) => void;
  isLoading: boolean;
}

function riskColor(score?: number) {
  if (score === undefined) return "#4b5563";
  if (score >= 75) return "#b42318";
  if (score >= 55) return "#d97706";
  return "#0f766e";
}

function leafletStyle(feature: RouteFeature | undefined, selectedRouteId?: string): L.PathOptions {
  const isSelected = feature?.properties.id === selectedRouteId;
  return {
    color: isSelected ? "#17201c" : riskColor(feature?.properties.ice_risk_score),
    weight: isSelected ? 6 : 4,
    opacity: isSelected ? 0.95 : 0.78,
    lineCap: "round",
    lineJoin: "round",
  };
}

function fitLeafletBounds(map: L.Map, routes: RouteCollection) {
  const bounds = L.latLngBounds([]);
  routes.features.forEach((feature) => {
    feature.geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lat, lng]));
  });
  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.18), { animate: false });
  }
}

function fitMapboxBounds(map: mapboxgl.Map, routes: RouteCollection) {
  const bounds = new mapboxgl.LngLatBounds();
  routes.features.forEach((feature) => {
    feature.geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
  });
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 58, maxZoom: 4.2, duration: 0 });
  }
}

function mapboxLineColor(selectedRouteId?: string): mapboxgl.ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "id"], selectedRouteId ?? ""],
    "#17201c",
    [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "ice_risk_score"], 0],
      35,
      "#0f766e",
      60,
      "#d97706",
      80,
      "#b42318",
    ],
  ] as mapboxgl.ExpressionSpecification;
}

export function RouteMap({ routes, selectedRouteId, onSelectRoute, isLoading }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletLayerRef = useRef<L.GeoJSON | null>(null);
  const mapboxMapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxSourceReadyRef = useRef(false);
  const onSelectRef = useRef(onSelectRoute);

  const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
  const useMapbox = Boolean(mapboxToken);
  const mapStatus = useMemo(
    () => (useMapbox ? "Mapbox GL JS" : "Mapbox token missing: Leaflet + OpenStreetMap fallback active"),
    [useMapbox],
  );

  useEffect(() => {
    onSelectRef.current = onSelectRoute;
  }, [onSelectRoute]);

  useEffect(() => {
    if (useMapbox || !containerRef.current || leafletMapRef.current) return;

    const map = L.map(containerRef.current, {
      attributionControl: true,
      zoomControl: false,
    }).setView([65.5, -82], 3);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 12,
    }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      leafletLayerRef.current = null;
    };
  }, [useMapbox]);

  useEffect(() => {
    if (!useMapbox || !containerRef.current || mapboxMapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-82, 65.5],
      zoom: 2.3,
      cooperativeGestures: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    mapboxMapRef.current = map;

    return () => {
      map.remove();
      mapboxMapRef.current = null;
      mapboxSourceReadyRef.current = false;
    };
  }, [mapboxToken, useMapbox]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (useMapbox || !map || !routes) return;

    if (leafletLayerRef.current) {
      leafletLayerRef.current.remove();
    }

    leafletLayerRef.current = L.geoJSON(routes as GeoJSON.FeatureCollection, {
      style: (feature) => leafletStyle(feature as RouteFeature, selectedRouteId),
      onEachFeature: (feature, layer) => {
        const route = feature as RouteFeature;
        layer.on("click", () => onSelectRef.current(route.properties.id));
        layer.bindTooltip(route.properties.name, { sticky: true });
      },
    }).addTo(map);

    fitLeafletBounds(map, routes);
  }, [routes, selectedRouteId, useMapbox]);

  useEffect(() => {
    const map = mapboxMapRef.current;
    if (!useMapbox || !map || !routes) return;

    const applyRoutes = () => {
      const source = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(routes as GeoJSON.FeatureCollection);
      } else {
        map.addSource("routes", {
          type: "geojson",
          data: routes as GeoJSON.FeatureCollection,
        });
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "routes",
          paint: {
            "line-color": "#ffffff",
            "line-width": 8,
            "line-opacity": 0.78,
          },
        });
        map.addLayer({
          id: "route-lines",
          type: "line",
          source: "routes",
          paint: {
            "line-color": mapboxLineColor(selectedRouteId),
            "line-width": ["case", ["==", ["get", "id"], selectedRouteId ?? ""], 6, 4],
            "line-opacity": 0.92,
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        });
        map.on("click", "route-lines", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") onSelectRef.current(id);
        });
        map.on("mouseenter", "route-lines", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "route-lines", () => {
          map.getCanvas().style.cursor = "";
        });
      }

      map.setPaintProperty("route-lines", "line-color", mapboxLineColor(selectedRouteId));
      map.setPaintProperty("route-lines", "line-width", ["case", ["==", ["get", "id"], selectedRouteId ?? ""], 6, 4]);

      if (!mapboxSourceReadyRef.current) {
        fitMapboxBounds(map, routes);
        mapboxSourceReadyRef.current = true;
      }
    };

    if (map.isStyleLoaded()) {
      applyRoutes();
    } else {
      map.once("load", applyRoutes);
    }
  }, [routes, selectedRouteId, useMapbox]);

  return (
    <section className="relative min-h-[620px] overflow-hidden rounded-lg border border-stone-200 bg-stone-100 shadow-sm">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-md border border-stone-200 bg-white/95 px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm">
        {mapStatus}
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex gap-2 rounded-md border border-stone-200 bg-white/95 px-3 py-2 text-xs font-medium text-stone-700 shadow-sm">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-700" />
          Low
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
          Moderate
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-700" />
          High
        </span>
      </div>
      {isLoading ? (
        <div className="absolute inset-0 z-[600] grid place-items-center bg-white/80 text-sm font-medium text-stone-700">
          Loading route geometry
        </div>
      ) : null}
    </section>
  );
}
