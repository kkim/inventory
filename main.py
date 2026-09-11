import os
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Header, Cookie, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

# Auto-migration: ensure the 'email' column is added to any pre-existing 'users' table
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR"))
except Exception:
    # Column already exists or fresh database, safe to ignore
    pass

app = FastAPI(title="Inventory System API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Helper to verify auth and get current user
def get_current_user(x_user_id: Optional[int] = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authentication Header 'X-User-ID'",
        )
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid User ID or User not found",
        )
    return user

# Auth Endpoints
@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED, responses={201: {"model": schemas.UserResponse}})
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    new_user = models.User(username=user_data.username, email=user_data.email, password=user_data.password)  # Plain text for simple auth as requested
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=schemas.UserResponse)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if not user or user.password != user_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    return user

@app.post("/api/auth/reset-password")
def reset_password(reset_data: schemas.UserResetPassword, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == reset_data.username,
        models.User.email == reset_data.email
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with matching username and email not found"
        )
        
    user.password = reset_data.new_password
    db.commit()
    return {"message": "Password reset successful"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# House Endpoints
@app.get("/api/houses", response_model=List[schemas.HouseResponse])
def list_houses(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return current_user.houses

@app.post("/api/houses", response_model=schemas.HouseResponse, status_code=status.HTTP_201_CREATED)
def create_house(house_data: schemas.HouseCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_house = models.House(name=house_data.name, address=house_data.address)
    db.add(new_house)
    db.commit()
    db.refresh(new_house)
    
    # Associate user with the house
    current_user.houses.append(new_house)
    db.commit()
    return new_house

@app.put("/api/houses/{house_id}", response_model=schemas.HouseResponse)
def update_house(house_id: int, house_data: schemas.HouseUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    house = db.query(models.House).filter(models.House.id == house_id).first()
    if not house or house not in current_user.houses:
        raise HTTPException(status_code=404, detail="House not found or not owned by user")
    
    if house_data.name is not None:
        house.name = house_data.name
    if house_data.address is not None:
        house.address = house_data.address
    
    db.commit()
    db.refresh(house)
    return house

@app.delete("/api/houses/{house_id}")
def delete_house(house_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    house = db.query(models.House).filter(models.House.id == house_id).first()
    if not house or house not in current_user.houses:
        raise HTTPException(status_code=404, detail="House not found or not owned by user")
    
    db.delete(house)
    db.commit()
    return {"message": "House deleted successfully"}

@app.post("/api/houses/{house_id}/share")
def share_house(house_id: int, target_username: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    house = db.query(models.House).filter(models.House.id == house_id).first()
    if not house or house not in current_user.houses:
        raise HTTPException(status_code=404, detail="House not found or not owned by user")
    
    target_user = db.query(models.User).filter(models.User.username == target_username).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    if house in target_user.houses:
        return {"message": f"House already shared with {target_username}"}
    
    target_user.houses.append(house)
    db.commit()
    return {"message": f"House successfully shared with {target_username}"}

# Room Endpoints
@app.get("/api/rooms", response_model=List[schemas.RoomResponse])
def list_rooms(house_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    house = db.query(models.House).filter(models.House.id == house_id).first()
    if not house or house not in current_user.houses:
        raise HTTPException(status_code=404, detail="House not found or not owned by user")
    return house.rooms

@app.post("/api/rooms", response_model=schemas.RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(room_data: schemas.RoomCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    house = db.query(models.House).filter(models.House.id == room_data.house_id).first()
    if not house or house not in current_user.houses:
        raise HTTPException(status_code=404, detail="House not found or not owned by user")
    
    new_room = models.Room(name=room_data.name, house_id=room_data.house_id)
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@app.put("/api/rooms/{room_id}", response_model=schemas.RoomResponse)
def update_room(room_id: int, room_data: schemas.RoomUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room or room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Room not found or not accessible")
    
    if room_data.name is not None:
        room.name = room_data.name
    if room_data.house_id is not None:
        target_house = db.query(models.House).filter(models.House.id == room_data.house_id).first()
        if not target_house or target_house not in current_user.houses:
            raise HTTPException(status_code=400, detail="Target house not found or not accessible")
        room.house_id = room_data.house_id
        
    db.commit()
    db.refresh(room)
    return room

@app.delete("/api/rooms/{room_id}")
def delete_room(room_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room or room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Room not found or not accessible")
    
    db.delete(room)
    db.commit()
    return {"message": "Room deleted successfully"}

# Furniture Endpoints
@app.get("/api/furniture", response_model=List[schemas.FurnitureResponse])
def list_furniture(room_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room or room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Room not found or not accessible")
    return room.furniture

@app.post("/api/furniture", response_model=schemas.FurnitureResponse, status_code=status.HTTP_201_CREATED)
def create_furniture(furniture_data: schemas.FurnitureCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.id == furniture_data.room_id).first()
    if not room or room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Room not found or not accessible")
    
    new_furniture = models.Furniture(name=furniture_data.name, room_id=furniture_data.room_id)
    db.add(new_furniture)
    db.commit()
    db.refresh(new_furniture)
    return new_furniture

@app.put("/api/furniture/{furniture_id}", response_model=schemas.FurnitureResponse)
def update_furniture(furniture_id: int, furniture_data: schemas.FurnitureUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    furniture = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not furniture or furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Furniture not found or not accessible")
    
    if furniture_data.name is not None:
        furniture.name = furniture_data.name
    if furniture_data.room_id is not None:
        target_room = db.query(models.Room).filter(models.Room.id == furniture_data.room_id).first()
        if not target_room or target_room.house not in current_user.houses:
            raise HTTPException(status_code=400, detail="Target room not found or not accessible")
        furniture.room_id = furniture_data.room_id
        
    db.commit()
    db.refresh(furniture)
    return furniture

@app.delete("/api/furniture/{furniture_id}")
def delete_furniture(furniture_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    furniture = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not furniture or furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Furniture not found or not accessible")
    
    db.delete(furniture)
    db.commit()
    return {"message": "Furniture deleted successfully"}

# Compartment Endpoints
@app.get("/api/compartments", response_model=List[schemas.CompartmentResponse])
def list_compartments(furniture_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    furniture = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not furniture or furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Furniture not found or not accessible")
    return furniture.compartments

@app.post("/api/compartments", response_model=schemas.CompartmentResponse, status_code=status.HTTP_201_CREATED)
def create_compartment(comp_data: schemas.CompartmentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    furniture = db.query(models.Furniture).filter(models.Furniture.id == comp_data.furniture_id).first()
    if not furniture or furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Furniture not found or not accessible")
    
    new_comp = models.Compartment(name=comp_data.name, furniture_id=comp_data.furniture_id)
    db.add(new_comp)
    db.commit()
    db.refresh(new_comp)
    return new_comp

@app.put("/api/compartments/{comp_id}", response_model=schemas.CompartmentResponse)
def update_compartment(comp_id: int, comp_data: schemas.CompartmentUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    comp = db.query(models.Compartment).filter(models.Compartment.id == comp_id).first()
    if not comp or comp.furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Compartment not found or not accessible")
    
    if comp_data.name is not None:
        comp.name = comp_data.name
    if comp_data.furniture_id is not None:
        target_furniture = db.query(models.Furniture).filter(models.Furniture.id == comp_data.furniture_id).first()
        if not target_furniture or target_furniture.room.house not in current_user.houses:
            raise HTTPException(status_code=400, detail="Target furniture not found or not accessible")
        comp.furniture_id = comp_data.furniture_id
        
    db.commit()
    db.refresh(comp)
    return comp

@app.delete("/api/compartments/{comp_id}")
def delete_compartment(comp_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    comp = db.query(models.Compartment).filter(models.Compartment.id == comp_id).first()
    if not comp or comp.furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Compartment not found or not accessible")
    
    db.delete(comp)
    db.commit()
    return {"message": "Compartment deleted successfully"}

# Item Endpoints
@app.get("/api/items", response_model=List[schemas.ItemResponse])
def list_items(compartment_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    comp = db.query(models.Compartment).filter(models.Compartment.id == compartment_id).first()
    if not comp or comp.furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Compartment not found or not accessible")
    return comp.items

@app.post("/api/items", response_model=schemas.ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(item_data: schemas.ItemCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    comp = db.query(models.Compartment).filter(models.Compartment.id == item_data.compartment_id).first()
    if not comp or comp.furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Compartment not found or not accessible")
    
    new_item = models.Item(name=item_data.name, count=item_data.count, compartment_id=item_data.compartment_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.put("/api/items/{item_id}", response_model=schemas.ItemResponse)
def update_item(item_id: int, item_data: schemas.ItemUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item or item.compartment.furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Item not found or not accessible")
    
    if item_data.name is not None:
        item.name = item_data.name
    if item_data.count is not None:
        item.count = item_data.count
    if item_data.compartment_id is not None:
        target_comp = db.query(models.Compartment).filter(models.Compartment.id == item_data.compartment_id).first()
        if not target_comp or target_comp.furniture.room.house not in current_user.houses:
            raise HTTPException(status_code=400, detail="Target compartment not found or not accessible")
        item.compartment_id = item_data.compartment_id
        
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/items/{item_id}")
def delete_item(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item or item.compartment.furniture.room.house not in current_user.houses:
        raise HTTPException(status_code=404, detail="Item not found or not accessible")
    
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}

# Global Search Endpoint across authorized houses
@app.get("/api/items/search", response_model=List[schemas.ItemSearchResponse])
def search_items(q: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_house_ids = [h.id for h in current_user.houses]
    if not user_house_ids:
        return []
        
    results = db.query(
        models.Item.id,
        models.Item.name,
        models.Item.count,
        models.Item.compartment_id,
        models.Compartment.name.label("compartment_name"),
        models.Furniture.id.label("furniture_id"),
        models.Furniture.name.label("furniture_name"),
        models.Room.id.label("room_id"),
        models.Room.name.label("room_name"),
        models.House.id.label("house_id"),
        models.House.name.label("house_name")
    ).join(
        models.Compartment, models.Item.compartment_id == models.Compartment.id
    ).join(
        models.Furniture, models.Compartment.furniture_id == models.Furniture.id
    ).join(
        models.Room, models.Furniture.room_id == models.Room.id
    ).join(
        models.House, models.Room.house_id == models.House.id
    ).filter(
        models.House.id.in_(user_house_ids)
    ).filter(
        models.Item.name.ilike(f"%{q}%")
    ).all()
    
    return [
        {
            "id": r.id,
            "name": r.name,
            "count": r.count,
            "compartment_id": r.compartment_id,
            "compartment_name": r.compartment_name,
            "furniture_id": r.furniture_id,
            "furniture_name": r.furniture_name,
            "room_id": r.room_id,
            "room_name": r.room_name,
            "house_id": r.house_id,
            "house_name": r.house_name
        }
        for r in results
    ]

# Static Files serving & Page Routing
app.mount("/static", StaticFiles(directory=STATIC_DIR, html=True), name="static")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))
