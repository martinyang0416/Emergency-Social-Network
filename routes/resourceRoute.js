import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import ResourceController from "../controllers/resourceController.js";



const resourceRouter = express.Router();

//get all users's resource data
resourceRouter.get("/allUsers", authMiddleware, ResourceController.getAllUsersResources);

//get current user's all resource data
resourceRouter.get("/:username", authMiddleware, ResourceController.getUserResources);

//update current user's resource data
resourceRouter.put("/:username", authMiddleware, ResourceController.updateUserResource);

//create a new request
resourceRouter.post("/newRequest", authMiddleware, ResourceController.createResourceRequest);

//get all sent requests
resourceRouter.get("/sentRequests/:username", authMiddleware, ResourceController.getAllSentRequests);

//withdraw a request
resourceRouter.delete("/request", authMiddleware, ResourceController.withdrawRequest);

//get all received requests
resourceRouter.get("/receivedRequests/:username", authMiddleware, ResourceController.getAllReceivedRequests);

// approve request
resourceRouter.put("/request/approvedRequest", authMiddleware, ResourceController.approveRequest);

// reject request
resourceRouter.put("/request/rejectedRequest", authMiddleware, ResourceController.rejectRequest);


export default resourceRouter;