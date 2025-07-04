import dotenv from "dotenv";
import mysql from 'mysql2/promise';
import { Client } from "ssh2";
import bcrypt from "bcrypt";

dotenv.config();

// Define connection config for the SSH tunnel
const tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    port: process.env.DB_SSH_PORT,
    username: process.env.DB_SSH_USER,
    password: process.env.DB_SSH_PASSWORD,
};

const forwardConfig = {
    srcHost: process.env.DB_HOST,
    srcPort: process.env.DB_PORT,
    dstHost: process.env.DB_HOST,
    dstPort: process.env.DB_PORT,
};

const dbServer = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};

class mysqlDatabase {
    static instance;

    constructor() {
        this.conn_str = null;
        this.connection = null;
        this.sshClient = new Client();
        this.sshConnected = false;
        this.dbConnected = false;  // Flag to track if the DB is connected

        // Set up event handlers for SSH client
        this.setupSSHClientHandlers();
    }

    setupSSHClientHandlers() {
        // SSH client error handling
        this.sshClient.on("error", (err) => {
            console.error("SSH Client Error:", err);

            if (err.code === 'ECONNRESET') {
                console.log("Connection reset. Attempting to reconnect...");
                setTimeout(() => {
                    this.sshClient.connect(tunnelConfig);
                }, 5000);
            }
        });

        // Log when SSH connection ends
        this.sshClient.on("end", () => {
            console.log('SSH connection ended.');
            this.sshConnected = false;
        });

        // Log when SSH connection closes and attempt to reconnect if it closed with an error
        this.sshClient.on("close", (hadError) => {
            console.log('SSH connection closed.', hadError ? 'With error' : 'Cleanly');
            this.sshConnected = false;
            if (hadError) {
                console.error('Attempting to reconnect...');
                setTimeout(() => {
                    this.sshClient.connect(tunnelConfig);
                }, 5000);
            }
        });
    }

    // Singleton pattern to get an instance of the database
    static getInstance() {
        if (!mysqlDatabase.instance) {
            mysqlDatabase.instance = new mysqlDatabase();
        }
        return mysqlDatabase.instance;
    }

    async connect(database) {
        try {
            // Only establish the SSH connection if it hasn't already been established
            if (!this.sshConnected) {
                await this.connectViaSSH();
            }

            // Only establish the DB connection if it's not already established
            if (!this.dbConnected || (this.connection && this.connection.state === 'disconnected')) {
                this.connection = await this.createDBConnection(database);
                this.dbConnected = true;
            }

            const [rows] = await this.connection.query('SELECT VERSION()');
            const version = rows[0]['VERSION()'];
            this.conn_str = `${database} on ${dbServer.user}@${dbServer.host} (MySQL ${version})`;

            // Ensure the default admin user exists
            await this.ensureAdminUser();

            return this.connection;
        } catch (err) {
            console.error('Error during connection:', err);
            throw new Error(`Unable to establish database connection: ${err.message}`);
        }
    }
z
    // Function to ensure the ESNAdmin user exists
    async ensureAdminUser() {
        const query = `SELECT user_name FROM user WHERE user_name = 'esnadmin'`;
        const [result] = await this.connection.query(query);
    
        if (result.length === 0) {
            console.log("ESNAdmin user does not exist. Creating user...");
    
            // Asynchronously hash the password before storing it
            try {
                const hashedPassword = await bcrypt.hash('admin', 10);
                const insertQuery = `
                    INSERT INTO user (user_name, user_password, privilege, status, Acknowledged) 
                    VALUES ('esnadmin', '${hashedPassword}', 'Administrator', 'OK', 1)
                `;
                await this.connection.query(insertQuery);
                console.log("ESNAdmin user created successfully.");
            } catch (error) {
                console.error("Failed to hash password:", error);
            }
        } else {
            console.log("ESNAdmin user already exists.");
        }
    }
    

    /**
     * Get connection string information
     * @return {string}
    */
    getConnectionString() {
        return this.conn_str;
    }

    /**
     * Change the current database being used
     * @param {string} database
     * @return {Promise<void>}
     */
    static async useDatabase(database) {
        try {
            if (!this.connection || this.connection.state === 'disconnected') {
                this.connection = await mysql.createConnection({
                    host: dbServer.host,
                    user: dbServer.user,
                    password: dbServer.password,
                    database: database,
                });
            }

            await this.connection.changeUser({ database: database });
        } catch (err) {
            throw new Error(`Unable to select database: ${err.message}`);
        }
    }

    /**
     * Check if the database is connected
     * @return {boolean}
     */
    static async isConnected() {
        if (this.connection) {
            try {
                if (this.connection.state === 'disconnected') {
                    console.log('Reinitializing disconnected connection...');
                    this.connection = await mysql.createConnection({
                        host: dbServer.host,
                        user: dbServer.user,
                        password: dbServer.password,
                        database: dbServer.database,
                    });
                }
                await this.connection.ping();
                return true;
            } catch (err) {
                return false;
            }
        }
        return false;
    }

    /**
     * Disconnect from the MySQL database
     * @return {Promise<void>}
     */
    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            this.dbConnected = false;  // Reset the flag after disconnect
        }
    }

    /**
     * Establish SSH connection
     * @return {Promise<void>}
     */
    async connectViaSSH() {
        return new Promise((resolve, reject) => {
            this.sshClient.once("ready", () => {
                console.log("SSH connection established.");
                this.sshConnected = true;
                resolve();
            });

            this.sshClient.connect(tunnelConfig);

            // Handle SSH connection failure
            this.sshClient.on("error", (err) => {
                reject(new Error(`SSH Connection Error: ${err.message}`));
            });
        });
    }

    /**
     * Create a database connection via SSH
     * @param {string} database
     * @return {Promise<mysql.Connection>}
     */
    async createDBConnection(database) {
        return new Promise((resolve, reject) => {
            this.sshClient.forwardOut(
                forwardConfig.srcHost,
                forwardConfig.srcPort,
                forwardConfig.dstHost,
                forwardConfig.dstPort,
                (err, stream) => {
                    if (err) {
                        return reject(new Error(`Failed to forward SSH connection: ${err.message}`));
                    }

                    const updatedDbServer = {
                        ...dbServer,
                        database: database,
                        stream,
                        multipleStatements: true, // Enable multiple statements
                    };

                    try {
                        // Create the connection (this is not an async call)
                        const connection = mysql.createConnection(updatedDbServer);
    
                        // Ensure the connection is resolved properly
                        resolve(connection);
                    } catch (error) {
                        reject(new Error(`Error creating MySQL connection: ${error.message}`));
                    }
                }
            );
        });
    }

    // Method to drop the test database
    async dropTestDatabase(testDatabaseName) {
        try {
            const connection = await this.connect(testDatabaseName);
            await connection.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
            console.log(`Test database '${testDatabaseName}' dropped successfully.`);
        } catch (err) {
            throw new Error(`Unable to drop test database: ${err.message}`);
        }
    }

    async createTestDatabaseFromMain(mainDatabase, testDatabaseName) {
        try {
            const connection = await this.connect(mainDatabase);
            // Step 1: Create the test database
            await connection.query(`CREATE DATABASE IF NOT EXISTS ${testDatabaseName}`);
            console.log(`Test database '${testDatabaseName}' created successfully.`);
            
            // Step 2: Get all tables from the main database
            // await this.useDatabase(mainDatabase);
            const [tables] = await connection.query(`SHOW TABLES FROM ${mainDatabase}`);
    
            const tableNames = tables.map(row => Object.values(row)[0]);


            // await this.useDatabase(testDatabaseName);
    
            // Step 3: Copy each table schema and data
            for (const table of tableNames) {
                // Copy table schema
                await connection.query(`CREATE TABLE ${testDatabaseName}.${table} LIKE ${mainDatabase}.${table}`);
    
                // Copy table data
                await connection.query(`INSERT INTO ${testDatabaseName}.${table} SELECT * FROM ${mainDatabase}.${table}`);
            }
    
            console.log(`Test database '${testDatabaseName}' created from main database '${mainDatabase}' successfully.`);
            
            // Step 4: Switch to the test database for subsequent operations
            // await this.useDatabase(testDatabaseName);
    
        } catch (err) {
            console.error(`Error creating test database from main: ${err.message}`);
            throw new Error(`Unable to create test database from main database: ${err.message}`);
        }
    }
}

export default mysqlDatabase;
