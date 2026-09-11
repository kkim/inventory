from typing import List, Optional
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# House Schemas
class HouseBase(BaseModel):
    name: str
    address: Optional[str] = None

class HouseCreate(HouseBase):
    pass

class HouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None

class HouseResponse(HouseBase):
    id: int

    class Config:
        from_attributes = True

# Room Schemas
class RoomBase(BaseModel):
    name: str
    house_id: int

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    house_id: Optional[int] = None

class RoomResponse(RoomBase):
    id: int

    class Config:
        from_attributes = True

# Furniture Schemas
class FurnitureBase(BaseModel):
    name: str
    room_id: int

class FurnitureCreate(FurnitureBase):
    pass

class FurnitureUpdate(BaseModel):
    name: Optional[str] = None
    room_id: Optional[int] = None

class FurnitureResponse(FurnitureBase):
    id: int

    class Config:
        from_attributes = True

# Compartment Schemas
class CompartmentBase(BaseModel):
    name: str
    furniture_id: int

class CompartmentCreate(CompartmentBase):
    pass

class CompartmentUpdate(BaseModel):
    name: Optional[str] = None
    furniture_id: Optional[int] = None

class CompartmentResponse(CompartmentBase):
    id: int

    class Config:
        from_attributes = True

# Item Schemas
class ItemBase(BaseModel):
    name: str
    count: int = Field(default=0, ge=0)
    compartment_id: int

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    count: Optional[int] = Field(default=None, ge=0)
    compartment_id: Optional[int] = None

class ItemResponse(ItemBase):
    id: int

    class Config:
        from_attributes = True

# Relationship Mapping schemas for rich nested responses
class HouseDetailResponse(HouseResponse):
    rooms: List[RoomResponse] = []

    class Config:
        from_attributes = True

# User with assigned houses
class UserWithHousesResponse(UserResponse):
    houses: List[HouseResponse] = []

    class Config:
        from_attributes = True

# Detailed item search results with full navigation path
class ItemSearchResponse(BaseModel):
    id: int
    name: str
    count: int
    compartment_id: int
    compartment_name: str
    furniture_id: int
    furniture_name: str
    room_id: int
    room_name: str
    house_id: int
    house_name: str

    class Config:
        from_attributes = True
