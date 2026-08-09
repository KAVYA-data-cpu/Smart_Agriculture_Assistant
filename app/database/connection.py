import os
import psycopg2

def get_connection():
    """
    Creates a fresh connection each time it's called.
    Neon (and most hosted Postgres) closes idle connections
    automatically, so reusing one long-lived connection
    eventually fails with 'connection already closed'.
    A new connection per request avoids that.
    """
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        keys = list(os.environ.keys())
        raise RuntimeError(f"DATABASE_URL is not set! Available keys: {keys}")

    return psycopg2.connect(database_url)