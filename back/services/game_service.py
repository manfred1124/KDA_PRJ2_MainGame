from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, timedelta
from models import User, Stock, Portfolio, News, Transaction
from schemas import GameState, RankingItem
from .stock_service import StockService
from .news_service import NewsService
from fastapi import HTTPException
from models import StockPrice
import json
from services.period_utils import period_to_date
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import pandas as pd
import numpy as np

stock_service = StockService()
news_service = NewsService()

class GameService:
    def get_round_date(self, round_number: int) -> str:
        """라운드 번호에 따른 날짜 반환"""
        # 2020년 1월부터 시작, 반기별 진행
        start_date = datetime(2020, 1, 1)
        months_to_add = (round_number - 1) * 6
        current_date = start_date + timedelta(days=months_to_add * 30)
        return current_date.strftime("%Y년 %m월")
    
    async def get_game_state(self, db: AsyncSession, user_id: int) -> GameState:
        """게임 상태 조회"""
        # 사용자 조회
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise Exception("User not found")
        
        # 포트폴리오 가치 계산
        portfolio_result = await db.execute(
            select(Portfolio).where(Portfolio.user_id == user.id)
        )
        portfolio_items = portfolio_result.scalars().all()
        
        total_portfolio_value = 0
        total_investment = 0
        
        for item in portfolio_items:
            if item.quantity > 0:
                stock_result = await db.execute(
                    select(Stock).where(Stock.id == item.stock_id)
                )
                stock = stock_result.scalar_one_or_none()
                if stock:
                    # 최신 가격 조회
                    price_result = await db.execute(
                        select(StockPrice.close_price)
                        .where(StockPrice.stock_id == stock.id)
                        .order_by(StockPrice.date.desc())
                        .limit(1)
                    )
                    current_price = price_result.scalar_one_or_none() or 0
                    total_portfolio_value += item.quantity * current_price
                    total_investment += item.quantity * item.average_price
        
        total_profit_loss = total_portfolio_value - total_investment
        total_profit_loss_percentage = (total_profit_loss / total_investment) * 100 if total_investment > 0 else 0
        
        # 총 수익 (미실현 + 실현)
        total_profit = total_profit_loss + user.realized_profit
        total_profit_percentage = (total_profit / (total_investment + user.realized_profit)) * 100 if (total_investment + user.realized_profit) > 0 else 0
        
        return GameState(
            current_round=user.current_round_idx + 1,
            total_rounds=10,
            current_date=self.get_round_date(user.current_round_idx + 1),
            total_balance=user.total_balance,
            total_portfolio_value=total_portfolio_value,
            total_profit_loss=total_profit_loss,
            total_profit_loss_percentage=total_profit_loss_percentage,
            realized_profit=user.realized_profit,
            total_profit=total_profit,
            total_profit_percentage=total_profit_percentage,
            can_advance_round=(user.current_round_idx + 1) < 10,
            is_game_completed=(user.current_round_idx + 1) >= 10
        )
    
    async def advance_round(self, db: AsyncSession, user_id: int, current_period: str):
        user = await db.execute(select(User).where(User.id == user_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        import json
        periods = json.loads(user.round_periods)
        if user.current_round_idx >= len(periods) - 1:
            raise HTTPException(status_code=400, detail="이미 마지막 라운드입니다.")
        user.current_round_idx += 1
        new_period = periods[user.current_round_idx]
        # 새로운 뉴스 생성 등 필요한 로직에서 new_period 사용
        
        await db.commit()
        return {
            "message": f"라운드 {user.current_round_idx + 1}로 진행되었습니다.",
            "new_round_idx": user.current_round_idx,
            "current_period": new_period
        }
    
    
    
    async def restart_game(self, db: AsyncSession, user_id: int):
        """게임 재시작"""
        # 사용자 조회
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise Exception("User not found")
        
        # 포트폴리오 초기화
        portfolio_result = await db.execute(
            select(Portfolio).where(Portfolio.user_id == user.id)
        )
        portfolio_items = portfolio_result.scalars().all()
        for item in portfolio_items:
            await db.delete(item)
        
        # 트랜잭션(매매 기록)도 모두 삭제
        transaction_result = await db.execute(
            select(Transaction).where(Transaction.user_id == user.id)
        )
        transactions = transaction_result.scalars().all()
        for tx in transactions:
            await db.delete(tx)
        
        # 사용자 정보 초기화
        user.current_round_idx = 0  # 라운드 인덱스 초기화
        import json
        years = [2020, 2021, 2022, 2023, 2024]
        halfs = ["H1", "H2"]
        all_periods = [f"{y} {h}" for y in years for h in halfs]
        user.round_periods = json.dumps(all_periods)  # 순서대로 10개
        user.total_balance = 10000000  # 1천만원으로 초기화
        user.realized_profit = 0  # 실현 수익 초기화
        
        # 모든 주식에 대해 초기 포트폴리오 생성 (수량 0)
        stock_result = await db.execute(select(Stock))
        for stock in stock_result.scalars().all():
            portfolio = Portfolio(user_id=user.id, stock_id=stock.id, quantity=0, average_price=0)
            db.add(portfolio)
        
        # 주식 가격을 1라운드로 초기화
        await stock_service.reset_stock_prices(db)
        
        await db.commit()
        
        return {
            "message": "Game restarted successfully",
            "new_round": user.current_round_idx + 1,
            "current_date": self.get_round_date(user.current_round_idx + 1)
        }
    
    async def get_ranking(self, db: AsyncSession) -> List[RankingItem]:
        """사용자 랭킹 조회"""
        # 모든 사용자 조회
        users_result = await db.execute(select(User))
        users = users_result.scalars().all()
        
        rankings = []
        
        for user in users:
            # 포트폴리오 가치 계산
            portfolio_result = await db.execute(
                select(Portfolio).where(Portfolio.user_id == user.id)
            )
            portfolio_items = portfolio_result.scalars().all()
            
            total_portfolio_value = 0
            total_investment = 0
            
            for item in portfolio_items:
                if item.quantity > 0:
                    stock_result = await db.execute(
                        select(Stock).where(Stock.id == item.stock_id)
                    )
                    stock = stock_result.scalar_one_or_none()
                    if stock:
                        # 동일하게 get_ranking 내에서도 각 stock.current_price 대신 위와 같이 최신 가격을 조회해서 사용
                        price_result = await db.execute(
                            select(StockPrice.close_price)
                            .where(StockPrice.stock_id == stock.id)
                            .order_by(StockPrice.date.desc())
                            .limit(1)
                        )
                        current_price = price_result.scalar_one_or_none() or 0
                        total_portfolio_value += item.quantity * current_price
                        total_investment += item.quantity * item.average_price
            
            total_profit_loss = total_portfolio_value - total_investment
            total_profit_loss_percentage = (total_profit_loss / total_investment) * 100 if total_investment > 0 else 0
            
            # 총 수익 (미실현 + 실현)
            total_profit = total_profit_loss + user.realized_profit
            total_profit_percentage = (total_profit / (total_investment + user.realized_profit)) * 100 if (total_investment + user.realized_profit) > 0 else 0
            
            rankings.append({
                "username": user.username,
                "total_profit_loss_percentage": total_profit_percentage,
                "total_portfolio_value": total_portfolio_value + user.total_balance
            })
        
        # 수익률 기준으로 정렬
        rankings.sort(key=lambda x: x["total_profit_loss_percentage"], reverse=True)
        
        # 랭킹 추가
        for i, ranking in enumerate(rankings):
            ranking["rank"] = i + 1
        
        return [RankingItem(**ranking) for ranking in rankings] 

    async def generate_round_review(self, db: AsyncSession, user_id: int, period: str) -> dict:
        """해당 라운드의 종합 리뷰 생성"""
        try:
            # 1. 데이터 수집
            # 1.1 매크로 뉴스
            macro_news = await news_service.get_macro_news(db, period)
            
            # 1.2 모든 섹터 뉴스
            sectors = await stock_service.get_all_sectors(db)
            sector_news = {}
            for sector in sectors:
                sector_news[sector] = await news_service.get_sector_trend_news(db, sector, period)
            
            # 1.3 모든 종목 뉴스와 가격 데이터
            stocks = await stock_service.get_all_stocks(db)
            stock_data = {}
            date = period_to_date(period)
            
            for stock in stocks:
                # 종목 뉴스
                stock_news = await news_service.get_news_by_stock(db, stock_name=stock.name, period=period)
                
                # 가격 데이터
                price_result = await db.execute(
                    select(StockPrice)
                    .where(StockPrice.stock_id == stock.id)
                    .where(StockPrice.date >= date)
                    .order_by(StockPrice.date.asc())
                    .limit(1)
                )
                price = price_result.scalar_one_or_none()
                
                # 이전 기간 가격 (변화율 계산용)
                prev_date = date - timedelta(days=180)  # 6개월 전
                prev_price_result = await db.execute(
                    select(StockPrice)
                    .where(StockPrice.stock_id == stock.id)
                    .where(StockPrice.date >= prev_date)
                    .order_by(StockPrice.date.asc())
                    .limit(1)
                )
                prev_price = prev_price_result.scalar_one_or_none()
                
                price_change = 0
                if price and prev_price:
                    price_change = ((price.close_price - prev_price.close_price) / prev_price.close_price) * 100
                
                stock_data[stock.name] = {
                    "news": stock_news,
                    "current_price": price.close_price if price else 0,
                    "price_change": price_change,
                    "sector": stock.sector
                }
            
            # 2. LLM을 통한 리뷰 생성
            llm = ChatOpenAI(temperature=0.7)
            
            # 2.1 매크로 리뷰
            macro_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a financial market analyst specializing in comprehensive market analysis.
                Write a detailed market review in Korean based on the given macro news.
                Focus on key market trends, economic indicators, and their implications.
                Use a professional yet accessible tone."""),
                ("user", f"Macro News: {[news.dict() for news in macro_news]}")
            ])
            macro_review = await llm.apredict(macro_prompt)
            
            # 2.2 섹터별 리뷰
            sector_reviews = {}
            for sector, news in sector_news.items():
                sector_stocks = [
                    stock_info for stock_name, stock_info in stock_data.items()
                    if stock_info["sector"] == sector
                ]
                
                sector_prompt = ChatPromptTemplate.from_messages([
                    ("system", """You are a sector analyst providing detailed sector analysis in Korean.
                    Analyze the sector's performance based on news and stock price movements.
                    Consider both sector-wide trends and individual stock performances.
                    Use professional financial language while maintaining clarity."""),
                    ("user", f"Sector: {sector}\nNews: {[n.dict() for n in news]}\nStocks: {sector_stocks}")
                ])
                sector_reviews[sector] = await llm.apredict(sector_prompt)
            
            # 2.3 주목할 만한 종목 리뷰
            notable_stocks = []
            for stock_name, data in stock_data.items():
                if abs(data["price_change"]) > 10 or len(data["news"]) > 2:  # 큰 가격 변동이나 많은 뉴스가 있는 종목
                    notable_stocks.append({
                        "name": stock_name,
                        **data
                    })
            
            stocks_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a stock analyst providing detailed analysis of notable stocks in Korean.
                Focus on significant price movements and news impacts.
                Explain potential reasons for stock performance and future implications.
                Use professional yet clear language."""),
                ("user", f"Notable Stocks: {notable_stocks}")
            ])
            stocks_review = await llm.apredict(stocks_prompt)
            
            # 3. 종합 리뷰 생성
            final_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a chief market strategist creating a comprehensive market review in Korean.
                Synthesize macro trends, sector movements, and individual stock performances.
                Provide insights about market dynamics and potential future implications.
                Use a professional tone while ensuring accessibility."""),
                ("user", f"""
                Period: {period}
                Macro Review: {macro_review}
                Sector Reviews: {sector_reviews}
                Notable Stocks: {stocks_review}
                """)
            ])
            final_review = await llm.apredict(final_prompt)
            
            return {
                "period": period,
                "macro_review": macro_review,
                "sector_reviews": sector_reviews,
                "stocks_review": stocks_review,
                "final_review": final_review
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate round review: {str(e)}") 