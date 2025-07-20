from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
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
    round_periods = Column(Text, nullable=True)  # JSON 직렬화된 3개 period 리스트
    current_round_idx = Column(Integer, default=0)
    total_balance = Column(Float, default=10000000)  # 1천만원 시작
    realized_profit = Column(Float, default=0)  # 실현 수익
    is_active = Column(Boolean, default=True)
    
    # 관계
    portfolio = relationship("Portfolio", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    round_reviews = None # This line is added to remove the relationship

class Stock(Base):
    __tablename__ = "stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    sector = Column(String(50), nullable=False)
    
    # 관계
    portfolio_items = relationship("Portfolio", back_populates="stock")
    transactions = relationship("Transaction", back_populates="stock")
    prices = relationship("StockPrice", back_populates="stock")
    news = relationship("News", back_populates="stock")

class StockPrice(Base):
    __tablename__ = "stock_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    close_price = Column(Float, nullable=False)
    open_price = Column(Float)
    high = Column(Float)
    low = Column(Float)
    volume = Column(Integer)
    
    stock = relationship("Stock", back_populates="prices")

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
    period = Column(String, nullable=True)  # 예: '2020 H1'
    category = Column(String, nullable=True)  # 예: 'Macro'
    title = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    summary = Column(String, nullable=True)
    ticker = Column(String, ForeignKey("stocks.symbol"), nullable=True)  # ForeignKey 추가
    sentiment = Column(String, nullable=True)   # 추가
    
    # 관계
    stock = relationship("Stock", back_populates="news")
    
    def to_dict(self):
        return {
            "id": self.id,
            "period": self.period,
            "category": self.category,
            "title": self.title,
            "date": self.date.isoformat() if self.date else None,
            "summary": self.summary,
            "ticker": self.ticker,
            "sentiment": self.sentiment
        }

class RoundReview(Base):
    __tablename__ = "round_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    period = Column(String, unique=True)  # period를 unique key로 설정
    macro_review = Column(Text)
    sector_reviews = Column(JSON)  # JSON 형식으로 섹터별 리뷰 저장
    stocks_review = Column(Text)
    final_review = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FinancialStatement(Base):
    __tablename__ = "financial_statements"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), ForeignKey("stocks.symbol"), nullable=False)
    date = Column(String(20), nullable=False)  # 예: "2024.12", "2024.6"
    revenue = Column(Float, nullable=True)  # 매출액
    operating_income = Column(Float, nullable=True)  # 영업이익
    net_income = Column(Float, nullable=True)  # 당기순이익
    roe = Column(Float, nullable=True)  # ROE
    per = Column(Float, nullable=True)  # PER
    debt_ratio = Column(Float, nullable=True)  # 부채비율
    eps = Column(Float, nullable=True)  # EPS(기본주당순이익)
    total_debt = Column(Float, nullable=True)  # 부채총계
    total_equity = Column(Float, nullable=True)  # 자본총계
    pbr = Column(Float, nullable=True)  # PBR
    created_at = Column(DateTime, default=func.now())
    
    # 관계
    stock = relationship("Stock")
    
    def to_dict(self):
        return {
            "id": self.id,
            "symbol": self.symbol,
            "date": self.date,
            "revenue": self.revenue,
            "operating_income": self.operating_income,
            "net_income": self.net_income,
            "roe": self.roe,
            "per": self.per,
            "debt_ratio": self.debt_ratio,
            "eps": self.eps,
            "total_debt": self.total_debt,
            "total_equity": self.total_equity,
            "pbr": self.pbr
        } 