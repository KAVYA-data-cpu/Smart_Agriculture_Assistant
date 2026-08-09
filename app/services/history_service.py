from app.database.connection import get_connection


def get_history():

    connection = get_connection()
    cursor = connection.cursor()

    try:
        query = """
        SELECT
            id,
            nitrogen,
            phosphorus,
            potassium,
            temperature,
            humidity,
            ph,
            rainfall,
            recommended_crop,
            predicted_at
        FROM crop_predictions
        ORDER BY id DESC;
        """

        cursor.execute(query)
        rows = cursor.fetchall()

        history = []

        for row in rows:
            history.append({
                "id": row[0],
                "nitrogen": row[1],
                "phosphorus": row[2],
                "potassium": row[3],
                "temperature": row[4],
                "humidity": row[5],
                "ph": row[6],
                "rainfall": row[7],
                "recommended_crop": row[8],
                "predicted_at": str(row[9])
            })

        return history

    finally:
        cursor.close()
        connection.close()