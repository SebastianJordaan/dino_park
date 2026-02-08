const express = require("express");
const bodyParser = require("body-parser");
const broker = require("./broker");
const db = require("./db");

const app = express();
app.use(bodyParser.json());

// --- Helper: Publish Events to Broker (Sequentially & Sorted) ---
async function processAndPublish(events, source = "API") {
  // 1. Normalize to array
  let eventList = Array.isArray(events) ? events : [events];

  if (eventList.length > 1) {
    console.log(`[${source}] Sorting ${eventList.length} events by timestamp...`);
    
    // 2. CRITICAL: Sort Oldest -> Newest
    // This ensures 'dino_added' always happens before 'dino_fed'
    eventList.sort((a, b) => {
      return new Date(a.time) - new Date(b.time);
    });
  }

  const eventMap = {
    "dino_added": "service:dino_add",
    "dino_removed": "service:dino_remove",
    "dino_location_updated": "service:dino_move",
    "dino_fed": "service:dino_feed",
    "maintenance_performed": "service:maintenance"
  };

  // 3. Publish One by One
  for (const event of eventList) {
    const channel = eventMap[event.kind];
    if (channel) {
      // We use 'await' here to ensure Order is preserved in the Redis Queue
      await broker.publish(channel, event);
    } else {
      console.warn(`[${source}] Skipped unknown event kind: ${event.kind}`);
    }
  }
  
  console.log(`[${source}] Successfully published ${eventList.length} events.`);
}

// --- Auto-Seeder Logic ---
function checkAndSeed() {
  db.get("SELECT COUNT(*) as count FROM dinos", [], async (err, row) => {
    if (err) return console.error("[Seeder] DB Check failed:", err);

    if (row.count === 0) {
      console.log("[Seeder] Database is empty. Fetching seed data...");
      
      try {
        // Fetch data from external API
        const response = await fetch("https://dinoparks.herokuapp.com/nudls/feed");
        
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const seedEvents = await response.json();
        
        console.log(`[Seeder] Downloaded ${seedEvents.length} raw events.`);
        
        // --- THIS CALL NOW HANDLES THE SORTING ---
        // We pass "Seeder" as the source label for better logs
        await processAndPublish(seedEvents, "Seeder");
        
        console.log("[Seeder] Initialization complete.");
      } catch (fetchError) {
        console.error("[Seeder] Failed to fetch seed data:", fetchError.message);
      }
    } else {
      console.log(`[Seeder] Database already contains ${row.count} dinos. Skipping seed.`);
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