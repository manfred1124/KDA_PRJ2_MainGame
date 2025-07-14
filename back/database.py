import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL 연결 정보는 .env 파일에서 관리
POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'password')
POSTGRES_DB = os.getenv('POSTGRES_DB', 'toot_game')
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')

SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

async def get_db():
    """데이터베이스 세션을 반환하는 의존성 함수"""
    async with SessionLocal() as session:
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
    
    async with SessionLocal() as session:
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
    
    async with SessionLocal() as session:
        # 주식 데이터 삽입
        await stock_service.insert_initial_stocks(session)
        
        # 뉴스 데이터 삽입
        await news_service.insert_initial_news(session)
        
        # 퀴즈 데이터 삽입
        await quiz_service.insert_initial_quizzes(session)
        
        await session.commit() 