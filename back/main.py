from fastapi import FastAPI, HTTPException, Depends, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn
from datetime import datetime, timedelta
import jwt
from typing import List, Optional
from sqlalchemy import select
import json
import os
from dotenv import load_dotenv
from langchain.chat_models import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from sqlalchemy.orm import joinedload

from database import get_db, init_db
from models import User, Stock, Portfolio, Transaction, News
from schemas import (
    UserCreate, UserLogin, UserResponse, 
    StockResponse, PortfolioResponse, TransactionCreate,
    NewsResponse, GameState
)
from services import (
    auth_service, stock_service, portfolio_service,
    news_service, game_service
)
from services.game_service import period_to_date
from services.period_utils import period_to_date

load_dotenv()

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
        periods = json.loads(result.round_periods)
        current_period = periods[result.current_round_idx]
        return {
            "id": result.id,
            "username": result.username,
            "current_round_idx": result.current_round_idx,
            "current_period": current_period,
            "total_balance": result.total_balance,
            "created_at": result.created_at,
        }
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
    periods = json.loads(user.round_periods)
    current_period = periods[user.current_round_idx]
    return {
        "id": user.id,
        "username": user.username,
        "current_round_idx": user.current_round_idx,
        "current_period": current_period,
        "total_balance": user.total_balance,
        "realized_profit": user.realized_profit
    }

# 주식 관련 엔드포인트
@app.get("/stocks", response_model=List[StockResponse])
async def get_stocks(db: AsyncSession = Depends(get_db)):
    return await stock_service.get_all_stocks(db)

@app.get("/stocks/sector/{sector}", response_model=List[StockResponse])
async def get_stocks_by_sector(
    sector: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    periods = json.loads(user.round_periods)
    current_period = periods[user.current_round_idx]
    date = period_to_date(current_period)
    return await stock_service.get_stocks_by_sector(db, sector, date)

@app.get("/stocks/sectors", response_model=List[str])
async def get_all_sectors(db: AsyncSession = Depends(get_db)):
    return await stock_service.get_all_sectors(db)

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
    periods = json.loads(user.round_periods)
    current_period = periods[user.current_round_idx]
    date = period_to_date(current_period)
    # 포트폴리오 조회 (수량이 0보다 큰 아이템만)
    portfolio_items = await db.execute(select(Portfolio).where(Portfolio.user_id == user.id, Portfolio.quantity > 0))
    items = portfolio_items.scalars().all()
    # 주식 정보와 함께 포트폴리오 아이템 구성
    from models import Stock, StockPrice
    item_list = []
    total_portfolio_value = 0
    total_investment = 0
    for item in items:
        stock = await db.execute(select(Stock).where(Stock.id == item.stock_id))
        stock = stock.scalar_one_or_none()
        if stock:
            # period 기준 가격 조회
            price_result = await db.execute(
                select(StockPrice.close_price)
                .where(StockPrice.stock_id == stock.id)
                .where(StockPrice.date >= date)
                .order_by(StockPrice.date.asc())
                .limit(1)
            )
            current_price = price_result.scalar_one_or_none()
            if current_price is None:
                current_price = 0
            total_value = item.quantity * current_price
            profit_loss = total_value - (item.quantity * item.average_price)
            profit_loss_percentage = (profit_loss / (item.quantity * item.average_price)) * 100 if item.average_price > 0 else 0
            item_list.append({
                "stock_id": stock.id,
                "stock_symbol": stock.symbol,
                "stock_name": stock.name,
                "quantity": item.quantity,
                "average_price": item.average_price,
                "current_price": current_price,
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

@app.get("/portfolio/stock/{stock_id}")
async def get_stock_quantity(
    stock_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """특정 주식의 보유 수량 조회"""
    user_id = auth_service.verify_token(credentials.credentials)
    portfolio_item = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.stock_id == stock_id)
    )
    item = portfolio_item.scalar_one_or_none()
    
    return {
        "quantity": item.quantity if item else 0,
        "average_price": item.average_price if item else 0
    }

@app.post("/portfolio/buy")
async def buy_stock(
    transaction: TransactionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    periods = json.loads(user.round_periods)
    current_period = periods[user.current_round_idx]
    return await portfolio_service.buy_stock(db, user_id, transaction, current_period)

@app.post("/portfolio/sell")
async def sell_stock(
    transaction: TransactionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    periods = json.loads(user.round_periods)
    current_period = periods[user.current_round_idx]
    return await portfolio_service.sell_stock(db, user_id, transaction, current_period)

# 뉴스 관련 엔드포인트
@app.get("/news", response_model=List[NewsResponse])
async def get_news(period: str, db: AsyncSession = Depends(get_db)):
    return await news_service.get_current_news(db, period)

@app.get("/news/stock/by-ticker", response_model=List[NewsResponse])
async def get_news_by_stock_by_ticker(ticker: str, period: str = None, db: AsyncSession = Depends(get_db)):
    return await news_service.get_news_by_stock(db, stock_name=None, period=period, ticker=ticker)

@app.get("/news/macro", response_model=List[NewsResponse])
async def get_macro_news(period: str, db: AsyncSession = Depends(get_db)):
    """특정 period, Macro 카테고리 뉴스만 조회"""
    return await news_service.get_macro_news_by_period(db, period)

@app.get("/news/sector/{sector}", response_model=List[NewsResponse])
async def get_sector_trend_news(
    sector: str,
    period: str,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await news_service.get_sector_trend_news(db, sector, period)

# 게임 상태 관련 엔드포인트
@app.get("/game/state", response_model=GameState)
async def get_game_state(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    current_period = user.round_periods[user.current_round_idx]
    return await game_service.get_game_state(db, user_id)

@app.post("/game/next-round")
async def next_round(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    current_period = user.round_periods[user.current_round_idx]
    return await game_service.advance_round(db, user_id, current_period)

@app.post("/game/restart")
async def restart_game(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    result = await game_service.restart_game(db, user_id)
    
    # 재시작 후 사용자 정보 반환
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    periods = json.loads(user.round_periods)
    current_period = periods[user.current_round_idx]
    
    return {
        **result,
        "user": {
            "id": user.id,
            "username": user.username,
            "current_round_idx": user.current_round_idx,
            "current_round": user.current_round_idx + 1,
            "current_period": current_period,
            "total_balance": user.total_balance,
            "realized_profit": user.realized_profit
        }
    }

# 랭킹 관련 엔드포인트
@app.get("/ranking")
async def get_ranking(db: AsyncSession = Depends(get_db)):
    return await game_service.get_ranking(db)

@app.post("/chatbot")
async def chatbot(
    message: str = Body(..., embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    periods = json.loads(user.round_periods)
    current_period = periods[user.current_round_idx]

    # 해당 period까지의 데이터만 조회
    prices = await stock_service.get_prices_until_period(db, current_period)
    all_news = await news_service.get_news_until_period(db, current_period)

    # Macro0 뉴스만 필터링하여 context 생성
    macro0_news = [n for n in all_news if n.category == 'Macro0']
    news_titles = [n.title for n in macro0_news][-5:]
    price_summaries = []
    for p in prices[-5:]:
        price_summaries.append(f"{p.stock_id} {p.date}: {p.close_price}")
    context = f"현재 라운드: {current_period}\n최근 뉴스: {', '.join(news_titles)}\n최근 주가: {', '.join(price_summaries)}\n"

    # LangChain LLM 호출
    llm = ChatOpenAI(temperature=0.2, model_name="gpt-3.5-turbo")
    system_prompt = (
        """너는 주식 투자 시뮬레이션 게임의 챗봇이야.\n"
        "아래 context(주가/뉴스) 정보까지만 참고해서 답변해.\n"
        "미래 데이터는 절대 알려주지 마.\n"
        """
    )
    messages = [
        SystemMessage(content=system_prompt + "\n" + context),
        HumanMessage(content=message)
    ]
    answer = llm(messages).content

    return {"answer": answer}

@app.get("/portfolio/transactions")
async def get_transaction_history(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    # 유저의 period 리스트 가져오기
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    periods = json.loads(user.round_periods) if user and user.round_periods else []

    # 거래내역 최신순
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
        .options(joinedload(Transaction.stock))
    )
    transactions = result.scalars().all()

    # 각 거래의 종목 현재가 조회
    from models import StockPrice
    tx_list = []
    for tx in transactions:
        # period 매핑 (1라운드 거래는 periods[0], 즉 round_number-1)
        if tx.round_number > 0 and periods and tx.round_number <= len(periods):
            period_str = periods[tx.round_number - 1]
        else:
            period_str = ""
        # 해당 period의 마지막 날짜 구하기
        period_start = period_to_date(period_str) if period_str else None
        if period_str and period_str.endswith("H1"):
            period_end = f"{period_str.split()[0]}-06-30"
        elif period_str and period_str.endswith("H2"):
            period_end = f"{period_str.split()[0]}-12-31"
        else:
            period_end = None
        # 해당 period의 마지막 가격 조회
        current_price = None
        if period_end:
            price_result = await db.execute(
                select(StockPrice.close_price)
                .where(StockPrice.stock_id == tx.stock_id)
                .where(StockPrice.date <= period_end)
                .order_by(StockPrice.date.desc())
                .limit(1)
            )
            current_price = price_result.scalar_one_or_none()
        tx_list.append({
            "id": tx.id,
            "stock_id": tx.stock_id,
            "stock_name": tx.stock.name if tx.stock else "",
            "stock_symbol": tx.stock.symbol if tx.stock else "",
            "transaction_type": tx.transaction_type,
            "quantity": tx.quantity,
            "price": tx.price,
            "total_amount": tx.total_amount,
            "round_number": tx.round_number,
            "period": period_str,  # 거래시점(라운드)
            "current_price": current_price,
        })
    return tx_list

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 