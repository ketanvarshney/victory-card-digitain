import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import https from 'https';
import fs from 'fs';
import router from './src/router.js';

import dbConnection from './src/DbConfig/dbConnection.js'
import { redisClient, redisDB } from './src/DbConfig/redisConnection.js';
import cron from './src/Cron/index.js';

const app = express();
const port = process.env.PORT || 4000;
const DB_NAME = process.env.DB_NAME;
const DB_URL = process.env.DB_URL;
dbConnection(DB_NAME, DB_URL);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

const whitelist = ["https://gametimetec.com"];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use((req, res, next) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "1; mode=block");
  res.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

let server;
if (process.env.NODE_ENV === "production") {
  app.use(cors(corsOptions));
  // SERVER OPTIONS
  const options = {
    key: fs.readFileSync("/home/ec2-user/gametimetec_ssl/private.key"),
    cert: fs.readFileSync("/home/ec2-user/gametimetec_ssl/combined.pem"),
  };
  server = https.createServer(options, app);
} else {
  app.use(cors());
  server = http.createServer(app);
}

cron.startCron(true)

// Routing 
app.use('/', router);


server.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
})
