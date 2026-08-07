from app.database.connection import connection, cursor


def save_fertilizer_prediction(data, weather, fertilizer):

    query = """
    INSERT INTO fertilizer_predictions(

        soil_type,
        crop_type,
        nitrogen,
        potassium,
        phosphorous,
        moisture,
        temperature,
        humidity,
        recommended_fertilizer

    )

    VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)

    """

    cursor.execute(

        query,

        (

            data.soil_type,
            data.crop_type,
            data.nitrogen,
            data.potassium,
            data.phosphorous,
            data.moisture,
            weather["temperature"],
            weather["humidity"],
            fertilizer

        )

    )

    connection.commit()