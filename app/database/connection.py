import psycopg2

connection = psycopg2.connect(
    host="localhost",
    database="smart_agriculture_db",
    user="postgres",
    password="kavya@17",
    port="5432"
)

cursor = connection.cursor()