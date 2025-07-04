import fs from 'fs';

// Load the banned usernames from the JSON file
const bannedUsernamesPath = "public/json/bannedUsernames.json";
const bannedUsernames = new Set(
    JSON.parse(fs.readFileSync(bannedUsernamesPath, "utf8"))
);

class ValidationHelper {
    // Static async method to validate username
    static async validateUsername(username) {
        if (!username || username.length < 3) {
            return { valid: false, message: "Username must be at least 3 characters long." };
        }

        if (bannedUsernames.has(username.toLowerCase())) {
            return { valid: false, message: "This username is not allowed." };
        }

        return { valid: true };
    }

    // Static async method to validate password
    static async validatePassword(password) {
        if (!password || password.length < 4) {
            return { valid: false, message: "Password must be at least 4 characters long." };
        }
        return { valid: true };
    }
}

export default ValidationHelper;
