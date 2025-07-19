import sqlite3

def check_news_keywords():
    conn = sqlite3.connect('toot_game.db')
    cursor = conn.cursor()
    
    # 전체 뉴스 개수 확인
    cursor.execute('SELECT COUNT(*) FROM news')
    total_count = cursor.fetchone()[0]
    print(f"전체 뉴스 개수: {total_count}")
    
    # 샘플 뉴스 제목들 확인
    cursor.execute('SELECT title FROM news LIMIT 10')
    sample_news = cursor.fetchall()
    print("\n샘플 뉴스 제목들:")
    for i, (title,) in enumerate(sample_news, 1):
        print(f"{i}. {title}")
    
    # 키워드별 검색 결과 확인
    keywords_to_check = [
        "규제", "정책", "법안", "제도", "정부",
        "코로나", "COVID", "팬데믹",
        "금리", "연준", "한국은행",
        "반도체", "메모리", "SK하이닉스",
        "전기차", "테슬라", "EV",
        "바이오", "제약", "백신"
    ]
    
    print("\n키워드별 검색 결과:")
    for keyword in keywords_to_check:
        cursor.execute('SELECT COUNT(*) FROM news WHERE title LIKE ?', (f'%{keyword}%',))
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"'{keyword}': {count}개 뉴스 발견")
            # 실제 제목도 몇 개 보여주기
            cursor.execute('SELECT title FROM news WHERE title LIKE ? LIMIT 3', (f'%{keyword}%',))
            titles = cursor.fetchall()
            for title, in titles:
                print(f"  - {title}")
    
    conn.close()

if __name__ == "__main__":
    check_news_keywords() 