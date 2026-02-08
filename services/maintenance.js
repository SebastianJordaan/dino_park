const broker = require("../broker");
const db = require("../db");

function add30Days(dateStr) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

broker.subscribe("service:maintenance", (event) => {
  db.get("SELECT * FROM dinos WHERE location = ?", [event.location], (err, dino) => {
    if (err) return console.error(err);

    // If there is a dino still in the area schedule maintenance for 30 days later
    let maintenanceDue = dino ? add30Days(event.time) : null;
    db.run(
      "UPDATE grid SET repair_required = 0, lastMaintenance = ?, maintenanceDue = ? WHERE location = ?",
      [event.time, maintenanceDue, event.location],
      (err2) => {
        if (err2) console.error("Maintenance log error:", err2);
        else console.log(`Maintenance performed at ${event.location}`);
      }
    );
  });
});