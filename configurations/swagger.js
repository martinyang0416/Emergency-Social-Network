// Import necessary modules using ES6 syntax
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger definition and options
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Swagger Express API',
            version: '1.0.0',
            description: 'A simple Express API with Swagger documentation',
        },
        servers: [
            {
                url: 'http://localhost:3000', // Replace with your API's base URL
            },
        ],
    },
    apis: ['./routes/*.js'], // Path to your API route annotations
};

// Initialize Swagger JSDoc
const specs = swaggerJsdoc(options);

// Export the specs and swaggerUi using ES6 syntax
export { specs, swaggerUi };
