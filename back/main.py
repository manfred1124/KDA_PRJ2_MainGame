from fastapi import FastAPI, HTTPException, Depends, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn
from datetime import datetime, timedelta
try:
    import jwt
except ImportError:
    import PyJWT as jwt
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
from models import User, Stock, Portfolio, Transaction, News, RoundReview, StockPrice
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
        "round_periods": periods,
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
    print(f"Getting transactions for user_id: {user_id}")
    
    # 유저의 period 리스트 가져오기
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    periods = json.loads(user.round_periods) if user and user.round_periods else []
    print(f"User periods: {periods}")

    # 거래내역 최신순 (joinedload 제거)
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
    )
    transactions = result.scalars().all()
    print(f"Found {len(transactions)} transactions")

    # 각 거래의 종목 정보 별도 조회
    tx_list = []
    for tx in transactions:
        print(f"Processing transaction: {tx.id}, round: {tx.round_number}, stock_id: {tx.stock_id}")
        
        # 종목 정보 조회
        stock_result = await db.execute(select(Stock).where(Stock.id == tx.stock_id))
        stock = stock_result.scalar_one_or_none()
        
        # period 매핑 (1라운드 거래는 periods[0], 즉 round_number-1)
        if tx.round_number > 0 and periods and tx.round_number <= len(periods):
            period_str = periods[tx.round_number - 1]
        else:
            period_str = ""
        print(f"Transaction period: {period_str}")
        
        tx_list.append({
            "id": tx.id,
            "stock_id": tx.stock_id,
            "stock_name": stock.name if stock else "",
            "stock_symbol": stock.symbol if stock else "",
            "transaction_type": tx.transaction_type,
            "quantity": tx.quantity,
            "price": tx.price,
            "total_amount": tx.total_amount,
            "round_number": tx.round_number,
            "period": period_str,  # 거래시점(라운드)
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        })
    
    print(f"Returning {len(tx_list)} transactions")
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
                print(f"{stock.name}: 실제 데이터 - 시작가 {start_price}, 종료가 {end_price}, 수익률 {return_rate:.2f}%")
            else:
                # 실제 데이터가 없는 경우 더 넓은 범위에서 검색
                print(f"{stock.name}: 해당 기간 데이터 없음, 더 넓은 범위에서 검색 중...")
                
                # 더 넓은 기간에서 데이터 찾기
                extended_start = datetime(year - 1, 1, 1)
                extended_end = datetime(year + 1, 12, 31)
                
                extended_start_query = await db.execute(
                    select(StockPrice)
                    .filter(
                        StockPrice.stock_id == stock.id,
                        StockPrice.date >= extended_start
                    )
                    .order_by(StockPrice.date.asc())
                    .limit(1)
                )
                extended_start_result = extended_start_query.scalars().first()
                
                extended_end_query = await db.execute(
                    select(StockPrice)
                    .filter(
                        StockPrice.stock_id == stock.id,
                        StockPrice.date <= extended_end
                    )
                    .order_by(StockPrice.date.desc())
                    .limit(1)
                )
                extended_end_result = extended_end_query.scalars().first()
                
                if extended_start_result and extended_end_result:
                    ext_start_price = extended_start_result.close_price
                    ext_end_price = extended_end_result.close_price
                    return_rate = ((ext_end_price - ext_start_price) / ext_start_price) * 100
                    print(f"{stock.name}: 확장 기간 데이터 사용 - 수익률 {return_rate:.2f}%")
                else:
                    # 그래도 데이터가 없으면 고정된 수익률 사용 (종목별로 일관된 값)
                    fixed_returns = {
                        "005930": 15.8,   # 삼성전자
                        "000660": -8.2,   # SK하이닉스
                        "035420": 45.3,   # NAVER
                        "035720": 12.7,   # 카카오
                        "207940": 35.2,   # 삼성바이오로직스
                        "068270": 22.1,   # 셀트리온
                        "051910": -5.4,   # LG화학
                        "006400": 18.9,   # 삼성SDI
                    }
                    return_rate = fixed_returns.get(stock.symbol, 0.0)
                    print(f"{stock.name}: 고정 수익률 사용 - {return_rate}%")
            
            performance_data.append({
                "name": stock.name,
                "symbol": stock.symbol,
                "sector": stock.sector,
                "return": round(return_rate, 2)
            })
        
        return performance_data
        
    except Exception as e:
        print(f"Error getting stock performance: {e}")
        # 에러 발생 시 고정된 더미 데이터 반환 (일관된 값)
        fixed_stock_data = [
            {"name": "삼성전자", "symbol": "005930", "sector": "반도체", "return": 15.8},
            {"name": "SK하이닉스", "symbol": "000660", "sector": "반도체", "return": -8.2},
            {"name": "NAVER", "symbol": "035420", "sector": "IT서비스", "return": 45.3},
            {"name": "카카오", "symbol": "035720", "sector": "IT서비스", "return": 12.7},
            {"name": "삼성바이오로직스", "symbol": "207940", "sector": "바이오", "return": 35.2},
            {"name": "셀트리온", "symbol": "068270", "sector": "바이오", "return": 22.1},
            {"name": "LG화학", "symbol": "051910", "sector": "화학", "return": -5.4},
            {"name": "삼성SDI", "symbol": "006400", "sector": "배터리", "return": 18.9},
            {"name": "POSCO", "symbol": "005490", "sector": "철강", "return": 8.5},
            {"name": "KB금융", "symbol": "105560", "sector": "금융", "return": -12.3},
            {"name": "하나금융", "symbol": "086790", "sector": "금융", "return": -10.7},
            {"name": "신한지주", "symbol": "055550", "sector": "금융", "return": -9.2},
            {"name": "LG생활건강", "symbol": "051900", "sector": "생활용품", "return": 25.6},
            {"name": "아모레퍼시픽", "symbol": "090430", "sector": "화장품", "return": -15.8},
            {"name": "CJ대한통운", "symbol": "000120", "sector": "물류", "return": 7.3}
        ]
        
        return fixed_stock_data

# 종목별 뉴스 API
@app.get("/api/news/stock/{symbol}")
async def get_stock_news(symbol: str, period: str = None, db: AsyncSession = Depends(get_db)):
    """특정 종목의 뉴스를 반환"""
    try:
        print(f"Fetching news for symbol: {symbol}, period: {period}")
        
        # 기본 쿼리 구성 - 먼저 모든 뉴스 확인
        total_news_result = await db.execute(select(News))
        total_news = total_news_result.scalars().all()
        print(f"Total news in database: {len(total_news)}")
        
        # ticker로 검색
        query = select(News).filter(News.ticker == symbol)
        if period:
            query = query.filter(News.period == period)
            print(f"Searching for ticker={symbol}, period={period}")
        else:
            print(f"Searching for ticker={symbol}, any period")
        
        result = await db.execute(query.order_by(News.date.desc()).limit(10))
        news_items = result.scalars().all()
        
        print(f"Found {len(news_items)} news items for {symbol}")
        
        # 만약 ticker로 찾지 못했다면, 다른 방법으로 시도
        if not news_items:
            # 모든 ticker 값 확인
            all_tickers_result = await db.execute(select(News.ticker).distinct())
            all_tickers = [row[0] for row in all_tickers_result.fetchall() if row[0]]
            print(f"Available tickers in database: {all_tickers[:10]}...")  # 처음 10개만 표시
            
            # symbol을 6자리로 패딩해서 다시 시도
            padded_symbol = symbol.zfill(6)
            if padded_symbol != symbol:
                print(f"Trying with padded symbol: {padded_symbol}")
                padded_query = select(News).filter(News.ticker == padded_symbol)
                if period:
                    padded_query = padded_query.filter(News.period == period)
                
                padded_result = await db.execute(padded_query.order_by(News.date.desc()).limit(10))
                news_items = padded_result.scalars().all()
                print(f"Found {len(news_items)} news items with padded symbol")
        
        # 실제 데이터가 있으면 반환
        if news_items:
            news_data = []
            for news_item in news_items:
                try:
                    news_dict = news_item.to_dict()
                    # 날짜 형식 통일
                    if 'date' in news_dict and news_dict['date']:
                        if hasattr(news_dict['date'], 'strftime'):
                            news_dict['date'] = news_dict['date'].strftime("%Y-%m-%d")
                        elif isinstance(news_dict['date'], str):
                            # 이미 문자열이면 그대로 사용
                            pass
                    news_data.append(news_dict)
                    print(f"News item: {news_dict['title'][:50]}...")
                except Exception as e:
                    print(f"Error processing news item: {e}")
                    continue
            
            if news_data:
                print(f"Successfully processed {len(news_data)} news items")
                return news_data
        
        # 실제 데이터가 없으면 다른 카테고리에서 찾기
        broader_query = select(News).filter(
            News.ticker == symbol
        ).order_by(News.date.desc()).limit(5)
        
        broader_result = await db.execute(broader_query)
        broader_news = broader_result.scalars().all()
        
        if broader_news:
            print(f"Found {len(broader_news)} broader news items for {symbol}")
            return [news_item.to_dict() for news_item in broader_news]
        
        # 섹터별 뉴스 찾기
        stock_result = await db.execute(select(Stock).filter(Stock.symbol == symbol))
        stock = stock_result.scalars().first()
        
        if stock:
            sector_stocks_result = await db.execute(
                select(Stock.symbol).filter(Stock.sector == stock.sector)
            )
            sector_symbols = [row[0] for row in sector_stocks_result.fetchall()]
            
            sector_news_result = await db.execute(
                select(News).filter(
                    News.ticker.in_(sector_symbols)
                ).order_by(News.date.desc()).limit(3)
            )
            sector_news = sector_news_result.scalars().all()
            
            if sector_news:
                print(f"Found {len(sector_news)} sector news items for {symbol}")
                return [news_item.to_dict() for news_item in sector_news]
        
        print(f"No news found for {symbol}, returning dummy data")
        
    except Exception as e:
        print(f"Error getting stock news: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
    
    # 더미 뉴스 반환 (마지막 수단)
    current_date = datetime.now()
    return [
        {
            "title": f"{symbol} 실적 개선 전망",
            "date": (current_date - timedelta(days=1)).strftime("%Y-%m-%d"),
            "summary": "분석가들은 해당 종목의 실적이 개선될 것으로 전망하고 있습니다.",
            "sentiment": "positive"
        },
        {
            "title": f"{symbol} 신규 사업 진출 소식", 
            "date": (current_date - timedelta(days=3)).strftime("%Y-%m-%d"),
            "summary": "새로운 사업 영역 진출로 성장 동력 확보에 나섰습니다.",
            "sentiment": "positive"
        },
        {
            "title": f"{symbol} 시장 동향 분석",
            "date": (current_date - timedelta(days=5)).strftime("%Y-%m-%d"),
            "summary": "업계 전문가들이 해당 종목의 향후 전망을 분석했습니다.",
            "sentiment": "neutral"
        }
    ]

# 종목별 가격 히스토리 API
@app.get("/api/stocks/{symbol}/price-history")
async def get_stock_price_history(
    symbol: str, 
    period: str = None, 
    start_date: str = None, 
    end_date: str = None, 
    db: AsyncSession = Depends(get_db)
):
    """특정 종목의 가격 히스토리를 반환"""
    try:
        print(f"Fetching price history for symbol: {symbol}, period: {period}, start_date: {start_date}, end_date: {end_date}")
        
        # 종목 찾기
        stock_result = await db.execute(select(Stock).filter(Stock.symbol == symbol))
        stock = stock_result.scalars().first()
        
        if not stock:
            print(f"Stock not found for symbol: {symbol}")
            raise HTTPException(status_code=404, detail="Stock not found")
        
        print(f"Found stock: {stock.name} (ID: {stock.id})")
        
        # 먼저 전체 데이터 있는지 확인
        total_query = select(StockPrice).filter(StockPrice.stock_id == stock.id)
        total_result = await db.execute(total_query)
        total_prices = total_result.scalars().all()
        print(f"Total price records available for {stock.name}: {len(total_prices)}")
        
        # 실제 데이터베이스의 날짜 범위 확인
        if total_prices:
            dates = [p.date for p in total_prices]
            min_date = min(dates)
            max_date = max(dates)
            print(f"Database date range for {stock.name}: {min_date} to {max_date}")
            
            # 특정 연도별 데이터 개수 확인 (DATE 타입 호환)
            test_2019 = await db.execute(select(StockPrice).filter(
                StockPrice.stock_id == stock.id,
                StockPrice.date >= datetime(2019, 1, 1).date(),
                StockPrice.date < datetime(2020, 1, 1).date()
            ))
            count_2019 = len(test_2019.scalars().all())
            
            test_2020 = await db.execute(select(StockPrice).filter(
                StockPrice.stock_id == stock.id,
                StockPrice.date >= datetime(2020, 1, 1).date(),
                StockPrice.date < datetime(2021, 1, 1).date()
            ))
            count_2020 = len(test_2020.scalars().all())
            
            test_2024 = await db.execute(select(StockPrice).filter(
                StockPrice.stock_id == stock.id,
                StockPrice.date >= datetime(2024, 1, 1).date(),
                StockPrice.date < datetime(2025, 1, 1).date()
            ))
            count_2024 = len(test_2024.scalars().all())
            
            print(f"📊 Year-wise data count: 2019={count_2019}, 2020={count_2020}, 2024={count_2024}")
        
        query = select(StockPrice).filter(StockPrice.stock_id == stock.id)
        
        # 날짜 범위 필터링 우선 적용
        if start_date and end_date:
            try:
                # DATE 타입과 호환되도록 날짜만 사용 (시간 제거)
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                print(f"Applying custom date range filter: {start_date_obj} to {end_date_obj}")
                
                query = query.filter(
                    StockPrice.date >= start_date_obj,
                    StockPrice.date <= end_date_obj
                )
                
                # 실제 쿼리 로그 출력
                print(f"🔍 ACTUAL QUERY: {query}")
                print(f"🔍 Query conditions: stock_id={stock.id}, date>={start_date_obj}, date<={end_date_obj}")
            except ValueError as e:
                print(f"Invalid date format: {e}")
                # 날짜 형식이 잘못된 경우 period로 폴백
                if period and len(total_prices) > 10:
                    year, half = period.split()
                    year = int(year)
                    start_month = 1 if half == "H1" else 7
                    start_date_obj = datetime(year, start_month, 1).date()
                    if half == "H1":
                        end_date_obj = datetime(year, 6, 30).date()
                    else:
                        end_date_obj = datetime(year, 12, 31).date()
                    
                    print(f"Fallback to period filter: {start_date_obj} to {end_date_obj}")
                    query = query.filter(
                        StockPrice.date >= start_date_obj,
                        StockPrice.date <= end_date_obj
                    )
        elif period and len(total_prices) > 10:  # 기존 period 기반 필터링 (조건 완화)
            year, half = period.split()
            year = int(year)
            start_month = 1 if half == "H1" else 7
            start_date_obj = datetime(year, start_month, 1).date()
            if half == "H1":
                end_date_obj = datetime(year, 6, 30).date()
            else:
                end_date_obj = datetime(year, 12, 31).date()
            
            print(f"Applying period filter: {start_date_obj} to {end_date_obj}")
            
            query = query.filter(
                StockPrice.date >= start_date_obj,
                StockPrice.date <= end_date_obj
            )
        else:
            print(f"Using all available data instead of period filter (available: {len(total_prices)})")
            # 데이터가 적으면 모든 데이터를 사용
            query = query.order_by(StockPrice.date.asc())
        
        result = await db.execute(query.order_by(StockPrice.date.asc()))
        prices = result.scalars().all()
        
        print(f"Found {len(prices)} price records for stock_id: {stock.id}")
        
        # 실제 반환되는 데이터의 날짜 범위 확인
        if prices:
            returned_dates = [p.date for p in prices]
            returned_min = min(returned_dates)
            returned_max = max(returned_dates)
            print(f"Returned data date range: {returned_min} to {returned_max}")
            print(f"First 3 returned dates: {[p.date for p in prices[:3]]}")
            print(f"Last 3 returned dates: {[p.date for p in prices[-3:]]}")
            print("✅ USING FILTERED DATA - This should be 2019-2020 data!")
        else:
            print("❌ No prices returned from query! Will use fallback logic.")
        
        if prices:
            price_data = []
            for price in prices:
                try:
                    price_data.append({
                        "date": price.date.strftime("%Y-%m-%d") if hasattr(price.date, 'strftime') else str(price.date),
                        "price": float(price.close_price),
                        "open": float(price.open_price) if price.open_price is not None else float(price.close_price),
                        "high": float(price.high) if price.high is not None else float(price.close_price),
                        "low": float(price.low) if price.low is not None else float(price.close_price),
                        "volume": int(price.volume) if price.volume is not None else 0
                    })
                except Exception as e:
                    print(f"Error processing price record: {e}")
                    continue
            
            if price_data:
                print(f"Successfully processed {len(price_data)} price records")
                print(f"Sample price data: {price_data[0]}")
                return price_data
            else:
                print("No valid price data after processing")
        
        # 실제 데이터가 없으면 최신 데이터 사용
        print(f"Searching for recent data for stock_id: {stock.id}")
        recent_query = select(StockPrice).filter(
            StockPrice.stock_id == stock.id
        ).order_by(StockPrice.date.desc()).limit(60)  # 최근 60개 데이터점
        
        recent_result = await db.execute(recent_query)
        recent_prices = recent_result.scalars().all()
        
        if recent_prices:
            print(f"🔄 FALLBACK: Found {len(recent_prices)} recent price records for {stock.name}")
            print("⚠️  USING 2024 DATA INSTEAD OF REQUESTED 2019-2020 RANGE!")
            price_data = []
            for price in reversed(recent_prices):  # 날짜 순으로 정렬
                try:
                    price_data.append({
                        "date": price.date.strftime("%Y-%m-%d") if hasattr(price.date, 'strftime') else str(price.date),
                        "price": float(price.close_price),
                        "open": float(price.open_price) if price.open_price is not None else float(price.close_price),
                        "high": float(price.high) if price.high is not None else float(price.close_price),
                        "low": float(price.low) if price.low is not None else float(price.close_price),
                        "volume": int(price.volume) if price.volume is not None else 0
                    })
                except Exception as e:
                    print(f"Error processing recent price record: {e}")
                    continue
            
            if price_data:
                print(f"Successfully processed {len(price_data)} recent price records")
                return price_data
        
        print(f"No price data found for {symbol} in period {period}")
        # 실제 데이터를 찾을 수 없을 때만 더미 데이터 생성
        
    except Exception as e:
        print(f"Error getting price history: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
    
    # 실제 DB에 데이터가 없을 때만 더미 데이터 생성
    try:
        # 종목별 기본 가격 설정
        base_prices = {
            "005930": 70000,  # 삼성전자
            "000660": 120000,  # SK하이닉스
            "035420": 200000,  # NAVER
            "051910": 500000,  # LG화학
            "006400": 400000,  # 삼성SDI
            "035720": 50000,   # 카카오
            "207940": 800000,  # 삼성바이오로직스
            "068270": 150000,  # 셀트리온
        }
        
        base_price = base_prices.get(symbol, 50000)
        
        # 기간에 따른 날짜 생성
        if period:
            year, half = period.split()
            year = int(year)
            start_month = 1 if half == "H1" else 7
            start_date = datetime(year, start_month, 1)
            days_in_period = 181 if half == "H1" else 184
        else:
            start_date = datetime(2024, 1, 1)
            days_in_period = 90
        
        dummy_data = []
        current_price = base_price
        
        for i in range(0, min(days_in_period, 90), 3):  # 3일 간격으로 30개 포인트
            current_date = start_date + timedelta(days=i)
            
            # 현실적인 가격 변동
            daily_change = (random.random() - 0.5) * 0.04  # ±2% 변동
            current_price = current_price * (1 + daily_change)
            current_price = max(current_price, base_price * 0.5)  # 최소 50% 유지
            
            # OHLC 생성
            open_price = current_price * (0.98 + random.random() * 0.04)
            high_price = max(open_price, current_price) * (1 + random.random() * 0.02)
            low_price = min(open_price, current_price) * (1 - random.random() * 0.02)
            volume = random.randint(100000, 2000000)
            
            dummy_data.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "price": round(current_price),
                "open": round(open_price),
                "high": round(high_price),
                "low": round(low_price),
                "volume": volume
            })
        
        print(f"Generated {len(dummy_data)} dummy price records")
        return dummy_data
        
    except Exception as e:
        print(f"Error generating dummy data: {e}")
        return []

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 