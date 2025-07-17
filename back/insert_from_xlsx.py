import os
import glob
import pandas as pd
import sqlite3

# 1) 원본 엑셀 컬럼명 → DB 컬럼명 매핑 (Ticker, sentiment 포함)
column_mapping = {
    'Period':    'period',
    'Category':  'category',
    'Title':     'title',
    'Date':      'date',
    'Summary':   'summary',
    'Ticker':    'ticker',
    'sentiment': 'sentiment'
}

# 2) SQLite 연결 및 news 테이블 생성
db_path = 'toot_game.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute('''
CREATE TABLE IF NOT EXISTS news (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    period    TEXT,
    category  TEXT,
    title     TEXT NOT NULL,
    date      TEXT,
    summary   TEXT NOT NULL,
    ticker    TEXT,
    sentiment TEXT
);
''')
conn.commit()

# 3) data 폴더 내 모든 .xlsx 파일 경로 가져오기
excel_files = glob.glob(os.path.join('data', '*.xlsx'))

total_inserted = 0

for filepath in excel_files:
    # --- 3.1) 기존에 DB에 있는 summary 전체를 조회 ---
    cursor.execute("SELECT summary FROM news")
    existing_summaries = {row[0] for row in cursor.fetchall()}

    # 4) Excel 파일에서 데이터 읽기
    df = pd.read_excel(filepath)

    # 5) 컬럼명 매핑
    df = df.rename(columns=column_mapping)

    # 6) 필요한 컬럼만 추출 (테이블 스키마 순서와 동일)
    df = df[['period', 'category', 'title', 'date', 'summary', 'ticker', 'sentiment']]

    # 7) date 컬럼 문자열(ISO) 포맷으로 변환
    df['date'] = pd.to_datetime(df['date'], errors='coerce') \
                   .dt.strftime('%Y-%m-%d %H:%M:%S')

    # 8) ticker: 모든 숫자가 아닌 문자 제거 → 6자리로 zero-fill
    df['ticker'] = (
        df['ticker']
          .astype(str)
          .str.replace(r'\D', '', regex=True)  # 숫자가 아닌 문자는 모두 제거
          .str.zfill(6)                        # 6자리로 0 채우기
    )

    # --- 8.1) 기존 summary와 중복되는 행 필터링 ---
    before_count = len(df)
    df = df[~df['summary'].isin(existing_summaries)]
    skipped = before_count - len(df)

    if df.empty:
        print(f"{os.path.basename(filepath)}: {skipped} rows skipped (이미 존재), 추가할 행이 없습니다.")
        continue

    # 9) DataFrame → SQLite 삽입
    df.to_sql('news', conn, if_exists='append', index=False)
    inserted = len(df)
    total_inserted += inserted
    print(f"{os.path.basename(filepath)}: {skipped} rows skipped, {inserted} rows added.")

# 10) 커밋 및 연결 종료
conn.commit()
conn.close()

print(f"완료: 총 {total_inserted}개 행이 news 테이블에 추가되었습니다.")
