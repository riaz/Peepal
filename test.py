import psycopg2

conn = psycopg2.connect(database="postgres",
                        host="localhost",
                        user="riaz",
                        password="postgres",
                        port="5432")


try:
    print(dir(conn))
    print("Connection successful")
except Exception as e:
    print("Connection failed", e)