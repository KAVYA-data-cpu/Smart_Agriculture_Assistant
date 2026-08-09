import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()


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
        raise RuntimeError("DATABASE_URL is not set")

    return psycopg2.connect(database_url)