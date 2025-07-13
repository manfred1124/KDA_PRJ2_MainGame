from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.now())
    current_round = Column(Integer, default=1)
    total_balance = Column(Float, default=10000000)  # 1천만원 시작
    realized_profit = Column(Float, default=0)  # 실현 수익
    is_active = Column(Boolean, default=True)
    
    # 관계
    portfolio = relationship("Portfolio", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")

class Stock(Base):
    __tablename__ = "stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    sector = Column(String(50), nullable=False)
    current_price = Column(Float, nullable=False)
    price_history = Column(Text)  # JSON 형태로 가격 이력 저장
    created_at = Column(DateTime, default=func.now())
    
    # 관계
    portfolio_items = relationship("Portfolio", back_populates="stock")
    transactions = relationship("Transaction", back_populates="stock")

class Portfolio(Base):
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    quantity = Column(Integer, default=0)
    average_price = Column(Float, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 관계
    user = relationship("User", back_populates="portfolio")
    stock = relationship("Stock", back_populates="portfolio_items")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    transaction_type = Column(String(10), nullable=False)  # "buy" or "sell"
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    round_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    # 관계
    user = relationship("User", back_populates="transactions")
    stock = relationship("Stock", back_populates="transactions")

class News(Base):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    impact_type = Column(String(20), nullable=False)  # "positive", "negative", "neutral"
    affected_sectors = Column(String(200))  # 쉼표로 구분된 섹터들
    round_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now())

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    option_a = Column(String(200), nullable=False)
    option_b = Column(String(200), nullable=False)
    option_c = Column(String(200), nullable=False)
    option_d = Column(String(200), nullable=False)
    correct_answer = Column(Integer, nullable=False)  # 1, 2, 3, 4
    explanation = Column(Text, nullable=False)
    round_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now())

class UserQuiz(Base):
    __tablename__ = "user_quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    user_answer = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime, default=func.now()) 