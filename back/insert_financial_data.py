import sqlite3
import csv
import os
from pathlib import Path

def safe_float(value):
    """안전하게 float로 변환"""
    if value is None or value == '' or value == 'nan':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def insert_financial_data():
    """재무제표 CSV 파일들을 읽어서 데이터베이스에 삽입"""
    
    # 데이터베이스 연결
    conn = sqlite3.connect('toot_game.db')
    cursor = conn.cursor()
    
    # 재무제표 테이블이 없으면 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS financial_statements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            revenue REAL,
            operating_income REAL,
            net_income REAL,
            roe REAL,
            per REAL,
            debt_ratio REAL,
            eps REAL,
            total_debt REAL,
            total_equity REAL,
            pbr REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (symbol) REFERENCES stocks (symbol)
        )
    ''')
    
    # 재무지표 폴더 경로
    financial_data_path = Path(r"C:\Users\kdanew\Desktop\재무지표")
    
    # 기존 데이터 삭제 (중복 방지)
    cursor.execute("DELETE FROM financial_statements")
    
    inserted_count = 0
    
    # CSV 파일들 처리
    for csv_file in financial_data_path.glob("*_transposed_final.csv"):
        try:
            print(f"처리 중: {csv_file.name}")
            
            # CSV 파일 읽기
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                rows = list(reader)
                
                if rows:
                    # 기업명에서 종목코드 추출 (첫 번째 행의 기업명 컬럼 사용)
                    symbol = str(rows[0]['기업명'])
                    
                    # 각 행을 데이터베이스에 삽입
                    for row in rows:
                        cursor.execute('''
                            INSERT INTO financial_statements 
                            (symbol, date, revenue, operating_income, net_income, 
                             roe, per, debt_ratio, eps, total_debt, total_equity, pbr)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            symbol,
                            row['date'],
                            safe_float(row['매출액']),
                            safe_float(row['영업이익']),
                            safe_float(row['당기순이익']),
                            safe_float(row['ROE']),
                            safe_float(row['PER']),
                            safe_float(row['부채비율']),
                            safe_float(row['EPS(기본주당순이익)']),
                            safe_float(row['부채총계']),
                            safe_float(row['자본총계']),
                            safe_float(row['PBR'])
                        ))
                        inserted_count += 1
                    
                    print(f"  - {symbol}: {len(rows)}개 레코드 삽입")
            
        except Exception as e:
            print(f"오류 발생 ({csv_file.name}): {e}")
            continue
    
    # 변경사항 저장
    conn.commit()
    conn.close()
    
    print(f"\n✅ 완료! 총 {inserted_count}개의 재무제표 레코드가 삽입되었습니다.")

if __name__ == "__main__":
    insert_financial_data() 