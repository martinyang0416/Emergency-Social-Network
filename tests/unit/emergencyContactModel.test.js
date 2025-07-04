import EmergencyContactModel from "../../models/emergencyContactModel.js";
import { getDatabaseConnection } from "../../configurations/dbConfig.js";

jest.mock("../../configurations/dbConfig.js");

describe("Emergency Contact Model", () => {
    let mockConnection;

    beforeEach(() => {
        mockConnection = {
            execute: jest.fn(),
            query: jest.fn(),
        };
        getDatabaseConnection.mockResolvedValue(mockConnection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getAddedUsers", () => {
        it("should return added users", async () => {
            const ownerusername = "testUser";
            const addedUsers = [
                {
                    owner_id: 1,
                    ownerusername: "testUser",
                    contact_user_id: 2,
                    contact_username: "user1",
                },
                {
                    owner_id: 1,
                    ownerusername: "testUser",
                    contact_user_id: 3,
                    contact_username: "user2",
                },
            ];
            mockConnection.execute.mockResolvedValue([addedUsers]);

            const result = await EmergencyContactModel.getAddedUsers(
                ownerusername
            );

            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                [ownerusername]
            );
            expect(result).toEqual([
                {
                    id: addedUsers[0].contact_user_id,
                    username: addedUsers[0].contact_username,
                },
                {
                    id: addedUsers[1].contact_user_id,
                    username: addedUsers[1].contact_username,
                },
            ]);
        });

        it("should throw an error if database query fails", async () => {
            mockConnection.execute.mockRejectedValue(
                new Error("Database Error")
            );

            await expect(
                EmergencyContactModel.getAddedUsers("testUser")
            ).rejects.toThrow("Database Error");
        });
    });

    describe("getIncomingPendingUsers", () => {
        it("should return incoming pending users", async () => {
            const contactusername = "testUser";
            const incomingPendingUsers = [
                {
                    owner_id: 1,
                    owner_username: "User1",
                    contact_user_id: 3,
                    contact_username: "testUser",
                },
                {
                    owner_id: 2,
                    owner_username: "User2",
                    contact_user_id: 3,
                    contact_username: "testUser",
                },
            ];
            mockConnection.execute.mockResolvedValue([incomingPendingUsers]);

            const result = await EmergencyContactModel.getIncomingPendingUsers(
                contactusername
            );

            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                [contactusername]
            );
            expect(result).toEqual([
                {
                    id: incomingPendingUsers[0].owner_id,
                    username: incomingPendingUsers[0].owner_username,
                },
                {
                    id: incomingPendingUsers[1].owner_id,
                    username: incomingPendingUsers[1].owner_username,
                },
            ]);
        });

        it("should throw an error if database query fails", async () => {
            mockConnection.execute.mockRejectedValue(
                new Error("Database Error")
            );

            await expect(
                EmergencyContactModel.getAddedUsers("testUser")
            ).rejects.toThrow("Database Error");
        });
    });

    describe("getUnaddedUsers", () => {
        it("should return unadded users", async () => {
            const ownerusername = "testUser";
            const allUsers = [
                { id: 1, user_name: "user1" },
                { id: 2, user_name: "user2" },
                { id: 3, user_name: "user3" },
            ];
            const addedUsers = [
                {
                    owner_id: 4,
                    owner_username: "testUser",
                    contact_user_id: 1,
                    contact_username: "user1",
                },
            ];
            const incomingPendingUsers = [
                {
                    owner_id: 2,
                    owner_username: "user2",
                    contact_user_id: 4,
                    contact_username: "testUser",
                },
            ];
            const outgoingPendingUsers = [
                {
                    owner_id: 4,
                    owner_username: "testUser",
                    contact_user_id: 3,
                    contact_username: "user3",
                },
            ];

            mockConnection.execute
                .mockResolvedValueOnce([allUsers])
                .mockResolvedValueOnce([addedUsers])
                .mockResolvedValueOnce([incomingPendingUsers])
                .mockResolvedValueOnce([outgoingPendingUsers]);

            const result = await EmergencyContactModel.getUnaddedUsers(
                ownerusername
            );

            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                [ownerusername]
            );
            expect(result).toEqual([]);
        });

        it("should throw an error if database query fails", async () => {
            mockConnection.execute.mockRejectedValue(
                new Error("Database Error")
            );

            await expect(
                EmergencyContactModel.getUnaddedUsers("testUser")
            ).rejects.toThrow("Database Error");
        });
    });

    // describe("insertPendingRequest", () => {
    //     it("should insert a pending request", async () => {
    //         const ownerusername = "testUser";
    //         const contactusername = "user1";
    //         const timestamp = new Date();
    //         mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);

    //         const result = await EmergencyContactModel.insertPendingRequest(
    //             ownerusername,
    //             contactusername,
    //             timestamp
    //         );

    //         expect(mockConnection.execute).toHaveBeenCalledWith(
    //             expect.any(String),
    //             [ownerusername, contactusername, timestamp]
    //         );
    //         expect(result).toEqual([{ affectedRows: 1 }]);
    //     });

    //     it("should throw an error if database query fails", async () => {
    //         mockConnection.execute.mockRejectedValue(
    //             new Error("Database Error")
    //         );

    //         await expect(
    //             EmergencyContactModel.insertPendingRequest(
    //                 "testUser",
    //                 "user1",
    //                 new Date()
    //             )
    //         ).rejects.toThrow("Database Error");
    //     });
    // });
    describe("insertPendingRequest", () => {
        it("should insert a pending request", async () => {
            const ownerusername = "testUser";
            const contactusername = "user1";
            const timestamp = new Date();
            const ownerId = 1;
            const contactId = 2;

            mockConnection.execute
                .mockResolvedValueOnce([[{ id: ownerId }]]) // Mock owner ID query
                .mockResolvedValueOnce([[{ id: contactId }]]) // Mock contact ID query
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // Mock insert query

            const result = await EmergencyContactModel.insertPendingRequest(
                ownerusername,
                contactusername,
                timestamp
            );

            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                [ownerusername]
            );
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                [contactusername]
            );
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                [ownerId, ownerusername, contactId, contactusername]
            );
            expect(result).toEqual({ affectedRows: 1 });
        });

        it("should throw an error if owner username is not found", async () => {
            mockConnection.execute.mockResolvedValueOnce([[]]); // Mock owner ID query with no results

            await expect(
                EmergencyContactModel.insertPendingRequest(
                    "testUser",
                    "user1",
                    new Date()
                )
            ).rejects.toThrow("User with username testUser not found");
        });

        it("should throw an error if contact username is not found", async () => {
            const ownerId = 1;

            mockConnection.execute
                .mockResolvedValueOnce([[{ id: ownerId }]]) // Mock owner ID query
                .mockResolvedValueOnce([[]]); // Mock contact ID query with no results

            await expect(
                EmergencyContactModel.insertPendingRequest(
                    "testUser",
                    "user1",
                    new Date()
                )
            ).rejects.toThrow("User with username user1 not found");
        });

        it("should throw an error if database query fails", async () => {
            mockConnection.execute.mockRejectedValue(
                new Error("Database Error")
            );

            await expect(
                EmergencyContactModel.insertPendingRequest(
                    "testUser",
                    "user1",
                    new Date()
                )
            ).rejects.toThrow("Database Error");
        });
    });

    describe("getAvailableResources", () => {
        it("should return available resources for a user", async () => {
            const userName = "testUser";
            const resources = [
                {
                    water: 10,
                    bread: 5,
                    medicine: 2,
                },
            ];
            mockConnection.execute.mockResolvedValue([resources]);

            const result = await EmergencyContactModel.getAvailableResources(
                userName
            );

            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.any(String),
                [userName]
            );
            expect(result).toEqual(resources);
        });

        it("should throw an error if database query fails", async () => {
            mockConnection.execute.mockRejectedValue(
                new Error("Database Error")
            );

            await expect(
                EmergencyContactModel.getAvailableResources("testUser")
            ).rejects.toThrow("Database Error");
        });
    });
});
