from __future__ import print_function

import sys
import numpy

from pyspark import SparkContext
from pyspark.sql import SparkSession
from pyspark.streaming import StreamingContext
from pyspark.sql.dataframe import DataFrame
from pyspark.sql.functions import col, expr, from_json, abs as spark_abs
from pyspark.sql.types import StructType, TimestampType, StructField, DoubleType, StringType

from pyspark.ml.regression import LinearRegression
from pyspark.ml.feature import VectorAssembler
from pyspark.ml import Pipeline
from pyspark.ml.pipeline import PipelineModel

from pyspark.conf import SparkConf
import requests

from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from threading import Thread

# Flask and SocketIO setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Configure CORS
socketio = SocketIO(app, cors_allowed_origins="*")  # Allow all origins

# Start Flask-SocketIO server in a separate thread
from threading import Thread

def run_flask_socketio():
    socketio.run(app, host='0.0.0.0', port=8590, allow_unsafe_werkzeug=True)

flask_thread = Thread(target=run_flask_socketio)
flask_thread.start()

# Function to emit WebSocket events if out of bounds
def emit_event_if_out_of_bounds(df):
    # Filter out-of-bounds locations
    out_of_bounds_df = df.filter((spark_abs(col("predicted_location.lat")) > 20) | (spark_abs(col("predicted_location.lon")) > 20))
    
    # Collect rows to process them in local context
    rows = out_of_bounds_df.collect()
    for row in rows:
        predicted_location = row['predicted_location']
        lon = predicted_location['lon']
        lat = predicted_location['lat']
        print(f"Predicted location out of bounds: {predicted_location}")
        socketio.emit('obstacles', {'lon': lon, 'lat': lat})

def create_index_if_not_exists(index_name, mapping_file):
    url = f'http://elasticsearch:9200/{index_name}'
    headers = {'Content-Type': 'application/json'}
    
    # Check if the index exists
    response = requests.head(url)
    
    if response.status_code == 404:  # Index does not exist
        with open(mapping_file, 'r') as file:
            mapping = file.read()
        response = requests.put(url, headers=headers, data=mapping)
        if response.status_code == 200:
            print(f"Index '{index_name}' created successfully.")
        else:
            print(f"Failed to create index '{index_name}': {response.json()}")
    elif response.status_code == 200:  # Index already exists
        print(f"Index '{index_name}' already exists.")
    else:
        print(f"Error checking index '{index_name}': {response.status_code} {response.text}")

# Configuration for Elasticsearch
elasticIndex = "logs_position"
mappingFile = "/opt/tap/mapping.json"

create_index_if_not_exists(elasticIndex, mappingFile)

# Configuration for Spark
sparkConf = SparkConf().set("es.nodes", "elasticsearch").set("es.port", "9200")

# Initialize Spark session
spark = SparkSession.builder.appName("TapPosition").config(conf=sparkConf).config("spark.executor.cores", "2").config("spark.streaming.kafka.maxRatePerPartition", "15").config("spark.streaming.receiver.maxRate", "0").config("spark.streaming.backpressure.enabled", "true").getOrCreate()
spark.sparkContext.setLogLevel("ERROR")

kafkaServer = "kafkaServer:9092"
topic = "positions"
modelPath = "/tmp/tapPositions/model"

# Read data from Kafka
df = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", kafkaServer) \
    .option("failOnDataLoss", False) \
    .option("subscribe", topic) \
    .load()

# Define the schema for the data from Kafka
schema = StructType([
    StructField(name='@timestamp', dataType=TimestampType(), nullable=True),
    StructField(name='location', dataType=StructType([
        StructField(name='lat', dataType=DoubleType(), nullable=True),
        StructField(name='lon', dataType=DoubleType(), nullable=True)
    ]), nullable=True),
    StructField(name='source', dataType=StructType([
        StructField(name='lat', dataType=DoubleType(), nullable=True),
        StructField(name='lon', dataType=DoubleType(), nullable=True)
    ]), nullable=True),
    StructField(name='identifier', dataType=StringType(), nullable=True),
    StructField(name='destination', dataType=StructType([
        StructField(name='lat', dataType=StringType(), nullable=True),
        StructField(name='lon', dataType=StringType(), nullable=True)
    ]), nullable=True),
    StructField(name='parameter', dataType=StringType(), nullable=True)
])

# Deserialize the JSON data and apply the schema
parseDf = df.selectExpr("CAST(value AS STRING) as json").select(from_json(col("json"), schema).alias("data")).select("data.*")

# Select the relevant columns 
positionsDf = parseDf.selectExpr("location.lat AS next_lat", "location.lon AS next_lon",
                                 "source.lat AS lat", "source.lon AS lon", "`@timestamp` AS timestamp", "identifier AS identifier", "destination.lat AS destination_lat", "destination.lon AS destination_lon")

# Load the trained models
model_lat = PipelineModel.load(modelPath + "_lat")
model_lon = PipelineModel.load(modelPath + "_lon")

# Assemble features for prediction
assembler = VectorAssembler(inputCols=["lat", "lon"], outputCol="features", handleInvalid="skip")
positionsDf = assembler.transform(positionsDf)

# Make predictions on streaming data
predictions_lat = model_lat.transform(positionsDf).withColumnRenamed("prediction", "pred_lat")
predictions_lon = model_lon.transform(positionsDf).withColumnRenamed("prediction", "pred_lon")

# Ensure the features are properly aligned
predictions_lat = predictions_lat.select("lat", "lon", "next_lat", "next_lon", "pred_lat", "timestamp", "identifier", "destination_lat", "destination_lon")
predictions_lon = predictions_lon.select("lat", "lon", "next_lat", "next_lon", "pred_lon", "timestamp", "identifier", "destination_lat", "destination_lon")

# Join the two DataFrames on their original features
predictions = predictions_lat.join(predictions_lon, on=["lat", "lon", "next_lat", "next_lon", "timestamp", "identifier", "destination_lat", "destination_lon"])

# Add the prediction columns to the DataFrame
predictions = predictions.withColumn("final_next_lat", col("pred_lat")).withColumn("final_next_lon", col("pred_lon"))

# Drop the intermediate prediction columns if not needed
predictions = predictions.drop("pred_lat").drop("pred_lon")

# Manipulate (lat, lon) to geopoint and (next_lat, next_lon) to geopoint and (final_next_lat, final_next_lon) to geopoint
predictions = predictions.withColumn("predicted_location", expr("struct(final_next_lat as lat, final_next_lon as lon)")).drop("final_next_lat").drop("final_next_lon")
predictions = predictions.withColumn("source", expr("struct(lat, lon)")).drop("lat").drop("lon")
predictions = predictions.withColumn("location", expr("struct(next_lat as lat, next_lon as lon)")).drop("next_lat").drop("next_lon")
predictions = predictions.withColumn("destination", expr("struct(destination_lat as lat, destination_lon as lon)")).drop("destination_lat").drop("destination_lon")

# Write to Elasticsearch and emit WebSocket events
def process_streaming_data():
    # Use foreachBatch to process each micro-batch
    def foreach_batch(batch_df, batch_id):
        # Write to Elasticsearch
        
        
        # Emit WebSocket events for out-of-bounds predictions
        emit_event_if_out_of_bounds(batch_df)
    elastic_query = predictions.writeStream \
        .option("checkpointLocation", "/tmp/positions") \
        .format("es") \
        .start(elasticIndex)
    
    query = predictions.writeStream \
        .foreachBatch(foreach_batch) \
        .outputMode("append") \
        .start()
    
    elastic_query.awaitTermination()
    query.awaitTermination()

# Process streaming data
process_streaming_data()

# Start Flask-SocketIO server
flask_thread.join()