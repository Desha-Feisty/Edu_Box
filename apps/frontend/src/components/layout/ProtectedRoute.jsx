import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../stores/Authstore";

/**
 * Route guard that checks authentication and optional role-based access.
 *
 * Usage:
 *   <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
 *     <Route path="/admin" element={<AdminPage />} />
 *   </Route>
 *
 * Props:
 *   allowedRoles - Array of roles permitted (e.g. ["student", "teacher"])
 *                  Omit or pass empty array to allow any authenticated user.
 *   children     - Optional children. If not provided, renders <Outlet />.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
    const { token, user } = useAuthStore();

    // Not authenticated → redirect to login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Role check present but user doesn't have required role → redirect to their home
    if (allowedRoles && allowedRoles.length > 0) {
        if (!user?.role || !allowedRoles.includes(user.role)) {
            return <Navigate to={user?.role ? `/${user.role}` : "/"} replace />;
        }
    }

    return children || <Outlet />;
}
