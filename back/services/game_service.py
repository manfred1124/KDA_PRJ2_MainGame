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
import random

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
            total_rounds=3,
            current_date=self.get_round_date(user.current_round_idx + 1),
            total_balance=user.total_balance,
            total_investment=total_investment,
            total_profit_loss=total_profit_loss,
            total_profit_loss_percentage=total_profit_loss_percentage,
            total_profit=total_profit,
            total_profit_percentage=total_profit_percentage,
            can_advance_round=(user.current_round_idx + 1) <= 3,
            is_game_completed=(user.current_round_idx + 1) > 3
        )
    
    async def advance_round(self, db: AsyncSession, user_id: int, current_period: str):
        """라운드를 진행"""
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # 3라운드 제한 체크 - 3라운드 완료 후에만 제한
        if user.current_round_idx >= 3:  # 0, 1, 2가 3라운드이므로 3이 되면 게임 완료
            raise HTTPException(status_code=400, detail="이미 마지막 라운드입니다.")
        
        import json
        periods = json.loads(user.round_periods)
        
        # 기존 사용자가 10개 기간을 가지고 있을 경우 3개로 제한
        if len(periods) > 3:
            periods = periods[:3]
            user.round_periods = json.dumps(periods)
        
        user.current_round_idx += 1
        new_period = periods[user.current_round_idx] if user.current_round_idx < len(periods) else periods[0]
        
        await db.commit()
        return {
            "message": f"라운드 {user.current_round_idx + 1}로 진행되었습니다.",
            "new_round_idx": user.current_round_idx,
            "current_period": new_period
        }
    
    def get_all_periods(self):
        """모든 가능한 기간을 반환"""
        years = [2020, 2021, 2022, 2023, 2024]
        halfs = ["H1", "H2"]
        return [f"{y} {h}" for y in years for h in halfs]
        
    async def restart_game(self, db: AsyncSession, user_id: int):
        """게임을 재시작"""
        try:
            print(f"게임 재시작 시작: user_id={user_id}")
            
            user = await db.execute(select(User).where(User.id == user_id))
            user = user.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            print(f"사용자 찾음: {user.username}")
            
            # 기존 포트폴리오 삭제
            print("기존 포트폴리오 삭제 중...")
            portfolio_result = await db.execute(
                select(Portfolio).where(Portfolio.user_id == user_id)
            )
            portfolio_items = portfolio_result.scalars().all()
            print(f"삭제할 포트폴리오 항목 수: {len(portfolio_items)}")
            
            for item in portfolio_items:
                await db.delete(item)
            
            # 기존 거래 기록 삭제
            print("기존 거래 기록 삭제 중...")
            transaction_result = await db.execute(
                select(Transaction).where(Transaction.user_id == user_id)
            )
            transactions = transaction_result.scalars().all()
            print(f"삭제할 거래 기록 수: {len(transactions)}")
            
            for tx in transactions:
                await db.delete(tx)
            
            # 사용자 정보 초기화
            print("사용자 정보 초기화 중...")
            user.current_round_idx = 0  # 라운드 인덱스 초기화
            all_periods = self.get_all_periods()
            print(f"전체 기간 수: {len(all_periods)}")
            
            random.shuffle(all_periods)
            selected_periods = all_periods[:3]
            print(f"선택된 기간: {selected_periods}")
            
            user.round_periods = json.dumps(selected_periods)  # 3개 기간으로 제한
            user.total_balance = 10000000  # 1천만원으로 초기화
            user.realized_profit = 0  # 실현 수익 초기화
            
            print("데이터베이스 커밋 중...")
            await db.commit()
            print("게임 재시작 완료")
            
            return {
                "message": "Game restarted successfully",
                "new_round_idx": user.current_round_idx,
                "current_period": selected_periods[0] if selected_periods else "2020 H1"
            }
            
        except Exception as e:
            print(f"게임 재시작 중 에러 발생: {e}")
            print(f"에러 타입: {type(e)}")
            import traceback
            print(f"스택 트레이스: {traceback.format_exc()}")
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"게임 재시작 실패: {str(e)}")
    
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