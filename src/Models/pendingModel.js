import mongoose from "mongoose";

const pendingSchema = new mongoose.Schema({
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
    time: {
        type: Array,
    }
});

const Pending = new mongoose.model('Pending', pendingSchema);
export default Pending;