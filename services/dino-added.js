const broker = require("../broker");
const db = require("../db");

// Assume dino starts hungry when entering park for safety
broker.subscribe("service:dino_add", (event) => {
  const stmt = db.prepare(`INSERT INTO dinos 
    (id, name, species, gender, digestion_period_in_hours, herbivore, time, park_id, location, is_hungry)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run(
    event.id, event.name, event.species, event.gender,
    event.digestion_period_in_hours, event.herbivore ? 1 : 0,
    event.time, event.park_id, null, true,
    (err) => {
      if (err) console.error("Error adding dino:", err.message);
      else console.log(`Dino ${event.name} added successfully.`);
    }
  );
  stmt.finalize();
});