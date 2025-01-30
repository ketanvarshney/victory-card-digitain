import mongoose from 'mongoose';
import gameModel from '../Models/gameModel.js';
import betModel from '../Models/betModel.js'
import masterModel from '../Models/masterModel.js';
import Win from '../Services/winServices.js'
import { refundRequest } from './refundServices.js';
import { gamePlay } from './gamePlayServices.js';
import playerModel from '../Models/playerModel.js'
import { saveWalletTransaction } from './walletTransactionServices.js';
import { logError, dbLog, logErrorMessage } from "../LogConfig/index.js";
import {  getTodayDateTime, getRandomNumber, postRequestWithoutRetry } from "../Utils/commonUtils.js";
const ObjectId = mongoose.Types.ObjectId;
const winServices = new Win;


class betServices {
    async userBet( userId, betAmount, operationType, user, betType) { 
        try{
            // Game Play...
            let gamePlayData = await gamePlay( betAmount, betType, user)
            console.log('GAMEPLAY ::---->>>', gamePlayData); 
            // return gamePlayData;

            // Bet api... 
            let bet = await this.betAPI( userId, betAmount, operationType, user, gamePlayData);
            console.log('BET ::---->>>', bet);
            if(bet.status !== "SUCCESS") { return bet; }

            // Win api..
            let win = await winServices.winAPI(userId, gamePlayData.winAmount, bet.gameId, bet.result.data.user, bet.result.data.transactionId);
            console.log('WIN ::---->>>', win);
            if(win.status !== "SUCCESS") { return win; } 
            else { 
                const updatedData = await playerModel.findOne({ _id: userId});

                return { ...gamePlayData, balance : updatedData.balance }
            }
                // return gamePlayData; }

        } catch(err) {
            logError(err);
            throw err;
        }
    }

    async betAPI ( userId, betAmount, operationType, user, gamePlayData) {
        try {
           
            let transactionId = "TB" + getRandomNumber(16);
            let saveTransactionData = {
            amount: betAmount,
            transactionType: "debit",
            operation: "GAME_PLAY",
            status: "SUCCESS",
            id: userId,
            transactionId: transactionId,
            }

            let gameData = {
                userId: new ObjectId(userId),
                betAmount: betAmount,
                gameType: gamePlayData.betType ,
                DrawnCard: {                     
                    value: gamePlayData.drawnCard.Value,
                    suit: gamePlayData.drawnCard.Type,
                    color: gamePlayData.drawnCard.Color,
                },
                operationType: operationType,
                isWin: false,
                currency: user.currency
            } 
            
            // let gameDataResult = await gameModel.findOneAndUpdate({_id: '679b77a6dd143331d050d460'}, {$set: {betAmount: gameData.betAmount}}, { new: true });
            let gameDataResult = await gameModel.create(gameData);
            console.log('GAME_DATA_RESULT.....', gameDataResult); 
            let bet = await this.betRequest(transactionId, user, betAmount, gameDataResult);

            let saveTransaction ;
            console.log('BET::::', bet);

            if(bet !== null && bet !== undefined && bet !== "" && bet.hasOwnProperty('transactionId') && bet.hasOwnProperty('balance')) {
                // console.log("Reached success in bet request: :::")
                saveTransaction = await saveWalletTransaction(saveTransactionData, user, bet);
                // console.log('done....SAVE_TRANSCTIon', saveTransaction)
                if (saveTransaction.message == "insufficient funds") {
                  return {
                    status: "ERROR",
                    message: "insufficient funds"
                  };
                }
            } else {
                // return bet error
                let result = { status: 'ERROR', ...bet }
                return result;
            }

            return {
            status: "SUCCESS",
            result: saveTransaction,
            gameId: gameDataResult._id
            };
    
        } catch (err) {
        logError(err);
        throw err;
        }
    }

    async betRequest (transactionId, user, betAmount, gameDataResult ) {    
        let bet = {
            token: user.playerToken,
            playerId: user.playerId,
            transactionid: transactionId,
            gameId: user.gameId,
            amount: betAmount.toString(),
            currency: user.currency,
            operationType: gameDataResult.operationType,                      
            roundId: gameDataResult._id,                   // Our Game ID
            
        };
        try {
            console.log(':::::::::::::::::::::::::::::::::::::::::::::::::::::', bet);
            // testing only for if get 999 err and amount is deducted in playermodel then refund Process
            // throw new Error(JSON.stringify({ errorcode: 999, message: "Simulated Internal Error with code 999" })); 
            
            const res = await postRequestWithoutRetry(bet, "bet", user._id); // if this res fails then we know 
            console.log("BET RESPONSE ::::", res);
            
            // save the bet
            bet.playerId =  user._id; // update the player
            bet.responseTransactionId = res.transactionId || res.transactionid;
            bet.responseBalance = res.balance;
            bet.duplicate = res.duplicate;
            bet.timestamp = Math.floor(new Date().getTime() / 1000);
            
            console.log(res, bet); 
            
            await betModel.create(bet);

            let masterData = {
                playerId: user._id,
                type: "BET",
                request: JSON.stringify(bet),
                response: JSON.stringify(res),
                timestamp: Math.floor(new Date().getTime() / 1000) 
            }

            await masterModel.create(masterData);
            return res;

        } catch (err) {
            logError(err);
            let errorObject;
            
            if (err instanceof Error && err.message) {
                
                errorObject = JSON.parse(err.message);
                if(errorObject.errorcode === 999){
                    // refund will be initiated.
                    console.log("Bet Refund Request Initiated!", user, bet);
                    let refund = await refundRequest(user, bet);
                    // output of refund = { errorcode: 999};
                    console.log('Refund Request send.');
                    if(refund.errorcode !== 1) {
                    
                        return { error : refund.errorcode, message: 'Internal Error Refund Request...' }
                    }
                    return { error : refund.errorcode, message: 'Internal Error Refund Settled !!!' }
    
                }else{
                    console.log(errorObject);
                    return errorObject;
                }
            } 
            console.log(err);
            throw err;
        }

    }

}

export default betServices;