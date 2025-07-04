import express from 'express';
import MapResourceController from '../controllers/mapResourceController.js';

const mapRouter = express.Router();

// Fetch all resources
mapRouter.get('/resources', MapResourceController.getResources);

// Add resource
mapRouter.post('/resources', MapResourceController.addResource);

// Update location
mapRouter.put('/resources/:id', MapResourceController.updateResourceLocation);

export default mapRouter;
