import IncidentPostMessageModel from "../../models/incidentPostMessageModel.js";
import { getDatabaseConnection } from "../../configurations/dbConfig.js";

jest.mock("../../configurations/dbConfig.js");

let mockDb;

describe("IncidentPostMessageModel Unit Tests", () => {
  beforeAll(() => {
    mockDb = {
      execute: jest.fn(),
    };
    getDatabaseConnection.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createIncidentPostMessageByincidentID", () => {
    it("should throw an error if the INSERT query fails", async () => {
      // Mock the database `execute` method to simulate a failure
      mockDb.execute.mockRejectedValue(new Error("Database error"));
    
      // Assert that the error message matches the one thrown in the implementation
      await expect(
        IncidentPostMessageModel.createIncidentPostMessageByincidentID(
          "New comment",  // Comment text
          "testuser",     // Username
          "active",       // Account status
          1               // Incident post ID
        )
      ).rejects.toThrow("An error occurred while creating the incident message");
    });    
  });

  describe("getIncidentPostMessagesByincidentID", () => {
    it("should fetch all messages for a given incident post ID", async () => {
      const mockMessages = [
        {
          id: 1,
          text: "Message 1",
          sent_time: "2023-01-01 10:00:00",
          sender_name: "user1",
          sender_status: "active",
          incidentPost_id: 1,
        },
        {
          id: 2,
          text: "Message 2",
          sent_time: "2023-01-01 10:01:00",
          sender_name: "user2",
          sender_status: "inactive",
          incidentPost_id: 1,
        },
      ];

      mockDb.execute.mockResolvedValueOnce([mockMessages]);

      const expectedQuery = `
      SELECT im.id,
            im.text,
            im.sent_time,
            u.user_name AS sender_name,
            u.status AS sender_status,
            im.incidentPost_id
      FROM incidentMessage im
      JOIN user u ON im.sender_id = u.id
      WHERE im.incidentPost_id = ?
            AND u.account_status = 'active';
    `;

    const result = await IncidentPostMessageModel.getIncidentPostMessagesByincidentID(1);

    // Trim all spaces in the actual query
    const actualQuery = mockDb.execute.mock.calls[0][0].replace(/\s+/g, ' ').trim();
    const trimmedExpectedQuery = expectedQuery.replace(/\s+/g, ' ').trim();

    // Assert that the database execute method was called once
    expect(mockDb.execute).toHaveBeenCalledTimes(1);

    // Assert that the trimmed query matches
    expect(actualQuery).toEqual(trimmedExpectedQuery);

    // Assert that the parameters match
    expect(mockDb.execute.mock.calls[0][1]).toEqual([1]);
  });

    it("should throw an error if the SELECT query fails", async () => {
      mockDb.execute.mockRejectedValue(new Error("Database error"));

      await expect(
        IncidentPostMessageModel.getIncidentPostMessagesByincidentID(1)
      ).rejects.toThrow("An error occurred while fetching incident messages");

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteIncidentPostMessagesByincidentID", () => {
    it("should delete all messages for a given incident post ID", async () => {
      const mockResult = { affectedRows: 2 };
      mockDb.execute.mockResolvedValueOnce([mockResult]);

      const result = await IncidentPostMessageModel.deleteIncidentPostMessagesByincidentID(1);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM incidentMessage WHERE incidentPost_id = ?',
        [1]
      );
      expect(result).toEqual({
        success: true,
        affectedRows: 2,
      });
    });

    it("should throw an error if no incidentPost_id is provided", async () => {
      await expect(
        IncidentPostMessageModel.deleteIncidentPostMessagesByincidentID(null)
      ).rejects.toThrow("incidentPost_id is required to delete responses.");

      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it("should throw an error if the DELETE query fails", async () => {
      mockDb.execute.mockRejectedValue(new Error("Database error"));

      await expect(
        IncidentPostMessageModel.deleteIncidentPostMessagesByincidentID(1)
      ).rejects.toThrow("Database error");

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });
});