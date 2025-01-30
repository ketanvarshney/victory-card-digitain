import mongoose from "mongoose";

const pendingHistorySchema = new mongoose.Schema({
    pendingId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Number,
    },
    transactionId: {
        type: String,
    },
    request: {
        type: String,
    },
    nextCall: {
        type: Number,
    },
    currentCount: {
        type: Number,
        default: 0
    },
    currentTime: {
        type: Number,
        required: true,
    },
    timePeriod: {
        type: Array,
        
    },
});

const PendingHistory = new mongoose.model('PendingHistory', pendingHistorySchema);
export default PendingHistory;