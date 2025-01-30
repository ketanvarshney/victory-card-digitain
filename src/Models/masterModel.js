import mongoose from "mongoose";

const masterSchema = new mongoose.Schema({
    playerId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    request: {
        type: String,
    },
    response: {
        type: String,
    },
    timestamp: {
        type: Number,
    },
}, {timestamps: true});

const Master = new mongoose.model('Master', masterSchema);
export default Master;