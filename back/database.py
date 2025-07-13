from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import MetaData
import os

# 데이터베이스 URL
DATABASE_URL = "sqlite+aiosqlite:///./toot_game.db"

# 엔진 생성
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # SQL 쿼리 로그 출력
    future=True
)

# 세션 팩토리 생성
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 베이스 클래스
Base = declarative_base()

# 메타데이터
metadata = MetaData()

async def get_db() -> AsyncSession:
    """데이터베이스 세션을 반환하는 의존성 함수"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    """데이터베이스 초기화 및 테이블 생성"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 기존 사용자들에게 실현 수익 필드 추가
    await migrate_user_realized_profit()
    
    # 초기 데이터 삽입
    await insert_initial_data()

async def migrate_user_realized_profit():
    """기존 사용자들에게 실현 수익 필드 추가"""
    from models import User
    from sqlalchemy import text
    
    async with AsyncSessionLocal() as session:
        try:
            # SQLite에서 컬럼이 존재하는지 확인
            result = await session.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'realized_profit' not in columns:
                # 컬럼 추가
                await session.execute(text("ALTER TABLE users ADD COLUMN realized_profit FLOAT DEFAULT 0"))
                await session.commit()
                print("Added realized_profit column to users table")
            else:
                print("realized_profit column already exists")
        except Exception as e:
            print(f"Migration error: {e}")
            await session.rollback()

async def insert_initial_data():
    """초기 데이터 삽입 (주식, 뉴스, 퀴즈 등)"""
    from models import Stock, News, Quiz
    from services import stock_service, news_service, quiz_service
    
    async with AsyncSessionLocal() as session:
        # 주식 데이터 삽입
        await stock_service.insert_initial_stocks(session)
        
        # 뉴스 데이터 삽입
        await news_service.insert_initial_news(session)
        
        # 퀴즈 데이터 삽입
        await quiz_service.insert_initial_quizzes(session)
        
        await session.commit() 