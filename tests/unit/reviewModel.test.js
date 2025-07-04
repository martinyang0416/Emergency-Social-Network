import ReviewModel from "../../models/reviewModel.js";
import { getDatabaseConnection } from "../../configurations/dbConfig.js";

jest.mock("../../configurations/dbConfig.js");

describe("ReviewModel", () => {
    let mockConnection;

    beforeEach(() => {
        mockConnection = {
            execute: jest.fn(),
        };
        getDatabaseConnection.mockResolvedValue(mockConnection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getReviewsByResourceId", () => {
        it("should fetch reviews by resource ID successfully", async () => {
            const reviews = [
                { reviewer_name: "Alice", review_content: "Great resource!", upvote_downvote: 1, created_at: "2024-11-19T10:00:00Z" },
                { reviewer_name: "Bob", review_content: "Needs improvement.", upvote_downvote: 0, created_at: "2024-11-18T10:00:00Z" },
            ];
            mockConnection.execute.mockResolvedValue([reviews]);
    
            const result = await ReviewModel.getReviewsByResourceId(1);
    
            const expectedQuery = `
                SELECT u.user_name AS reviewer_name,
                       rr.review_content,
                       rr.upvote_downvote,
                       rr.created_at
                FROM resource_reviews rr
                JOIN user u ON rr.reviewer_id = u.id
                WHERE rr.resource_id = ?
                AND u.account_status = 'active'
                ORDER BY rr.created_at DESC;
            `;
            const normalizeQuery = (query) => query.replace(/\s+/g, " ").trim();
    
            expect(normalizeQuery(mockConnection.execute.mock.calls[0][0])).toBe(normalizeQuery(expectedQuery));
            expect(mockConnection.execute.mock.calls[0][1]).toEqual([1]);
            expect(result).toEqual(reviews);
        });
    
        it("should return an empty array if no reviews are found", async () => {
            mockConnection.execute.mockResolvedValue([[]]);
    
            const result = await ReviewModel.getReviewsByResourceId(99);
            expect(result).toEqual([]);
        });
    
        it("should throw an error if the database query fails", async () => {
            mockConnection.execute.mockRejectedValue(new Error("Database Error"));
    
            await expect(ReviewModel.getReviewsByResourceId(1)).rejects.toThrow("Database Error");
        });
    });
    

    describe("addReview", () => {
        it("should add a review successfully", async () => {
            const resourceId = 1;
            const reviewerName = "Alice";
            const reviewContent = "This is a great resource!";
            const upvoteDownvote = 1;
    
            const reviewerResult = { id: 1 };
            const insertResult = { affectedRows: 1 };
    
            // Mock fetching the reviewer ID
            mockConnection.execute.mockResolvedValueOnce([[reviewerResult]]);
            // Mock inserting the review
            mockConnection.execute.mockResolvedValueOnce([insertResult]);
    
            const result = await ReviewModel.addReview(resourceId, reviewerName, reviewContent, upvoteDownvote);
    
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(mockConnection.execute).toHaveBeenNthCalledWith(1, expect.any(String), [reviewerName]);
            expect(mockConnection.execute).toHaveBeenNthCalledWith(2, expect.any(String), [
                resourceId,
                reviewerResult.id,
                reviewerName,
                reviewContent,
                upvoteDownvote,
            ]);
            expect(result).toEqual(insertResult);
        });
    
        it("should throw an error if the reviewer is not found", async () => {
            const reviewerName = "UnknownUser";
    
            // Mock no reviewer found
            mockConnection.execute.mockResolvedValueOnce([[]]);
    
            await expect(
                ReviewModel.addReview(1, reviewerName, "Great resource!", 1)
            ).rejects.toThrow("Reviewer not found");
        });

        it("should throw an error if the database query fails", async () => {
            mockConnection.execute.mockRejectedValue(new Error("Database Error"));
    
            await expect(
                ReviewModel.addReview(1, "Alice", "Great resource!", 1)
            ).rejects.toThrow("Database Error");
        });
    });    
});
