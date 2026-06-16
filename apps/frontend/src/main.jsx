import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App.jsx";

console.log("🚀 [main.jsx] 1. Starting React app initialization...");

// Initialize theme BEFORE rendering - safe, no module-level store access
try {
    if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("theme");
        const theme = (saved === "night" || saved === "winter") ? saved : "winter";

        if (typeof document !== "undefined") {
            document.documentElement.setAttribute("data-theme", theme);
            if (theme === "night") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
    }
    console.log("✅ [main.jsx] 2. Theme initialized successfully");
} catch (e) {
    console.error("❌ [main.jsx] Theme pre-init error:", e);
}

console.log("🔄 [main.jsx] 3. Rendering React to DOM...");

const root = document.getElementById("root");
if (!root) {
    console.error("❌ [main.jsx] ERROR: Could not find root element!");
} else {
    createRoot(root).render(
        <StrictMode>
            <BrowserRouter>
                <HelmetProvider>
                    <App />
                </HelmetProvider>
            </BrowserRouter>
        </StrictMode>,
    );
    console.log("✅ [main.jsx] 4. React rendered successfully");
}
