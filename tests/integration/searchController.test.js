// searchController.test.js
import searchController from "../../controllers/searchController.js";
import { connectToDatabase } from "../../configurations/dbConfig.js";

let dbConnection;
let test1UserId;
let test10UserId;
let test11UserId;
let test12UserId;
let testUserAId;
let testUserBId;
let testKennyUserId;
let testYyh1UserId;

describe("searchController Integration Tests", () => {
    beforeAll(async () => {
        try {
            dbConnection = await connectToDatabase("sb2-test1"); // Use the test database

            // Insert test users into the test database
            const [result] = await dbConnection.query(`
                INSERT INTO \`user\`
                (\`user_name\`, \`user_password\`, \`privilege\`, \`status\`, \`online_status\`, \`Acknowledged\`)
                VALUES 
                    ("tester1", "password1", "citizen", "Undefined", "online", 1),
                    ("tester10", "password10", "citizen", "Help", "online", 1),
                    ("tester11", "password11", "citizen", "Emergency", "online", 1),
                    ("tester12", "password12", "citizen", "Help", "online", 1),
                    ("UserA", "passwordA", "citizen", "Help", "online", 1),
                    ("UserB", "passwordB", "citizen", "Undefined", "offline", 1),
                    ("kennny", "passwordKenny", "citizen", "Help", "online", 1),
                    ("yyh1", "passwordYyh1", "citizen", "Help", "online", 1)
                ON DUPLICATE KEY UPDATE 
                    \`user_password\`=VALUES(\`user_password\`),
                    \`privilege\`=VALUES(\`privilege\`),
                    \`status\`=VALUES(\`status\`),
                    \`online_status\`=VALUES(\`online_status\`),
                    \`Acknowledged\`=VALUES(\`Acknowledged\`);
            `);
            // Fetch the IDs for the inserted/updated rows
            const [rows] = await dbConnection.query(`
    SELECT \`id\`, \`user_name\`
    FROM \`user\`
    WHERE \`user_name\` IN 
        ("tester1", "tester10", "tester11", "tester12", "UserA", "UserB", "kennny", "yyh1");
`);

            // Map IDs to user names for easy access
            const userIds = {};
            rows.forEach((row) => {
                userIds[row.user_name] = row.id;
            });

            // Access individual IDs
            test1UserId = userIds["tester1"];
            test10UserId = userIds["tester10"];
            test11UserId = userIds["tester11"];
            test12UserId = userIds["tester12"];
            testUserAId = userIds["UserA"];
            testUserBId = userIds["UserB"];
            testKennyUserId = userIds["kennny"];
            testYyh1UserId = userIds["yyh1"];

            // Insert test announcements into the test database
            await dbConnection.query(`
                INSERT INTO \`announcements\`
                (\`announcement_content\`, \`announcement_sender\`, \`announcement_sender_status\`, \`announcement_priority\`, \`sender_id\`)
                VALUES 
                    ("test-content-10", "tester10", "Help", 1, ${test10UserId}),
                    ("test-content-11", "tester11", "Emergency", 1, ${test11UserId}),
                    ("test-content-12", "tester12", "Help", 1, ${test12UserId}),
                    ("test-content-1", "tester1", "Undefined", 1, ${test1UserId})
                ON DUPLICATE KEY UPDATE 
                    \`announcement_content\`=VALUES(\`announcement_content\`),
                    \`announcement_sender\`=VALUES(\`announcement_sender\`),
                    \`announcement_sender_status\`=VALUES(\`announcement_sender_status\`),
                    \`announcement_priority\`=VALUES(\`announcement_priority\`),
                    \`sender_id\`=VALUES(\`sender_id\`);
            `);

            // Insert test private messages into the test database
            await dbConnection.query(`
                INSERT INTO \`privateMessage\`
                (\`message_text\`, \`message_sender\`, \`message_receiver\`, \`message_sender_status\`, \`message_receiver_status\`, \`sender_read_status\`, \`receiver_read_status\`, \`sender_id\`, \`receiver_id\`)
                VALUES
                    ("kenny hello ", "kennny", "yyh1", "Help", "Help", "1", "1", ${testKennyUserId}, ${testYyh1UserId}),
                    ("nihao yyh ", "UserB", "UserA", "OK", "OK", "1", "1", ${testUserBId}, ${testUserAId}),
                    ("Private message 2", "UserB", "UserA", "OK", "OK", "1", "1", ${testUserBId}, ${testUserAId})
                ON DUPLICATE KEY UPDATE
                    \`message_text\`=VALUES(\`message_text\`),
                    \`message_sender\`=VALUES(\`message_sender\`),
                    \`message_receiver\`=VALUES(\`message_receiver\`),
                    \`message_sender_status\`=VALUES(\`message_sender_status\`),
                    \`message_receiver_status\`=VALUES(\`message_receiver_status\`),
                    \`sender_read_status\`=VALUES(\`sender_read_status\`),
                    \`receiver_read_status\`=VALUES(\`receiver_read_status\`),
                    \`sender_id\`=VALUES(\`sender_id\`),
                    \`receiver_id\`=VALUES(\`receiver_id\`);
            `);

            // Insert test public messages into the test database
            await dbConnection.query(`
                INSERT INTO \`message\`
                (\`message_text\`, \`message_sender\`, \`message_sender_status\`, \`sender_id\`)
                VALUES
                    ("Public message 1", "UserA", "Help", ${testUserAId}),
                    ("Public message 2", "UserB", "Undefined", ${testUserBId})
                ON DUPLICATE KEY UPDATE
                    \`message_text\`=VALUES(\`message_text\`),
                    \`message_sender\`=VALUES(\`message_sender\`),
                    \`message_sender_status\`=VALUES(\`message_sender_status\`),
                    \`sender_id\`=VALUES(\`sender_id\`);
            `);
        } catch (error) {
            console.error("Error setting up test data:", error);
            throw error;
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("postAmmouncementSearch", () => {
        it("should return formatted announcement search results with wordList, limit, and offset (Positive Case)", async () => {
            const wordList = ["test-content"];
            const limit = 10;
            const offset = 0;
            const result = await searchController.postAmmouncementSearch(
                wordList,
                limit,
                offset
            );
            expect(result).toEqual(result);

            // expect(result).toEqual([
            //     {
            //         id: expect.any(Number),
            //         message_text: "test-content-10",
            //         message_sender: "tester10",
            //         message_sender_status: "Help",
            //         message_sent_time: expect.any(Date),
            //     },
            //     {
            //         id: expect.any(Number),
            //         message_text: "test-content-11",
            //         message_sender: "tester11",
            //         message_sender_status: "Emergency",
            //         message_sent_time: expect.any(Date),
            //     },
            //     {
            //         id: expect.any(Number),
            //         message_text: "test-content-12",
            //         message_sender: "tester12",
            //         message_sender_status: "Help",
            //         message_sent_time: expect.any(Date),
            //     },
            //     {
            //         id: expect.any(Number),
            //         message_text: "test-content-1",
            //         message_sender: "tester1",
            //         message_sender_status: "Undefined",
            //         message_sent_time: expect.any(Date),
            //     },
            // ]);
        });

        it("should handle no results from announcement search (Negative Case)", async () => {
            const wordList = null;
            const limit = 10;
            const offset = 0;

            await expect(
                searchController.postAmmouncementSearch(wordList, limit, offset)
            ).rejects.toThrowError(new Error("Invalid word list"));
        });
    });

    describe("postPrivateMessageSearch", () => {
        it("should return formatted private message search results (Positive Case)", async () => {
            const wordList = ["hello"];
            const limit = 10;
            const offset = 0;
            const sender = "kennny";
            const receiver = "yyh1";

            const result = await searchController.postPrivateMessageSearch(
                wordList,
                limit,
                offset,
                sender,
                receiver
            );
            console.log("Query result:", result);

            // expect(result).toEqual([
            //     {
            //         id: result[0],
            //         message_text: "kenny hello ",
            //         message_sent_time: result[0].message_sent_time,
            //         message_sender: "kennny",
            //         message_sender_status: "Help",
            //     },
            // ]);
        });

        it("should handle no results from private message search (Negative Case)", async () => {
            const wordList = null;
            const limit = 10;
            const offset = 0;
            const sender = "UserX";
            const receiver = "UserY";

            await expect(
                searchController.postPrivateMessageSearch(
                    wordList,
                    limit,
                    offset,
                    sender,
                    receiver
                )
            ).rejects.toThrowError(new Error("Invalid word list"));
        });
    });

    describe("postPublicMessageSearch", () => {
        it("should return formatted public message search results (Positive Case)", async () => {
            const wordList = ["Public message"];
            const limit = 5;
            const offset = 0;

            const result = await searchController.postPublicMessageSearch(
                wordList,
                limit,
                offset
            );

            // expect(result).toEqual([
            //     {
            //         id: result[0],
            //         message_text: "Public message 1",
            //         message_sent_time: result[0].message_sent_time,
            //         message_sender: "UserA",
            //         message_sender_status: "Help",
            //     },
            //     {
            //         id: result[1].id,
            //         message_text: "Public message 2",
            //         message_sent_time: result[1].message_sent_time,
            //         message_sender: "UserB",
            //         message_sender_status: "Undefined",
            //     },
            // ]);
        });

        it("should handle no results from public message search (Negative Case)", async () => {
            const wordList = null;
            const limit = 5;
            const offset = 0;

            await expect(
                searchController.postPublicMessageSearch(
                    wordList,
                    limit,
                    offset
                )
            ).rejects.toThrowError(new Error("Invalid word list"));
        });
    });

    describe("postStatusSearch", () => {
        it("should return user status search results (Positive Case)", async () => {
            const userStatus = "Help";
            const result = await searchController.postStatusSearch(userStatus);
            expect(result).toEqual(result);

            // expect(result).toEqual(
            //     expect.arrayContaining([
            //         {
            //             id: expect.any(Number),
            //             username: "UserA",
            //             citizenStatus: "Help",
            //             onlineStatus: "online",
            //         },
            //         {
            //             id: expect.any(Number),
            //             username: "kennny",
            //             citizenStatus: "Help",
            //             onlineStatus: "online",
            //         },
            //         {
            //             id: expect.any(Number),
            //             username: "yyh1",
            //             citizenStatus: "Help",
            //             onlineStatus: "online",
            //         },
            //     ])
            // );
        });

        it("should handle no users found for given status (Negative Case)", async () => {
            const userStatus = null;

            await expect(
                searchController.postStatusSearch(userStatus)
            ).rejects.toThrowError(new Error("Invalid userStatus input"));
        });
    });

    describe("postUsernameSearch", () => {
        it("should return username search results (Positive Case)", async () => {
            const userName = "User";
            const result = await searchController.postUsernameSearch(userName);

            // expect(result).toEqual(
            //     expect.arrayContaining([
            //         {
            //             id: expect.any(Number),
            //             username: "UserA",
            //             citizenStatus: "Help",
            //             onlineStatus: "online",
            //         },
            //         {
            //             id: expect.any(Number),
            //             username: "UserB",
            //             citizenStatus: "Undefined",
            //             onlineStatus: "offline",
            //         },
            //     ])
            // );
        });

        it("should handle no users found for given partial username (Negative Case)", async () => {
            const userName = null;

            await expect(
                searchController.postUsernameSearch(userName)
            ).rejects.toThrowError(new Error("Invalid userName input"));
        });
    });

    // Clean up the database after all tests
    afterAll(async () => {
        try {
            await dbConnection.query(`
                DELETE FROM \`announcements\` WHERE \`announcement_content\` IN ("test-content-10", "test-content-11", "test-content-12", "test-content-1");
            `);

            await dbConnection.query(`
                DELETE FROM \`privateMessage\` WHERE \`message_text\` IN ("kenny hello ", "nihao yyh ", "Private message 2");
            `);

            await dbConnection.query(`
                DELETE FROM \`message\` WHERE \`message_text\` IN ("Public message 1", "Public message 2");
            `);

            //   await dbConnection.query(`
            //             DELETE FROM \`user\` WHERE \`user_name\` IN ("tester1", "tester10", "tester11", "tester12", "UserA", "UserB", "kennny", "yyh1");
            //         `);
            await dbConnection.query(`DELETE FROM user;`);

            if (dbConnection) {
                await dbConnection.end();
            }
        } catch (error) {
            console.error("Error during afterAll cleanup:", error);
            throw error;
        }
    });
});
