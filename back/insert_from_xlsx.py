import pandas as pd
import sqlite3

# 1) Excel 파일에서 데이터 읽기
df = pd.read_excel('LG_EnergySolution_2020_2024.xlsx')

# 2) 원본 엑셀 컬럼명 → DB 컬럼명 매핑
column_mapping = {
    'Period':   'period',
    'Category': 'category',
    'Title':    'title',
    'Date':     'date',
    'Summary':  'summary'
}
df = df.rename(columns=column_mapping)

# 3) 테이블 스키마와 동일한 순서로 컬럼만 추출
df = df[['period', 'category', 'title', 'date', 'summary']]

# 4) date 컬럼 문자열(ISO) 포맷으로 변환
df['date'] = pd.to_datetime(df['date'], errors='coerce') \
               .dt.strftime('%Y-%m-%d %H:%M:%S')

# 5) SQLite 연결 및 news 테이블 생성
conn = sqlite3.connect('toot_game.db')
cursor = conn.cursor()
cursor.execute('''
CREATE TABLE IF NOT EXISTS news (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    period   TEXT,
    category TEXT,
    title    TEXT NOT NULL,
    date     TEXT,
    summary  TEXT NOT NULL
);
''')
conn.commit()

# 6) DataFrame → SQLite 삽입
df.to_sql('news', conn, if_exists='append', index=False)

# 7) 커밋 및 연결 종료
conn.commit()
conn.close()

print(f"완료: {len(df)}개 행이 news 테이블에 추가되었습니다.")
