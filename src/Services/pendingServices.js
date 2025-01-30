import axios from 'axios';
import { apiLog, logError, dbLog } from "../LogConfig/index.js";
import pendingModel from '../Models/pendingModel.js';
import playerModel from '../Models/playerModel.js'
import { redisClient, redisDB } from '../DbConfig/redisConnection.js';
import transactionModel from '../Models/transactionModel.js'
import pendingHistoryModel from '../Models/pendingHistoryModel.js'
import refundModel from '../Models/refundModel.js'
import winModel from '../Models/winModel.js'
import masterModel from '../Models/masterModel.js';
import { generateSignatureGameLaunch, hasDateChanged, updateUserGameData } from "../Utils/commonUtils.js";

class pendingServices {
    async pendingPostRequest(data, requestType, timeout = 10000) {
        try {
            apiLog(`req: ${requestType}, data: ${JSON.stringify(data)}`)
            let headers = { 'Content-Type': 'application/json' }

            let url = process.env.API_INTEGRATION_BASE_URL+requestType;
            const response = await axios.post(url, data, {headers, timeout: timeout});

            // const response = await new Promise((resolve) => { setTimeout(() => resolve({data : {errorcode:1, transactionId:data.transactionId,balance: data.amount}}), 3000 ) });
            // const response = await new Promise((resolve) => { setTimeout(() => resolve({data : {errorcode:1, transactionid:data.transactionid,balance: data.refundAmount}}), 3000 ) });
            // const response = await new Promise((resolve) => { setTimeout(() => resolve({data: { errorcode: 999} }), 3000 ) }); 
            apiLog(`res: ${requestType}, data: ${JSON.stringify(response.data)}`);
        
            if(response.data.errorcode !== 1 && requestType === 'refund'){    
                return JSON.stringify(response.data);
                // throw new Error(`${JSON.stringify(response.data)}`);
            }else if(response.data.errorcode !== 1 && requestType === 'win') {
                return JSON.stringify(response.data);
            }
            console.log('pendingpost', response.data);
            return response.data;
        } catch (err) {
            logError(err);
            console.log('ERR_PENDINGPOSTREQUEST', err);
            throw err;
        }
    }

    async pendingWinRequest(win, requestType, userId) {
        try {

            const res = await this.pendingPostRequest(win, requestType);
            console.log(res, 'pending win...', win);
            if(res.errorcode !== 1){ return res;}

            win.playerId = userId;
            win.responseTransactionId = res.transactionId || res.transactionid;
            win.duplicate = res.duplicate;
            win.responseBalance = res.balance;
            win.timestamp = Math.floor(new Date().getTime() / 1000);

            console.log(res, 'pending win...after', win);
            dbLog(`SET, req: WIN, playerId: ${win.playerId}, data: ${JSON.stringify(win)}`); 
            
            await winModel.create(win);

            let userBalanceUpdate = {
            lastUpdatedDate: Math.floor(new Date().getTime() / 1000),
            balance: res.balance.toString(),
            }

            let saveData = await playerModel.findOneAndUpdate({_id: userId}, {$set: userBalanceUpdate}, { new: true });
            dbLog(`SET, req: UPDATE_PLAYER_BALANCE, data: ${JSON.stringify(saveData)}`);
            
            await updateUserGameData(win.roundId, win.amount);    

            // // Mark request as completed
            // const updatedData = {
            //     apiStatus: 'completed',
            //     apiResolvedTimestamp: Math.floor(new Date().getTime() / 1000),
            // };

            // // // Uncomment if linked to a transaction model
            // await transactionModel.findOneAndUpdate(
            //     { transactionId: win.transactionId ? win.transactionId : win.transactionid, userId: userId,  },
            //     { $set: updatedData }
            // );
            
            let masterData = {
                playerId: userId,
                type: "WIN", 
                request: JSON.stringify(win),
                response: JSON.stringify(res),
                timestamp: Math.floor(new Date().getTime() / 1000)
            }
            dbLog(`SET, req: REFUND_MASTER, data: ${JSON.stringify(masterData)}`);
            
            const masterCreate = await masterModel.create(masterData);
            if(!masterCreate) throw new Error(`ERROR_CREATE_MASTER::: ${masterCreate}`); 
            
            return res;

        }catch(err) {
            logError(err);
            console.log('ERR_PENDING_WINREQUEST:', err)
            throw err;
        }   
    }

    async pendingRefundRequest(refund, requestType, userId) {
        try {
            // console.log(refund, 'rrrrrrr', requestType)
            const res = await this.pendingPostRequest(refund, requestType);
            console.log(res, 'pending refund...', refund)
            if(res.errorcode !== 1){ return res;}
            
            refund.playerId = userId;
            refund.responseBalance = res.balance;
            refund.responseTransactionId = res.transactionId || res.transactionid;
            refund.duplicate = res.duplicate;
            refund.timestamp = Math.floor(new Date().getTime() / 1000);
            
            console.log(res, 'pending refund...after', refund);
            dbLog(`SET, req: REFUND, playerId: ${refund.playerId}, data: ${JSON.stringify(refund)}`); 
            
            
            await refundModel.create(refund);

            let userBalanceUpdate = {
            lastUpdatedDate: Math.floor(new Date().getTime() / 1000),
            balance: res.balance.toString()
            }

            let saveData = await playerModel.findOneAndUpdate({_id: userId}, {$set: userBalanceUpdate}, { new: true });
            dbLog(`SET, req: UPDATE_PLAYER_BALANCE, data: ${JSON.stringify(saveData)}`);

            let masterData = {
                playerId: userId,
                type: "REFUND", 
                request: JSON.stringify(refund),
                response: JSON.stringify(res),
                timestamp: Math.floor(new Date().getTime() / 1000)
            }
            dbLog(`SET, req: REFUND_MASTER, data: ${JSON.stringify(masterData)}`);

            const masterCreate = await masterModel.create(masterData);
            if(!masterCreate) throw new Error(`ERROR_CREATE_MASTER::: ${masterCreate}`); 
            
            return res;

        }catch(err) {
            logError(err);
            console.log('ERR_PENDINGREFUNDREQUEST:', err)
            throw err;
        }
    }
    
    
    async maintainPendingHistory(request) {
        try {
            const pendingHistoryData = {
                pendingId : request._id,
                userId:  request.userId,
                type: request.type,
                timestamp: request.timestamp,
                transactionId: request.transactionId,
                request: request.request,
                nextCall: request.nextCall,
                currentCount: request.currentCount,
                timePeriod: request.time,
                currentTime: Math.floor(new Date().getTime() / 1000)
            }
            await pendingHistoryModel.create(pendingHistoryData);
            
        }catch(err){
            logError(err);
            throw err;
        }
    }
    
    async getRetryInterval(attempt) {
        if (attempt < 10) {
            return 60;                   // Retry every minute for the next 10 minutes
        } else if (attempt < 16) {
            return 600;                  // Retry every 10 minutes for the next hour
        } else if (attempt < 40) {
            return 3600;                  // Retry every hour for the next 24 hours
        } 
        return null;                     // No retries after 24 hours
    }

    async resolvePendings() {
        let req;
        try {
            let isAllResolved = true;
    
            let data = await pendingModel.find();
            console.log('PENDING_DATA ::::', data);
        
            for (let i = 0; i < data.length; i++) {
                 req = data[i];
                let resp = "";
        
                // Get the current retry interval
                const retryInterval = await this.getRetryInterval(req.currentCount);
                console.log('RetryInterval>>>>>>', retryInterval);
        
                // If no further retries are allowed, delete the pending record
                if (retryInterval === null) {
                    await pendingModel.findByIdAndDelete(req._id);
                    console.log("Max retries exceeded. Deleted pending request.");
                    continue;
                }

                console.log(req.nextCall, "::::::-NEXT_CALL-::::::", Math.floor(new Date().getTime() / 1000));

                if (req.nextCall <= Math.floor(new Date().getTime() / 1000)) {
                    console.log(req, "Processing pending request...");

                    if (req.type === 'win') {
                        resp = await this.pendingWinRequest(JSON.parse(req.request), req.type, req.userId);
                        // contunue;
                    } else if(req.type === "refund") {
                        resp = await this.pendingRefundRequest(JSON.parse(req.request), req.type, req.userId);
                        // console.log('reacheddddddddd')
                    }
        
                    if ( resp !== undefined && resp !== null && resp !== "" && resp.hasOwnProperty('balance')) {
                        console.log("API resolved successfully.");               
                        
                        
                        await this.maintainPendingHistory(req);
                        await pendingModel.findByIdAndDelete(req._id);

                        console.log("Deleted resolved request.");
                    } else {
                        console.log("API still failing. Scheduling next retry.");
        
                        // Schedule the next retry
                        const updated = await pendingModel.findOneAndUpdate(
                            { _id: req._id },
                            { $set: { nextCall: req.nextCall+retryInterval, currentCount: req.currentCount + 1},
                              $push: { time: { [req.nextCall]: Math.floor(new Date().getTime() / 1000)} }
                            }, { new: true }
                        );
                        isAllResolved = false;
                        console.log("Retry scheduled:::::.", updated);
                    }
                } else {
                    console.log("Pending request not yet eligible for retry.");
                    isAllResolved = false;
                }
            }  
            return isAllResolved;

        }catch(err) {
            console.log('ERR_RESOLVE_PENDINGS:::>>', JSON.parse(err.message), req);
            await this.maintainPendingHistory(req);
            await pendingModel.findByIdAndDelete(req._id);
            logError(JSON.parse(err.message));
            return false;
        }
    }

    
}
export default pendingServices;