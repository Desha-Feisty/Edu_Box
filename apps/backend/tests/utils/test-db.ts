/**
 * Test database utility
 *
 * CONNECTS TO A UNIQUE TEST DATABASE PER WORKER PROCESS — never the production one.
 * Each vitest worker (file) gets its own isolated database so parallel
 * execution doesn't cause cross-file data interference.
 *
 * Uses `test_edubox_<random>` database by default.
 * Singleton pattern per worker so describe blocks within a file share one connection.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

let instanceCount = 0;

// Unique suffix per worker process — prevents cross-file data interference
// when vitest runs test files in parallel
const DB_SUFFIX = crypto.randomBytes(4).toString("hex");

export function getTestTimeout(): number {
    return 30_000;
}

/**
 * Build a test-safe MongoDB URI with a unique database name per worker.
 * Each vitest worker gets its own isolated database to prevent cross-file
 * data interference when running tests in parallel.
 */
function getTestMongoUri(): string {
    const dbName = `test_edubox_${DB_SUFFIX}`;
    const originalUri = process.env.MONGODB_URI;
    const fallbackUri = process.env.MONGODB_URI_FALLBACK;

    if (originalUri) {
        // Replace the database name in the URI to use a test DB
        // e.g., mongodb+srv://.../smartschool?... → mongodb+srv://.../test_edubox_<rand>?...
        const replaced = originalUri.replace(/\/\w+\?/, `/${dbName}?`);
        return replaced;
    }

    if (fallbackUri) {
        // Use fallback but with test database name
        return fallbackUri.replace(/\/\w+$/, `/${dbName}`);
    }

    return `mongodb://localhost:27017/${dbName}`;
}

export async function setupTestDB(): Promise<void> {
    instanceCount++;

    if (mongoose.connection.readyState === 1) return;

    const uri = getTestMongoUri();
    await mongoose.connect(uri);
}

export async function teardownTestDB(): Promise<void> {
    instanceCount--;
    if (instanceCount > 0) return;
    await mongoose.disconnect();
}

export async function clearTestDB(): Promise<void> {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
}
