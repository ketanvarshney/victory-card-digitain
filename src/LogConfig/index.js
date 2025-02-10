import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTodayDateTime } from '../Utils/commonUtils.js';

const saveLogs = (message, fileName) => {
    const timestamp = getTodayDateTime();
    const todayDate = timestamp.split(' ')[0];

    // const fileLinePath = new Error().stack.split("\n")[3].trim().split(" ")[2];
    const fileLinePath = new Error().stack.split("\n")[3].trim();

    const finalMessage = `${timestamp} ~ ${fileLinePath} ~ ${message}\n`;
    
    const __filename = fileURLToPath(import.meta.url); 
    const __dirname = path.dirname(__filename);

    // Define the LoggingData directory path
    const logDir = path.join(__dirname, '..', 'Logs');

    // Ensure the LoggingData directory exists
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Define the log file path inside LoggingData
    const filePath = path.join(logDir, `${fileName}-${todayDate}.log`); 
    // Change Directory on the server outside nodejs server
    // const filePath = path.join(__dirname, `${fileName}-${todayDate}.log`);

    fs.appendFile(filePath, finalMessage, (err) => {
        if (err) {
            console.error(`Error writing to ${fileName} file:`, err);
        }
    });
}

export function infoLog (message) {
    saveLogs(message, 'info')
}

export function logError (message) {
    saveLogs(message, 'error');
}

export function logErrorMessage (message) {
    saveLogs(message, 'error');
}

export function apiLog (message) {
    saveLogs(message, 'api');
}

export function dbLog (message) {
    saveLogs(message, 'db');
}