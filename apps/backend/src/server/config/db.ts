import mongoose from "mongoose";

async function connectDB() {
    const primaryUri = process.env.MONGODB_URI;
    const fallbackUri = process.env.MONGODB_URI_FALLBACK;

    mongoose.set("strictQuery", true);

    if (primaryUri) {
        try {
            await mongoose.connect(primaryUri, { autoIndex: true });
            console.log("MongoDB connected (primary — Atlas)");
            return;
        } catch (err) {
            console.warn("Primary MongoDB (Atlas) unavailable:", (err as Error).message);
            console.warn("Falling back to local MongoDB...");
        }
    }

    if (fallbackUri) {
        await mongoose.connect(fallbackUri, { autoIndex: true });
        console.log("MongoDB connected (fallback — local)");
        return;
    }

    throw new Error("No MongoDB connection available — set MONGODB_URI or MONGODB_URI_FALLBACK");
}

export default connectDB;
