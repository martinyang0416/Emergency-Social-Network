import MapResourceController from "../../controllers/mapResourceController.js";
import { connectToDatabase } from "../../configurations/dbConfig.js";
import e from "express";

let dbConnection;

describe("Integration Tests for MapResourceController", () => {
    beforeAll(async () => {
        try {
            dbConnection = await connectToDatabase("sb2-test1");

            await dbConnection.query(`
                CREATE TABLE IF NOT EXISTS map_resource (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    latitude FLOAT NOT NULL,
                    longitude FLOAT NOT NULL
                );
            `);
        } catch (error) {
            console.error("Error setting up test database:", error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            await dbConnection.query("DELETE FROM map_resource");
            await dbConnection.query("SET SQL_SAFE_UPDATES = 0;");
            await dbConnection.query("SET FOREIGN_KEY_CHECKS = 0;");
            await dbConnection.query("SET FOREIGN_KEY_CHECKS = 1;");

            if (dbConnection) {
                await dbConnection.end();
            }
        } catch (error) {
            console.error("Error cleaning up test database:", error);
            throw error;
        }
    });

    // Test for get resources
    describe("getResources", () => {
        beforeEach(async () => {
            await dbConnection.query(`
                INSERT INTO map_resource (title, description, latitude, longitude)
                VALUES 
                    ("Test Resource 1", "Description 1", 10.0, 20.0),
                    ("Test Resource 2", "Description 2", 30.0, 40.0);
            `);
        });

        afterEach(async () => {
            await dbConnection.query("DELETE FROM map_resource");
        });

        it("should fetch all resources successfully (positive)", async () => {
            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MapResourceController.getResources(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const responseData = res.json.mock.calls[0][0].data;

            // Convert latitude and longitude to numbers
            responseData.forEach((resource) => {
                resource.latitude = parseFloat(resource.latitude);
                resource.longitude = parseFloat(resource.longitude);
            });
            expect(res.json).toHaveBeenCalledWith({
                message: "Resources fetched successfully",
                data: expect.arrayContaining([
                    expect.objectContaining({
                        title: "Test Resource 1",
                        description: "Description 1",
                        id: expect.any(Number),
                        latitude: expect.any(Number),
                        longitude: expect.any(Number),
                    }),
                    expect.objectContaining({
                        title: "Test Resource 2",
                        description: "Description 2",
                        id: expect.any(Number),
                        latitude: expect.any(Number),
                        longitude: expect.any(Number),
                    }),
                ]),
            });
        });

        it("should return an empty array if no resources exist (positive)", async () => {
            await dbConnection.query("DELETE FROM map_resource");
            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MapResourceController.getResources(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Resources fetched successfully",
                data: [],
            });
        });
    });

    // Test for add resources
    describe("addResource", () => {
        afterEach(async () => {
            await dbConnection.query("DELETE FROM map_resource");
        });

        it("should add a new resource successfully (positive)", async () => {
            const req = {
                body: {
                    title: "New Resource",
                    description: "New Description",
                    latitude: 50.0,
                    longitude: 60.0,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MapResourceController.addResource(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "Resource added successfully",
                data: expect.any(Object),
            });

            const [rows] = await dbConnection.query(
                "SELECT * FROM map_resource WHERE title = ?",
                ["New Resource"]
            );
            rows.forEach((row) => {
                row.latitude = parseFloat(row.latitude);
                row.longitude = parseFloat(row.longitude);
            });
            expect(rows.length).toBe(1);
            expect(rows[0]).toEqual(
                expect.objectContaining({
                    title: "New Resource",
                    description: "New Description",
                    id: expect.any(Number),
                    latitude: expect.any(Number),
                    longitude: expect.any(Number),
                })
            );
        });

        it("should return 500 when required fields are missing (negative)", async () => {
            const req = { body: { title: "Missing Fields" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MapResourceController.addResource(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error adding resource",
                error: "All fields (title, description, latitude, longitude) are required.",
            });
        });
    });

    // Test for update location
    describe("updateResourceLocation", () => {
        beforeEach(async () => {
            await dbConnection.query(`
                INSERT INTO map_resource (id, title, description, latitude, longitude)
                VALUES (1, "Update Resource", "Description", 10.0, 20.0);
            `);
        });

        afterEach(async () => {
            await dbConnection.query("DELETE FROM map_resource");
        });

        it("should update the location of a resource successfully (positive)", async () => {
            const req = {
                params: { id: 1 },
                body: { latitude: 70.0, longitude: 80.0 },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MapResourceController.updateResourceLocation(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Resource location updated successfully",
                data: expect.any(Object),
            });

            const [rows] = await dbConnection.query(
                "SELECT latitude, longitude FROM map_resource WHERE id = ?",
                [1]
            );
            rows.forEach((row) => {
                row.latitude = parseFloat(row.latitude);
                row.longitude = parseFloat(row.longitude);
            });
            expect(rows[0]).toEqual({
                latitude: expect.any(Number),
                longitude: expect.any(Number),
            });
        });

        it("should return 500 when latitude or longitude is missing (negative)", async () => {
            const req = { params: { id: 1 }, body: { latitude: 70.0 } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MapResourceController.updateResourceLocation(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error updating resource location",
                error: "Latitude and Longitude are required.",
            });
        });

        it("should return 500 when resource ID does not exist (negative)", async () => {
            const req = {
                params: { id: 99 },
                body: { latitude: 70.0, longitude: 80.0 },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MapResourceController.updateResourceLocation(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error updating resource location",
                error: "Resource not found.",
            });
        });
    });
});
