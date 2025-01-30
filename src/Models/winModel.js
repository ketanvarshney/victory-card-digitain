import mongoose from "mongoose";

const winSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    gameId: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      minLength: 2,
      maxLength: 3,
    },
    roundId: {
      type: String,
      required: true,
    },
    operationType: {
      type: Number,
      required: true,
    },
    roundFinished: {
        type: Boolean,
        required: true,
    },
    timestamp: {
      type: Number,
    },
    responseTransactionId: {
      type: String,
      required: true
    },
    duplicate : {
      type: Boolean
    },
    responseBalance : {
      type: String,
      required: true
    }
  }, { timestamps: true });

winSchema.pre('save', function (next) {
  this.createdAt = new Date(Date.now() + 19800000); 
  this.updatedAt = new Date(Date.now() + 19800000); 
  next();
});

winSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
this.set({ updatedAt: new Date(Date.now() + 19800000) });
next();
});

const Win = new mongoose.model("Win", winSchema);
export default Win;
