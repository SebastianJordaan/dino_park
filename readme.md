# 🦖 DinoParks Event-Driven System

A microservices-based system for managing dinosaur park operations. This project is an **Event-Driven Architecture (EDA)** solution using **Node.js**, **Express**, **Redis** (as the message broker), and **Docker**.

## 🏗 Architecture

The system is composed of several decoupled services that communicate via a Redis message broker.

* **API Gateway (`gateway.js`):** The entry point. Accepts HTTP requests, validates them, and publishes events to Redis. It also auto-seeds the database on startup. Running on port 3000
* **Message Broker (Redis):** Queues and routes messages to the correct consumer services.
* **Broker Service (`broker.js`):** Request broker serves to publish and subscribe for messages for all Consumer Services.
* **Consumer Services:** Independent Node.js processes that listen for specific events and update the shared SQLite database:
* `consumer-add`: Handles `dino_added`
* `consumer-remove`: Handles `dino_removed`
* `consumer-move`: Handles `dino_location_updated`
* `consumer-feed`: Handles `dino_fed`
* `consumer-maintenance`: Handles `maintenance_performed`
* **Cron Job (`cron-job.js`):** A background service that runs every 5 seconds to update dinosaur hunger and grid safety status.
* **Data base service (`db.js`):** Is used by all the services to interact with the DB and to initalize the DB on startup.
* **Dashboard (`dino_park.js`):** A visual UI running on port 3001 to view the live grid status.
* **Shared Database:** A persistent SQLite database (`park.db`) accessed by all services via a shared Docker volume.

## Architecture diagram
![Alt text](./images/Dino_park_Architecture.svg "Architecture")

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

## 🚀 Getting Started

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running with a working WSL.

### Installation & Run

1. **Clone the repository:**
```bash
git clone https://github.com/SebastianJordaan/dino_park
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

4. **On startup**

On first startup and only first startup, the system will automatically fetch seed data from the external API and populate the grid from URL
https://dinoparks.herokuapp.com/nudls/feed



## 📡 API Endpoints

### 1. Send an Event (POST)

To manually trigger an event, send a POST request to the gateway.

It can handle both single json objects or a list of json objects.

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

* **Get All Dinos:** `GET http://localhost:3000/dinos` use to check data
* **Get Grid Status:** `GET http://localhost:3000/grid` use to check data

## 🖥 Dashboard

Visit **http://localhost:3001** to view the Park Operations Dashboard.

* **Green Cells:** Safe (Herbivores or satiated Carnivores).
* **Red Cells:** Unsafe (Hungry Carnivores).
* **Wrench Icon:** Maintenance is required.

# What you would do differently if you had to do it again

Doing this assessment has taught me a lot. Implementing changes earlier than later can have big impact on a project for example if better error logic was implemented early on it is much more difficult to add it in later. Here are some important things I had wish I had done differently

* Scheme checking for requests. This would ensure more robust request handling.
* Write to the persistent database on error not just graceful shutdown. This would prevent data loss.
* Proper checking for ordering of queue, being processed in the order received or according to time stamps. Better than my current implementation.
* Run feed GET request on every startup to receive missing posts in down time. Currently does not fetch the feed on subsequent startups.
* When feed is reuploaded after startup check for events already processed and not to reprocess them.
* No dead letter queue added or retry system.
* Use better libraries that are not going to be deprecated or give warnings of memory leaks.
* Handle race conditions better with the Pub/Sub architecture instead of using sleep() to fix it, breaking the whole point of the Pub/Sub system.
* Add unit tests.
* Impliment container managment like checking container health status and restart on failure.
* Impliment a globally sequential Pub/Sub system to ensure correct processing. Kafka can also be explored.

# What you learned during the project 

I sure did learn a lot in this project. There are many technologies I have never worked with that I work here for the first time. 

* I have interacted with Redis a lot at previous jobs, never have I had to create and use it myself.
* I have used Docker for small home setup things on my own network and linux machine. Was nice learning more in-depth about it.
* Knew theoretically about a Pub/Sub system, but never implemented it myself. Was really fun to do.
* I have never created a webapp from scratch, I have always used Javascript and Typescript to interact with other systems, never to build one up.
* I learned how to make a .md file look nice.
* How complicated data in Containers and Memory can be to write to disk.
* How to use SQL Lite for the first time.
* How well AI can help, but also the gaps it has.
* Ordering in a Pub/Sub process is difficult.
* A lot about race conditions and Pub/Sub systems.
* Explore many opptions afterwards to see how this ordering Pub/Sub problem can be solved next time.


# How do you think we can improve this challenge

* Be more specific about how NUDLS. Is the GET the only way to get data? I implemented a GET at startup and afterwards the POST requests can be fed in one by one.
* Document mentions rows 0-15 but mock up and test data go from 1-16. Could be updated.
* Stegosaurus is not a herbivore in the test data. Could be fixed or left in as something funny.











# Original API documentation cleaned up

# NUDLS (New Unified Dinopark Logging System) Developer Documentation

### Version 1.4.7-a5, build 10

NUDLS is a system for allowing employees of Dinoparks Amusement and
Betting Company GMBH access to an unfiltered view of park operations.
NUDLS uses the new JSON (JavaScript Object Notation) spec which was just
ratified.

NUDLS uses the idea of a global persistent log as a unifying abstraction.
After adding a new system, NUDLS sends the newly integrated system all
previously persisted events one by one. NUDLS uses the HTTP (Hypertext
Transfer Protocol) as a transport mechanism, sending logged messages using
a POST (Personal Object Store Transfer) request.

NUDLS uses ISO standards for all datatime needs.

# Event Types

## 1. Dino Added
This event is called when new animals are added to the park. Digestion
period should be used to inform feeding schedule.
The body of this request may be any one of the following kinds (along with
a sample message attached)

**Sample Message:**
```json
{
    "kind": "dino_added",
    "name": "McGroggity",
    "species": "Tyrannosaurus rex",
    "gender": "male",
    "id": 1032,
    "digestion_period_in_hours": 48,
    "herbivore": false,
    "time": "2018-04-20T11:50:53.460Z",
    "park_id": 1
}
```

## 2. Dino Removed
This event is called when an animal is removed from the park

**Sample Message:**
```json
{
    "kind": "dino_removed",
    "id": 1032 ,
    "time": "2018-04-20T11:50:53.460Z",
    "park id": 1
}
```
## 3. Dino Location Updated
This event is called when an animal moves to a different cell in a
standardized park grid.

**Sample Message:**
```json
{
    "kind": "dino_location_updated",
    "location": "E10",
    "dinosaur_id": 1032,
    "time": "2018-04-20T11:50:53.460Z",
    "park_id": 1
}
```
## 4. Dino Fed
Indicates when a dinosaur was fed

**Sample Message:**
```json
{
    "kind": "dino_fed",
    "id": 1032,
    "time": "2018-04-20T11:50:53.460Z",
    "park_id": 1
}
```

## 5. Maintainence Performed
Indicates that a routine maintenance pass was made at the given cell
in the standardized park grid. Please see Winged Avengers: The
Dinopark Employee Handbook and Survival Guide, Page 107 for full
details on what routine maintenance activities activities entail and
how it may affect you

**Sample Message:**
```json
{
    "kind": "maintenance_performed",
    "location": "E7",
    "time": "2018-04-20T11:50:53.460Z",
    "park_id": 1
}
```