from app.database.connection import get_connection


def save_prediction(data, crop):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        query = """
        INSERT INTO crop_predictions(
            nitrogen,
            phosphorus,
            potassium,
            temperature,
            humidity,
            ph,
            rainfall,
            recommended_crop
        )
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s)
        """

        cursor.execute(
            query,
            (
                data.N,
                data.P,
                data.K,
                data.temperature,
                data.humidity,
                data.ph,
                data.rainfall,
                crop
            )
        )

        connection.commit()

    finally:
        cursor.close()
        connection.close()