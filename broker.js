const Redis = require("ioredis");

// Use the environment variable 'REDIS_HOST' running in Docker
const redisHost = process.env.REDIS_HOST

const publisher = new Redis({ host: redisHost });
const subscriber = new Redis({ host: redisHost });

module.exports = {
  publish: async (channel, message) => {
    // ... (keep existing logic)
    await publisher.publish(channel, JSON.stringify(message));
  },
  subscribe: (channel, callback) => {
    // ... (keep existing logic)
    subscriber.subscribe(channel);
    subscriber.on("message", (ch, message) => {
      if (ch === channel) callback(JSON.parse(message));
    });
  }
};