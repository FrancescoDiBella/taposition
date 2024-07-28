import pandas as pd

# Load the CSV file
file_path = './data.csv'
data = pd.read_csv(file_path)

# Display the first few rows of the dataframe to understand its structure
data.head()


import matplotlib.pyplot as plt

# Plot the path
plt.figure(figsize=(10, 10))

# Extracting coordinates
latitudes = data['lat'].tolist() + [data['next_lat'].iloc[-1]]
longitudes = data['lon'].tolist() + [data['next_lon'].iloc[-1]]

# Plotting the path
plt.plot(longitudes, latitudes, marker='o', linestyle='-', color='b')

# Adding labels and title
plt.xlabel('Longitude')
plt.ylabel('Latitude')
plt.title('Player Movement Path')

# Display the plot
plt.grid(True)
plt.show()



import numpy as np

# Define the size of the grid/map
grid_size = 50  # 50x50 grid

# Create an empty grid
game_map = np.zeros((grid_size, grid_size))

# Normalize coordinates to fit within the grid size
def normalize_coordinate(value, min_val, max_val, grid_size):
    return int((value - min_val) / (max_val - min_val) * (grid_size - 1))

# Extract min and max values for normalization
min_lat, max_lat = data['lat'].min(), data['lat'].max()
min_lon, max_lon = data['lon'].min(), data['lon'].max()

# Function to add path to the map
def add_path_to_map(map_grid, latitudes, longitudes, min_lat, max_lat, min_lon, max_lon, grid_size):
    for lat, lon in zip(latitudes, longitudes):
        x = normalize_coordinate(lat, min_lat, max_lat, grid_size)
        y = normalize_coordinate(lon, min_lon, max_lon, grid_size)
        map_grid[x, y] = 1  # Mark the path with 1

# Mark the player's path on the game map
add_path_to_map(game_map, latitudes, longitudes, min_lat, max_lat, min_lon, max_lon, grid_size)

# Add some obstacles (randomly for demonstration)
np.random.seed(0)  # For reproducibility
obstacles = np.random.choice(range(grid_size**2), size=100, replace=False)
for obstacle in obstacles:
    x, y = divmod(obstacle, grid_size)
    if game_map[x, y] == 0:  # Ensure not to overwrite the path
        game_map[x, y] = 2  # Mark obstacles with 2

# Plotting the game map
plt.figure(figsize=(10, 10))
plt.imshow(game_map, cmap='viridis', origin='lower')

# Adding labels and title
plt.title('Video Game Map')
plt.xlabel('Longitude')
plt.ylabel('Latitude')

# Display the plot
plt.grid(False)
plt.colorbar(label='0: Empty, 1: Path, 2: Obstacle')
plt.show()

# Aumentiamo la dimensione della griglia
grid_size = 100  # 100x100 grid

# Creiamo una nuova griglia vuota
game_map = np.zeros((grid_size, grid_size))

# Funzione per aggiungere il percorso alla mappa
def add_path_to_map(map_grid, latitudes, longitudes, min_lat, max_lat, min_lon, max_lon, grid_size):
    for lat, lon in zip(latitudes, longitudes):
        x = normalize_coordinate(lat, min_lat, max_lat, grid_size)
        y = normalize_coordinate(lon, min_lon, max_lon, grid_size)
        map_grid[x, y] = 1  # Segna il percorso con 1

# Segniamo il percorso del giocatore sulla mappa
add_path_to_map(game_map, latitudes, longitudes, min_lat, max_lat, min_lon, max_lon, grid_size)

# Aggiungiamo degli ostacoli più realistici (per esempio, muri)
# Creiamo alcuni muri orizzontali e verticali
for i in range(20, 30):
    game_map[40, i] = 2  # Muro orizzontale
    game_map[i, 60] = 2  # Muro verticale

# Assicuriamoci di non sovrascrivere il percorso
for lat, lon in zip(latitudes, longitudes):
    x = normalize_coordinate(lat, min_lat, max_lat, grid_size)
    y = normalize_coordinate(lon, min_lon, max_lon, grid_size)
    if game_map[x, y] == 2:  # Se c'è un ostacolo sul percorso, rimuoviamolo
        game_map[x, y] = 1

# Plotting the game map with improved visualization
plt.figure(figsize=(10, 10))
plt.imshow(game_map, cmap='viridis', origin='lower')

# Aggiungiamo etichette e titolo
plt.title('Mappa del Videogioco Migliorata')
plt.xlabel('Longitudine')
plt.ylabel('Latitudine')

# Display the plot
plt.grid(False)
plt.colorbar(label='0: Vuoto, 1: Percorso, 2: Ostacolo')
plt.show()
