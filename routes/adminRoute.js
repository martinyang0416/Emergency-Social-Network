import express from 'express';
import adminController from "../controllers/adminController.js";

const adminRouter = express.Router();

// Route to get all users
adminRouter.get("/users", adminController.getAllUsers);

// Route to update a user's details
adminRouter.post("/updateUser/:UserID/:currentUserName", adminController.updateUser);

// Route to validate username
adminRouter.post("/validateUsername", adminController.validateUsername);

// Route to validate password
adminRouter.post("/validatePassword", adminController.validatePassword);

adminRouter.get("/getUserID/:username/", adminController.getUerID);

export default adminRouter;