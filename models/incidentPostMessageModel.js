import { getDatabaseConnection } from '../configurations/dbConfig.js';

class IncidentPostMessageModel {
    static async createIncidentPostMessageByincidentID(text, sender_name, sender_status, incidentPost_id) {
        try {
            const db = await getDatabaseConnection();
        
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
        
            // Insert the incident message
            const insertQuery = `
                INSERT INTO incidentMessage (sender_id, text, sender_name, sender_status, incidentPost_id)
                VALUES (?, ?, ?, ?, ?);
            `;
        
            const [result] = await db.execute(insertQuery, [
                senderId,
                text,
                sender_name,
                sender_status,
                incidentPost_id,
            ]);
        
            if (!result || result.affectedRows === 0) {
                throw new Error("Failed to insert the incident message");
            }
        
            const insertedId = result.insertId;
        
            // Retrieve the inserted message
            const retrieveQuery = `
                SELECT im.*
                FROM incidentMessage im
                JOIN user u ON im.sender_id = u.id
                WHERE im.id = ?
                AND u.account_status = 'active';
            `;
        
            const [rows] = await db.execute(retrieveQuery, [insertedId]);
        
            if (!rows || rows.length === 0) {
                throw new Error("Failed to retrieve the inserted message");
            }
        
            return rows[0];
        } catch (err) {
            console.error("Error creating incident message:", err.message);
            throw new Error("An error occurred while creating the incident message");
        }        
    }

    static async getIncidentPostMessagesByincidentID(incidentPost_id) {
        try {
            const db = await getDatabaseConnection();
            const [rows] = await db.execute(
                `
                    SELECT im.id,
                        im.text,
                        im.sent_time,
                        u.user_name AS sender_name,
                        u.status AS sender_status,
                        im.incidentPost_id
                    FROM incidentMessage im
                    JOIN user u ON im.sender_id = u.id
                    WHERE im.incidentPost_id = ?
                    AND u.account_status = 'active';
                 `,
                [incidentPost_id]
            );
    
            return rows;
        } catch (err) {
            if (err.message.includes('No messages found')) {
                throw err;
            }
            console.error("Error fetching incident post messages:", err);
            throw new Error("An error occurred while fetching incident messages");
        }
    }
    
    static async deleteIncidentPostMessagesByincidentID(incidentPost_id) {
        if (!incidentPost_id) {
            throw new Error("incidentPost_id is required to delete responses.");
        }

        try {
            const db = await getDatabaseConnection();
            const [result] = await db.execute(
                'DELETE FROM incidentMessage WHERE incidentPost_id = ?',
                [incidentPost_id]
            );
    
            if (result.length == 0) {
                throw new Error(`No messages found for incidentPost_id: ${incidentPost_id}`);
            }
    
            return {
                success: true,
                affectedRows: result.affectedRows,
            };
        } catch (err) {
            throw err; // Propagate the error instead of returning an error object
        }
    }    
}   

export default IncidentPostMessageModel;