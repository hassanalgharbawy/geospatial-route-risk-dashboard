import { Boxes, CalendarClock, Database, MapPinned, Ship, Snowflake, Warehouse, Zap } from "lucide-react";
import type { RouteCollection, RouteFeature, RouteMetrics } from "../types";
import { LoadingBlock } from "./LoadingBlock";

interface RouteDetailsProps {
  routes?: RouteCollection;
  selectedRoute?: RouteFeature;
  metrics?: RouteMetrics;
  selectedRouteId?: string;
  onSelectRoute: (routeId: string) => void;
  isLoading: boolean;
}

function formatNumber(value?: number, suffix = "") {
  if (value === undefined || Number.isNaN(value)) return "Unavailable";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
}

export function RouteDetails({
  routes,
  selectedRoute,
  metrics,
  selectedRouteId,
  onSelectRoute,
  isLoading,
}: RouteDetailsProps) {
  if (isLoading) return <LoadingBlock label="Loading selected route" minHeight="min-h-[620px]" />;

  return (
    <aside className="flex min-h-[620px] flex-col gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500" htmlFor="route-select">
          Route
        </label>
        <select
          id="route-select"
          value={selectedRouteId ?? ""}
          onChange={(event) => onSelectRoute(event.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-950 outline-none ring-teal-700/20 focus:border-teal-700 focus:ring-4"
        >
          {routes?.features.map((route) => (
            <option key={route.id} value={route.id}>
              {route.properties.name}
            </option>
          ))}
        </select>
      </div>

      {selectedRoute ? (
        <>
          <div className="border-b border-stone-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{selectedRoute.properties.corridor}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-stone-950">{selectedRoute.properties.name}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{selectedRoute.properties.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <Warehouse className="h-4 w-4" aria-hidden="true" />
                Origin
              </div>
              <p className="mt-2 text-sm font-semibold text-stone-950">{selectedRoute.properties.origin}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <MapPinned className="h-4 w-4" aria-hidden="true" />
                Destination
              </div>
              <p className="mt-2 text-sm font-semibold text-stone-950">{selectedRoute.properties.destination}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <Ship className="h-4 w-4" aria-hidden="true" />
                Vessel
              </div>
              <p className="mt-2 text-sm font-semibold text-stone-950">{selectedRoute.properties.vessel_class}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                Season
              </div>
              <p className="mt-2 text-sm font-semibold text-stone-950">{selectedRoute.properties.season}</p>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-[#f7f9f7] p-4">
            <h3 className="text-sm font-semibold text-stone-950">DuckDB Query Result</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Distance</p>
                <p className="mt-1 text-lg font-semibold text-stone-950">{formatNumber(metrics?.total_distance_km, " km")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Estimated Days</p>
                <p className="mt-1 text-lg font-semibold text-stone-950">{formatNumber(metrics?.estimated_days)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Avg Speed</p>
                <p className="mt-1 text-lg font-semibold text-stone-950">{formatNumber(metrics?.avg_speed_knots, " kn")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Emissions</p>
                <p className="mt-1 text-lg font-semibold text-stone-950">{formatNumber(metrics?.emissions_tonnes, " t")}</p>
              </div>
            </div>
          </div>

          <div className="mt-auto rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Boxes className="h-4 w-4" aria-hidden="true" />
              Extension Notes
            </div>
            <p>
              The local CSV and GeoJSON files can be promoted to GeoParquet partitions in S3, queried with DuckDB spatial SQL, and refreshed by Lambda jobs that publish updated route-risk snapshots.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-teal-800">
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                GeoParquet
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-amber-800">
                <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
                S3 data lake
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-red-800">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                Lambda processing
              </span>
            </div>
          </div>
        </>
      ) : null}
    </aside>
  );
}
