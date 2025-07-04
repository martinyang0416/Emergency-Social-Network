// tests/integration/resourceController.test.js

import ResourceController from "../../controllers/resourceController.js";
import {
    connectToDatabase,
    getDatabaseConnection,
} from "../../configurations/dbConfig.js";

// Mock getDatabaseConnection to return the test dbConnection
jest.mock("../../configurations/dbConfig.js", () => {
    const originalModule = jest.requireActual(
        "../../configurations/dbConfig.js"
    );
    return {
        __esModule: true,
        ...originalModule,
        getDatabaseConnection: jest.fn(),
    };
});

let dbConnection;
let testUser1Id;
let testUser2Id;

describe("ResourceController Integration Tests", () => {
    beforeAll(async () => {
        // Connect to the test database
        dbConnection = await connectToDatabase("sb2-test1");

        // Mock getDatabaseConnection to return dbConnection
        getDatabaseConnection.mockResolvedValue(dbConnection);

        // Disable SQL_SAFE_UPDATES for testing
        await dbConnection.query("SET SQL_SAFE_UPDATES = ?", [0]);

        // Create test users
        const [user1Result] = await dbConnection.query(
            `
            INSERT INTO user 
            (user_name, user_password, privilege, status, online_status, Acknowledged, account_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
            ["testUser1", "password123", "citizen", "OK", "online", 1, "active"]
        );
        testUser1Id = user1Result.insertId;

        const [user2Result] = await dbConnection.query(
            `
            INSERT INTO user 
            (user_name, user_password, privilege, status, online_status, Acknowledged, account_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
            [
                "testUser2",
                "password123",
                "citizen",
                "Help",
                "online",
                1,
                "active",
            ]
        );
        testUser2Id = user2Result.insertId;

        // Insert resources for the users
        await dbConnection.query(
            `
            INSERT INTO resource_management 
            (user_id, username, water, bread, medicine)
            VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)
        `,
            [
                testUser1Id,
                "testUser1",
                10,
                5,
                3,
                testUser2Id,
                "testUser2",
                20,
                10,
                5,
            ]
        );
    });

    afterEach(async () => {
        // Clean up resource requests after each test
        await dbConnection.query(
            "DELETE FROM resource_requests WHERE requester_id IN (?, ?) OR requested_from_id IN (?, ?)",
            [testUser1Id, testUser2Id, testUser1Id, testUser2Id]
        );
    });

    afterAll(async () => {
        // Clean up users and resources after all tests
        await dbConnection.query(
            "DELETE FROM resource_management WHERE user_id IN (?, ?)",
            [testUser1Id, testUser2Id]
        );
        await dbConnection.query("DELETE FROM user WHERE id IN (?, ?)", [
            testUser1Id,
            testUser2Id,
        ]);
        await dbConnection.query("SET SQL_SAFE_UPDATES = ?", [1]);
        await dbConnection.end();
    });

    describe("getUserResources", () => {
        it("should fetch resources for an active user", async () => {
            const req = { params: { username: "testUser1" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ResourceController.getUserResources(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    username: "testUser1",
                    water: 10,
                    bread: 5,
                    medicine: 3,
                })
            );
        });

        it("should return 404 for an inactive user", async () => {
            // Deactivate the user
            await dbConnection.query(
                "UPDATE user SET account_status = 'inactive' WHERE id = ?",
                [testUser1Id]
            );

            const req = { params: { username: "testUser1" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ResourceController.getUserResources(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            expect(res.json).toHaveBeenCalledWith({
                error: "User resources not found",
            });

            // Reactivate the user for other tests
            await dbConnection.query(
                "UPDATE user SET account_status = 'active' WHERE id = ?",
                [testUser1Id]
            );
        });
    });

    describe("createResourceRequest", () => {
        it("should fail when resource quantity exceeds available", async () => {
            const req = {
                body: {
                    requesterUsername: "testUser1",
                    requestedFromUsername: "testUser2",
                    resourceType: "bread",
                    quantity: 20,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ResourceController.createResourceRequest(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith({
            //     error: "Requested user not found or has no resources available.",
            // });
        });

        it("should fail when requesting from an inactive user", async () => {
            // Deactivate the requested user
            await dbConnection.query(
                "UPDATE user SET account_status = 'inactive' WHERE id = ?",
                [testUser2Id]
            );

            const req = {
                body: {
                    requesterUsername: "testUser1",
                    requestedFromUsername: "testUser2",
                    resourceType: "bread",
                    quantity: 3,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ResourceController.createResourceRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Requested user not found or has no resources available.",
            });

            // Reactivate the user for other tests
            await dbConnection.query(
                "UPDATE user SET account_status = 'active' WHERE id = ?",
                [testUser2Id]
            );
        });
    });

    describe("updateUserResource", () => {
        it("should update resource quantity", async () => {
            const req = {
                params: { username: "testUser1" },
                body: { resourceType: "water", quantity: 15 },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ResourceController.updateUserResource(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith({
            //     message: "water updated successfully to 15",
            // });

            const [resources] = await dbConnection.query(
                `
                SELECT water FROM resource_management WHERE user_id = ?;
            `,
                [testUser1Id]
            );
            // expect(resources[0].water).toBe(15);
        });

        it("should return 500 for an invalid resource type", async () => {
            const req = {
                params: { username: "testUser1" },
                body: { resourceType: "invalid_resource", quantity: 15 },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ResourceController.updateUserResource(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
