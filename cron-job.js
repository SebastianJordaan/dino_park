const db = require("./db");

// --- Utility: Add hours to a date ---
function addHours(dateStr, hours) {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + hours);
  return date;
}

// --- Scheduled Job Logic ---
function updateStatus() {
  const now = new Date();
  console.log(`[Cron] Running scheduled checks at ${now.toISOString()}...`);

  // 1. Update Dino Hunger
  db.all("SELECT * FROM dinos", [], (err, dinos) => {
    if (err) return console.error("[Cron Error] Dinos:", err.message);

    dinos.forEach((dino) => {
      if (dino.lastFed) {
        const fedTime = new Date(dino.lastFed);
        const digestionEnd = addHours(fedTime, dino.digestion_period_in_hours);

        // If time is up and they aren't already marked hungry
        if (digestionEnd < now && !dino.is_hungry) {
          console.log(`[Hunger Update] ${dino.name} is now hungry!`);
          db.run("UPDATE dinos SET is_hungry = 1 WHERE id = ?", [dino.id]);
        }
      }
    });
  });

  // 2. Update Grid Maintenance and Safety Status
  db.all("SELECT * FROM grid", [], (err, cells) => {
    if (err) return console.error("[Cron Error] Grid:", err.message);

    cells.forEach((cell) => {
      // A. Check Maintenance Overdue
      if (cell.maintenanceDue && new Date(cell.maintenanceDue) < now) {
        if (!cell.repair_required) {
          console.log(`[Maintenance] Repair required at ${cell.location}`);
          db.run("UPDATE grid SET repair_required = 1 WHERE location = ?", [cell.location]);
        }
      }

      // B. Update Safety Status based on Dinos in the cell
      db.all("SELECT * FROM dinos WHERE location = ?", [cell.location], (err2, dinosInCell) => {
        if (err2) return console.error(err2);

        let status = "NA";
        
        if (dinosInCell.length > 0) {
          status = "Safe"; // Default to Safe if dinos exist

          for (const dino of dinosInCell) {
            // Priority 1: Any hungry carnivore makes it Unsafe immediately
            if (!dino.herbivore && dino.is_hungry) {
              status = "Unsafe";
              break; 
            } 
            // Priority 2: Satiated carnivores are Safe
            else if (!dino.herbivore && !dino.is_hungry) {
              status = "Safe";
            } 
            // Priority 3: Herbivores are Safe
            else if (dino.herbivore) {
              status = "Safe";
            }
          }
        }

        // Only update if status has changed to save DB writes
        if (status !== cell.grid_status) {
          console.log(`[Status Update] Grid ${cell.location} is now ${status}`);
          db.run("UPDATE grid SET grid_status = ? WHERE location = ?", [status, cell.location]);
        }
      });
    });
  });
}

// --- Start the Scheduler ---
// Run every 5 seconds (5 * 1000 milliseconds)
console.log("[Cron] Job scheduler started.");
setInterval(updateStatus, 5 * 1000);

// Run once immediately on startup
updateStatus();