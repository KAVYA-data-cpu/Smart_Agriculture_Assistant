from app.database.connection import connection, cursor

def save_prediction(data, crop):

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