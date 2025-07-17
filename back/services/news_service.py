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
    
    async def insert_initial_news(self, db: AsyncSession):
        """초기 뉴스 데이터 삽입"""
        # 기존 데이터 확인
        result = await db.execute(select(News))
        existing_news = result.scalars().all()
        
        if existing_news:
            return  # 이미 데이터가 있으면 스킵
        
        # 초기 뉴스 데이터
        initial_news = [
            {
                "period": "2020 H1",
                "category": "전자",
                "title": "삼성전자, 새로운 AI 칩 개발 발표",
                "date": datetime.now(),
                "summary": "삼성전자가 차세대 AI 반도체 개발에 성공했다고 발표했습니다. 이는 AI 시장에서의 경쟁력을 크게 높일 것으로 예상됩니다.",
                "ticker": "005930",
                "sentiment": "positive"
            },
            {
                "period": "2020 H1",
                "category": "금융",
                "title": "글로벌 경제 불안으로 주식시장 하락",
                "date": datetime.now(),
                "summary": "글로벌 경제 불안감이 확산되면서 국내 주식시장이 전반적으로 하락세를 보이고 있습니다.",
                "ticker": None,
                "sentiment": "negative"
            },
            {
                "period": "2020 H2",
                "category": "IT",
                "title": "카카오, 새로운 모바일 서비스 출시",
                "date": datetime.now(),
                "summary": "카카오가 혁신적인 모바일 결제 서비스를 출시했습니다. 사용자 편의성이 크게 향상될 것으로 기대됩니다.",
                "ticker": "035720",
                "sentiment": "positive"
            },
            {
                "period": "2020 H2",
                "category": "바이오",
                "title": "바이오 기술 혁신으로 의료산업 성장",
                "date": datetime.now(),
                "summary": "최신 바이오 기술 개발로 인해 의료산업이 급성장하고 있습니다. 관련 기업들의 실적이 크게 개선될 전망입니다.",
                "ticker": None,
                "sentiment": "positive"
            },
            {
                "period": "2020 H2",
                "category": "자동차",
                "title": "자동차 산업의 전기차 전환 가속화",
                "date": datetime.now(),
                "summary": "환경 규제 강화로 인해 자동차 업계의 전기차 전환이 가속화되고 있습니다. 전통 자동차 업체들이 새로운 도전에 직면하고 있습니다.",
                "ticker": None,
                "sentiment": "neutral"
            }
        ]
        
        for news_data in initial_news:
            news = News(**news_data)
            db.add(news)
        
        await db.commit()
    
    async def generate_round_news(self, db: AsyncSession, round_number: int):
        """라운드별 새로운 뉴스 생성"""
        news_templates = [
            # 전자/IT 섹터 뉴스
            {
                "period": "2020 H1",
                "category": "전자",
                "title": "삼성전자, AI 반도체 시장 선점",
                "date": datetime.now(),
                "summary": "삼성전자가 차세대 AI 반도체 개발에 성공하여 시장에서의 경쟁력이 크게 향상될 것으로 예상됩니다.",
                "ticker": "005930",
                "sentiment": "positive"
            },
            {
                "period": "2020 H1",
                "category": "전자",
                "title": "SK하이닉스, 메모리 가격 상승세",
                "date": datetime.now(),
                "summary": "글로벌 메모리 반도체 수요 증가로 SK하이닉스의 실적이 크게 개선될 전망입니다.",
                "ticker": "000660",
                "sentiment": "positive"
            },
            {
                "period": "2020 H2",
                "category": "IT",
                "title": "NAVER, AI 기술 혁신 발표",
                "date": datetime.now(),
                "summary": "NAVER가 혁신적인 AI 기술을 발표하여 IT 업계의 새로운 표준이 될 것으로 기대됩니다.",
                "ticker": "035420",
                "sentiment": "positive"
            },
            {
                "period": "2020 H2",
                "category": "IT",
                "title": "카카오, 모바일 결제 시장 확장",
                "date": datetime.now(),
                "summary": "카카오가 모바일 결제 서비스를 대폭 확장하여 사용자 편의성이 크게 향상될 것으로 예상됩니다.",
                "ticker": "035720",
                "sentiment": "positive"
            },
            
            # 바이오 섹터 뉴스
            {
                "period": "2020 H2",
                "category": "바이오",
                "title": "셀트리온, 신약 임상 성공",
                "date": datetime.now(),
                "summary": "셀트리온의 바이오시밀러 신약이 임상 3상에 성공하여 의료계의 주목을 받고 있습니다.",
                "ticker": "068270",
                "sentiment": "positive"
            },
            {
                "period": "2020 H2",
                "category": "바이오",
                "title": "삼성바이오로직스, 대규모 수주",
                "date": datetime.now(),
                "summary": "글로벌 제약사와 대규모 위탁생산 계약을 체결하여 실적이 크게 개선될 전망입니다.",
                "ticker": "207940",
                "sentiment": "positive"
            },
            
            # 화학/2차전지 섹터 뉴스
            {
                "period": "2020 H2",
                "category": "화학",
                "title": "LG화학, 전기차 배터리 투자 확대",
                "date": datetime.now(),
                "summary": "전기차 시장 성장에 맞춰 LG화학이 배터리 생산 시설을 대폭 확장할 계획입니다.",
                "ticker": "051910",
                "sentiment": "positive"
            },
            {
                "period": "2020 H2",
                "category": "전자",
                "title": "삼성SDI, 신기술 개발 성공",
                "date": datetime.now(),
                "summary": "삼성SDI가 차세대 배터리 기술 개발에 성공하여 시장에서의 경쟁력이 크게 향상될 것으로 예상됩니다.",
                "ticker": "006400",
                "sentiment": "positive"
            },
            
            # 금융 섹터 뉴스
            {
                "period": "2020 H2",
                "category": "금융",
                "title": "카카오뱅크, 디지털 금융 혁신",
                "date": datetime.now(),
                "summary": "카카오뱅크가 혁신적인 디지털 금융 서비스를 출시하여 금융업계의 새로운 트렌드를 제시합니다.",
                "ticker": "323410",
                "sentiment": "positive"
            },
            {
                "period": "2020 H2",
                "category": "금융",
                "title": "규제 강화로 인한 업계 부담",
                "date": datetime.now(),
                "summary": "금융권에 대한 규제가 강화되면서 금융주들의 실적에 부정적 영향을 미칠 것으로 예상됩니다.",
                "ticker": None,
                "sentiment": "negative"
            },
            
            # 중립적 뉴스
            {
                "period": "2020 H2",
                "category": "통신",
                "title": "통신 업계의 5G 서비스 확산",
                "date": datetime.now(),
                "summary": "5G 서비스가 확산되면서 통신 업계의 변화가 가속화되고 있습니다.",
                "ticker": "017670",
                "sentiment": "neutral"
            },
            {
                "period": "2020 H2",
                "category": "식품",
                "title": "식품 업계의 새로운 트렌드",
                "date": datetime.now(),
                "summary": "건강식품에 대한 관심 증가로 식품 업계에 새로운 변화가 일어나고 있습니다.",
                "ticker": "006980",
                "sentiment": "neutral"
            }
        ]
        
        # 랜덤하게 2-3개의 뉴스 선택
        selected_news = random.sample(news_templates, random.randint(2, 3))
        
        for news_data in selected_news:
            news = News(**news_data)
            db.add(news)
        
        await db.commit() 

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