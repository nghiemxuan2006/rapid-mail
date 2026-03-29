import express from 'express';
import bodyParser from "body-parser";
import cors from "cors";
import helmet from 'helmet';
import morgan from "morgan";
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import logger from './utils/wiston-log'
import settings from './config/env'
import compression from 'compression';
import { errorHandler } from './middleware/error-handler';
import { BAD_REQUEST_ERROR } from './utils/error';
import connectMongoDB from './config/mongodb';

import routers from './routers'
import http from 'http'
import { ensureStorageDir } from './services/file-storage.service'
const writeLog = {
    write: (message: string) => {
        logger.info(message)
    }
}
const app = express();
const port = settings.PORT;
console.log("🚀 ~ settings:", settings)

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Dating App API Documentation',
        version: '1.0.0',
        description: 'API documentation for Dating App backend with authentication',
    },
    servers: [
        {
            url: `http://localhost:${port}`,
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
};

const options = {
    swaggerDefinition,
    apis: ['./routers/*.ts'], // Adjust path to your route files
};

const swaggerSpec = swaggerJSDoc(options);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(morgan('combined', { stream: writeLog }))

// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// set security HTTP headers
app.use(helmet());

// // parse json request body
// app.use(express.json());

// // parse urlencoded request body
// app.use(express.urlencoded({ extended: true }));

// gzip compression
app.use(compression());

// enable cors
app.use(cors());

app.use('/v1', routers)

app.get('/', (req, res) => {
    // throw new BAD_REQUEST_ERROR('This is a bad request example');
    res.send('Hello World!');
});

// Error handler middleware
app.use(errorHandler);

// Create HTTP server to attach Socket.IO
const server = http.createServer(app);

// Ensure file storage directory exists
ensureStorageDir();

// Connect to MongoDB
connectMongoDB();

server.listen(port, () => {
    logger.info(`Express is listening at http://localhost:${port}`);
});