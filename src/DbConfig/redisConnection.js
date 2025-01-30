import { Redis } from 'ioredis';

const redisClient = new Redis({
    username: process.env.REDIS_USERNAME,
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,        // Redis server port
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});


const redisDB = process.env.DB_NAME;

export { redisDB, redisClient };
