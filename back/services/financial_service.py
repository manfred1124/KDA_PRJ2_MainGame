from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict
from models import FinancialStatement, Stock
from fastapi import HTTPException

class FinancialService:
    """재무제표 관련 서비스"""
    
    async def get_financial_data_by_period(self, db: AsyncSession, period: str) -> List[Dict]:
        """특정 기간의 재무제표 데이터 조회"""
        try:
            # 기간을 재무제표 날짜 형식으로 변환
            financial_date = self._convert_period_to_financial_date(period)
            
            # 해당 기간의 재무제표 데이터 조회
            result = await db.execute(
                select(FinancialStatement, Stock.name)
                .join(Stock, FinancialStatement.symbol == Stock.symbol)
                .where(FinancialStatement.date == financial_date)
            )
            
            financial_data = []
            for fs, stock_name in result.fetchall():
                financial_data.append({
                    "symbol": fs.symbol,
                    "name": stock_name,
                    "date": fs.date,
                    "revenue": fs.revenue,
                    "operating_income": fs.operating_income,
                    "net_income": fs.net_income,
                    "roe": fs.roe,
                    "per": fs.per,
                    "debt_ratio": fs.debt_ratio,
                    "eps": fs.eps,
                    "total_debt": fs.total_debt,
                    "total_equity": fs.total_equity,
                    "pbr": fs.pbr
                })
            
            return financial_data
            
        except Exception as e:
            print(f"재무제표 데이터 조회 오류: {e}")
            return []
    
    async def get_financial_data_by_stock(self, db: AsyncSession, symbol: str, period: str) -> Optional[Dict]:
        """특정 종목의 특정 기간 재무제표 데이터 조회"""
        try:
            print(f"재무제표 조회 요청: symbol={symbol}, period={period}")
            # 기간을 재무제표 날짜 형식으로 변환
            financial_date = self._convert_period_to_financial_date(period)
            print(f"변환된 날짜: {financial_date}")
            
            # 해당 종목의 재무제표 데이터 조회
            result = await db.execute(
                select(FinancialStatement, Stock.name)
                .join(Stock, FinancialStatement.symbol == Stock.symbol)
                .where(
                    FinancialStatement.symbol == symbol,
                    FinancialStatement.date == financial_date
                )
            )
            
            fs_data = result.first()
            if fs_data:
                fs, stock_name = fs_data
                return {
                    "symbol": fs.symbol,
                    "name": stock_name,
                    "date": fs.date,
                    "revenue": fs.revenue,
                    "operating_income": fs.operating_income,
                    "net_income": fs.net_income,
                    "roe": fs.roe,
                    "per": fs.per,
                    "debt_ratio": fs.debt_ratio,
                    "eps": fs.eps,
                    "total_debt": fs.total_debt,
                    "total_equity": fs.total_equity,
                    "pbr": fs.pbr
                }
            
            return None
            
        except Exception as e:
            print(f"종목별 재무제표 데이터 조회 오류: {e}")
            return None
    
    async def get_financial_summary_by_period(self, db: AsyncSession, period: str) -> Dict:
        """특정 기간의 재무제표 요약 정보 조회"""
        try:
            financial_data = await self.get_financial_data_by_period(db, period)
            
            if not financial_data:
                return {
                    "period": period,
                    "total_stocks": 0,
                    "avg_roe": 0,
                    "avg_per": 0,
                    "avg_pbr": 0,
                    "total_revenue": 0,
                    "total_operating_income": 0
                }
            
            # 평균값 계산
            total_stocks = len(financial_data)
            avg_roe = sum(item["roe"] or 0 for item in financial_data) / total_stocks
            avg_per = sum(item["per"] or 0 for item in financial_data) / total_stocks
            avg_pbr = sum(item["pbr"] or 0 for item in financial_data) / total_stocks
            total_revenue = sum(item["revenue"] or 0 for item in financial_data)
            total_operating_income = sum(item["operating_income"] or 0 for item in financial_data)
            
            return {
                "period": period,
                "total_stocks": total_stocks,
                "avg_roe": round(avg_roe, 2),
                "avg_per": round(avg_per, 2),
                "avg_pbr": round(avg_pbr, 2),
                "total_revenue": total_revenue,
                "total_operating_income": total_operating_income
            }
            
        except Exception as e:
            print(f"재무제표 요약 정보 조회 오류: {e}")
            return {}
    
    def _convert_period_to_financial_date(self, period: str) -> str:
        """게임 기간을 재무제표 날짜 형식으로 변환"""
        try:
            if not period:
                return "2024.6"  # 기본값
            
            # "2024 H1" -> "2024.6" 변환
            if "H1" in period:
                year = period.split(" ")[0]
                return f"{year}.6"
            elif "H2" in period:
                year = period.split(" ")[0]
                return f"{year}.12"
            else:
                # 이미 "2024.6" 형식인 경우
                return period
                
        except Exception as e:
            print(f"기간 변환 오류: {e}")
            return "2024.6"  # 기본값
    
    def is_financial_data_available(self, period: str) -> bool:
        """해당 기간에 재무제표 데이터가 있는지 확인"""
        # 3라운드(2024 H1)에만 재무제표 데이터 제공
        return "2024 H1" in period or "2024.6" in period 