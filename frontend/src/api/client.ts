import type { HealthResponse, RouteCollection, RouteFeature, RouteMetrics } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`Could not reach the FastAPI backend at ${API_BASE_URL}. ${message}`, { cause: error });
  }

  if (!response.ok) {
    const body = await response.text();
    let detail: string | undefined;
    try {
      detail = (JSON.parse(body) as { detail?: string }).detail;
    } catch {
      detail = undefined;
    }
    throw new Error(detail ?? body ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  routes: () => request<RouteCollection>("/routes"),
  route: (routeId: string) => request<RouteFeature>(`/routes/${routeId}`),
  metrics: (routeId: string) => request<RouteMetrics>(`/metrics/${routeId}`),
};
