import MessageModel from "../models/messageModel.js";
import io from "../configurations/socketIo.js";
// import { setSpeedTestMode } from "../app.js";
import { connectToDatabase } from '../configurations/dbConfig.js';
import mysqlDatabase from "../configurations/mysqlDatabase.js";
// import { setDatabaseName } from "../configurations/dbConfig.js";
import { setDatabaseConnection } from "../configurations/dbConfig.js";
import UserModel from "../models/userModel.js";

class SpeedTestController {
    static async startSpeedTest(req, res) {
        try {
            // Set speedTestMode
            // setSpeedTestMode(true);

            const { adminusername } = req.body;
            const normalizedUsername = adminusername.toLowerCase();

            const user = await UserModel.getUserByUsername(normalizedUsername);
            if (!user) {
                return res.status(404).json({ message: `User '${adminusername}' not found.` });
            }

            if (user.privilege !== "admin") {
                return res.status(403).json({ message: "Only administrators can start a speed test." });
            }

            // await UserModel.markOnlineStatus("offline", normalizedUsername);            
            io.emit('speed test started', adminusername);

            console.log("Speed test started. Nomral operations are suspended.");

            // setDatabaseName("sb2-test");
            // connectToDatabase("sb2-test");
            const dbinstance = mysqlDatabase.getInstance();
            await dbinstance.createTestDatabaseFromMain("sb2", "testdb2");
            await setDatabaseConnection("testdb2");
            // const dbinstance = mysqlDatabase.getInstance();
            // dbinstance.useDatabase("sb2-test");
            
            // setDatabaseName("testdb1");
            // await dbinstance.useDatabase("testdb1");
            // mysqlDatabase.createDatabase("sb2-test1");

            res.status(200).json({ message: "Speed test in progress.." });

        } catch (err) {
            console.error("Error in startSpeedTest(): ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    static async endSpeedTest(req, res) {
        try {
            // Connect to default database
            // const dbinstance = mysqlDatabase.getInstance();
            const dbinstance = mysqlDatabase.getInstance();
            await dbinstance.dropTestDatabase("testdb2");
            // await dbinstance.useDatabase("sb2");
            // setDatabaseName("sb2");
            await setDatabaseConnection("sb2");

            // Resume normal operations 
            // setSpeedTestMode(false);
            console.log("Speed test ended. System is back to normal operations.");
            res.status(200).json({ message: "Speed test ended" });
        } catch (err) {
            console.error("Error in endSpeedTest(): ", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
}

export default SpeedTestController;