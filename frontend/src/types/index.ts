export interface RouteProperties {
  id: string;
  name: string;
  origin: string;
  destination: string;
  corridor: string;
  vessel_class: string;
  season: string;
  description: string;
  total_distance_km?: number;
  ice_risk_score?: number;
  travel_difficulty?: number;
  ship_performance_index?: number;
}

export interface RouteFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  properties: RouteProperties;
}

export interface RouteCollection {
  type: "FeatureCollection";
  features: RouteFeature[];
}

export interface RiskSample {
  checkpoint: number;
  label: string;
  distance_km: number;
  ice_risk_score: number;
  travel_difficulty: number;
  performance_index: number;
  weather_exposure: number;
  sea_state: number;
}

export interface RouteMetrics {
  route_id: string;
  route_name: string;
  total_distance_km: number;
  ice_risk_score: number;
  travel_difficulty: number;
  ship_performance_index: number;
  estimated_days: number;
  avg_speed_knots: number;
  fuel_efficiency_index: number;
  weather_exposure: number;
  emissions_tonnes: number;
  last_updated: string;
  checkpoints: RiskSample[];
}

export interface HealthResponse {
  status: "ok";
  database: "duckdb";
  route_count: number;
  metric_count: number;
  sample_count: number;
  data_directory: string;
}
