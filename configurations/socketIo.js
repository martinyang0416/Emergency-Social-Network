import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET;
const userConnections = {};
const userSocketMap = {};  // Map to store usernames and their associated socketIDs

const io = new Server();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication error: Token is missing!"));
    }

    // Verify the JWT token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return next(new Error("Authentication error: Invalid or expired token!"));
        }

        socket.username = user.username;
        next();
    });
});

io.on("connection", async (socket) => {
    const username = socket.username;
    console.log(`${username} connected + 1`);

    userSocketMap[username] = socket.id;

    if (!userConnections[username]) {
        userConnections[username] = 1;
        await UserModel.markOnlineStatus("online", username, io);
    } else {
        userConnections[username]++;
    }

    console.log(`User ${username} connected. Active connections: ${userConnections[username]}`);

    socket.on("disconnect", async () => {
        userConnections[username]--;
        console.log(`User ${username} disconnected. Remaining connections: ${userConnections[username]}`);

        if (userConnections[username] === 0) {
            setTimeout(async () => {
                if (userConnections[username] === 0) {
                    await UserModel.markOnlineStatus("offline", username, io);
                    console.log(`User ${username} is now offline.`);
                }
            }, 500);
        }

        delete userSocketMap[username];
    });
});

io.handleNameProcess = async (data) => {
    console.log("handleNameProcess");
    const { currentUserName, username } = data;

    try {
        // Update the userSocketMap
        const socketID = userSocketMap[currentUserName];
        console.log(userSocketMap);
        if (socketID) {
            delete userSocketMap[currentUserName]; // Remove old username from the map
            // userSocketMap[username] = socketID; // Add new username with the same socket ID

            console.log(`Username successfully updated from ${currentUserName} to ${username}`);
        }
        io.emit("name changed", { username, currentUserName });
        console.log(userSocketMap);
    } catch (error) {
        console.error(`Error updating username: ${error.message}`);
    }
};

io.handleStatusProcess = async (data) => {
    const { accountStatus, currentUserName } = data;

    try {
        io.emit("status changed", { accountStatus });
        console.log(`Status successfully updated from ${currentUserName} to ${accountStatus}`);
    } catch (error) {
        console.error(`Error updating status: ${error.message}`);
    }
}


io.getSocketIdByUsername = (username) => {
    return userSocketMap[username];  
};

export default io;