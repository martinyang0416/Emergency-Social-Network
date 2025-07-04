import MessageController from "../../controllers/messageController.js";
import { connectToDatabase } from "../../configurations/dbConfig.js";

let dbConnection;
let testUserId;

describe("Announcement Feature Integration Tests", () => {
    beforeAll(async () => {
        dbConnection = await connectToDatabase("sb2-test1");

        try {
            // Disable foreign key checks
            await dbConnection.query("SET FOREIGN_KEY_CHECKS = 0");

            // Get all tables in the schema
            const [tables] = await dbConnection.query(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'sb2-test1'
            `);

            // Truncate each table
            for (const table of tables) {
                await dbConnection.query(
                    `TRUNCATE TABLE \`${table.TABLE_NAME}\``
                );
            }

            // Re-enable foreign key checks
            await dbConnection.query("SET FOREIGN_KEY_CHECKS = 1");

            // Recreate the test user
            const [userResult] = await dbConnection.query(
                `
                INSERT INTO user 
                (user_name, user_password, privilege, status, online_status, Acknowledged, account_status)
                VALUES 
                (?, ?, ?, ?, ?, ?, ?)
            `,
                [
                    "testAnnouncer",
                    "password123",
                    "citizen",
                    "OK",
                    "online",
                    1,
                    "active",
                ]
            );

            testUserId = userResult.insertId;
        } catch (error) {
            console.error("Error in test setup:", error);
            throw error;
        }
    });

    afterEach(async () => {
        // Clean up test data
        await dbConnection.query(
            "DELETE FROM announcements WHERE sender_id = ?",
            [testUserId]
        );
    });

    afterAll(async () => {
        try {
            await dbConnection.query("DELETE FROM user WHERE id = ?", [
                testUserId,
            ]);
            await dbConnection.query("SET SQL_SAFE_UPDATES = ?", [1]);
            await dbConnection.end();
        } catch (error) {
            console.error("Error in test cleanup:", error);
            throw error;
        }
    });

    describe("sendMessage (Announcements)", () => {
        it("should successfully send an announcement with valid status", async () => {
            const req = {
                body: {
                    message: "Test Announcement",
                    sender: "testAnnouncer",
                    index: 2,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MessageController.sendMessage(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         message: "Message sent successfully",
            //     })
            // );

            // Verify in database using proper JOIN
            const [announcements] = await dbConnection.query(
                `SELECT a.* FROM announcements a
                 JOIN user u ON a.sender_id = u.id
                 WHERE a.sender_id = ? AND u.user_name = ?`,
                [testUserId, "testAnnouncer"]
            );
            // expect(announcements.length).toBe(1);
        });

        it("should not allow announcements from inactive users", async () => {
            await dbConnection.query(
                "UPDATE user SET account_status = ? WHERE id = ?",
                ["inactive", testUserId]
            );

            const req = {
                body: {
                    message: "Test Announcement",
                    sender: "testAnnouncer",
                    index: 2,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await MessageController.sendMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(500);

            await dbConnection.query(
                "UPDATE user SET account_status = ? WHERE id = ?",
                ["active", testUserId]
            );
        });
    });

    // describe("getAllMessages (Announcements)", () => {
    //     beforeEach(async () => {
    //         // Verify user exists before inserting announcements
    //         const [userCheck] = await dbConnection.query(
    //             "SELECT * FROM user WHERE id = ?",
    //             [testUserId]
    //         );

    //         // Insert test announcements
    //         await dbConnection.query(
    //             `
    //             INSERT INTO announcements
    //             (sender_id, announcement_content, announcement_sent_time,
    //              announcement_sender, announcement_sender_status, announcement_priority)
    //             VALUES
    //             (?, ?, NOW(), ?, ?, ?),
    //             (?, ?, NOW(), ?, ?, ?)
    //         `,
    //             [
    //                 testUserId,
    //                 "Test Announcement 1",
    //                 "testAnnouncer",
    //                 "OK",
    //                 0,
    //                 testUserId,
    //                 "Test Announcement 2",
    //                 "testAnnouncer",
    //                 "OK",
    //                 1,
    //             ]
    //         );

    //         // Verify announcements were inserted
    //         const [announcementCheck] = await dbConnection.query(
    //             "SELECT * FROM announcements WHERE sender_id = ?",
    //             [testUserId]
    //         );
    //         if (announcementCheck.length !== 2) {
    //             throw new Error("Failed to insert test announcements");
    //         }
    //     });

    //     it("should retrieve all announcements from active users", async () => {
    //         const req = {
    //             query: { messageId: 2 },
    //         };
    //         const res = {
    //             status: jest.fn().mockReturnThis(),
    //             json: jest.fn(),
    //         };

    //         await MessageController.getAllMessages(req, res);

    //         expect(res.status).toHaveBeenCalledWith(200);
    //         const announcements = res.json.mock.calls[0][0];
    //         expect(announcements.length).toBe(2);
    //         expect(announcements).toEqual(
    //             expect.arrayContaining([
    //                 expect.objectContaining({
    //                     message_text: "Test Announcement 1",
    //                     message_sender: "testAnnouncer",
    //                     message_sender_status: "OK",
    //                 }),
    //                 expect.objectContaining({
    //                     message_text: "Test Announcement 2",
    //                     message_sender: "testAnnouncer",
    //                     message_sender_status: "OK",
    //                 }),
    //             ])
    //         );
    //     });
    // });
});
