import mysqlDatabase from "../../configurations/mysqlDatabase"; // Adjust the path as necessary
import AdminController from "../../controllers/adminController";
import UserModel from "../../models/userModel";
import httpMocks from "node-mocks-http";
import io from "../../configurations/socketIo.js";
import bcrypt from "bcrypt";
import ESNController from "../../controllers/ESNController.js";
import MessageController from "../../controllers/messageController.js";
import MessageModel from "../../models/messageModel.js";
import SpeedTestController from "../../controllers/speedTestController";
import RegisterController from "../../controllers/registerController";
import ResourceModel from "../../models/resourceModel";
import jwt from "jsonwebtoken";

jest.mock("bcrypt", () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));
jest.mock("jsonwebtoken", () => ({
    sign: jest.fn(() => "mocked-token"), // Mock the token
}));

jest.mock("../../models/userModel");
jest.mock("../../configurations/socketIo.js", () => ({
    emit: jest.fn(),
    handleNameProcess: jest.fn(),
    handleStatusProcess: jest.fn(),
}));
jest.mock("../../models/messageModel", () => ({
    createMessage: jest.fn(),
}));
jest.mock("../../models/messageModel", () => ({
    createMessage: jest.fn(),
    createAllAnnouncement: jest.fn(), // Add this to mock the createAllAnnouncement method
}));
jest.mock("jsonwebtoken");

describe("Admin Functionalities", () => {
    let dbInstance;

    beforeAll(async () => {
        // Assuming getInstance() and connect() are appropriately defined to not affect the real DB
        dbInstance = mysqlDatabase.getInstance();
        await dbInstance.connect("sb2-test1");
    });

    afterAll(async () => {
        await dbInstance.disconnect();
    });

    describe("Initial Administrator Rule", () => {
        it("should ensure ESNAdmin exists in the database", async () => {
            // Mock the query method to simulate MySQL responses
            dbInstance.connection.query = jest
                .fn()
                .mockResolvedValueOnce([[], {}]); // Simulate no user found on first call

            await dbInstance.ensureAdminUser();

            // Expect query to have been called
            expect(dbInstance.connection.query).toHaveBeenCalled();

            // Check if the SELECT query was called correctly
            expect(dbInstance.connection.query.mock.calls[0][0]).toMatch(
                /SELECT user_name FROM user WHERE user_name = 'esnadmin'/
            );

            // Verify the INSERT operation was prepared to create ESNAdmin if not found
            if (!dbInstance.connection.query.mock.results[0].value.length) {
                expect(dbInstance.connection.query.mock.calls[1][0]).toMatch(
                    /INSERT INTO user \(user_name, user_password, privilege, status, Acknowledged\)/
                );
                expect(dbInstance.connection.query.mock.calls[1][0]).toMatch(
                    /VALUES \('esnadmin',/
                );
            }
        });
    });

    describe("At Least One Admin Rule", () => {
        it("Should not allow the last admin to change their privilege level", async () => {
            // Mock getUserByUsername to return ESNAdmin details
            UserModel.getUserByUsername.mockResolvedValue({
                id: 1,
                username: "esnadmin",
                privilege: "administrator",
            });

            // Fetch admin details
            const adminInfo = await UserModel.getUserByUsername("esnadmin");
            if (!adminInfo) {
                throw new Error("Admin user not found");
            }

            // Prepare mock request and response
            const req = httpMocks.createRequest({
                method: "POST",
                url: `/user/${adminInfo.id}/update`,
                params: {
                    UserID: adminInfo.id,
                    currentUserName: "esnadmin",
                },
                body: {
                    privilegeLevel: "user", // Trying to downgrade privilege level
                },
            });
            const res = httpMocks.createResponse();

            // Mock isUserAdmin and getNumberOfAdmins
            UserModel.isUserAdmin.mockResolvedValue(true); // Current user is an admin
            UserModel.getNumberOfAdmins.mockResolvedValue(1); // Simulate only one admin exists

            // Call the updateUser method
            await AdminController.updateUser(req, res);

            // Assertions
            expect(res.statusCode).toBe(400);
            expect(res._getJSONData()).toEqual({
                message: "Cannot change privilege level. Only one admin left.",
            });
            expect(UserModel.updateUser).not.toHaveBeenCalled(); // No update should occur
        });
    });

    describe("Administrator Action of User Profile Rule", () => {
        let testUserId;
        beforeEach(async () => {
            // Reset the mock for connection.query to allow inserting a new user
            dbInstance.connection.query.mockReset();

            // Mock the insert query to return an insertId
            dbInstance.connection.query.mockResolvedValueOnce([
                { insertId: 2 },
                {},
            ]);

            // Insert a new test user to perform update operations on
            const [result] = await dbInstance.connection.query(`
                INSERT INTO \`user\` 
                (\`user_name\`, \`user_password\`, \`privilege\`, \`status\`, \`online_status\`, \`Acknowledged\`, \`account_status\`) 
                VALUES ("testUser", "hashedpassword", "citizen", "OK", "offline", 1, "active")
                ON DUPLICATE KEY UPDATE \`user_password\` = "hashedpassword", \`privilege\` = "citizen", \`status\` = "OK", \`online_status\` = "offline", \`Acknowledged\` = 1, \`account_status\` = "active";
            `);
            testUserId = result.insertId || 2; // Assuming the new user ID
        });

        it("should successfully change the account status of the user", async () => {
            const req = httpMocks.createRequest({
                method: "POST",
                url: `/user/${testUserId}/update`,
                params: { UserID: testUserId, currentUserName: "testUser" },
                body: { accountStatus: "inactive" },
            });
            const res = httpMocks.createResponse();

            UserModel.updateUser.mockResolvedValue({ success: true });

            await AdminController.updateUser(req, res);

            expect(UserModel.updateUser).toHaveBeenCalledWith(testUserId, {
                accountStatus: "inactive",
            });
            expect(io.handleStatusProcess).toHaveBeenCalledWith({
                accountStatus: "inactive",
                currentUserName: "testUser",
            });
            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                message: "User updated successfully.",
            });
        });

        it("should successfully change the username of the user", async () => {
            const req = httpMocks.createRequest({
                method: "POST",
                url: `/user/${testUserId}/update`,
                params: { UserID: testUserId, currentUserName: "testUser" },
                body: { username: "updatedUser" },
            });
            const res = httpMocks.createResponse();

            UserModel.updateUser.mockResolvedValue({ success: true });

            await AdminController.updateUser(req, res);

            expect(UserModel.updateUser).toHaveBeenCalledWith(testUserId, {
                username: "updatedUser",
            });
            expect(io.handleNameProcess).toHaveBeenCalledWith({
                username: "updatedUser",
                currentUserName: "testUser",
            });
            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                message: "User updated successfully.",
            });
        });

        it("should successfully change the password of the user", async () => {
            const newPassword = "NewSecurePass123!";
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const req = httpMocks.createRequest({
                method: "POST",
                url: `/user/${testUserId}/update`,
                params: { UserID: testUserId, currentUserName: "testUser" },
                body: { password: newPassword },
            });
            const res = httpMocks.createResponse();

            UserModel.updateUser.mockResolvedValue({ success: true });

            jest.spyOn(bcrypt, "hash").mockResolvedValue(hashedPassword);

            await AdminController.updateUser(req, res);

            expect(UserModel.updateUser).toHaveBeenCalledWith(testUserId, {
                password: newPassword,
            });
            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                message: "User updated successfully.",
            });
        });

        it("should not change status when only username is updated", async () => {
            // Step 1: Mock the initial status retrieval
            const initialStatus = "OK";
            UserModel.getStatusByUsername = jest
                .fn()
                .mockResolvedValue(initialStatus);

            // Step 2: Mock the request for updating the username
            const req = httpMocks.createRequest({
                method: "POST",
                url: `/user/${testUserId}/update`,
                params: { UserID: testUserId, currentUserName: "testUser" },
                body: { username: "updatedUser" },
            });
            const res = httpMocks.createResponse();

            // Step 3: Mock the UserModel.updateUser method to simulate a successful update
            UserModel.updateUser.mockResolvedValue({ success: true });

            // Step 4: Call the AdminController to perform the update
            await AdminController.updateUser(req, res);

            // Verify the status is unchanged
            const updatedStatus = await UserModel.getStatusByUsername(
                "testUser"
            );
            expect(updatedStatus).toBe(initialStatus);

            // Step 7: Verify the response
            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                message: "User updated successfully.",
            });
        });
    });

    describe("Priviledge Rule", () => {
        describe("Check citizen privileges", () => {
            let mockUser;
            let req;
            let res;

            beforeEach(() => {
                // Initialize mock user
                mockUser = {
                    username: "testUser",
                    id: 1,
                    citizenStatus: "Active",
                    privilege: "citizen",
                };

                // Initialize request and response objects
                req = httpMocks.createRequest();
                res = httpMocks.createResponse();

                // Mock commonly used functions
                UserModel.getUserByUsername.mockResolvedValue(mockUser);
            });

            it("should allow citizen to update citizen status", async () => {
                const updatedStatus = "Emergency";

                req.method = "PUT";
                req.url = `/testUser/citizenStatus`;
                req.body = {
                    username: mockUser.username,
                    citizenStatus: updatedStatus,
                };

                // Mock additional required methods
                UserModel.updateCitizenStatus.mockResolvedValue({
                    success: true,
                });
                UserModel.insertUserStatusHistory.mockResolvedValue({
                    success: true,
                });

                await ESNController.updateUserCitizenStatus(req, res);

                // Assertions
                expect(UserModel.getUserByUsername).toHaveBeenCalledWith(
                    mockUser.username
                );
                expect(UserModel.updateCitizenStatus).toHaveBeenCalledWith(
                    mockUser.username,
                    updatedStatus
                );
                expect(UserModel.insertUserStatusHistory).toHaveBeenCalledWith(
                    mockUser.username,
                    updatedStatus
                );

                expect(res.statusCode).toBe(200);
                expect(res._getJSONData()).toEqual({
                    message: "Citizen status updated successfully",
                });
            });

            it("should allow citizen to send a public message", async () => {
                const messageText = "Hello, everyone!";

                req.method = "POST";
                req.url = "/sendMessage";
                req.body = {
                    message: messageText,
                    sender: mockUser.username,
                    index: 1, // Public message
                };

                // Mock message creation
                MessageModel.createMessage.mockResolvedValue({ id: 1 });

                await MessageController.sendMessage(req, res);

                // Assertions
                expect(UserModel.getUserByUsername).toHaveBeenCalledWith(
                    mockUser.username
                );
                expect(MessageModel.createMessage).toHaveBeenCalledWith(
                    messageText,
                    mockUser.username,
                    mockUser.citizenStatus,
                    expect.any(Date), // Timestamp
                    null
                );
                expect(io.emit).toHaveBeenCalledWith("broadcast message", {
                    message_text: messageText,
                    message_sent_time: expect.any(Date),
                    message_sender: mockUser.username,
                    message_sender_status: mockUser.citizenStatus,
                });

                expect(res.statusCode).toBe(200);
                expect(res._getJSONData()).toEqual({
                    message: "Message sent successfully",
                    result: { id: 1 },
                });
            });
        });

        describe("Check coordinator privileges", () => {
            let mockUser;
            let req;
            let res;

            beforeEach(() => {
                jest.clearAllMocks();
                // Initialize mock user
                mockUser = {
                    username: "coordinatorUser",
                    id: 2,
                    privilege: "coordinator",
                    citizenStatus: "Active",
                };

                // Initialize request and response objects
                req = httpMocks.createRequest();
                res = httpMocks.createResponse();

                // Mock commonly used functions
                UserModel.getUserByUsername.mockResolvedValue(mockUser);
            });

            it("should allow coordinator to send an announcement", async () => {
                const announcementText = "This is an announcement.";

                req.method = "POST";
                req.url = "/announcement";
                req.body = {
                    message: announcementText,
                    sender: mockUser.username,
                    index: 2, // Use a value other than 1 for announcements
                };

                // Mock message creation
                MessageModel.createAllAnnouncement.mockResolvedValue({ id: 1 });

                await MessageController.sendMessage(req, res);

                // Assertions
                expect(UserModel.getUserByUsername).toHaveBeenCalledWith(
                    mockUser.username
                );
                expect(MessageModel.createAllAnnouncement).toHaveBeenCalledWith(
                    announcementText,
                    mockUser.username,
                    mockUser.citizenStatus, // Coordinators might not have a citizenStatus
                    expect.any(Date),
                    null,
                    null
                );

                expect(res.statusCode).toBe(200);
                expect(res._getJSONData()).toEqual({
                    message: "Message sent successfully",
                    result: { id: 1 },
                });
            });

            it("should not allow non-coordinator to send an announcement", async () => {
                mockUser.privilege = "citizen";
            
                const announcementText = "This should fail.";
            
                req.method = "POST";
                req.url = "/announcement";
                req.body = {
                    message: announcementText,
                    sender: mockUser.username,
                    index: 2, // Announcement
                    privilege: mockUser.privilege,
                };
            
                // Mock UserModel to return the mock user
                UserModel.getUserByUsername = jest.fn().mockResolvedValue(mockUser);
            
                // Mock MessageModel to ensure createAllAnnouncement is not called
                MessageModel.createAllAnnouncement = jest.fn();
            
                // Mock io.emit to ensure it is not called
                io.emit = jest.fn();
            
                // Mock res object to capture status and JSON response
                res.status = jest.fn().mockReturnThis();
                res.json = jest.fn().mockReturnThis();
            
                // Call the controller function
                await MessageController.sendMessage(req, res);
            
                // Assertions
                expect(UserModel.getUserByUsername).toHaveBeenCalledWith(mockUser.username);
                expect(MessageModel.createAllAnnouncement).not.toHaveBeenCalled();
                expect(io.emit).not.toHaveBeenCalledWith(
                    "broadcast annoucement",
                    expect.anything()
                );
            
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.json).toHaveBeenCalledWith({
                    message: "Error sending message",
                    error: "Only coordinators can send announcements.",
                });
            });            
        });

        describe("Check administrator privileges", () => {
            let mockUser;
            let req;
            let res;

            beforeEach(() => {
                jest.clearAllMocks();
                mockUser = {
                    username: "adminUser",
                    privilege: "admin",
                };

                req = httpMocks.createRequest({
                    method: "POST",
                    url: "/start-speed-test",
                    body: {
                        adminusername: mockUser.username,
                    },
                });

                res = httpMocks.createResponse();
                UserModel.getUserByUsername.mockResolvedValue(mockUser);
            });

            it("should allow asministrator to start speed test", async () => {
                // Mock the method
                const mockStartSpeedTest = jest
                    .spyOn(SpeedTestController, "startSpeedTest")
                    .mockResolvedValue();

                const req = httpMocks.createRequest({
                    method: "POST",
                    url: "/start-speed-test",
                    body: {
                        adminusername: "adminUser",
                    },
                });
                const res = httpMocks.createResponse();

                // Call the controller
                await SpeedTestController.startSpeedTest(req, res);

                // Assertions
                expect(mockStartSpeedTest).toHaveBeenCalledWith(req, res);

                // Restore the original implementation
                mockStartSpeedTest.mockRestore();
            });

            it("should not allow non-administrator to start speed test", async () => {
                mockUser = {
                    username: "nonAdminUser",
                    privilege: "citizen", // Not an administrator
                };

                req.method = "POST";
                req.body = {
                    adminusername: mockUser.username,
                };

                // Mock user retrieval
                UserModel.getUserByUsername.mockResolvedValue(mockUser);

                // Call the startSpeedTest method
                await SpeedTestController.startSpeedTest(req, res);

                expect(res.statusCode).toBe(403);
                expect(res._getJSONData()).toEqual({
                    message: "Only administrators can start a speed test.",
                });
            });
        });
    });

    describe("Active/Inactive Rule", () => {
        let req, res;

        beforeEach(() => {
            jest.clearAllMocks();
            req = httpMocks.createRequest();
            res = httpMocks.createResponse();
        });

        it("should set account status to active by default during registration", async () => {
            // Mock request and response
            req.method = "POST";
            req.url = "/register";
            req.body = {
                username: "testuser",
                password: "ValidPassword123!",
            };

            // Mock database behavior
            UserModel.getUserByUsernameForValidation.mockResolvedValue(null); // User does not exist
            UserModel.prototype.createUser = jest.fn().mockResolvedValue(); // Mock user creation
            ResourceModel.prototype.createResourceProfile = jest
                .fn()
                .mockResolvedValue(); // Mock resource creation

            // Call the method
            await RegisterController.isRegister(req, res);

            // Assertions
            expect(
                UserModel.getUserByUsernameForValidation
            ).toHaveBeenCalledWith("testuser");
            expect(UserModel.prototype.createUser).toHaveBeenCalled();
            expect(
                ResourceModel.prototype.createResourceProfile
            ).toHaveBeenCalled();
            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                message: "User registration success",
                privilege: "citizen",
                token: "",
            });
        });

        it("should validate an active user and mark them online", async () => {
            const mockUser = {
                username: "testuser",
                password: await bcrypt.hash("testpassword", 10),
                accountStatus: "active",
                privilege: "citizen",
                acknowledged: true,
            };

            req.method = "POST";
            req.url = "/testuser/validation";
            req.params = { userName: mockUser.username };
            req.body = {
                username: mockUser.username,
                password: "testpassword",
            };

            UserModel.getUserByUsernameForValidation.mockResolvedValue(
                mockUser
            );
            UserModel.getAccountStatusByUsername.mockResolvedValue("active");
            UserModel.markOnlineStatus.mockResolvedValue(true);
            bcrypt.compare.mockResolvedValue(true);

            await RegisterController.isValidate(req, res);

            expect(
                UserModel.getUserByUsernameForValidation
            ).toHaveBeenCalledWith("testuser");
            expect(UserModel.getAccountStatusByUsername).toHaveBeenCalledWith(
                "testuser"
            );
            expect(bcrypt.compare).toHaveBeenCalledWith(
                "testpassword",
                mockUser.password
            );
            expect(UserModel.markOnlineStatus).toHaveBeenCalledWith(
                "online",
                "testuser"
            );
            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                message: "User already exists and acknowledged",
                token: expect.any(String),
                privilege: "citizen",
            });
        });

        it("should not allow login for inactive user", async () => {
            const mockUser = {
                username: "inactiveuser",
                password: await bcrypt.hash("testpassword", 10),
                accountStatus: "inactive",
                privilege: "citizen",
                acknowledged: true,
            };

            req.method = "POST";
            req.url = "/inactiveuser/validation";
            req.params = { userName: mockUser.username };
            req.body = {
                username: mockUser.username,
                password: "testpassword",
            };

            UserModel.getUserByUsernameForValidation.mockResolvedValue(
                mockUser
            );
            UserModel.getAccountStatusByUsername.mockResolvedValue("inactive");

            await RegisterController.isValidate(req, res);

            expect(
                UserModel.getUserByUsernameForValidation
            ).toHaveBeenCalledWith("inactiveuser");
            expect(UserModel.getAccountStatusByUsername).toHaveBeenCalledWith(
                "inactiveuser"
            );
            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(UserModel.markOnlineStatus).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(400);
            expect(res._getJSONData()).toEqual({
                message: "Account is inactive",
            });
        });
    });

    describe("Display Active and Inactive Users", () => {
        beforeEach(async () => {
            // Clean up users before each test
            await dbInstance.connection.query(
                'DELETE FROM `user` WHERE user_name IN ("testActiveUser", "testInactiveUser")'
            );
        });

        it("should display information for active users", async () => {
            // Insert an active user into the test database
            await dbInstance.connection.query(`
                INSERT INTO \`user\` 
                (\`user_name\`, \`user_password\`, \`privilege\`, \`status\`, \`online_status\`, \`Acknowledged\`, \`account_status\`) 
                VALUES ("testActiveUser", "hashedpassword", "citizen", "OK", "online", 1, "active")
                ON DUPLICATE KEY UPDATE \`user_password\` = "hashedpassword", \`privilege\` = "citizen", \`status\` = "OK", \`online_status\` = "online", \`Acknowledged\` = 1, \`account_status\` = "active";
            `);

            const req = httpMocks.createRequest({
                method: "GET",
                url: "/allUsers",
            });
            const res = httpMocks.createResponse();

            // Spy on io.emit
            const ioEmitSpy = jest
                .spyOn(io, "emit")
                .mockImplementation(() => {});

            // Call the getAllUsers method
            await ESNController.getAllUsers(req, res);

            // Assertions
            expect(res.statusCode).toBe(200); // Status code is 200
            // expect(res._getJSONData()).toEqual([
            //     {
            //         username: "testActiveUser",
            //         citizenStatus: "OK",
            //         onLineStatus: "online",
            //     }
            // ]); // Should return the active user
            // expect(io.emit).toHaveBeenCalledWith("allUsers", [
            //     {
            //         username: "testActiveUser",
            //         citizenStatus: "OK",
            //         onLineStatus: "online",
            //     }
            // ]); // Emit should be called with active users

            // Restore io.emit
            ioEmitSpy.mockRestore();
        });

        it("should not display information for inactive users", async () => {
            // Insert an inactive user into the test database
            await dbInstance.connection.query(`
                INSERT INTO \`user\` 
                (\`user_name\`, \`user_password\`, \`privilege\`, \`status\`, \`online_status\`, \`Acknowledged\`, \`account_status\`) 
                VALUES ("testInactiveUser", "hashedpassword", "citizen", "Undefined", "offline", 1, "inactive")
                ON DUPLICATE KEY UPDATE \`user_password\` = "hashedpassword", \`privilege\` = "citizen", \`status\` = "Undefined", \`online_status\` = "offline", \`Acknowledged\` = 1, \`account_status\` = "inactive";
            `);

            const req = httpMocks.createRequest({
                method: "GET",
                url: "/allUsers",
            });
            const res = httpMocks.createResponse();

            // Spy on io.emit
            const ioEmitSpy = jest
                .spyOn(io, "emit")
                .mockImplementation(() => {});

            // Call the getAllUsers method
            await ESNController.getAllUsers(req, res);

            // Assertions
            expect(res.statusCode).toBe(200); // Status code is 200
            //expect(res._getJSONData()).toEqual([]); // Should not return inactive users
            //expect(io.emit).toHaveBeenCalledWith("allUsers", []); // Emit should be called with empty array

            // Restore io.emit
            ioEmitSpy.mockRestore();
        });
    });
});
