import sqlite3
import json
import os

# Create the database file right next to this script
DB_PATH = os.path.join(os.path.dirname(__file__), "ats_keywords_cache.db")

def init_db():
    """Initializes the SQLite database and creates the table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS role_keywords 
                 (role TEXT PRIMARY KEY, keywords TEXT)''')
    conn.commit()
    conn.close()

def get_cached_keywords(role: str) -> dict:
    """Checks the database to see if we already have a keyword mapping for this role."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT keywords FROM role_keywords WHERE role=?", (role.lower(),))
    row = c.fetchone()
    conn.close()
    
    if row:
        return json.loads(row[0])
    return None

def save_cached_keywords(role: str, keywords_dict: dict):
    """Saves a newly AI-generated keyword mapping into the database."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # INSERT OR REPLACE acts as a smart update: it creates it if it doesn't exist, or overwrites it if it does
    c.execute("INSERT OR REPLACE INTO role_keywords (role, keywords) VALUES (?, ?)", 
              (role.lower(), json.dumps(keywords_dict)))
    conn.commit()
    conn.close()