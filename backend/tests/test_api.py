from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_reports_duckdb_dataset():
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "duckdb"
    assert body["route_count"] == 6
    assert body["metric_count"] == 6
    assert body["sample_count"] == 36


def test_routes_returns_geojson_feature_collection():
    response = client.get("/routes")
    assert response.status_code == 200

    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert len(body["features"]) == 6
    assert body["features"][0]["geometry"]["type"] == "LineString"
    assert "ice_risk_score" in body["features"][0]["properties"]


def test_route_detail_and_metrics_are_linked():
    route_id = "nwp-lancaster-amundsen"

    route_response = client.get(f"/routes/{route_id}")
    metrics_response = client.get(f"/metrics/{route_id}")

    assert route_response.status_code == 200
    assert metrics_response.status_code == 200

    route = route_response.json()
    metrics = metrics_response.json()
    assert route["properties"]["name"] == metrics["route_name"]
    assert metrics["route_id"] == route_id
    assert metrics["ice_risk_score"] == 82
    assert len(metrics["checkpoints"]) == 6


def test_unknown_route_returns_404():
    response = client.get("/routes/not-a-route")
    assert response.status_code == 404
    assert "not-a-route" in response.json()["detail"]
