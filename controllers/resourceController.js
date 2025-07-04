import io from '../configurations/socketIo.js';
import ResourceModel from "../models/resourceModel.js";
import UserModel from "../models/userModel.js";
import ResourceRequestModel from "../models/resourceRequestModel.js";


class ResourceController {
    static async getUserResources(req, res) {
        try {
            const { username } = req.params;

            if (!username) {
                return res.status(404).json({ error: "Username not provided" });
            }

            const normalizedUsername = username.toLowerCase();

            // Fetch the user's resources from the database
            const resources = await ResourceModel.getResourceByUsername(normalizedUsername);

            if (!resources) {
                return res.status(404).json({ error: "User resources not found" });
            }
    
            // Send the resources as a response
            return res.status(200).json(resources);
        } catch (err) {
            console.error("Error fetching user resources:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async updateUserResource(req, res) {
        try {
            const { username } = req.params;
            const { resourceType, quantity } = req.body;

            if (!username || !resourceType || quantity === undefined) {
                return res.status(400).json({ error: "Username, resourceType, and quantity are required" });
            }

            const normalizedUsername = username.toLowerCase();

            if (UserModel.getAccountStatusByUsername(normalizedUsername) == "inactive") {
                return res.status(404).json({ error: "User account is inactive" });
            }

            // Update the specified resource for the user
            const result = await ResourceModel.updateResource(normalizedUsername, resourceType, quantity);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "User resource profile not found" });
            }

            // Respond with a success message
            return res.status(200).json({ message: `${resourceType} updated successfully to ${quantity}` });
        } catch (err) {
            console.error("Error updating user resource:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async getAllUsersResources(req, res) {
        try {
            const allResources = await ResourceModel.getAllResources();

            // Retrieve citizen status for each user
            const allResourcesWithStatus = await Promise.all(
                allResources.map(async (user) => {
                    const citizenStatus = await UserModel.getStatusByUsername(user.username);
                    return {
                        ...user,
                        citizenStatus,
                    };
                })
        );
            res.status(200).json(allResourcesWithStatus);
        } catch (err) {
            console.error("Error fetching all users' resources:", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    // Controller function to handle creating a new resource request
    static async createResourceRequest(req, res) {
        try {
            const { requesterUsername, requestedFromUsername, resourceType, quantity } = req.body;
    
            if (!requesterUsername || !requestedFromUsername || !resourceType || quantity === undefined) {
                return res.status(400).json({ error: "All fields are required to create a resource request." });
            }
    
            const requestedUserResources = await ResourceModel.getResourceByUsername(requestedFromUsername.toLowerCase());
            if (!requestedUserResources) {
                return res.status(404).json({ error: "Requested user not found or has no resources available." });
            }
    
            if (requestedUserResources[resourceType] < quantity) {
                return res.status(400).json({ error: "Requested quantity exceeds available amount." });
            }
    
            const newRequest = new ResourceRequestModel(
                requesterUsername.toLowerCase(),
                requestedFromUsername.toLowerCase(),
                resourceType,
                quantity
            );
    
            const createdRequest = await newRequest.createRequest();
    
            return res.status(201).json({
                message: "Resource request created successfully",
                request: createdRequest
            });
        } catch (err) {
            console.error("Error creating resource request:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    

    static async getAllSentRequests(req, res) {
        try {
            const { username } = req.params;

            if (!username) {
                return res.status(400).json({ error: "Username is required" });
            }

            const normalizedUsername = username.toLowerCase();

            // Fetch all requests sent by the specified user
            const sentRequests = await ResourceRequestModel.getRequestsByRequester(normalizedUsername);

            if (!sentRequests || sentRequests.length === 0) {
                return res.status(404).json({ message: "No sent requests found for this user" });
            }

            // Respond with the list of sent requests
            return res.status(200).json(sentRequests);
        } catch (err) {
            console.error("Error retrieving sent requests:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async withdrawRequest(req, res) {
        try {
            const { requestId, requesterUsername, requestedFromUsername } = req.body;

            console.log(`Withdraw request received for requestId: ${requestId}`);

    
            // Call the delete method on the ResourceRequestModel
            const result = await ResourceRequestModel.deleteRequestById(requestId, requesterUsername, requestedFromUsername);
    
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Request not found" });
            }
    
            // Respond with success message
            return res.status(200).json({ message: "Request withdrawn successfully" });
        } catch (err) {
            console.error("Error withdrawing request:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async getAllReceivedRequests(req, res) {
        try {
            const { username } = req.params;
    
            if (!username) {
                return res.status(400).json({ error: "Username is required" });
            }
    
            const normalizedUsername = username.toLowerCase();
    
            // Fetch all requests received by the specified user
            const receivedRequests = await ResourceRequestModel.getRequestsByRequestedFrom(normalizedUsername);
    
            if (!receivedRequests || receivedRequests.length === 0) {
                return res.status(404).json({ message: "No received requests found for this user" });
            }
    
            // Respond with the list of received requests
            return res.status(200).json(receivedRequests);
        } catch (err) {
            console.error("Error retrieving received requests:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async approveRequest(req, res) {
        try {
            const { requestId, requesterUsername, requestedFromUsername } = req.body;

            // Retrieve the request
            const request = await ResourceRequestModel.getRequestById(requestId);
            if (!request) {
                return res.status(404).json({ error: "Request not found" });
            }

            let resourceType = "";
            let quantity = 0;
    
            if (request.water > 0) {
                resourceType = "water";
                quantity = request.water;
            } else if (request.bread > 0) {
                resourceType = "bread";
                quantity = request.bread;
            } else if (request.medicine > 0) {
                resourceType = "medicine";
                quantity = request.medicine;
            }
    
            const requesterResources = await ResourceModel.getResourceByUsername(request.requester_username);
            const requestedUserResources = await ResourceModel.getResourceByUsername(request.requested_from_username);
            
            const newRequestedUserQuantity = requestedUserResources[resourceType] - quantity;
            const newRequesterQuantity = requesterResources[resourceType] + quantity;

            if (newRequestedUserQuantity < 0) {
                console.warn(`Quantity for ${resourceType} would be negative. Deleting request.`);
    
                // Notify the requester that the request cannot be approved
                const senderSocketId = io.getSocketIdByUsername(requesterUsername);
                if (senderSocketId) {
                    io.to(senderSocketId).emit("request denied", {
                        reason: `Approval failed. Not enough ${resourceType} available.`,
                        resourceType,
                        quantity,
                    });
                }
    
                // Delete the request
                await ResourceRequestModel.deleteRequestById(requestId, requesterUsername, requestedFromUsername);
    
                return res.status(400).json({
                    message: "Request cannot be approved due to insufficient resources.",
                });
            }
            
            await ResourceModel.updateResource(request.requested_from_username, resourceType, newRequestedUserQuantity);
            await ResourceModel.updateResource(request.requester_username, resourceType, newRequesterQuantity);

            const deleteResult = await ResourceRequestModel.deleteRequestById(requestId, requesterUsername, requestedFromUsername);

            const senderSocketId = io.getSocketIdByUsername(requesterUsername);
            const recipientSocketId = io.getSocketIdByUsername(requestedFromUsername);

            if (senderSocketId) {
                io.to(senderSocketId).emit("request approved", {
                    resourceType,
                    quantity,
                    approvedBy: requestedFromUsername,
                });
            }


            res.status(200).json({ message: "Request approved and resources updated" });
        } catch (err) {
            console.error("Error approving request:", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async rejectRequest(req, res) {
        try {
            const { requestId, requesterUsername, requestedFromUsername } = req.body;

            // Check if the request exists
            const request = await ResourceRequestModel.getRequestById(requestId);
            if (!request) {
                return res.status(404).json({ error: "Request not found" });
            }

            const deleteResult = await ResourceRequestModel.deleteRequestById(requestId, requesterUsername, requestedFromUsername);
            
            const senderSocketId = io.getSocketIdByUsername(requesterUsername);
            const recipientSocketId = io.getSocketIdByUsername(requestedFromUsername);

            if (senderSocketId) {
                io.to(senderSocketId).emit("request rejected", {
                    rejectedBy: requestedFromUsername,
                });
            }

            res.status(200).json({ message: "Request rejected" });
        } catch (err) {
            console.error("Error rejecting request:", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
    
    
}

export default ResourceController;