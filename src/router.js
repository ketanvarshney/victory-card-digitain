import express from 'express';
import CommonController from './Controllers/commonController.js';
const router = express.Router();

// Testing
router.get('/check', (req, res) => { console.log('Router working fine..'); res.send('working fine..') });

// APIs
router.get('/games/launch', CommonController.gamesLaunch);
router.post('/login', CommonController.login);
router.post('/bet', CommonController.bet);
router.post('/close/:userId/:token/:timestamp', CommonController.close);


export default router;