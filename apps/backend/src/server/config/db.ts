import mongoose from "mongoose";

async function connectDB() {
    const primaryUri = process.env.MONGODB_URI;
    const fallbackUri = process.env.MONGODB_URI_FALLBACK;

    mongoose.set("strictQuery", true);
    
    const isProduction = process.env.NODE_ENV === "production";
    // Disable autoIndex in production — saves ~5-10s startup and avoids index check overhead
    // Indexes should be managed via migrations or mongoose sync scripts instead
    const mongooseOptions = { autoIndex: !isProduction };

    if (primaryUri) {
        try {
            await mongoose.connect(primaryUri, mongooseOptions);
            console.log("MongoDB connected (primary — Atlas)");
            return;
        } catch (err) {
            console.warn("Primary MongoDB (Atlas) unavailable:", (err as Error).message);
            console.warn("Falling back to local MongoDB...");
        }
    }

    if (fallbackUri) {
        try {
            await mongoose.connect(fallbackUri, mongooseOptions);
            console.log("MongoDB connected (fallback — local)");
            return;
        } catch (err) {
            console.warn("Fallback MongoDB connection failed:", (err as Error).message);
        }
    }

    throw new Error("No MongoDB connection available — set MONGODB_URI or MONGODB_URI_FALLBACK");
}

export default connectDB;
