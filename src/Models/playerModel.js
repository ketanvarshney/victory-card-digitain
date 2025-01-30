import mongoose from "mongoose";

const palyerSchema = new mongoose.Schema({
    providerUrl: {
        type: String,
        required: false
    },
    operatorId: {
        type: String,
        required: true
    },
    gameId: {
        type: String,
        required: true,
    },
    playerLanguage: {
        type: String,
        required: true,
        minLength: 2,
        maxLength: 3
    },
    homeUrl: {
        type: String,
        required: true
    },  
    cashierUrl: {
        type: String,
        required: true
    },
    playerId: {
        type: Number,
        required: true,
        unique: true
    },
    playerToken: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: false
    },
    countryCode: {
        type: String,
        required: false,
        minLength: 2,
        maxLength: 2
    },
    playerDevice: {
        type: String,
        required: true
    },
    balance: {
        type: String,
        required: false
    },
    currency: {
        type: String,
        required: true
    },
    createdDate: {
        type: Number,
    },
    lastUpdatedDate: {
        type: Number,
    },
    totalGameCount: { type: Number, default: 0 },
    todayGameCount: { type: Number, default: 0 },
    isBanned: {
        type: Boolean,
        default: false,
    }

}, {timestamps: true});

palyerSchema.pre('save', function (next) {
    this.createdAt = new Date(Date.now() + 19800000); 
    this.updatedAt = new Date(Date.now() + 19800000); 
    next();
});

palyerSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
this.set({ updatedAt: new Date(Date.now() + 19800000) });
next();
});

const Player = new mongoose.model('Player', palyerSchema);
export default Player;