import UserModel from "../models/userModel.js";
import WalletModel from "../models/walletModel.js";
import io from "../configurations/socketIo.js";

class WalletController {
    static async getBalance(req, res) {
        const user_name = req.params.username;

        try {
            const balance = await WalletModel.getUserBalance(user_name);

            if (balance === null) {
                return res.status(404).json({ message: "Wallet not found" });
            }

            res.status(200).json({ balance });
        } catch (error) {
            console.error("Error fetching balance:", error.message);
            res.status(500).json({ message: "Error fetching balance", error: error.message });
        }
    }

    static async addCard(req, res) {
        const { username, cardNumber, holderName, expire_month, expire_year, cvv } = req.body;

        try {
            // Add the card to the database
            const result = await WalletModel.addCard(username, cardNumber, holderName, expire_month, expire_year, cvv);

            res.status(200).json({ message: "Card added successfully", cardId: result.insertId });
        } catch (error) {
            console.error("Error adding card:", error.message);

            // Handle duplicate card error
            if (error.message === "Card already exists for this user") {
                return res.status(409).json({ message: "Card already exists for this user" });
            }

            res.status(500).json({ message: "Error adding card", error: error.message });
        }
    }

    static async getCards(req, res) {
        const username = req.params.username;

        try {
            const cards = await WalletModel.getUserCards(username);

            res.status(200).json(cards);
        } catch (error) {
            console.error("Error fetching cards:", error.message);
            res.status(500).json({ message: "Error fetching cards", error: error.message });
        }
    }

    static async verifyCVV(req, res) {
        const { username, cardNumber, cvv, mode, isTopUpMode, amount } = req.body;
        // console.log(isTopUpMode, amount);

        // console.log(username, cardNumber, cvv, mode, isTopUpMode, amount);
        try {
            const card = await WalletModel.getCardByNumber(username, cardNumber, mode);
            if (!card) {
                return res.status(404).json({ message: "Card not found" });
            }

            const getUserBalance = await WalletModel.getUserBalance(username);

            // console.log(isTopUpMode, amount, getUserBalance, !isTopUpMode && amount > getUserBalance);
            // console.log(parseFloat(amount) > getUserBalance);
            if (card.cvv === parseInt(cvv)) {
                if (!isTopUpMode && parseFloat(amount) > getUserBalance) {
                    return res.status(400).json({ message: "Insufficient balance" });
                }
                await WalletModel.updateBalance(username, amount, isTopUpMode);
                await WalletModel.updateTrascation(username, amount, isTopUpMode);
                return res.status(200).json({ message: "CVV verified successfully" });
            } else {
                return res.status(400).json({ message: "Invalid CVV" });
            }``
        } catch (error) {
            console.error("Error verifying CVV:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    static async getUserTransactions(req, res) {
        const { username } = req.params;

        try {
            const transactions = await WalletModel.getTransactionsByUsername(username);

            if (!transactions) {
                return res.status(404).json({ message: "No transactions found" });
            }

            res.status(200).json(transactions);
        } catch (error) {
            console.error("Error fetching transactions:", error.message);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    static async getStatistics(req, res) {
        const { username } = req.params;

        try {
            const transactions = await WalletModel.getTransactionsByUser(username);

            // Calculate statistics, excluding "topup" and "withdraw"
            const filteredTransactions = transactions.filter(
                (t) => t.receiver !== "topup" && t.receiver !== "withdraw"
            );

            const moneyIn = filteredTransactions
                .filter((t) => t.receiver === username)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const moneyOut = filteredTransactions
                .filter((t) => t.sender === username)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            res.status(200).json({
                moneyIn,
                moneyOut,
            });
        } catch (error) {
            console.error("Error fetching statistics:", error.message);
            res.status(500).json({ message: "Failed to fetch statistics" });
        }
    }


    static async getAllUsers(req, res) {
        try {
            const users = await UserModel.getAllUsers();
            res.status(200).json(users);
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ message: "Failed to fetch users" });
        }
    }


    static async processDonation(req, res) {
        const { sender, receiver } = req.body;
        let { amount } = req.body;
        amount = parseFloat(amount);

        try {
            if (!sender || !receiver || !amount || amount <= 0) {
                return res.status(400).json({ message: "Invalid donation data" });
            }

            // Deduct amount from sender and add to receiver (this assumes you have user balance logic)
            const senderBalance = await WalletModel.getUserBalance(sender);

            console.log(senderBalance, amount);

            if (senderBalance < amount) {
                return res.status(400).json({ message: "Insufficient balance" });
            }

            await WalletModel.updateBalance(sender, -amount, true);~
            await WalletModel.updateBalance(receiver, amount, true);

            // Record transaction
            await WalletModel.updateTrascation(sender, amount, receiver);

            // Notify receiver
            const recipientSocketId = io.getSocketIdByUsername(receiver);
            io.to(recipientSocketId).emit("donation received", { sender, amount });

            res.status(200).json({ message: "Donation successful" });
        } catch (error) {
            console.error("Error processing donation:", error);
            res.status(500).json({ message: "Failed to process donation" });
        }
    }

    static async removeCard(req, res) {
        const { cardNumber } = req.params;
        const username = req.user.username; // Ensure `authMiddleware` adds the username to `req.user`

        try {
            const card = await WalletModel.getCardByNumber(username, cardNumber);
            if (!card) {
                return res.status(404).json({ message: "Card not found" });
            }

            await WalletModel.deleteCard(username, cardNumber);

            res.status(200).json({ message: "Card removed successfully" });
        } catch (error) {
            console.error("Error removing card:", error);
            res.status(500).json({ message: "Failed to remove card", error: error.message });
        }
    }
}

export default WalletController;
