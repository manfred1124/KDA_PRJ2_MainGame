from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
from typing import Optional

from models import User
from schemas import UserCreate, UserLogin, Token
from fastapi import HTTPException, status

# JWT 설정
SECRET_KEY = "your-secret-key-here"  # 실제 운영에서는 환경변수로 관리
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """비밀번호 해싱"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """JWT 토큰 생성"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> int:
        """토큰 검증 및 사용자 ID 반환"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return int(user_id)
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    async def get_user_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        """사용자명으로 사용자 조회"""
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()
    

    
    async def register_user(self, db: AsyncSession, user_data: UserCreate):
        """사용자 등록"""
        # 중복 사용자명 확인
        existing_user = await self.get_user_by_username(db, user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        

        
        # 새 사용자 생성
        hashed_password = self.get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            hashed_password=hashed_password
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

        # 모든 주식에 대해 초기 포트폴리오 생성
        from models import Stock, Portfolio
        stocks = await db.execute(select(Stock))
        for stock in stocks.scalars().all():
            portfolio = Portfolio(user_id=db_user.id, stock_id=stock.id, quantity=0, average_price=0)
            db.add(portfolio)
        await db.commit()
        
        return db_user
    
    async def login_user(self, db: AsyncSession, user_data: UserLogin):
        """사용자 로그인"""
        user = await self.get_user_by_username(db, user_data.username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not self.verify_password(user_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # JWT 토큰 생성
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "current_round": user.current_round,
                "total_balance": user.total_balance
            }
        } 