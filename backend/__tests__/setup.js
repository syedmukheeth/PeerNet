const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Booting mongod takes well over Jest's default 5s hook timeout, especially on
// the first run when the binary is still being fetched, so every hook here
// needs an explicit budget. Without it the suite passes in isolation and fails
// as part of a full run, which is the worst way for this to break.
const BOOT_TIMEOUT_MS = 120_000;

beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    await mongoose.connect(uri);
}, BOOT_TIMEOUT_MS);

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
}, BOOT_TIMEOUT_MS);

afterEach(async () => {
    // Clean up database between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
}, 30_000);
