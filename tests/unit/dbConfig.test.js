import { setDatabaseConnection, getDatabaseConnection, connectToDatabase } from '../../configurations/dbConfig.js';
import mysqlDatabase from '../../configurations/mysqlDatabase.js';

jest.mock('../../configurations/mysqlDatabase.js');

describe('dbConfig', () => {
    let mockMysqlInstance;

    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(() => {
        console.log.mockRestore();
        console.error.mockRestore();
    });

    beforeEach(() => {
        mockMysqlInstance = {
            connect: jest.fn(),
            disconnect: jest.fn(),
        };
        mysqlDatabase.getInstance.mockReturnValue(mockMysqlInstance);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('setDatabaseConnection', () => {
        it('should set a new database connection successfully', async () => {
            mockMysqlInstance.connect.mockResolvedValue('mockConnection');

            await setDatabaseConnection('testDB');

            expect(mockMysqlInstance.connect).toHaveBeenCalledWith('testDB');
            expect(mockMysqlInstance.disconnect).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('Connected to database in setDatabaseconnection: testDB');
        });

        it('should disconnect existing connection before setting a new one', async () => {
            mockMysqlInstance.connect.mockResolvedValueOnce('mockConnection').mockResolvedValueOnce('newMockConnection');

            // Simulate an existing connection
            await setDatabaseConnection('initialDB');

            await setDatabaseConnection('newDB');

            expect(mockMysqlInstance.disconnect).toHaveBeenCalled();
            expect(mockMysqlInstance.connect).toHaveBeenCalledWith('newDB');
            expect(console.log).toHaveBeenCalledWith('Disconnected from database: initialDB');
            expect(console.log).toHaveBeenCalledWith('Connected to database in setDatabaseconnection: newDB');
        });

        it('should throw an error if connecting to the database fails', async () => {
            mockMysqlInstance.connect.mockRejectedValueOnce(new Error('Connection Error'));

            await expect(setDatabaseConnection('testDB')).rejects.toThrow('Connection Error');
            expect(console.error).toHaveBeenCalledWith('Error during setting database connection for testDB:', expect.any(Error));
        });
    });

    describe('getDatabaseConnection', () => {
        it('should return the current connection if it exists', async () => {
            mockMysqlInstance.connect.mockResolvedValueOnce('mockConnection');

            await setDatabaseConnection('testDB');
            const connection = await getDatabaseConnection();

            expect(connection).toBe('mockConnection');
            expect(mockMysqlInstance.connect).toHaveBeenCalledTimes(1);
        });

        it('should establish a default connection if no connection exists', async () => {
            mockMysqlInstance.connect.mockResolvedValueOnce('defaultConnection');

            const connection = await getDatabaseConnection();

            expect(connection).toBe('mockConnection');
        });
    });

    describe('connectToDatabase', () => {
        it('should connect to the specified database', async () => {
            mockMysqlInstance.connect.mockResolvedValueOnce('mockConnection');

            const connection = await connectToDatabase('specificDB');

            expect(connection).toBe('mockConnection');
            expect(mockMysqlInstance.connect).toHaveBeenCalledWith('specificDB');
            expect(console.log).toHaveBeenCalledWith('Connected to database: specificDB');
        });

        it('should throw an error if connection fails', async () => {
            mockMysqlInstance.connect.mockRejectedValueOnce(new Error('Connection Error'));

            await expect(connectToDatabase('specificDB')).rejects.toThrow('Connection Error');
            expect(console.error).toHaveBeenCalledWith('Error during database connection');
        });
    });
});
