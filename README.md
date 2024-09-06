# taposition

> 

## About

This project uses a combination of technologies to ingest and visualize position information from video-games and applications while making predictions about the next position.
Technologies used:
• PlayCanvas (Game engine)
• Logstash
• Apache Kafka
• Apache Zookeeper
• Apache Spark
• Elasticsearch
• Kibana
• GeoServer

## Getting Started

1. Create a new `docker network`:
    ```
    docker network create --driver bridge --subnet 10.0.100.0/24 tap
    ```
2. Enter the folder:
    ```
    cd ./path/to/taposition
    ```
3. Modify the line 72 of  `compose.yml` to execute the positionsTrainer.py script to train the models
4. Start the docker containers:
    ```
    docker-compose up
    ```
5. Modify the line 72 of  `compose.yml` to execute the positionsApp.py script to train the models
6. Rerun the compose

7. Import the kibana dashboard
