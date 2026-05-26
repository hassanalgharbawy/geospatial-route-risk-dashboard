import { DatabaseZap, Map, RefreshCcw, Ship } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ErrorBanner } from "../components/ErrorBanner";
import { MetricsCharts } from "../components/MetricsCharts";
import { RouteDetails } from "../components/RouteDetails";
import { RouteMap } from "../components/RouteMap";
import type { HealthResponse, RouteCollection, RouteFeature, RouteMetrics } from "../types";

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function selectHighestRiskRoute(routes: RouteCollection) {
  return [...routes.features].sort(
    (first, second) => (second.properties.ice_risk_score ?? 0) - (first.properties.ice_risk_score ?? 0),
  )[0]?.id;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | undefined>();
  const [routes, setRoutes] = useState<RouteCollection | undefined>();
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>();
  const [selectedRoute, setSelectedRoute] = useState<RouteFeature | undefined>();
  const [metrics, setMetrics] = useState<RouteMetrics | undefined>();

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsBootstrapping(true);
    setPageError(null);
    try {
      const [healthResponse, routeResponse] = await Promise.all([api.health(), api.routes()]);
      setHealth(healthResponse);
      setRoutes(routeResponse);
      setSelectedRouteId((current) => current ?? selectHighestRiskRoute(routeResponse));
    } catch (error) {
      setPageError(toErrorMessage(error, "Failed to load route dashboard data"));
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!selectedRouteId) return;

    let isActive = true;
    setIsRouteLoading(true);
    setRouteError(null);

    Promise.all([api.route(selectedRouteId), api.metrics(selectedRouteId)])
      .then(([routeResponse, metricsResponse]) => {
        if (!isActive) return;
        setSelectedRoute(routeResponse);
        setMetrics(metricsResponse);
      })
      .catch((error) => {
        if (!isActive) return;
        setRouteError(toErrorMessage(error, "Failed to load route metrics"));
      })
      .finally(() => {
        if (isActive) setIsRouteLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedRouteId]);

  const summary = useMemo(() => {
    const features = routes?.features ?? [];
    const highRiskCount = features.filter((route) => (route.properties.ice_risk_score ?? 0) >= 70).length;
    return {
      routeCount: health?.route_count ?? features.length,
      sampleCount: health?.sample_count ?? 0,
      averageIceRisk: average(features.map((route) => route.properties.ice_risk_score ?? 0)),
      highRiskCount,
    };
  }, [health, routes]);

  return (
    <main className="min-h-screen bg-[#f7f9f7] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-stone-200 pb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-lg border border-teal-200 bg-teal-50 p-2 text-teal-800">
                  <Map className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Geospatial Route Risk Dashboard</p>
              </div>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
                Mock Arctic shipping-route intelligence for environmental risk assessment
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">
                FastAPI serves GeoJSON route geometry and DuckDB-queryable risk metrics to a React map and ECharts dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={isBootstrapping}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:border-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              title="Refresh route and risk data"
            >
              <RefreshCcw className={`h-4 w-4 ${isBootstrapping ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </header>

        {pageError ? <ErrorBanner message={pageError} /> : null}
        {routeError ? <ErrorBanner title="Selected route unavailable" message={routeError} /> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <Ship className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Routes
            </div>
            <p className="mt-2 text-2xl font-semibold">{summary.routeCount}</p>
            <p className="mt-2 text-sm text-stone-600">Synthetic shipping corridors loaded as GeoJSON features</p>
          </article>
          <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <DatabaseZap className="h-4 w-4 text-amber-700" aria-hidden="true" />
              DuckDB Samples
            </div>
            <p className="mt-2 text-2xl font-semibold">{summary.sampleCount}</p>
            <p className="mt-2 text-sm text-stone-600">Checkpoint records queried from local CSV datasets</p>
          </article>
          <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Average Ice Risk</p>
            <p className="mt-2 text-2xl font-semibold">{summary.averageIceRisk.toFixed(1)} / 100</p>
            <p className="mt-2 text-sm text-stone-600">Fleet-wide score across the mock route library</p>
          </article>
          <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">High-Risk Routes</p>
            <p className="mt-2 text-2xl font-semibold">{summary.highRiskCount}</p>
            <p className="mt-2 text-sm text-stone-600">Routes with ice-risk score at or above 70</p>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.55fr)]">
          <RouteMap
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            isLoading={isBootstrapping}
          />
          <RouteDetails
            routes={routes}
            selectedRoute={selectedRoute}
            metrics={metrics}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            isLoading={isRouteLoading || isBootstrapping}
          />
        </section>

        <MetricsCharts metrics={metrics} isLoading={isRouteLoading || isBootstrapping} />
      </div>
    </main>
  );
}
