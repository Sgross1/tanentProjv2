import sqlite3
import os

db_path = 'C:/Users/shlgr/.gemini/antigravity/scratch/tenant-rating/TenantRating.API/tenantrating_v2.db'
if not os.path.exists(db_path):
    print('DB not found.')
else:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('SELECT FirstName, LastName, Email, Role FROM Users')
    roles = {0: 'Tenant', 1: 'Landlord', 2: 'Admin', 3: 'Both'}
    for row in c.fetchall():
        role_name = roles.get(row[3], 'Unknown')
        print(f'- **{row[0]} {row[1]}** | Email: {row[2]} | Role: {role_name}')
    conn.close()
