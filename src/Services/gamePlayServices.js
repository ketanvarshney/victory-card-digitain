const _CardsDeck = [
  { Value: "A", Type: "Heart", Color: "Red", CardName:"H_14_0" },
  { Value: "2", Type: "Heart", Color: "Red", CardName:"H_2_0" },
  { Value: "3", Type: "Heart", Color: "Red", CardName:"H_3_0" },
  { Value: "4", Type: "Heart",Color: "Red", CardName:"H_4_0" },
  { Value: "5", Type: "Heart",Color: "Red", CardName:"H_5_0" },
  { Value: "6", Type: "Heart",Color: "Red", CardName:"H_6_0" },
  { Value: "7", Type: "Heart",Color: "Red", CardName:"H_7_0" },
  { Value: "8", Type: "Heart", Color: "Red",CardName:"H_8_0" },
  { Value: "9", Type: "Heart", Color: "Red",CardName:"H_9_0" },
  { Value: "10", Type: "Heart",Color: "Red", CardName:"H_10_0" },
  { Value: "J", Type: "Heart",Color: "Red", CardName:"H_11_0" },
  { Value: "Q", Type: "Heart",Color: "Red", CardName:"H_12_0" },
  { Value: "K", Type: "Heart",Color: "Red", CardName:"H_13_0" },
  { Value: "A", Type: "Diamond",Color: "Red", CardName:"D_14_0" },
  { Value: "2", Type: "Diamond",Color: "Red", CardName:"D_2_0" },
  { Value: "3", Type: "Diamond",Color: "Red", CardName:"D_3_0" },
  { Value: "4", Type: "Diamond",Color: "Red", CardName:"D_4_0" },
  { Value: "5", Type: "Diamond",Color: "Red", CardName:"D_5_0" },
  { Value: "6", Type: "Diamond",Color: "Red", CardName:"D_6_0" },
  { Value: "7", Type: "Diamond",Color: "Red", CardName:"D_7_0" },
  { Value: "8", Type: "Diamond",Color: "Red", CardName:"D_8_0" },
  { Value: "9", Type: "Diamond",Color: "Red", CardName:"D_9_0" },
  { Value: "10", Type: "Diamond",Color: "Red", CardName:"D_10_0" },
  { Value: "J", Type: "Diamond",Color: "Red", CardName:"D_11_0" },
  { Value: "Q", Type: "Diamond",Color: "Red", CardName:"D_12_0" },
  { Value: "K", Type: "Diamond",Color: "Red", CardName:"D_13_0" },
  { Value: "A", Type: "Club",Color: "Black", CardName:"C_14_0" },
  { Value: "2", Type: "Club", Color: "Black", CardName:"C_2_0" },
  { Value: "3", Type: "Club", Color: "Black", CardName:"C_3_0" },
  { Value: "4", Type: "Club",Color: "Black", CardName:"C_4_0" },
  { Value: "5", Type: "Club",Color: "Black", CardName:"C_5_0" },
  { Value: "6", Type: "Club",Color: "Black", CardName:"C_6_0" },
  { Value: "7", Type: "Club", Color: "Black",CardName:"C_7_0" },
  { Value: "8", Type: "Club",Color: "Black", CardName:"C_8_0" },
  { Value: "9", Type: "Club",Color: "Black", CardName:"C_9_0" },
  { Value: "10", Type: "Club",Color: "Black", CardName:"C_10_0" },
  { Value: "J", Type: "Club",Color: "Black", CardName:"C_11_0" },
  { Value: "Q", Type: "Club",Color: "Black", CardName:"C_12_0" },
  { Value: "K", Type: "Club",Color: "Black", CardName:"C_13_0" },
  { Value: "A", Type: "Spade",Color: "Black", CardName:"S_14_0" },
  { Value: "2", Type: "Spade",Color: "Black", CardName:"S_2_0" },
  { Value: "3", Type: "Spade",Color: "Black", CardName:"S_3_0" },
  { Value: "4", Type: "Spade",Color: "Black", CardName:"S_4_0" },
  { Value: "5", Type: "Spade",Color: "Black", CardName:"S_5_0" },
  { Value: "6", Type: "Spade",Color: "Black", CardName:"S_6_0" },
  { Value: "7", Type: "Spade",Color: "Black", CardName:"S_7_0" },
  { Value: "8", Type: "Spade",Color: "Black", CardName:"S_8_0" },
  { Value: "9", Type: "Spade",Color: "Black", CardName:"S_9_0" },
  { Value: "10", Type: "Spade",Color: "Black", CardName:"S_10_0" },
  { Value: "J", Type: "Spade",Color: "Black", CardName:"S_11_0" },
  { Value: "Q", Type: "Spade",Color: "Black", CardName:"S_12_0" },
  { Value: "K", Type: "Spade",Color: "Black", CardName:"S_13_0" },
];


export const gamePlay = async ( betAmount, betType, user) => {
   // Draw a random card
   let randomCard = _CardsDeck[Math.floor(Math.random() * _CardsDeck.length)];

   // Deduct the bet amount from current balance
   let currentBalance = parseFloat(user.balance);
   currentBalance -= betAmount;
 
   // Calculate winnings based on bet type
   let totalWin = 0;
   if (betType === "Red" || betType === "Black") {
     if (randomCard.Color === betType) {
       totalWin = betAmount * 2;
     }
   } else if ( betType === "Spade" || betType === "Heart" || betType === "Diamond" || betType === "Club" ) {
     if (randomCard.Type === betType) {
       totalWin = betAmount * 4; 
     }
   }
 
   // Add winnings to balance and ensure two decimal places
   currentBalance += totalWin;
   currentBalance = parseFloat(currentBalance.toFixed(2));
 
   // Prepare result object
   let result = {
     status: "SUCCESS",
     drawnCard: randomCard,
     betType: betType,
     betAmount: betAmount.toString(),
     winAmount: totalWin.toString(),
     balance: currentBalance.toString(),
     isWin: totalWin > 0,
   };
 
   return result; 
 };