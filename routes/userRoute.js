import express from "express";
import ESNController from "../controllers/ESNController.js";
import RegisterController from "../controllers/registerController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import searchController from "../controllers/searchController.js";
import stopwordsHelper from "../utils/stopwordsHelper.js";
import searchRulesHelper from "../utils/searchRulesHelper.js";

const userRouter = express.Router();
//Register or login a user
userRouter.post("/", RegisterController.isRegister);

//Validate a user
userRouter.post("/:userName/validation", RegisterController.isValidate);

//Acknowledge a user
userRouter.put("/:userName/acknowledgement", RegisterController.isAcknowledge);

//Logout a user
userRouter.put("/:userName/offline", authMiddleware, ESNController.isLogout);

//Get all username classified by online status
userRouter.get("/allUsers", authMiddleware, ESNController.getAllUsers);

//Get user's citizen status
userRouter.get(
    "/:username/citizenStatus",
    authMiddleware,
    ESNController.getUserCitizenStatus
);

// Update user's citizenStatus
userRouter.put(
    "/:username/citizenStatus",
    authMiddleware,
    ESNController.updateUserCitizenStatus
);

userRouter.post(
    "/searchCriteria/:criteria",
    authMiddleware,
    async (req, res) => {
        try {
            let { criteria } = req.params;
            let { query, sender, recipient} = req.body;

            criteria = searchRulesHelper.getSearchCriteria(criteria, query);

            // Extract offset and limit from query parameters, set default values if not provided
            const offset = parseInt(req.query.offset, 10) || 0;
            const limit = parseInt(req.query.limit, 10) || 10;

            console.log(`Received criteria: ${criteria}`);

            let results = [];

            // Switch case to determine search based on criteria
            switch (criteria) {
                case "name":
                    results = await searchController.postUsernameSearch(query);
                    break;
                case "status":
                    results = await searchController.postStatusSearch(query);
                    break;
                case "announcements":
                    if (stopwordsHelper.hasOnlyStopWords(query)) {
                        return res.status(400).json({
                            message: "Query contains stop words.",
                        });
                    }
                    results = await searchController.postAmmouncementSearch(
                        query,
                        limit,
                        offset
                    );
                    break;
                case "publicmessages":
                    if (stopwordsHelper.hasOnlyStopWords(query)) {
                        return res.status(400).json({
                            message: "Query contains stop words.",
                        });
                    }
                    results = await searchController.postPublicMessageSearch(
                        query,
                        limit,
                        offset
                    );
                    break;
                case "privatemessages":
                    if (stopwordsHelper.hasOnlyStopWords(query)) {
                        return res.status(400).json({
                            message: "Query contains stop words.",
                        });
                    }

                    if (!sender || !recipient) {
                        return res.status(400).json({
                            message:
                                "'username' or 'receiver' is required for PrivateMessages search.",
                        });
                    }
                    results = await searchController.postPrivateMessageSearch(
                        query,
                        limit,
                        offset,
                        sender,
                        recipient
                    );
                    break;
                default:
                    return res
                        .status(400)
                        .json({ message: "Invalid search criteria." });
            }

            console.log("Search results:", results);

            return res.status(200).json({ results });
        } catch (err) {
            console.error("Error during search:", err);
            return res
                .status(500)
                .json({ message: "Server error during search." });
        }
    }
);

//Todo:

//Update a user's status and create a breadcrumb
//userRouter.post('/{userName}/status/{statusCode}');

//Retrieve a user's status history (all breadcrumbs)
//userRouter.get('/{userName}/statuscrumbs');

//Retrieve all users
//userRouter.get('/');

//Retrieve a user's record
//userRouter.get('/{userName}');

//Retrieve all users with whom a user has privately chatted with
//userRouter.get('/{userName}/private');

//Deactivate a user
//userRouter.put('/{userName}/inactive');

//Activate a user
//userRouter.put('/{userName}/active');

//Update a user's record
//userRouter.put('/{userName}');

//Retrieve active users
//userRouter.get('/active');

//Retrieve inactive users
//userRouter.get('/inactive');

export default userRouter;
