from kafka import KafkaConsumer
from json import loads
import time
from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS

# Setup Flask and SocketIO
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Configure CORS
socketio = SocketIO(app, cors_allowed_origins="*")  # Allow all origins

def consume_predictions():
    while True:
        try:
            consumer = KafkaConsumer(
                'predictions', 
                bootstrap_servers=['kafkaServer:9092'],
                value_deserializer=lambda x: loads(x.decode('utf-8')),
                auto_offset_reset='latest',
                enable_auto_commit=True,
            )
            if consumer.bootstrap_connected():
                print("Connected to Kafka")
                break
        except Exception as e:
            print(f"Failed to connect to Kafka: {e}. Retrying in 5 seconds...")
            time.sleep(5)

    # Process each message in the 'predictions' topic
    for message in consumer:
        try:
            print(f"Received message: {message.value['predicted_location']}")
            predicted_location = message.value['predicted_location']
            lon = predicted_location['lon']
            lat = predicted_location['lat']
            if abs(lat) > 20 or abs(lon) > 20:
                print(f"Predicted location out of bounds: {predicted_location}")
                # Emit the 'obstacles' event with the location data
                socketio.emit('obstacles', {'lon': lon, 'lat': lat})
        except Exception as e:
            print(f"Error processing message: {e}")


#print if a client connects
@socketio.on('connect')
def handle_connect():
    print('Client connected')

#print if a client disconnects
@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


if __name__ == '__main__':
    print("Starting consuming predictions...")
    
    # Run Kafka consumer in a separate thread
    from threading import Thread
    consumer_thread = Thread(target=consume_predictions)
    consumer_thread.start()
    
    # Start Flask-SocketIO server
    socketio.run(app, host='0.0.0.0', port=8590, allow_unsafe_werkzeug=True)

