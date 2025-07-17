from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import random

from models import News, Stock
from schemas import NewsResponse

class NewsService:
    async def get_current_news(self, db: AsyncSession, period: str = None) -> List[NewsResponse]:
        """현재 라운드의 Macro0 뉴스만 조회"""
        if not period:
            return []
        result = await db.execute(
            select(News)
            .where(News.period == period, News.category == 'Macro0')
            .order_by(News.date.desc())
        )
        news_list = result.scalars().all()
        return [NewsResponse.from_orm(news) for news in news_list]
    
    async def get_news_by_stock(self, db: AsyncSession, stock_name: str, period: str = None, ticker: str = None) -> List[NewsResponse]:
        """특정 종목의 TickerNews만, 현재 라운드(period)와 ticker가 일치하는 뉴스만 반환"""
        # ticker와 period가 명시적으로 들어오면 그걸 사용, 아니면 stock_name으로 ticker를 조회
        if not ticker:
            stock_result = await db.execute(select(Stock).where(Stock.name == stock_name))
            stock = stock_result.scalar_one_or_none()
            ticker = stock.symbol if stock else None
        if not period:
            # period가 없으면 아무 뉴스도 반환하지 않음
            return []
        result = await db.execute(
            select(News)
            .where(News.period == period, News.category == 'TickerNews', News.ticker == ticker)
            .order_by(News.date.desc())
        )
        news_list = result.scalars().all()
        return [NewsResponse.from_orm(news) for news in news_list]
    
    async def get_macro_news_by_period(self, db: AsyncSession, period: str) -> List[NewsResponse]:
        """특정 period, Macro 카테고리 뉴스만 조회"""
        result = await db.execute(
            select(News).where(News.period == period, News.category == 'Macro').order_by(News.date.asc())
        )
        news_list = result.scalars().all()
        
        # 말투 변경
        for news in news_list:
            # "2020 H1 주요 이슈: 미중 1단계 무역협정 체결 후 코로나로 이행 차질"
            # -> "2020년 상반기에는 미중 무역협정이 있었지만, 코로나 때문에 차질이 생겼다네."
            if '주요 이슈' in news.title and '무역협정' in news.title:
                news.title = f"{period.split(' ')[0]}년 상반기에는 미국과 중국이 무역 합의를 했지만, 코로나 때문에 계획에 차질이 생겼다네."
            elif '주요 이슈' in news.title and 'V자 회복' in news.title:
                news.title = f"{period.split(' ')[0]}년 하반기에는 세계 경제가 V자 형태로 회복할 거라는 기대감이 커졌지."
            # 여기에 다른 메시지 변환 규칙을 추가할 수 있네.

        return [NewsResponse.from_orm(news) for news in news_list]
    
    async def get_news_until_period(self, db: AsyncSession, period: str):
        """주어진 period까지의 모든 뉴스 데이터 반환"""
        # period는 'YYYY H1' 또는 'YYYY H2' 형식이므로, 문자열 정렬로 비교 가능
        result = await db.execute(
            select(News).where(News.period <= period).order_by(News.period, News.date)
        )
        return result.scalars().all()
    
     

    async def get_sector_trend_news(self, db: AsyncSession, sector: str, period: str):
        """특정 섹터의 MarketTrend 뉴스만 반환 (ticker로 stocks.symbol과 조인, period도 필터)"""
        from sqlalchemy import join
        j = join(News, Stock, News.ticker == Stock.symbol)
        result = await db.execute(
            select(News)
            .select_from(j)
            .where(News.category == 'MarketTrend', Stock.sector == sector, News.period == period)
            .order_by(News.date.desc())
        )
        news_list = result.scalars().all()
        return [NewsResponse.from_orm(news) for news in news_list] 