import express from 'express';
import CommonController from './Controllers/commonController.js';
const router = express.Router();

// Testing
router.get(`${process.env.BASE_PATH}/check`, (req, res) => { console.log('Router working fine..'); res.send('working fine..') });

// APIs
router.get(`${process.env.BASE_PATH}/games/launch`, CommonController.gamesLaunch);
router.post(`${process.env.BASE_PATH}/login`, CommonController.login);
router.post(`${process.env.BASE_PATH}/bet`, CommonController.bet);
router.post(`${process.env.BASE_PATH}/close/:userId/:token/:timestamp`, CommonController.close);


export default router;