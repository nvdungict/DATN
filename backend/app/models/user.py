from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column, JSON


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)


class User(UserBase, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    travel_profile: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)


class UserCreate(UserBase):
    password: str
    travel_profile: dict = {}


class UserRead(UserBase):
    id: int
    travel_profile: dict
    created_at: datetime
    is_active: bool


class UserUpdate(SQLModel):
    travel_profile: Optional[dict] = None


class UserChangePassword(SQLModel):
    current_password: str
    new_password: str
