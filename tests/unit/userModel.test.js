import UserModel from '../../models/userModel.js';
import bcrypt from 'bcrypt';
import { getDatabaseConnection } from '../../configurations/dbConfig.js';
import io from '../../configurations/socketIo.js';

jest.mock('../../configurations/dbConfig.js');
jest.mock('../../configurations/socketIo.js');
jest.mock('bcrypt');

describe('UserModel', () => {
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

    describe('getUserByUsername', () => {
        it('should return user details if the user exists', async () => {
            const username = 'testUser';
            const user = {
                id: 1,
                user_name: 'testUser',
                user_password: 'hashedPassword',
                Acknowledged: 1,
                status: 'active',
            };
            mockConnection.execute.mockResolvedValue([[user]]);
    
            const result = await UserModel.getUserByUsername(username);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), [username]);
            expect(result).toEqual({
                id: user.id,
                username: user.user_name,
                password: user.user_password,
                acknowledged: user.Acknowledged,
                citizenStatus: user.status,
            });
        });
    
        it('should return null if no user is found', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await UserModel.getUserByUsername('unknownUser');
    
            expect(result).toBeNull();
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.getUserByUsername('testUser')).rejects.toThrow('Database Error');
        });
    });
    

    describe('createUser', () => {
        it('should create a new user successfully', async () => {
            const user = new UserModel(null, 'testUser', 'password123', 'user', 'active', 'online', 1);
            mockConnection.execute.mockResolvedValue([{ insertId: 1 }]);
            bcrypt.hashSync.mockReturnValue('hashedPassword');

            const result = await user.createUser();

            expect(bcrypt.hashSync).toHaveBeenCalledWith(user.password, 10);
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
            expect(result).toEqual({ id: 1, username: user.username });
        });

        it('should throw an error if username is missing', async () => {
            const user = new UserModel(null, null, 'password123', 'user', 'active', 'online', 1);

            await expect(user.createUser()).rejects.toThrow('Username is required.');
        });

        it('should throw an error if database query fails', async () => {
            const user = new UserModel(null, 'testUser', 'password123', 'user', 'active', 'online', 1);
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
            bcrypt.hashSync.mockReturnValue('hashedPassword');

            await expect(user.createUser()).rejects.toThrow('Database Error');
        });
    });

    describe('validatePassword', () => {
        it('should validate password successfully', async () => {
            const username = 'testUser';
            const password = 'password123';
            const user = { user_password: 'hashedPassword' };
            mockConnection.execute.mockResolvedValue([[user]]);
            bcrypt.compareSync.mockReturnValue(true);

            const result = await UserModel.validatePassword(username, password);

            expect(bcrypt.compareSync).toHaveBeenCalledWith(password, user.user_password);
            expect(result).toEqual(user);
        });

        it('should return null if password is incorrect', async () => {
            const username = 'testUser';
            const password = 'wrongPassword';
            const user = { user_password: 'hashedPassword' };
            mockConnection.execute.mockResolvedValue([[user]]);
            bcrypt.compareSync.mockReturnValue(false);

            const result = await UserModel.validatePassword(username, password);

            expect(result).toBeNull();
        });

        it('should return null if user does not exist', async () => {
            mockConnection.execute.mockResolvedValue([[]]);

            const result = await UserModel.validatePassword('nonExistentUser', 'password123');

            expect(result).toBeNull();
        });

        it('should throw an error if database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(UserModel.validatePassword('testUser', 'password123')).rejects.toThrow('Database Error');
        });
    });

    describe('acknowledgeUser', () => {
        it('should update the acknowledgment status successfully', async () => {
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);

            const result = await UserModel.acknowledgeUser(1, 'testUser');

            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), [1, 'testUser']);
            expect(result).toEqual({ affectedRows: 1 });
        });

        it('should throw an error if database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(UserModel.acknowledgeUser(1, 'testUser')).rejects.toThrow('Database Error');
        });
    });

    describe('markOnlineStatus', () => {
        it('should update the online status and emit updateUserList event', async () => {
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
            io.emit = jest.fn();

            const result = await UserModel.markOnlineStatus('online', 'testUser');

            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), ['online', 'testUser']);
            expect(io.emit).toHaveBeenCalledWith('updateUserList');
            expect(result).toEqual({ affectedRows: 1 });
        });

        it('should throw an error if database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(UserModel.markOnlineStatus('online', 'testUser')).rejects.toThrow('Database Error');
        });
    });

    describe('getAllUsers', () => {
        it('should return all users successfully', async () => {
            const users = [{ username: 'user1', citizenStatus: 'active', onLineStatus: 'online' }];
            mockConnection.execute.mockResolvedValue([users]);

            const result = await UserModel.getAllUsers();

            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String));
            expect(result).toEqual(users);
        });

        it('should throw an error if database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(UserModel.getAllUsers()).rejects.toThrow('Database Error');
        });
    });

    describe('updateCitizenStatus', () => {
        it('should update citizen status and emit updateUserList event', async () => {
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
            io.emit = jest.fn();

            const result = await UserModel.updateCitizenStatus('testUser', 'inactive');

            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), ['inactive', 'testUser']);
            expect(io.emit).toHaveBeenCalledWith('updateUserList');
            expect(result).toEqual({ affectedRows: 1 });
        });

        it('should throw an error if database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(UserModel.updateCitizenStatus('testUser', 'inactive')).rejects.toThrow('Database Error');
        });
    });

    describe('insertUserStatusHistory', () => {
        it('should insert user status history successfully', async () => {
            const username = 'testUser';
            const citizenStatus = 'active';
            const user = { id: 1 };
            mockConnection.execute
                .mockResolvedValueOnce([[user]]) // Mock SELECT user ID
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // Mock INSERT query
    
            const result = await UserModel.insertUserStatusHistory(username, citizenStatus);
    
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(mockConnection.execute).toHaveBeenNthCalledWith(1, expect.any(String), [username]);
            expect(mockConnection.execute).toHaveBeenNthCalledWith(2, expect.any(String), [user.id, username, citizenStatus]);
            expect(result).toEqual({ affectedRows: 1 });
        });
    
        it('should throw an error if the user does not exist', async () => {
            mockConnection.execute.mockResolvedValueOnce([[]]); // No user found
    
            await expect(UserModel.insertUserStatusHistory('unknownUser', 'active')).rejects.toThrow('User not found');
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.insertUserStatusHistory('testUser', 'active')).rejects.toThrow('Database Error');
        });
    });    

    describe('updateUser', () => {
        it('should update username successfully', async () => {
            const userId = 1;
            const updates = { username: 'newUsername' };
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
    
            const result = await UserModel.updateUser(userId, updates);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(
                'UPDATE user SET user_name = ? WHERE id = ?',
                ['newUsername', userId]
            );
            expect(result).toEqual({ success: true, message: 'User updated successfully.' });
        });
    
        it('should hash and update the password', async () => {
            const userId = 1;
            const updates = { password: 'newPassword123' };
            bcrypt.hashSync.mockReturnValue('hashedPassword');
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
    
            const result = await UserModel.updateUser(userId, updates);
    
            expect(bcrypt.hashSync).toHaveBeenCalledWith('newPassword123', 10);
            expect(mockConnection.execute).toHaveBeenCalledWith(
                'UPDATE user SET user_password = ? WHERE id = ?',
                ['hashedPassword', userId]
            );
            expect(result).toEqual({ success: true, message: 'User updated successfully.' });
        });
    
        it('should return an error if no valid fields are provided', async () => {
            const userId = 1;
            const updates = {}; // No valid fields to update
    
            const result = await UserModel.updateUser(userId, updates);
    
            expect(result).toEqual({ success: false, message: 'No valid fields to update.' });
        });
    
        it('should throw an error if the database query fails', async () => {
            const userId = 1;
            const updates = { username: 'newUsername' };
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.updateUser(userId, updates)).rejects.toThrow('Database Error');
        });
    });

    describe('searchPrivateUsersByStatus', () => {
        it('should return recipient statuses for a given sender', async () => {
            const sender = 'testSender';
            const recipients = [{ message_receiver: 'recipient1' }, { message_receiver: 'recipient2' }];
            const statuses = [
                { id: 1, user_name: 'recipient1', status: 'active', status_timestamp: '2024-11-30 10:00:00' },
                { id: 2, user_name: 'recipient2', status: 'inactive', status_timestamp: '2024-11-30 11:00:00' },
            ];
            mockConnection.execute
                .mockResolvedValueOnce([recipients]) // Mock recipients query
                .mockResolvedValueOnce([statuses]); // Mock status query
    
            const result = await UserModel.searchPrivateUsersByStatus(sender);
    
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(result).toEqual(statuses);
        });
    
        it('should return an empty array if no recipients are found', async () => {
            mockConnection.execute.mockResolvedValueOnce([[]]); // No recipients
    
            const result = await UserModel.searchPrivateUsersByStatus('unknownSender');
    
            expect(result).toEqual([]);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.searchPrivateUsersByStatus('testSender')).rejects.toThrow('Database Error');
        });
    });

    describe('getAllUsersForAdmin', () => {
        it('should return all users for admin', async () => {
            const users = [
                { username: 'adminUser', status: 'active', privilege: 'admin' },
                { username: 'testUser', status: 'inactive', privilege: 'user' },
            ];
            mockConnection.execute.mockResolvedValue([users]);
    
            const result = await UserModel.getAllUsersForAdmin();
    
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String));
            expect(result).toEqual(users);
        });
    
        it('should throw an error if database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.getAllUsersForAdmin()).rejects.toThrow('Database Error');
        });
    });

    describe('checkUserExists', () => {
        it('should return true if the user exists and is active', async () => {
            const username = 'testUser';
            mockConnection.execute.mockResolvedValue([[{ id: 1 }]]);
    
            const result = await UserModel.checkUserExists(username);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), [username]);
            expect(result).toBe(true);
        });
    
        it('should return false if the user does not exist', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await UserModel.checkUserExists('unknownUser');
    
            expect(result).toBe(false);
        });
    
        it('should throw an error if database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.checkUserExists('testUser')).rejects.toThrow('Database Error');
        });
    });    

    describe('updateUser', () => {
        it('should update the username successfully', async () => {
            const userId = 1;
            const updates = { username: 'newUserName' };
    
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
    
            const result = await UserModel.updateUser(userId, updates);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                ['newUserName', userId]
            );
            expect(result).toEqual({ success: true, message: 'User updated successfully.' });
        });
    
        it('should update multiple fields successfully', async () => {
            const userId = 1;
            const updates = { username: 'newUserName', privilegeLevel: 'admin' };
    
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
    
            const result = await UserModel.updateUser(userId, updates);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                ['newUserName', 'admin', userId]
            );
            expect(result).toEqual({ success: true, message: 'User updated successfully.' });
        });
    
        it('should hash the password when updating it', async () => {
            const userId = 1;
            const updates = { password: 'newPassword123' };
    
            bcrypt.hashSync.mockReturnValue('hashedPassword');
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
    
            const result = await UserModel.updateUser(userId, updates);
    
            expect(bcrypt.hashSync).toHaveBeenCalledWith('newPassword123', 10);
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                ['hashedPassword', userId]
            );
            expect(result).toEqual({ success: true, message: 'User updated successfully.' });
        });
    
        it('should return an error if no valid fields are provided', async () => {
            const userId = 1;
            const updates = {}; // No valid fields
    
            const result = await UserModel.updateUser(userId, updates);
    
            expect(result).toEqual({ success: false, message: 'No valid fields to update.' });
        });
    
        it('should throw an error if the database query fails', async () => {
            const userId = 1;
            const updates = { username: 'newUserName' };
    
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.updateUser(userId, updates)).rejects.toThrow('Database Error');
        });
    });

    describe('getUserByUsernameForValidation', () => {
        it('should return user details for validation', async () => {
            const username = 'testUser';
            const user = {
                id: 1,
                user_name: 'testUser',
                user_password: 'hashedPassword',
                Acknowledged: 1,
                status: 'active',
                privilege: 'admin',
            };
            mockConnection.execute.mockResolvedValue([[user]]);
    
            const result = await UserModel.getUserByUsernameForValidation(username);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), [username]);
            expect(result).toEqual({
                id: user.id,
                username: user.user_name,
                password: user.user_password,
                acknowledged: user.Acknowledged,
                citizenStatus: user.status,
                privilege: user.privilege,
            });
        });
    
        it('should return null if no user is found', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await UserModel.getUserByUsernameForValidation('nonexistentUser');
    
            expect(result).toBeNull();
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(
                UserModel.getUserByUsernameForValidation('testUser')
            ).rejects.toThrow('Database Error');
        });
    });

    describe('searchUsersByStatus', () => {
        it('should return users with the specified status', async () => {
            const status = 'active';
            const users = [
                { id: 1, username: 'user1', citizenStatus: 'active', onlineStatus: 'online' },
                { id: 2, username: 'user2', citizenStatus: 'active', onlineStatus: 'offline' },
            ];
            mockConnection.execute.mockResolvedValue([users]);
    
            const result = await UserModel.searchUsersByStatus(status);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), [status]);
            expect(result).toEqual(users);
        });
    
        it('should return an empty array if no users match the status', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await UserModel.searchUsersByStatus('inactive');
    
            expect(result).toEqual([]);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.searchUsersByStatus('active')).rejects.toThrow('Database Error');
        });
    });    
    
    describe('searchUsersByUsername', () => {
        it('should return users matching the partial username', async () => {
            const partialUsername = 'user';
            const users = [
                { id: 1, username: 'user1', citizenStatus: 'active', onlineStatus: 'online' },
                { id: 2, username: 'user2', citizenStatus: 'active', onlineStatus: 'offline' },
            ];
            mockConnection.execute.mockResolvedValue([users]);
    
            const result = await UserModel.searchUsersByUsername(partialUsername);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), [`%${partialUsername}%`]);
            expect(result).toEqual(users);
        });
    
        it('should return an empty array if no users match the partial username', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await UserModel.searchUsersByUsername('nonexistentUser');
    
            expect(result).toEqual([]);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.searchUsersByUsername('user')).rejects.toThrow('Database Error');
        });
    });    

    describe('getAllUsersForAdmin', () => {
        it('should fetch all users for admin successfully', async () => {
            const users = [
                { username: 'admin1', status: 'active', privilege: 'admin' },
                { username: 'user1', status: 'inactive', privilege: 'user' },
            ];
            mockConnection.execute.mockResolvedValue([users]);
    
            const result = await UserModel.getAllUsersForAdmin();
    
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String));
            expect(result).toEqual(users);
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.getAllUsersForAdmin()).rejects.toThrow('Database Error');
        });
    });
    
    describe('getAccountStatusByUsername', () => {
        it('should return the account status of the user', async () => {
            const username = 'testUser';
            const accountStatus = { accountStatus: 'active' };
            mockConnection.execute.mockResolvedValue([[accountStatus]]);
    
            const result = await UserModel.getAccountStatusByUsername(username);
    
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), [username]);
            expect(result).toBe(accountStatus.accountStatus);
        });
    
        it('should return null if the user does not exist', async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await UserModel.getAccountStatusByUsername('unknownUser');
    
            expect(result).toBeNull();
        });
    
        it('should throw an error if the database query fails', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));
    
            await expect(UserModel.getAccountStatusByUsername('testUser')).rejects.toThrow('Database Error');
        });
    });    
});
