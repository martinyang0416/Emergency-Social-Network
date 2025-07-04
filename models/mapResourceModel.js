import { getDatabaseConnection } from '../configurations/dbConfig.js';

class MapResourceModel {
    // Fetch all resources
    static async getAllResources() {
        try {
            const connection = await getDatabaseConnection();
            const query = 'SELECT id, title, description, latitude, longitude FROM map_resource';
            const [rows] = await connection.execute(query);
            return rows;
        } catch (error) {
            console.error('Error fetching resources:', error);
            throw error;
        }
    }

    // Add a new resource
    static async addResource(title, description, latitude, longitude) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                INSERT INTO map_resource (title, description, latitude, longitude) 
                VALUES (?, ?, ?, ?)
            `;
            const [result] = await connection.execute(query, [title, description, latitude, longitude]);
            return result;
        } catch (error) {
            console.error('Error adding resource:', error);
            throw error;
        }
    }

    // Update resource location
    static async updateLocation(id, latitude, longitude) {
        try {
            const connection = await getDatabaseConnection();
            const query = `
                UPDATE map_resource 
                SET latitude = ?, longitude = ? 
                WHERE id = ?
            `;
            const [result] = await connection.execute(query, [latitude, longitude, id]);
            return result;
        } catch (error) {
            console.error('Error updating resource location:', error);
            throw error;
        }
    }
}

export default MapResourceModel;
