import json
import os
from pathlib import Path
from typing import Any

import duckdb

DATA_DIR = Path(os.getenv("GEORISK_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
ROUTES_GEOJSON = DATA_DIR / "routes.geojson"
ROUTE_METRICS_CSV = DATA_DIR / "route_metrics.csv"
RISK_SAMPLES_CSV = DATA_DIR / "risk_samples.csv"


class DataNotFoundError(RuntimeError):
    pass


def _duckdb_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "/").replace("'", "''")


def validate_data_files() -> None:
    missing = [path for path in [ROUTES_GEOJSON, ROUTE_METRICS_CSV, RISK_SAMPLES_CSV] if not path.exists()]
    if missing:
        names = ", ".join(str(path) for path in missing)
        raise DataNotFoundError(f"Missing route dashboard data file(s): {names}")


def connect() -> duckdb.DuckDBPyConnection:
    validate_data_files()
    conn = duckdb.connect(database=":memory:", read_only=False)
    conn.execute(
        f"""
        CREATE OR REPLACE VIEW route_metrics AS
        SELECT * FROM read_csv_auto('{_duckdb_path(ROUTE_METRICS_CSV)}', header = true);

        CREATE OR REPLACE VIEW risk_samples AS
        SELECT * FROM read_csv_auto('{_duckdb_path(RISK_SAMPLES_CSV)}', header = true);
        """
    )
    return conn


def _rows_to_dicts(result: duckdb.DuckDBPyConnection) -> list[dict[str, Any]]:
    columns = [column[0] for column in result.description]
    return [dict(zip(columns, row, strict=True)) for row in result.fetchall()]


def _one_to_dict(result: duckdb.DuckDBPyConnection) -> dict[str, Any] | None:
    row = result.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in result.description]
    return dict(zip(columns, row, strict=True))


def load_routes_geojson() -> dict[str, Any]:
    validate_data_files()
    with ROUTES_GEOJSON.open("r", encoding="utf-8") as file:
        return json.load(file)


def list_route_metric_rows() -> list[dict[str, Any]]:
    with connect() as conn:
        return _rows_to_dicts(
            conn.execute(
                """
                SELECT
                  route_id,
                  total_distance_km,
                  ice_risk_score,
                  travel_difficulty,
                  ship_performance_index,
                  estimated_days,
                  avg_speed_knots,
                  fuel_efficiency_index,
                  weather_exposure,
                  emissions_tonnes,
                  CAST(last_updated AS VARCHAR) AS last_updated
                FROM route_metrics
                ORDER BY ice_risk_score DESC, total_distance_km DESC
                """
            )
        )


def get_route_metric_row(route_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        return _one_to_dict(
            conn.execute(
                """
                SELECT
                  route_id,
                  total_distance_km,
                  ice_risk_score,
                  travel_difficulty,
                  ship_performance_index,
                  estimated_days,
                  avg_speed_knots,
                  fuel_efficiency_index,
                  weather_exposure,
                  emissions_tonnes,
                  CAST(last_updated AS VARCHAR) AS last_updated
                FROM route_metrics
                WHERE route_id = ?
                """,
                [route_id],
            )
        )


def list_risk_samples(route_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        return _rows_to_dicts(
            conn.execute(
                """
                SELECT
                  route_id,
                  checkpoint,
                  label,
                  distance_km,
                  ice_risk_score,
                  travel_difficulty,
                  performance_index,
                  weather_exposure,
                  sea_state
                FROM risk_samples
                WHERE route_id = ?
                ORDER BY checkpoint
                """,
                [route_id],
            )
        )


def route_counts() -> dict[str, int]:
    geojson = load_routes_geojson()
    with connect() as conn:
        metric_count = conn.execute("SELECT COUNT(*) FROM route_metrics").fetchone()[0]
        sample_count = conn.execute("SELECT COUNT(*) FROM risk_samples").fetchone()[0]
    return {
        "route_count": len(geojson.get("features", [])),
        "metric_count": int(metric_count),
        "sample_count": int(sample_count),
    }
