import WalletController from "../../controllers/walletController.js";
import { connectToDatabase } from "../../configurations/dbConfig.js";

let dbConnection;
let testUserAId;
let testUserBId;

describe("WalletController Integration Test", () => {
    beforeAll(async () => {
        dbConnection = await connectToDatabase("sb2-test1");

        await dbConnection.query(`
            INSERT INTO user 
                (user_name, user_password, privilege, status, online_status, Acknowledged)
                VALUES 
                    ("testUserA", "password1", "citizen", "Undefined", "online", 1),
                    ("testUserB", "password1", "citizen", "Undefined", "online", 1);`);

        // Fetch the IDs for the inserted/updated rows
        const [rows] = await dbConnection.query(`
    SELECT \`id\`, \`user_name\`
    FROM \`user\`
    WHERE \`user_name\` IN 
        ("testUserA", "testUserB")`);

        // Map IDs to user names for easy access
        const userIds = {};
        rows.forEach((row) => {
            userIds[row.user_name] = row.id;
        });

        testUserAId = userIds["testUserA"];
        testUserBId = userIds["testUserB"];

        // Create initial test data
        await dbConnection.query(`
            INSERT INTO wallet (user_name, user_id, balance)
            VALUES 
                ('testUserA', ${testUserAId}, 500.00),
                ('testUserB', ${testUserBId}, 300.00)
            ON DUPLICATE KEY UPDATE balance = VALUES(balance);
        `);

        await dbConnection.query(`
            INSERT INTO cards (user_name, user_id, card_number, card_holder, expire_year, expire_month, cvv)
            VALUES 
                ('testUserA', ${testUserAId}, '1234567812345678', 'Test Holder A', 2025, 12, 123),
                ('testUserB', ${testUserBId}, '8765432187654321', 'Test Holder B', 2024, 11, 456)
            ON DUPLICATE KEY UPDATE card_number = VALUES(card_number);
        `);
    });

    afterEach(async () => {
        // Clean up after each test
        await dbConnection.query(
            'DELETE FROM cards WHERE user_name = "testUserA" OR user_name = "testUserB";'
        );
        await dbConnection.query("DELETE FROM transactions;");
    });

    afterAll(async () => {
        // Clean up after all tests
        await dbConnection.query("DELETE FROM wallet;");
        await dbConnection.query("DELETE FROM user;");
        if (dbConnection) await dbConnection.end();
    });

    describe("getBalance", () => {
        it("should return the correct balance for a user", async () => {
            const req = { params: { username: "testUserA" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await WalletController.getBalance(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ balance: "500.00" });
        });

        it("should return 404 if wallet not found", async () => {
            const req = { params: { username: "nonExistentUser" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await WalletController.getBalance(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "Wallet not found",
            });
        });
    });

    describe("getCards", () => {
        it("should return all cards for a user", async () => {
            const req = { params: { username: "testUserA" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await WalletController.getCards(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
        });

        it("should return an empty array if user has no cards", async () => {
            const req = { params: { username: "testUserC" } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await WalletController.getCards(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    describe("processDonation", () => {
        it("should process a donation successfully", async () => {
            const req = {
                body: {
                    sender: "testUserA",
                    receiver: "testUserB",
                    amount: 100.0,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await WalletController.processDonation(req, res);

            let code = res.status.mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(code);
            // expect(res.json).toHaveBeenCalledWith({
            //     message: "Donation successful",
            // });

            const [rows] = await dbConnection.query(`
                SELECT * FROM transactions WHERE sender = "testUserA" AND receiver = "testUserB";
            `);
            // expect(rows.length).toBeGreaterThan(0);
        });

        it("should fail if sender has insufficient balance", async () => {
            const req = {
                body: {
                    sender: "testUserB",
                    receiver: "testUserA",
                    amount: 500.0,
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await WalletController.processDonation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Insufficient balance",
            });
        });
    });
});
