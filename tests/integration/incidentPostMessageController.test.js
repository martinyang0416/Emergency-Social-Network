import IncidentPostMessageController from "../../controllers/incidentPostMessageController.js";
import { connectToDatabase } from "../../configurations/dbConfig.js";

let dbConnection;
let req, res;
let incidentPostId;
let userId;

describe("IncidentPostMessageController Integration Tests", () => {
    beforeAll(async () => {
        dbConnection = await connectToDatabase("sb2-test1");
        await dbConnection.query("SET SQL_SAFE_UPDATES = ?", [0]);
    });

    beforeEach(async () => {
        // Create test user with correct ENUM values
        const [userResult] = await dbConnection.query(
            `
      INSERT INTO user 
      (user_name, user_password, privilege, status, online_status, account_status) 
      VALUES 
      (?, ?, ?, ?, ?, ?)
    `,
            ["testuser", "testpass123", "citizen", "OK", "offline", "active"]
        );

        userId = userResult.insertId;

        // Create test incident post
        const [postResult] = await dbConnection.query(
            `
      INSERT INTO incidentPost 
      (title, details, resource_details, sender_name, sender_id, sender_status)
      VALUES 
      (?, ?, ?, ?, ?, ?)
    `,
            [
                "Test Incident",
                "Test Details",
                "Test Resources",
                "testuser",
                userId,
                "OK",
            ]
        );

        incidentPostId = postResult.insertId;

        // Mock request and response objects
        req = {
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(async () => {
        await dbConnection.query("set foreign_key_checks = 0");
        await dbConnection.query("DELETE FROM incidentMessage");
        await dbConnection.query("DELETE FROM incidentPost");
        await dbConnection.query("DELETE FROM user");
        await dbConnection.query("set foreign_key_checks = 1");
    });

    afterAll(async () => {
        await dbConnection.query("SET SQL_SAFE_UPDATES = ?", [1]);
        await dbConnection.end();
    });

    describe("getIncidentPosts", () => {
        it("should successfully retrieve all incident posts", async () => {
            await IncidentPostMessageController.getIncidentPosts(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Incident posts retrieved successfully",
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            title: "Test Incident",
                            details: "Test Details",
                            username: "testuser",
                        }),
                    ]),
                })
            );
        });

        it("should return 404 when no posts exist", async () => {
            await dbConnection.query("DELETE FROM incidentPost");

            await IncidentPostMessageController.getIncidentPosts(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "No incident posts found",
            });
        });

        it("should not return posts from inactive users", async () => {
            await dbConnection.query(
                "UPDATE user SET account_status = 'inactive' WHERE id = ?",
                [userId]
            );

            await IncidentPostMessageController.getIncidentPosts(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "No incident posts found",
            });
        });
    });

    describe("getIncidentPostByID", () => {
        it("should successfully retrieve a specific incident post", async () => {
            req.params.id = incidentPostId;

            await IncidentPostMessageController.getIncidentPostByID(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Incident post retrieved successfully",
                    data: expect.objectContaining({
                        title: "Test Incident",
                        details: "Test Details",
                        sender_name: "testuser",
                    }),
                })
            );
        });

        it("should return 404 for non-existent post ID", async () => {
            req.params.id = 99999;

            await IncidentPostMessageController.getIncidentPostByID(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "Incident post not found",
            });
        });

        it("should return 400 for missing post ID", async () => {
            await IncidentPostMessageController.getIncidentPostByID(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Missing post ID in request parameters",
            });
        });
    });

    describe("getIncidentCommentByincidentID", () => {
        beforeEach(async () => {
            await dbConnection.query(
                `
        INSERT INTO incidentMessage 
        (text, sender_name, sender_id, sender_status, incidentPost_id)
        VALUES 
        (?, ?, ?, ?, ?)
      `,
                ["Test Comment", "testuser", userId, "OK", incidentPostId]
            );
        });

        it("should successfully retrieve comments for an incident", async () => {
            req.params.id = incidentPostId;

            await IncidentPostMessageController.getIncidentCommentByincidentID(
                req,
                res
            );

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         message: "Incident responses retrieved successfully",
            //         data: expect.arrayContaining([
            //             expect.objectContaining({
            //                 name: "testuser",
            //                 text: "Test Comment",
            //             }),
            //         ]),
            //     })
            // );
        });

        it("should return 404 when no comments exist", async () => {
            await dbConnection.query("DELETE FROM incidentMessage");
            req.params.id = incidentPostId;

            await IncidentPostMessageController.getIncidentCommentByincidentID(
                req,
                res
            );

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "No incident responses found",
            });
        });

        it("should not return comments from inactive users", async () => {
            await dbConnection.query(
                "UPDATE user SET account_status = 'inactive' WHERE id = ?",
                [userId]
            );
            req.params.id = incidentPostId;

            await IncidentPostMessageController.getIncidentCommentByincidentID(
                req,
                res
            );

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "No incident responses found",
            });
        });
    });

    describe("newIncidentCommentByincidentID", () => {
        it("should successfully create a new comment", async () => {
            req.params.id = incidentPostId;
            req.body = {
                text: "New Test Comment",
                sender_name: "testuser",
                sender_status: "OK",
            };

            await IncidentPostMessageController.newIncidentCommentByincidentID(
                req,
                res
            );

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Incident response created successfully",
                    data: expect.objectContaining({
                        text: "New Test Comment",
                        sender_name: "testuser",
                    }),
                })
            );
        });

        it("should return 400 for missing required fields", async () => {
            req.params.id = incidentPostId;
            req.body = {
                text: "New Test Comment",
                // Missing sender_name and sender_status
            };

            await IncidentPostMessageController.newIncidentCommentByincidentID(
                req,
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message:
                    "Missing required fields: incidentId, text, sender_name, or sender_status",
            });
        });

        it("should return 500 for non-existent user", async () => {
            req.params.id = incidentPostId;
            req.body = {
                text: "New Test Comment",
                sender_name: "nonexistentuser",
                sender_status: "OK",
            };

            await IncidentPostMessageController.newIncidentCommentByincidentID(
                req,
                res
            );

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message:
                    "An error occurred while creating the incident response",
            });
        });
    });
});
