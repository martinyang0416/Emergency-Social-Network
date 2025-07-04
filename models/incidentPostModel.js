import { json } from 'express';
import { getDatabaseConnection } from '../configurations/dbConfig.js';

class IncidentPostModel {
    static async createIncidentPost(title, details, resource_details, sender_name, sender_status) {
        try {
            const params = [
                title,  
                details,
                resource_details,
                sender_name,
                sender_status
            ];

        
            const db = await getDatabaseConnection();
        
            // Generate and format the timestamp to 'YYYY-MM-DD HH:MM:SS'
            const timestamp = new Date();
                    
            // Fetch the sender ID
            const senderIdQuery = `
                SELECT id 
                FROM user 
                WHERE user_name = ?;
            `;
        
            const [[senderResult]] = await db.execute(senderIdQuery, [sender_name]);
        
            if (!senderResult) {
                throw new Error(`User '${sender_name}' not found.`);
            }
        
            const senderId = senderResult.id;
        
            // Insert into the incidentPost table
            const insertQuery = `
                INSERT INTO incidentPost 
                (sender_id, title, details, resource_details, sender_name, sender_status, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `;
        
            const [result] = await db.execute(insertQuery, [
                senderId,
                title,
                details,
                resource_details,
                sender_name,
                sender_status,
                timestamp,
            ]);
        
            console.log('Incident post created:', result);
        
            return { 
                id: result.insertId,
                title,
                details,
                resource_details,
                username: sender_name,
                userstatus: sender_status,
                timestamp,
            };
        } catch (err) {
            console.error('Error inserting incident post:', err.message);
            throw new Error('Failed to create incident post. Please try again later.');
        }              
    }
    

    static async insertImage(user_name, incidentPost_id, image_name, type) {
        try {
            const db = await getDatabaseConnection();
        
            // Fetch the user ID
            const userIdQuery = `
                SELECT id 
                FROM user 
                WHERE user_name = ?;
            `;
        
            const [[user]] = await db.execute(userIdQuery, [user_name]);
        
            if (!user) {
                throw new Error(`User '${user_name}' not found.`);
            }
        
            const userId = user.id;
        
            // Insert into the image table
            const insertQuery = `
                INSERT INTO image (user_id, user_name, incidentPost_id, image_name, type)
                VALUES (?, ?, ?, ?, ?);
            `;
        
            const [result] = await db.execute(insertQuery, [
                userId,
                user_name,
                incidentPost_id,
                image_name,
                type,
            ]);
        
            return result;
        } catch (err) {
            console.error("Error inserting image:", err.message);
            throw err;
        }
        
    }

    static async deleteImages(incidentPost_id){
        try {
            const db = await getDatabaseConnection();
            const [result] = await db.execute(
                `DELETE FROM image WHERE incidentPost_id = ?`,
                [incidentPost_id]
            );
            return result;
        } catch (err) {
            console.error(err);
        }
    }

    static async updateIncidentPost(id, title, details, resource_details, sender_status) {
        try {
            const db = await getDatabaseConnection();
    
            // Update the incident post
            const [result] = await db.execute(
                `UPDATE incidentPost SET title = ?, details = ?, resource_details = ?, sender_status = ? WHERE id = ?`,
                [title, details, resource_details, sender_status, id]
            );
    
            // Check if the update affected any rows
            if (result.affectedRows === 0) {
                throw new Error("No rows updated. Incident not found.");
            }
    
            // Fetch the updated row
            const [updatedRow] = await db.execute(
                `
                    SELECT ip.*
                    FROM incidentPost ip
                    JOIN user u ON ip.sender_id = u.id
                    WHERE ip.id = ?
                    AND u.account_status = 'active';
                `,
                [id]
            );
    
            // Return the updated row
            return updatedRow[0]; // Assuming only one row is returned
        } catch (err) {
            console.error("Error updating incident post:", err);
            throw err; // Rethrow the error to the caller
        }
    }

    static async deleteIncidentPost(id) {
        try {
            // Ensure the ID is valid
            if (!id) {
                throw new Error("Incident post ID is required for deletion.");
            }
    
            const db = await getDatabaseConnection();
    
            // Execute the DELETE query
            const [result] = await db.execute(
                `DELETE FROM incidentPost WHERE id = ?`,
                [id]
            );
    
            // Log and return the result
            if (result.affectedRows > 0) {
                console.log(`Successfully deleted incident post with ID: ${id}`);
                return {
                    success: true,
                    message: `Incident post with ID ${id} has been deleted.`,
                    affectedRows: result.affectedRows
                };
            } else {
                console.warn(`No incident post found with ID: ${id}`);
                return {
                    success: false,
                    message: `No incident post found with ID ${id}.`,
                    affectedRows: 0
                };
            }
        } catch (err) {
            // Improved error handling
            console.error("Error deleting incident post:", err);
            return {
                success: false,
                message: err.message
            };
        }
    }

    static async getIncidentPosts() {
        try {
            const db = await getDatabaseConnection();
    
            // Fetch incident posts with associated images using JOIN
            const [results] = await db.query(`
                SELECT 
                    ip.id AS incidentId,
                    ip.title AS incidentTitle,
                    ip.details AS incidentDetails,
                    u.user_name AS username,
                    ip.sender_status AS userstatus,
                    ip.timestamp AS incidentTimestamp,
                    ip.resource_details AS resourceDetails,
                    img.image_name AS imageName,
                    img.type AS imageType
                FROM incidentPost ip
                LEFT JOIN image img ON ip.id = img.incidentPost_id
                JOIN user u ON ip.sender_id = u.id
                WHERE u.account_status = 'active'
                ORDER BY ip.timestamp DESC;
            `);
    
            // Process and format the results
            const postMap = new Map();
    
            results.forEach(row => {
                // If the post is already in the map, update it
                if (postMap.has(row.incidentId)) {
                    const post = postMap.get(row.incidentId);
    
                    if (row.imageType === 'incident') {
                        post.incidentImages.push(row.imageName);
                    } else if (row.imageType === 'resource') {
                        post.resourceImages.push(row.imageName);
                    }
                } else {
                    // If the post is not in the map, create a new entry
                    postMap.set(row.incidentId, {
                        id: row.incidentId,
                        title: row.incidentTitle,
                        details: row.incidentDetails,
                        resourceDetails: row.resourceDetails,
                        incidentImages: row.imageType === 'incident' ? [row.imageName] : [],
                        resourceImages: row.imageType === 'resource' ? [row.imageName] : [],
                        username: row.username,
                        userstatus: row.userstatus,
                        timestamp: row.incidentTimestamp,
                    });
                }
            });
    
            // Convert the map values to an array
            return Array.from(postMap.values());
        } catch (err) {
            console.error("Error fetching incident posts with images:", err);
            throw new Error("Failed to retrieve incident posts");
        }
    }
    

    static async getIncidentPostById(id) {
        try {
            const db = await getDatabaseConnection();
    
            // Fetch the incident post by ID
            const [postRows] = await db.query(
                `
                    SELECT ip.id,
                        ip.title,
                        ip.details,
                        u.user_name AS sender_name,
                        u.status AS sender_status,
                        ip.timestamp,
                        ip.resource_details
                    FROM incidentPost ip
                    JOIN user u ON ip.sender_id = u.id
                    WHERE ip.id = ?
                    AND u.account_status = 'active';
                `,[id]
            );
    
            // Check if the post exists
            if (postRows.length === 0) {
                return null; // Post not found
            }
    
            const post = postRows[0];
            return post;
        } catch (err) {
            console.error("Error fetching incident post by ID:", err);
            throw new Error("Failed to retrieve the incident post");
        }
    }

}

export default IncidentPostModel;
