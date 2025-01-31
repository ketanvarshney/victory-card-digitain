import mongoose from 'mongoose';
import gameModel from '../Models/gameModel.js';
import winModel from '../Models/winModel.js'
import masterModel from '../Models/masterModel.js';
import transactionModel from '../Models/transactionModel.js'
import { postReq, updateUserGameData } from '../Utils/commonUtils.js';
import { saveWalletTransaction } from './walletTransactionServices.js';
import { logError, dbLog, logErrorMessage } from "../LogConfig/index.js";
import { redisClient, redisDB } from '../DbConfig/redisConnection.js';
const ObjectId = mongoose.Types.ObjectId;

class winServices {
    async winAPI ( userId, winAmount, gameId, user, transactionId ) {
        try {
            let saveTransaction = {
            amount: winAmount,
            transactionType: "credit",
            operation: "TOTAL_WIN",
            status: "SUCCESS",
            id: userId,
            transactionId: transactionId
            }
            
            const gameData = await gameModel.findById(gameId); 
            console.log('WinAPI Payload>>>>>',transactionId, user, winAmount, gameData, gameId);

            let win = await this.winRequest(transactionId, user, winAmount, gameData);

            if(win === null || win === undefined || win === "") {

                // Update the transaction when an api error occurs.
                let transactionSave = {
                    userId: saveTransaction.id,
                    amount: saveTransaction.amount,
                    transactionType: saveTransaction.transactionType,
                    operation: saveTransaction.operation,
                    status: 'FAILED',
                    balance: user.balance,
                    transactionId: transactionId,
                    apiError: true,
                };
                
                await transactionModel.create(transactionSave);
                return {status: 'ERROR', ...win};
            }

            if(win.errorcode !== 1){
                return {status: 'ERROR', ...win};
            }

            await saveWalletTransaction(saveTransaction, user);
            
            const updatedGame = await updateUserGameData(gameId, winAmount);

            const winData = { 
                betAmount: updatedGame.data.betAmount,
                winAmount: updatedGame.data.winAmount,
                currency: updatedGame.data.currency,
            }

            redisClient.lpush(`${redisDB}:queue`, JSON.stringify(winData));

            return { status: "SUCCESS" };
           
    
        } catch (err) {
        console.log('WIN_API:::>>>', err.message);
        logError(err.message);
        throw JSON.parse(err.message);
        }
    }

    async winRequest (transactionId, player, winAmount, gameData) { 
        const roundIdString = gameData._id.toString();    
        let win = {
            token: player.playerToken,
            playerId: player.playerId,
            transactionId: transactionId,
            gameId: player.gameId,
            currency: player.currency,
            amount: winAmount,
            operationType: gameData.operationType,
            roundId: roundIdString,
            roundFinished: true
        }
        try {
            console.log(':::::::::::::::::::::::::<<WIN REQUEST>>::::::::::::::::::::::::::::', win);

            const res = await postReq(win, 'win', player._id);
            console.log('RESPONSE_WIN', res);

            if(res.errorcode !== 1 || res === null || res === undefined){
                return res;
            }

            win.playerId = player._id; 
            win.responseTransactionId = res.transactionId || res.transactionid;
            win.duplicate = res.duplicate;
            win.responseBalance = res.balance;
            win.timestamp = Math.floor(new Date().getTime() / 1000);

            dbLog(`SET, req: WIN, playerId: ${player._id}, data: ${JSON.stringify(win)}`);
            await winModel.create(win);
            
            let masterData = {
                playerId: player._id,
                type: "WIN",
                request: JSON.stringify(win),
                response: JSON.stringify(res),
                timestamp: Math.floor(new Date().getTime() / 1000) 
            }

            await masterModel.create(masterData);
            
            return res;

        } catch (err) {
            console.log('WIN_REQUEST:::>>>', err);
            logError(err);
            throw err;
        }

    }

}

export default winServices;