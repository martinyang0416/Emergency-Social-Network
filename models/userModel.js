import bcrypt from "bcrypt";
import { connectToDatabase } from "../configurations/dbConfig.js";
import io from "../configurations/socketIo.js";
import { getDatabaseConnection } from "../configurations/dbConfig.js";

class UserModel {
    constructor(
        id,
        username,
        password,
        privilege,
        citizenStatus,
        onlineStatus,
        acknowledged,
        dbConnection
    ) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.privilege = privilege;
        this.citizenStatus = citizenStatus;
        this.onlineStatus = onlineStatus;
        this.acknowledged = acknowledged;
        this.dbConnection = dbConnection; // Dependency Injection happens here
    }

    static async getUserByUsername(username) {
        try {
            const connection = await getDatabaseConnection();

            const query = `
            SELECT *
                FROM user
                WHERE user_name = ?
                AND account_status = 'active';
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(`getUserByUsername: No user found with username: ${username}`);
                return null;
            }

            // console.log("User retrieved:", rows[0]);
            return {
                id: rows[0].id,
                username: rows[0].user_name,
                password: rows[0].user_password,
                acknowledged: rows[0].Acknowledged,
                citizenStatus: rows[0].status,
                privilege: rows[0].privilege,
            };
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async getUserByUsernameForValidation(username) {
        try {
            const connection = await getDatabaseConnection();

            //no need to filter out inactive users here, as it is part of validation
            const query = `
            SELECT *
                FROM user
                WHERE user_name = ?
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(`getUserByUsername: No user found with username: ${username}`);
                return null;
            }

            // console.log("User retrieved:", rows[0]);
            return {
                id: rows[0].id,
                username: rows[0].user_name,
                password: rows[0].user_password,
                acknowledged: rows[0].Acknowledged,
                citizenStatus: rows[0].status,
                privilege: rows[0].privilege,
            };
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async getUserByUsernameForValidation(username) {
        try {
            const connection = await getDatabaseConnection();

            //no need to filter out inactive users here, as it is part of validation
            const query = `
            SELECT *
                FROM user
                WHERE user_name = ?
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(
                    `getUserByUsername: No user found with username: ${username}`
                );
                return null;
            }

            // console.log("User retrieved:", rows[0]);
            return {
                id: rows[0].id,
                username: rows[0].user_name,
                password: rows[0].user_password,
                acknowledged: rows[0].Acknowledged,
                citizenStatus: rows[0].status,
                privilege: rows[0].privilege,
            };
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async searchUsersByStatus(citizenStatus) {
        try {
            const connection = await getDatabaseConnection();

            // Use parameterized query to search for users by status
            const query = `
            SELECT id,
                user_name AS username,
                status AS citizenStatus,
                online_status AS onlineStatus
            FROM user
            WHERE status = ?
            AND account_status = 'active';
            `;

            // Execute query with the provided citizen status
            const [rows] = await connection.execute(query, [citizenStatus]);

            if (rows.length === 0) {
                console.log(`No users found with status: ${citizenStatus}`);
                return [];
            }

            // Map the results to a clean format
            return rows.map((user) => ({
                id: user.id,
                username: user.username,
                citizenStatus: user.citizenStatus,
                onlineStatus: user.onlineStatus,
            }));
        } catch (err) {
            console.error("Error executing search query", err.stack);
            throw err;
        }
    }

    static async searchPrivateUsersByStatus(sender) {
        try {
            const connection = await getDatabaseConnection();

            // Query to get unique recipient names for the given sender
            const recipientQuery = `
                SELECT DISTINCT u_receiver.user_name AS message_receiver
                FROM privateMessage pm
                JOIN user u_sender ON pm.sender_id = u_sender.id
                JOIN user u_receiver ON pm.receiver_id = u_receiver.id
                WHERE u_sender.user_name = ?
                AND u_sender.account_status = 'active'
                AND u_receiver.account_status = 'active';
            `;

            // Execute the recipient query to get all recipients for the given sender
            const [recipientRows] = await connection.execute(recipientQuery, [
                sender,
            ]);

            // Extract recipient user names
            const recipientUsernames = recipientRows.map(
                (row) => row.message_receiver
            );
            console.log("Recipient usernames:", recipientUsernames);

            if (recipientUsernames.length === 0) {
                return []; // No recipients found
            }

            // Create a parameter placeholder string for the IN clause (e.g., '?, ?, ?')
            const placeholders = recipientUsernames.map(() => "?").join(", ");

            // Query to get the 10 latest status changes for the recipients
            const statusQuery = `
                SELECT us.id,
                    u.user_name,
                    us.status,
                    us.status_timestamp
                FROM (
                    SELECT us.id,
                        us.user_id,
                        us.status,
                        us.status_timestamp,
                        ROW_NUMBER() OVER (PARTITION BY us.user_id ORDER BY us.status_timestamp DESC) AS row_num
                    FROM userstatus us
                    JOIN user u ON us.user_id = u.id
                    WHERE u.user_name IN (${placeholders})
                    AND u.account_status = 'active'
                ) AS status
                JOIN user u ON status.user_id = u.id
                WHERE status.row_num <= 10
                ORDER BY u.user_name, status.status_timestamp DESC;
            `;

            // Execute the status query with recipientIds as parameters
            const [statusRows] = await connection.execute(
                statusQuery,
                recipientUsernames
            );

            return statusRows;
        } catch (error) {
            console.error("Error fetching private messages by status:", error);
            throw error;
        }
    }

    static async searchUsersByUsername(partialUsername) {
        try {
            const connection = await getDatabaseConnection();

            // Use parameterized query to prevent SQL injection
            const query = `
                SELECT id,
                    user_name AS username,
                    status AS citizenStatus,
                    online_status AS onlineStatus
                FROM user
                WHERE user_name LIKE ?
                AND account_status = 'active';
                `;

            // Add wildcards to search for partial matches
            const [rows] = await connection.execute(query, [
                `%${partialUsername}%`,
            ]);

            if (rows.length === 0) {
                console.log(`No users found matching: ${partialUsername}`);
                return [];
            }

            // Map the results to a clean format
            return rows.map((user) => ({
                id: user.id,
                username: user.username,
                citizenStatus: user.citizenStatus,
                onlineStatus: user.onlineStatus,
            }));
        } catch (err) {
            console.error("Error executing search query", err.stack);
            throw err;
        }
    }

    async createUser() {
        if (!this.username) {
            throw new Error("Username is required.");
        }
        try {
            const connection = await getDatabaseConnection();
        
            // Insert into the `user` table
            const userQuery = `
                INSERT INTO \`user\` 
                (\`user_name\`, \`user_password\`, \`privilege\`, \`status\`, \`online_status\`, \`Acknowledged\`) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
        
            // Hash the password securely
            const hashedPassword = bcrypt.hashSync(this.password, 10);
        
            // Execute the user insertion query
            const [userResult] = await connection.execute(userQuery, [
                this.username,
                hashedPassword,
                this.privilege,
                this.citizenStatus,
                this.onlineStatus,
                this.acknowledged,
            ]);
        
            // Get the generated user ID
            const userId = userResult.insertId;
        
            // Insert into the wallet table
            const walletQuery = `
                INSERT INTO wallet (user_id, user_name, balance)
                VALUES (?, ?, ?)
            `;
        
            await connection.execute(walletQuery, [userId, this.username, 0]);
        
            return { id: userId, username: this.username };
        } catch (err) {
            console.error("Error executing query:", err.message);
            throw err;
        }
    }

    static async validatePassword(username, password) {
        try {
            const connection = await getDatabaseConnection();

            //no need to filter out inactive users here, as it is part of validation
            const query = "SELECT * FROM `user` WHERE `user_name` = ?";
            const [rows] = await connection.execute(query, [username]);
            if (rows.length === 0) {
                console.log(
                    `validatePassword: No user found with username: ${username}`
                );
                return null;
            }
            const user = rows[0];
            const isPasswordValid = bcrypt.compareSync(
                password,
                user.user_password
            );
            if (!isPasswordValid) {
                console.log(`Invalid password for user: ${username}`);
                return null;
            }
            console.log("User validated:", user);
            return user;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async acknowledgeUser(acknowledged, username) {
        try {
            const connection = await getDatabaseConnection();
            const query =
                "UPDATE `user` SET `Acknowledged` = ? WHERE `user_name` = ?";
            const [result] = await connection.execute(query, [
                acknowledged,
                username,
            ]);
            return result;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async markOnlineStatus(online_status, username) {
        try {
            const connection = await getDatabaseConnection();
            const query =
                "UPDATE `user` SET `online_status` = ? WHERE `user_name` = ?";
            const [result] = await connection.execute(query, [
                online_status,
                username,
            ]);

            io.emit("updateUserList");
            return result;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async getAllUsers() {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                SELECT user_name AS username,
                    status AS citizenStatus,
                    online_status AS onLineStatus
                FROM user
                WHERE account_status = 'active';
            `;
            const [rows] = await connection.execute(query);
            return rows; // Return the array of users
        } catch (err) {
            console.error("Error fetching all users", err.stack);
            throw err;
        }
    }

    static async getAllUsersForAdmin() {
        try {
            const connection = await getDatabaseConnection();

            //no need to filter out inactive users here, as it is for admin
            const query = `
                SELECT user_name AS username,
                account_status AS status,
                privilege
                FROM user
            `;
            const [rows] = await connection.execute(query);
            return rows; // Return the array of users
        } catch (err) {
            console.error("Error fetching all users", err.stack);
            throw err;
        }
    }

    static async updateCitizenStatus(username, citizenStatus) {
        try {
            const connection = await getDatabaseConnection();
            const query =
                "UPDATE `user` SET `status` = ? WHERE `user_name` = ?";
            const [result] = await connection.execute(query, [
                citizenStatus,
                username,
            ]);
            io.emit("updateUserList");
            io.emit("updateStatus");
            return result;
        } catch (err) {
            console.error("Error updating citizen status", err.stack);
            throw err;
        }
    }

    // update a user's status in userstatus table
    static async insertUserStatusHistory(username, citizenStatus) {
        try {
            const connection = await getDatabaseConnection();
        
            // Fetch the user ID
            const userIdQuery = `
                SELECT id
                FROM user
                WHERE user_name = ?
                AND account_status = 'active';
            `;
        
            const [[user]] = await connection.execute(userIdQuery, [username]);
        
            if (!user) {
                throw new Error("User not found");
            }
        
            const userId = user.id;
        
            // Insert into userstatus
            const insertQuery = `
                INSERT INTO userstatus (user_id, user_name, status)
                VALUES (?, ?, ?);
            `;
        
            const [result] = await connection.execute(insertQuery, [
                userId,
                username,
                citizenStatus,
            ]);
        
            return result;
        } catch (err) {
            console.error("Error updating citizen status", err.message);
            throw err;
        }
    }

    static async getStatusByUsername(username) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
            SELECT status AS citizenStatus
            FROM user
            WHERE user_name = ?
            AND account_status = 'active';
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(
                    `getStatusByUsername: No user found with username: ${username}`
                );
                return null;
            }

            // Return the citizen status of the user
            return rows[0].citizenStatus;
        } catch (err) {
            console.error(
                "Error fetching citizen status by username",
                err.stack
            );
            throw err;
        }
    }

    static async getAccountStatusByUsername(username) {
        try {
            const connection = await getDatabaseConnection();

            //no need to filter out inactive users here, as it is part of validation
            const query = `
            SELECT account_status AS accountStatus
            FROM user
            WHERE user_name = ?
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(`getAccountStatusByUsername: No user found with username: ${username}`);
                return null;
            }

            // Return the account status of the user
            return rows[0].accountStatus;
        }
        catch (err) {
            console.error("Error fetching account status by username", err.stack);
            throw err;
        }
    }

    static async getAccountStatusByUsername(username) {
        try {
            const connection = await getDatabaseConnection();

            //no need to filter out inactive users here, as it is part of validation
            const query = `
            SELECT account_status AS accountStatus
            FROM user
            WHERE user_name = ?
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(`getAccountStatusByUsername: No user found with username: ${username}`);
                return null;
            }

            // Return the account status of the user
            return rows[0].accountStatus;
        }
        catch (err) {
            console.error(
                "Error fetching citizen status by username",
                err.stack
            );            throw err;
        }
    }

    static async checkUserExists(username) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                SELECT *
                FROM user
                WHERE user_name = ?
                AND account_status = 'active';
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(
                    `checkUserExists: No user found with username: ${username}`
                );
                return false;
            }

            return true;
        } catch (err) {
            console.error("Error checking the username", err.stack);
            throw err;
        }
    }

    static async checkUserExistsForAdmin(username) {
        try {
            const connection = await getDatabaseConnection();

            //no need to filter out inactive users here, as it is part of validation
            const query = "SELECT * FROM `user` WHERE `user_name` = ?";
            const [rows] = await connection.execute(query, [username]);

            if (rows.length != 0) {
                console.log(
                    `checkUserExists: User Exists Already: ${username}`
                );
                return false;
            }

            return true;
        } catch (err) {
            console.error("Error checking the username", err.stack);
            throw err;
        }
    }

    static async getUserIDForAdmin(username) {
        try {
            const connection = await getDatabaseConnection();
            // no need to filter out inactive users here, as it is for admin
            const query = `
                SELECT id
                FROM user
                WHERE user_name = ?
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(
                    `getUserID: No user found with username: ${username}`
                );
                return null;
            }

            // console.log("User ID retrieved:", rows[0].id);
            return rows[0].id;
        } catch (err) {
            console.error("Error fetching user ID by username", err.stack);
            throw err;
        }
    }

    // Update user fields dynamically based on provided updates
    static async updateUser(userId, updates) {
        try {
            const connection = await getDatabaseConnection();

            // Build the dynamic SQL query
            const fields = [];
            const values = [];

            if (updates.username !== undefined) {
                fields.push("user_name = ?");
                values.push(updates.username);
            }
            if (updates.accountStatus !== undefined) {
                fields.push("account_status = ?");
                values.push(updates.accountStatus);
            }
            if (updates.privilegeLevel !== undefined) {
                fields.push("privilege = ?");
                values.push(updates.privilegeLevel);
            }
            if (updates.password !== undefined) {
                fields.push("user_password = ?");
                const hashedPassword = bcrypt.hashSync(updates.password, 10);
                values.push(hashedPassword);
            }

            // If no fields to update, return error
            if (fields.length === 0) {
                return {
                    success: false,
                    message: "No valid fields to update.",
                };
            }

            // Add the userId to the values array
            values.push(userId);

            // Construct the SQL query
            const sql = `UPDATE user SET ${fields.join(", ")} WHERE id = ?`;

            // Execute the query
            const [result] = await connection.execute(sql, values);

            if (result.affectedRows > 0) {
                return { success: true, message: "User updated successfully." };
            } else {
                return { success: false, message: "No user found to update." };
            }
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    }

    static async isUserAdmin(username) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                SELECT privilege
                FROM user
                WHERE user_name = ?
                AND account_status = 'active';
            `;
            const [rows] = await connection.execute(query, [username]);
            console.log("Privilege level retrieved:", rows[0].privilege);
            if (rows == undefined || rows.length === 0) {
                console.log(
                    `getPrivilegeLevel: No user found with username: ${username}`
                );
                return false;
            }            
            
            return "administrator" === rows[0].privilege;
        } catch (err) {
            console.error("Error fetching privilege level by username", err.stack);
            throw err;
        }
    }

    static async getNumberOfAdmins() {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                SELECT COUNT(*)
                FROM user
                WHERE privilege = 'administrator'
                AND account_status = 'active';
            `;
            const [rows] = await connection.execute(query);

            if (rows.length === 0) {
                console.log("getNumberOfAdmins: No administrators found");
                return 0;
            }

            // console.log("Number of administrators:", rows[0]["COUNT(*)"]);
            // console.log(rows[0])
            return rows[0]["COUNT(*)"];
        } catch (err) {
            console.error("Error fetching number of administrators", err.stack);
            throw err;
        }
    }
}
export default UserModel;
