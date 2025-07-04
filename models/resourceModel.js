import bcrypt from "bcrypt";
import io from '../configurations/socketIo.js';
import { getDatabaseConnection } from "../configurations/dbConfig.js";

class ResourceModel {
    constructor(username, water, bread, medicine, dbConnection) {
        this.username = username;
        this.water = water;
        this.bread = bread;
        this.medicine = medicine;
        this.dbConnection = dbConnection; 
    }

    // Retrieve a resource profile by username
    static async getResourceByUsername(username) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
            SELECT rm.*
            FROM resource_management rm
            JOIN user u ON rm.user_id = u.id
            WHERE u.user_name = ?
            AND u.account_status = 'active';
            `;
            const [rows] = await connection.execute(query, [username]);

            if (rows.length === 0) {
                console.log(`No resource profile found for username: ${username}`);
                return null;
            }

            return rows[0];
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    // Create a new resource profile
    async createResourceProfile() {
        if (!this.username) {
            throw new Error("Username is required.");
        }
        
        try {
            const connection = await getDatabaseConnection();
        
            // Fetch the user ID
            const userIdQuery = `
                SELECT id 
                FROM user 
                WHERE user_name = ?;
            `;
        
            const [[user]] = await connection.execute(userIdQuery, [this.username]);
        
            if (!user) {
                throw new Error(`User '${this.username}' not found.`);
            }
        
            const userId = user.id;
        
            // Insert into resource_management
            const insertQuery = `
                INSERT INTO resource_management (user_id, username, water, bread, medicine)
                VALUES (?, ?, ?, ?, ?);
            `;
        
            const [result] = await connection.execute(insertQuery, [
                userId,
                this.username,
                this.water || 0,
                this.bread || 0,
                this.medicine || 0,
            ]);
        
            return { username: this.username, id: result.insertId };
        } catch (err) {
            console.error("Error creating resource profile:", err.message);
            throw err;
        }        
    }

    //get all users' resources
    static async getAllResources() {
        try {
            const connection = await getDatabaseConnection();
            const query = `
            SELECT u.user_name AS username,
                rm.water,
                rm.bread,
                rm.medicine
            FROM resource_management rm
            JOIN user u ON rm.user_id = u.id
            WHERE u.account_status = 'active';
            `;
            const [rows] = await connection.execute(query);
            return rows;
        } catch (err) {
            console.error("Error retrieving resources from database:", err);
            throw err;
        }
    }

    // Update the resource quantities for a specific user
    static async updateResource(username, resourceType, quantity) {
        try {
            const connection = await getDatabaseConnection();
            const query = `UPDATE \`resource_management\` SET \`${resourceType}\` = ? WHERE \`username\` = ?`;
            const [result] = await connection.execute(query, [quantity, username]);
            
            io.emit("updateUserReource");

            if (result.affectedRows === 0) {
                console.log(`No resource profile found for username: ${username}`);
            }
            return result;
        } catch (err) {
            console.error("Error updating resource profile", err.stack);
            throw err;
        }
    }
}

export default ResourceModel;