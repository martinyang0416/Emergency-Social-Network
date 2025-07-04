import { getDatabaseConnection } from "../configurations/dbConfig.js";

class WalletModel {
    static async getUserBalance(user_name) {
        try {
            const connection = await getDatabaseConnection();

            const query = `
                SELECT w.balance
                FROM wallet w
                JOIN user u ON w.user_id = u.id
                WHERE u.user_name = ?
                AND u.account_status = 'active';
            `;

            const [rows] = await connection.execute(query, [user_name]);

            if (rows.length === 0) {
                return null; // No wallet found for this user
            }

            return rows[0].balance;
        } catch (error) {
            console.error("Error fetching user balance:", error.message);
            throw error;
        }
    }

    static async addCard(username, cardNumber, holderName, expire_month, expire_year, cvv) {
        try {
            const connection = await getDatabaseConnection();
        
            // Check if the card already exists for the user
            const checkQuery = `
                SELECT c.*
                FROM cards c
                JOIN user u ON c.user_id = u.id
                WHERE u.user_name = ?
                AND c.card_number = ?
                AND u.account_status = 'active';
            `;
        
            const [existingCard] = await connection.execute(checkQuery, [username, cardNumber]);


            // console.log("Existing card:", existingCard);
            // console.log(username, cardNumber, holderName, expire_month, expire_year, cvv);

        
            // console.log("Existing card:", existingCard);
            // console.log(username, cardNumber, holderName, expire_month, expire_year, cvv);

            if (existingCard.length > 0) {
                throw new Error("Card already exists for this user");
            }
        
            // Fetch user ID
            const userIdQuery = `
                SELECT id
                FROM user
                WHERE user_name = ?
                AND account_status = 'active';
            `;
        
            const [[userResult]] = await connection.execute(userIdQuery, [username]);
        
            if (!userResult) {
                throw new Error("User not found or account is not active");
            }
        
            const userId = userResult.id;
        
            // Insert the card
            const insertQuery = `
                INSERT INTO cards (user_id, user_name, card_number, card_holder, expire_year, expire_month, cvv)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `;
        
            const [result] = await connection.execute(insertQuery, [
                userId,
                username,
                cardNumber,
                holderName,
                expire_year,
                expire_month,
                cvv,
            ]);
        
            console.log("Card added:", result);
            return result;
        } catch (error) {
            console.error("Error adding card to database:", error.message);
            throw error;
        }
    }

    static async getUserCards(username) {
        try {
            const connection = await getDatabaseConnection();

            const query = `
                SELECT c.card_number,
                    c.card_holder,
                    c.expire_month,
                    c.expire_year
                FROM cards c
                JOIN user u ON c.user_id = u.id
                WHERE u.user_name = ?
                AND u.account_status = 'active';
            `;

            const [rows] = await connection.execute(query, [username]);

            return rows;
        } catch (error) {
            console.error("Error fetching user cards:", error.message);
            throw error;
        }
    }

    static async updateBalance(username, amount, mode) {
        try {
            const connection = await getDatabaseConnection();

            let query;

            // topup mode
            if (mode == true) {
                query = `
                    UPDATE wallet
                    SET balance = balance + ?
                    WHERE user_name = ?
                `;
            }
            else {
                query = `
                    UPDATE wallet
                    SET balance = balance - ?
                    WHERE user_name = ?
                `;
            }

            await connection.execute(query, [amount, username]);
        } catch (error) {
            console.error("Error updating balance:", error.message);
            throw error;
        }
    }

    static async updateTrascation(username, amount, mode) {
        try {
            const connection = await getDatabaseConnection();
        
            let query;
            const params = [];
        
            if (mode === true) {
                // Top-up mode
                query = `
                    INSERT INTO transactions (sender_id, receiver_id, sender, receiver, amount, transaction_date)
                    VALUES ((SELECT id FROM user WHERE user_name = ?), (SELECT id FROM user WHERE user_name = ?), ?, 'topup', ?, NOW());
                `;
                params.push(username, username, username, amount);
            } else if (mode === false) {
                // Withdraw mode
                query = `
                    INSERT INTO transactions (sender_id, receiver_id, sender, receiver, amount, transaction_date)
                    VALUES ((SELECT id FROM user WHERE user_name = ?), (SELECT id FROM user WHERE user_name = ?), ?, 'withdraw', ?, NOW());
                `;
                params.push(username, username, username, amount);
            } else {
                // Custom mode
                query = `
                    INSERT INTO transactions (sender_id, receiver_id, sender, receiver, amount, transaction_date)
                    VALUES ((SELECT id FROM user WHERE user_name = ?), (SELECT id FROM user WHERE user_name = ?), ?, ?, ?, NOW());
                `;
                params.push(username, mode, username, mode, amount);
            }
        
            await connection.execute(query, params);
        
            console.log("Transaction updated successfully.");
        } catch (error) {
            console.error("Error updating transaction:", error.message);
            throw error;
        }
    }

    static async getTransactionsByUsername(username) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
            SELECT sender, receiver, amount, transaction_date
            FROM transactions
            WHERE sender = ? OR receiver = ?
            ORDER BY transaction_date DESC
        `;
            const [rows] = await connection.execute(query, [username, username]);
            return rows;
        } catch (error) {
            console.error("Error fetching transactions:", error.message);
            throw error;
        }
    }

    static async getTransactionsByUser(username) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
            SELECT u_sender.user_name AS sender,
                u_receiver.user_name AS receiver,
                t.amount,
                t.transaction_date
            FROM transactions t
            JOIN user u_sender ON t.sender_id = u_sender.id
            JOIN user u_receiver ON t.receiver_id = u_receiver.id
            WHERE (u_sender.user_name = ? OR u_receiver.user_name = ?)
            AND u_sender.account_status = 'active'
            AND u_receiver.account_status = 'active';
        `;
            const [rows] = await connection.execute(query, [username, username]);
            return rows;
        } catch (error) {
            console.error("Error fetching transactions:", error.message);
            throw error;
        }
    }

    static async addTransaction(transaction) {
        try {
            const { sender, receiver, amount, transaction_date } = transaction;
            const connection = await getDatabaseConnection();
        
            // Fetch sender and receiver IDs in separate queries
            const senderQuery = 'SELECT id FROM user WHERE user_name = ?';
            const receiverQuery = 'SELECT id FROM user WHERE user_name = ?';
        
            const [[senderResult]] = await connection.execute(senderQuery, [sender]);
            const [[receiverResult]] = await connection.execute(receiverQuery, [receiver]);
        
            if (!senderResult || !receiverResult) {
                throw new Error('Sender or receiver not found in the database.');
            }

            console.log("dddddddddddd",receiverResult.id);
        
            const senderId = senderResult.id;
            const receiverId = receiverResult.id;
        
            // Insert transaction
            const insertQuery = `
                INSERT INTO transactions (sender_id, receiver_id, sender, receiver, amount, transaction_date)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
        
            await connection.execute(insertQuery, [
                senderId,
                receiverId,
                sender,
                receiver,
                amount,
                transaction_date
            ]);
        
            console.log('Transaction added successfully.');
        } catch (error) {
            console.error('Error adding transaction:', error.message);
            throw error;
        }
    }

    static async getCardByNumber(username, cardNumber) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
            SELECT c.*
            FROM cards c
            JOIN user u ON c.user_id = u.id
            WHERE u.user_name = ?
            AND c.card_number = ?
            AND u.account_status = 'active';
        `;
            const [rows] = await connection.execute(query, [username, cardNumber]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error fetching card by number:", error.message);
            throw error;
        }
    }

    static async deleteCard(username, cardNumber) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
            DELETE 
            FROM cards 
            WHERE user_name = ? AND card_number = ?
        `;
            const [result] = await connection.execute(query, [username, cardNumber]);
            if (result.affectedRows === 0) {
                throw new Error("No card was deleted");
            }
        } catch (error) {
            console.error("Error deleting card:", error.message);
            throw error;
        }
    }

}

export default WalletModel;
