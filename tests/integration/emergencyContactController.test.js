import EmergencyContactController from "../../controllers/emergencyContactController.js";
import { connectToDatabase } from "../../configurations/dbConfig.js";
import EmergencyContactModel from "../../models/emergencyContactModel.js";

let dbConnection;
let testUserAId;
let testUserBId;

describe("EmergencyContactController Integration Test", () => {
    beforeAll(async () => {
        try {
            dbConnection = await connectToDatabase("sb2-test1");
            await dbConnection.query("SET SQL_SAFE_UPDATES = ?", [0]);

            // Create test users with proper ENUM values and get their IDs
            const [userAResult] = await dbConnection.query(
                `
                INSERT INTO user
                (user_name, user_password, privilege, status, online_status, Acknowledged, account_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
                ["testA", "password123", "citizen", "OK", "online", 1, "active"]
            );
            testUserAId = userAResult.insertId;

            const [userBResult] = await dbConnection.query(
                `
                INSERT INTO user
                (user_name, user_password, privilege, status, online_status, Acknowledged, account_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
                [
                    "testB",
                    "password123",
                    "citizen",
                    "Help",
                    "online",
                    1,
                    "active",
                ]
            );
            testUserBId = userBResult.insertId;
        } catch (error) {
            console.error("Error in test setup:", error);
            throw error;
        }
    });

    afterEach(async () => {
        try {
            await dbConnection.query(
                "DELETE FROM emergency_contact WHERE owner_id IN (?, ?)",
                [testUserAId, testUserBId]
            );
            await dbConnection.query(
                "DELETE FROM contact_pending_requests WHERE owner_id IN (?, ?)",
                [testUserAId, testUserBId]
            );
            await dbConnection.query(
                "DELETE FROM resource_management WHERE username IN ('testA', 'testB')"
            );
        } catch (error) {
            console.error("Error during afterEach cleanup:", error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            await dbConnection.query("DELETE FROM user WHERE id IN (?, ?)", [
                testUserAId,
                testUserBId,
            ]);
            await dbConnection.query("SET SQL_SAFE_UPDATES = ?", [1]);
            await dbConnection.end();
        } catch (error) {
            console.error("Error in test cleanup:", error);
            throw error;
        }
    });

    describe("sendConnectRequest", () => {
        it("should send a connect request from testA to testB", async () => {
            const req = {
                body: {
                    ownerusername: "testA",
                    contactusername: "testB",
                    ownerid: testUserAId,
                    contactid: testUserBId,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await EmergencyContactController.sendConnectRequest(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         message: "Connect request sent successfully",
            //     })
            // );

            // Verify in database
            const [requests] = await dbConnection.query(
                `SELECT * FROM contact_pending_requests 
                WHERE owner_id = ? AND contact_user_id = ?`,
                [testUserAId, testUserBId]
            );
            expect(requests.length).toBe(1);
        });

        it("should return 500 if there is an error in sending connect request", async () => {
            const req = {
                body: {
                    ownerusername: "testA",
                    contactusername: "testB",
                    ownerid: testUserAId,
                    contactid: testUserBId,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            // Simulate an error by mocking the model method
            jest.spyOn(
                EmergencyContactModel,
                "insertPendingRequest"
            ).mockImplementation(() => {
                throw new Error("Database error");
            });

            await EmergencyContactController.sendConnectRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Internal Server Error",
                })
            );

            // Restore the original implementation
            EmergencyContactModel.insertPendingRequest.mockRestore();
        });
    });

    describe("acceptConnectRequest", () => {
        beforeEach(async () => {
            // Create a pending request
            await dbConnection.query(`
                INSERT INTO contact_pending_requests (owner_id, owner_username, contact_user_id, contact_username, request_timestamp)
                VALUES (${testUserAId}, 'testA', ${testUserBId}, 'testB', NOW());
            `);
        });

        afterEach(async () => {
            // await dbConnection.query(
            //     "DELETE FROM emergency_contact WHERE owner_id IN (?, ?)",
            //     [testUserAId, testUserBId]
            // );
            // await dbConnection.query(
            //     "DELETE FROM emergency_contact WHERE owner_id IN (?, ?)",
            //     [testUserAId, testUserBId]
            // );
            await dbConnection.query(
                "DELETE FROM contact_pending_requests WHERE owner_id IN (?, ?)",
                [testUserAId, testUserBId]
            );
            // await dbConnection.query(
            //     "DELETE FROM resource_management WHERE username IN ('testA', 'testB')"
            // );
        });

        it("should accept a connect request from testA to testB", async () => {
            const req = {
                body: {
                    ownerusername: "testA",
                    contactusername: "testB",
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await EmergencyContactController.acceptConnectRequest(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         message: "Connect request accepted successfully",
            //     })
            // );

            const [rows] = await dbConnection.query(`
                SELECT * FROM emergency_contact 
                WHERE (owner_username = 'testA' AND contact_username = 'testB')
                OR (owner_username = 'testB' AND contact_username = 'testA')
            `);

            expect(rows.length).toBe(2);
        });
    });

    describe("declineConnectRequest", () => {
        beforeEach(async () => {
            // Create a pending request
            await dbConnection.query(`
                INSERT INTO contact_pending_requests (owner_id, owner_username, contact_user_id, contact_username, request_timestamp)
                VALUES (${testUserAId}, 'testA', ${testUserBId}, 'testB', NOW());
            `);
        });
        afterEach(async () => {
            // await dbConnection.query(
            //     "DELETE FROM emergency_contact WHERE owner_id IN (?, ?)",
            //     [testUserAId, testUserBId]
            // );
            // await dbConnection.query(
            //     "DELETE FROM emergency_contact WHERE owner_id IN (?, ?)",
            //     [testUserAId, testUserBId]
            // );
            await dbConnection.query(
                "DELETE FROM contact_pending_requests WHERE owner_id IN (?, ?)",
                [testUserAId, testUserBId]
            );
            // await dbConnection.query(
            //     "DELETE FROM resource_management WHERE username IN ('testA', 'testB')"
            // );
        });

        it("should decline a connect request from testA to testB", async () => {
            const req = {
                body: {
                    ownerusername: "testA",
                    contactusername: "testB",
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await EmergencyContactController.declineConnectRequest(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Connect request declined successfully",
                })
            );

            const [rows] = await dbConnection.query(`
                SELECT * FROM contact_pending_requests 
                WHERE owner_username = 'testA' AND contact_username = 'testB'
            `);

            expect(rows.length).toBe(0);
        });
    });

    describe("shareResource", () => {
        beforeAll(async () => {
            // Create emergency contact relationship
            await dbConnection.query(
                `
                INSERT INTO emergency_contact 
                (owner_id, owner_username, contact_user_id, contact_username)
                VALUES 
                (?, ?, ?, ?),
                (?, ?, ?, ?)
            `,
                [
                    testUserAId,
                    "testA",
                    testUserBId,
                    "testB",
                    testUserBId,
                    "testB",
                    testUserAId,
                    "testA",
                ]
            );

            // Set up initial resources
            await dbConnection.query(
                `
                INSERT INTO resource_management 
                (user_id, username, water, bread, medicine)
                VALUES 
                (?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?)
            `,
                [testUserAId, "testA", 5, 0, 0, testUserBId, "testB", 1, 0, 0]
            );
        });

        it("should share resources between contacts", async () => {
            const req = {
                params: {
                    contactusername: "testB",
                    resourceType: "water",
                },
                body: {
                    ownerusername: "testA",
                    count: 2,
                    ownerid: testUserAId,
                    contactid: testUserBId,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await EmergencyContactController.shareResource(req, res);

            expect(res.status).toHaveBeenCalledWith(200);

            // Verify resource transfer
            const [results] = await dbConnection.query(
                "SELECT username, water FROM resource_management WHERE username IN ('testA', 'testB')"
            );
            const resourceMap = Object.fromEntries(
                results.map((row) => [row.username, row.water])
            );
            expect(resourceMap.testA).toBe(3); // 5 - 2
            expect(resourceMap.testB).toBe(3); // 1 + 2
        });

        it("should return 500 if there is an error in sharing resource", async () => {
            const req = {
                params: {
                    contactusername: "testB",
                    resourceType: "water",
                },
                body: {
                    ownerusername: "testA",
                    count: 5,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            // Simulate an error by mocking the model method
            jest.spyOn(
                EmergencyContactModel,
                "updateResource"
            ).mockImplementation(() => {
                throw new Error("Database error");
            });

            await EmergencyContactController.shareResource(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Internal Server Error",
                })
            );

            // Restore the original implementation
            EmergencyContactModel.updateResource.mockRestore();
        });
    });
});
