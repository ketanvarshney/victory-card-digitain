import { CronJob } from 'cron';
import { logError } from '../LogConfig/index.js';
import Pending from '../Services/pendingServices.js';
import { redisClient, redisDB } from '../DbConfig/redisConnection.js';
const pendingServices = new Pending;

let cronList = [];

async function runCronJob() {
    const lockKey = `${redisDB}-CRONLOCK:cron-lock`;
    const lockValue = Date.now();

    // Try acquiring the lock with a TTL of 55 sec
    const acquired = await redisClient.set(lockKey, lockValue, "NX", "EX", 55);

    if (!acquired) {
        console.log("Another instance is running the cron job. Skipping...");
        return;
    }

    try {
        console.log("Running the cron job...");

        const isAllResolved = await pendingServices.resolvePendings();
        console.log("isAllResolved: " + isAllResolved);

        if (isAllResolved) {
            await stopCron();
        }
    } catch (error) {
        logError(error);
        console.error("Cron Job Error:", error);
    } 
}

const startCron = async (isRestarting) => {
    try {
        let isCronRunning = false;

        if (!isRestarting) {
            isCronRunning = await redisClient.get(`${redisDB}:isCronRunning`);
            isCronRunning = isCronRunning === 'true';
        }

        if (!isCronRunning && cronList.length === 0) {
            console.log("CRON START...");
            await redisClient.set(`${redisDB}:isCronRunning`, true);

            // Run cron job every 1 minute
            // const job = new CronJob('*/1 * * * *', await runCronJob(), null, true);
            cronList.push(new CronJob('*/1 * * * *', runCronJob, null, true));
        } else {
            console.log("CRON Already running...");
        }
    } catch (error) {
        logError(error);
        console.error("Cron Start Error:", error);
    }
};

const stopCron = async () => {
    try {
        console.log("STOP...");
        await redisClient.set(`${redisDB}:isCronRunning`, false);

        console.log("Cron List SIZE: " + cronList.length);
        cronList.forEach((cron) => cron.stop());
        cronList = [];
    } catch (error) {
        logError(error);
        console.error("Cron Stop Error:", error);
    }
};

export default { startCron, stopCron };