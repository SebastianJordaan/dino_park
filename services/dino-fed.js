const broker = require("../broker");
const db = require("../db");

broker.subscribe("service:dino_feed", (event) => {
  db.run("UPDATE dinos SET lastFed = ?, is_hungry = 0 WHERE id = ?", 
    [event.time, event.id], 
    (err) => {
      if(err) console.error("Feed error:", err);
      else console.log(`Dino ${event.id} fed.`);
    });
});