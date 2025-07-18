import os
import json
import asyncio
import sqlite3
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from models import Stock, News, StockPrice

# 환경 변수 로드
load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise EnvironmentError("OPENAI_API_KEY가 .env 파일에 설정되지 않았습니다.")

# SQLite 엔진 및 연결 설정
engine = create_engine("sqlite:///toot_game.db", echo=True)
Session = sessionmaker(bind=engine)
conn = sqlite3.connect("toot_game.db")
cursor = conn.cursor()

# 분석할 기간 리스트 생성
years = [2020, 2021, 2022, 2023, 2024]
halfs = ["H1", "H2"]
all_periods = [f"{y} {h}" for y in years for h in halfs]

async def generate_reviews():
    db = Session()
    try:
        # OpenAI LLM 초기화
        llm = ChatOpenAI(
            temperature=0.7,
            model="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY"),
            timeout=60.0
        )

        for period in all_periods:
            print(f"\n=== {period} 기간의 리뷰를 생성합니다... ===")
            half = period.split()[1]
            round_number = 1 if half == "H1" else 2

            try:
                # 1) 데이터 수집
                macro_news = db.query(News).filter_by(period=period, category="Macro").all()
                print(f"매크로 뉴스 수: {len(macro_news)}")
                if macro_news:
                    print(f"매크로 뉴스 샘플: {macro_news[0].to_dict()}")

                sectors = [s[0] for s in db.query(Stock.sector).distinct()]
                print(f"섹터 목록: {sectors}")

                # 섹터별 뉴스 조회
                sector_news = {}
                for sector in sectors:
                    sector_tickers = [stock.symbol for stock in db.query(Stock).filter_by(sector=sector).all()]
                    sector_news[sector] = db.query(News).filter(
                        News.period == period,
                        News.category == "MarketTrend",
                        News.ticker.in_(sector_tickers)
                    ).all()
                    print(f"{sector} 섹터 뉴스 수: {len(sector_news[sector])}")
                    if sector_news[sector]:
                        print(f"{sector} 섹터 뉴스 샘플: {sector_news[sector][0].to_dict()}")

                stocks = db.query(Stock).all()
                print(f"종목 수: {len(stocks)}")
                if stocks:
                    print(f"종목 샘플: id={stocks[0].id}, symbol={stocks[0].symbol}, name={stocks[0].name}")

                stock_data = {}
                year = int(period.split()[0])
                month = 1 if half == "H1" else 7
                start_date = datetime(year=year, month=month, day=1)
                end_date = start_date + timedelta(days=180)
                print(f"날짜 범위: start_date={start_date}, end_date={end_date}")

                for stock in stocks:
                    try:
                        news_list = db.query(News).filter_by(period=period, ticker=stock.symbol).all()
                        news_list = news_list[:3]  # 뉴스 수 제한
                        print(f"종목 {stock.symbol} (ID: {stock.id}) 뉴스 수: {len(news_list)}")
                        if news_list:
                            print(f"종목 {stock.symbol} 뉴스 샘플: {news_list[0].to_dict()}")

                        latest = (
                            db.query(StockPrice)
                            .filter(
                                StockPrice.stock_id == stock.id,
                                StockPrice.date >= start_date,
                                StockPrice.date < end_date
                            )
                            .order_by(StockPrice.date.desc())
                            .first()
                        )
                        prev_start = start_date - timedelta(days=180)
                        prev_end = start_date
                        prev = (
                            db.query(StockPrice)
                            .filter(
                                StockPrice.stock_id == stock.id,
                                StockPrice.date >= prev_start,
                                StockPrice.date < prev_end
                            )
                            .order_by(StockPrice.date.desc())
                            .first()
                        )

                        if not latest or not prev:
                            print(f"Stock ID {stock.id} ({stock.symbol}): 가격 데이터 부족으로 리뷰에서 제외")
                            continue

                        print(f"Stock ID {stock.id} ({stock.symbol}): 최신 가격 데이터 - date={latest.date}, close_price={latest.close_price}")
                        print(f"Stock ID {stock.id} ({stock.symbol}): 이전 가격 데이터 - date={prev.date}, close_price={prev.close_price}")

                        price_change = 0.0
                        if prev.close_price != 0:
                            price_change = ((latest.close_price - prev.close_price) / prev.close_price) * 100
                            print(f"Stock ID {stock.id} ({stock.symbol}): 가격 변화율 = {price_change:.2f}%")

                        stock_data[stock.name] = {
                            "sector": stock.sector,
                            "ticker": stock.symbol,
                            "news": [n.to_dict() for n in news_list],
                            "current_price": latest.close_price if latest else None,
                            "price_change": price_change,
                        }
                    except Exception as e:
                        print(f"종목 {stock.symbol} (ID: {stock.id}) 처리 중 오류: {e}")
                        continue

                # 2) LLM을 이용한 리뷰 생성
                # 2.1) 매크로 리뷰
                cursor.execute(
                    "SELECT content FROM reviews WHERE period = ? AND review_type = ? AND target IS NULL",
                    (period, "macro_review")
                )
                if not cursor.fetchone():
                    macro_messages = [
                        SystemMessage(content=(
                            "당신은 종합적인 시장 분석을 전문으로 하는 금융 시장 분석가입니다.\n"
                            "제공된 매크로 뉴스를 바탕으로 상세한 시장 리뷰를 한국어로 작성하세요.\n"
                            "주요 시장 트렌드, 경제 지표 및 그 의미에 집중하세요."
                        )),
                        HumanMessage(content=json.dumps({
                            "period": period,
                            "macro_news": [n.to_dict() for n in macro_news[:10]]
                        }, ensure_ascii=False, indent=2))
                    ]
                    try:
                        macro_review = await llm.ainvoke(macro_messages)
                        cursor.execute(
                            "INSERT INTO reviews (period, round_number, review_type, content) VALUES (?, ?, ?, ?)",
                            (period, round_number, "macro_review", macro_review.content)
                        )
                        conn.commit()
                        print(f"매크로 리뷰 저장 완료: {macro_review.content[:100]}...")
                    except Exception as e:
                        print(f"매크로 리뷰 생성 중 오류: {e}")
                        cursor.execute(
                            "INSERT INTO reviews (period, round_number, review_type, content) VALUES (?, ?, ?, ?)",
                            (period, round_number, "macro_review", "매크로 리뷰를 생성하지 못했습니다.")
                        )
                        conn.commit()
                else:
                    print(f"{period} 매크로 리뷰 이미 존재")

                # 2.2) 섹터별 리뷰
                for sector in sectors:
                    cursor.execute(
                        "SELECT content FROM reviews WHERE period = ? AND review_type = ? AND target = ?",
                        (period, "sector_review", sector)
                    )
                    if not cursor.fetchone():
                        sector_stocks = [
                            {"name": name, **info}
                            for name, info in stock_data.items()
                            if info["sector"] == sector
                        ]
                        if not sector_news[sector]:
                            cursor.execute(
                                "INSERT INTO reviews (period, round_number, review_type, target, content) VALUES (?, ?, ?, ?, ?)",
                                (period, round_number, "sector_review", sector, f"{sector} 섹터: 뉴스 데이터가 없어 리뷰를 생성하지 못했습니다.")
                            )
                            conn.commit()
                            print(f"{sector} 섹터: 뉴스 데이터 없음, 기본 메시지 저장")
                            continue

                        sec_messages = [
                            SystemMessage(content=(
                                f"당신은 {sector} 섹터 분석을 제공하는 전문가입니다.\n"
                                "제공된 뉴스와 주식 가격 데이터를 바탕으로 섹터 성과를 한국어로 분석하세요."
                            )),
                            HumanMessage(content=json.dumps({
                                "period": period,
                                "sector": sector,
                                "news": [n.to_dict() for n in sector_news[sector][:5]],
                                "stocks": sector_stocks
                            }, ensure_ascii=False, indent=2))
                        ]
                        try:
                            sec_review = await llm.ainvoke(sec_messages)
                            cursor.execute(
                                "INSERT INTO reviews (period, round_number, review_type, target, content) VALUES (?, ?, ?, ?, ?)",
                                (period, round_number, "sector_review", sector, sec_review.content)
                            )
                            conn.commit()
                            print(f"{sector} 섹터 리뷰 저장 완료: {sec_review.content[:100]}...")
                        except Exception as e:
                            print(f"{sector} 섹터 리뷰 생성 중 오류: {e}")
                            cursor.execute(
                                "INSERT INTO reviews (period, round_number, review_type, target, content) VALUES (?, ?, ?, ?, ?)",
                                (period, round_number, "sector_review", sector, f"{sector} 섹터 리뷰를 생성하지 못했습니다.")
                            )
                            conn.commit()
                    else:
                        print(f"{period} {sector} 섹터 리뷰 이미 존재")

                # 2.3) 주목할 만한 종목 리뷰
                notable = [
                    {"name": name, **info}
                    for name, info in stock_data.items()
                    if abs(info["price_change"]) > 10 or len(info["news"]) > 2
                ]
                notable = sorted(notable, key=lambda x: abs(x["price_change"]), reverse=True)[:5]
                print(f"주목할 만한 종목 수: {len(notable)}")
                if notable:
                    print(f"주목할 만한 종목 샘플: {notable[0]}")

                for stock in notable:
                    ticker = stock["ticker"]
                    cursor.execute(
                        "SELECT content FROM reviews WHERE period = ? AND review_type = ? AND target = ?",
                        (period, "stocks_review", ticker)
                    )
                    if not cursor.fetchone():
                        stock_json = json.dumps({"period": period, "stock": stock}, ensure_ascii=False)
                        token_count = llm.get_num_tokens(stock_json)
                        print(f"종목 {ticker} JSON 토큰 수: {token_count}")

                        stock_messages = [
                            SystemMessage(content=(
                                "당신은 주목할 만한 종목 분석을 제공하는 주식 분석가입니다.\n"
                                "중요한 가격 움직임과 뉴스 영향을 한국어로 분석하세요."
                            )),
                            HumanMessage(content=stock_json)
                        ]
                        try:
                            stock_review = await llm.ainvoke(stock_messages)
                            cursor.execute(
                                "INSERT INTO reviews (period, round_number, review_type, target, content) VALUES (?, ?, ?, ?, ?)",
                                (period, round_number, "stocks_review", ticker, stock_review.content)
                            )
                            conn.commit()
                            print(f"종목 {ticker} 리뷰 저장 완료: {stock_review.content[:100]}...")
                        except Exception as e:
                            print(f"종목 {ticker} 리뷰 생성 중 오류: {e}")
                            cursor.execute(
                                "INSERT INTO reviews (period, round_number, review_type, target, content) VALUES (?, ?, ?, ?, ?)",
                                (period, round_number, "stocks_review", ticker, f"종목 {ticker} 리뷰를 생성하지 못했습니다.")
                            )
                            conn.commit()
                    else:
                        print(f"{period} 종목 {ticker} 리뷰 이미 존재")

                # 2.4) 종합 리뷰
                cursor.execute(
                    "SELECT content FROM reviews WHERE period = ? AND review_type = ? AND target IS NULL",
                    (period, "final_review")
                )
                if not cursor.fetchone():
                    # 종합 리뷰를 위한 섹터 리뷰와 매크로 리뷰 조회
                    cursor.execute(
                        "SELECT target, content FROM reviews WHERE period = ? AND review_type = ?",
                        (period, "sector_review")
                    )
                    sector_reviews = {row[0]: row[1] for row in cursor.fetchall()}
                    cursor.execute(
                        "SELECT content FROM reviews WHERE period = ? AND review_type = ? AND target IS NULL",
                        (period, "macro_review")
                    )
                    macro_review = cursor.fetchone()[0] if cursor.fetchone() else "매크로 리뷰 없음"
                    cursor.execute(
                        "SELECT target, content FROM reviews WHERE period = ? AND review_type = ?",
                        (period, "stocks_review")
                    )
                    stocks_reviews = {row[0]: row[1] for row in cursor.fetchall()}

                    final_messages = [
                        SystemMessage(content=(
                            "당신은 종합 시장 리뷰를 작성하는 수석 시장 전략가입니다.\n"
                            "매크로 트렌드, 섹터 움직임, 개별 주식 성과를 종합하여 한국어로 작성하세요."
                        )),
                        HumanMessage(content=json.dumps({
                            "period": period,
                            "macro_review": macro_review,
                            "sector_reviews": sector_reviews,
                            "stocks_reviews": stocks_reviews
                        }, ensure_ascii=False, indent=2))
                    ]
                    try:
                        final_review = await llm.ainvoke(final_messages)
                        cursor.execute(
                            "INSERT INTO reviews (period, round_number, review_type, content) VALUES (?, ?, ?, ?)",
                            (period, round_number, "final_review", final_review.content)
                        )
                        conn.commit()
                        print(f"종합 리뷰 저장 완료: {final_review.content[:100]}...")
                    except Exception as e:
                        print(f"종합 리뷰 생성 중 오류: {e}")
                        cursor.execute(
                            "INSERT INTO reviews (period, round_number, review_type, content) VALUES (?, ?, ?, ?)",
                            (period, round_number, "final_review", "종합 리뷰를 생성하지 못했습니다.")
                        )
                        conn.commit()
                else:
                    print(f"{period} 종합 리뷰 이미 존재")

                print(f"{period} 리뷰 생성 및 저장 완료")

            except Exception as e:
                print(f"{period} 기간 리뷰 생성 중 오류 발생: {e}")
                conn.rollback()
                continue

    except Exception as e:
        print(f"리뷰 생성 프로세스 중 오류 발생: {e}")
    finally:
        db.close()
        conn.close()

if __name__ == "__main__":
    asyncio.run(generate_reviews())