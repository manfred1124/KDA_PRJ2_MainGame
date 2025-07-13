from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, timedelta
from models import User, Stock, Portfolio, News
from schemas import GameState, RankingItem
from .stock_service import StockService
from .news_service import NewsService

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
                    total_portfolio_value += item.quantity * stock.current_price
                    total_investment += item.quantity * item.average_price
        
        total_profit_loss = total_portfolio_value - total_investment
        total_profit_loss_percentage = (total_profit_loss / total_investment) * 100 if total_investment > 0 else 0
        
        # 총 수익 (미실현 + 실현)
        total_profit = total_profit_loss + user.realized_profit
        total_profit_percentage = (total_profit / (total_investment + user.realized_profit)) * 100 if (total_investment + user.realized_profit) > 0 else 0
        
        return GameState(
            current_round=user.current_round,
            total_rounds=10,
            current_date=self.get_round_date(user.current_round),
            total_balance=user.total_balance,
            total_portfolio_value=total_portfolio_value,
            total_profit_loss=total_profit_loss,
            total_profit_loss_percentage=total_profit_loss_percentage,
            realized_profit=user.realized_profit,
            total_profit=total_profit,
            total_profit_percentage=total_profit_percentage,
            can_advance_round=user.current_round < 10,
            is_game_completed=user.current_round >= 10
        )
    
    async def advance_round(self, db: AsyncSession, user_id: int):
        """다음 라운드로 진행"""
        # 사용자 조회
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise Exception("User not found")
        
        if user.current_round >= 10:
            raise Exception("Game already completed")
        
        # 다음 라운드로 진행
        user.current_round += 1
        
        # 주식 가격 업데이트
        await stock_service.update_stock_prices(db, user.current_round)
        
        # 뉴스 영향 적용
        news_result = await db.execute(
            select(News).where(News.round_number == user.current_round)
        )
        current_news = news_result.scalars().all()
        
        for news in current_news:
            if news.affected_sectors:
                stock_result = await db.execute(select(Stock))
                stocks = stock_result.scalars().all()
                
                for stock in stocks:
                    stock_service.apply_news_impact(
                        stock, news.impact_type, news.affected_sectors
                    )
        
        await db.commit()
        
        return {
            "message": f"Advanced to round {user.current_round}",
            "new_round": user.current_round,
            "current_date": self.get_round_date(user.current_round)
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
        
        # 사용자 정보 초기화
        user.current_round = 1
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
            "new_round": user.current_round,
            "current_date": self.get_round_date(user.current_round)
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
                        total_portfolio_value += item.quantity * stock.current_price
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