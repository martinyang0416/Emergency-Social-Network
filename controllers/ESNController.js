import io from '../configurations/socketIo.js';
import UserModel from "../models/userModel.js";

class ESNController {
    static async getAllUsers(req, res) {
        try {
            const users = await UserModel.getAllUsers();
            res.status(200).json(users);
            io.emit("allUsers", users); 
        } catch (err) {
            console.error("Error in getting all users:", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    
    static async isLogout(req, res) {
        try {
            const { username } = req.body;
            const normalizedUsername = username.toLowerCase();

            await UserModel.markOnlineStatus("offline", normalizedUsername);            
            io.emit("logout", username);

            console.log("User logged out");
            return res.status(200).json({ message: "User offline success" });
        } catch (err) {
            console.error("Error during logout:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    // Function to get user's status (citizenStatus)
    static async getUserCitizenStatus(req, res) {
        try {
            const { username } = req.params;

            if (username == null) {
                return res.status(404).json({ error: "User not found" });
            }

            const normalizedUsername = username.toLowerCase();

            const user = await UserModel.getUserByUsername(normalizedUsername);

            return res.status(200).json({
                username: user.username,
                citizenStatus: user.citizenStatus,
                userid: user.id,
            });
        } catch (err) {
            console.error("Error fetching user status:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async updateUserCitizenStatus(req, res) {
        try {
            const { username, citizenStatus } = req.body;
            console.log(`Updating status for ${username} to ${citizenStatus}`);

            if (!username) {
                return res.status(404).json({ error: "User not found" });
            }

            if (!citizenStatus) {
                return res.status(404).json({ error: "citizenStatus not provided" });
            }

            const user = await UserModel.getUserByUsername(username);
            if(!user){
                return res.status(404).json({ error: "User not found" });
            }
            
            // Update the citizen status in the database
            const result = await UserModel.updateCitizenStatus(username, citizenStatus);

            // Update the user status in userstatus table
            await UserModel.insertUserStatusHistory(username, citizenStatus);
            console.log("Citizen status updated successfully");
    
            return res.status(200).json({ message: "Citizen status updated successfully" });
        } catch (err) {
            console.error("Error updating citizen status:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    

}

export default ESNController;
