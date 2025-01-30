import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    userId:{
        type: String,
        required: true
    },
    transactionId:{
        type: String,
        required: true
    },
    amount:{
        type: Number,
    },
    transactionType:{
        type: String
    },
    operation:{
        type: String
    },
    status:{
        type: String
    },
    balance:{
        type: Number
    },
    // createdDate:{
    //     type: Date,
    //     default: new Date()
    // },
    apiError: {
        type: Boolean,
        default: false
    },
    apiStatus: {
        type: String
    },
    apiResolvedTimestamp: {
        type: Number,
    },
    referenceTransactionId: {
        type: String,
    }

}, {timestamps: true});

transactionSchema.pre('save', function (next) {
    this.createdAt = new Date(Date.now() + 19800000); 
    this.updatedAt = new Date(Date.now() + 19800000); 
    next();
});

transactionSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
    this.set({ updatedAt: new Date(Date.now() + 19800000) });
    next();
});

const Transaction = new mongoose.model('Transaction', transactionSchema);
export default Transaction;
