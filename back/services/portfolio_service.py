from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from fastapi import HTTPException, status

from models import User, Stock, Portfolio, Transaction, StockPrice
from schemas import TransactionCreate
from services.game_service import period_to_date

class PortfolioService:
    async def buy_stock(self, db: AsyncSession, user_id: int, transaction: TransactionCreate, current_period):
        """주식 구매하기"""
        # 사용자 조회
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # 주식 조회
        stock_result = await db.execute(select(Stock).where(Stock.id == transaction.stock_id))
        stock = stock_result.scalar_one_or_none()
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")
        
        # period에 해당하는 첫 날짜의 가격 조회
        date = period_to_date(current_period)
        price_result = await db.execute(
            select(StockPrice.close_price)
            .where(StockPrice.stock_id == transaction.stock_id)
            .where(StockPrice.date >= date)
            .order_by(StockPrice.date.asc())
            .limit(1)
        )
        current_price = price_result.scalar_one_or_none()
        if current_price is None:
            raise HTTPException(status_code=400, detail="No price data for this stock")
        
        # 구매하기 금액 계산
        total_cost = current_price * transaction.quantity
        
        # 잔액 확인
        if user.total_balance < total_cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        # 기존 포트폴리오 확인
        portfolio_result = await db.execute(
            select(Portfolio).where(
                Portfolio.user_id == user_id,
                Portfolio.stock_id == transaction.stock_id
            )
        )
        portfolio_item = portfolio_result.scalar_one_or_none()
        
        if portfolio_item:
            # 기존 보유량이 있는 경우 평균 구매하기가 계산
            total_quantity = portfolio_item.quantity + transaction.quantity
            total_investment = (portfolio_item.quantity * portfolio_item.average_price) + total_cost
            new_average_price = total_investment / total_quantity
            
            portfolio_item.quantity = total_quantity
            portfolio_item.average_price = new_average_price
        else:
            # 새로운 포트폴리오 아이템 생성
            portfolio_item = Portfolio(
                user_id=user_id,
                stock_id=transaction.stock_id,
                quantity=transaction.quantity,
                average_price=current_price
            )
            db.add(portfolio_item)
        
        # 거래 기록 생성
        transaction_record = Transaction(
            user_id=user_id,
            stock_id=transaction.stock_id,
            quantity=transaction.quantity,
            price=current_price,
            transaction_type="buy",
            total_amount=total_cost,
            round_number=user.current_round_idx
        )
        db.add(transaction_record)
        
        # 사용자 잔액 차감
        user.total_balance -= total_cost
        
        await db.commit()
        
        return {
            "message": "Stock purchased successfully",
            "quantity": transaction.quantity,
            "price": current_price,
            "total_cost": total_cost,
            "remaining_balance": user.total_balance
        }
    
    async def sell_stock(self, db: AsyncSession, user_id: int, transaction: TransactionCreate, current_period):
        """주식 판매하기"""
        # 사용자 조회
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # 주식 조회
        stock_result = await db.execute(select(Stock).where(Stock.id == transaction.stock_id))
        stock = stock_result.scalar_one_or_none()
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")
        
        # period에 해당하는 첫 날짜의 가격 조회
        date = period_to_date(current_period)
        price_result = await db.execute(
            select(StockPrice.close_price)
            .where(StockPrice.stock_id == transaction.stock_id)
            .where(StockPrice.date >= date)
            .order_by(StockPrice.date.asc())
            .limit(1)
        )
        current_price = price_result.scalar_one_or_none()
        if current_price is None:
            raise HTTPException(status_code=400, detail="No price data for this stock")
        
        # 포트폴리오 조회
        portfolio_result = await db.execute(
            select(Portfolio).where(
                Portfolio.user_id == user_id,
                Portfolio.stock_id == transaction.stock_id
            )
        )
        portfolio_item = portfolio_result.scalar_one_or_none()
        
        if not portfolio_item or portfolio_item.quantity < transaction.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient stock quantity"
            )
        
        # 판매하기 금액 계산
        total_revenue = current_price * transaction.quantity
        
        # 실현 수익 계산 (판매하기가 - 평균구매하기가) * 판매하기수량
        realized_profit = (current_price - portfolio_item.average_price) * transaction.quantity
        
        # 포트폴리오 업데이트
        portfolio_item.quantity -= transaction.quantity
        
        # 보유량이 0이 되면 포트폴리오 아이템 삭제
        if portfolio_item.quantity == 0:
            await db.delete(portfolio_item)
        
        # 사용자 실현 수익 업데이트
        user.realized_profit += realized_profit
        
        # 거래 기록 생성
        transaction_record = Transaction(
            user_id=user_id,
            stock_id=transaction.stock_id,
            quantity=transaction.quantity,
            price=current_price,
            transaction_type="sell",
            total_amount=total_revenue,
            round_number=user.current_round_idx
        )
        db.add(transaction_record)
        
        # 사용자 잔액 증가
        user.total_balance += total_revenue
        
        await db.commit()
        
        return {
            "message": "Stock sold successfully",
            "quantity": transaction.quantity,
            "price": current_price,
            "total_revenue": total_revenue,
            "remaining_balance": user.total_balance
        } 