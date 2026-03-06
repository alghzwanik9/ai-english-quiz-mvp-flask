import sqlite3

conn = sqlite3.connect('instance/app.db')
c = conn.cursor()

# Show all tables first
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("=== TABLES ===")
for t in tables:
    print(" -", t[0])

# Try to get users
print("\n=== USERS ===")
try:
    c.execute("SELECT id, name, email, role FROM user")
    rows = c.fetchall()
    if not rows:
        print("No users found.")
    for r in rows:
        print(f"  ID:{r[0]} | {r[1]} | {r[2]} | {r[3]}")
except Exception as e:
    try:
        c.execute("SELECT id, name, email, role FROM users")
        rows = c.fetchall()
        for r in rows:
            print(f"  ID:{r[0]} | {r[1]} | {r[2]} | {r[3]}")
    except Exception as e2:
        print("Error:", e2)

conn.close()
