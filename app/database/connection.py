import psycopg2

connection = psycopg2.connect(
    host="localhost",
    database="smart_agriculture_db",
    user="postgres",
    password="kavya@17",
    port="5432"
)

# NOTE: only the connection is shared/exported now.
# psycopg2 connections ARE safe to share across threads,
# but cursors are NOT - each request must create its own cursor,
# otherwise concurrent requests can corrupt each other's query results
# (this was the cause of the IndexError in fertilizer history).