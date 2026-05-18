import { create } from "zustand";

// Initialize theme synchronously at module load - safe, no DOM manipulation yet
const getInitialTheme = () => {
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            const saved = window.localStorage.getItem("theme");
            if (saved === "night" || saved === "winter") {
                return saved;
            }
        }
    } catch (e) {
        // Ignore errors during init
    }
    return "winter";
};

// Apply theme to document synchronously - called immediately so CSS variants work
const applyThemeToDocument = (theme) => {
    try {
        if (typeof document !== "undefined") {
            document.documentElement.setAttribute("data-theme", theme);
            document.documentElement.classList.toggle("dark", theme === "night");
        }
    } catch (e) {
        // Ignore errors
    }
};

// Initialize immediately at module load
const initialTheme = getInitialTheme();
applyThemeToDocument(initialTheme);

const useThemeStore = create((set, get) => ({
    theme: initialTheme, // Use the pre-initialized value
    
    initTheme: () => {
        // Already initialized at module load, but ensure consistency
        const saved = get().theme;
        applyThemeToDocument(saved);
    },
    
    toggleTheme: () => {
        try {
            const state = get();
            const newTheme = state.theme === "winter" ? "night" : "winter";
            
            // Save
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.setItem("theme", newTheme);
            }
            
            // Apply
            applyThemeToDocument(newTheme);
            
            set({ theme: newTheme });
        } catch (e) {
            console.error("Theme toggle error:", e);
        }
    },
}));

export default useThemeStore;
