import express from "express";
import EmergencyContactController from "../controllers/emergencyContactController.js";

const emergencyContactRouter = express.Router();

emergencyContactRouter.get(
    "/:ownerusername/available",
    EmergencyContactController.getUnaddedUsers
);

emergencyContactRouter.get(
    "/:ownerusername/added",
    EmergencyContactController.getAddedUsers
);

emergencyContactRouter.get(
    "/:ownerusername/pending",
    EmergencyContactController.getPendingUsers
);

emergencyContactRouter.post(
    "/request",
    EmergencyContactController.sendConnectRequest
);

emergencyContactRouter.post(
    "/acceptance",
    EmergencyContactController.acceptConnectRequest
);

emergencyContactRouter.post(
    "/denial",
    EmergencyContactController.declineConnectRequest
);

emergencyContactRouter.get(
    "/resources/:userName",
    EmergencyContactController.getAvailableResources
);

emergencyContactRouter.post(
    "/resources/:contactusername/:resourceType",
    EmergencyContactController.shareResource
);

export default emergencyContactRouter;
