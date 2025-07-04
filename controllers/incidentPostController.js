import IncidentPostModel from "../models/incidentPostModel.js";
import IncidentPostMessageModel from "../models/incidentPostMessageModel.js";
import io from "../configurations/socketIo.js";


class IncidentPostController {
  /**
   * Create a new incident post with related images.
   */
  static async newIncidentPost(req, res) {
    try {
      const {
        incidentTitle,
        incidentDetails,
        resourceDetails,
        incidentImages,
        resourceImages,
        username,
        userstatus,
      } = req.body;

      console.log("Request body:", req.body);

      // Validate required fields
      if (!incidentTitle || !incidentDetails || !incidentImages) {
        return res.status(400).json({ message: "Missing or invalid input data" });
      }

      // Create the incident post
      const incidentPost = await IncidentPostModel.createIncidentPost(
        incidentTitle || null,
        incidentDetails || null,
        resourceDetails || null, 
        username || null,
        userstatus || null,
      );

      console.log("Incident post created:", incidentPost);

      // Insert related images
      await IncidentPostController.insertMultipleImages(incidentPost.username, incidentPost.id, incidentImages, "incident");
      await IncidentPostController.insertMultipleImages(incidentPost.username, incidentPost.id, resourceImages, "resource");

      // Emit event to clients
      const emittedData = {
        id: incidentPost.id,
        title: incidentTitle,
        details: incidentDetails,
        resourceDetails: resourceDetails,
        incidentImages: incidentImages,
        resourceImages: resourceImages,
        username: incidentPost.username,
        userstatus: incidentPost.userstatus,
        timestamp: incidentPost.timestamp
      };

      io.emit("newIncident", emittedData);

      // Respond to client
      return res.status(201).json({
        message: "Incident created successfully",
        data: emittedData,
      });
    } catch (err) {
      console.error("Error creating incident post:", err);
      return res.status(500).json({ message: "An error occurred while creating the incident post" });
    }
  }

  /**
   * Update an existing incident post.
   */
  static async updateIncidentPost(req, res) {
    try {
      const { id } = req.params; // Extract the post ID from the URL
      const {
        incidentTitle,
        incidentDetails,
        resourceDetails,
        incidentImages,
        resourceImages,
        username,
        userstatus,
      } = req.body;
  
      console.log("Request body:", req.body);
  
      // Validate the ID and required fields
      if (!id) {
        return res.status(400).json({ message: "Missing post ID in the URL" });
      }

      // Find the existing incident post
      const existingPost = await IncidentPostModel.getIncidentPostById(id);
      if (!existingPost) {
        return res.status(404).json({ message: "Incident post not found" });
      }
  
      if (!incidentTitle && !incidentDetails && !incidentImages) {
        return res.status(400).json({ message: "No valid data to update" });
      }

  
      // Update the post with the new data
      const updatedPost = await IncidentPostModel.updateIncidentPost(
        id,
        incidentTitle || existingPost.title,
        incidentDetails || existingPost.details,
        resourceDetails || existingPost.resource_details,
        userstatus || existingPost.sender_status
      );

      //Delte all images related to the post
      await IncidentPostModel.deleteImages(updatedPost.id);
  
      console.log("Incident post updated:", updatedPost);
  
      // Update related images
      if (incidentImages) {
        await IncidentPostController.insertMultipleImages(
          updatedPost.sender_name,
          updatedPost.id,
          incidentImages,
          "incident"
        );
      }
  
      if (resourceImages) {
        await IncidentPostController.insertMultipleImages(
          updatedPost.sender_name,
          updatedPost.id,
          resourceImages,
          "resource"
        );
      }
  
      // Emit event to clients with the updated data
      const emittedData = {
        id: updatedPost.id,
        title: incidentTitle || updatedPost.title,
        details: incidentDetails || updatedPost.details,
        resourceDetails: resourceDetails || updatedPost.resource_details,
        incidentImages: incidentImages || [],
        resourceImages: resourceImages || [],
        username: updatedPost.sender_name,
        userstatus: updatedPost.sender_status,
        timestamp: updatedPost.timestamp
      };
  
      io.emit("newIncident", emittedData);
  
      // Respond to the client
      return res.status(200).json({
        message: "Incident updated successfully",
        data: emittedData,
      });
    } catch (err) {
      console.error("Error updating incident post:", err);
      return res.status(500).json({ message: "An error occurred while updating the incident post" });
    }
  }
  

  /**
   * Delete an incident post and its associated images.
   */
  static async deleteIncidentPost(req, res) {
    try {
      const { id } = req.params; // Extract the post ID from the URL
  
      if (!id) {
        return res.status(400).json({ message: "Missing post ID" });
      }
  
      // Check if the post exists before attempting deletion
      const existingPost = await IncidentPostModel.getIncidentPostById(id);
      if (!existingPost) {
        return res.status(404).json({ message: "Incident post not found" });
      }
  
      // Delete associated images and the post
      await IncidentPostModel.deleteImages(id);
      await IncidentPostMessageModel.deleteIncidentPostMessagesByincidentID(id);
      await IncidentPostModel.deleteIncidentPost(id);
  
      // Emit delete event to clients
      io.emit("deleteIncident", { id });
  
      // Respond to client with success
      return res.status(200).json({
        message: "Incident post deleted successfully",
        id,
      });
    } catch (err) {
      console.error("Error deleting incident post:", err);
      return res.status(500).json({ message: "An error occurred while deleting the incident post" });
    }
  }
  

  /**
   * Helper function to insert images related to a post.
   */
  static async insertMultipleImages(user_name, incidentPost_id, images, type) {
    // Normalize `images` to always be an array
    if (!images) return;
    if (!Array.isArray(images)) {
      images = [images]; // Wrap single image in an array
    }
  
    for (const image_name of images) {
      await IncidentPostModel.insertImage(user_name, incidentPost_id, image_name, type);
    }
  }
}

export default IncidentPostController;
