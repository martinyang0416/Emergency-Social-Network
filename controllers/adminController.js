import UserModel from "../models/userModel.js";
import registerController from "./registerController.js";
import io from "../configurations/socketIo.js";


class AdminController {
    static async getAllUsers(req, res) {
        try {
            const users = await UserModel.getAllUsersForAdmin();
            res.status(200).json(users);
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ message: "Failed to fetch users" });
        }
    }

    static async validateUsername(req, res) {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        try {
            // Call registerController to validate username
            await registerController.adminValidateUsernmame(username, res);
        } catch (error) {
            console.error("Error validating username:", error);
            res.status(500).json({ message: "Failed to validate username" });
        }
    }

    static async validatePassword(req, res) {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        try {
            // Call registerController to validate password
            await registerController.adminValidatePassword(password, res);
        } catch (error) {
            console.error("Error validating password:", error);
            res.status(500).json({ message: "Failed to validate password" });
        }
    }

    static async updateUser(req, res) {
        const { username, accountStatus, privilegeLevel, password } = req.body;
        const userId = req.params.UserID; // Retrieve userId from the request parameters
        const currentUserName = req.params.currentUserName;

        try {
            // Check if userId is undefined
            if (!userId) {
                return res.status(400).json({ message: "User ID is required." });
            }

            // Check if any fields to update are provided
            if (!username && !accountStatus && !privilegeLevel && !password) {
                return res.status(400).json({ message: "No fields to update." });
            }

            // Prepare updates object
            const updates = {};
            if (username) updates.username = username;
            if (accountStatus) updates.accountStatus = accountStatus;
            if (privilegeLevel) updates.privilegeLevel = privilegeLevel;
            if (password) updates.password = password; // Assuming password will be hashed in the model

            
            console.log(username != null, accountStatus != null)
            if (username != null){
                io.handleNameProcess({ username, currentUserName });
            }


            if (accountStatus != null){
                io.handleStatusProcess({ accountStatus, currentUserName });
            }


            if (privilegeLevel != null){
                const isUserAdmin = await UserModel.isUserAdmin(currentUserName);
                
                const numberofAdmins = await UserModel.getNumberOfAdmins();

                console.log(numberofAdmins, isUserAdmin, privilegeLevel)
                console.log(numberofAdmins == 1 && isUserAdmin == true && privilegeLevel != "admin")

                if (numberofAdmins == 1 && isUserAdmin == true){
                    
                    return res.status(400).json({ message: "Cannot change privilege level. Only one admin left." });
                }
                updates.privilegeLevel = privilegeLevel; 
            }


            // Call the model to update user
            const updateResult = await UserModel.updateUser(userId, updates);

            if (updateResult.success) {
                return res.status(200).json({ message: "User updated successfully." });
            } else {
                return res.status(400).json({ message: "Failed to update user." });
            }
        } catch (error) {
            console.error("Error updating user:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
    }


    static async getUerID(req, res) {
        const username = req.params.username;
        try {
            const userID = await UserModel.getUserIDForAdmin(username);
            res.status(200).json({ userID });
        } catch (error) {
            console.error("Error fetching user ID:", error);
            res.status(500).json({ message: "Failed to fetch user ID" });
        }
    }
}

export default AdminController;
