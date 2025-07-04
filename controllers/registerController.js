import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";
import ResourceModel from "../models/resourceModel.js";
import ValidationHelper from "../utils/validationHelper.js";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

class RegisterController {
    static async isRegister(req, res) {
        try {
            const { username, password } = req.body;

            // Normalize the username to lowercase
            const normalizedUsername = username.toLowerCase();
            // Check if the user already exists
            const existingUser = await UserModel.getUserByUsernameForValidation(
                normalizedUsername
            );
            if (existingUser == null) {
                // Create a new user if one does not exist
                const user = new UserModel(
                    null,
                    normalizedUsername,
                    password,
                    "citizen",
                    "Undefined",
                    "offline",
                    false
                );
                await user.createUser();

                // Create a new resource profile for the user
                const resourceProfile = new ResourceModel(
                    normalizedUsername,
                    0,
                    0,
                    0
                );
                await resourceProfile.createResourceProfile();

                return res
                    .status(200)
                    .json({
                        message: "User registration success",
                        token: "",
                        privilege: "citizen",
                    });
            } else {
                return res.status(400).json({ message: "User already exists" });
            }
        } catch (err) {
            console.error("Error during registration or login:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async isValidate(req, res) {
        try {
            const { username, password } = req.body;
            const normalizedUsername = username.toLowerCase();

            const existingUser = await UserModel.getUserByUsernameForValidation(
                normalizedUsername
            );

            if (existingUser) {
                const accountStatus =
                    await UserModel.getAccountStatusByUsername(
                        normalizedUsername
                    );
                if (accountStatus != "active") {
                    return res
                        .status(400)
                        .json({ message: "Account is inactive" });
                }

                return await RegisterController.validateExistingUser(
                    existingUser,
                    password,
                    res
                );
            } else {
                return await RegisterController.validateNewUser(
                    normalizedUsername,
                    password,
                    res
                );
            }
        } catch (err) {
            console.error("Error during validation:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async adminValidateUsernmame(username, res) {
        try {
            const result = await UserModel.checkUserExistsForAdmin(username);

            if (result == false) {
                return res.status(200).json({ message: "Username exists" });
            }
            const normalizedUsername = await username.toLowerCase();
            const usernameValidation = await ValidationHelper.validateUsername(
                normalizedUsername
            );
            if (!usernameValidation.valid) {
                return res
                    .status(400)
                    .json({ message: usernameValidation.message });
            }
            return res
                .status(201)
                .json({ message: "User is valid to be created" });
        } catch (err) {
            console.error("Error during admin validation:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async adminValidatePassword(password, res) {
        try {
            const passwordValidation = await ValidationHelper.validatePassword(
                password
            );
            if (!passwordValidation.valid) {
                return res
                    .status(400)
                    .json({ message: passwordValidation.message });
            }
            return res.status(201).json({ message: "Password is valid" });
        } catch (err) {
            console.error("Error during admin password validation:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async validateExistingUser(existingUser, password, res) {
        try {
            const isPasswordValid = await bcrypt.compare(
                password,
                existingUser.password
            );

            if (isPasswordValid) {
                const token = jwt.sign(
                    { username: existingUser.username },
                    JWT_SECRET,
                    { expiresIn: "1h" }
                );

                if (!existingUser.acknowledged) {
                    return res.status(202).json({
                        message: "User not acknowledged",
                        token: "",
                        privilege: existingUser.privilege,
                    });
                } else {
                    await UserModel.markOnlineStatus(
                        "online",
                        existingUser.username
                    );
                    return res.status(200).json({
                        message: "User already exists and acknowledged",
                        token: token,
                        privilege: existingUser.privilege,
                    });
                }
            } else {
                return res
                    .status(400)
                    .json({ message: "User Password is incorrect" });
            }
        } catch (err) {
            console.error("Error during password validation:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async validateNewUser(normalizedUsername, password, res) {
        try {
            const usernameValidation = await ValidationHelper.validateUsername(
                normalizedUsername
            );
            const passwordValidation = await ValidationHelper.validatePassword(
                password
            );

            if (!usernameValidation.valid) {
                return res
                    .status(400)
                    .json({ message: usernameValidation.message });
            }

            if (!passwordValidation.valid) {
                return res
                    .status(400)
                    .json({ message: passwordValidation.message });
            }

            return res
                .status(201)
                .json({
                    message: "User is valid to be created",
                    privilege: "citizen",
                });
        } catch (err) {
            console.error("Error during new user validation:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async isAcknowledge(req, res) {
        try {
            const { username } = req.body;
            const normalizedUsername = username.toLowerCase();

            // update user acknowledged status to true
            await UserModel.acknowledgeUser(true, normalizedUsername);
            await UserModel.markOnlineStatus("online", normalizedUsername);

            const token = jwt.sign(
                { username: normalizedUsername },
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            return res.status(200).json({
                message: "User updating acknowledged_status success",
                token: token,
                privilege: "citizen",
            });
        } catch (err) {
            console.error("Error during signup:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
}

export default RegisterController;
