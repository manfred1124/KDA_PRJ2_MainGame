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
        # await news_service.generate_round_news(db, user.current_round_idx) 등
        await db.commit()
        return {
            "message": f"라운드 {user.current_round_idx + 1}로 진행되었습니다.",
            "new_round_idx": user.current_round_idx,
            "current_period": new_period
        }
    
    async def apply_news_impact_to_stocks(self, db: AsyncSession, round_number: int):
        """뉴스 영향으로 주식 가격 변동 적용 (비활성화됨)"""
        # 구조 변경으로 인해 영향 적용 로직은 비활성화
        pass
    
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