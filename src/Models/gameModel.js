import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    betAmount: {
        type: String,  
    },
    gameType: {
        type: String,             // 'color' or 'suit'
        required: true
    },
    DrawnCard: {
        suit: {
            type: String,        // The actual suit drawn
        },
        color: {
            type: String,        // The actual color drawn
        },
        value :{
        type :String
        }
    },
    operationType: {
        type: Number,  
    },
    winAmount: {
        type: String,
        default: "0",
    },
    isWin:{
        type: Boolean,
        default:false
    },
    currency: {
        type: String,
    }
}, {timestamps: true});

gameSchema.pre('save', function (next) {
    this.createdAt = new Date(Date.now() + 19800000); 
    this.updatedAt = new Date(Date.now() + 19800000); 
    next();
});

gameSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
    this.set({ updatedAt: new Date(Date.now() + 19800000) });
    next();
});

const Game = new mongoose.model('Game', gameSchema);
export default Game;