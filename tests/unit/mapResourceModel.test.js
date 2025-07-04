import MapResourceModel from '../../models/mapResourceModel.js';
import { getDatabaseConnection } from '../../configurations/dbConfig.js';

jest.mock('../../configurations/dbConfig.js');

describe('MapResourceModel', () => {
    let mockConnection;

    beforeEach(() => {
        mockConnection = {
            execute: jest.fn(),
        };
        getDatabaseConnection.mockResolvedValue(mockConnection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Test for get all resources
    describe('getAllResources', () => {
        it('should return an empty array if there are no resources (positive)', async () => {
            mockConnection.execute.mockResolvedValue([[]]);

            const result = await MapResourceModel.getAllResources();

            expect(result).toEqual([]);
        });

        it('should throw an error if the database query fails (negative)', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(MapResourceModel.getAllResources()).rejects.toThrow('Database Error');
        });
    });

    // Test for add resources
    describe('addResource', () => {
        it('should add a new resource successfully (positive)', async () => {
            mockConnection.execute.mockResolvedValue([{ insertId: 1 }]);
        
            const result = await MapResourceModel.addResource(
                'Resource Title',
                'Resource Description',
                10.0,
                20.0
            );
        
            const normalizeQuery = (query) =>
                query
                    .replace(/\s+/g, ' ')
                    .trim();
        
            const expectedQuery = `
                INSERT INTO map_resource (title, description, latitude, longitude) 
                VALUES (?, ?, ?, ?)
            `;
            const actualQuery = mockConnection.execute.mock.calls[0][0];
        
            expect(normalizeQuery(actualQuery)).toBe(normalizeQuery(expectedQuery));
        
            const expectedParams = ['Resource Title', 'Resource Description', 10.0, 20.0];
            const actualParams = mockConnection.execute.mock.calls[0][1];
            expect(actualParams).toEqual(expectedParams);
        
            expect(result).toEqual({ insertId: 1 });
        });

        it('should throw an error if database query fails (negative)', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(
                MapResourceModel.addResource('Resource Title', 'Resource Description', 10.0, 20.0)
            ).rejects.toThrow('Database Error');
        });

        it('should throw an error if latitude or longitude are missing (negative)', async () => {
            await expect(
                MapResourceModel.addResource('Resource Title', 'Resource Description', null, 20.0)
            ).rejects.toThrow();
        });

        it('should throw an error if title is empty (negative)', async () => {
            await expect(
                MapResourceModel.addResource('', 'Resource Description', 10.0, 20.0)
            ).rejects.toThrow();
        });
    });

    // Test for update Location
    describe('updateLocation', () => {
        it('should update the location of a resource successfully (positive)', async () => {
            mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
        
            const result = await MapResourceModel.updateLocation(1, 50.0, 60.0);
        
            const normalizeQuery = (query) =>
                query
                    .replace(/\s+/g, ' ')
                    .trim();
        
            const expectedQuery = `
                UPDATE map_resource 
                SET latitude = ?, longitude = ? 
                WHERE id = ?
            `;
            const actualQuery = mockConnection.execute.mock.calls[0][0];
        
            expect(normalizeQuery(actualQuery)).toBe(normalizeQuery(expectedQuery));
            expect(mockConnection.execute).toHaveBeenCalledWith(expect.any(String), [50.0, 60.0, 1]);
            expect(result).toEqual({ affectedRows: 1 });
        });

        it('should throw an error if the database query fails (negative)', async () => {
            mockConnection.execute.mockRejectedValue(new Error('Database Error'));

            await expect(MapResourceModel.updateLocation(1, 50.0, 60.0)).rejects.toThrow(
                'Database Error'
            );
        });

        it('should throw an error if resource ID is invalid (negative)', async () => {
            await expect(MapResourceModel.updateLocation(null, 50.0, 60.0)).rejects.toThrow();
        });

        it('should throw an error if latitude or longitude are not provided (negative)', async () => {
            await expect(MapResourceModel.updateLocation(1, null, 60.0)).rejects.toThrow();
        });

        it('should throw an error if no rows are affected (negative)', async () => {
            mockConnection.execute.mockResolvedValue([{ affectedRows: 0 }]);

            const result = await MapResourceModel.updateLocation(99, 50.0, 60.0);

            expect(result).toEqual({ affectedRows: 0 });
        });
    });
});
