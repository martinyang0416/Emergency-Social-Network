import UserModel from "../models/userModel.js";
import MessageModel from "../models/messageModel.js";
import io from "../configurations/socketIo.js";

class MessageController {
    // Method to send a public message (already existing)
    static async sendMessage(req, res) {
        const { message, sender, index, privilege } = req.body;
        const timestamp = new Date();
    
        try {
            if (!sender) {
                throw new Error("Sender name is missing.");
            }
    
            const user = await UserModel.getUserByUsername(sender);
            if (!user) {
                throw new Error(`User with username '${sender}' not found.`);
            }
    
            // Check if user status is Active
            // if (user.accountStatus !== "Active") {
            //     throw new Error("User must have an 'Active' status to send messages.");
            // }
    
            let result;
            if (index == 1) {
                // Public message
                result = await MessageModel.createMessage(
                    message,
                    sender,
                    user.citizenStatus,
                    timestamp,
                    null
                );
            } else {
                //Announcement
                if (user.privilege == "citizen") {
                    res.status(500).json({
                        message: "Error sending message",
                        error: "Only coordinators can send announcements.",
                    });
                    return;
                }

                result = await MessageModel.createAllAnnouncement(
                    message,
                    sender,
                    user.citizenStatus,
                    timestamp,
                    null,
                    null
                );
            }
    
            // Prepare the message data to broadcast
            const messageData = {
                message_text: message,
                message_sent_time: timestamp,
                message_sender: sender,
                message_sender_status: user.citizenStatus,
            };
    
            // Emit the message to all clients
            if (index == 1) {
                io.emit("broadcast message", messageData);
            } else {
                io.emit("broadcast annoucement", messageData);
            }
    
            res.status(200).json({
                message: "Message sent successfully",
                result: result,
            });
        } catch (error) {
            //console.error("Error sending message:", error.message);
            res.status(500).json({
                message: "Error sending message",
                error: error.message,
            });
        }
    }
    

    // Method to get all public messages (already existing)
    static async getAllMessages(req, res) {
        const messageID = req.query.messageId;
        console.log("Message ID: ");
        console.log(messageID);
        console.log(typeof messageID);
        try {
            const messages = await MessageModel.getAllMessages(messageID);
            const modifiedMessages = messages.map((message) => ({
                ...message,
                message_sender_status: message.message_sender_status,
            }));
            // console.log("Fetched messages:", modifiedMessages);
            res.status(200).json(modifiedMessages);
        } catch (error) {
            console.error("Error fetching messages:", error);
            res.status(500).json({ message: "Error fetching messages" });
        }
    }

    static async sendPrivateMessage(req, res) {
        const { message, sender, recipient } = req.body;
        const timestamp = new Date();

        try {
            if (!sender) {
                return res.status(400).json({ error: "Sender is required" });
            }

            if (!recipient) {
                return res.status(400).json({ error: "Recipient is required" });
            }

            if (!message) {
                return res
                    .status(400)
                    .json({ error: "Message text is required" });
            }

            const senderUser = await UserModel.getUserByUsername(sender);
            const recipientUser = await UserModel.getUserByUsername(recipient);

            if (!senderUser || !recipientUser) {
                return res
                    .status(404)
                    .json({ error: "Sender or recipient not found." });
            }

            const result = await MessageModel.createPrivateMessage(
                message,
                sender,
                recipient,
                senderUser.citizenStatus,
                recipientUser.citizenStatus,
                timestamp
            );

            const messageData = {
                message_text: message,
                message_sent_time: timestamp,
                message_sender: sender,
                message_sender_status: senderUser.citizenStatus,
                message_receiver: recipient,
                message_receiver_status: recipientUser.citizenStatus,
                read_status: 0,
            };

            const senderSocketId = io.getSocketIdByUsername(sender);
            const recipientSocketId = io.getSocketIdByUsername(recipient);

            if (senderSocketId) {
                io.to(senderSocketId).emit("private message", messageData); // Emit to sender's socket
            }
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("private message", messageData); // Emit to recipient's socket

                io.to(recipientSocketId).emit("check unread messages");
            }

            res.status(200).json({
                message: "Private message sent successfully",
                result: result,
            });
        } catch (error) {
            console.error("Error sending private message:", error.message);
            res.status(500).json({
                message: "Error sending private message",
                error: error.message,
            });
        }
    }

    // Method to fetch private messages between two users
    static async getPrivateMessages(req, res) {
        const { recipient } = req.params;
        const sender = req.user.username;
        const currentUser = req.headers["current-user"]; // Retrieve the current user from headers
        // console.log('Controller: current user:', currentUser);
        try {
            if (!sender) {
                return res.status(400).json({ error: "Sender is required" });
            }

            if (!recipient) {
                return res.status(400).json({ error: "Recipient is required" });
            }

            const recipientUser = await UserModel.getUserByUsername(recipient);
            const senderUser = await UserModel.getUserByUsername(sender);

            if (!senderUser || !recipientUser) {
                return res
                    .status(404)
                    .json({ error: "Sender or recipient not found." });
            }

            const messages = await MessageModel.getPrivateMessagesBetweenUsers(
                sender,
                recipient,
                currentUser
            );
            res.status(200).json(messages);
        } catch (error) {
            console.error("Error fetching private messages:", error.message);
            res.status(500).json({
                message: "Error fetching private messages",
                error: error.message,
            });
        }
    }

    // Method to get users with unread messages for the current user
    static async getUsersWithUnreadMessages(req, res) {
        const currentUser = req.user.username; // Assuming req.user is set by auth middleware

        try {
            const unreadUsers = await MessageModel.getUnreadMessagesForUser(
                currentUser
            );
            res.status(200).json({ unreadUsers });
        } catch (error) {
            console.error("Error fetching unread users:", error.message);
            res.status(500).json({
                message: "Error fetching unread users",
                error: error.message,
            });
        }
    }

    // Method to fetch unread private messages between two users
    static async getUnreadMessages(req, res) {
        const { recipient } = req.params;
        const sender = req.user.username;
        console.log("Controller: recipient:", recipient, "sender:", sender);

        try {
            if (!sender) {
                return res.status(400).json({ error: "Sender is required" });
            }

            if (!recipient) {
                return res.status(400).json({ error: "Recipient is required" });
            }

            const recipientUser = await UserModel.getUserByUsername(recipient);
            const senderUser = await UserModel.getUserByUsername(sender);

            if (!senderUser || !recipientUser) {
                return res
                    .status(404)
                    .json({ error: "Sender or recipient not found." });
            }

            const unreadMessages =
                await MessageModel.getUnreadMessagesBetweenUsers(
                    sender,
                    recipient
                );
            console.log(unreadMessages);
            res.status(200).json(unreadMessages);
        } catch (error) {
            console.error("Error fetching unread messages:", error.message);
            res.status(500).json({
                message: "Error fetching unread messages",
                error: error.message,
            });
        }
    }

    static async markMessagesAsRead(req, res) {
        const { recipient } = req.params;
        const currentUser = req.body.currentUser; // The user leaving the chat

        try {
            const recipientUser = await UserModel.getUserByUsername(recipient);

            if (!recipientUser) {
                return res
                    .status(404)
                    .json({ error: "Recipient or user not found" });
            }

            const result = await MessageModel.markMessagesAsRead(
                currentUser,
                recipient
            );

            if (!result || result == null) {
                res.status(404).json({
                    error: "No messages to mark as read",
                    result: result,
                });
            }

            res.status(200).json({
                message: "Messages marked as read",
                result: result,
            });
        } catch (error) {
            console.error("Error marking messages as read:", error.message);
            res.status(500).json({
                message: "Error marking messages as read",
                error: error.message,
            });
        }
    }
}

export default MessageController;