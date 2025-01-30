import mongoose from "mongoose";

const refundSchema = new mongoose.Schema({
    playerId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true,
    },
    transactionid: {
        type: String,
        required: true
    },
    roundId: {
        type: String,
        required: true
    },
    responseTransactionId: {
        type: String,
        required: true
    },
    responseBalance : {
        type: String,
        required: true
    },
    refundAmount: {
        type: String,
        required: true  
    },
    duplicate : {
      type: Boolean
    },
    timestamp: {
        type: Number,
        required: true 
    }

}, {timestamps: true});

refundSchema.pre('save', function (next) {
    this.createdAt = new Date(Date.now() + 19800000); 
    this.updatedAt = new Date(Date.now() + 19800000); 
    next();
});

refundSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
this.set({ updatedAt: new Date(Date.now() + 19800000) });
next();
});


const Refund = new mongoose.model('Refund', refundSchema);
export default Refund;
