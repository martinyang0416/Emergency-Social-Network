import jwt from "jsonwebtoken";

import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify the tokem

export default function authMiddleware(req, res, next) {
    let token;

    // Try to extract the token from the Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        token = authHeader.split(' ')[1];
    }

    // If token is not found in the header, try to extract it from the request body
    if (!token && req.body) {
        token = req.body.token;
    }

    // If token is still not found, return an error
    if (!token) {
        console.error("Token is missing in auth middleware");
        return res
            .status(401)
            .render("error", { message: "Access denied, token missing!" });
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Token is invalid or expired:", err);
            return res
                .status(403)
                .render("error", { message: "Invalid or expired token!" });
        }

        // Attach the user object to the request
        req.user = user;
        console.log("Token verified successfully, proceeding to next.");
        next();
    });
}
