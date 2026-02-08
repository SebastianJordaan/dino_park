const broker = require("../broker");
const db = require("../db");

function add30Days(dateStr) { /* ... same helper ... */ }

broker.subscribe("service:maintenance", (event) => {
  db.get("SELECT * FROM dinos WHERE location = ?", [event.location], (err, dino) => {
    if (err) return console.error(err);
    
    let maintenanceDue = dino ? add30Days(event.time) : null;
    db.run(
      "UPDATE grid SET repair_required = 0, lastMaintenance = ?, maintenanceDue = ? WHERE location = ?",
      [event.time, maintenanceDue, event.location],
      (err2) => {
        if(err2) console.error("Maintenance log error:", err2);
        else console.log(`Maintenance performed at ${event.location}`);
      }
    );
  });
});