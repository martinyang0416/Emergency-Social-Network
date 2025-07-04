import express from 'express';
import SpeedTestController from '../controllers/speedTestController.js';

const speedTestRouter = express.Router();

// Route to start performance test
speedTestRouter.post('/start-speed-test', SpeedTestController.startSpeedTest);

speedTestRouter.post('/end-speed-test', SpeedTestController.endSpeedTest);

export default speedTestRouter;
