import MessageModel from '../../models/messageModel.js';
import { getDatabaseConnection } from '../../configurations/dbConfig.js';

jest.mock('../../configurations/dbConfig.js');

describe('MessageModel', () => {
    let mockConnection;

    beforeEach(() => {
        mockConnection = {
            execute: jest.fn(),
            query: jest.fn(),
        };
        getDatabaseConnection.mockResolvedValue(mockConnection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createMessage', () => {
        it('should create a public message successfully', async () => {
            const messageText = 'Hello World';
            const sender = 'user1';
            const status = 'online';
            const timestamp = '2024-11-30 14:30:00';
            const conversationId = 1;
    
            const senderResult = { id: 1 };
            const insertResult = { affectedRows: 1 };
    
            // Mock fetching sender ID
            mockConnection.execute.mockResolvedValueOnce([[senderResult]]);
            // Mock inserting message
            mockConnection.execute.mockResolvedValueOnce([insertResult]);
    
            const result = await MessageModel.createMessage(messageText, sender, status, timestamp, conversationId);
    
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(mockConnection.execute).toHaveBeenNthCalledWith(1, expect.any(String), [sender]);
            expect(mockConnection.execute).toHaveBeenNthCalledWith(2, expect.any(String), [
                senderResult.id,
                messageText,
                timestamp,
                sender,
                status,
                conversationId,
            ]);
            expect(result).toEqual(insertResult);
        });
    
        it('should throw an error if the sender is not found', async () => {
            const sender = 'unknownUser';
    
            // Mock sender query to return no results
            mockConnection.execute.mockResolvedValueOnce([[]]);
    
            await expect(
                MessageModel.createMessage('Hello World', sender, 'online', '2024-11-30 14:30:00', 1)
            ).rejects.toThrow(`Sender '${sender}' not found.`);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(
                MessageModel.createMessage('Hello World', 'user1', 'online', '2024-11-30 14:30:00', 1)
            ).rejects.toThrow('Database Error');
        });
    });

    describe('searchAnnouncementsBywords', () => {
        it('should return an empty array if no announcements are found', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await MessageModel.searchAnnouncementsBywords(['unknownWord']);
    
            expect(result).toEqual([]);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(MessageModel.searchAnnouncementsBywords(['event'])).rejects.toThrow('Database Error');
        });
    });
    

    describe('getAllMessages', () => {
        it('should fetch all public messages successfully', async () => {
            const messages = [{ messageText: 'Hello' }, { messageText: 'Hi there' }];
            mockConnection.query.mockResolvedValue([messages]);

            const result = await MessageModel.getAllMessages(1);

            expect(mockConnection.query).toHaveBeenCalledWith(expect.any(String));
            expect(result).toEqual(messages);
        });

        it('should throw an error if the database query fails', async () => {
            mockConnection.query.mockRejectedValue(new Error('Database Error'));

            await expect(MessageModel.getAllMessages(1)).rejects.toThrow('Database Error');
        });
    });

    describe('createPrivateMessage', () => {
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(
                MessageModel.createPrivateMessage('Private Message', 'user1', 'user2', 'online', 'offline', new Date())
            ).rejects.toThrow('Database Error');
        });
    });

    describe('getPrivateMessagesBetweenUsers', () => {
        it('should fetch private messages between two users', async () => {
            const messages = [{ messageText: 'Hello' }, { messageText: 'Hi there' }];
            mockConnection.execute.mockResolvedValue([messages]);

            const result = await MessageModel.getPrivateMessagesBetweenUsers('user1', 'user2', 'user2');

            expect(mockConnection.execute).toHaveBeenCalledTimes(2); // fetch + update read status
            expect(result).toEqual(messages);
        });

        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(
                MessageModel.getPrivateMessagesBetweenUsers('user1', 'user2', 'user2')
            ).rejects.toThrow('Database Error');
        });
    });

    describe('getUnreadMessagesForUser', () => {
        it('should fetch users with unread messages for the current user', async () => {
            const senders = [{ message_sender: 'user1' }, { message_sender: 'user2' }];
            mockConnection.execute.mockResolvedValue([senders]);

            const result = await MessageModel.getUnreadMessagesForUser('user3');

            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), ['user3']);
            expect(result).toEqual(['user1', 'user2']);
        });

        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(MessageModel.getUnreadMessagesForUser('user3')).rejects.toThrow('Database Error');
        });
    });

    describe('getUnreadMessagesBetweenUsers', () => {
        it('should fetch unread private messages between two users', async () => {
            const messages = [{ messageText: 'Unread Message' }];
            mockConnection.execute.mockResolvedValue([messages]);

            const result = await MessageModel.getUnreadMessagesBetweenUsers('user1', 'user2');

            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), ['user2', 'user1']);
            expect(result).toEqual(messages);
        });

        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(
                MessageModel.getUnreadMessagesBetweenUsers('user1', 'user2')
            ).rejects.toThrow('Database Error');
        });
    });

    describe('markMessagesAsRead', () => {
        it('should mark messages as read between the specified users', async () => {
            const affectedRows = [{ affectedRows: 1 }];
            mockConnection.execute.mockResolvedValue([affectedRows]);

            const result = await MessageModel.markMessagesAsRead('user3', 'user1');

            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), ['user3', 'user1']);
            expect(result).toEqual(affectedRows);
        });

        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(
                MessageModel.markMessagesAsRead('user3', 'user1')
            ).rejects.toThrow('Database Error');
        });
    });

    describe('searchMessagesBywords', () => {
        it('should return an empty array if no messages are found', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await MessageModel.searchMessagesBywords(['unknownWord']);
    
            expect(result).toEqual([]);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(MessageModel.searchMessagesBywords(['hello'])).rejects.toThrow('Database Error');
        });
    });
    
    describe('createAllAnnouncement', () => {
        it('should create an announcement successfully', async () => {
            const messageText = 'Announcement text';
            const sender = 'user1';
            const status = 'active';
            const timestamp = '2024-11-30 14:30:00';
            const priority = 1;
    
            const senderResult = { id: 1 };
            const insertResult = { affectedRows: 1 };
    
            // Mock fetching sender ID
            mockConnection.execute.mockResolvedValueOnce([[senderResult]]);
            // Mock inserting announcement
            mockConnection.execute.mockResolvedValueOnce([insertResult]);
    
            const result = await MessageModel.createAllAnnouncement(messageText, sender, status, timestamp, null, priority);
    
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(mockConnection.execute).toHaveBeenNthCalledWith(1, expect.any(String), [sender]);
            expect(mockConnection.execute).toHaveBeenNthCalledWith(2, expect.any(String), [
                senderResult.id,
                messageText,
                timestamp,
                sender,
                status,
                priority,
            ]);
            expect(result).toEqual(insertResult);
        });
    
        it('should throw an error if the sender is not found', async () => {
            const sender = 'unknownSender';
    
            // Mock sender query to return no results
            mockConnection.execute.mockResolvedValueOnce([[]]);
    
            await expect(
                MessageModel.createAllAnnouncement('Announcement text', sender, 'active', '2024-11-30 14:30:00', null, 1)
            ).rejects.toThrow(`Sender '${sender}' not found.`);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(
                MessageModel.createAllAnnouncement('Announcement text', 'user1', 'active', '2024-11-30 14:30:00', null, 1)
            ).rejects.toThrow('Database Error');
        });
    });

    describe('searchPrivateMessageBywords', () => {
        it('should return an empty array if no messages are found', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await MessageModel.searchPrivateMessageBywords('user1', 'user2', ['unknownWord']);
    
            expect(result).toEqual([]);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(
                MessageModel.searchPrivateMessageBywords('user1', 'user2', ['hello'])
            ).rejects.toThrow('Database Error');
        });
    });
});
