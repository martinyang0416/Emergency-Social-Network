import ResourceModel from "../../models/resourceModel.js";
import { getDatabaseConnection } from "../../configurations/dbConfig.js";
import io from "../../configurations/socketIo.js";

jest.mock("../../configurations/dbConfig.js");
jest.mock("../../configurations/socketIo.js");

describe("ResourceModel", () => {
    let mockConnection;

    beforeEach(() => {
        mockConnection = {
            execute: jest.fn(),
        };
        getDatabaseConnection.mockResolvedValue(mockConnection);
        io.emit = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getResourceByUsername", () => {
        it("should return null if no resource profile is found", async () => {
            mockConnection.execute.mockResolvedValue([[]]);

            const result = await ResourceModel.getResourceByUsername("unknown_user");
            expect(result).toBeNull();
        });

        it("should throw an error if the database query fails", async () => {
            mockConnection.execute.mockRejectedValue(new Error("Database Error"));

            await expect(ResourceModel.getResourceByUsername("test_user")).rejects.toThrow("Database Error");
        });
    });

    describe("createResourceProfile", () => {
        it("should create a new resource profile successfully", async () => {
            const resource = new ResourceModel("test_user", 10, 5, 2);
            const user = { id: 1 };
            const insertResult = { insertId: 100 };

            mockConnection.execute.mockResolvedValueOnce([[user]]);
            mockConnection.execute.mockResolvedValueOnce([insertResult]);

            const result = await resource.createResourceProfile();

            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ username: "test_user", id: 100 });
        });

        it("should throw an error if username is not provided", async () => {
            const resource = new ResourceModel(null, 10, 5, 2);

            await expect(resource.createResourceProfile()).rejects.toThrow("Username is required.");
        });

        it("should throw an error if the user is not found", async () => {
            const resource = new ResourceModel("unknown_user", 10, 5, 2);

            mockConnection.execute.mockResolvedValueOnce([[]]);

            await expect(resource.createResourceProfile()).rejects.toThrow("User 'unknown_user' not found.");
        });

        it("should throw an error if the database query fails", async () => {
            const resource = new ResourceModel("test_user", 10, 5, 2);

            mockConnection.execute.mockRejectedValue(new Error("Database Error"));

            await expect(resource.createResourceProfile()).rejects.toThrow("Database Error");
        });
    });

    describe("getAllResources", () => {
        it("should throw an error if the database query fails", async () => {
            mockConnection.execute.mockRejectedValue(new Error("Database Error"));

            await expect(ResourceModel.getAllResources()).rejects.toThrow("Database Error");
        });
    });

    describe("updateResource", () => {
        it("should update a resource quantity successfully", async () => {
            const updateResult = { affectedRows: 1 };
            mockConnection.execute.mockResolvedValue([updateResult]);

            const result = await ResourceModel.updateResource("test_user", "water", 20);

            const expectedQuery = `UPDATE \`resource_management\` SET \`water\` = ? WHERE \`username\` = ?`;
            expect(mockConnection.execute).toHaveBeenCalledWith(expectedQuery, [20, "test_user"]);
            expect(io.emit).toHaveBeenCalledWith("updateUserReource");
            expect(result).toEqual(updateResult);
        });

        it("should log a message if no resource profile is found", async () => {
            const updateResult = { affectedRows: 0 };
            mockConnection.execute.mockResolvedValue([updateResult]);

            const result = await ResourceModel.updateResource("unknown_user", "water", 20);

            expect(io.emit).toHaveBeenCalledWith("updateUserReource");
            expect(result).toEqual(updateResult);
        });

        it("should throw an error if the database query fails", async () => {
            mockConnection.execute.mockRejectedValue(new Error("Database Error"));

            await expect(ResourceModel.updateResource("test_user", "water", 20)).rejects.toThrow("Database Error");
        });
    });
});
