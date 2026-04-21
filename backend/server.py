import json
import sqlite3
import os
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer
import hashlib

DB_FILE = 'database.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE,
                  password_hash TEXT,
                  token TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS saves
                 (user_id INTEGER PRIMARY KEY,
                  data TEXT)''')
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

class SimpleServer(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def read_json(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(body)
        except:
            return {}

    def get_user_by_token(self):
        auth_header = self.headers.get('Authorization')
        if not auth_header: return None
        token = auth_header.replace('Bearer ', '')
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, username FROM users WHERE token=?", (token,))
        row = c.fetchone()
        conn.close()
        return row

    def send_json(self, status, payload):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))

    def do_POST(self):
        if self.path == '/api/register':
            data = self.read_json()
            user, pwd = data.get('username'), data.get('password')
            if not user or not pwd:
                return self.send_json(400, {"error": "Missing username or password"})
            
            pwd_hash = hash_password(pwd)
            token = str(uuid.uuid4())
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            try:
                c.execute("INSERT INTO users (username, password_hash, token) VALUES (?, ?, ?)", (user, pwd_hash, token))
                user_id = c.lastrowid
                # Initial default save
                default_save = json.dumps({"level": 1, "coins": 0, "unlocked": ["A", "B", "c", "D", "E", "F", "G", "H"], "rules": {}})
                c.execute("INSERT INTO saves (user_id, data) VALUES (?, ?)", (user_id, default_save))
                conn.commit()
                self.send_json(200, {"success": True, "token": token, "username": user})
            except sqlite3.IntegrityError:
                self.send_json(400, {"error": "Username already exists"})
            finally:
                conn.close()

        elif self.path == '/api/login':
            data = self.read_json()
            user, pwd = data.get('username'), data.get('password')
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("SELECT token FROM users WHERE username=? AND password_hash=?", (user, hash_password(pwd)))
            row = c.fetchone()
            conn.close()
            if row:
                self.send_json(200, {"success": True, "token": row[0], "username": user})
            else:
                self.send_json(401, {"error": "Invalid credentials"})

        elif self.path == '/api/save':
            user_row = self.get_user_by_token()
            if not user_row:
                return self.send_json(401, {"error": "Unauthorized"})
            
            data = self.read_json()
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("UPDATE saves SET data=? WHERE user_id=?", (json.dumps(data), user_row[0]))
            conn.commit()
            conn.close()
            self.send_json(200, {"success": True})
        
        else:
            self.send_json(404, {"error": "Not Found"})

    def do_GET(self):
        if self.path == '/api/load':
            user_row = self.get_user_by_token()
            if not user_row:
                return self.send_json(401, {"error": "Unauthorized"})

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("SELECT data FROM saves WHERE user_id=?", (user_row[0],))
            row = c.fetchone()
            conn.close()
            
            if row:
                save_data = json.loads(row[0])
                save_data['username'] = user_row[1]
                self.send_json(200, save_data)
            else:
                self.send_json(404, {"error": "No save found"})
        else:
            self.send_json(404, {"error": "Not Found"})

if __name__ == '__main__':
    init_db()
    server_address = ('', 8080)
    httpd = HTTPServer(server_address, SimpleServer)
    print("Starting backend server on port 8080...")
    httpd.serve_forever()
