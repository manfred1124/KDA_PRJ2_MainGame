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
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import OpenAIEmbeddings

from database import get_db, init_db
from models import User, Stock, Portfolio, Transaction, News, RoundReview, StockPrice
from schemas import (
    UserCreate, UserLogin, UserResponse, 
    StockResponse, PortfolioResponse, TransactionCreate,
    NewsResponse, GameState
)
from services import (
    auth_service, stock_service, portfolio_service,
    news_service, game_service, financial_service
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

# RAG: Load or build FAISS vector DB from knowledge base
FAISS_INDEX_PATH = os.path.join(os.path.dirname(__file__), "data", "faiss_index")
KNOWLEDGE_FILE = os.path.join(os.path.dirname(__file__), "data", "knowledge_base.txt")

embeddings = OpenAIEmbeddings()

# Build or load FAISS index (singleton)
if os.path.exists(FAISS_INDEX_PATH):
    vectorstore = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
else:
    with open(KNOWLEDGE_FILE, encoding="utf-8") as f:
        documents = [line.strip() for line in f if line.strip()]
    vectorstore = FAISS.from_texts(documents, embeddings)
    vectorstore.save_local(FAISS_INDEX_PATH)

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
    # 라운드가 넘어가기 전이면 이전 라운드 기준 period 사용 (단, 1라운드면 0)
    if hasattr(user, 'can_advance_round') and user.can_advance_round:
        period_idx = max(0, user.current_round_idx - 1)
        current_period = periods[period_idx]
    else:
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
async def get_stock(
    stock_id: int, 
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    # 사용자 인증 및 현재 기간 가져오기
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 현재 기간의 시작 날짜 계산
    periods = json.loads(user.round_periods)
    if user.current_round_idx >= len(periods):
        current_period = periods[-1]  # 마지막 기간 사용
    else:
        current_period = periods[user.current_round_idx]
    
    date = period_to_date(current_period)
    return await stock_service.get_stock_by_id(db, stock_id, date)

# 포트폴리오 관련 엔드포인트
@app.get("/api/portfolio")
async def get_portfolio(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    periods = json.loads(user.round_periods)
    # 라운드가 넘어가기 전이면 이전 라운드 기준 period 사용 (단, 1라운드면 0)
    if hasattr(user, 'can_advance_round') and user.can_advance_round:
        period_idx = max(0, user.current_round_idx - 1)
        current_period = periods[period_idx]
    else:
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
            # 해당 기간의 시작 가격과 끝 가격 조회
            start_price_result = await db.execute(
                select(StockPrice.close_price)
                .where(StockPrice.stock_id == stock.id)
                .where(StockPrice.date >= date)
                .order_by(StockPrice.date.asc())
                .limit(1)
            )
            start_price = start_price_result.scalar_one_or_none()
            
            # 해당 기간의 끝 가격 조회 (6개월 후)
            from datetime import datetime, timedelta
            if current_period.endswith("H1"):
                year = int(current_period.split()[0])
                end_date = datetime(year, 6, 30).date()
            else:
                year = int(current_period.split()[0])
                end_date = datetime(year, 12, 31).date()
            
            end_price_result = await db.execute(
                select(StockPrice.close_price)
                .where(StockPrice.stock_id == stock.id)
                .where(StockPrice.date <= end_date)
                .order_by(StockPrice.date.desc())
                .limit(1)
            )
            end_price = end_price_result.scalar_one_or_none()
            
            # 현재가로는 끝 가격 사용
            current_price = end_price if end_price is not None else start_price
            if current_price is None:
                current_price = 0
                
            total_value = item.quantity * current_price
            profit_loss = total_value - (item.quantity * item.average_price)
            profit_loss_percentage = (profit_loss / (item.quantity * item.average_price)) * 100 if item.average_price > 0 else 0
            # 해당 주식의 가장 최근 구매 거래 조회하여 라운드 정보 가져오기
            latest_buy_transaction = await db.execute(
                select(Transaction)
                .where(Transaction.user_id == user.id, Transaction.stock_id == stock.id, Transaction.transaction_type == "buy")
                .order_by(Transaction.created_at.desc())
                .limit(1)
            )
            latest_buy = latest_buy_transaction.scalar_one_or_none()
            round_purchased = latest_buy.round_number if latest_buy else None
            
            item_list.append({
                "stock_id": stock.id,
                "stock_symbol": stock.symbol,
                "stock_name": stock.name,
                "quantity": item.quantity,
                "average_price": item.average_price,
                "current_price": current_price,
                "total_value": total_value,
                "profit_loss": profit_loss,
                "profit_loss_percentage": profit_loss_percentage,
                "round_purchased": round_purchased
            })
            total_portfolio_value += total_value
            total_investment += item.quantity * item.average_price
    total_profit_loss = total_portfolio_value - total_investment
    total_profit_loss_percentage = (total_profit_loss / total_investment) * 100 if total_investment > 0 else 0
    # 총 수익 (미실현 + 실현)
    total_profit = total_profit_loss + user.realized_profit
    
    # 총 수익률 계산 개선
    # 초기 투자금액 (1천만원)을 기준으로 계산
    initial_investment = 10000000  # 1천만원
    
    # 총 수익률 = 총 수익 / 초기 투자금액
    total_profit_percentage = (total_profit / initial_investment) * 100
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
    # 라운드가 넘어가기 전이면 이전 라운드 기준 period 사용 (단, 1라운드면 0)
    if hasattr(user, 'can_advance_round') and user.can_advance_round:
        period_idx = max(0, user.current_round_idx - 1)
        current_period = periods[period_idx]
    else:
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
    # 라운드가 넘어가기 전이면 이전 라운드 기준 period 사용 (단, 1라운드면 0)
    if hasattr(user, 'can_advance_round') and user.can_advance_round:
        period_idx = max(0, user.current_round_idx - 1)
        current_period = periods[period_idx]
    else:
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
    # 라운드가 넘어가기 전이면 이전 라운드 기준 period 사용 (단, 1라운드면 0)
    if hasattr(user, 'can_advance_round') and user.can_advance_round:
        period_idx = max(0, user.current_round_idx - 1)
        current_period = periods[period_idx]
    else:
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

    # RAG: Retrieve top-3 relevant docs for the message
    rag_docs = vectorstore.similarity_search(message, k=3)
    rag_context = "\n".join([doc.page_content for doc in rag_docs])
    if rag_context:
        context += f"\n[외부지식]\n{rag_context}\n"

    # LangChain LLM 호출
    llm = ChatOpenAI(temperature=0.2, model_name="gpt-3.5-turbo")
    system_prompt = (
        """너는 주식 투자 시뮬레이션 게임의 챗봇이야.\n"
        "너는 주식 투자 게임을 통해 모험을 떠나는 용사를 위해 조언을 해주는 조언 용사야.\n"
        "너의 말투는 세종대왕의 어투를 정확히 모방해라.\n"
        "답변 시작할 때는 반드시 '허허,', '과인이 생각하기에는,', '그대의 질문이 심오하구나,', '좋은 접근이군,' 같은 표현으로 시작해라.\n"
        "문장의 어미로는 '하시게', '하시는 것이 좋겠네', '하는 것이 현명하리라' 같은 표현을 사용해라.\n"
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

@app.post("/api/chatbot/stock-analysis")
async def stock_analysis(
    stock_data: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """특정 종목의 해당 기간 흐름을 LLM으로 분석"""
    try:
        user_id = auth_service.verify_token(credentials.credentials)
        user = await db.execute(select(User).where(User.id == user_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        stock_symbol = stock_data.get("symbol")
        stock_name = stock_data.get("name")
        period = stock_data.get("period")
        
        if not stock_symbol or not stock_name:
            raise HTTPException(status_code=400, detail="Stock symbol and name are required")
        
        if not period:
            # 사용자의 현재 기간 사용
            periods = json.loads(user.round_periods) if user.round_periods else []
            period = periods[user.current_round_idx] if periods and user.current_round_idx < len(periods) else "2020 H1"
        
        print(f"Stock analysis request - symbol: {stock_symbol}, name: {stock_name}, period: {period}")
        
        # 1. 종목 뉴스 데이터 수집
        stock_news = await news_service.get_news_by_stock(db, stock_name=stock_name, period=period, ticker=stock_symbol)
        
        # 2. 종목 가격 데이터 수집
        stock_result = await db.execute(select(Stock).filter(Stock.symbol == stock_symbol))
        stock = stock_result.scalar_one_or_none()
        
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")
        
        # period에 해당하는 가격 데이터 조회
        from services.period_utils import period_to_date
        from datetime import timedelta
        
        date = period_to_date(period)
        prev_date = date - timedelta(days=180)  # 6개월 전
        
        # 현재 기간 가격
        current_price_result = await db.execute(
            select(StockPrice)
            .where(StockPrice.stock_id == stock.id)
            .where(StockPrice.date >= date)
            .order_by(StockPrice.date.asc())
            .limit(1)
        )
        current_price = current_price_result.scalar_one_or_none()
        
        # 이전 기간 가격
        prev_price_result = await db.execute(
            select(StockPrice)
            .where(StockPrice.stock_id == stock.id)
            .where(StockPrice.date >= prev_date)
            .order_by(StockPrice.date.asc())
            .limit(1)
        )
        prev_price = prev_price_result.scalar_one_or_none()
        
        # 3. 섹터 뉴스 데이터 수집
        sector_news = await news_service.get_sector_trend_news(db, stock.sector, period)
        
        # 4. 매크로 뉴스 데이터 수집
        macro_news = await news_service.get_macro_news_by_period(db, period)
        
        # 5. 컨텍스트 구성
        news_titles = [n.title for n in stock_news[:3]]
        sector_news_titles = [n.title for n in sector_news[:2]]
        macro_news_titles = [n.title for n in macro_news[:2]]
        
        price_change = 0
        if current_price and prev_price:
            price_change = ((current_price.close_price - prev_price.close_price) / prev_price.close_price) * 100
        
        context = f"""
현재 분석 기간: {period}
종목: {stock_name} ({stock_symbol})
섹터: {stock.sector}
현재가: {current_price.close_price if current_price else 'N/A'}원
가격변화: {price_change:.1f}% (이전 6개월 대비)

종목 관련 뉴스: {', '.join(news_titles) if news_titles else '관련 뉴스 없음'}
섹터 뉴스: {', '.join(sector_news_titles) if sector_news_titles else '섹터 뉴스 없음'}
매크로 뉴스: {', '.join(macro_news_titles) if macro_news_titles else '매크로 뉴스 없음'}
"""
        
        # 6. LLM 분석
        llm = ChatOpenAI(temperature=0.3, model_name="gpt-3.5-turbo")
        system_prompt = (
            """너는 주식 투자 시뮬레이션 게임의 장군이야.\n"
            "너는 세종대왕의 어투를 정확히 모방해라.\n"
            "답변 시작할 때는 반드시 '허허,', '과인이 살펴보니,', '그대가 관심을 보이는 종목이구나,' 같은 표현으로 시작해라.\n"
            "문장 끝에는 '~하시게', '~하시는 것이 좋겠네', '~하는 것이 현명하리라' 같은 표현을 사용해라.\n"
            "투자 조언을 줄 때는 '그대가 신중하게 판단하시게', '과인의 조언을 참고하시게' 같은 표현을 사용해라.\n"
            "답변은 3-4문장으로 간결하게 해라. 너무 길지 않게 핵심만 전달해라.\n"
            "종목의 가격 변화, 뉴스, 섹터 동향을 종합적으로 분석해서 간단한 투자 관점을 제시해라.\n"
            "미래 예측은 하지 말고, 현재 상황에 대한 분석만 해라.\n"
            """
        )
        
        messages = [
            SystemMessage(content=system_prompt + "\n" + context),
            HumanMessage(content=f"{stock_name} 종목의 {period} 기간 동안의 흐름을 간략하게 설명해주시게.")
        ]
        
        answer = llm(messages).content
        
        return {"analysis": answer}
        
    except Exception as e:
        print(f"Error in stock analysis: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Stock analysis failed")

@app.post("/api/chatbot/mypage-feedback")
async def mypage_feedback(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """마이페이지 진입 시 사용자의 투자 성과를 분석하여 LLM 기반 피드백 제공"""
    try:
        user_id = auth_service.verify_token(credentials.credentials)
        user = await db.execute(select(User).where(User.id == user_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        periods = json.loads(user.round_periods)
        current_period = periods[user.current_round_idx] if user.current_round_idx < len(periods) else periods[-1]
        current_round = user.current_round_idx + 1
        
        # 포트폴리오 데이터 조회
        portfolio_items = await db.execute(select(Portfolio).where(Portfolio.user_id == user.id, Portfolio.quantity > 0))
        items = portfolio_items.scalars().all()
        
        # 거래 내역 조회
        transactions = await db.execute(select(Transaction).where(Transaction.user_id == user.id).order_by(Transaction.created_at))
        transactions = transactions.scalars().all()
        
        # 포트폴리오 분석
        total_portfolio_value = 0
        total_profit_loss = 0
        total_investment = 0
        stock_details = []
        
        for item in items:
            stock = await db.execute(select(Stock).where(Stock.id == item.stock_id))
            stock = stock.scalar_one_or_none()
            if stock:
                # 현재가 조회
                current_price_result = await db.execute(
                    select(StockPrice.close_price)
                    .where(StockPrice.stock_id == stock.id)
                    .where(StockPrice.date <= period_to_date(current_period))
                    .order_by(StockPrice.date.desc())
                    .limit(1)
                )
                current_price = current_price_result.scalar_one_or_none() or 0
                
                total_value = item.quantity * current_price
                profit_loss = total_value - (item.quantity * item.average_price)
                
                total_portfolio_value += total_value
                total_profit_loss += profit_loss
                total_investment += item.quantity * item.average_price
                
                stock_details.append({
                    "name": stock.name,
                    "quantity": item.quantity,
                    "avg_price": item.average_price,
                    "current_price": current_price,
                    "profit_loss": profit_loss,
                    "profit_rate": (profit_loss / (item.quantity * item.average_price)) * 100 if item.average_price > 0 else 0
                })
        
        # 거래 패턴 분석
        buy_count = len([t for t in transactions if t.transaction_type == "buy"])
        sell_count = len([t for t in transactions if t.transaction_type == "sell"])
        
        # 자산 구성 분석
        total_assets = user.total_balance + total_portfolio_value
        cash_ratio = (user.total_balance / total_assets) * 100 if total_assets > 0 else 0
        stock_ratio = (total_portfolio_value / total_assets) * 100 if total_assets > 0 else 0
        
        # 총 수익 (미실현 + 실현)
        total_profit = total_profit_loss + user.realized_profit
        
        # 총 수익률 계산 (초기 투자금 1천만원 기준) - 마이페이지와 동일하게
        initial_investment = 10000000
        total_profit_percentage = (total_profit / initial_investment) * 100
        
        # LLM에 전달할 컨텍스트 구성
        context = f"""
        사용자 정보:
        - 이름: {user.username}
        - 현재 라운드: {current_round} ({current_period})
        - 보유 현금: {user.total_balance:,}원
        - 평가금액: {total_portfolio_value:,}원
        - 총 자산: {total_assets:,}원
        - 총 수익률 (초기 투자금 대비): {total_profit_percentage:.2f}% (수익률 평가: {'훌륭함' if total_profit_percentage >= 20 else '좋음' if total_profit_percentage >= 10 else '양호함' if total_profit_percentage >= 0 else '손실'})
        - 미실현 손익: {total_profit_loss:,}원
        - 실현 손익: {user.realized_profit:,}원
        
        자산 구성:
        - 현금 비중: {cash_ratio:.1f}% (현금이 40% 이상이면 적극 투자 권장, 25% 이하면 현금 확보 권장)
        - 주식 비중: {stock_ratio:.1f}%
        
        거래 패턴:
        - 매수 거래: {buy_count}회
        - 매도 거래: {sell_count}회
        
        보유 주식 상세:
        {chr(10).join([f"- {s['name']}: {s['quantity']}주, 평균단가 {s['avg_price']:,}원, 현재가 {s['current_price']:,}원, 손익 {s['profit_loss']:,}원 ({s['profit_rate']:.2f}%)" for s in stock_details])}
        """
        
        # LangChain LLM 호출
        llm = ChatOpenAI(temperature=0.3, model_name="gpt-3.5-turbo")
        system_prompt = """
        너는 주식 투자 시뮬레이션 게임의 조언자로서, 세종대왕의 어투를 정확히 모방하는 현명한 투자 조언자이다.
        
        말투 규칙:
        1. 문장 시작은 다음과 같은 고풍스러운 어투 중 하나로 시작하시오:
        - "허허, 용사여", "과인이 분석해보니", "그대의 투자 성과를 살펴보니"
        2. 문장 끝맺음은 항상 존엄하고 권위 있는 어투로 마무리하시오. 예: "~하시게", "~하시는 것이 좋겠네네", "~하는 것이 현명하리라"
        3. 조언할 때는 조심스럽고 품격 있는 어투를 사용하시오. 예: "과인의 조언을 참고하시게", "그대가 신중하게 판단하시게"
        4. 격려 시에는 용사의 길을 응원하는 말투를 사용하시오. 예: "용사여, 투자의 길에서 늘 현명하시길 바라나이다"

        
        간단한 피드백을 제공하라:
        
        - "허허, 용사 {user.username}(이)여!"로 시작
        - 수익률에 따른 간단한 격려 또는 조언 (1-2문장):
          * 수익률 20% 이상: "훌륭한 성과로다! 진정한 투자 고수라 할 수 있겠네."
          * 수익률 10% 이상: "좋은 성과로다! 현명한 투자자라 할 수 있겠네."
          * 수익률 0% 이상: "양호한 성과로다. 신중한 투자라 할 수 있겠네."
          * 수익률 0% 미만: "손실이 있으나 이는 투자의 길에서 반드시 겪어야 할 시련이라 할 수 있겠네."
        
        중요: 수익률이 양수이면 반드시 긍정적인 평가를 해야 한다. "아쉽다", "부족하다", "손실" 등의 부정적 표현을 절대 사용하지 말라. 수익률이 +31.25%라면 이는 매우 훌륭한 성과이므로 반드시 긍정적으로 평가해야 한다.
        - 가장 중요한 한 가지 조언만 제시 (다음 우선순위로):
          1. 손실 발생 시: 분산 투자와 리스크 관리 권장
          2. 현금 40% 이상: 적극적인 투자 기회 찾기 권장
          3. 현금 25% 이하: 현금 유동성 확보 권장
          4. 거래 빈도가 매우 높거나 낮을 때: 거래 패턴 조언
          5. 기타: 현재 전략 유지하되 신중하게 접근 권장
        - 세종대왕의 어투 유지 ("~하시게", "~하시는 것이 좋겠네")
        
        중요: 마크다운 형식(###)을 사용하지 말고, 텍스트만 사용하라.
        
        답변은 100-150자 내외로 매우 간결하게 작성하라.
        
        최종 확인: 수익률이 양수이면 절대 "손실", "아쉽다", "부족하다" 등의 부정적 표현을 사용하지 말라. +31.25%는 매우 훌륭한 성과이므로 반드시 긍정적으로 평가해야 한다.
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"다음 투자 성과 데이터를 바탕으로 세종대왕 어투로 피드백을 제공해주세요:\n\n{context}")
        ]
        
        answer = llm(messages).content
        
        return {"feedback": answer}
        
    except Exception as e:
        print(f"Error in mypage_feedback: {e}")
        raise HTTPException(status_code=500, detail="피드백 생성 중 오류가 발생했습니다.")

@app.post("/api/chatbot/sector-analysis")
async def sector_analysis(
    sector_data: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """특정 섹터의 해당 기간 흐름을 LLM으로 분석"""
    try:
        user_id = auth_service.verify_token(credentials.credentials)
        user = await db.execute(select(User).where(User.id == user_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        sector = sector_data.get("sector")
        period = sector_data.get("period")
        
        if not sector:
            raise HTTPException(status_code=400, detail="Sector is required")
        
        if not period:
            # 사용자의 현재 기간 사용
            periods = json.loads(user.round_periods) if user.round_periods else []
            period = periods[user.current_round_idx] if periods and user.current_round_idx < len(periods) else "2020 H1"
        
        print(f"Sector analysis request - sector: {sector}, period: {period}")
        
        # 1. 섹터 뉴스 데이터 수집
        sector_news = await news_service.get_sector_trend_news(db, sector, period)
        
        # 2. 섹터 내 종목들의 가격 데이터 수집
        sector_stocks_result = await db.execute(
            select(Stock).filter(Stock.sector == sector)
        )
        sector_stocks = sector_stocks_result.scalars().all()
        
        # 3. 매크로 뉴스 데이터 수집
        macro_news = await news_service.get_macro_news_by_period(db, period)
        
        # 4. 섹터 종목들의 평균 수익률 계산
        from services.period_utils import period_to_date
        from datetime import timedelta
        
        date = period_to_date(period)
        prev_date = date - timedelta(days=180)  # 6개월 전
        
        sector_returns = []
        for stock in sector_stocks[:5]:  # 상위 5개 종목만 분석
            current_price_result = await db.execute(
                select(StockPrice)
                .where(StockPrice.stock_id == stock.id)
                .where(StockPrice.date >= date)
                .order_by(StockPrice.date.asc())
                .limit(1)
            )
            current_price = current_price_result.scalar_one_or_none()
            
            prev_price_result = await db.execute(
                select(StockPrice)
                .where(StockPrice.stock_id == stock.id)
                .where(StockPrice.date >= prev_date)
                .order_by(StockPrice.date.asc())
                .limit(1)
            )
            prev_price = prev_price_result.scalar_one_or_none()
            
            if current_price and prev_price:
                return_rate = ((current_price.close_price - prev_price.close_price) / prev_price.close_price) * 100
                sector_returns.append(return_rate)
        
        avg_sector_return = sum(sector_returns) / len(sector_returns) if sector_returns else 0
        
        # 5. 컨텍스트 구성
        sector_news_titles = [n.title for n in sector_news[:3]]
        macro_news_titles = [n.title for n in macro_news[:2]]
        
        context = f"""
현재 분석 기간: {period}
섹터: {sector}
섹터 종목 수: {len(sector_stocks)}개
평균 수익률: {avg_sector_return:.1f}% (이전 6개월 대비)

섹터 뉴스: {', '.join(sector_news_titles) if sector_news_titles else '섹터 뉴스 없음'}
매크로 뉴스: {', '.join(macro_news_titles) if macro_news_titles else '매크로 뉴스 없음'}
"""
        
        # 6. LLM 분석
        llm = ChatOpenAI(temperature=0.3, model_name="gpt-3.5-turbo")
        system_prompt = (
            """너는 주식 투자 시뮬레이션 게임의 장군이야.\n"
            "너는 세종대왕의 어투를 정확히 모방해라.\n"
            "답변 시작할 때는 반드시 '허허,', '과인이 살펴보니,', '그대가 관심을 보이는 섹터로구나,' 같은 표현으로 시작해라.\n"
            "문장 끝에는 '~하시게', '~하시는 것이 좋겠네', '~하는 것이 현명하리라' 같은 표현을 사용해라.\n"
            "투자 조언을 줄 때는 '그대가 신중하게 판단하시게', '과인의 조언을 참고하시게' 같은 표현을 사용해라.\n"
            "답변은 3-4문장으로 간결하게 해라. 너무 길지 않게 핵심만 전달해라.\n"
            "섹터의 전반적인 동향, 뉴스, 수익률을 종합적으로 분석해서 간단한 투자 관점을 제시해라.\n"
            "미래 예측은 하지 말고, 현재 상황에 대한 분석만 해라.\n"
            """
        )
        
        messages = [
            SystemMessage(content=system_prompt + "\n" + context),
            HumanMessage(content=f"{sector} 섹터의 {period} 기간 동안의 흐름을 간략하게 설명해주시게.")
        ]
        
        answer = llm(messages).content
        
        return {"analysis": answer}
        
    except Exception as e:
        print(f"Error in sector analysis: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Sector analysis failed")

@app.post("/api/chatbot/keyword-analysis")
async def keyword_analysis(
    keyword_data: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """키워드 관련 뉴스를 기반으로 해당 라운드의 사건과 영향을 분석"""
    try:
        user_id = auth_service.verify_token(credentials.credentials)
        user = await db.execute(select(User).where(User.id == user_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        keyword = keyword_data.get("keyword")
        round_number = keyword_data.get("round", 1)
        
        print(f"Keyword analysis request - keyword: {keyword}, round: {round_number}")
        print(f"Keyword type: {type(keyword)}")
        
        if not keyword:
            raise HTTPException(status_code=400, detail="Keyword is required")
        
        # 사용자의 라운드 기간 가져오기
        periods = None
        try:
            if user.round_periods:
                periods = json.loads(user.round_periods)
                print(f"Successfully parsed user periods: {periods}")
            else:
                print("User round_periods is None or empty")
        except Exception as e:
            print(f"Error parsing user.round_periods: {e}")
            periods = None
        
        print(f"User periods: {periods}")
        print(f"User current_round_idx: {user.current_round_idx}")
        print(f"Requested round_number: {round_number}")
        
        # 기간이 없거나 유효하지 않으면 기본 기간 사용
        if not periods or len(periods) == 0:
            # 기본 기간 설정 (라운드별로 다른 기간)
            default_periods = ["2020 H1", "2020 H2", "2021 H1", "2021 H2", "2022 H1", "2022 H2", "2023 H1", "2023 H2", "2024 H1", "2024 H2"]
            if round_number > 0 and round_number <= len(default_periods):
                target_period = default_periods[round_number - 1]
            else:
                target_period = "2021 H1"  # 기본값
            print(f"Using default period: {target_period}")
        else:
            # 라운드 번호가 1부터 시작하므로 인덱스 조정
            if round_number > 0 and round_number <= len(periods):
                target_period = periods[round_number - 1]
            else:
                # 라운드 번호가 범위를 벗어나면 현재 라운드 사용
                current_round_idx = user.current_round_idx
                if current_round_idx < len(periods):
                    target_period = periods[current_round_idx]
                else:
                    target_period = periods[0] if periods else "2021 H1"
            print(f"Target period: {target_period}")
        
        # 해당 기간의 뉴스 데이터 가져오기
        all_news = await news_service.get_news_until_period(db, target_period)
        print(f"Found {len(all_news)} total news for period {target_period}")
        
        # 뉴스가 적으면 전체 뉴스에서 검색
        if not all_news or len(all_news) < 10:
            result = await db.execute(select(News).order_by(News.period, News.date))
            all_news = result.scalars().all()
            print(f"Expanded search: Found {len(all_news)} total news from all periods")
        
        # 디버깅: 처음 몇 개 뉴스 제목 출력
        if all_news:
            print("Sample news titles:")
            for i, news in enumerate(all_news[:5]):
                print(f"  {i+1}. {news.title}")
        else:
            print("No news found for this period")
        
        # 디버깅: 처음 몇 개 뉴스 제목 출력
        if all_news:
            print("Sample news titles:")
            for i, news in enumerate(all_news[:5]):
                print(f"  {i+1}. {news.title}")
        else:
            print("No news found for this period")
        
        # 키워드와 관련된 뉴스 필터링
        related_news = []
        
        # 키워드별 관련 단어 매핑 (프론트엔드 키워드와 정확히 일치)
        keyword_mappings = {
            "블록체인/암호화폐": ["블록체인", "암호화폐", "비트코인", "이더리움", "가상화폐", "디지털자산"],
            "AI/인공지능": ["AI", "인공지능", "머신러닝", "딥러닝", "자동화", "스마트"],
            "디지털/메타버스": ["디지털", "메타버스", "가상현실", "VR", "AR", "온라인"],
            "기술 혁신": ["기술", "혁신", "신기술", "개발", "연구", "특허"],
            "경제 충격": ["경제", "충격", "위기", "불황", "침체", "경기"],
            "에너지 위기": ["에너지", "위기", "전력", "원유", "석유", "가스"],
            "식량 위기": ["식량", "위기", "농산물", "곡물", "식품", "농업"],
            "금리 변동": ["금리", "변동", "연준", "한국은행", "기준금리", "인상", "인하"],
            "환율 변동": ["환율", "변동", "달러", "원화", "외환", "통화"],
            "물가 상승": ["물가", "상승", "CPI", "인플레이션", "물가상승률"],
            "경기부양책": ["경기부양", "부양책", "경제부양", "재정정책", "통화정책"],
            "경기 회복": ["경기", "회복", "성장", "V자", "부양", "경제회복"],
            "IT 기술": ["IT", "기술", "정보기술", "소프트웨어", "하드웨어"],
            "바이오/제약": ["바이오", "제약", "백신", "신약", "바이오기업", "제약업계"],
            "친환경/ESG": ["친환경", "ESG", "환경", "사회", "지배구조", "탄소중립"],
            "원유/석유": ["원유", "석유", "에너지", "가스", "연료"],
            "중국 경제": ["중국", "경제", "화웨이", "알리바바", "바이두"],
            "미국 경제": ["미국", "경제", "연준", "달러", "월가"],
            "유럽 경제": ["유럽", "경제", "ECB", "유로", "EU"],
            "통신/5G": ["통신", "5G", "네트워크", "SKT", "KT", "LG유플러스"],
            "소비/유통": ["소비", "유통", "리테일", "온라인", "오프라인"],
            "건설/인프라": ["건설", "인프라", "부동산", "아파트", "건축"],
            "화학/소재": ["화학", "소재", "LG화학", "롯데케미칼", "한화솔루션"],
            "조선/해운": ["조선", "해운", "선박", "현대중공업", "삼성중공업"],
            "게임/엔터": ["게임", "엔터", "넥슨", "넷마블", "엔씨소프트"],
            "보험/증권": ["보험", "증권", "삼성생명", "교보생명", "한화생명"],
            "고용/실업": ["고용", "실업", "취업", "노동시장", "일자리"],
            "무역/수출": ["무역", "수출", "수입", "무역협정", "관세"],
            "투자/자본": ["투자", "자본", "벤처", "스타트업", "M&A"],
            "규제/정책": ["규제", "정책", "법안", "제도", "정부", "규제정책", "법률"],
            "합작/M&A": ["합작", "M&A", "인수", "합병", "제휴"],
            "배당/주주": ["배당", "주주", "배당금", "주주환원", "자사주"],
            "실적/수익": ["실적", "수익", "매출", "영업이익", "당기순이익"],
            "클라우드": ["클라우드", "AWS", "Azure", "구글클라우드", "네이버클라우드"],
            "보안/사이버": ["보안", "사이버", "해킹", "바이러스", "방화벽"],
            "의료/헬스케어": ["의료", "헬스케어", "병원", "의약품", "진단"],
            "식품/농업": ["식품", "농업", "농산물", "곡물", "축산"],
            "자동차/모빌리티": ["자동차", "모빌리티", "현대차", "기아", "테슬라"],
            "항공/여행": ["항공", "여행", "대한항공", "아시아나", "제주항공"],
            "리테일/온라인": ["리테일", "온라인", "쿠팡", "배달", "이커머스"],
            "물류/배송": ["물류", "배송", "CJ대한통운", "한진", "로젠"],
            "재생에너지": ["재생에너지", "태양광", "풍력", "수력", "친환경"],
            "배터리/2차전지": ["배터리", "2차전지", "LG에너지솔루션", "삼성SDI", "SK온"],
            "반도체장비": ["반도체장비", "장비", "ASML", "라미리서치", "케이엘에이"],
            "파운드리/팹리스": ["파운드리", "팹리스", "TSMC", "삼성전자", "SK하이닉스"],
            "전쟁": ["전쟁", "러시아", "우크라이나", "분쟁", "군사", "국제정세"],
            "인플레이션": ["인플레이션", "물가", "CPI", "물가상승"],
            "코로나19": ["코로나", "COVID", "팬데믹", "백신", "확산"],
            "백신 보급": ["백신", "보급", "화이자", "모더나", "아스트라제네카"],
            "성장주": ["성장주", "성장", "기술주", "신기술", "혁신"],
            "반도체": ["반도체", "메모리", "SK하이닉스", "삼성전자", "칩"],
            "전기차": ["전기차", "테슬라", "EV", "배터리", "전기자동차"],
            "부동산": ["부동산", "아파트", "집값", "정책", "주택"],
            "금융권": ["금융", "은행", "증권", "보험", "금융권"],
            "교육": ["교육", "에듀", "학원", "온라인교육", "스킬업"],
            "디스플레이": ["디스플레이", "OLED", "LCD", "LG디스플레이", "삼성디스플레이"],
            "메모리": ["메모리", "DRAM", "NAND", "SK하이닉스", "삼성전자"]
        }
        
        # 키워드에 해당하는 관련 단어들 가져오기
        related_terms = keyword_mappings.get(keyword, [keyword])
        
        # 더 포괄적인 검색을 위해 키워드 자체도 추가
        if keyword not in related_terms:
            related_terms.append(keyword)
        
        print(f"Searching for keyword '{keyword}' with related terms: {related_terms}")
        
        for news in all_news:
            # 제목, 요약에서 관련 단어 검색 (대소문자 무시)
            title_lower = news.title.lower()
            summary_lower = news.summary.lower() if news.summary else ""
            
            for term in related_terms:
                term_lower = term.lower()
                if (term_lower in title_lower or 
                    term_lower in summary_lower):
                    print(f"  Found match: '{term}' in news: {news.title[:50]}...")
                    related_news.append(news)
                    break  # 한 번 매칭되면 중복 추가 방지
        
        print(f"Found {len(related_news)} related news for keyword '{keyword}'")
        
        # 관련 뉴스가 없으면 더 넓은 범위로 검색
        if not related_news:
            print(f"No news found with keyword mapping, trying broader search...")
            for news in all_news:
                # 키워드의 일부 단어로도 검색
                keyword_words = keyword.split()
                for word in keyword_words:
                    if len(word) > 1 and word.lower() in news.title.lower():
                        print(f"  Found partial match: '{word}' in news: {news.title[:50]}...")
                        related_news.append(news)
                        break
        
        print(f"Found {len(related_news)} related news for keyword '{keyword}'")
        
        # 뉴스 제목들을 추출하여 컨텍스트 생성
        news_titles = [news.title for news in related_news[:5]]  # 최대 5개
        news_context = "관련 뉴스: " + ", ".join(news_titles) if news_titles else "관련 뉴스가 없습니다."
        
        print(f"News context: {news_context}")
        
        # LLM을 사용하여 뉴스 데이터를 분석하고 해석
        if related_news:
            # 관련 뉴스 정보 수집
            news_info = []
            for news in related_news[:5]:  # 최대 5개 뉴스
                news_info.append({
                    "title": news.title,
                    "summary": news.summary if news.summary else "",
                    "period": news.period,
                    "category": news.category
                })
            
            # LLM에 전달할 컨텍스트 생성
            context = f"""
            키워드: {keyword}
            분석 기간: {target_period}
            
            관련 뉴스 정보:
            """
            for i, news in enumerate(news_info, 1):
                context += f"""
            {i}. 제목: {news['title']}
               요약: {news['summary']}
               기간: {news['period']}
               카테고리: {news['category']}
            """
            
            context += f"""
            
            위의 뉴스 정보를 바탕으로 {keyword}에 대해 간결하게 분석해주세요. 
            세종대왕의 말투로 답변하되, 다음 사항을 포함하되 한 문단으로 제한해주세요:
            1. {keyword}가 해당 기간에 어떤 영향을 미쳤는지
            2. 투자자에게 어떤 의미가 있는지 (간단히)
            
            "너는 주식 투자 시뮬레이션 게임의 챗봇이야.\n"
            "너는 주식 투자 게임을 통해 모험을 떠나는 용사를 위해 조언을 해주는 조언 용사야.\n"
            "너의 말투는 세종대왕의 어투를 정확히 모방해라.\n"
            "답변 시작할 때는 반드시 '허허,', '과인이 생각하기에는,', '그대의 질문이 심오하구나,', '좋은 접근이군,' 같은 표현으로 시작해라.\n"
            "문장 끝에는 '~하시게', '~하시는 것이 좋겠네', '~하는 것이 현명하리라' 같은 표현을 사용해라.\n"
            "투자 조언을 줄 때는 '그대가 신중하게 판단하시게', '과인의 조언을 참고하시게', '이런 관점도 있으니 생각해보시게' 같은 표현을 사용해라.\n"
            "예시: '허허, 그대의 질문이 심오하구나. 글로벌 부채 급증은 경제에 큰 부담을 주는 것이니, 그대가 신중하게 판단하시게. 과인의 조언을 참고하시면, 이런 시기에는 안전자산에 눈을 돌리는 것이 현명하리라.'\n"
            최대 2-3문장으로 간결하게 답변해주세요.
            """
            
            try:
                # LLM 호출
                llm = ChatOpenAI(
                    model_name="gpt-3.5-turbo",
                    temperature=0.3,  # 더 일관된 답변을 위해 낮춤
                    openai_api_key=os.getenv("OPENAI_API_KEY")
                )
                
                messages = [
                    SystemMessage(content="당신은 세종대왕의 말투를 사용하는 현명한 투자 조언자입니다. 뉴스 데이터를 바탕으로 키워드에 대한 심층 분석을 제공합니다."),
                    HumanMessage(content=context)
                ]
                
                response = llm(messages)
                answer = response.content
                
                print(f"LLM generated answer: {answer}")
                
            except Exception as llm_error:
                print(f"LLM call failed: {llm_error}")
                # LLM 실패 시 기본 응답
                news_titles = [news.title for news in related_news[:3]]
                news_summary = ", ".join(news_titles)
                answer = f"허허, {target_period}에는 {keyword}와 관련하여 {news_summary} 등의 소식이 있었구나. 이런 시장 상황을 잘 파악하고 투자에 활용하시게."
        else:
            # 관련 뉴스가 없는 경우 - 더 구체적인 안내
            answer = f"허허, {target_period}에는 {keyword}와 관련한 뉴스가 특별히 주목받지 못했구나. 하지만 이런 시기에는 다른 관점에서 시장을 바라보는 것이 중요하니, 다른 키워드나 섹터의 뉴스를 살펴보시는 것이 현명하리라."
        
        print(f"Generated analysis: {answer}")
        print(f"Response data structure: {type(answer)}, length: {len(answer) if answer else 0}")
        return {"analysis": answer}
        
    except Exception as e:
        print(f"Keyword analysis error: {e}")
        import traceback
        traceback.print_exc()
        # 에러 발생 시 기본 응답
        default_response = f"허허, {keyword_data.get('keyword', '이 키워드')}에 대한 정보를 찾기 어려우니, 그대가 직접 시장을 관찰하시는 것이 좋겠네."
        return {"analysis": default_response}

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
        
        # 해당 기간의 현재가 조회
        current_price = None
        if period_str and stock:
            # 해당 기간의 끝 가격 조회 (6개월 후)
            from datetime import datetime
            if period_str.endswith("H1"):
                year = int(period_str.split()[0])
                end_date = datetime(year, 6, 30).date()
            else:
                year = int(period_str.split()[0])
                end_date = datetime(year, 12, 31).date()
            
            print(f"Looking for price for stock {stock.symbol} on or before {end_date}")
            
            end_price_result = await db.execute(
                select(StockPrice.close_price)
                .where(StockPrice.stock_id == stock.id)
                .where(StockPrice.date <= end_date)
                .order_by(StockPrice.date.desc())
                .limit(1)
            )
            current_price = end_price_result.scalar_one_or_none()
            print(f"Found current price for {stock.symbol}: {current_price}")
            
            # 만약 해당 기간의 가격이 없으면, 가장 가까운 가격을 찾기
            if current_price is None:
                print(f"No price found for {stock.symbol} on or before {end_date}, looking for closest price")
                closest_price_result = await db.execute(
                    select(StockPrice.close_price)
                    .where(StockPrice.stock_id == stock.id)
                    .order_by(StockPrice.date.desc())
                    .limit(1)
                )
                current_price = closest_price_result.scalar_one_or_none()
                print(f"Found closest price for {stock.symbol}: {current_price}")
        else:
            print(f"No period_str ({period_str}) or stock ({stock}) for transaction {tx.id}")
        
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
            "current_price": current_price,  # 해당 기간의 현재가
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
    # 라운드가 넘어가기 전이면 이전 라운드 기준 period 사용 (단, 1라운드면 0)
    if hasattr(user, 'can_advance_round') and user.can_advance_round:
        period_idx = max(0, user.current_round_idx - 1)
        current_period = periods[period_idx]
    else:
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
    
    # 더미 뉴스 반환 (마지막 수단) - period에 맞는 날짜 생성
    if period:
        try:
            year, half = period.split()
            year = int(year)
            if half == "H1":
                # 상반기: 1월~6월
                base_date = datetime(year, 3, 15)  # 3월 15일 기준
            else:
                # 하반기: 7월~12월
                base_date = datetime(year, 9, 15)  # 9월 15일 기준
        except:
            base_date = datetime.now()
    else:
        base_date = datetime.now()
    
    return [
        {
            "title": f"{symbol} 실적 개선 전망",
            "date": (base_date - timedelta(days=30)).strftime("%Y-%m-%d"),
            "summary": "분석가들은 해당 종목의 실적이 개선될 것으로 전망하고 있습니다.",
            "sentiment": "positive"
        },
        {
            "title": f"{symbol} 신규 사업 진출 소식", 
            "date": (base_date - timedelta(days=15)).strftime("%Y-%m-%d"),
            "summary": "새로운 사업 영역 진출로 성장 동력 확보에 나섰습니다.",
            "sentiment": "positive"
        },
        {
            "title": f"{symbol} 시장 동향 분석",
            "date": base_date.strftime("%Y-%m-%d"),
            "summary": "업계 전문가들이 해당 종목의 향후 전망을 분석했습니다.",
            "sentiment": "neutral"
        }
    ]

# 종목별 가격 히스토리 API
@app.post("/api/analysis/trading-performance")
async def analyze_trading_performance(
    analysis_data: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """사용자의 거래 성과를 LLM으로 분석"""
    try:
        user_id = auth_service.verify_token(credentials.credentials)
        user = await db.execute(select(User).where(User.id == user_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        trading_history = analysis_data.get("tradingHistory", [])
        stock_performance = analysis_data.get("stockPerformance", [])
        period = analysis_data.get("period", "")
        market_average = analysis_data.get("marketAverage", 0)

        if not trading_history or not stock_performance:
            return {
                "summary": "거래 기록이 없어 분석할 수 없습니다.",
                "performance": "neutral",
                "recommendations": ["다양한 종목에 분산 투자해보세요", "차트 분석을 기반으로 매수 타이밍을 찾아보세요"]
            }

        # 거래한 종목들의 성과 분석
        traded_stocks = list(set([tx["stock_symbol"] for tx in trading_history]))
        traded_returns = []
        
        for symbol in traded_stocks:
            stock_data = next((s for s in stock_performance if s["symbol"] == symbol), None)
            if stock_data:
                traded_returns.append(stock_data["return"])

        if not traded_returns:
            return {
                "summary": "거래한 종목의 성과 데이터를 찾을 수 없습니다.",
                "performance": "neutral",
                "recommendations": ["더 많은 정보를 수집한 후 투자 결정을 내려보세요"]
            }

        average_traded_return = sum(traded_returns) / len(traded_returns)
        
        # 거래 기록 상세 분석
        buy_transactions = [tx for tx in trading_history if tx["transaction_type"] == "buy"]
        sell_transactions = [tx for tx in trading_history if tx["transaction_type"] == "sell"]
        
        # 종목별 상세 분석
        stock_analysis = []
        for symbol in traded_stocks:
            stock_data = next((s for s in stock_performance if s["symbol"] == symbol), None)
            if stock_data:
                stock_txs = [tx for tx in trading_history if tx["stock_symbol"] == symbol]
                buy_count = len([tx for tx in stock_txs if tx["transaction_type"] == "buy"])
                sell_count = len([tx for tx in stock_txs if tx["transaction_type"] == "sell"])
                
                stock_analysis.append({
                    "symbol": symbol,
                    "return": stock_data["return"],
                    "sector": stock_data.get("sector", "정보없음"),
                    "buy_count": buy_count,
                    "sell_count": sell_count
                })

        # 시장 상황 분석 (전체 종목의 섹터별 분포)
        sector_performance = {}
        for stock in stock_performance:
            sector = stock.get("sector", "기타")
            if sector not in sector_performance:
                sector_performance[sector] = []
            sector_performance[sector].append(stock["return"])
        
        sector_averages = {}
        for sector, returns in sector_performance.items():
            sector_averages[sector] = sum(returns) / len(returns)

        # 기간 표현 변환
        period_display = period
        if "H1" in period:
            period_display = period.replace("H1", "년 상반기")
        elif "H2" in period:
            period_display = period.replace("H2", "년 하반기")
        elif "Q1" in period:
            period_display = period.replace("Q1", "년 1분기")
        elif "Q2" in period:
            period_display = period.replace("Q2", "년 2분기")
        elif "Q3" in period:
            period_display = period.replace("Q3", "년 3분기")
        elif "Q4" in period:
            period_display = period.replace("Q4", "년 4분기")

        # LLM 분석 프롬프트 구성
        analysis_prompt = f"""
당신은 조선시대 세종대왕의 말투를 사용하는 전문 투자 분석가입니다. {period_display} 기간 동안의 사용자 주식 거래 성과를 시장 상황과 종목별 변화를 고려하여 상세히 분석해주세요.

=== 시장 상황 분석 ===
- 분석 기간: {period_display}
- 시장 전체 평균 수익률: {market_average:.1f}%
- 거래 기록: 총 {len(trading_history)}건 (매수: {len(buy_transactions)}건, 매도: {len(sell_transactions)}건)
- 거래한 종목 수: {len(traded_stocks)}개

=== 섹터별 시장 성과 ===
{chr(10).join([f"- {sector}: 평균 {avg:.1f}%" for sector, avg in sector_averages.items()])}

=== 사용자 거래 종목 상세 분석 ===
{chr(10).join([f"- {stock['symbol']} ({stock['sector']}): {stock['return']:.1f}% (매수: {stock['buy_count']}회, 매도: {stock['sell_count']}회)" for stock in stock_analysis])}

=== 사용자 성과 요약 ===
- 거래한 종목들의 평균 수익률: {average_traded_return:.1f}%
- 시장 대비 성과: {average_traded_return - market_average:+.1f}%p

분석 요구사항:
1. {period_display} 기간의 시장 상황을 섹터별로 분석하여 설명
2. 사용자가 선택한 종목들의 섹터 분포와 해당 섹터의 시장 성과 비교
3. 구체적인 수치를 포함한 성과 평가 (예: "시장 평균 5.2% 대비 8.7%로 3.5%p 높은 수익률")
4. 매수/매도 패턴 분석 및 타이밍 평가
5. 성과가 좋은 경우: 어떤 선택이 성공 요인이었는지 구체적 분석
6. 성과가 낮은 경우: 어떤 선택이 실수였는지와 구체적 개선 방안 제시

성과 등급 기준:
- 훌륭함: 시장 평균 대비 +5%p 이상
- 좋음: 시장 평균 대비 +0~5%p
- 보통: 시장 평균 대비 -5~0%p  
- 부족함: 시장 평균 대비 -5%p 이하

세종대왕 말투 예시:
- "허허, 그대의 투자 성과를 살펴보니..."
- "과인의 조언을 참고하시게"
- "그대가 신중하게 판단하시게"
- "이런 시기를 잘 활용하시게"
- "다음에는 더욱 신중하게 접근하시게"
- "~했노라", "~보였노라", "~판단되노라" 등의 조선시대 말투 사용

다음 JSON 형식으로 응답해주세요:
{{
    "summary": "세종대왕 말투로 시장 상황과 종목별 변화를 반영한 상세한 성과 분석 (한국어, 200자 이상)",
    "performance": "훌륭함|좋음|보통|부족함",
    "recommendations": ["세종대왕 말투의 구체적인 개선 방안 1", "세종대왕 말투의 구체적인 개선 방안 2", "세종대왕 말투의 구체적인 개선 방안 3"],
    "market_analysis": "{period_display} 기간의 시장 상황 분석 (세종대왕 말투, 100자 이상)",
    "trading_pattern_analysis": "매체/매도 패턴 분석 (세종대왕 말투, 100자 이상)"
}}

반드시 세종대왕의 말투를 사용하여 구체적인 수치와 섹터별 분석을 포함한 전문적이고 실용적인 분석을 제공해주세요.
"""

        # LLM 호출 (OpenAI API 키가 있는 경우)
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            try:
                llm = ChatOpenAI(
                    model_name="gpt-3.5-turbo",
                    temperature=0.7,
                    openai_api_key=openai_api_key
                )
                
                messages = [
                    SystemMessage(content="당신은 전문 투자 분석가입니다. 정확하고 실용적인 투자 조언을 제공해주세요."),
                    HumanMessage(content=analysis_prompt)
                ]
                
                response = llm(messages)
                result = json.loads(response.content)
                
                return {
                    "summary": result.get("summary", "분석을 완료했습니다."),
                    "performance": result.get("performance", "neutral"),
                    "recommendations": result.get("recommendations", ["분산 투자를 권장합니다."]),
                    "market_analysis": result.get("market_analysis", f"{period} 기간의 시장 상황을 분석했습니다."),
                    "trading_pattern_analysis": result.get("trading_pattern_analysis", "거래 패턴을 분석했습니다.")
                }
            except Exception as e:
                print(f"LLM 분석 실패: {e}")
                # LLM 실패 시 오프라인 분석으로 대체
                pass

        # 오프라인 분석 (LLM 실패 시 또는 API 키가 없는 경우)
        performance_diff = average_traded_return - market_average
        
        # 기간 표현 변환
        period_display = period
        if "H1" in period:
            period_display = period.replace("H1", "년 상반기")
        elif "H2" in period:
            period_display = period.replace("H2", "년 하반기")
        elif "Q1" in period:
            period_display = period.replace("Q1", "년 1분기")
        elif "Q2" in period:
            period_display = period.replace("Q2", "년 2분기")
        elif "Q3" in period:
            period_display = period.replace("Q3", "년 3분기")
        elif "Q4" in period:
            period_display = period.replace("Q4", "년 4분기")
        
        # 섹터별 분석
        traded_sectors = {}
        for stock in stock_analysis:
            sector = stock["sector"]
            if sector not in traded_sectors:
                traded_sectors[sector] = []
            traded_sectors[sector].append(stock["return"])
        
        sector_analysis = []
        for sector, returns in traded_sectors.items():
            sector_avg = sum(returns) / len(returns)
            market_sector_avg = sector_averages.get(sector, market_average)
            sector_analysis.append(f"{sector} 섹터: 평균 {sector_avg:.1f}% (시장 섹터 평균: {market_sector_avg:.1f}%)")
        
        # 거래 패턴 분석
        total_buys = len(buy_transactions)
        total_sells = len(sell_transactions)
        trading_pattern = f"매수 {total_buys}회, 매도 {total_sells}회로 "
        if total_buys > total_sells * 2:
            trading_pattern += "적극적인 매수 전략을 구사했노라."
        elif total_sells > total_buys:
            trading_pattern += "수익 실현에 집중한 전략을 보였노라."
        else:
            trading_pattern += "균형잡힌 매매 전략을 보였노라."

        if performance_diff > 5:
            performance = "훌륭함"
            summary = f"허허, 그대의 투자 성과를 살펴보니 훌륭하구나! 시장 평균 수익률 {market_average:.1f}% 대비 {average_traded_return:.1f}%로 {performance_diff:+.1f}%p 높은 수익률을 달성했노라. 특히 {', '.join(sector_analysis[:2])}에서 우수한 성과를 보였으니, 과인의 조언을 참고하시게."
            recommendations = [
                f"현재 투자 전략을 유지하되, {performance_diff:.1f}%p의 성과 차이를 유지하기 위한 리스크 관리에 주의하시게",
                "성공적인 섹터 선택 패턴을 다음 라운드에도 적용해보시게",
                "수익 실현 타이밍을 더욱 정교하게 조절하여 최대 수익을 추구하시게"
            ]
        elif performance_diff > 0:
            performance = "좋음"
            summary = f"좋은 투자 성과를 보였노라. 시장 평균 수익률 {market_average:.1f}% 대비 {average_traded_return:.1f}%로 {performance_diff:+.1f}%p 높은 수익률을 달성했노라. {trading_pattern} 그대가 신중하게 판단하시게."
            recommendations = [
                f"현재 투자 방향을 유지하되, {performance_diff:.1f}%p의 성과 차이를 더욱 확대하기 위한 분석을 강화하시게",
                "분산 투자를 통해 리스크를 줄이면서 수익률을 더욱 향상시켜보시게",
                "매수 타이밍을 더 정교하게 분석하여 성과를 개선해보시게"
            ]
        elif performance_diff > -5:
            performance = "보통"
            summary = f"보통 수준의 투자 성과를 보였노라. 시장 평균 수익률 {market_average:.1f}% 대비 {average_traded_return:.1f}%로 {performance_diff:+.1f}%p의 차이를 보였노라. {trading_pattern} 다음에는 더욱 신중하게 접근하시게."
            recommendations = [
                f"시장 평균과 {abs(performance_diff):.1f}%p 차이를 좁히기 위해 더 체계적인 분석을 통해 투자 결정을 내려보시게",
                "차트와 뉴스를 종합적으로 분석하여 매수 타이밍을 개선해보시게",
                "리스크 관리에 더 많은 주의를 기울여 안정적인 수익을 추구하시게"
            ]
        else:
            performance = "부족함"
            summary = f"개선이 필요한 투자 성과를 보였노라. 시장 평균 수익률 {market_average:.1f}% 대비 {average_traded_return:.1f}%로 {performance_diff:+.1f}%p 낮은 수익률을 보였노라. {trading_pattern} 이런 시기를 잘 활용하시게."
            recommendations = [
                f"시장 평균과 {abs(performance_diff):.1f}%p 차이를 좁히기 위해 투자 전략을 재검토해보시게",
                "더 많은 정보를 수집하고 섹터별 분석을 강화한 후 투자 결정을 내려보시게",
                "손절매 기준을 명확히 설정하여 손실을 최소화하시게"
            ]

        return {
            "summary": summary,
            "performance": performance,
            "recommendations": recommendations,
            "market_analysis": f"{period_display} 기간 동안 시장 전체 평균 수익률은 {market_average:.1f}%였으며, 섹터별로는 {', '.join([f'{sector} {avg:.1f}%' for sector, avg in list(sector_averages.items())[:3]])} 등의 성과를 보였노라.",
            "trading_pattern_analysis": trading_pattern
        }

    except Exception as e:
        print(f"분석 오류: {e}")
        raise HTTPException(status_code=500, detail="분석 중 오류가 발생했습니다.")

@app.post("/api/analysis/individual-stock")
async def analyze_individual_stock(
    analysis_data: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """개별 종목의 상세 분석을 LLM으로 수행"""
    try:
        user_id = auth_service.verify_token(credentials.credentials)
        user = await db.execute(select(User).where(User.id == user_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        stock_name = analysis_data.get("stockName", "")
        stock_symbol = analysis_data.get("stockSymbol", "")
        period = analysis_data.get("period", "")
        news = analysis_data.get("news", [])
        price_history = analysis_data.get("priceHistory", [])
        sector = analysis_data.get("sector", "정보없음")

        if not stock_name or not period:
            return {
                "summary": "종목 정보가 부족하여 분석할 수 없습니다.",
                "performance": "neutral",
                "recommendations": ["더 많은 정보를 수집하여 분석해보세요"]
            }

        # 가격 데이터 분석
        price_analysis = ""
        price_change_percent = 0
        volatility = "보통"
        price_trend = "보합"
        
        if price_history and len(price_history) > 1:
            # 해당 기간의 데이터만 필터링
            period_prices = []
            if period:
                year, half = period.split(" ")
                current_year = int(year)
                is_first_half = half == "H1"
                
                # 해당 기간의 시작/끝 날짜 계산
                start_month = 1 if is_first_half else 7
                end_month = 6 if is_first_half else 12
                
                start_date = f"{current_year}-{start_month:02d}-01"
                end_date = f"{current_year}-{end_month:02d}-31"
                
                # 해당 기간의 데이터만 필터링
                for price_data in price_history:
                    item_date = price_data.get("date", "")
                    if start_date <= item_date <= end_date:
                        period_prices.append(price_data)
            
            # 필터링된 데이터가 없으면 전체 데이터 사용
            if not period_prices:
                period_prices = price_history
            
            if len(period_prices) > 1:
                prices = [p.get("price", 0) for p in period_prices]
                start_price = prices[0]
                end_price = prices[-1]
                
                if start_price > 0:
                    price_change_percent = ((end_price - start_price) / start_price) * 100
                    
                    # 변동성 계산
                    price_changes = []
                    for i in range(1, len(prices)):
                        if prices[i-1] > 0:
                            change = abs((prices[i] - prices[i-1]) / prices[i-1]) * 100
                            price_changes.append(change)
                    
                    if price_changes:
                        avg_volatility = sum(price_changes) / len(price_changes)
                        if avg_volatility > 5:
                            volatility = "높음"
                        elif avg_volatility < 2:
                            volatility = "낮음"
                    
                    if price_change_percent > 10:
                        price_trend = "상승"
                    elif price_change_percent < -10:
                        price_trend = "하락"
                    
                    price_analysis = f"{period} 동안 {stock_name}의 주가는 {start_price:,.0f}원에서 {end_price:,.0f}원으로 {price_change_percent:+.1f}% 변화하였습니다."

        # 뉴스 분석
        news_analysis = ""
        news_sentiment = "중립"
        positive_news = 0
        negative_news = 0
        neutral_news = 0
        
        if news:
            positive_news = len([n for n in news if n.get("sentiment") == "positive"])
            negative_news = len([n for n in news if n.get("sentiment") == "negative"])
            neutral_news = len([n for n in news if n.get("sentiment") == "neutral"])
            
            if positive_news > negative_news:
                news_sentiment = "긍정적"
            elif negative_news > positive_news:
                news_sentiment = "부정적"
            
            total_news = len(news)
            news_analysis = f"뉴스 분석 결과, 총 {total_news}건의 뉴스 중 긍정적 {positive_news}건, 부정적 {negative_news}건, 중립적 {neutral_news}건이었습니다."

        # 기간 표현 변환
        period_display = period
        if "H1" in period:
            period_display = period.replace("H1", "년 상반기")
        elif "H2" in period:
            period_display = period.replace("H2", "년 하반기")

        # LLM 분석 프롬프트 구성
        analysis_prompt = f"""
당신은 조선시대 세종대왕의 말투를 사용하는 전문 투자 분석가입니다. {stock_name}({stock_symbol}) 종목의 {period_display} 기간 상세 분석을 수행해주세요.

=== 종목 기본 정보 ===
- 종목명: {stock_name} ({stock_symbol})
- 섹터: {sector}
- 분석 기간: {period_display}

=== 가격 분석 ===
{price_analysis}
- 변동성: {volatility}
- 가격 추세: {price_trend}

=== 뉴스 분석 ===
{news_analysis}
- 뉴스 감정: {news_sentiment}

분석 요구사항:
1. {period_display} 기간 동안의 종목 성과를 구체적인 수치로 평가
2. 가격 변동 패턴과 뉴스 영향력 분석
3. 해당 섹터의 시장 상황과 비교 분석
4. 향후 투자 전략에 대한 구체적 조언
5. 리스크 요인과 기회 요인 분석

성과 등급 기준:
- excellent: +15% 이상의 수익률 또는 매우 긍정적인 뉴스
- good: +5~15% 수익률 또는 긍정적인 뉴스
- neutral: -5~+5% 수익률 또는 중립적 뉴스
- poor: -5% 이하 수익률 또는 부정적인 뉴스

세종대왕 말투 예시:
- "과인이 보기에 {stock_name}은(는)..."
- "그대가 신중하게 판단하시게"
- "이런 시기를 잘 활용하시게"
- "다음에는 더욱 신중하게 접근하시게"
- "~했노라", "~보였노라", "~판단되노라" 등의 조선시대 말투 사용

다음 JSON 형식으로 응답해주세요:
{{
    "summary": "세종대왕 말투로 종목의 상세한 성과 분석 (한국어, 200자 이상)",
    "performance": "excellent|good|neutral|poor",
    "recommendations": ["세종대왕 말투의 구체적인 투자 조언 1", "세종대왕 말투의 구체적인 투자 조언 2", "세종대왕 말투의 구체적인 투자 조언 3"]
}}

반드시 세종대왕의 말투를 사용하여 구체적인 수치와 분석을 포함한 전문적이고 실용적인 분석을 제공해주세요.
"""

        # LLM 호출 (OpenAI API 키가 있는 경우)
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            try:
                llm = ChatOpenAI(
                    model_name="gpt-3.5-turbo",
                    temperature=0.7,
                    openai_api_key=openai_api_key
                )
                
                messages = [
                    SystemMessage(content="당신은 전문 투자 분석가입니다. 정확하고 실용적인 투자 조언을 제공해주세요."),
                    HumanMessage(content=analysis_prompt)
                ]
                
                response = llm(messages)
                result = json.loads(response.content)
                
                return {
                    "summary": result.get("summary", "분석을 완료했습니다."),
                    "performance": result.get("performance", "neutral"),
                    "recommendations": result.get("recommendations", ["분산 투자를 권장합니다."])
                }
            except Exception as e:
                print(f"LLM 분석 실패: {e}")
                # LLM 실패 시 오프라인 분석으로 대체
                pass

        # 오프라인 분석 (LLM 실패 시 또는 API 키가 없는 경우)
        if price_change_percent > 15 and news_sentiment == "긍정적":
            performance = "excellent"
            summary = f"과인이 보기에 {stock_name}은(는) 매우 훌륭한 성과를 보였나이다! {price_analysis} {news_analysis} 이는 매우 긍정적인 신호라 하겠나이다."
            recommendations = [
                "현재의 상승세가 지속될 것으로 예상되니, 적절한 수익 실현을 고려하시게",
                "긍정적인 뉴스 흐름이 계속되니 관심을 기울이시게",
                "하지만 과도한 낙관은 금물이니, 신중한 판단을 유지하시게"
            ]
        elif price_change_percent > 5 or news_sentiment == "긍정적":
            performance = "good"
            summary = f"{stock_name}은(는) 양호한 성과를 보였네. {price_analysis} {news_analysis} 전반적으로 긍정적인 방향으로 진행되고 있다네."
            recommendations = [
                "현재 방향을 유지하되, 더욱 신중한 관찰이 필요하니라",
                "추가 정보를 수집하여 투자 판단을 보완하시게",
                "리스크 관리에 특별히 주의를 기울이시게"
            ]
        elif price_change_percent < -15 and news_sentiment == "부정적":
            performance = "poor"
            summary = f"{stock_name}은(는) 개선이 필요한 상황이니라. {price_analysis} {news_analysis} 투자 전략의 재검토가 시급하다네."
            recommendations = [
                "현재 투자 전략을 전면적으로 재검토하시게",
                "손절매 기준을 명확히 설정하여 손실을 최소화하시게",
                "더 많은 분석과 정보 수집이 필요하니라"
            ]
        else:
            performance = "neutral"
            summary = f"{stock_name}은(는) 보통의 성과를 보였네. {price_analysis} {news_analysis} 신중한 관찰이 필요하니라."
            recommendations = [
                "현재 상황을 지켜보되, 추가 정보 수집에 노력하시게",
                "분산 투자를 통해 리스크를 관리하시게",
                "장기적 관점에서 투자 가치를 재평가하시게"
            ]

        return {
            "summary": summary,
            "performance": performance,
            "recommendations": recommendations
        }

    except Exception as e:
        print(f"개별 종목 분석 오류: {e}")
        raise HTTPException(status_code=500, detail="분석 중 오류가 발생했습니다.")
# 재무제표 관련 엔드포인트
@app.get("/api/financial/period/{period}")
async def get_financial_data_by_period(
    period: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """특정 기간의 재무제표 데이터 조회"""
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 3라운드에만 재무제표 데이터 제공
    if user.current_round_idx != 2:  # 0-based index이므로 2가 3라운드
        return {
            "message": "재무제표 데이터는 3라운드에서만 제공됩니다.",
            "data": []
        }
    
    financial_data = await financial_service.get_financial_data_by_period(db, period)
    return {
        "period": period,
        "data": financial_data
    }

@app.get("/api/financial/stock/{symbol}")
async def get_financial_data_by_stock(
    symbol: str,
    period: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """특정 종목의 재무제표 데이터 조회"""
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 기간이 없으면 사용자의 현재 기간 사용
    if not period:
        periods = json.loads(user.round_periods)
        if user.current_round_idx >= len(periods):
            period = periods[-1]
        else:
            period = periods[user.current_round_idx]
    
    # 3라운드에만 재무제표 데이터 제공
    if user.current_round_idx != 2:  # 0-based index이므로 2가 3라운드
        return {
            "message": "재무제표 데이터는 3라운드에서만 제공됩니다.",
            "data": None
        }
    
    financial_data = await financial_service.get_financial_data_by_stock(db, symbol, period)
    return {
        "symbol": symbol,
        "period": period,
        "data": financial_data
    }

@app.get("/api/financial/summary/{period}")
async def get_financial_summary(
    period: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """특정 기간의 재무제표 요약 정보 조회"""
    user_id = auth_service.verify_token(credentials.credentials)
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 3라운드에만 재무제표 데이터 제공
    if user.current_round_idx != 2:  # 0-based index이므로 2가 3라운드
        return {
            "message": "재무제표 데이터는 3라운드에서만 제공됩니다.",
            "summary": {}
        }
    
    summary = await financial_service.get_financial_summary_by_period(db, period)
    return {
        "period": period,
        "summary": summary
    }

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