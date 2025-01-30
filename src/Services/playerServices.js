import jwt from 'jsonwebtoken';
import { logError, dbLog } from "../LogConfig/index.js";
import { redisClient, redisDB } from '../DbConfig/redisConnection.js';
import playerModel from '../Models/playerModel.js';
import Common from './commonServices.js';
const commonServices = new Common;


class PlayerServices {
    isTokenValid (userId, token) {
        try {
            const decodedTokenData = jwt.verify(token, process.env.JWT_SECRET_KEY);
            const tokenUserId = decodedTokenData.userId ;   
            if(userId !== tokenUserId) {
                return false;
            }
            return true;
        } catch (err) {
            logError(`'JWT Verification Error::::' ${err.message}`); 
            return false;
        }
    }

    async verifyCurrentSession (token, timestamp) {
        let redisTimestamp = await redisClient.get(`${redisDB}-Token:${token}`);
        if(redisTimestamp && redisTimestamp === timestamp.toString()) {
            return false;
        }
        return true;
    }

    async hasPreviousSession (userId, token) {
        let wsToken = await redisClient.get(`${redisDB}-User:${userId}`);
        // console.log(wsToken, 'wstoken')
        if(wsToken && wsToken === token) {
            let userExists = await redisClient.get(`${redisDB}-Token:${token}`);
            // console.log(userExists, 'userexist')
            if(!userExists) {
                // console.log('reach')
                return false;
            }
        }
        return true;
    }

    async authorizePlayerAPI (userId, token) {
        try {
            const player = await playerModel.findOne({_id: userId});
            // console.log('PlayerData::::',player);

            if(player === null) {
                return {
                  status: 'ERROR',
                  message:"USER_NOT_FOUND"
                }
            }
            if(player.token !== token) {
                return {
                  status: 'UNAUTHORIZED',
                  data: {},
                  message: 'Unauthorized: You do not have permission to perform this action.'
                };
            }

            const wallet = await commonServices.balanceService(player)
            // console.log(wallet)
            if(wallet.status === 'ERROR') {
                return wallet;
            }

            let timestamp = Math.floor(new Date().getTime() / 1000);
            let username = player.playerId;

            const result = {
                status: 'SUCCESS',
                username, userId, token, timestamp,
                balance: Number(wallet.data.balance).toFixed(2),
                currencyPrefix: player.currency,
                minStake: 0.3,
                maxStake: 100
            }

            return result;

        }catch(err){
            logError(`Authorize Player Error:::: ${err.message}`); 
            return err; 
        }

    }

    async verifyPlayer (userId, betAmount) {
        try {
            let userData = await playerModel.findById(userId);
            console.log('USER DATA :>>>>>>>>>>>>>',userData);

            if(!userData) { 

                return {status: 'ERROR', message: "something went wrong!"}; 
            }

            if(userData.isBanned) return {status: 'ERROR', message: "something went wrong! user is Banned."};

            // let maxGamesAllowedInASingleDay = 1000; 
            let maxGamesAllowedInASingleDay = await redisClient.hget(`${redisDB}:Admin`, 'maxGamesAllowedInASingleDay') || process.env.SINGLE_DAY_MAX_GAMES_ALLOWED;
            // console.log(maxGamesAllowedInASingleDay, 'max');

            if(maxGamesAllowedInASingleDay && userData.todayGameCount >= Number(maxGamesAllowedInASingleDay)) {

                return {status: 'ERROR', message: "something went wrong!"};
            }
            else if(userData.todayGameCount >= Number(process.env.SINGLE_DAY_MAX_GAMES_ALLOWED)) { 

                return {status: 'ERROR', message: "something went wrong!"};
            }
            
            betAmount = parseFloat(betAmount).toFixed(2);
            if (Number(userData.balance) < Number(betAmount)) {
                return { 
                  status: "ERROR", 
                  message: "Insufficient funds. Please top up your account."
                };
            }
          
            // Check for negative balance
            if (Number(userData.balance) < 0) {
            return { 
                status: "ERROR", 
                message: "Error with user balance. Please contact support." 
            };
            }

            
            return {status: 'SUCCESS', data: userData, message: "User is verified"};

        } catch(error) {
            logError(error);
            return { status: 'ERROR', message: "user not found or an error occurred." };
        }

    }

       
}

export default PlayerServices;