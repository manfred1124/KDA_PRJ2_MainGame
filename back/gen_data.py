# gen_data.py
"""
- stocks 테이블에 새로운 종목(섹터, 이름, 티커) 정보 삽입
- stock_prices 테이블에 pykrx로 수집한 1년치 일별 주가 데이터 삽입
"""
import os
from datetime import datetime, timedelta
from pykrx import stock as krx_stock
from sqlalchemy import create_engine, Column, Integer, String, Float, Date, ForeignKey, MetaData, Table
from sqlalchemy.orm import sessionmaker

# DB 연결
DB_URL = 'sqlite:///toot_game.db'
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)
session = Session()
metadata = MetaData()

# 종목 정보 정의
STOCKS = [
    # IT·반도체
    {"symbol": "005930", "name": "삼성전자", "sector": "IT·반도체"},
    {"symbol": "000660", "name": "SK하이닉스", "sector": "IT·반도체"},
    {"symbol": "035420", "name": "NAVER", "sector": "IT·반도체"},
    {"symbol": "035720", "name": "카카오", "sector": "IT·반도체"},
    # 헬스케어·바이오
    {"symbol": "207940", "name": "삼성바이오로직스", "sector": "헬스케어·바이오"},
    {"symbol": "068270", "name": "셀트리온", "sector": "헬스케어·바이오"},
    {"symbol": "302440", "name": "SK바이오사이언스", "sector": "헬스케어·바이오"},
    # 소재·2차전지
    {"symbol": "051910", "name": "LG화학", "sector": "소재·2차전지"},
    {"symbol": "006400", "name": "삼성SDI", "sector": "소재·2차전지"},
    {"symbol": "005490", "name": "POSCO", "sector": "소재·2차전지"},
    # 금융
    {"symbol": "105560", "name": "KB금융", "sector": "금융"},
    {"symbol": "086790", "name": "하나금융지주", "sector": "금융"},
    {"symbol": "055550", "name": "신한지주", "sector": "금융"},
    {"symbol": "032830", "name": "삼성생명", "sector": "금융"},
    # 소비재·유통
    {"symbol": "051900", "name": "LG생활건강", "sector": "소비재·유통"},
    {"symbol": "090430", "name": "아모레퍼시픽", "sector": "소비재·유통"},
    {"symbol": "000120", "name": "CJ대한통운", "sector": "소비재·유통"},
]

# stocks 테이블 정의 (필요시)
stocks_table = Table(
    'stocks', metadata,
    Column('id', Integer, primary_key=True),
    Column('symbol', String, unique=True, nullable=False),
    Column('name', String, nullable=False),
    Column('sector', String, nullable=False),
)

# stock_prices 테이블 정의 (신규 생성)
stock_prices_table = Table(
    'stock_prices', metadata,
    Column('id', Integer, primary_key=True),
    Column('stock_id', Integer, ForeignKey('stocks.id'), nullable=False),
    Column('date', Date, nullable=False),
    Column('close_price', Float, nullable=False),
    Column('open_price', Float),
    Column('high', Float),
    Column('low', Float),
    Column('volume', Integer),
)

# 테이블 생성 (이미 있으면 무시)
metadata.create_all(engine)

# 1. stocks 테이블 데이터 초기화 및 삽입
def insert_stocks():
    session.execute(stocks_table.delete())
    for stock_info in STOCKS:
        session.execute(stocks_table.insert().values(**stock_info))
    session.commit()
    print(f"{len(STOCKS)}개 종목 삽입 완료.")

# 2. stock_prices 테이블에 1년치 주가 데이터 삽입
def insert_stock_prices():
    session.execute(stock_prices_table.delete())
    today = datetime.today()
    start_date = ('2019-01-01')
    end_date = today.strftime('%Y%m%d')
    # stocks 테이블에서 id, symbol 매핑
    stocks = session.execute(stocks_table.select()).fetchall()
    symbol_to_id = {row.symbol: row.id for row in stocks}
    for stock_info in STOCKS:
        symbol = stock_info['symbol']
        stock_id = symbol_to_id[symbol]
        print(f"{stock_info['name']}({symbol}) 주가 수집 중...")
        df = krx_stock.get_market_ohlcv_by_date(start_date, end_date, symbol)
        if df is None or df.empty:
            print(f"{stock_info['name']}({symbol}) 데이터 없음!")
            continue
        for date, row in df.iterrows():
            session.execute(stock_prices_table.insert().values(
                stock_id=stock_id,
                date=date.date(),
                close_price=row['종가'],
                open_price=row['시가'],
                high=row['고가'],
                low=row['저가'],
                volume=row['거래량']
            ))
        session.commit()
        print(f"{stock_info['name']}({symbol}) 주가 {len(df)}건 삽입 완료.")

# 추가: 게임 라운드용 날짜 리스트
ROUND_DATES = [
    f"{year}-01-01" for year in range(2020, 2025)
] + [
    f"{year}-07-01" for year in range(2020, 2025)
]
ROUND_DATES.sort()

# pykrx로 해당 날짜의 종가를 가져와서 stock_prices에 삽입
def insert_round_dates_prices():
    stocks = session.execute(stocks_table.select()).fetchall()
    symbol_to_id = {row.symbol: row.id for row in stocks}
    for stock_info in STOCKS:
        symbol = stock_info['symbol']
        stock_id = symbol_to_id[symbol]
        print(f"{stock_info['name']}({symbol}) 라운드 날짜별 주가 수집 중...")
        for date_str in ROUND_DATES:
            # 이미 데이터가 있으면 건너뜀
            exists = session.execute(stock_prices_table.select().where(
                stock_prices_table.c.stock_id == stock_id,
                stock_prices_table.c.date == date_str
            )).fetchone()
            if exists:
                continue
            try:
                df = krx_stock.get_market_ohlcv_by_date(date_str.replace('-', ''), date_str.replace('-', ''), symbol)
                if df is not None and not df.empty:
                    row = df.iloc[0]
                    session.execute(stock_prices_table.insert().values(
                        stock_id=stock_id,
                        date=date_str,
                        close_price=row['종가'],
                        open_price=row['시가'],
                        high=row['고가'],
                        low=row['저가'],
                        volume=row['거래량']
                    ))
                    print(f"  {date_str}: {row['종가']}원")
                else:
                    print(f"  {date_str}: 데이터 없음!")
            except Exception as e:
                print(f"  {date_str}: 에러 {e}")
        session.commit()
    print("라운드 날짜별 주가 데이터 삽입 완료.")

if __name__ == "__main__":
    insert_stocks()
    insert_stock_prices()
    print("데이터 생성 완료!") 