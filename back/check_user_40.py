import sqlite3
import json

def check_user_40():
    conn = sqlite3.connect('toot_game.db')
    cursor = conn.cursor()

    print('=== User 40 Details ===')
    cursor.execute('SELECT id, username, current_round_idx, round_periods FROM users WHERE id = 40')
    user = cursor.fetchone()
    if user:
        print(f'User ID: {user[0]}, Username: {user[1]}, Round: {user[2]}')
        print(f'Round Periods: {user[3]}')
        
        # round_periods를 파싱
        try:
            periods = json.loads(user[3]) if user[3] else []
            print(f'Parsed Periods: {periods}')
            for i, period in enumerate(periods):
                print(f'  Round {i+1}: {period}')
        except Exception as e:
            print(f'Error parsing periods: {e}')
    else:
        print('User 40 not found')

    print('\n=== User 40 Transactions ===')
    cursor.execute('''
        SELECT t.id, t.user_id, t.stock_id, t.transaction_type, t.quantity, 
               t.round_number, t.created_at, s.name, s.symbol
        FROM transactions t
        LEFT JOIN stocks s ON t.stock_id = s.id
        WHERE t.user_id = 40
        ORDER BY t.created_at DESC
    ''')
    transactions = cursor.fetchall()
    print(f'Total transactions for user 40: {len(transactions)}')
    for tx in transactions:
        print(f'TX ID: {tx[0]}, Stock: {tx[7]}({tx[8]}), Type: {tx[3]}, Qty: {tx[4]}, Round: {tx[5]}, Date: {tx[6]}')

    conn.close()

if __name__ == "__main__":
    check_user_40() 