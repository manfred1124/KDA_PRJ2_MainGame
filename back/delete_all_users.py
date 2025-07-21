import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from database import DATABASE_URL

async def delete_all_users():
    print("=== 사용자 전체 삭제 스크립트 시작 ===")
    # 데이터베이스 연결
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("🚀 사용자 데이터 삭제 시작...")
            # 1. 먼저 관련 테이블의 데이터 삭제 (외래키 제약조건 때문에)
            print("📊 포트폴리오 데이터 삭제 중...")
            await session.execute(text("DELETE FROM portfolios"))
            print("💼 거래 내역 데이터 삭제 중...")
            await session.execute(text("DELETE FROM transactions"))
            # 2. 마지막에 사용자 데이터 삭제
            print("👥 사용자 데이터 삭제 중...")
            await session.execute(text("DELETE FROM users"))
            # 3. 변경사항 커밋
            await session.commit()
            print("✅ 모든 사용자 데이터가 성공적으로 삭제되었습니다!")
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            await session.rollback()
            raise
        finally:
            # 삭제된 데이터 확인
            result = await session.execute(text("SELECT COUNT(*) as count FROM users"))
            user_count = result.scalar()
            print(f"📈 현재 사용자 수: {user_count}")
            await session.close()
    await engine.dispose()
    print("=== 사용자 전체 삭제 스크립트 종료 ===")

if __name__ == "__main__":
    asyncio.run(delete_all_users()) 