import bcrypt from "bcrypt";
import io from '../configurations/socketIo.js';
import { getDatabaseConnection } from "../configurations/dbConfig.js";

class ResourceRequestModel {
    constructor(requesterUsername, requestedFromUsername, resourceType, quantity, dbConnection) {
        this.requesterUsername = requesterUsername;
        this.requestedFromUsername = requestedFromUsername;
        this.resourceType = resourceType;
        this.quantity = quantity;
        this.dbConnection = dbConnection; 
    }

    // Create a new resource request
    async createRequest() {
        if (!this.requesterUsername || !this.requestedFromUsername || !this.resourceType || !this.quantity) {
            throw new Error("All fields are required to create a request.");
        }
        
        try {
            const connection = await getDatabaseConnection();
        
            // Fetch requester and requested_from user IDs
            const getUserIdQuery = `
                SELECT id 
                FROM user 
                WHERE user_name = ?;
            `;
        
            const [[requester]] = await connection.execute(getUserIdQuery, [this.requesterUsername]);
            const [[requestedFrom]] = await connection.execute(getUserIdQuery, [this.requestedFromUsername]);
        
            if (!requester) {
                throw new Error(`Requester '${this.requesterUsername}' not found.`);
            }
        
            if (!requestedFrom) {
                throw new Error(`Requested-from user '${this.requestedFromUsername}' not found.`);
            }
        
            const requesterId = requester.id;
            const requestedFromId = requestedFrom.id;
        
            // Insert the resource request
            const insertQuery = `
                INSERT INTO resource_requests (requester_id, requested_from_id, requester_username, requested_from_username, ${this.resourceType})
                VALUES (?, ?, ?, ?, ?);
            `;
        
            const [result] = await connection.execute(insertQuery, [
                requesterId,
                requestedFromId,
                this.requesterUsername,
                this.requestedFromUsername,
                this.quantity,
            ]);
        
            // Emit the event via socket
            const senderSocketId = io.getSocketIdByUsername(this.requesterUsername);
            const recipientSocketId = io.getSocketIdByUsername(this.requestedFromUsername);
        
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("request sent");
            }
        
            return {
                requestId: result.insertId,
                requesterUsername: this.requesterUsername,
                requestedFromUsername: this.requestedFromUsername,
            };
        } catch (err) {
            console.error("Error creating resource request:", err.message);
            throw err;
        }        
    }

    // Retrieve all requests initiated by a specific requester
    static async getRequestsByRequester(requesterUsername) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                SELECT rr.*
                FROM resource_requests rr
                JOIN user u_requester ON rr.requester_id = u_requester.id
                JOIN user u_requested ON rr.requested_from_id = u_requested.id
                WHERE u_requester.user_name = ?
                AND u_requester.account_status = 'active'
                AND u_requested.account_status = 'active';
            `;
            const [rows] = await connection.execute(query, [requesterUsername]);
            return rows;
        } catch (err) {
            console.error("Error retrieving requests by requester username", err.stack);
            throw err;
        }
    }

    // Retrieve all requests received by a specific user
    static async getRequestsByRequestedFrom(requestedFromUsername) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                SELECT rr.*
                FROM resource_requests rr
                JOIN user u_requested ON rr.requested_from_id = u_requested.id
                JOIN user u_requester ON rr.requester_id = u_requester.id
                WHERE u_requested.user_name = ?
                AND u_requested.account_status = 'active'
                AND u_requester.account_status = 'active';
            `;
            const [rows] = await connection.execute(query, [requestedFromUsername]);

            return rows;
        } catch (err) {
            console.error("Error retrieving requests by requested from username", err.stack);
            throw err;
        }
    }

    // Retrieve a specific request by request ID
    static async getRequestById(requestId) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
            SELECT rr.*
            FROM resource_requests rr
            JOIN user u_requester ON rr.requester_id = u_requester.id
            JOIN user u_requested ON rr.requested_from_id = u_requested.id
            WHERE rr.request_id = ?
            AND u_requester.account_status = 'active'
            AND u_requested.account_status = 'active';
            `;
            const [rows] = await connection.execute(query, [requestId]);

            if (rows.length === 0) {
                console.log(`No request found with ID: ${requestId}`);
                return null;
            }

            return rows[0];
        } catch (err) {
            console.error("Error retrieving resource request", err.stack);
            throw err;
        }
    }

    // Delete a specific request by request ID
    static async deleteRequestById(requestId, requesterUsername, requestedFromUsername) {
        try {
            const connection = await getDatabaseConnection();
            const query = "DELETE FROM `resource_requests` WHERE `request_id` = ?";
            const [result] = await connection.execute(query, [requestId]);

            if (result.affectedRows === 0) {
                console.log(`No request found with ID: ${requestId}`);
            }

            //socket
            console.log("preparing to delete request");
            const senderSocketId = io.getSocketIdByUsername(requesterUsername);
            const recipientSocketId = io.getSocketIdByUsername(requestedFromUsername);

            console.log(`Requester (${requesterUsername}) Socket ID: ${senderSocketId}`);
            console.log(`Requested User (${requestedFromUsername}) Socket ID: ${recipientSocketId}`);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("request deleted"); 
            }
            if (senderSocketId) {
                io.to(senderSocketId).emit("request deleted"); 
            }

            return result;
        } catch (err) {
            console.error("Error deleting resource request", err.stack);
            throw err;
        }
    }

    // Update the quantity for a specific resource in a request
    static async updateRequestQuantity(requestId, resourceType, quantity) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                UPDATE \`resource_requests\` 
                SET \`${resourceType}\` = ? 
                WHERE \`request_id\` = ?
            `;
            const [result] = await connection.execute(query, [quantity, requestId]);

            if (result.affectedRows === 0) {
                console.log(`No request found with ID: ${requestId}`);
            }
            return result;
        } catch (err) {
            console.error("Error updating resource request quantity", err.stack);
            throw err;
        }
    }
}

export default ResourceRequestModel;
