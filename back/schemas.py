from pydantic import BaseModel, EmailStr, field_validator
import re
from typing import List, Optional
from datetime import datetime

# User 관련 스키마
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    current_round_idx: int  # 0-based, display as current_round_idx+1 in UI
    current_period: str
    total_balance: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# Stock 관련 스키마
class StockResponse(BaseModel):
    id: int
    symbol: str
    name: str
    sector: str
    current_price: float
    
    class Config:
        from_attributes = True

# Portfolio 관련 스키마
class PortfolioItem(BaseModel):
    stock_id: int
    stock_symbol: str
    stock_name: str
    quantity: int
    average_price: float
    current_price: float
    total_value: float
    profit_loss: float
    profit_loss_percentage: float

class PortfolioResponse(BaseModel):
    user_id: int
    total_balance: float
    total_portfolio_value: float
    total_profit_loss: float
    total_profit_loss_percentage: float
    items: List[PortfolioItem]

# Transaction 관련 스키마
class TransactionCreate(BaseModel):
    stock_id: int
    quantity: int
    price: float

class TransactionResponse(BaseModel):
    id: int
    stock_symbol: str
    stock_name: str
    transaction_type: str
    quantity: int
    price: float
    total_amount: float
    round_number: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# News 관련 스키마
class NewsResponse(BaseModel):
    id: int
    period: str | None = None
    category: str | None = None
    title: str
    date: datetime
    summary: str

    class Config:
        from_attributes = True

# Game State 관련 스키마
class GameState(BaseModel):
    current_round: int
    total_rounds: int = 10
    current_date: str
    total_balance: float
    total_portfolio_value: float
    total_profit_loss: float
    total_profit_loss_percentage: float
    realized_profit: float
    total_profit: float
    total_profit_percentage: float
    can_advance_round: bool
    is_game_completed: bool

# Ranking 관련 스키마
class RankingItem(BaseModel):
    rank: int
    username: str
    total_profit_loss_percentage: float
    total_portfolio_value: float

class RankingResponse(BaseModel):
    rankings: List[RankingItem]

# Token 관련 스키마
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None 