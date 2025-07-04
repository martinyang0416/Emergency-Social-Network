import { getDatabaseConnection } from '../configurations/dbConfig.js';

class MessageModel {
    // Existing method to create a public message
    static async createMessage(messageText, sender, status, timestamp, conversationId) {
        try {
            const connection = await getDatabaseConnection();
        
            // Fetch the sender ID
            const senderIdQuery = `
                SELECT id 
                FROM user 
                WHERE user_name = ?;
            `;
        
            const [[senderResult]] = await connection.execute(senderIdQuery, [sender]);
        
            if (!senderResult) {
                throw new Error(`Sender '${sender}' not found.`);
            }
        
            const senderId = senderResult.id;
        
            // Insert the message
            const insertQuery = `
                INSERT INTO message 
                (sender_id, message_text, message_sent_time, message_sender, message_sender_status, conversation_id)
                VALUES (?, ?, ?, ?, ?, ?);
            `;
        
            const [result] = await connection.execute(insertQuery, [
                senderId,
                messageText,
                timestamp,
                sender,
                status,
                conversationId || null,
            ]);
        
            return result;
        } catch (error) {
            console.error("Error inserting message:", error.message);
            throw error;
        }        
    }

    static async searchAnnouncementsBywords(wordList) {
        try {
            // const connection = await connectToDatabase(databaseName);
            const connection = await getDatabaseConnection();
    
            // Construct the query with parameterized placeholders for security
            const conditions = wordList.map(() => `announcement_content LIKE ?`).join(' OR ');
            const query = `
                SELECT a.id,
                    a.announcement_content,
                    a.announcement_sent_time,
                    u.user_name AS announcement_sender,
                    a.announcement_sender_status
                FROM announcements a
                JOIN user u ON a.sender_id = u.id
                WHERE ${conditions}
                AND u.account_status = 'active'
                ORDER BY a.announcement_sent_time DESC;
            `;
    
            // Prepare search patterns with wildcards for partial matches
            const searchPatterns = wordList.map(word => `%${word}%`);
    
            // Execute the query with the patterns as input
            const [rows] = await connection.execute(query, searchPatterns);
            console.log('Fetched announcements from database:', rows);
            return rows;
        } catch (error) {
            console.error('Error fetching announcements:', error);
            throw error;
        }
    }
    
    static async searchMessagesBywords(wordList) {
        try {
            const connection = await getDatabaseConnection();
    
            // Construct the query with parameterized placeholders for security
            const conditions = wordList.map(() => `message_text LIKE ?`).join(' OR ');
            const query = `
                SELECT m.id,
                    m.message_text,
                    m.message_sent_time,
                    u.user_name AS message_sender,
                    m.message_sender_status
                FROM message m
                JOIN user u ON m.sender_id = u.id
                WHERE ${conditions}
                AND u.account_status = 'active'
                ORDER BY m.message_sent_time DESC;
            `;
    
            // Prepare search patterns with wildcards for partial matches
            const searchPatterns = wordList.map(word => `%${word}%`);
    
            // Execute the query with the patterns as input
            const [rows] = await connection.execute(query, searchPatterns);
            console.log('Fetched announcements from database:', rows);
            return rows;
        } catch (error) {
            console.error('Error fetching announcements:', error);
            throw error;
        }
    }

    // Existing method to get all public messages
    static async getAllMessages(index) {
        try {
            // const connection = await connectToDatabase(databaseName);
            const connection = await getDatabaseConnection();
            
            let query;
            if (index == 1){
                query = `
                SELECT m.*
                FROM message m
                JOIN user u ON m.sender_id = u.id
                WHERE u.account_status = 'active'
                ORDER BY m.message_sent_time ASC;
                `;
                }
            else {
                console.log("correct");
                query = `
                SELECT a.announcement_content AS message_text,
                    a.announcement_sent_time AS message_sent_time,
                    u.user_name AS message_sender,
                    a.announcement_sender_status AS message_sender_status
                FROM announcements a
                JOIN user u ON a.sender_id = u.id
                WHERE u.account_status = 'active'
                ORDER BY a.announcement_sent_time ASC;
                `;
            }
            const [rows] = await connection.query(query);
            // console.log("Fetched messages from database:", rows);
            return rows;
        } catch (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }
    }

    // Existing method to create a announcement
    static async createAllAnnouncement(messageText, sender, status, timestamp, conversationId, priority) {
        try {
            const connection = await getDatabaseConnection();
        
            // Fetch the sender ID
            const senderIdQuery = `
                SELECT id 
                FROM user 
                WHERE user_name = ?;
            `;
        
            const [[senderResult]] = await connection.execute(senderIdQuery, [sender]);
        
            if (!senderResult) {
                throw new Error(`Sender '${sender}' not found.`);
            }
        
            const senderId = senderResult.id;
        
            // Insert the announcement
            const insertQuery = `
                INSERT INTO announcements 
                (sender_id, announcement_content, announcement_sent_time, announcement_sender, announcement_sender_status, announcement_priority)
                VALUES (?, ?, ?, ?, ?, ?);
            `;
        
            const [result] = await connection.execute(insertQuery, [
                senderId,
                messageText,
                timestamp,
                sender,
                status,
                priority || 0,
            ]);
        
            return result;
        } catch (error) {
            console.error("Error inserting announcement:", error.message);
            throw error;
        }        
    }

    // Method to create a private message
    static async createPrivateMessage(messageText, sender, recipient, senderStatus, recipientStatus, timestamp) {
        try {
            const connection = await getDatabaseConnection();
        
            // Fetch sender and receiver IDs in separate queries
            const senderQuery = 'SELECT id FROM user WHERE user_name = ?';
            const receiverQuery = 'SELECT id FROM user WHERE user_name = ?';
        
            const [[senderResult]] = await connection.execute(senderQuery, [sender]);
            const [[receiverResult]] = await connection.execute(receiverQuery, [recipient]);
        
            if (!senderResult || !receiverResult) {
                throw new Error('Sender or recipient not found in the database.');
            }
        
            const senderId = senderResult.id;
            const receiverId = receiverResult.id;
        
            // Insert private message
            const insertQuery = `
                INSERT INTO privateMessage
                (sender_id, receiver_id, message_text, message_sent_time, message_sender, message_receiver, message_sender_status, message_receiver_status, sender_read_status, receiver_read_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
            `;
        
            const [result] = await connection.execute(insertQuery, [
                senderId,
                receiverId,
                messageText,
                timestamp,
                sender,
                recipient,
                senderStatus,
                recipientStatus
            ]);
        
            return result;
        } catch (error) {
            console.error('Error inserting private message:', error);
            throw error;
        }
    }

    static async searchPrivateMessageBywords(sender, recipient, wordList) {
        try {
            const connection = await getDatabaseConnection();
    
            // Construct the dynamic query with parameterized conditions for word search
            const wordConditions = wordList.map(() => `message_text LIKE ?`).join(' OR ');
            const baseCondition = `
                (message_sender = ? AND message_receiver = ?) 
                OR (message_sender = ? AND message_receiver = ?)
            `;
    
            // Full query that combines the base condition with word search
            const query = `
                SELECT pm.*
                FROM privateMessage pm
                JOIN user u_sender ON pm.sender_id = u_sender.id
                JOIN user u_receiver ON pm.receiver_id = u_receiver.id
                WHERE (${baseCondition})
                AND (${wordConditions})
                AND u_sender.account_status = 'active'
                AND u_receiver.account_status = 'active'
                ORDER BY pm.message_sent_time DESC;
            `;
    
            // Prepare the parameters for the query
            const searchPatterns = wordList.map(word => `%${word}%`);
            const queryParams = [sender, recipient, recipient, sender, ...searchPatterns];
    
            // Execute the query
            const [rows] = await connection.execute(query, queryParams);
    
            return rows;
        } catch (error) {
            console.error('Error fetching private messages by words:', error);
            throw error;
        }
    }
    

    // Method to fetch private messages between two users and update receiver_read_status
    static async getPrivateMessagesBetweenUsers(sender, recipient, currentUser) {
        try {
            // const connection = await connectToDatabase(databaseName);
            const connection = await getDatabaseConnection();

            // Fetch messages between the sender and recipient
            const query = `
            SELECT pm.*
            FROM privateMessage pm
            JOIN user u_sender ON pm.sender_id = u_sender.id
            JOIN user u_receiver ON pm.receiver_id = u_receiver.id
            WHERE ((u_sender.user_name = ? AND u_receiver.user_name = ?)
                OR (u_sender.user_name = ? AND u_receiver.user_name = ?))
            AND u_sender.account_status = 'active'
            AND u_receiver.account_status = 'active'
            ORDER BY pm.message_sent_time ASC;
        `;
            const [rows] = await connection.execute(query, [sender, recipient, recipient, sender]);

            // console.log('MODDEL: !!!!!! sender, recipient, currentUser:', sender, recipient, currentUser);
            // Check that currentUser is defined and matches the recipient
            if (currentUser) {
                // Update the receiver_read_status for the messages where the current user is the recipient
                const updateQuery = `
                UPDATE privateMessage
                SET receiver_read_status = 1
                WHERE message_receiver = ? AND receiver_read_status = 0 AND message_sender = ?
            `;
                await connection.execute(updateQuery, [currentUser, recipient]);
            }

            return rows;
        } catch (error) {
            console.error('Error fetching private messages:', error);
            throw error;
        }
    }

    // Method to get users who have unread messages for the current user
    static async getUnreadMessagesForUser(currentUser) {
        try {
            // const connection = await connectToDatabase(databaseName);
            const connection = await getDatabaseConnection();

            const query = `
            SELECT DISTINCT u_sender.user_name AS message_sender
            FROM privateMessage pm
            JOIN user u_sender ON pm.sender_id = u_sender.id
            JOIN user u_receiver ON pm.receiver_id = u_receiver.id
            WHERE u_receiver.user_name = ?
            AND pm.receiver_read_status = 0
            AND u_sender.account_status = 'active'
            AND u_receiver.account_status = 'active';
        `;
            const [rows] = await connection.execute(query, [currentUser]);

            return rows.map(row => row.message_sender);
        } catch (error) {
            console.error('Error fetching unread messages:', error);
            throw error;
        }
    }

    // Method to fetch unread private messages between two users
    static async getUnreadMessagesBetweenUsers(sender, recipient) {
        try {
            // const connection = await connectToDatabase(databaseName);
            const connection = await getDatabaseConnection();

            const query = `
            SELECT pm.*
            FROM privateMessage pm
            JOIN user u_sender ON pm.sender_id = u_sender.id
            JOIN user u_receiver ON pm.receiver_id = u_receiver.id
            WHERE u_sender.user_name = ?
            AND u_receiver.user_name = ?
            AND pm.receiver_read_status = 0
            AND u_sender.account_status = 'active'
            AND u_receiver.account_status = 'active'
            ORDER BY pm.message_sent_time ASC;
        `;
            const [rows] = await connection.execute(query, [recipient, sender]);
            return rows;
        } catch (error) {
            console.error('Error fetching unread messages:', error);
            throw error;
        }
    }

    static async markMessagesAsRead(currentUser, recipient) {
        try {
            // const connection = await connectToDatabase(databaseName);
            const connection = await getDatabaseConnection();
            const query = `
            UPDATE privateMessage
            SET receiver_read_status = 1
            WHERE message_receiver = ? AND message_sender = ? AND receiver_read_status = 0
        `;
            const [result] = await connection.execute(query, [currentUser, recipient]);
            return result;
        } catch (error) {
            console.error('Error updating messages to read:', error);
            throw error;
        }
    }

}

export default MessageModel;
