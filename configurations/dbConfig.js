import mysqlDatabase from "../configurations/mysqlDatabase.js";

// const args = process.argv.slice(2);
// const databaseName = args[0] || 'sb2';  // Default to 'sb2' if no argument is provided

let currentConnection = null; // Global variable to store the current DB connection
let currentDatabase = null; // Global variable to store the current DB name

// export { databaseName };

/**
 * Set the database connection for a given database.
 * This allows switching between test and main databases.
 * @param {string} databaseName - The name of the database to connect to.
 * @return {Promise<void>}
 */
export async function setDatabaseConnection(databaseName) {
    try {
        // Get the singleton instance of the mysqlDatabase
        const mysql = mysqlDatabase.getInstance();

        // If there's an existing connection, close it before switching
        if (currentConnection) {
            await mysql.disconnect();
            console.log(`Disconnected from database: ${currentDatabase}`);
        }

        // Establish a new connection to the specified database
        currentConnection = await mysql.connect(databaseName);
        currentDatabase = databaseName;
        console.log(
            `Connected to database in setDatabaseconnection: ${databaseName}`
        );
    } catch (error) {
        console.error(
            `Error during setting database connection for ${databaseName}:`,
            error
        );
        throw error;
    }
}

/**
 * Get the current database connection.
 * If the connection doesn't exist, establish it for the default database.
 * @return {Promise<mysql.Connection>}
 */
export async function getDatabaseConnection() {
    try {
        if (!currentConnection) {
            // If there's no active connection, default to 'sb2' or any specified main database
            await setDatabaseConnection("sb2");
        }
        console.log(
            `Returning current connection in getdbconnection: ${currentDatabase}`
        );
        return currentConnection;
    } catch (error) {
        console.error("Error retrieving database connection:", error);
        throw error;
    }
}

export async function connectToDatabase(databaseName) {
    try {
        // Get the singleton instance of the database
        const mysql = mysqlDatabase.getInstance();
        // Connect using the database name or default
        const connection = await mysql.connect(databaseName);
        // currentConnection = connection;
        // currentDatabase = databaseName;
        console.log(`Connected to database: ${databaseName}`);
        return connection;
    } catch (error) {
        console.error("Error during database connection");
        throw error;
    }
}
