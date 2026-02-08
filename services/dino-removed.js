const broker = require("../broker");
const db = require("../db");

broker.subscribe("service:dino_remove", (event) => {
  db.run("DELETE FROM dinos WHERE id = ?", [event.id], (err) => {
    if (err) console.error("Error removing dino:", err);
    else console.log(`Dino ID ${event.id} removed.`);
  });
});