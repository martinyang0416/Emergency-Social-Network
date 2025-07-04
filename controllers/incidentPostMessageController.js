import IncidentPostModel from "../models/incidentPostModel.js";
import IncidentPostMessageModel from "../models/incidentPostMessageModel.js";
import io from "../configurations/socketIo.js";
class IncidentPostMessageController {
  /**
   * Fetch all incident posts with their associated images.
   */
  static async getIncidentPosts(req, res) {
    try {
      const posts = await IncidentPostModel.getIncidentPosts();
      if (!posts || posts.length === 0) {
        return res.status(404).json({ message: "No incident posts found" });
      }
      return res.status(200).json({ message: "Incident posts retrieved successfully", data: posts });
    } catch (err) {
      console.error("Error fetching incident posts:", err);
      return res.status(500).json({ message: "An error occurred while fetching incident posts" });
    }
  }

  /**
   * Fetch a single incident post by its ID along with its associated images.
   */
  static async getIncidentPostByID(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "Missing post ID in request parameters" });
      }
      const post = await IncidentPostModel.getIncidentPostById(id);
      if (!post) {
        return res.status(404).json({ message: "Incident post not found" });
      }
      return res.status(200).json({ message: "Incident post retrieved successfully", data: post });
    } catch (err) {
      console.error("Error fetching incident post by ID:", err);
      return res.status(500).json({ message: "An error occurred while fetching the incident post" });
    }
  }

  /**
   * Fetch all responses for a single incident post by its ID.
   */
  static async getIncidentCommentByincidentID(req, res) {
    try {
        const { id } = req.params; // Extract incidentId from the request parameters
        console.log(id);

        // Fetch incident messages using the model method
        const responses = await IncidentPostMessageModel.getIncidentPostMessagesByincidentID(id);

        // Handle the case when no responses are found
        if (!responses || responses.length === 0) {
            return res.status(404).json({ message: "No incident responses found" });
        }

        // Map responses to return only `name`, `time`, and `text`
        const formattedResponses = responses.map((response) => ({
            name: response.sender_name,
            time: response.sent_time,
            text: response.text,
        }));

        // Return the formatted responses
        return res.status(200).json({
            message: "Incident responses retrieved successfully",
            data: formattedResponses,
        });
    } catch (err) {
        console.error("Error fetching incident responses:", err);
        return res.status(500).json({
            message: "An error occurred while fetching incident responses",
        });
    }
}

  /**
   * Create a new incident response for a specific incident post.
   */
    static async newIncidentCommentByincidentID(req, res) {
      try {
          const { id } = req.params; // Extract incidentId from the request parameters
          const { text, sender_name, sender_status } = req.body;

          // Validate required fields
          if (!id || !text || !sender_name || !sender_status) {
              return res.status(400).json({
                  message: "Missing required fields: incidentId, text, sender_name, or sender_status",
              });
          }

          // Create the new incident comment
          const newResponse = await IncidentPostMessageModel.createIncidentPostMessageByincidentID(
              text,
              sender_name,
              sender_status,
              id
          );

          io.emit("newComment", newResponse);

          // Return success response
          return res.status(201).json({
              message: "Incident response created successfully",
              data: newResponse,
          });
      } catch (err) {
          console.error("Error creating incident response:", err);

          // Return error response
          return res.status(500).json({
              message: "An error occurred while creating the incident response",
          });
      }
  }

}

export default IncidentPostMessageController;
