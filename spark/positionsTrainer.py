from __future__ import print_function

import sys
import numpy

from pyspark import SparkContext
from pyspark.sql import SparkSession
from pyspark.streaming import StreamingContext
from pyspark.sql.dataframe import DataFrame
from pyspark.sql.functions import *
from pyspark.sql.types import StructType, StructField, DoubleType
from pyspark.sql import functions as F

from pyspark.ml.regression import LinearRegression
from pyspark.ml.feature import VectorAssembler
from pyspark.ml import Pipeline
from pyspark.ml.pipeline import PipelineModel

from pyspark.ml.evaluation import RegressionEvaluator

# Initialize Spark session
spark = SparkSession.builder.appName("TapPosition").getOrCreate()
spark.sparkContext.setLogLevel("ERROR")  # To reduce verbose output

# Function to train models
def model_trainer(file_path):
    # Define schema for the data
    schema = StructType([
        StructField("lat", DoubleType(), True),
        StructField("lon", DoubleType(), True),
        StructField("next_lat", DoubleType(), True),
        StructField("next_lon", DoubleType(), True)
    ])

    # Load data
    data = spark.read.format("csv").options(header='true', inferschema='true', delimiter=",").load(file_path)

    # Assemble features
    assembler = VectorAssembler(inputCols=["lat", "lon"], outputCol="features")
    data = assembler.transform(data)

    # Split the data into training and testing sets
    train_data, test_data = data.randomSplit([0.8, 0.2], seed=12345)

    # Train model for latitude prediction
    lr_lat = LinearRegression(featuresCol="features", labelCol="next_lat")
    pipeline_lat = Pipeline(stages=[lr_lat])
    model_lat = pipeline_lat.fit(train_data)

    # Train model for longitude prediction
    lr_lon = LinearRegression(featuresCol="features", labelCol="next_lon")
    pipeline_lon = Pipeline(stages=[lr_lon])
    model_lon = pipeline_lon.fit(train_data)

    # Return the trained models and test data
    return model_lat, model_lon, test_data

# Function to save models
def save_models(model_lat, model_lon, path_lat, path_lon):
    model_lat.write().overwrite().save(path_lat)
    model_lon.write().overwrite().save(path_lon)

# Function to load models
def load_models(path_lat, path_lon):
    model_lat = PipelineModel.load(path_lat)
    model_lon = PipelineModel.load(path_lon)
    return model_lat, model_lon

# Function to evaluate models
def evaluate_models(model_lat, model_lon, test_data):
    # Make predictions on test data
    predictions_lat = model_lat.transform(test_data)
    predictions_lon = model_lon.transform(test_data)

    # Evaluate latitude predictions
    evaluator_lat = RegressionEvaluator(labelCol="next_lat", predictionCol="prediction", metricName="rmse")
    rmse_lat = evaluator_lat.evaluate(predictions_lat)

    # Evaluate longitude predictions
    evaluator_lon = RegressionEvaluator(labelCol="next_lon", predictionCol="prediction", metricName="rmse")
    rmse_lon = evaluator_lon.evaluate(predictions_lon)

    print(f"Root Mean Squared Error (RMSE) for latitude: {rmse_lat}")
    print(f"Root Mean Squared Error (RMSE) for longitude: {rmse_lon}")

# Function to make predictions with loaded models
def make_predictions(model_lat, model_lon, lat, lon):
    data = [(lat, lon)]
    schema = StructType([StructField("lat", DoubleType(), True), StructField("lon", DoubleType(), True)])
    df = spark.createDataFrame(data, schema)

    assembler = VectorAssembler(inputCols=["lat", "lon"], outputCol="features")
    df = assembler.transform(df)

    pred_lat = model_lat.transform(df).select("prediction").collect()[0][0]
    pred_lon = model_lon.transform(df).select("prediction").collect()[0][0]

    return pred_lat, pred_lon

# Train the models
model_lat, model_lon, test_data = model_trainer("/tmp/data.csv")

# Save the models
save_models(model_lat, model_lon, "/tmp/tapPositions/model_lat", "/tmp/tapPositions/model_lon")

# Load the models
loaded_model_lat, loaded_model_lon = load_models("/tmp/tapPositions/model_lat", "/tmp/tapPositions/model_lon")

# Evaluate the models
evaluate_models(loaded_model_lat, loaded_model_lon, test_data)

# Test the models with sample data
test_lat, test_lon = 0.21302492916584015, 0.4323120564222336
predicted_lat, predicted_lon = make_predictions(loaded_model_lat, loaded_model_lon, test_lat, test_lon)

print(f"Predicted next position: lat={predicted_lat}, lon={predicted_lon}")