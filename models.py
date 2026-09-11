from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base

# Many-to-Many association table for User and House
user_house = Table(
    "user_house",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("house_id", Integer, ForeignKey("houses.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    password = Column(String, nullable=False)

    # Relationships
    houses = relationship("House", secondary=user_house, back_populates="users")

class House(Base):
    __tablename__ = "houses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)

    # Relationships
    users = relationship("User", secondary=user_house, back_populates="houses")
    rooms = relationship("Room", back_populates="house", cascade="all, delete-orphan", passive_deletes=True)

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    house = relationship("House", back_populates="rooms")
    furniture = relationship("Furniture", back_populates="room", cascade="all, delete-orphan", passive_deletes=True)

class Furniture(Base):
    __tablename__ = "furniture"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    room = relationship("Room", back_populates="furniture")
    compartments = relationship("Compartment", back_populates="furniture", cascade="all, delete-orphan", passive_deletes=True)

class Compartment(Base):
    __tablename__ = "compartments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    furniture_id = Column(Integer, ForeignKey("furniture.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    furniture = relationship("Furniture", back_populates="compartments")
    items = relationship("Item", back_populates="compartment", cascade="all, delete-orphan", passive_deletes=True)

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    count = Column(Integer, default=0, nullable=False)
    compartment_id = Column(Integer, ForeignKey("compartments.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    compartment = relationship("Compartment", back_populates="items")
