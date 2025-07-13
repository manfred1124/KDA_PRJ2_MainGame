from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import random

from models import News
from schemas import NewsResponse

class NewsService:
    async def get_current_news(self, db: AsyncSession) -> List[NewsResponse]:
        """현재 라운드의 뉴스 조회"""
        result = await db.execute(select(News).order_by(News.created_at.desc()))
        news_list = result.scalars().all()
        return [NewsResponse.from_orm(news) for news in news_list]
    
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
                "title": "삼성전자, 새로운 AI 칩 개발 발표",
                "content": "삼성전자가 차세대 AI 반도체 개발에 성공했다고 발표했습니다. 이는 AI 시장에서의 경쟁력을 크게 높일 것으로 예상됩니다.",
                "impact": "positive",
                "affected_sectors": "전자",
                "round_number": 1
            },
            {
                "title": "글로벌 경제 불안으로 주식시장 하락",
                "content": "글로벌 경제 불안감이 확산되면서 국내 주식시장이 전반적으로 하락세를 보이고 있습니다.",
                "impact": "negative",
                "affected_sectors": "금융,자동차,화학",
                "round_number": 1
            },
            {
                "title": "카카오, 새로운 모바일 서비스 출시",
                "content": "카카오가 혁신적인 모바일 결제 서비스를 출시했습니다. 사용자 편의성이 크게 향상될 것으로 기대됩니다.",
                "impact": "positive",
                "affected_sectors": "IT",
                "round_number": 1
            },
            {
                "title": "바이오 기술 혁신으로 의료산업 성장",
                "content": "최신 바이오 기술 개발로 인해 의료산업이 급성장하고 있습니다. 관련 기업들의 실적이 크게 개선될 전망입니다.",
                "impact": "positive",
                "affected_sectors": "바이오",
                "round_number": 1
            },
            {
                "title": "자동차 산업의 전기차 전환 가속화",
                "content": "환경 규제 강화로 인해 자동차 업계의 전기차 전환이 가속화되고 있습니다. 전통 자동차 업체들이 새로운 도전에 직면하고 있습니다.",
                "impact": "neutral",
                "affected_sectors": "자동차",
                "round_number": 1
            }
        ]
        
        for news_data in initial_news:
            news = News(**news_data)
            db.add(news)
        
        await db.commit()
    
    async def generate_round_news(self, db: AsyncSession, round_number: int):
        """라운드별 새로운 뉴스 생성"""
        news_templates = [
            {
                "title": "삼성전자 실적 호조로 주가 상승",
                "content": "삼성전자의 분기 실적이 시장 예상치를 크게 상회하며 주가가 상승하고 있습니다.",
                "impact": "positive",
                "affected_sectors": "전자"
            },
            {
                "title": "글로벌 반도체 공급 부족 심화",
                "content": "글로벌 반도체 공급 부족이 심화되면서 관련 업체들의 주가가 변동성을 보이고 있습니다.",
                "impact": "neutral",
                "affected_sectors": "전자"
            },
            {
                "title": "IT 업계의 새로운 기술 혁신",
                "content": "IT 업계에서 혁신적인 기술이 개발되어 관련 기업들의 성장 전망이 밝아지고 있습니다.",
                "impact": "positive",
                "affected_sectors": "IT"
            },
            {
                "title": "금융권 규제 강화로 인한 변동성",
                "content": "금융권에 대한 규제가 강화되면서 금융주들의 주가가 변동성을 보이고 있습니다.",
                "impact": "negative",
                "affected_sectors": "금융"
            },
            {
                "title": "자동차 업계의 전기차 경쟁 심화",
                "content": "전기차 시장에서의 경쟁이 심화되면서 자동차 업계의 주가가 변동성을 보이고 있습니다.",
                "impact": "neutral",
                "affected_sectors": "자동차"
            },
            {
                "title": "바이오 업계의 신약 개발 성공",
                "content": "바이오 업계에서 중요한 신약 개발에 성공하여 관련 기업들의 주가가 상승하고 있습니다.",
                "impact": "positive",
                "affected_sectors": "바이오"
            },
            {
                "title": "화학 업계의 원자재 가격 상승",
                "content": "원자재 가격 상승으로 인해 화학 업계의 실적이 악화될 우려가 커지고 있습니다.",
                "impact": "negative",
                "affected_sectors": "화학"
            },
            {
                "title": "통신 업계의 5G 서비스 확산",
                "content": "5G 서비스가 확산되면서 통신 업계의 성장 전망이 밝아지고 있습니다.",
                "impact": "positive",
                "affected_sectors": "통신"
            }
        ]
        
        # 랜덤하게 2-3개의 뉴스 선택
        selected_news = random.sample(news_templates, random.randint(2, 3))
        
        for news_template in selected_news:
            news = News(
                title=news_template["title"],
                content=news_template["content"],
                impact=news_template["impact"],
                affected_sectors=news_template["affected_sectors"],
                round_number=round_number
            )
            db.add(news)
        
        await db.commit() 