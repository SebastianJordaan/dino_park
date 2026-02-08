# 🦖 DinoParks Event-Driven System

A microservices-based system for managing dinosaur park operations. This project transitions from a monolithic architecture to an **Event-Driven Architecture (EDA)** using **Node.js**, **Express**, **Redis** (as the message broker), and **Docker**.

## 🏗 Architecture

The system is composed of several decoupled services that communicate via a Redis message broker.

* **API Gateway (`gateway.js`):** The entry point. Accepts HTTP requests, validates them, and publishes events to Redis. It also auto-seeds the database on startup.
* **Message Broker (Redis):** Queues and routes messages to the correct consumer services.
* **Consumer Services:** Independent Node.js processes that listen for specific events and update the shared SQLite database:
* `consumer-add`: Handles `dino_added`
* `consumer-remove`: Handles `dino_removed`
* `consumer-move`: Handles `dino_location_updated`
* `consumer-feed`: Handles `dino_fed`
* `consumer-maintenance`: Handles `maintenance_performed`


* **Cron Job (`cron-job.js`):** A background service that runs every 60 seconds to update dinosaur hunger and grid safety status.
* **Dashboard (`dino_park.js`):** A visual UI running on port 3001 to view the live grid status.
* **Shared Database:** A persistent SQLite database (`park.db`) accessed by all services via a shared Docker volume.

## 🚀 Getting Started

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Installation & Run

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd <your-repo-folder>

```


2. **Start the system:**
Run the following command to build the images and start all services (Redis, Gateway, Consumers, Dashboard):
```bash
docker-compose up --build

```


3. **Verify it's working:**
* **API Gateway:** `http://localhost:3000`
* **Dashboard:** `http://localhost:3001`


*Note: On first startup, the system will automatically fetch seed data from the external API and populate the grid.*

## 📡 API Endpoints

### 1. Send an Event (POST)

To manually trigger an event, send a POST request to the gateway.

**Endpoint:** `POST http://localhost:3000/event`

**Example Payload (Add Dino):**

```json
{
  "kind": "dino_added",
  "id": 99,
  "name": "Rex",
  "species": "Tyrannosaurus Rex",
  "gender": "male",
  "digestion_period_in_hours": 4,
  "herbivore": false,
  "park_id": 1,
  "time": "2023-11-01T10:00:00Z"
}

```

**Other Event Kinds:**

* `dino_location_updated` (requires `dinosaur_id`, `location`, `time`)
* `dino_fed` (requires `id`, `time`)
* `maintenance_performed` (requires `location`, `time`)
* `dino_removed` (requires `id`)

### 2. View Data (GET)

* **Get All Dinos:** `GET http://localhost:3000/dinos`
* **Get Grid Status:** `GET http://localhost:3000/grid`

## 🖥 Dashboard

Visit **http://localhost:3001** to view the Park Operations Dashboard.

* **Green Cells:** Safe (Herbivores or satiated Carnivores).
* **Red Cells:** Unsafe (Hungry Carnivores).
* **Wrench Icon:** Maintenance is required.

## 🛠 Troubleshooting

**1. "Database not found" or empty data**
Ensure the Docker volume is mounting correctly. The services expect the DB at `/data/park.db`.

* Check if the `park_data/` folder exists in your project root.
* If data seems stuck, run `docker-compose down` to force the SQLite WAL file to merge.

**2. Port Conflicts**
If you see `EADDRINUSE`, stop other processes on ports 3000, 3001, or 6379.

```bash
docker-compose down
docker-compose up

```

**3. Redis Connection Error**
Ensure Docker Desktop is running. The services connect to the host `redis` (defined in docker-compose), not `localhost`.

## 📂 Project Structure

```

/park-system
  ├── db.js                     # Shared Database Connection
  ├── broker.js                 # Redis Messaging Wrapper
  ├── gateway.js                # The HTTP Entry Point (Express)
  ├── services/                 # Consumer logic for each event type
  │   ├── dino-added.js
  │   ├── dino-removed.js
  │   ├── dino-moved.js
  │   ├── dino-fed.js
  │   └── maintenance.js
  ├── cron-job.js               # The background status updater
  ├── dino_park.js              # Dashboard Server
  ├── views/
  │   └── index.ejs
  ├── public/                   # Images for web server
  │   ├── dino-parks-wrench.png
  │   └── dinoparks-logo.png
  ├── docker-compose.yml        # Container orchestration
  └── Dockerfile                # Unified build file
```