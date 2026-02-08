const express = require("express");
const bodyParser = require("body-parser");
const broker = require("./broker");

const app = express();
app.use(bodyParser.json());

app.post("/event", async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];

  // Map incoming events to Broker Channels
  const eventMap = {
    "dino_added": "service:dino_add",
    "dino_removed": "service:dino_remove",
    "dino_location_updated": "service:dino_move",
    "dino_fed": "service:dino_feed",
    "maintenance_performed": "service:maintenance"
  };

  try {
    for (const event of events) {
      const channel = eventMap[event.kind];
      if (channel) {
        // Publish to the specific queue
        await broker.publish(channel, event);
      } else {
        console.warn(`Unknown event kind: ${event.kind}`);
      }
    }
    // Respond immediately (Async processing)
    res.status(202).json({ message: "Events accepted for processing" });
  } catch (err) {
    res.status(500).json({ error: "Broker error" });
  }
});

app.listen(3000, () => console.log("Gateway running on port 3000"));