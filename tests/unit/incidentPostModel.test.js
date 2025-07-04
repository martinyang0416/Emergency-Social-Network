import IncidentPostModel from "../../models/incidentPostModel.js";
import { getDatabaseConnection } from "../../configurations/dbConfig.js";

jest.mock("../../configurations/dbConfig.js");

let mockDb;

describe("IncidentPostModel Unit Tests", () => {
  beforeAll(() => {
    mockDb = {
      execute: jest.fn(),
      query: jest.fn()
    };
    getDatabaseConnection.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createIncidentPost", () => {
    it("should throw an error if the database operation fails", async () => {
      mockDb.execute.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        IncidentPostModel.createIncidentPost(
          "Test Title",
          "Test Details",
          "Resource Details",
          "testuser",
          "active"
        )
      ).rejects.toThrow("Failed to create incident post. Please try again later.");
    });
  });

  describe("deleteImages", () => {
    it("should delete images for a given incident post ID", async () => {
      const mockResult = { affectedRows: 2 };
      mockDb.execute.mockResolvedValueOnce([mockResult]);

      const result = await IncidentPostModel.deleteImages(1);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM image WHERE incidentPost_id = ?',
        [1]
      );
      expect(result).toEqual(mockResult);
    });

    it("should handle database errors gracefully", async () => {
      mockDb.execute.mockRejectedValueOnce(new Error("Database error"));
      const result = await IncidentPostModel.deleteImages(1);
      expect(result).toBeUndefined();
    });
  });

  describe("updateIncidentPost", () => {
    it("should update an incident post and return the updated post", async () => {
      const mockUpdateResult = { affectedRows: 1 };
      const mockUpdatedPost = {
        id: 1,
        title: "Updated Title",
        details: "Updated Details",
        resource_details: "Updated Resources",
        sender_status: "active"
      };

      mockDb.execute
        .mockResolvedValueOnce([mockUpdateResult])
        .mockResolvedValueOnce([[mockUpdatedPost]]);

      const result = await IncidentPostModel.updateIncidentPost(
        1,
        "Updated Title",
        "Updated Details",
        "Updated Resources",
        "active"
      );

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(mockDb.execute.mock.calls[0]).toEqual([
        'UPDATE incidentPost SET title = ?, details = ?, resource_details = ?, sender_status = ? WHERE id = ?',
        ["Updated Title", "Updated Details", "Updated Resources", "active", 1]
      ]);
      expect(result).toEqual(mockUpdatedPost);
    });

    it("should throw an error if no rows are updated", async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ affectedRows: 0 }]);

      await expect(
        IncidentPostModel.updateIncidentPost(
          999,
          "Title",
          "Details",
          "Resources",
          "active"
        )
      ).rejects.toThrow("No rows updated. Incident not found.");
    });

    it("should throw an error if the database operation fails", async () => {
      const dbError = new Error("Database error");
      mockDb.execute.mockRejectedValueOnce(dbError);

      await expect(
        IncidentPostModel.updateIncidentPost(
          1,
          "Title",
          "Details",
          "Resources",
          "active"
        )
      ).rejects.toThrow(dbError);
    });
  });

  describe("deleteIncidentPost", () => {
    it("should delete an incident post successfully", async () => {
      mockDb.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await IncidentPostModel.deleteIncidentPost(1);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM incidentPost WHERE id = ?',
        [1]
      );
      expect(result).toEqual({
        success: true,
        message: "Incident post with ID 1 has been deleted.",
        affectedRows: 1
      });
    });

    it("should return failure if no post is found", async () => {
      mockDb.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await IncidentPostModel.deleteIncidentPost(999);

      expect(result).toEqual({
        success: false,
        message: "No incident post found with ID 999.",
        affectedRows: 0
      });
    });

    it("should handle missing ID", async () => {
      const result = await IncidentPostModel.deleteIncidentPost(null);

      expect(result).toEqual({
        success: false,
        message: "Incident post ID is required for deletion."
      });
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe("getIncidentPosts", () => {
    it("should fetch and format all incident posts with images", async () => {
      const mockResults = [
        {
          incidentId: 1,
          incidentTitle: "Test Incident",
          incidentDetails: "Details",
          username: "testuser",
          userstatus: "active",
          incidentTimestamp: "2024-01-01 12:00:00",
          resourceDetails: "Resources",
          imageName: "image1.jpg",
          imageType: "incident"
        },
        {
          incidentId: 1,
          incidentTitle: "Test Incident",
          incidentDetails: "Details",
          username: "testuser",
          userstatus: "active",
          incidentTimestamp: "2024-01-01 12:00:00",
          resourceDetails: "Resources",
          imageName: "image2.jpg",
          imageType: "resource"
        }
      ];

      mockDb.query.mockResolvedValueOnce([mockResults]);

      const result = await IncidentPostModel.getIncidentPosts();

      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        {
          id: 1,
          title: "Test Incident",
          details: "Details",
          resourceDetails: "Resources",
          incidentImages: ["image1.jpg"],
          resourceImages: ["image2.jpg"],
          username: "testuser",
          userstatus: "active",
          timestamp: "2024-01-01 12:00:00"
        }
      ]);
    });

    it("should throw an error if the database query fails", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(IncidentPostModel.getIncidentPosts())
        .rejects.toThrow("Failed to retrieve incident posts");
    });
  });

  describe("getIncidentPostById", () => {
    it("should fetch a single incident post by ID", async () => {
      const mockPost = {
        id: 1,
        title: "Test Incident",
        details: "Details",
        sender_name: "testuser",
        sender_status: "active",
        timestamp: "2024-01-01 12:00:00",
        resource_details: "Resources"
      };

      mockDb.query.mockResolvedValueOnce([[mockPost]]);

      const result = await IncidentPostModel.getIncidentPostById(1);

      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPost);
    });

    it("should return null if no post is found", async () => {
      mockDb.query.mockResolvedValueOnce([[]]);

      const result = await IncidentPostModel.getIncidentPostById(999);

      expect(result).toBeNull();
    });

    it("should throw an error if the database query fails", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(IncidentPostModel.getIncidentPostById(1))
        .rejects.toThrow("Failed to retrieve the incident post");
    });
  });
});