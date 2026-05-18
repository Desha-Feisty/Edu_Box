import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import useAuthStore from "../stores/Authstore";

// Shared context for admin data - eliminates duplicate API calls
const AdminContext = createContext(null);

export function AdminProvider({ children }) {
    const { token } = useAuthStore();
    
    // Shared state for common admin data
    const [stats, setStats] = useState(null);
    const [enhancedStats, setEnhancedStats] = useState(null);
    const [systemHealth, setSystemHealth] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Fetch shared data once on mount
    useEffect(() => {
        if (!token) return;
        
        const fetchSharedData = async () => {
            setLoading(true);
            try {
                const [statsRes, enhancedRes, healthRes, usersRes] = await Promise.all([
                    axios.get("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get("/api/admin/stats/enhanced", { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get("/api/admin/system-health", { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get("/api/admin/users?limit=20", { headers: { Authorization: `Bearer ${token}` } })
                ]);
                
                setStats(statsRes.data.stats);
                setEnhancedStats(enhancedRes.data.stats);
                setSystemHealth(healthRes.data);
                setUsers(usersRes.data.users || []);
            } catch (err) {
                console.error("Failed to fetch admin data:", err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchSharedData();
    }, [token]);
    
    // Manual refresh functions
    const refreshStats = async () => {
        if (!token) return;
        try {
            const res = await axios.get("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
            setStats(res.data.stats);
        } catch (err) { 
            console.error("Failed to refresh stats:", err); 
        }
    };
    
    const refreshEnhancedStats = async () => {
        if (!token) return;
        try {
            const res = await axios.get("/api/admin/stats/enhanced", { headers: { Authorization: `Bearer ${token}` } });
            setEnhancedStats(res.data.stats);
        } catch (err) { 
            console.error("Failed to refresh enhanced stats:", err); 
        }
    };
    
    const refreshSystemHealth = async () => {
        if (!token) return;
        try {
            const res = await axios.get("/api/admin/system-health", { headers: { Authorization: `Bearer ${token}` } });
            setSystemHealth(res.data);
        } catch (err) { 
            console.error("Failed to refresh system health:", err); 
        }
    };
    
    const value = {
        stats,
        enhancedStats,
        systemHealth,
        users,
        loading,
        refreshStats,
        refreshEnhancedStats,
        refreshSystemHealth
    };
    
    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// Hook to use admin context
export function useAdmin() {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error("useAdmin must be used within AdminProvider");
    }
    return context;
}

export default AdminContext;