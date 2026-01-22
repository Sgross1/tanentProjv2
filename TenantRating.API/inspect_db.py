import sqlite3

try:
    conn = sqlite3.connect('tenantrating_v2.db')
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("Database: tenantrating_v2.db")
    print("=" * 40)
    
    for table_name in tables:
        base_name = table_name[0]
        if base_name == 'sqlite_sequence':
            continue
            
        print(f"\nTable: {base_name}")
        print("-" * 20)
        
        # Get schema
        cursor.execute(f"PRAGMA table_info({base_name})")
        columns = cursor.fetchall()
        # column structure: (cid, name, type, notnull, dflt_value, pk)
        col_names = [col[1] for col in columns]
        col_details = [(col[1], col[2]) for col in columns]
        
        print("Schema:")
        for name, dtype in col_details:
            print(f"  - {name} ({dtype})")
            
        print("\nData (First 5 rows):")
        
        # Get data
        cursor.execute(f"SELECT * FROM {base_name} LIMIT 5")
        rows = cursor.fetchall()
        
        if rows:
            # Print header
            header = " | ".join(col_names)
            print(header)
            print("-" * len(header))
            
            for row in rows:
                print(" | ".join(str(x) for x in row))
        else:
            print("(Empty)")
            
        print("=" * 40)
        
    conn.close()

except Exception as e:
    print(f"Error: {e}")
