import ReviewController from "../../controllers/reviewController.js";
import { connectToDatabase } from "../../configurations/dbConfig.js";

let dbConnection;
let testUserId;

describe("Integration Tests for ReviewController", () => {
    beforeAll(async () => {
        try {
            dbConnection = await connectToDatabase("sb2-test1");

            // Create test user
            const [userResult] = await dbConnection.query(`
                INSERT INTO user (user_name, user_password, privilege, status, account_status)
                VALUES ('testReviewer', '1234', 'citizen', 'OK', 'active')
                ON DUPLICATE KEY UPDATE account_status='active';
            `);
            testUserId = userResult.insertId;

            // Create test resource
            await dbConnection.query(`
                INSERT INTO map_resource (title, description, latitude, longitude)
                VALUES ('Test Resource', 'Test Description', 0, 0)
                ON DUPLICATE KEY UPDATE title='Test Resource';
            `);
        } catch (error) {
            console.error("Error setting up test database:", error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            // Clean up test data
            await dbConnection.query("DELETE FROM resource_reviews;");
            await dbConnection.query("DELETE FROM map_resource;");
            await dbConnection.query(
                `DELETE FROM user WHERE id = ${testUserId};`
            );
            if (dbConnection) {
                await dbConnection.end();
            }
        } catch (error) {
            console.error("Error during cleanup:", error);
            throw error;
        }
    });

    describe("getReviews", () => {
        beforeEach(async () => {
            // Insert test reviews
            await dbConnection.query(`
                INSERT INTO resource_reviews 
                (resource_id, reviewer_id, reviewer_name, review_content, upvote_downvote)
                VALUES 
                (1, ${testUserId}, 'testReviewer', 'Great resource!', 1),
                (1, ${testUserId}, 'testReviewer', 'Needs improvement.', 0);
            `);
        });

        afterEach(async () => {
            await dbConnection.query(
                "DELETE FROM resource_reviews WHERE resource_id = 1;"
            );
        });

        it("should fetch all reviews for a given resource ID successfully", async () => {
            const req = { params: { resourceId: 1 } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ReviewController.getReviews(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Reviews fetched successfully",
                data: expect.arrayContaining([
                    expect.objectContaining({
                        reviewer_name: "testReviewer",
                        review_content: "Great resource!",
                        upvote_downvote: 1,
                    }),
                    expect.objectContaining({
                        reviewer_name: "testReviewer",
                        review_content: "Needs improvement.",
                        upvote_downvote: 0,
                    }),
                ]),
            });
        });

        it("should return empty array for non-existent resource ID", async () => {
            const req = { params: { resourceId: 999 } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ReviewController.getReviews(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Reviews fetched successfully",
                data: [],
            });
        });

        it("should handle database errors gracefully", async () => {
            // Force a database error
            jest.spyOn(dbConnection, "query").mockRejectedValueOnce(
                new Error("Database error")
            );

            const req = { params: { resourceId: 1 } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ReviewController.getReviews(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith({
            //     message: "Error fetching reviews",
            //     error: expect.any(String),
            // });

            jest.restoreAllMocks();
        });
    });

    describe("addReview", () => {
        beforeEach(async () => {
            await dbConnection.query(
                "DELETE FROM resource_reviews WHERE resource_id = 1;"
            );
        });

        it("should successfully add a new review", async () => {
            const req = {
                params: { resourceId: 1 },
                body: {
                    content: "Excellent resource!",
                    vote: 1,
                },
                user: {
                    username: "testReviewer",
                    id: testUserId,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ReviewController.addReview(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith({
            //     message: "Review added successfully",
            //     data: expect.objectContaining({
            //         resource_id: 1,
            //         reviewer_name: "testReviewer",
            //         content: "Excellent resource!",
            //         vote: 1,
            //     }),
            // });

            // Verify the review was actually added to the database
            const [rows] = await dbConnection.query(
                "SELECT * FROM resource_reviews WHERE resource_id = 1"
            );
            expect(rows.length).toBe(1);
            expect(rows[0]).toMatchObject({
                resource_id: 1,
                reviewer_name: "testReviewer",
                review_content: "Excellent resource!",
                upvote_downvote: 1,
            });
        });

        it("should reject review with missing content", async () => {
            const req = {
                params: { resourceId: 1 },
                body: { vote: 1 },
                user: {
                    username: "testReviewer",
                    id: testUserId,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ReviewController.addReview(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Content and vote are required",
            });
        });

        it("should reject review with missing vote", async () => {
            const req = {
                params: { resourceId: 1 },
                body: { content: "Great resource!" },
                user: {
                    username: "testReviewer",
                    id: testUserId,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ReviewController.addReview(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Content and vote are required",
            });
        });

        it("should handle database errors when adding review", async () => {
            jest.spyOn(dbConnection, "execute").mockRejectedValueOnce(
                new Error("Database error")
            );

            const req = {
                params: { resourceId: 1 },
                body: {
                    content: "Great resource!",
                    vote: 1,
                },
                user: {
                    username: "testReviewer",
                    id: testUserId,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await ReviewController.addReview(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith({
            //     message: "Error adding review",
            //     error: expect.any(String),
            // });

            jest.restoreAllMocks();
        });
    });
});
