import MapResourceModel from "../models/mapResourceModel.js";

class MapResourceController {
    // Method to fetch all resources
    static async getResources(req, res) {
        try {
            const resources = await MapResourceModel.getAllResources();
            res.status(200).json({
                message: "Resources fetched successfully",
                data: resources,
            });
        } catch (error) {
            console.error("Error fetching resources:", error.message);
            res.status(500).json({
                message: "Error fetching resources",
                error: error.message,
            });
        }
    }

    // Method to add a new resource
    static async addResource(req, res) {
        const { title, description, latitude, longitude } = req.body;

        try {
            if (!title || !description || latitude === undefined || longitude === undefined) {
                throw new Error("All fields (title, description, latitude, longitude) are required.");
            }

            const result = await MapResourceModel.addResource(title, description, latitude, longitude);

            res.status(201).json({
                message: "Resource added successfully",
                data: result,
            });
        } catch (error) {
            console.error("Error adding resource:", error.message);
            res.status(500).json({
                message: "Error adding resource",
                error: error.message,
            });
        }
    }

    // Method to update resource location
    static async updateResourceLocation(req, res) {
        const { id } = req.params;
        const { latitude, longitude } = req.body;

        try {
            if (!latitude || !longitude) {
                throw new Error("Latitude and Longitude are required.");
            }

            const result = await MapResourceModel.updateLocation(id, latitude, longitude);

            if (result.affectedRows === 0) {
                throw new Error("Resource not found.");
            }

            res.status(200).json({
                message: "Resource location updated successfully",
                data: result,
            });
        } catch (error) {
            console.error("Error updating resource location:", error.message);
            res.status(500).json({
                message: "Error updating resource location",
                error: error.message,
            });
        }
    }
}

export default MapResourceController;
