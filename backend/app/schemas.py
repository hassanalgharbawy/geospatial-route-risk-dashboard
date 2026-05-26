from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["duckdb"]
    route_count: int
    metric_count: int
    sample_count: int
    data_directory: str


class LineStringGeometry(BaseModel):
    type: Literal["LineString"]
    coordinates: list[list[float]]


class RouteProperties(BaseModel):
    id: str
    name: str
    origin: str
    destination: str
    corridor: str
    vessel_class: str
    season: str
    description: str
    total_distance_km: float | None = None
    ice_risk_score: float | None = None
    travel_difficulty: float | None = None
    ship_performance_index: float | None = None


class RouteFeature(BaseModel):
    type: Literal["Feature"]
    id: str
    geometry: LineStringGeometry
    properties: RouteProperties


class RouteCollection(BaseModel):
    type: Literal["FeatureCollection"]
    features: list[RouteFeature]


class RiskSample(BaseModel):
    checkpoint: int
    label: str
    distance_km: float
    ice_risk_score: float
    travel_difficulty: float
    performance_index: float
    weather_exposure: float
    sea_state: float


class RouteMetrics(BaseModel):
    route_id: str
    route_name: str
    total_distance_km: float
    ice_risk_score: float = Field(ge=0, le=100)
    travel_difficulty: float = Field(ge=0, le=100)
    ship_performance_index: float = Field(ge=0, le=100)
    estimated_days: float
    avg_speed_knots: float
    fuel_efficiency_index: float = Field(ge=0, le=100)
    weather_exposure: float = Field(ge=0, le=100)
    emissions_tonnes: float
    last_updated: str
    checkpoints: list[RiskSample]
