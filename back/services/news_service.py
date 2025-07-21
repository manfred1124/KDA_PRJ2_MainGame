from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timedelta
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
        
        if news_list:
            return [NewsResponse.from_orm(news) for news in news_list] 
        
        # 뉴스가 없으면 period에 맞는 더미 뉴스 생성
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
        
        # 섹터별 더미 뉴스 생성
        sector_news = []
        if "헬스케어" in sector or "바이오" in sector:
            sector_news = [
                {
                    "id": 1,
                    "title": f"{sector} 신약 개발 성과",
                    "date": (base_date - timedelta(days=30)).strftime("%Y-%m-%d"),
                    "summary": f"{sector} 업계에서 새로운 신약 개발이 활발히 진행되고 있습니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "positive"
                },
                {
                    "id": 2,
                    "title": f"{sector} 규제 완화 기대",
                    "date": (base_date - timedelta(days=15)).strftime("%Y-%m-%d"),
                    "summary": f"{sector} 관련 규제 완화로 업계 성장이 기대됩니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "positive"
                },
                {
                    "id": 3,
                    "title": f"{sector} 글로벌 시장 진출",
                    "date": base_date.strftime("%Y-%m-%d"),
                    "summary": f"{sector} 기업들의 해외 시장 진출이 활발해지고 있습니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "neutral"
                }
            ]
        elif "반도체" in sector:
            sector_news = [
                {
                    "id": 1,
                    "title": f"{sector} 수요 증가 전망",
                    "date": (base_date - timedelta(days=30)).strftime("%Y-%m-%d"),
                    "summary": f"{sector} 시장의 수요가 지속적으로 증가할 것으로 전망됩니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "positive"
                },
                {
                    "id": 2,
                    "title": f"{sector} 기술 혁신 가속화",
                    "date": (base_date - timedelta(days=15)).strftime("%Y-%m-%d"),
                    "summary": f"{sector} 업계에서 새로운 기술 개발이 가속화되고 있습니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "positive"
                },
                {
                    "id": 3,
                    "title": f"{sector} 글로벌 경쟁 심화",
                    "date": base_date.strftime("%Y-%m-%d"),
                    "summary": f"{sector} 시장에서 글로벌 경쟁이 더욱 치열해지고 있습니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "neutral"
                }
            ]
        else:
            # 일반적인 섹터 뉴스
            sector_news = [
                {
                    "id": 1,
                    "title": f"{sector} 업계 성장 전망",
                    "date": (base_date - timedelta(days=30)).strftime("%Y-%m-%d"),
                    "summary": f"{sector} 업계의 성장이 지속될 것으로 전망됩니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "positive"
                },
                {
                    "id": 2,
                    "title": f"{sector} 신규 사업 진출",
                    "date": (base_date - timedelta(days=15)).strftime("%Y-%m-%d"),
                    "summary": f"{sector} 기업들의 새로운 사업 영역 진출이 활발합니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "positive"
                },
                {
                    "id": 3,
                    "title": f"{sector} 시장 동향 분석",
                    "date": base_date.strftime("%Y-%m-%d"),
                    "summary": f"{sector} 시장의 전반적인 동향을 분석한 결과입니다.",
                    "period": period,
                    "category": "MarketTrend",
                    "ticker": None,
                    "sentiment": "neutral"
                }
            ]
        
        return [NewsResponse(**news) for news in sector_news] 