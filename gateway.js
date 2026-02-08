const express = require("express");
const bodyParser = require("body-parser");
const broker = require("./broker");
const db = require("./db");

const app = express();
app.use(bodyParser.json());

// --- Helper: Publish Events to Broker ---
// This handles mapping events to channels (used by API and Seeder)
async function processAndPublish(events) {
  const eventList = Array.isArray(events) ? events : [events];
  
  const eventMap = {
    "dino_added": "service:dino_add",
    "dino_removed": "service:dino_remove",
    "dino_location_updated": "service:dino_move",
    "dino_fed": "service:dino_feed",
    "maintenance_performed": "service:maintenance"
  };

  console.log(`[Gateway] Processing ${eventList.length} events...`);

  for (const event of eventList) {
    const channel = eventMap[event.kind];
    if (channel) {
      await broker.publish(channel, event);
    } else {
      console.warn(`[Gateway] Unknown event kind: ${event.kind}`);
    }
  }
}

// --- Auto-Seeder Logic ---
function checkAndSeed() {
  // Check if Dinos table is empty
  db.get("SELECT COUNT(*) as count FROM dinos", [], async (err, row) => {
    if (err) return console.error("[Seeder] DB Check failed:", err);

    if (row.count === 0) {
      console.log("[Seeder] Database is empty. Fetching seed data...");
      
      try {
        // Node 18 has built-in fetch
        const response = await fetch("https://dinoparks.herokuapp.com/nudls/feed");
        
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const seedEvents = await response.json();
        
        console.log(`[Seeder] Downloaded ${seedEvents.length} events. Publishing to broker...`);
        
        // Send to Redis (Just like a normal API request)
        await processAndPublish(seedEvents);
        
        console.log("[Seeder] Seeding complete.");
      } catch (fetchError) {
        console.error("[Seeder] Failed to fetch seed data:", fetchError.message);
      }
    } else {
      console.log(`[Seeder] Database already has ${row.count} dinos. Skipping seed.`);
    }
  });
}

// --- API Endpoints ---

app.post("/event", async (req, res) => {
  try {
    await processAndPublish(req.body);
    res.status(202).json({ message: "Events accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Broker error" });
  }
});

// GET Endpoints (for Dashboard)
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