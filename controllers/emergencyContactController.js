import EmergencyContactModel from "../models/emergencyContactModel.js";
import io from "../configurations/socketIo.js";

class EmergencyContactController {
    static async getUnaddedUsers(req, res) {
        try {
            const { ownerusername } = req.params;

            const unaddedUsers = await EmergencyContactModel.getUnaddedUsers(
                ownerusername
            );
            res.status(200).json(unaddedUsers);
        } catch (err) {
            console.error("Error in getting unadded users: ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async getAddedUsers(req, res) {
        try {
            const { ownerusername } = req.params;

            const addedUsers = await EmergencyContactModel.getAddedUsers(
                ownerusername
            );
            res.status(200).json(addedUsers);
        } catch (err) {
            console.error("Error in getting added users: ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async getPendingUsers(req, res) {
        try {
            const { ownerusername } = req.params;

            const incomingPendingUsers =
                await EmergencyContactModel.getIncomingPendingUsers(
                    ownerusername
                );

            const outgoingPendingUsers =
                await EmergencyContactModel.getOutgoingPendingUsers(
                    ownerusername
                );
            res.status(200).json({
                incomingPendingUsers,
                outgoingPendingUsers,
            });
        } catch (err) {
            console.error("Error in getting pending users: ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async sendConnectRequest(req, res) {
        const { ownerusername, contactusername } = req.body;
        const timestamp = new Date();
        try {
            await EmergencyContactModel.insertPendingRequest(
                ownerusername,
                contactusername,
                timestamp
            );

            // Notify the contact user about the connect request
            const ownerSocketId = io.getSocketIdByUsername(ownerusername);
            const contactSocketId = io.getSocketIdByUsername(contactusername);

            if (ownerSocketId) {
                io.to(ownerSocketId).emit("outgoing connect request", {
                    contactusername,
                    timestamp,
                }); // Emit to sender's socket
            }
            if (contactSocketId) {
                io.to(contactSocketId).emit("incoming connect request", {
                    ownerusername,
                    timestamp,
                }); // Emit to recipient's socket

                // io.to(contactSocketId).emit("check unread messages");
            }

            // io.to(contactusername).emit("connectRequest", {
            //     ownerusername,
            //     timestamp,
            // });

            // Update the pending users list for both users
            // const incomingPendingUsers =
            //     await EmergencyContactModel.getIncomingPendingUsers(
            //         contactusername
            //     );
            // const outgoingPendingUsers =
            //     await EmergencyContactModel.getOutgoingPendingUsers(
            //         ownerusername
            //     );

            res.status(200).json({
                message: "Connect request sent successfully",
                // incomingPendingUsers,
                // outgoingPendingUsers,
            });
        } catch (err) {
            console.error("Error in sending connect request: ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async acceptConnectRequest(req, res) {
        const { contactusername, ownerusername } = req.body;
        try {
            // Add contact pairs to the emergency contacts table
            await EmergencyContactModel.insertContactPairs(
                contactusername,
                ownerusername
            );

            // Delete the connect request from the pending requests table
            await EmergencyContactModel.removePendingRequest(
                ownerusername,
                contactusername
            );

            // Notify the owner user about the accepted connect request
            const ownerSocketId = io.getSocketIdByUsername(ownerusername);
            const contactSocketId = io.getSocketIdByUsername(contactusername);

            if (ownerSocketId) {
                io.to(ownerSocketId).emit(
                    "connect request accepted by contact",
                    {
                        contactusername,
                    }
                ); // Emit to sender's socket
            }
            if (contactSocketId) {
                io.to(contactSocketId).emit("connect request accepted", {
                    ownerusername,
                }); // Emit to recipient's socket
            }

            // Update the pending users list for both users
            // const incomingPendingUsers =
            //     await EmergencyContactModel.getIncomingPendingUsers(
            //         contactusername
            //     );
            // const outgoingPendingUsers =
            //     await EmergencyContactModel.getOutgoingPendingUsers(
            //         ownerusername
            //     );

            res.status(200).json({
                message: "Connect request accepted successfully",
                // incomingPendingUsers,
                // outgoingPendingUsers,
            });
        } catch (err) {
            console.error("Error in accepting connect request: ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async declineConnectRequest(req, res) {
        const { contactusername, ownerusername } = req.body;
        try {
            // Delete the connect request from the pending requests table
            await EmergencyContactModel.removePendingRequest(
                ownerusername,
                contactusername
            );

            // Notify the owner user about the declined connect request
            // This is a placeholder for the actual notification logic
            // You might use WebSockets, Push Notifications, or another method to notify the user
            // For example, using WebSockets:
            const ownerSocketId = io.getSocketIdByUsername(ownerusername);
            const contactSocketId = io.getSocketIdByUsername(contactusername);

            if (ownerSocketId) {
                io.to(ownerSocketId).emit(
                    "connect request declined by contact",
                    {
                        contactusername,
                    }
                ); // Emit to sender's socket
            }
            if (contactSocketId) {
                io.to(contactSocketId).emit("connect request declined", {
                    ownerusername,
                }); // Emit to recipient's socket
            }

            // Update the pending users list for both users
            // const incomingPendingUsers =
            //     await EmergencyContactModel.getIncomingPendingUsers(
            //         contactusername
            //     );
            // const outgoingPendingUsers =
            //     await EmergencyContactModel.getOutgoingPendingUsers(
            //         ownerusername
            //     );

            res.status(200).json({
                message: "Connect request declined successfully",
                // incomingPendingUsers,
                // outgoingPendingUsers,
            });
        } catch (err) {
            console.error("Error in declining connect request: ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async getAvailableResources(req, res) {
        try {
            const { userName } = req.params;

            const resources = await EmergencyContactModel.getAvailableResources(
                userName
            );
            res.status(200).json(resources);
        } catch (err) {
            console.error("Error in getting resources: ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async shareResource(req, res) {
        const { contactusername, resourceType } = req.params;
        const { ownerusername, count } = req.body;
        try {
            await EmergencyContactModel.updateResource(
                ownerusername,
                contactusername,
                resourceType,
                count
            );

            const ownerSocketId = io.getSocketIdByUsername(ownerusername);
            const contactSocketId = io.getSocketIdByUsername(contactusername);

            if (ownerSocketId) {
                io.to(ownerSocketId).emit("resource updated", {
                    contactusername,
                }); // Emit to sender's socket
            }
            if (contactSocketId) {
                io.to(contactSocketId).emit("resource updated", {
                    ownerusername,
                }); // Emit to recipient's socket
            }
            res.status(200).json({ message: "Resource shared successfully" });
        } catch (err) {
            console.error("Error in sharing resource: ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
}

export default EmergencyContactController;
