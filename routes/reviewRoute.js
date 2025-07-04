import express from "express";
import ReviewController from "../controllers/reviewController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const reviewRouter = express.Router();

// Get all reviews for a resource
reviewRouter.get("/resources/:resourceId", authMiddleware, ReviewController.getReviews);

// Add a review for a resource
reviewRouter.post("/resources/:resourceId", authMiddleware, ReviewController.addReview);

export default reviewRouter;
