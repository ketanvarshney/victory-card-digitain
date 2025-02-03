import { apiLog, logError, logErrorMessage } from "../LogConfig/index.js";
import pendingModel from '../Models/pendingModel.js'
import gameModel from '../Models/gameModel.js'
import Cron from '../Cron/index.js'
import axios from "axios";

export function getTodayDateTime() {
    const currentDate = new Date();
  
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
  
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
  
    const formattedDateTime = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    return formattedDateTime;
}

export const generateSignature = (key, json_body) => {
    console.log(key, json_body);
    const hashed = crypto.createHmac('sha256', key).update(json_body).digest('base64');
    const signature = hashed.toString('base64');
    console.log(signature, 'signature')
    return signature;
}

export const isValidTwoDecimalNumber = (input) => {
    const regex = /^\d+(\.\d{1,2})?$/;
    if (typeof input !== 'string' && typeof input !== 'number') {
      return false;
    }
    return regex.test(input.toString());
}

export const getRandomNumber = (digit) => {
    return Math.random().toFixed(digit).split('.')[1];
};

export const generateSignatureGameLaunch = (data) => {
    data = JSON.stringify(data);
    console.log(data, 'data1');
    data = data.replaceAll(":", ": ").replaceAll(",", ", ").replaceAll(": //", "://");
    return generateSignature(process.env.API_SECRET_KEY, data);
}

export const hasDateChanged = (epoch1, epoch2) => {
    // Convert seconds to milliseconds
    const date1 = new Date(epoch1 * 1000);
    const date2 = new Date(epoch2 * 1000);
  
    // Extract the date components (year, month, day)
    const year1 = date1.getUTCFullYear();
    const month1 = date1.getUTCMonth();
    const day1 = date1.getUTCDate();
  
    const year2 = date2.getUTCFullYear();
    const month2 = date2.getUTCMonth();
    const day2 = date2.getUTCDate();
  
    // Compare the date components
    return year1 !== year2 || month1 !== month2 || day1 !== day2;
}

export const saveToPending = async (data, requestType, userId) => {
    try {
        const transctionId = data.transactionId ? data.transactionId : data.transactionid;
        
        const isPendingData = await pendingModel.findOneAndUpdate({ transactionId: transctionId }, { $set: { timestamp: Math.floor(new Date().getTime() / 1000), nextCall: Math.floor(new Date().getTime() / 1000) }}, { new: true });
        if(!isPendingData) {
            let pendingData = {
                userId: userId,
                type: requestType,
                transactionId: transctionId,
                request: JSON.stringify(data),
                nextCall: Math.floor(new Date().getTime() / 1000) + 60,
                timestamp: Math.floor(new Date().getTime() / 1000),
            };
            await pendingModel.create(pendingData);
        }
        console.log(`Is pending Data, ${isPendingData}`);

    } catch (error) {
        console.log(error);
        logError(error);
        throw error
    }

}

export const updateUserGameData = async (gameId, winAmount) => {
    try {
        if(!gameId && !winAmount ) {
            throw new Error(JSON.stringify({ status: 'PLEASE_ENTER_ALL_FIELDS', message: 'Required fields is missing or empty', data: {}}));
        }
        
        const updatedData = { winAmount: winAmount, isWin: winAmount > 0 ? true : false };
        const updateUserGameData = await gameModel.findOneAndUpdate({_id: gameId}, {$set: updatedData}, { new: true });

        if(updateUserGameData === null){
            throw new Error(JSON.stringify({ status: 'ERROR', message: `User's Game Data Not Updated.`, data: null}))
        }

        const result = { 
            status: 'SUCCESS',
            message: "User's Game Data Updated.",
            data: updateUserGameData
        }
        return result;

    } catch (error) {
        console.log('UPDATE_GAME_DATA_ERROR::::', error);
        logError(error);
        throw error
    }

}

export const postRequestWithoutRetry = async (data, requestType) => {
    try {
        let headers = { 'Content-Type': 'application/json' }
        let url = process.env.API_INTEGRATION_BASE_URL + requestType;

        apiLog(`req: ${requestType}, url: ${url}, data: ${JSON.stringify(data)}`);
        console.log(url, 'URL................', data);

        //Testing purpose
        // let obj = {data: { errorcode: 999} };
        // let obj = {data: { errorcode: 2} };

        const response = await axios.post(url, data, { headers });
        // const response = await new Promise((resolve) => { setTimeout(() => resolve({data: { errorcode: 2} }), 1 ) });
        // const response = await new Promise((resolve) => { setTimeout(() => resolve(obj), 3000 ) });
        
        console.log('API_RES>>', response.data);
        
        if(response.data.errorcode !== 1 && requestType === 'bet'){
            logErrorMessage(`${JSON.stringify(response.data)}`);
            throw new Error(`${JSON.stringify(response.data)}`);
        }

        apiLog(`res: ${requestType}, data: ${JSON.stringify(response.data)}`);
        return response.data;
    }catch(err) {
        console.log('ERR_postRequestWithoutRetry::::', err.stack, 'this is also err', err.message);
        logError(err); 
        throw err;
    }

} 

let retry = 2;

export const postReq = async (data, requestType, userId, maxRetries = retry, delay = 5000, timeout = 10000) => {

    try {
        let headers = { 'Content-Type': 'application/json' };
        let url = process.env.API_INTEGRATION_BASE_URL+requestType; 
        
        apiLog(`req: ${requestType}, url: ${url}, data: ${JSON.stringify(data)}`);
        console.log('URL::::>>>>>>>>', url, data);
        
        // Testing...
        const response = await axios.post(url, data, { headers, timeout });
        // const response = await new Promise((resolve) => { setTimeout(() => resolve({data : {errorcode:1, transactionid:data.transactionid,balance: data.refundAmount}}), 3000 ) });
        // const response = await new Promise((resolve) => { setTimeout(() => resolve({data: { errorcode: 999} }), 3000 ) });

        console.log('API_RES>>', response.data);

        if(response.data.errorcode !== 1 && requestType === 'win'){
            
            throw new Error(`${JSON.stringify(response.data)}`);
        } else if(response.data.errorcode === 999 && requestType === 'refund'){
            
            throw new Error(`${JSON.stringify(response.data)}`);
        }

        apiLog(`res: ${requestType}, data: ${JSON.stringify(response.data)}`);
        return response.data;

    } catch (error) {
        logError(error);
        console.log('ERRRRRRRRRRRRRR', error.message);
        if (maxRetries <= 0) {
            console.log('AFTER MAX TRY COMPLETED:::::', requestType);
            if( requestType === 'win' || requestType === 'refund') {
                console.log('REQUEST_SAVETOPENDING*****' , requestType);
                await saveToPending(data, requestType, userId);
                // Save the data in the db for cronjob to solve pending requests
                // And make the pending_request to true in redis
                console.log('SAVE TO PENDING DONE::::');
                Cron.startCron(false);
            }
            
            let res = JSON.parse(error.message);
            console.log( res, 'has own property', error.message);
            if(res.hasOwnProperty('errorcode')) {
                console.log('Response Returned...... ');
                return res;
            }
        }
        logErrorMessage(`req: ${requestType}, API Error occurred: ${error.message}. Retrying...`);
        console.log('MAX TRY NOT REACHED::::', requestType);

        await new Promise(resolve => setTimeout(resolve, delay));

        console.log('Before sending post req payload>>>>>>>>>>>>', requestType, data, maxRetries);
        return await postReq(data, requestType, userId, maxRetries - 1, delay, timeout);
    }
   
}























// // this was for testing, currently not applied to any endpoints.
// export const postReqTesting = async (data, requestType, userId, maxRetries = retry, delay = 5000, timeout = 10000) => {

//     try {
//         let headers = { 'Content-Type': 'application/json' };
//         let url = process.env.API_INTEGRATION_BASE_URL+requestType; 
        
//         apiLog(`req: ${requestType}, url: ${url}, data: ${JSON.stringify(data)}`);
//         console.log('URL::::>>>>>>>>', url, data);

//         const response = await axios.post(url, data, { headers, timeout });
//         console.log(response.data);

//         if(response.data.errorcode !== 1 && requestType === 'win'){
            
//             throw new Error(`${JSON.stringify(response.data)}`);
//         } else if(response.data.errorcode === 999 && requestType === 'refund'){
            
//             throw new Error(`${JSON.stringify(response.data)}`);
//         }

//         apiLog(`res: ${requestType}, data: ${JSON.stringify(response.data)}`);
//         return response.data;

//     } catch (error) {
//         console.log('ERRRRRRRRRRRRRR', error.message)
//         if (maxRetries <= 0) {
//             console.log('AFTER MAX TRY COMPLETED:::::', requestType);
//             if( requestType === 'win' || requestType === 'refund') {                                 // requestType === 'Win1' ||
//                 console.log('REQUEST_SAVETOPENDING*****' , requestType);
//                 await saveToPending(data, requestType, userId);
//                 // Save the data in the db for cronjob to solve pending requests
//                 // And make the pending_request to true in redis
//                 console.log('SAVE TO PENDING DONE::::');
//                 Cron.startCron(false);
//             }
            
//             let res = error?.response?.data;
//             console.log( 'has own property', error)
//             if(res === undefined) {                // this block of code is for testing purpose;
//                 throw res;
//             }
//             // if(res.hasOwnProperty('errorCode') && res.hasOwnProperty('errorMessage')) {
//             //     throw res;
//             // } else {
//             //     let errorRes = {response: {data: {errorCode: 1, errorMessage: "Internal Error"}}};
//             //     throw errorRes;
//             // }
//         }
//         logErrorMessage(`req: ${requestType}, API Error occurred: ${error.message}. Retrying...`);
//         console.log('MAX TRY NOT REACHED::::', requestType);

//         await new Promise(resolve => setTimeout(resolve, delay));

//         // // Idempotence should not be applied at all to GetBalance requests. Each request should be processed as a new request.
//         // // new timestamp and new nonce will be used when retrying GetBalance request
//         // if(requestType === "GetBalance") {

//         //     data = {
//         //         ...data,
//         //         nonce: generateNonce(),
//         //         timestamp: Math.floor(new Date().getTime() / 1000)
//         //     }
//         // }
//         console.log('Before sending post req payload>>>>>>>>>>>>', requestType, data, maxRetries);
//         postReqTesting(requestType, data, maxRetries - 1, delay, timeout);
//         console.log('>>>>>>>>Again Post Request Sent.<<<<<<<');
//     }

    
// }

// const roundToNextMinute = epochTime => Math.floor((Math.ceil((epochTime + 60) / 60) * 60));



// function roundToNextMinute(epochTime) {
//     // Convert epoch time to a Date object
//     const date = new Date(epochTime * 1000);

//     // Get the hours and minutes from the Date object
//     const hours = date.getUTCHours();
//     const minutes = date.getUTCMinutes();

//     // Create a new Date object for the next minute (ignore seconds)
//     const nextMinuteDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes + 1, 0));

//     // Return the epoch time of the next minute
//     return Math.floor(nextMinuteDate.getTime() / 1000);
// }

// // Example usage
// const currentEpoch = Math.floor(Date.now() / 1000); // Current epoch time
// console.log("Current Epoch:", currentEpoch);
// console.log("Rounded to Next Minute Epoch:", roundToNextMinute(currentEpoch));


