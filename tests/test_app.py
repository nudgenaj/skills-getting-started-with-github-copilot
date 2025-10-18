import pytest
from fastapi.testclient import TestClient
from src import app as application


@pytest.fixture
def client():
    return TestClient(application.app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # Expect at least one activity
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow(client):
    activity = "Chess Club"
    email = "pytest.user@example.com"

    # Ensure user not present
    activities = client.get("/activities").json()
    participants = activities[activity]["participants"]
    if email in participants:
        client.delete(f"/activities/{activity}/unregister", params={"email": email})

    # Signup
    resp_signup = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp_signup.status_code == 200
    assert "Signed up" in resp_signup.json().get("message", "")

    # Duplicate signup should fail
    resp_duplicate = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp_duplicate.status_code == 400

    # Ensure participant now present
    activities_after = client.get("/activities").json()
    assert email in activities_after[activity]["participants"]

    # Unregister
    resp_unreg = client.delete(f"/activities/{activity}/unregister", params={"email": email})
    assert resp_unreg.status_code == 200
    # Now user should not be present
    activities_final = client.get("/activities").json()
    assert email not in activities_final[activity]["participants"]
