const broker = require("../broker");
const db = require("../db");

function add30Days(dateStr) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

broker.subscribe("service:dino_move", (event) => {
  // Update Dino Location
  db.run("UPDATE dinos SET location = ? WHERE id = ?", 
    [event.location, event.dinosaur_id], 
    (err) => {
      if (err) return console.error("Move failed:", err);
      
      // Update Grid Logic - schedule maintenance for 30 days later if dino has entered area
      const maintenanceDue = add30Days(event.time);
      db.run(
        "UPDATE grid SET lastVisited = ?, maintenanceDue = CASE WHEN maintenanceDue IS NULL THEN ? ELSE maintenanceDue END WHERE location = ?",
        [event.time, maintenanceDue, event.location],
        (err2) => {
          if (err2) console.error("Grid update failed:", err2);
          else console.log(`Dino moved to ${event.location}`);
        }
      );
    });
});