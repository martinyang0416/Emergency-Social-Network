import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
// import { connectToDatabase } from './configurations/dbConfig.js';
import sessionConfig from "./configurations/sessionConfig.js";
import io from "./configurations/socketIo.js";
import { specs, swaggerUi } from "./configurations/swagger.js";
import indexRouter from "./routes/indexRoute.js";
import messageRouter from "./routes/messageRoute.js";
import userRouter from "./routes/userRoute.js";
import postRouter from "./routes/incidentPostRoute.js";
import mapRouter from './routes/mapRoute.js';
import reviewRouter from "./routes/reviewRoute.js";
import resourceRouter from "./routes/resourceRoute.js";
import YAML from "yamljs";
import speedTestRouter from "./routes/speedTestRoute.js";
import emergencyContactRouter from "./routes/emergencyContactRoute.js";
import {setDatabaseConnection} from "./configurations/dbConfig.js"
import walletRouter from "./routes/walletRoute.js";
import adminRouter from "./routes/adminRoute.js";

dotenv.config();

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the app and server
const app = express();
const server = http.createServer(app);

// Middleware setup
app.use(express.static(path.join(__dirname, "public")));
// Serve header.html
app.get("/header.html", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "header.html"));
});
app.get('/resourcesHeader.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'resourcesHeader.html'));
});
app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "src/assets")));
app.use(sessionConfig); // Use session config
app.use(cookieParser());

// Templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/", indexRouter);
app.use("/messages", messageRouter);
app.use("/users", userRouter);
app.use(speedTestRouter);
app.use("/posts", postRouter);
app.use("/emergencyContact", emergencyContactRouter);
app.use("/maps", mapRouter);
app.use("/reviews", reviewRouter);
app.use("/resources", resourceRouter);
app.use("/wallet", walletRouter)
app.use("/admin", adminRouter)


// Swagger documentation
const swaggerDocument = YAML.load("./openAPI.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Listen to the server on a specific port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Get the database name from the command line, if provided, for example: {node app.js sb2}
// const args = process.argv.slice(2);
// const databaseName = args[0] || 'sb2';
// Default to 'sb2' if no argument is provided

// Establish the connection
(async () => {
    try {
        // await connectToDatabase(databaseName);
        await setDatabaseConnection("sb2");
    } catch (error) {
        console.error("Error during app initialization:", error);
    }
})();

// Initialize socket.io
io.attach(server);
