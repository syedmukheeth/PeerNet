'use strict';

const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const PORT = process.env.PORT || 5000;

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PeerNet API',
            version: require('../../package.json').version,
            description: 'Production-ready REST API for PeerNet',
        },
        servers: [
            {
                url: `http://localhost:${PORT}/api/v1`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // The @swagger blocks live next to the routes they document, in
    // src/modules/*/*.routes.js. The old glob pointed at src/routes/v1, which
    // only mounts routers and carries no JSDoc, so the spec was always empty.
    // Absolute, because the relative form only resolved when the process
    // happened to be started from the backend directory.
    apis: [path.join(__dirname, '../modules/*/*.routes.js')],
};

const swaggerSpec = swaggerJSDoc(options);

/**
 * Mounts the interactive API docs. Never called before, so /api-docs 404'd
 * even though app.js explicitly excluded that path from the SPA fallback.
 *
 * Development only: the spec enumerates every route and its shape, which is
 * reconnaissance material in production.
 */
const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
