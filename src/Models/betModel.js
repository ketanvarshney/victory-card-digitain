import mongoose from "mongoose";

const betSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      required: true,
    },
    transactionid: {
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
    timestamp: {
      type: Number,
    },
    responseTransactionId: {
      type: String,
      required: true
    },
    responseBalance : {
      type: String,
      required: true
    },
    duplicate : {
      type: Boolean
    }
  },
  { timestamps: true }
);

betSchema.pre('save', function (next) {
  this.createdAt = new Date(Date.now() + 19800000); 
  this.updatedAt = new Date(Date.now() + 19800000); 
  next();
});

betSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  this.set({ updatedAt: new Date(Date.now() + 19800000) });
  next();
});

const Bet = new mongoose.model("Bet", betSchema);
export default Bet;
