from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn
from datetime import datetime, timedelta
import jwt
from typing import List, Optional
from sqlalchemy import select

from database import get_db, init_db
from models import User, Stock, Portfolio, Transaction, News, Quiz
from schemas import (
    UserCreate, UserLogin, UserResponse, 
    StockResponse, PortfolioResponse, TransactionCreate,
    NewsResponse, QuizResponse, GameState, QuizAnswer
)
from services import (
    auth_service, stock_service, portfolio_service,
    news_service, quiz_service, game_service
)

app = FastAPI(title=" 주식 투자 시뮬레이션 게임", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/")
async def root():
    return {"message": "🎮 주식 투자 시뮬레이션 게임 API"}

# 인증 관련 엔드포인트
@app.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    print(f"Received registration data: {user_data}")
    try:
        result = await auth_service.register_user(db, user_data)
        print(f"Registration successful: {result}")
        return result
    except Exception as e:
        print(f"Registration error: {e}")
        raise

@app.post("/auth/login")
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    return await auth_service.login_user(db, user_data)

@app.get("/auth/me")
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "username": user.username,
        "current_round": user.current_round,
        "total_balance": user.total_balance
    }

# 주식 관련 엔드포인트
@app.get("/stocks", response_model=List[StockResponse])
async def get_stocks(db: AsyncSession = Depends(get_db)):
    return await stock_service.get_all_stocks(db)

@app.get("/stocks/{stock_id}", response_model=StockResponse)
async def get_stock(stock_id: int, db: AsyncSession = Depends(get_db)):
    return await stock_service.get_stock_by_id(db, stock_id)

# 포트폴리오 관련 엔드포인트
@app.get("/portfolio")
async def get_portfolio(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # 포트폴리오 조회 (수량이 0보다 큰 아이템만)
    portfolio_items = await db.execute(select(Portfolio).where(Portfolio.user_id == user.id, Portfolio.quantity > 0))
    items = portfolio_items.scalars().all()
    # 주식 정보와 함께 포트폴리오 아이템 구성
    from models import Stock
    item_list = []
    total_portfolio_value = 0
    total_investment = 0
    for item in items:
        stock = await db.execute(select(Stock).where(Stock.id == item.stock_id))
        stock = stock.scalar_one_or_none()
        if stock:
            total_value = item.quantity * stock.current_price
            profit_loss = total_value - (item.quantity * item.average_price)
            profit_loss_percentage = (profit_loss / (item.quantity * item.average_price)) * 100 if item.average_price > 0 else 0
            item_list.append({
                "stock_id": stock.id,
                "stock_symbol": stock.symbol,
                "stock_name": stock.name,
                "quantity": item.quantity,
                "average_price": item.average_price,
                "current_price": stock.current_price,
                "total_value": total_value,
                "profit_loss": profit_loss,
                "profit_loss_percentage": profit_loss_percentage
            })
            total_portfolio_value += total_value
            total_investment += item.quantity * item.average_price
    total_profit_loss = total_portfolio_value - total_investment
    total_profit_loss_percentage = (total_profit_loss / total_investment) * 100 if total_investment > 0 else 0
    
    # 총 수익 (미실현 + 실현)
    total_profit = total_profit_loss + user.realized_profit
    total_profit_percentage = (total_profit / (total_investment + user.realized_profit)) * 100 if (total_investment + user.realized_profit) > 0 else 0
    
    return {
        "total_balance": user.total_balance,
        "total_portfolio_value": total_portfolio_value,
        "total_profit_loss": total_profit_loss,
        "total_profit_loss_percentage": total_profit_loss_percentage,
        "realized_profit": user.realized_profit,
        "total_profit": total_profit,
        "total_profit_percentage": total_profit_percentage,
        "items": item_list
    }

@app.post("/portfolio/buy")
async def buy_stock(
    transaction: TransactionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    return await portfolio_service.buy_stock(db, user_id, transaction)

@app.post("/portfolio/sell")
async def sell_stock(
    transaction: TransactionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    return await portfolio_service.sell_stock(db, user_id, transaction)

# 뉴스 관련 엔드포인트
@app.get("/news", response_model=List[NewsResponse])
async def get_news(db: AsyncSession = Depends(get_db)):
    return await news_service.get_current_news(db)

# 퀴즈 관련 엔드포인트
@app.get("/quiz", response_model=QuizResponse)
async def get_daily_quiz(db: AsyncSession = Depends(get_db)):
    return await quiz_service.get_daily_quiz(db)

@app.post("/quiz/submit")
async def submit_quiz_answer(
    answer: QuizAnswer,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    return await quiz_service.submit_answer(db, user_id, answer.answer)

# 게임 상태 관련 엔드포인트
@app.get("/game/state", response_model=GameState)
async def get_game_state(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    return await game_service.get_game_state(db, user_id)

@app.post("/game/next-round")
async def next_round(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    return await game_service.advance_round(db, user_id)

@app.post("/game/restart")
async def restart_game(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    return await game_service.restart_game(db, user_id)

# 랭킹 관련 엔드포인트
@app.get("/ranking")
async def get_ranking(db: AsyncSession = Depends(get_db)):
    return await game_service.get_ranking(db)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 