from copy import deepcopy
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.database import (
    DATA_DIR,
    get_route_metric_row,
    list_risk_samples,
    list_route_metric_rows,
    load_routes_geojson,
    route_counts,
    validate_data_files,
)
from app.schemas import HealthResponse, RouteCollection, RouteFeature, RouteMetrics


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_data_files()
    yield


app = FastAPI(
    title="Geospatial Route Risk Dashboard API",
    description="Mock shipping-route and environmental-risk API powered by FastAPI and DuckDB.",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "health", "description": "Service and local data health checks."},
        {"name": "routes", "description": "GeoJSON route features for map visualization."},
        {"name": "metrics", "description": "DuckDB-backed route risk and performance metrics."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _metrics_by_route_id() -> dict[str, dict[str, Any]]:
    return {row["route_id"]: row for row in list_route_metric_rows()}


def _enrich_feature(feature: dict[str, Any], metrics: dict[str, Any] | None = None) -> dict[str, Any]:
    enriched = deepcopy(feature)
    route_id = enriched.get("id") or enriched.get("properties", {}).get("id")
    enriched["id"] = route_id
    enriched.setdefault("properties", {})["id"] = route_id
    if metrics:
        enriched["properties"].update(
            {
                "total_distance_km": metrics["total_distance_km"],
                "ice_risk_score": metrics["ice_risk_score"],
                "travel_difficulty": metrics["travel_difficulty"],
                "ship_performance_index": metrics["ship_performance_index"],
            }
        )
    return enriched


def _route_feature_or_404(route_id: str) -> dict[str, Any]:
    geojson = load_routes_geojson()
    metrics_lookup = _metrics_by_route_id()
    for feature in geojson.get("features", []):
        candidate_id = feature.get("id") or feature.get("properties", {}).get("id")
        if candidate_id == route_id:
            return _enrich_feature(feature, metrics_lookup.get(route_id))
    raise HTTPException(status_code=404, detail=f"Route '{route_id}' was not found")


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    counts = route_counts()
    return HealthResponse(status="ok", database="duckdb", data_directory=str(DATA_DIR), **counts)


@app.get("/routes", response_model=RouteCollection, tags=["routes"])
def list_routes() -> RouteCollection:
    geojson = load_routes_geojson()
    metrics_lookup = _metrics_by_route_id()
    features = [
        _enrich_feature(feature, metrics_lookup.get(feature.get("id") or feature.get("properties", {}).get("id")))
        for feature in geojson.get("features", [])
    ]
    features.sort(key=lambda feature: feature["properties"]["name"])
    return RouteCollection(type="FeatureCollection", features=[RouteFeature(**feature) for feature in features])


@app.get("/routes/{route_id}", response_model=RouteFeature, tags=["routes"])
def route_detail(route_id: str) -> RouteFeature:
    return RouteFeature(**_route_feature_or_404(route_id))


@app.get("/metrics/{route_id}", response_model=RouteMetrics, tags=["metrics"])
def route_metrics(route_id: str) -> RouteMetrics:
    feature = _route_feature_or_404(route_id)
    row = get_route_metric_row(route_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Metrics for route '{route_id}' were not found")

    checkpoints = [{key: value for key, value in sample.items() if key != "route_id"} for sample in list_risk_samples(route_id)]
    return RouteMetrics(
        **row,
        route_name=feature["properties"]["name"],
        checkpoints=checkpoints,
    )
