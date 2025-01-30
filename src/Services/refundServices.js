import { dbLog } from '../LogConfig/index.js'
import { saveWalletTransaction } from "./walletTransactionServices.js"
import masterModel from '../Models/masterModel.js'
import refundModel from '../Models/refundModel.js'
import { postReq, getRandomNumber } from "../Utils/commonUtils.js"

export const refundRequest = async (player, bet) => {
        let refund = {
            token: player.playerToken,
            playerId: player.playerId,
            transactionid: bet.transactionid || bet.transactionId, // bet responseTransactionId will be put here
            refundAmount: bet.amount,
            roundId: bet.roundId,                            
        };

        let saveTransaction = {
            amount: bet.amount,
            transactionType: "refund",
            operation: "REFUND",
            status: "SUCCESS",
            id: player._id,
            transactionId: bet.transactionid || bet.transactionId,
        }
    try {
        // console.log(refund, saveTransaction);

        const res = await postReq(refund, 'refund', player._id);
        console.log('RESPONSE_REFUND::', res);

        if(res.errorcode !== 1){ return res; }
        
        // update the refund data.
        refund.playerId = player._id;
        refund.responseBalance = res.balance;
        refund.responseTransactionId = res.transactionId || res.transactionid;
        refund.duplicate = res.duplicate;
        refund.timestamp = Math.floor(new Date().getTime() / 1000);

        dbLog(`SET, req: REFUND, playerId: ${player._id}, data: ${JSON.stringify(refund)}`);
        await refundModel.create(refund);
        await saveWalletTransaction(saveTransaction, player);

        let masterData = {
            playerId: player._id,
            type: "REFUND", 
            request: JSON.stringify(refund),
            response: JSON.stringify(res),
            timestamp: Math.floor(new Date().getTime() / 1000)
        }
        dbLog(`SET, req: REFUND_MASTER, data: ${JSON.stringify(masterData)}`);

        const masterCreate = await masterModel.create(masterData);
        if(!masterCreate) throw new Error(`ERROR_CREATE_MASTER::: ${masterCreate}`); 
        
        console.log('Refund::::>>>>>>', res)
        return res;

    } catch(err) {
        logError(err);
        console.log('ERR_REFUND', err)
        saveTransaction.apiError = true;
        await saveWalletTransaction(saveTransaction, player);
        return err;

    }
}