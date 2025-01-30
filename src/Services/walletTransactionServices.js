import { dbLog } from '../LogConfig/index.js';
import playerModel from '../Models/playerModel.js';
import transactionModel from '../Models/transactionModel.js';
import { redisClient, redisDB } from '../DbConfig/redisConnection.js';

export const saveWalletTransaction = async ({ id, transactionId, amount, transactionType, operation, status }, user, betDetails) => {
    try {
        if (id && amount && transactionType && operation && status && transactionId) {
            console.log('AMOUNT_SETTLEMENT_DB:::>>>>>',amount, user.balance);
            if(status === 'SUCCESS') {
                if(amount === 0) {
                    return { status: 'INSUFFICIENT_FUNDS', data: {}, message: 'insufficient funds'};
                }
                const amountDecimal = amount;
                if (transactionType === 'debit')  {
                    if (Number(user.balance) < amountDecimal) {
                        return { status: 'INSUFFICIENT_FUNDS', data: {}, message: 'insufficient funds'};
                    }
                    user.balance = Number(betDetails.balance);
                    user.totalGameCount = user.totalGameCount+1;
                    user.todayGameCount = user.todayGameCount+1;

                } else if(transactionType === 'credit') {
                    console.log("BALANCE:: " + user.balance + ", amount : " + amount);
                    
                    user.balance = Number(parseFloat((user.balance * 100 + amountDecimal * 100) / 100).toFixed(2));
                    console.log('Balance after credit operation: ',user.balance);

                } else {
                    return { status: 'INVALID_TRANSACTION_MODE', data: {}, message: 'invalid transaction mode' };
                }

                let userBalanceUpdate = {
                lastUpdatedDate: Math.floor(new Date().getTime() / 1000),
                balance: user.balance.toString(),
                todayGameCount: user.todayGameCount,
                totalGameCount: user.totalGameCount
                }

                let saveData = await playerModel.findOneAndUpdate({_id: user._id}, {$set: userBalanceUpdate}, { new: true });
                dbLog(`SET, req: UPDATE_PLAYER_IN_TRANSACTION, data: ${JSON.stringify(saveData)}`);

                let transactionSave = new transactionModel({
                userId: id,
                amount: amount,
                transactionType: transactionType,
                operation: operation,
                status: status,
                balance: saveData.balance,
                transactionId: transactionId,
                // createdDate: new Date(),
                });
                let transactionSaved = await transactionModel.create(transactionSave);
        
                let savedObj = {
                transactionId: transactionSaved.transactionId,
                walletBalance: saveData.balance,
                user: saveData
                }
                return {
                status: "SUCCESS",
                data: savedObj,
                message: "transaction is saved !"
                }
            }
        }

    } catch(err) {
        logError(err);
        console.log('ERROR_WALLET_TRANSACTION_SERVICE>>', err)
        return {
            status: "ERROR",
            data: err,
            message: "something went wrong on server"
        }
    }
}