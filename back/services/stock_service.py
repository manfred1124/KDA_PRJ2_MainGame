from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import json
import random
from datetime import datetime

from models import Stock
from schemas import StockResponse
from fastapi import HTTPException, status

class StockService:
    async def get_all_stocks(self, db: AsyncSession) -> List[StockResponse]:
        """모든 주식 조회"""
        result = await db.execute(select(Stock))
        stocks = result.scalars().all()
        return [StockResponse.from_orm(stock) for stock in stocks]
    
    async def get_stock_by_id(self, db: AsyncSession, stock_id: int) -> StockResponse:
        """ID로 주식 조회"""
        result = await db.execute(select(Stock).where(Stock.id == stock_id))
        stock = result.scalar_one_or_none()
        if not stock:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stock not found"
            )
        return StockResponse.from_orm(stock)
    
    async def update_stock_prices(self, db: AsyncSession, round_number: int):
        """라운드별 주식 가격 업데이트"""
        result = await db.execute(select(Stock))
        stocks = result.scalars().all()
        
        for stock in stocks:
            # 가격 변동률 (-20% ~ +30%)
            change_rate = random.uniform(-0.2, 0.3)
            new_price = stock.current_price * (1 + change_rate)
            
            # 최소 가격 보장 (100원)
            new_price = max(new_price, 100)
            
            # 가격 이력 업데이트
            price_history = []
            if stock.price_history:
                price_history = json.loads(stock.price_history)
            
            price_history.append({
                "round": round_number,
                "price": new_price,
                "timestamp": datetime.now().isoformat()
            })
            
            # 최근 10개만 유지
            if len(price_history) > 10:
                price_history = price_history[-10:]
            
            stock.current_price = new_price
            stock.price_history = json.dumps(price_history)
        
        await db.commit()
    
    async def insert_initial_stocks(self, db: AsyncSession):
        """초기 주식 데이터 삽입"""
        # 기존 데이터 확인
        result = await db.execute(select(Stock))
        existing_stocks = result.scalars().all()
        
        if existing_stocks:
            return  # 이미 데이터가 있으면 스킵
        
        # 한국 대표 주식들
        initial_stocks = [
            {"symbol": "005930", "name": "삼성전자", "sector": "전자", "current_price": 70000},
            {"symbol": "000660", "name": "SK하이닉스", "sector": "전자", "current_price": 120000},
            {"symbol": "035420", "name": "NAVER", "sector": "IT", "current_price": 200000},
            {"symbol": "051910", "name": "LG화학", "sector": "화학", "current_price": 500000},
            {"symbol": "006400", "name": "삼성SDI", "sector": "전자", "current_price": 400000},
            {"symbol": "035720", "name": "카카오", "sector": "IT", "current_price": 50000},
            {"symbol": "207940", "name": "삼성바이오로직스", "sector": "바이오", "current_price": 800000},
            {"symbol": "068270", "name": "셀트리온", "sector": "바이오", "current_price": 150000},
            {"symbol": "323410", "name": "카카오뱅크", "sector": "금융", "current_price": 30000},
            {"symbol": "086790", "name": "하나금융지주", "sector": "금융", "current_price": 40000},
            {"symbol": "005380", "name": "현대차", "sector": "자동차", "current_price": 180000},
            {"symbol": "000270", "name": "기아", "sector": "자동차", "current_price": 80000},
            {"symbol": "373220", "name": "LG에너지솔루션", "sector": "전자", "current_price": 450000},
            {"symbol": "006980", "name": "우성사료", "sector": "식품", "current_price": 15000},
            {"symbol": "017670", "name": "SK텔레콤", "sector": "통신", "current_price": 50000}
        ]
        
        for stock_data in initial_stocks:
            stock = Stock(**stock_data)
            db.add(stock)
        
        await db.commit()
    
    def apply_news_impact(self, stock: Stock, news_impact: str, affected_sectors: str):
        """뉴스 영향으로 주식 가격 변동"""
        if not affected_sectors or stock.sector not in affected_sectors:
            return
        
        if news_impact == "positive":
            change_rate = random.uniform(0.05, 0.15)  # 5~15% 상승
        elif news_impact == "negative":
            change_rate = random.uniform(-0.15, -0.05)  # 5~15% 하락
        else:
            return  # neutral은 영향 없음
        
        new_price = stock.current_price * (1 + change_rate)
        new_price = max(new_price, 100)  # 최소 100원
        
        stock.current_price = new_price 

    async def reset_stock_prices(self, db: AsyncSession):
        """주식 가격을 초기 가격으로 리셋"""
        # 초기 주식 가격 데이터
        initial_prices = {
            "005930": 70000,  # 삼성전자
            "000660": 120000,  # SK하이닉스
            "035420": 200000,  # NAVER
            "051910": 500000,  # LG화학
            "006400": 400000,  # 삼성SDI
            "035720": 50000,   # 카카오
            "207940": 800000,  # 삼성바이오로직스
            "068270": 150000,  # 셀트리온
            "323410": 30000,   # 카카오뱅크
            "086790": 40000,   # 하나금융지주
            "005380": 180000,  # 현대차
            "000270": 80000,   # 기아
            "373220": 450000,  # LG에너지솔루션
            "006980": 15000,   # 우성사료
            "017670": 50000    # SK텔레콤
        }
        
        result = await db.execute(select(Stock))
        stocks = result.scalars().all()
        
        for stock in stocks:
            if stock.symbol in initial_prices:
                stock.current_price = initial_prices[stock.symbol]
                # 가격 이력 초기화
                stock.price_history = json.dumps([{
                    "round": 1,
                    "price": stock.current_price,
                    "timestamp": datetime.now().isoformat()
                }])
        
        await db.commit() 