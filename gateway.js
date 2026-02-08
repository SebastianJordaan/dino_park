const express = require("express");
const bodyParser = require("body-parser");
const broker = require("./broker");
const db = require("./db");

const app = express();
app.use(bodyParser.json());

// Helper for throttling (Race condition)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processAndPublish(events, source = "API") {
  let eventList = Array.isArray(events) ? events : [events];

  if (eventList.length > 1) {
    console.log(`[${source}] Sorting ${eventList.length} events...`);
    eventList.sort((a, b) => new Date(a.time) - new Date(b.time));
  }

  const eventMap = {
    "dino_added": "service:dino_add",
    "dino_removed": "service:dino_remove",
    "dino_location_updated": "service:dino_move",
    "dino_fed": "service:dino_feed",
    "maintenance_performed": "service:maintenance"
  };

  let successCount = 0;

  for (const event of eventList) {
    try {
      const channel = eventMap[event.kind];
      if (channel) {
        // We await the broker publish to ensure sequential order in the pipe
        await broker.publish(channel, event);
        
        // (Race condition prevention) Figuring out how to fix the race conditions properly is very dificult
        await sleep(150); 
        
        successCount++;
        if (successCount % 10 === 0) console.log(`[${source}] Progress: ${successCount}/${eventList.length}`);
      }
    } catch (err) {
      // If one fails, log it but DON'T stop the loop
      console.error(`[${source}] Failed to publish event ${event.id || event.kind}:`, err.message);
    }
  }
  
  console.log(`[${source}] Finished. Published ${successCount} of ${eventList.length} events.`);
}

// --- Seeder and Endpoints  ---

function checkAndSeed() {
  db.get("SELECT COUNT(*) as count FROM dinos", [], async (err, row) => {
    if (err) return console.error("[Seeder] DB Check failed:", err);
    if (row && row.count === 0) {
      console.log("[Seeder] Database empty. Fetching data...");
      try {
        const response = await fetch("https://dinoparks.herokuapp.com/nudls/feed");
        const seedEvents = await response.json();
        await processAndPublish(seedEvents, "Seeder");
      } catch (e) { console.error("[Seeder] Error:", e.message); }
    }
  });
}

// --- API Endpoints ---

app.post("/event", async (req, res) => {
  try {
    await processAndPublish(req.body);
    res.status(202).json({ message: "Events accepted and processing in order" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Broker error" });
  }
});

// GET Endpoints For Debugging and easy access to data
app.get("/dinos", (req, res) => {
  db.all("SELECT * FROM dinos", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/grid", (req, res) => {
  db.all("SELECT * FROM grid", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Start Server ---
app.listen(3000, () => {
  console.log("Gateway running on port 3000");
  
  // Run the seeder check immediately on startup
  checkAndSeed();
});