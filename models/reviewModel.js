import { getDatabaseConnection } from "../configurations/dbConfig.js";

class ReviewModel {
    // Fetch reviews by resource ID
    static async getReviewsByResourceId(resourceId) {
        const query = `
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

        try {
            const connection = await getDatabaseConnection();
            const [rows] = await connection.execute(query, [resourceId]);
            return rows;
        } catch (error) {
            console.error("Error fetching reviews:", error);
            throw error;
        }
    }

    // Add a new review
    static async addReview(resourceId, reviewerName, reviewContent, upvoteDownvote) {
        try {
            const connection = await getDatabaseConnection();
        
            // Fetch the reviewer ID
            const reviewerIdQuery = `
                SELECT id 
                FROM user 
                WHERE user_name = ?;
            `;
        
            const [[reviewer]] = await connection.execute(reviewerIdQuery, [reviewerName]);
        
            if (!reviewer) {
                throw new Error("Reviewer not found");
            }
        
            const reviewerId = reviewer.id;
        
            // Insert into the resource_reviews table
            const insertQuery = `
                INSERT INTO resource_reviews (resource_id, reviewer_id, reviewer_name, review_content, upvote_downvote)
                VALUES (?, ?, ?, ?, ?);
            `;
        
            const [result] = await connection.execute(insertQuery, [
                resourceId,
                reviewerId,
                reviewerName,
                reviewContent,
                upvoteDownvote,
            ]);
        
            return result;
        } catch (error) {
            console.error("Error adding review:", error.message);
            throw error;
        }        
    }
}

export default ReviewModel;