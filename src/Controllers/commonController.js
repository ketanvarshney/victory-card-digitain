import axios from 'axios';
import jwt from 'jsonwebtoken';
import {infoLog, logError, apiLog} from '../LogConfig/index.js'
import GameLaunch from '../Services/gameLaunchServices.js';
import Bet from '../Services/betServices.js';
import Common from '../Services/commonServices.js';
import Player from '../Services/playerServices.js'
import { postReq, isValidTwoDecimalNumber } from '../Utils/commonUtils.js';
import { redisClient, redisDB } from '../DbConfig/redisConnection.js';
const gameServices = new GameLaunch;
const commonServices = new Common;
const betServices = new Bet;
const playerServices = new Player;

const gamesLaunch = async (req, res) => {
    try{
        const body = req.query;
        res.setHeader("Content-Type", "application/json");

        // console.log('Payload Data ::::', body, body.token);
        apiLog(`req: GAME_LAUNCH, data: ${JSON.stringify(body)}`);

        // Authentication....
        let authenticatedData = await commonServices.authService(body.token);
        if(!authenticatedData) throw new Error(`ERROR_IN_AUTHENTICATED_DATA`);
        apiLog(`res: AUTHENTICATED, data: ${JSON.stringify(authenticatedData)}`);

        console.log( 'Authenticated_Data>>', authenticatedData);
        if(authenticatedData.status === 'ERROR'){
            return res.status(401).send(authenticatedData);
        }
        
        // Game Launch
        const gameResult = await gameServices.gameLaunch(body, authenticatedData.data);
        if(!gameResult) throw new Error(`ERROR_IN_GAME_RESULT`);
        apiLog(`res: GAME_LAUNCH, data: ${JSON.stringify(gameResult)}`);

        let wsToken = await redisClient.get(`${redisDB}-User:${gameResult.userId}`);
        // console.log(wsToken);
        if(wsToken) {
            await redisClient.del(`${redisDB}-Token:${wsToken}`);
        }
        await redisClient.set(`${redisDB}-User:${gameResult.userId}`, gameResult.token, 'EX', 3600);
        
        const updatedUrl = `${process.env.BASE_URL}?userId=${gameResult.userId}&token=${gameResult.token}`
        
        return res.status(200).send(updatedUrl);
        // return res.status(200).redirect(updatedUrl);
        
    }catch(err) {   
        console.log('ERROR :::::', err.stack ? err.stack : err);
        logError(err);
        return res.status(500).json({ status: 'ERROR', message: "INTERNAL_SERVER_ERROR", error: err.message ? err.message : err });
    }
}

const login = async (req, res) => {
    try {
        const { userId, token } = JSON.parse(req.body.data);
        
        if(!userId || !token || token === '' || userId === ''){
            // console.log(userId, token, 'token');
            logError(`req: LOGIN , data: ${JSON.stringify(req.body)}`);
            return res.status(401).json({status: 'ERROR', message: 'Bad Request: Required fields is missing or empty', data: null});
        }

        const verifyToken = playerServices.isTokenValid(userId, token);
        console.log('checking...')
        if(!verifyToken){
            logError(`req: LOGIN_TOKEN , data: ${verifyToken}`)
            return res.status(401).json({status: 'ERROR', message: 'Bad Request: Unauthorized-Token is invalid', data: verifyToken});
        }

        const checkSession = await playerServices.hasPreviousSession(userId, token);
        
        if(checkSession){
            logError(`req: LOGIN_SESSION , data: ${checkSession}`);
            return res.status(409).json({status: 'UNAUTHORIZED', message: 'Bad Request: Previous session is opened. Please close the previous game or start the game from the lobby...', data: checkSession});
        }

        let result = await playerServices.authorizePlayerAPI(userId, token);

        if(result.status === 'ERROR') {
            return res.status(401).json({...result});
        }

        await redisClient.set(`${redisDB}-Token:${token}`, result.timestamp, "EX", 3600);
        await redisClient.set(`${redisDB}-User:${userId}`, token, "EX", 3600);
        return res.status(200).json({...result});

    }catch(err) {
        console.log(`ERROR ::::: ${err.stack ? err.stack : err}`);
        logError(err);
        return res.status(500).json({ status: 'ERROR', message: 'INTERNAL_SERVER_ERROR', error: err.message ? err.message : err});
    }
}

const bet = async (req, res) => {
    try{
        let { token, betAmount, userId, betType, timestamp } = JSON.parse(req.body.data);
        const timeStamp = timestamp;
        // console.log(token, betAmount, userId, betType, timeStamp, req.body)
        
        if ( !userId || !token || !betType || !isValidTwoDecimalNumber(betAmount) || !timeStamp) { 
            return res.status(400).json({status: 'ERROR', message: 'Bad Request: Required fields is missing or empty', error: null});
        } 
        console.log('reee')
        const verifyToken = playerServices.isTokenValid(userId, token);
        
        if(!verifyToken){
            logError(`req: BET_TOKEN , data: ${verifyToken}`)
            return res.status(401).json({status: 'ERROR', message: 'Bad Request: Unauthorized-Token is invalid', data: verifyToken});
        }
        
        // if it comes true, then it will go in if block otherwise continue to verification res
        const checkSession = await playerServices.verifyCurrentSession(token, timeStamp);
        console.log(checkSession, '| CHECKSESSION |')
        if(checkSession){
            logError(`req: BET_SESSION , data: ${checkSession}`)
            return res.status(409).json({status: 'UNAUTHORIZED', message: 'Bad Request: Previous session is opened. Please close the previous game or start the game from the lobby...', data: checkSession});
        }

        if(betType != "red" && betType != "black" && betType != "Spade" && betType != "Heart" && betType != "Diamond" && betType != "Club"){
            return res.status(401).json({status: "ERROR", message: "Wrong Input!", data: null});
        }
        
        const operationType = 1;
        betAmount = parseFloat(betAmount); 
        console.log('BET_Amount :>>>>>>>> ',betAmount);
        
        let verificationResponse = await playerServices.verifyPlayer(userId, betAmount);
        // console.log(verificationResponse, 'verification_res');
        
        if(verificationResponse.status === 'SUCCESS') {
            
            let result = await betServices.userBet( userId, betAmount, operationType, verificationResponse.data, betType);
            console.log('RESULT :>>>>>>>>', result);

            if(result.status !== 'SUCCESS'){ 
                
                return res.status(401).json({status: 'ERROR', message: 'INTERNAL_ERROR', data: result.message ? result.message : result.errorcode});
            }
            
            await redisClient.set(`${redisDB}-Token:${token}`, timeStamp, "EX", 3600);
            await redisClient.set(`${redisDB}-User:${userId}`, token, "EX", 3600);
            return res.status(200).json(result );
        
        } else {
            return res.status(401).json({...verificationResponse});
        }    
    }catch(err) {
        console.log(`ERROR ::::: ${err.stack ? err.stack : err}`);
        logError(err);
        return res.status(500).json({ status: 'ERROR', message: 'INTERNAL_SERVER_ERROR', error: err.message ? err.message : err});
    }
}

const close = async (req, res) => {
    let userId = (req.params.userId).toString();
    let token = (req.params.token).toString();
    let timestamp = (req.params.timestamp).toString();

    console.log('Payload>>', userId, timestamp);

    if(!playerServices.isTokenValid(userId, token)) {
        console.log('token. check')
        return res.status(401).json({status:"ERROR", message: "Token is invalid!"});
    }
    else if (await playerServices.verifyCurrentSession(token, timestamp)) {
        console.log('currentSession. check');
        return res.status(401).json({
        status: "UNAUTHORIZED",
        message: "Previous session is opened. Please close the previous game or start the game from the lobby...",
        });
    }
    
    console.log('Timestamp Deleted.')
    await redisClient.del(`${redisDB}-Token:${token}`);

    res.status(200).json({});
}


export default { gamesLaunch, login, bet, close }
