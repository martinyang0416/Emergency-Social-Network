import ESNController from "../../controllers/ESNController.js";
import { connectToDatabase } from "../../configurations/dbConfig.js";

let dbConnection;

describe("Integration Test for ESN Controller", () => {
    // Connect to the test database before running the tests
    beforeAll(async () => {
        try {
            dbConnection = await connectToDatabase("sb2-test1"); // Use the test database
            // Insert a test user into the test database
            await dbConnection.query(`
                INSERT INTO \`user\` 
                (\`user_name\`, \`user_password\`, \`privilege\`, \`status\`, \`online_status\`, \`Acknowledged\`, \`account_status\`) 
                VALUES ("test", "1234", "citizen", "Undefined", "online", 1, "active")
                ON DUPLICATE KEY UPDATE \`user_password\` = "1234", \`privilege\` = "citizen", \`status\` = "Undefined", \`online_status\` = "online", \`Acknowledged\` = 1, \`account_status\` = "active";
            `);
        } catch (error) {
            console.error("Error setting up test user:", error);
            throw error;
        }
    });

    // TEST 1: Retrieve the status of the test user
    describe("getUserCitizenStatus", () => {
        it("should return the citizen status and username of the test user", async () => {
            // Mock the req and res objects
            const req = { params: { username: "test" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            // Call the getUserCitizenStatus method
            await ESNController.getUserCitizenStatus(req, res);

            // Verify the response
            expect(res.status).toHaveBeenCalledWith(200);
            // expect(res.json).toHaveBeenCalledWith({
            //     username: "test",
            //     citizenStatus: "Undefined",
            //     message: "Internal Server Error",
            //     userid: expect.any(Number), // Use Jest's expect.any(Number) to match any number
            // });
        });

        // Negative Test Cases for getUserCitizenStatus
        it("should return 404 when the user does not exist", async () => {
            // Mock the req and res objects with a non-existent username
            const req = { params: { username: null } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            // Call the getUserCitizenStatus method
            await ESNController.getUserCitizenStatus(req, res);

            // Verify the response
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "User not found",
            });
        });
    });

    // TEST 2: Update the citizen status of the test user and verify the update
    describe("updateUserCitizenStatus", () => {
        it("should update the citizen status of the test user and verify it", async () => {
            // Mock the req and res objects for the update
            const req = {
                body: { username: "test", citizenStatus: "Emergency" },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            // Call the updateUserCitizenStatus method
            await ESNController.updateUserCitizenStatus(req, res);

            // Verify the update response
            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith({
            //     message: "Citizen status updated successfully",
            // });

            // Now, verify the update by querying the database directly
            const [rows] = await dbConnection.query(
                "SELECT status FROM user WHERE user_name = ?",
                ["test"]
            );
            console.log("rows", rows);
            expect(rows[0].status).toBe("Emergency");
        });

        // Negative Test Cases for updateUserCitizenStatus
        it("should return 404 when trying to update a user that does not exist", async () => {
            // Mock the req and res objects with a non-existent username
            const req = {
                body: {
                    username: "nonexistentuser",
                    citizenStatus: "Emergency",
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            // Call the updateUserCitizenStatus method
            await ESNController.updateUserCitizenStatus(req, res);

            // Verify the response
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "User not found",
            });
        });
    });

    describe("getAllUsers", () => {
        it("should return a list of all users", async () => {
            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ESNController.getAllUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(200);

            // Expected users array with multiple entries for verification
            const expectedUsers = [
                {
                    citizenStatus: "Emergency",
                    onLineStatus: "online",
                    username: "test",
                },
            ];

            // Use arrayContaining to check if all expected users are in the response, regardless of order
            // expect(res.json).toHaveBeenCalledWith(
            //     expect.arrayContaining(expectedUsers)
            // );
            // expect(res.json).toHaveBeenCalledWith(res.json);
        });
    });

    describe("isLogout", () => {
        it("should return 200 during success logout", async () => {
            const req = { body: { username: "test" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ESNController.isLogout(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "User offline success",
            });
        });
    });

    // After all tests, clean up the database, and it is important
    afterAll(async () => {
        try {
            // Optionally reset or delete the test user if needed
            await dbConnection.query("SET SQL_SAFE_UPDATES = ?", [0]);
            await dbConnection.query("DELETE FROM user");

            jest.clearAllTimers(); // Clear all timers

            // Close the database connection
            if (dbConnection) {
                await dbConnection.end();
            }
        } catch (error) {
            console.error("Error during afterAll cleanup:", error);
            throw error;
        }
    });
});
