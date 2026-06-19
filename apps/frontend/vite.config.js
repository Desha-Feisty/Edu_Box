import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
    base: '/',
    plugins: [tailwindcss(), react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@edubox/shared": path.resolve(__dirname, "../../packages/shared/src"),
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.js"],
        include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/**/*.{js,jsx}"],
            exclude: ["node_modules/", "src/test/"],
        },
    },
    server: {
        host: "localhost",
        port: 5173,
        strictPort: true,
        hmr: {
            protocol: "ws",
            host: "localhost"
        },
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            "/socket.io": {
                target: "http://localhost:3000",
                changeOrigin: true,
                secure: false,
                ws: true,
            }
        },
    },
});