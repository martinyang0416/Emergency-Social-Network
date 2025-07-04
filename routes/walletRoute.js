import express from "express";
import WalletController from "../controllers/walletController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const walletRouter = express.Router();

// Route to fetch user balance
walletRouter.get("/balance/:username", authMiddleware, WalletController.getBalance);

walletRouter.post("/cards", authMiddleware, WalletController.addCard);

walletRouter.get("/cards/:username", authMiddleware, WalletController.getCards);

walletRouter.post('/verifications', authMiddleware, WalletController.verifyCVV);

walletRouter.get("/transactions/:username", authMiddleware, WalletController.getUserTransactions);

walletRouter.get("/statistics/:username", authMiddleware, WalletController.getStatistics);

walletRouter.get("/users", authMiddleware, WalletController.getAllUsers);

walletRouter.post("/donations", authMiddleware, WalletController.processDonation);

walletRouter.delete("/cards/:cardNumber", authMiddleware, WalletController.removeCard);


export default walletRouter;
 