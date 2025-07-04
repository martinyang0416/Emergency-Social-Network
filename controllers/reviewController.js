import ReviewModel from "../models/reviewModel.js";

class ReviewController {
    // Fetch reviews for a specific resource
    static async getReviews(req, res) {
        const { resourceId } = req.params;

        try {
            const reviews = await ReviewModel.getReviewsByResourceId(
                resourceId
            );

            res.status(200).json({
                message: "Reviews fetched successfully",
                data: reviews,
            });
        } catch (error) {
            console.error("Error fetching reviews:", error);
            res.status(500).json({
                message: "Error fetching reviews",
                error: error.message,
            });
        }
    }

    // Add a new review for a resource
    static async addReview(req, res) {
        const { content, vote } = req.body;
        const resourceId = req.params.resourceId;

        try {
            const reviewerName = req.user.username;

            if (!content || vote === undefined) {
                return res
                    .status(400)
                    .json({ message: "Content and vote are required" });
            }

            const result = await ReviewModel.addReview(
                resourceId,
                reviewerName,
                content,
                vote
            );

            res.status(201).json({
                message: "Review added successfully",
                data: {
                    id: result.insertId,
                    resource_id: resourceId,
                    reviewer_name: reviewerName,
                    content: content,
                    vote: vote,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error("Error adding review:", error);
            return res.status(500).json({
                message: "Error adding review",
                error: error.message,
            });
        }
    }
}

export default ReviewController;
