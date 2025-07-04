import express from 'express';
import MessageController from '../controllers/messageController.js';
import authMiddleware from "../middlewares/authMiddleware.js";
const messageRouter = express.Router();

// Existing route to send a public message
messageRouter.post('/', authMiddleware, MessageController.sendMessage);

// Existing route to fetch all public messages
messageRouter.get('/', authMiddleware, MessageController.getAllMessages);

// New routes for announcements
messageRouter.post('/announcement', authMiddleware, MessageController.sendMessage);
messageRouter.get('/announcement', authMiddleware, MessageController.getAllMessages);

// NEW: Route to send a private message
messageRouter.post('/private', authMiddleware, MessageController.sendPrivateMessage);

// NEW: Route to fetch private messages between two users
messageRouter.get('/private/:recipient', authMiddleware, MessageController.getPrivateMessages);

// Route to get users with unread messages
messageRouter.get('/unread', authMiddleware, MessageController.getUsersWithUnreadMessages);

// Route to fetch unread private messages between two users
messageRouter.get('/unread/:recipient', authMiddleware, MessageController.getUnreadMessages);

// Route to mark messages as read
messageRouter.post('/private/markRead/:recipient', authMiddleware, MessageController.markMessagesAsRead);


export default messageRouter;
