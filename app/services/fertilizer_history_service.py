from app.database.connection import get_connection


def get_fertilizer_history():

    connection = get_connection()
    cursor = connection.cursor()

    try:
        query = """
        SELECT
            id,
            soil_type,
            crop_type,
            nitrogen,
            potassium,
            phosphorous,
            moisture,
            temperature,
            humidity,
            recommended_fertilizer,
            predicted_at

        FROM fertilizer_predictions

        ORDER BY id DESC;
        """

        cursor.execute(query)
        rows = cursor.fetchall()

        history = []

        for row in rows:
            history.append({
                "id": row[0],
                "soil_type": row[1],
                "crop_type": row[2],
                "nitrogen": row[3],
                "potassium": row[4],
                "phosphorous": row[5],
                "moisture": row[6],
                "temperature": row[7],
                "humidity": row[8],
                "recommended_fertilizer": row[9],
                "predicted_at": str(row[10])
            })

        return history

    finally:
        cursor.close()
        connection.close()