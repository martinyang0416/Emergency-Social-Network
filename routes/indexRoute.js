import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware from "../middlewares/authMiddleware.js";

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexRouter = express.Router();

// Route for the pre-home page
indexRouter.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/preHome.html"));
});

// Route for the join (registration) page
indexRouter.get("/join_page", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/register.html"));
});

// Route for the new user acknowledgement page
indexRouter.get("/new_user_acknowledge_page", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/acknowledgement.html"));
});

// Route for the home page
indexRouter.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/home.html"));
});

// Route to render Public Wall page with EJS template
indexRouter.get("/public", (req, res) => {
    res.render("publicWall");
});

// Route to render Announcement page with EJS template
indexRouter.get("/announcement", (req, res) => {
    res.render("announcement");
});

// Route for the private chat page
indexRouter.get("/privateChat", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/privateChat.html"));
});

// Route for token verification (middleware protected)
indexRouter.get("/verification", authMiddleware, (req, res) => {
    res.status(200).json(req.user);
});

indexRouter.get("/speedtest", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/speedTest.html"));
});

indexRouter.get("/searchPage", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/searchPage.html"));
});

indexRouter.get("/incidentPost", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/incidentPost.html"));
});

indexRouter.get("/emergencyContact", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/emergencyContact.html"));
});

indexRouter.get("/emergencyContact/sharing/:contactusername", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/shareResource.html"));
});

//Map Feature Index Routes
indexRouter.get("/map", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/mapView.html"));
});

indexRouter.get("/map/updateLocation", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/UpdateLocation.html"));
});

indexRouter.get("/addResource", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/addResource.html"));
});

indexRouter.get("/emergencyContact", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/emergencyContact.html"));
});

indexRouter.get("/emergencyContact/sharing/:contactusername", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/shareResource.html"));
});

indexRouter.get("/map/updateLocation", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/UpdateLocation.html"));
});

indexRouter.get("/addResource", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/addResource.html"));
});

indexRouter.get("/updateResource", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/updateResource.html"));
});

indexRouter.get("/resourceReviews", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/resourceReviews.html"));
});

indexRouter.get("/resourcesDashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/resourcesDashboard.html"));
});

indexRouter.get("/resourcesRequest", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/resourcesRequest.html"));
});

indexRouter.get("/manageResources", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/manageResources.html"));
});

indexRouter.get("/wallet", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/wallet.html"));
});

indexRouter.get("/addCard", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/addCard.html"));
});

indexRouter.get("/topup", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/topup.html"));
});

indexRouter.get("/updateResource", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/updateResource.html"));
});

indexRouter.get("/resourceReviews", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/resourceReviews.html"));
});

indexRouter.get("/resourcesDashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/resourcesDashboard.html"));
});

indexRouter.get("/resourcesRequest", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/resourcesRequest.html"));
});

indexRouter.get("/manageResources", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/manageResources.html"));
});

indexRouter.get("/wallet2", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/wallet.html"));
});

indexRouter.get("/addCard", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/addCard.html"));
});

indexRouter.get("/topup", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/topup.html"));
});

indexRouter.get("/newPost", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/newPost.html"));
});

indexRouter.get("/newPost", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/newPost.html"));
});

// TODO: Why there are so many duplicated? need to be fixed later 

indexRouter.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/admin.html"));
});

export default indexRouter;
