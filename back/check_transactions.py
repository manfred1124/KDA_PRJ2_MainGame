import sqlite3

def check_database():
    conn = sqlite3.connect('toot_game.db')
    cursor = conn.cursor()

    print('=== Users ===')
    cursor.execute('SELECT id, username, current_round_idx FROM users')
    users = cursor.fetchall()
    for user in users:
        print(f'User ID: {user[0]}, Username: {user[1]}, Round: {user[2]}')

    print('\n=== Transactions ===')
    cursor.execute('SELECT id, user_id, stock_id, transaction_type, quantity, round_number, created_at FROM transactions ORDER BY created_at DESC LIMIT 10')
    transactions = cursor.fetchall()
    print(f'Total transactions found: {len(transactions)}')
    for tx in transactions:
        print(f'TX ID: {tx[0]}, User: {tx[1]}, Stock: {tx[2]}, Type: {tx[3]}, Qty: {tx[4]}, Round: {tx[5]}, Date: {tx[6]}')

    print('\n=== Stocks ===')
    cursor.execute('SELECT id, symbol, name FROM stocks LIMIT 5')
    stocks = cursor.fetchall()
    for stock in stocks:
        print(f'Stock ID: {stock[0]}, Symbol: {stock[1]}, Name: {stock[2]}')

    conn.close()

if __name__ == "__main__":
    check_database() 