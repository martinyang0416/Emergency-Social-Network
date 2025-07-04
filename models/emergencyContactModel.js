import { getDatabaseConnection } from "../configurations/dbConfig.js";

class EmergencyContactModel {
    static async getAddedUsers(ownerusername) {
        try {
            const connection = await getDatabaseConnection();

            // Get added contacts
            const query =
                `
                SELECT ec.contact_user_id,
                    u_contact.user_name AS contact_username
                FROM emergency_contact ec
                JOIN user u_owner ON ec.owner_id = u_owner.id
                JOIN user u_contact ON ec.contact_user_id = u_contact.id
                WHERE u_owner.user_name = ?
                AND u_owner.account_status = 'active'
                AND u_contact.account_status = 'active';
                `;
            const [rows] = await connection.execute(query, [ownerusername]);
            const addedContacts = rows.map((row) => ({
                id: row.contact_user_id,
                username: row.contact_username,
            }));

            console.log("Added Emergency Contacts:", addedContacts);
            return addedContacts;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async getUnaddedUsers(ownerusername) {
        try {
            const connection = await getDatabaseConnection();

            // Get all user ids
            const queryAllUsers =
                `
                    SELECT id,
                        user_name
                    FROM user
                    WHERE user_name != ?
                    AND account_status = 'active';
                `;
            const [results] = await connection.execute(queryAllUsers, [
                ownerusername,
            ]);

            // Get added contacts of owner
            const addedContacts = await EmergencyContactModel.getAddedUsers(
                ownerusername
            );

            // Get pending contacts of owner
            const incomingPendingContacts =
                await EmergencyContactModel.getIncomingPendingUsers(
                    ownerusername
                );
            const outgoingPendingContacts =
                await EmergencyContactModel.getOutgoingPendingUsers(
                    ownerusername
                );

            // Process the results to extract IDs and usernames
            const allUsers = results.map((row) => ({
                id: row.id,
                username: row.user_name,
            }));

            console.log("incomingPendingContacts", incomingPendingContacts);
            console.log("outgoingPendingContacts", outgoingPendingContacts);

            // Find users in `allUsers` not present in `addedContacts`
            const unaddedUsers = allUsers.filter(
                (user) =>
                    !addedContacts.some((contact) => contact.id === user.id) &&
                    !incomingPendingContacts.some(
                        (contact) => contact.id === user.id
                    ) &&
                    !outgoingPendingContacts.some(
                        (contact) => contact.id === user.id
                    )
            );

            // console.log("All Users (excluding owner):", allUsers);
            // console.log("Added Emergency Contacts:", addedContacts);
            console.log("Unadded Users:", unaddedUsers);

            return unaddedUsers;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async getIncomingPendingUsers(contactusername) {
        try {
            const connection = await getDatabaseConnection();

            // Get pending contacts
            const query =
                `
                SELECT cpr.owner_id,
                    u_owner.user_name AS owner_username
                FROM contact_pending_requests cpr
                JOIN user u_contact ON cpr.contact_user_id = u_contact.id
                JOIN user u_owner ON cpr.owner_id = u_owner.id
                WHERE u_contact.user_name = ?
                AND u_contact.account_status = 'active'
                AND u_owner.account_status = 'active';
                `;
            const [rows] = await connection.execute(query, [contactusername]);
            const pendingContacts = rows.map((row) => ({
                id: row.owner_id,
                username: row.owner_username,
            }));

            console.log(
                "Incoming Pending Emergency Contacts:",
                pendingContacts
            );
            return pendingContacts;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async getOutgoingPendingUsers(ownerusername) {
        try {
            const connection = await getDatabaseConnection();

            // Get pending contacts
            const query =
                `
                    SELECT cpr.contact_user_id,
                        u_contact.user_name AS contact_username
                    FROM contact_pending_requests cpr
                    JOIN user u_owner ON cpr.owner_id = u_owner.id
                    JOIN user u_contact ON cpr.contact_user_id = u_contact.id
                    WHERE u_owner.user_name = ?
                    AND u_owner.account_status = 'active'
                    AND u_contact.account_status = 'active';
                `;
            const [rows] = await connection.execute(query, [ownerusername]);
            const pendingContacts = rows.map((row) => ({
                id: row.contact_user_id,
                username: row.contact_username,
            }));

            console.log(
                "Outgoing Pending Emergency Contacts:",
                pendingContacts
            );
            return pendingContacts;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async insertPendingRequest(
        ownerusername,
        contactusername,
        timestamp
    ) {
        try {
            const connection = await getDatabaseConnection();

            // Get owner id
            const queryOwnerId = `
            SELECT id
            FROM user
            WHERE user_name = ?
            AND account_status = 'active';
            `;
            const [ownerRows] = await connection.execute(queryOwnerId, [
                ownerusername,
            ]);
            if (ownerRows.length === 0) {
                throw new Error(
                    `User with username ${ownerusername} not found`
                );
            }
            const ownerId = ownerRows[0].id;
            console.log("Owner ID:", ownerId);

            // Get contact id
            const queryContactId =
                `
                SELECT id
                FROM user
                WHERE user_name = ?
                AND account_status = 'active';

                `;
            const [contactRows] = await connection.execute(queryContactId, [
                contactusername,
            ]);
            if (contactRows.length === 0) {
                throw new Error(
                    `User with username ${contactusername} not found`
                );
            }
            const contactId = contactRows[0].id;
            console.log("Contact ID:", contactId);

            const query = `INSERT INTO contact_pending_requests (owner_id, owner_username, contact_user_id, contact_username) VALUES (?, ?, ?, ?)`;
            const [results] = await connection.execute(query, [
                ownerId,
                ownerusername,
                contactId,
                contactusername,
            ]);

            return results;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async removePendingRequest(ownerusername, contactusername) {
        try {
            const connection = await getDatabaseConnection();

            const queryRemove = `DELETE FROM contact_pending_requests WHERE owner_username = ? AND contact_username = ?`;
            const [results] = await connection.execute(queryRemove, [
                ownerusername,
                contactusername,
            ]);
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async insertContactPairs(contactusername, ownerusername) {
        try {
            const connection = await getDatabaseConnection();

            // Get owner id
            const queryOwnerId = `
                SELECT id
                FROM user
                WHERE user_name = ?
                AND account_status = 'active';
            `;
            const [ownerRows] = await connection.execute(queryOwnerId, [
                ownerusername,
            ]);
            if (ownerRows.length === 0) {
                throw new Error(
                    `User with username ${ownerusername} not found`
                );
            }
            const ownerId = ownerRows[0].id;
            console.log("Owner ID:", ownerId);

            // Get contact id
            const queryContactId =
                `
                SELECT id
                FROM user
                WHERE user_name = ?
                AND account_status = 'active';
                `;
            const [contactRows] = await connection.execute(queryContactId, [
                contactusername,
            ]);
            if (contactRows.length === 0) {
                throw new Error(
                    `User with username ${contactusername} not found`
                );
            }
            const contactId = contactRows[0].id;
            console.log("Contact ID:", contactId);

            const query = `INSERT INTO emergency_contact (owner_id, owner_username, contact_user_id, contact_username) VALUES (?, ?, ?, ?)`;
            const [results] = await connection.execute(query, [
                ownerId,
                ownerusername,
                contactId,
                contactusername,
            ]);

            const queryInsertReverse = `INSERT INTO emergency_contact (owner_id, owner_username, contact_user_id, contact_username) VALUES (?, ?, ?, ?)`;
            const [resultsReverse] = await connection.execute(
                queryInsertReverse,
                [contactId, contactusername, ownerId, ownerusername]
            );

            // return results;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async getAvailableResources(userName) {
        try {
            const connection = await getDatabaseConnection();

            const query = `
            SELECT rm.water,
                rm.bread,
                rm.medicine
            FROM resource_management rm
            JOIN user u ON rm.user_id = u.id
            WHERE u.user_name = ?
            AND u.account_status = 'active';
            `;
            const [results] = await connection.execute(query, [userName]);

            const resources = results.map((row) => ({
                water: row.water,
                bread: row.bread,
                medicine: row.medicine,
            }));

            return resources;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }

    static async updateResource(
        ownerusername,
        contactusername,
        resourceType,
        count
    ) {
        try {
            const connection = await getDatabaseConnection();

            // Update the resource count
            const queryUpdate = `UPDATE resource_management SET ${resourceType} = ${resourceType} - ? WHERE username = ?`;
            const [results] = await connection.execute(queryUpdate, [
                count,
                ownerusername,
            ]);

            const queryUpdateContact = `UPDATE resource_management SET ${resourceType} = ${resourceType} + ? WHERE username = ?`;
            const [resultsContact] = await connection.execute(
                queryUpdateContact,
                [count, contactusername]
            );

            // return results;
        } catch (err) {
            console.error("Error executing query", err.stack);
            throw err;
        }
    }
}

export default EmergencyContactModel;
