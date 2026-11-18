import json
import hashlib
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from cryptography.fernet import Fernet, InvalidToken

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "users.db"

load_dotenv(BASE_DIR / ".env")

_encryption_key = os.getenv("TOKEN_ENCRYPTION_KEY")

if not _encryption_key:
    raise RuntimeError("TOKEN_ENCRYPTION_KEY is missing from backend/.env")

try:
    _fernet = Fernet(_encryption_key.encode())
except Exception as exc:
    raise RuntimeError("TOKEN_ENCRYPTION_KEY is invalid.") from exc


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                google_sub TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS google_credentials (
                google_sub TEXT PRIMARY KEY,
                encrypted_credentials TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (google_sub)
                    REFERENCES users(google_sub)
                    ON DELETE CASCADE
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                code_verifier TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


def save_oauth_state(state: str, code_verifier: str):
    now = datetime.now(timezone.utc).isoformat()

    fingerprint = hashlib.sha256(state.encode()).hexdigest()[:12]
    print(f"[OAUTH DEBUG] SAVE fingerprint={fingerprint} db={DB_PATH}")

    with get_connection() as conn:
        conn.execute(
            "DELETE FROM oauth_states WHERE created_at < ?",
            (datetime.fromtimestamp(
                datetime.now(timezone.utc).timestamp() - 600,
                timezone.utc
            ).isoformat(),)
        )
        conn.execute("""
            INSERT OR REPLACE INTO oauth_states
            (state, code_verifier, created_at)
            VALUES (?, ?, ?)
        """, (state, code_verifier, now))


def consume_oauth_state(state: str):
    fingerprint = hashlib.sha256(state.encode()).hexdigest()[:12]
    print(f"[OAUTH DEBUG] CALLBACK fingerprint={fingerprint} db={DB_PATH}")

    with get_connection() as conn:
        row = conn.execute(
            "SELECT code_verifier, created_at FROM oauth_states WHERE state = ?",
            (state,)
        ).fetchone()

        print(f"[OAUTH DEBUG] CALLBACK state_found={row is not None}")

        conn.execute(
            "DELETE FROM oauth_states WHERE state = ?",
            (state,)
        )

    if not row:
        return None

    created_at = datetime.fromisoformat(row["created_at"])
    now = datetime.now(timezone.utc)
    age = (now - created_at).total_seconds()

    print(
        f"[OAUTH DEBUG] STATE AGE={age:.2f}s "
        f"expired={age > 600} future={age < 0}"
    )

    if age > 600 or age < 0:
        return None

    return row["code_verifier"]


def save_user_credentials(google_sub: str, email: str, credentials):
    now = datetime.now(timezone.utc).isoformat()

    credential_data = json.loads(credentials.to_json())

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT encrypted_credentials FROM google_credentials WHERE google_sub = ?",
            (google_sub,)
        ).fetchone()

        if not credential_data.get("refresh_token") and existing:
            old_data = json.loads(
                _fernet.decrypt(
                    existing["encrypted_credentials"].encode()
                ).decode()
            )
            credential_data["refresh_token"] = old_data.get("refresh_token")

        encrypted = _fernet.encrypt(
            json.dumps(credential_data).encode()
        ).decode()

        conn.execute("""
            INSERT INTO users (google_sub, email, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(google_sub) DO UPDATE SET
                email = excluded.email,
                updated_at = excluded.updated_at
        """, (google_sub, email, now, now))

        conn.execute("""
            INSERT INTO google_credentials
            (google_sub, encrypted_credentials, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(google_sub) DO UPDATE SET
                encrypted_credentials = excluded.encrypted_credentials,
                updated_at = excluded.updated_at
        """, (google_sub, encrypted, now))


def load_user_credentials(google_sub: str):
    with get_connection() as conn:
        row = conn.execute("""
            SELECT encrypted_credentials
            FROM google_credentials
            WHERE google_sub = ?
        """, (google_sub,)).fetchone()

    if not row:
        return None

    try:
        decrypted = _fernet.decrypt(
            row["encrypted_credentials"].encode()
        ).decode()
        return json.loads(decrypted)
    except (InvalidToken, ValueError, json.JSONDecodeError):
        raise RuntimeError(
            "Could not decrypt stored Google credentials. Check TOKEN_ENCRYPTION_KEY."
        )


def get_user_email(google_sub: str):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT email FROM users WHERE google_sub = ?",
            (google_sub,)
        ).fetchone()

    return row["email"] if row else None


initialize_db()


def get_user_sub_by_email(email: str):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT google_sub FROM users WHERE email = ? COLLATE NOCASE",
            (email,)
        ).fetchone()

    return row["google_sub"] if row else None
