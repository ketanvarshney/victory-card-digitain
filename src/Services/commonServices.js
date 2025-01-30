import { logError, dbLog } from "../LogConfig/index.js";
import playerModel from '../Models/playerModel.js';
import masterModel from '../Models/masterModel.js';
import { postRequestWithoutRetry } from "../Utils/commonUtils.js";

class commonServices {
     updateStatus(obj, status, data, message){
        obj.status = status;
        obj.data = data;
        obj.message = message;
        return obj;
    }

    async authService(token) {
        try {
            
            const authenticateResponse = await postRequestWithoutRetry({token: token}, 'authenticate');
            console.log('AUTH RESPONSE::: ', authenticateResponse);
            let result = {};

            if(authenticateResponse.errorcode === 2){
                result = this.updateStatus(result, 'ERROR', null, 'Invalid token (the session is not found or is expired)');

            } else if(authenticateResponse.errorcode === 999){
                result = this.updateStatus(result, 'ERROR', null, 'Internal Error: Authentication !!!')

            } else {
                result = this.updateStatus(result, 'SUCCESS', authenticateResponse, 'Success : Authentication Successfully',);
            }
            
            return result;
    
        } catch(err) {
            logError(`AUTH_SERVICE_ERR::: ${err}`);
            throw err;
        }

    }

    async balanceService(player) {
        try {
            let wallet = { token: player.playerToken, playerId: player.playerId };
    
            const getBalanceResponse = await postRequestWithoutRetry(wallet, 'get_balance');
            console.log('WALLET RESPONSE::::: ', getBalanceResponse);
            let result = {};

            if(getBalanceResponse.errorcode === 2){
                result = this.updateStatus(result, 'ERROR', null, 'Invalid token (the session is not found or is expired)');

            } else if(getBalanceResponse.errorcode === 999){
                result = this.updateStatus(result, 'ERROR', null, 'Internal Error: Get Balance !!!')

            } else {

                const updatePlayer = await playerModel.findOneAndUpdate({_id: player._id}, {$set: {balance: getBalanceResponse.balance, lastUpdatedDate: Math.floor(new Date().getTime() / 1000)}}, { new: true });
                if(!updatePlayer) throw new Error(`ERROR_UPDATE_PLAYER::: ${updatePlayer}`);
    
                let masterData = {
                    playerId: player._id,
                    type: "GET_BALANCE", 
                    request: JSON.stringify(wallet),
                    response: JSON.stringify(getBalanceResponse),
                    timestamp: Math.floor(new Date().getTime() / 1000)
                }
                dbLog(`SET, req: LOGIN_BALANCE, data: ${JSON.stringify(masterData)}`);
    
                const masterCreate = await masterModel.create(masterData);
                if(!masterCreate) throw new Error(`ERROR_CREATE_MASTER::: ${masterCreate}`);
        
                result = this.updateStatus(result, 'SUCCESS', getBalanceResponse, 'Success : Wallet Balance',);
            }
            return result;
    
        } catch(err) {
            logError(`BALANCE_SERVICE_ERR::: ${err}`);
            throw err;
        }
    }



    async balanceServiceTESTING(player) {
        try {
            let wallet = { token: player.playerToken, playerId: player.playerId };
    
            const getBalanceResponse = await postRequestWithoutRetry(wallet, 'get_balance');
            console.log("Wallet RESPONSE ::::", getBalanceResponse);

            if( getBalanceResponse.errorcode !== 1){
                
                throw new Error(`Error occur in getBalanceResponse`);
            }

            const updatePlayer = await playerModel.findOneAndUpdate({_id: player._id}, {$set: {balance: getBalanceResponse.balance, lastUpdatedDate: Math.floor(new Date().getTime() / 1000)}}, { new: true });
            if(!updatePlayer) throw new Error(`ERROR_UPDATE_PLAYER::: ${updatePlayer}`);

            let masterData = {
                playerId: player._id,
                type: "GET_BALANCE", 
                request: JSON.stringify(wallet),
                response: JSON.stringify(getBalanceResponse),
                timestamp: Math.floor(new Date().getTime() / 1000)
            }
            dbLog(`SET, req: REGISTER, data: ${JSON.stringify(masterData)}`);

            const masterCreate = await masterModel.create(masterData);
            if(!masterCreate) throw new Error(`ERROR_CREATE_MASTER::: ${masterCreate}`);
    
            return getBalanceResponse;
    
        } catch(err) {
            logError(`BALANCE_SERVICE_ERR::: ${err}`);
            throw err;
        }
    }
        
}

export default commonServices;


