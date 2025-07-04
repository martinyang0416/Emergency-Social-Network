import express from 'express';
import IncidentPostController from '../controllers/incidentPostController.js';
import IncidentPostMessageController from '../controllers/incidentPostMessageController.js';
import authMiddleware from "../middlewares/authMiddleware.js";
import { generateUploadUrls, generateDownloadUrls } from "../middlewares/awsAuthMiddleware.js";
const postRouter = express.Router();

// New Post Controller
postRouter.post("/upload_urls", generateUploadUrls, (req, res) => {
    res.json({ uploadUrl: res.locals.uploadUrl });
  });

postRouter.post("/download_urls", generateDownloadUrls, (req, res) => {
    res.json({ downloadUrl: res.locals.downloadUrl });
  });
  
postRouter.post('/incidents', authMiddleware, IncidentPostController.newIncidentPost);
postRouter.put('/incidents/:id', authMiddleware, IncidentPostController.updateIncidentPost);
postRouter.delete('/incidents/:id', authMiddleware, IncidentPostController.deleteIncidentPost);

// Post Controller
postRouter.get('/incidents', authMiddleware, IncidentPostMessageController.getIncidentPosts);

postRouter.get('/incidents/:id/comments', authMiddleware, IncidentPostMessageController.getIncidentCommentByincidentID);
postRouter.post('/incidents/:id/comments', authMiddleware, IncidentPostMessageController.newIncidentCommentByincidentID);

export default postRouter;