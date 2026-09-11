import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app

# Use a separate test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_inventory.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables/clean up database file
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_inventory.db"):
        os.remove("./test_inventory.db")

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_user_flow(client):
    # Register user 1
    response = client.post("/api/auth/register", json={"username": "user1", "password": "pass1"})
    assert response.status_code == 201 or response.status_code == 211
    user1_id = response.json()["id"]
    assert response.json()["username"] == "user1"

    # Try duplicate registration
    response = client.post("/api/auth/register", json={"username": "user1", "password": "pass1"})
    assert response.status_code == 400

    # Login user 1
    response = client.post("/api/auth/login", json={"username": "user1", "password": "pass1"})
    assert response.status_code == 200
    assert response.json()["id"] == user1_id

    # Register and login user 2
    response = client.post("/api/auth/register", json={"username": "user2", "password": "pass2"})
    user2_id = response.json()["id"]
    
    # ----------------------------------------------------
    # House Creation & Access Flow
    # ----------------------------------------------------
    # User 1 creates a house
    headers1 = {"X-User-ID": str(user1_id)}
    response = client.post("/api/houses", json={"name": "Dream House", "address": "123 Main St"}, headers=headers1)
    assert response.status_code == 201
    house_id = response.json()["id"]
    assert response.json()["name"] == "Dream House"

    # User 1 lists houses
    response = client.get("/api/houses", headers=headers1)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == house_id

    # User 2 tries to list houses (should be empty for them)
    headers2 = {"X-User-ID": str(user2_id)}
    response = client.get("/api/houses", headers=headers2)
    assert response.status_code == 200
    assert len(response.json()) == 0

    # User 2 tries to create a room in User 1's house (should be denied)
    response = client.post("/api/rooms", json={"name": "Bed Room 1", "house_id": house_id}, headers=headers2)
    assert response.status_code == 404

    # User 1 creates a room
    response = client.post("/api/rooms", json={"name": "Living Room", "house_id": house_id}, headers=headers1)
    assert response.status_code == 201
    room_id = response.json()["id"]

    # User 1 creates furniture
    response = client.post("/api/furniture", json={"name": "Sofa", "room_id": room_id}, headers=headers1)
    assert response.status_code == 201
    furniture_id = response.json()["id"]

    # User 1 creates a compartment
    response = client.post("/api/compartments", json={"name": "Under Cushions", "furniture_id": furniture_id}, headers=headers1)
    assert response.status_code == 201
    comp_id = response.json()["id"]

    # User 1 creates an item
    response = client.post("/api/items", json={"name": "Remote Control", "count": 1, "compartment_id": comp_id}, headers=headers1)
    assert response.status_code == 201
    item_id = response.json()["id"]

    # User 1 lists items
    response = client.get(f"/api/items?compartment_id={comp_id}", headers=headers1)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "Remote Control"
    assert response.json()[0]["count"] == 1

    # User 1 updates item
    response = client.put(f"/api/items/{item_id}", json={"count": 2}, headers=headers1)
    assert response.status_code == 200
    assert response.json()["count"] == 2

    # User 2 tries to list items in User 1's compartment (should be denied)
    response = client.get(f"/api/items?compartment_id={comp_id}", headers=headers2)
    assert response.status_code == 404

    # ----------------------------------------------------
    # Sharing Flow
    # ----------------------------------------------------
    # User 1 shares house with User 2
    response = client.post(f"/api/houses/{house_id}/share?target_username=user2", headers=headers1)
    assert response.status_code == 200

    # Now User 2 should be able to see the house and access rooms/items
    response = client.get("/api/houses", headers=headers2)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == house_id

    response = client.get(f"/api/rooms?house_id={house_id}", headers=headers2)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == room_id

    # ----------------------------------------------------
    # Search Flow
    # ----------------------------------------------------
    # User 1 searches for item
    response = client.get("/api/items/search?q=Remote", headers=headers1)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "Remote Control"
    assert response.json()[0]["house_name"] == "Dream House"
    assert response.json()[0]["room_name"] == "Living Room"

    # User 1 searches with no matches
    response = client.get("/api/items/search?q=GV70", headers=headers1)
    assert response.status_code == 200
    assert len(response.json()) == 0

    # User 2 searches for item (has shared access now)
    response = client.get("/api/items/search?q=remote", headers=headers2)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "Remote Control"
