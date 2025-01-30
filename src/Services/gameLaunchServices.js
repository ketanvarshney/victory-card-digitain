import jwt from 'jsonwebtoken';
import { logError, dbLog } from "../LogConfig/index.js";
import playerModel from '../Models/playerModel.js';
import masterModel from '../Models/masterModel.js';
import { redisClient, redisDB } from '../DbConfig/redisConnection.js';
import { generateSignatureGameLaunch, hasDateChanged } from "../Utils/commonUtils.js";

class gameLaunchServices {
    async gameLaunch(data, playerData) {
        try {
            let player = await playerModel.findOne({playerId: playerData.playerId});
            dbLog(`GET, req: GAME_LAUNCH, data: ${JSON.stringify(player)}`);

            let result ;

            if(!player || player === null) {
                result = await this.registerPlayer(data, playerData);    
            }else {
                result =  await this.updatePlayer(player, playerData);
            }
            return result;
            
        }catch(err) {
            logError(err);
            throw err;
        }

    }

    async registerPlayer(data, playerData) {
        try {
            let player = {
                providerUrl: data.providerUrl,
                operatorId: data.operatorId,
                gameId: data.gameId,
                playerLanguage: data.lang,
                homeUrl: data.homeUrl,
                cashierUrl: data.cashierUrl,
                countryCode: data.country,
                playerDevice: data.device,
                playerId: playerData.playerId,
                playerToken: playerData.token,
                currency: playerData.currency,
                // balance: playerData.balance,
                createdDate: Math.floor(new Date().getTime() / 1000),
                lastUpdatedDate: Math.floor(new Date().getTime() / 1000),
            }
            dbLog(`SET, req: REGISTER, data: ${JSON.stringify(player)}`);
            
            const playerCreate = await playerModel.create(player);
            if(!playerCreate) throw new Error(`ERROR_CREATE_PLAYER::: ${playerCreate}`); 

            const newToken = jwt.sign({ userId: playerCreate._id}, process.env.JWT_SECRET_KEY, { expiresIn: process.env.EXPIRES_IN });
            if(!newToken) throw new Error('Token not generated');

            const updatePlayer = await playerModel.findOneAndUpdate({_id: playerCreate._id}, {$set: {token: newToken, lastUpdatedDate: Math.floor(new Date().getTime() / 1000)}}, { new: true }); 
            if(!updatePlayer) throw new Error(`ERROR_UPDATE_PLAYER::: ${updatePlayer}`); 

            const url = `${player.providerUrl}?operatorId=${player.operatorId}&gameId=${player.gameId}&lang=${player.playerLanguage}&homeUrl=${player.homeUrl}&cashierUrl=${player.cashierUrl}&token=${player.playerToken}&country=${player.countryCode}&device=${player.playerDevice}`;
            
            let masterData = {
                playerId: playerCreate._id,
                type: "REGISTER", 
                request: JSON.stringify(player),
                response: JSON.stringify(url),
                timestamp: Math.floor(new Date().getTime() / 1000)
            }
            dbLog(`SET, req: REGISTER, data: ${JSON.stringify(masterData)}`);

            const masterCreate = await masterModel.create(masterData);
            if(!masterCreate) throw new Error(`ERROR_CREATE_MASTER::: ${masterCreate}`);

            const result = {
                url: url,
                token: updatePlayer.token,
                userId: updatePlayer._id
            }

            return result;

        }catch(err) {
            logError(err);
            throw err;
        }
    }

    async updatePlayer(player, playerData) {
        try {

            const token = jwt.sign({ userId: player._id}, process.env.JWT_SECRET_KEY, { expiresIn: process.env.EXPIRES_IN });
            if(!token) throw new Error('Token Not Generated');

            // reset today game count if date is changed
            let currentDateTime = Math.floor(new Date().getTime() / 1000);
            let isDateChanged = hasDateChanged(player.lastUpdatedDate, currentDateTime);

            let currentData = {
                providerUrl: player.providerUrl,
                operatorId: player.operatorId,
                gameId: player.gameId,
                playerLanguage: player.lang,
                homeUrl: player.homeUrl,
                cashierUrl: player.cashierUrl,
                countryCode: player.country,
                playerDevice: player.device,
                playerId: playerData.playerId,
                playerToken: playerData.token,
                token: token,
                currency: playerData.currency,
                // balance: playerData.balance,
                lastUpdatedDate: Math.floor(new Date().getTime() / 1000),
                todayGameCount: isDateChanged ? 0 : player.todayGameCount,
            }
            dbLog(`SET, req: LOGIN, playerId: ${playerData.playerId}, data: ${JSON.stringify(currentData)}`);

            let updatedData = await playerModel.findOneAndUpdate({_id: player._id}, {$set: currentData}, { new: true });
            if(!updatedData) throw new Error(`ERROR_UPDATE_PLAYER::: ${updatedData}`);

            // await redisClient.set(`${redisDB}-GameCount:${1000}`, currentData.todayGameCount); 

            const url = `${updatedData.providerUrl}?operatorId=${updatedData.operatorId}&gameId=${updatedData.gameId}&lang=${updatedData.playerLanguage}&homeUrl=${updatedData.homeUrl}&cashierUrl=${updatedData.cashierUrl}&token=${updatedData.playerToken}&country=${updatedData.countryCode}&device=${updatedData.playerDevice}`;
             
            const result = {
                url: url,
                token: updatedData.token,
                userId: updatedData._id
            }

            return result;

        }catch(err) {
            logError(err);
            throw err;
        }   
    }

}

export default gameLaunchServices;