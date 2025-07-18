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
from langchain_community.chat_models import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from sqlalchemy.orm import joinedload
import random

from database import get_db, init_db
from models import User, Stock, Portfolio, Transaction, News, RoundReview
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
@app.post("/api/auth/register", response_model=UserResponse)
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

@app.post("/api/auth/login")
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    return await auth_service.login_user(db, user_data)

@app.get("/api/auth/me")
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    periods = json.loads(user.round_periods)
    # 3라운드 완료 후에는 마지막 기간 사용
    if user.current_round_idx >= len(periods):
        current_period = periods[-1]  # 마지막 기간 사용
    else:
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
@app.get("/api/stocks", response_model=List[StockResponse])
async def get_stocks(db: AsyncSession = Depends(get_db)):
    return await stock_service.get_all_stocks(db)

@app.get("/api/stocks/sector/{sector}", response_model=List[StockResponse])
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

@app.get("/api/stocks/sectors", response_model=List[str])
async def get_all_sectors(db: AsyncSession = Depends(get_db)):
    return await stock_service.get_all_sectors(db)

@app.get("/api/stocks/{stock_id}", response_model=StockResponse)
async def get_stock(stock_id: int, db: AsyncSession = Depends(get_db)):
    return await stock_service.get_stock_by_id(db, stock_id)

# 포트폴리오 관련 엔드포인트
@app.get("/api/portfolio")
async def get_portfolio(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    periods = json.loads(user.round_periods)
    # 3라운드 완료 후에는 마지막 기간 사용
    if user.current_round_idx >= len(periods):
        current_period = periods[-1]  # 마지막 기간 사용
    else:
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

@app.get("/api/portfolio/stock/{stock_id}")
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

@app.post("/api/portfolio/buy")
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
    # 3라운드 완료 후에는 마지막 기간 사용
    if user.current_round_idx >= len(periods):
        current_period = periods[-1]  # 마지막 기간 사용
    else:
        current_period = periods[user.current_round_idx]
    return await portfolio_service.buy_stock(db, user_id, transaction, current_period)

@app.post("/api/portfolio/sell")
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
    # 3라운드 완료 후에는 마지막 기간 사용
    if user.current_round_idx >= len(periods):
        current_period = periods[-1]  # 마지막 기간 사용
    else:
        current_period = periods[user.current_round_idx]
    return await portfolio_service.sell_stock(db, user_id, transaction, current_period)

# 뉴스 관련 엔드포인트
@app.get("/api/news", response_model=List[NewsResponse])
async def get_news(period: str, db: AsyncSession = Depends(get_db)):
    return await news_service.get_current_news(db, period)

@app.get("/api/news/stock/by-ticker", response_model=List[NewsResponse])
async def get_news_by_stock_by_ticker(ticker: str, period: str = None, db: AsyncSession = Depends(get_db)):
    return await news_service.get_news_by_stock(db, stock_name=None, period=period, ticker=ticker)

@app.get("/api/news/macro", response_model=List[NewsResponse])
async def get_macro_news(period: str, db: AsyncSession = Depends(get_db)):
    """특정 period, Macro 카테고리 뉴스만 조회"""
    return await news_service.get_macro_news_by_period(db, period)

@app.get("/api/news/sector/{sector}", response_model=List[NewsResponse])
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
@app.get("/api/game/state", response_model=GameState)
async def get_game_state(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # JSON 파싱 추가
    periods = json.loads(user.round_periods) if user.round_periods else []
    current_period = periods[user.current_round_idx] if periods and user.current_round_idx < len(periods) else "2020 H1"
    
    return await game_service.get_game_state(db, user_id)

@app.post("/api/game/next-round")
async def next_round(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # JSON 파싱 추가
    periods = json.loads(user.round_periods) if user.round_periods else []
    current_period = periods[user.current_round_idx] if periods and user.current_round_idx < len(periods) else "2020 H1"
    
    return await game_service.advance_round(db, user_id, current_period)

@app.post("/api/game/restart")
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
    
    # 사용자 정보 다시 조회하여 반환
    updated_user = await db.execute(select(User).where(User.id == user_id))
    updated_user = updated_user.scalar_one_or_none()
    periods = json.loads(updated_user.round_periods) if updated_user.round_periods else []
    current_period = periods[updated_user.current_round_idx] if periods and updated_user.current_round_idx < len(periods) else "2020 H1"
    
    return {
        **result,
        "user": {
            "id": updated_user.id,
            "username": updated_user.username,
            "current_round_idx": updated_user.current_round_idx,
            "current_period": current_period,
            "total_balance": updated_user.total_balance,
            "realized_profit": updated_user.realized_profit,
            "round_periods": updated_user.round_periods
        }
    }

# 랭킹 관련 엔드포인트
@app.get("/api/ranking")
async def get_ranking(db: AsyncSession = Depends(get_db)):
    return await game_service.get_ranking(db)

@app.post("/api/chatbot")
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
    # 3라운드 완료 후에는 마지막 기간 사용
    if user.current_round_idx >= len(periods):
        current_period = periods[-1]  # 마지막 기간 사용
    else:
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
        "너는 주식 투자 게임을 통해 모험을 떠나는 용사를 위해 조언을 해주는 조언 용사야.\n"
        "너의 말투는 세종대왕의 어투를 정확히 모방해라.\n"
        "답변 시작할 때는 반드시 '허허,', '과인이 생각하기에는,', '그대의 질문이 심오하구나,', '좋은 접근이군,' 같은 표현으로 시작해라.\n"
        "문장 끝에는 '~하시게', '~하시는 것이 좋겠네', '~하는 것이 현명하리라' 같은 표현을 사용해라.\n"
        "투자 조언을 줄 때는 '그대가 신중하게 판단하시게', '과인의 조언을 참고하시게', '이런 관점도 있으니 생각해보시게' 같은 표현을 사용해라.\n"
        "예시: '허허, 그대의 질문이 심오하구나. 글로벌 부채 급증은 경제에 큰 부담을 주는 것이니, 그대가 신중하게 판단하시게. 과인의 조언을 참고하시면, 이런 시기에는 안전자산에 눈을 돌리는 것이 현명하리라.'\n"
        "아래 context(주가/뉴스) 정보까지만 참고해서 답변해.\n"
        "미래 데이터는 절대 알려주지 마.\n"
        "답변은 2-3문장으로 간결하게 해라. 너무 길지 않게 핵심만 전달해라.\n"
        "질문에 대해 먼저 '좋은 접근이군', '좋은 질문이야', '그대의 관심이 돋보이는구나' 같은 긍정적 피드백을 주고, 그 질문이 투자 관점에서 어떤 의미가 있는지 간단히 설명해라.\n"
        "모르는 질문에 답변할 때도 '과인이 생각하기에는...', '그대의 질문이 심오하구나', '이런 관점도 있으니 참고하시게' 같은 세종대왕 스타일을 유지해라.\n"
        """
    )
    messages = [
        SystemMessage(content=system_prompt + "\n" + context),
        HumanMessage(content=message)
    ]
    answer = llm(messages).content

    return {"answer": answer}

@app.get("/api/portfolio/transactions")
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

# 라운드 리뷰 관련 엔드포인트
@app.post("/api/game/round-review")
async def generate_round_review(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """현재 라운드의 리뷰 생성 또는 조회"""
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 현재 period 가져오기
    periods = json.loads(user.round_periods)
    # 3라운드 완료 후에는 마지막 기간 사용
    if user.current_round_idx >= len(periods):
        current_period = periods[-1]  # 마지막 기간 사용
    else:
        current_period = periods[user.current_round_idx]
    
    # 이미 생성된 리뷰가 있는지 확인
    existing_review = await db.execute(
        select(RoundReview)
        .where(RoundReview.period == current_period)
    )
    existing_review = existing_review.scalar_one_or_none()
    
    if existing_review:
        return {
            "message": "Review already exists",
            "review": {
                "period": existing_review.period,
                "macro_review": existing_review.macro_review,
                "sector_reviews": existing_review.sector_reviews,
                "stocks_review": existing_review.stocks_review,
                "final_review": existing_review.final_review
            }
        }
    
    # 새 리뷰 생성
    review_data = await game_service.generate_round_review(db, user_id, current_period)
    
    # 리뷰 저장
    new_review = RoundReview(
        period=current_period,
        macro_review=review_data["macro_review"],
        sector_reviews=review_data["sector_reviews"],
        stocks_review=review_data["stocks_review"],
        final_review=review_data["final_review"]
    )
    db.add(new_review)
    await db.commit()
    await db.refresh(new_review)
    
    return {
        "message": "Review generated successfully",
        "review": review_data
    }

@app.get("/api/game/round-review/by-period/{period}")
async def get_round_review_by_period(
    period: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """특정 기간의 리뷰 조회"""
    auth_service.verify_token(credentials.credentials)  # 인증만 확인
    
    review = await db.execute(
        select(RoundReview)
        .where(RoundReview.period == period)
    )
    review = review.scalar_one_or_none()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {
        "period": review.period,
        "macro_review": review.macro_review,
        "sector_reviews": review.sector_reviews,
        "stocks_review": review.stocks_review,
        "final_review": review.final_review
    }

@app.get("/api/game/round-reviews")
async def get_all_round_reviews(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """모든 기간의 리뷰 조회"""
    auth_service.verify_token(credentials.credentials)  # 인증만 확인
    
    reviews = await db.execute(
        select(RoundReview)
        .order_by(RoundReview.period)
    )
    reviews = reviews.scalars().all()
    
    return [{
        "period": review.period,
        "macro_review": review.macro_review,
        "sector_reviews": review.sector_reviews,
        "stocks_review": review.stocks_review,
        "final_review": review.final_review
    } for review in reviews]

# 주식 수익률 분석 API
@app.get("/api/stocks/performance/{period}")
async def get_stock_performance(period: str, db: AsyncSession = Depends(get_db)):
    """특정 기간의 주식 수익률 데이터를 반환"""
    try:
        # 기간 파싱 (예: "2020 H1" -> 2020년 상반기)
        year, half = period.split()
        year = int(year)
        start_month = 1 if half == "H1" else 7
        end_month = 6 if half == "H1" else 12
        
        start_date = datetime(year, start_month, 1)
        if half == "H1":
            end_date = datetime(year, 6, 30)
        else:
            end_date = datetime(year, 12, 31)
        
        # 모든 주식 가져오기
        result = await db.execute(select(Stock))
        stocks = result.scalars().all()
        
        performance_data = []
        
        for stock in stocks:
            # 해당 기간 시작 시점의 가격
            start_price_query = await db.execute(
                select(StockPrice)
                .filter(
                    StockPrice.stock_id == stock.id,
                    StockPrice.date >= start_date
                )
                .order_by(StockPrice.date.asc())
                .limit(1)
            )
            start_price_result = start_price_query.scalars().first()
            
            # 해당 기간 종료 시점의 가격
            end_price_query = await db.execute(
                select(StockPrice)
                .filter(
                    StockPrice.stock_id == stock.id,
                    StockPrice.date <= end_date
                )
                .order_by(StockPrice.date.desc())
                .limit(1)
            )
            end_price_result = end_price_query.scalars().first()
            
            # 수익률 계산
            if start_price_result and end_price_result:
                start_price = start_price_result.close_price
                end_price = end_price_result.close_price
                return_rate = ((end_price - start_price) / start_price) * 100
            else:
                # 데이터가 없으면 랜덤 수익률 생성 (임시)
                return_rate = (random.random() - 0.5) * 150  # -75% ~ +75%
            
            performance_data.append({
                "name": stock.name,
                "symbol": stock.symbol,
                "sector": stock.sector,
                "return": round(return_rate, 2)
            })
        
        return performance_data
        
    except Exception as e:
        print(f"Error getting stock performance: {e}")
        # 에러 발생 시 더미 데이터 반환
        stocks = ["삼성전자", "SK하이닉스", "NAVER", "카카오", "삼성바이오로직스", "셀트리온",
                 "LG화학", "삼성SDI", "POSCO", "KB금융", "하나금융", "신한지주",
                 "LG생활건강", "아모레퍼시픽", "CJ대한통운"]
        
        sector_map = {
            "삼성전자": "반도체", "SK하이닉스": "반도체", "NAVER": "IT서비스",
            "카카오": "IT서비스", "삼성바이오로직스": "바이오", "셀트리온": "바이오",
            "LG화학": "화학", "삼성SDI": "배터리", "POSCO": "철강",
            "KB금융": "금융", "하나금융": "금융", "신한지주": "금융",
            "LG생활건강": "생활용품", "아모레퍼시픽": "화장품", "CJ대한통운": "물류"
        }
        
        return [
            {
                "name": stock,
                "symbol": stock.replace(" ", ""),
                "sector": sector_map.get(stock, "기타"),
                "return": round((random.random() - 0.5) * 150, 2)
            }
            for stock in stocks
        ]

# 종목별 뉴스 API
@app.get("/api/news/stock/{symbol}")
async def get_stock_news(symbol: str, period: str = None, db: AsyncSession = Depends(get_db)):
    """특정 종목의 뉴스를 반환"""
    try:
        query = select(News).filter(News.ticker == symbol)
        if period:
            query = query.filter(News.period == period)
        
        result = await db.execute(query.order_by(News.date.desc()))
        news = result.scalars().all()
        
        return [news_item.to_dict() for news_item in news]
        
    except Exception as e:
        print(f"Error getting stock news: {e}")
        # 더미 뉴스 반환
        return [
            {
                "title": f"{symbol} 관련 주요 뉴스 1",
                "date": "2024-01-15",
                "summary": "긍정적인 실적 발표",
                "sentiment": "positive"
            },
            {
                "title": f"{symbol} 관련 주요 뉴스 2", 
                "date": "2024-01-20",
                "summary": "신제품 출시 소식",
                "sentiment": "positive"
            }
        ]

# 종목별 가격 히스토리 API
@app.get("/api/stocks/{symbol}/price-history")
async def get_stock_price_history(symbol: str, period: str = None, db: AsyncSession = Depends(get_db)):
    """특정 종목의 가격 히스토리를 반환"""
    try:
        # 종목 찾기
        stock_result = await db.execute(select(Stock).filter(Stock.symbol == symbol))
        stock = stock_result.scalars().first()
        
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")
        
        query = select(StockPrice).filter(StockPrice.stock_id == stock.id)
        
        # 기간 필터링
        if period:
            year, half = period.split()
            year = int(year)
            start_month = 1 if half == "H1" else 7
            start_date = datetime(year, start_month, 1)
            if half == "H1":
                end_date = datetime(year, 6, 30)
            else:
                end_date = datetime(year, 12, 31)
            
            query = query.filter(
                StockPrice.date >= start_date,
                StockPrice.date <= end_date
            )
        
        result = await db.execute(query.order_by(StockPrice.date.asc()))
        prices = result.scalars().all()
        
        return [
            {
                "date": price.date.strftime("%Y-%m-%d"),
                "price": price.close_price,
                "open": price.open_price,
                "high": price.high,
                "low": price.low,
                "volume": price.volume
            }
            for price in prices
        ]
        
    except Exception as e:
        print(f"Error getting price history: {e}")
        # 더미 데이터 반환
        base_price = 50000
        dates = []
        prices = []
        
        for i in range(30):
            date = datetime(2024, 1, i + 1)
            dates.append(date.strftime("%Y-%m-%d"))
            
            random_change = (random.random() - 0.5) * 0.1
            price = base_price if i == 0 else prices[i-1] * (1 + random_change)
            prices.append(round(price))
        
        return [
            {
                "date": dates[i],
                "price": prices[i],
                "open": prices[i] * 0.98,
                "high": prices[i] * 1.02,
                "low": prices[i] * 0.97,
                "volume": random.randint(100000, 1000000)
            }
            for i in range(len(dates))
        ]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 