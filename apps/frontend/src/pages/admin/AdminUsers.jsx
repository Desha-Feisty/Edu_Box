import { useState, useEffect } from "react";
import axios from "axios";
import useAuthStore from "../../stores/Authstore";
import toast from "react-hot-toast";
import { 
    Search, 
    Filter,
    UserPlus,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { SkeletonTable } from "../../components/common/Skeleton";

function AdminUsers() {
    const { token } = useAuthStore();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "student" });
    
    const limit = 20;

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("limit", limit.toString());
            if (roleFilter !== "all") params.append("role", roleFilter);
            if (searchTerm) params.append("search", searchTerm);
            
            const res = await axios.get(`/api/admin/users?${params}`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setUsers(res.data.users || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 0);
        } catch (_err) {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

     
    useEffect(() => {
        fetchUsers();
    }, [page, roleFilter, token]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page !== 1) {
                setPage(1);
            } else {
                fetchUsers();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleDeleteUser = async (userId, name) => {
        if (!window.confirm(`Are you sure you want to delete user "${name}"? This action is permanent and will delete all their associated data.`)) return;
        
        try {
            await axios.delete(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("User deleted successfully");
            fetchUsers();
        } catch {
            toast.error("Failed to delete user");
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post("/api/admin/users", newUser, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("User created successfully");
            setIsAddUserOpen(false);
            setNewUser({ name: "", email: "", password: "", role: "student" });
            fetchUsers();
        } catch {
            toast.error("Failed to create user");
        }
    };

    return (
        <div className="space-y-6">
            {/* Search and Action Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-4">
                <div className="flex flex-1 gap-4 w-full">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name or email..." 
                            className="input input-bordered w-full pl-12 bg-white/50 dark:bg-base-300/50 rounded-xl focus:ring-2 focus:ring-brand-500/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                            className="select select-bordered w-full pl-10 bg-white/50 dark:bg-base-300/50 rounded-xl"
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                        >
                            <option value="all">All Roles</option>
                            <option value="student">Students</option>
                            <option value="teacher">Teachers</option>
                            <option value="admin">Admins</option>
                        </select>
                    </div>
                </div>
                <button 
                    onClick={() => setIsAddUserOpen(true)}
                    className="btn-brand"
                >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Add User
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-slate-50 dark:bg-base-300 text-slate-500 uppercase text-[11px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Joined Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8">
                                        <SkeletonTable rows={5} />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center font-black text-blue-600">
                                                    {user.name?.charAt(0) || "U"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge badge-sm py-3 px-3 border-none font-bold uppercase text-[10px] ${
                                                user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                user.role === 'teacher' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-400'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "N/A"}
                                        </td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleDeleteUser(user._id, user.name)}
                                                className="btn btn-ghost btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                disabled={user.role === 'admin'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {total > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-sm text-slate-500">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} users
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn btn-sm btn-outline rounded-xl"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-slate-500 px-2">
                                Page {page} of {totalPages || 1}
                            </span>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="btn btn-sm btn-outline rounded-xl"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {isAddUserOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Create New Account</h2>
                            <button onClick={() => setIsAddUserOpen(false)} className="btn btn-ghost btn-circle btn-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="form-control">
                                <label className="label pb-1.5">
                                    <span className="label-text font-bold">Full Name</span>
                                </label>
                                <input 
                                    type="text" 
                                    className="input input-bordered w-full rounded-xl"
                                    required
                                    value={newUser.name}
                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label pb-1.5">
                                    <span className="label-text font-bold">Email Address</span>
                                </label>
                                <input 
                                    type="email" 
                                    className="input input-bordered w-full rounded-xl"
                                    required
                                    value={newUser.email}
                                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label pb-1.5">
                                    <span className="label-text font-bold">Initial Password</span>
                                </label>
                                <input 
                                    type="password" 
                                    className="input input-bordered w-full rounded-xl"
                                    required
                                    minLength={6}
                                    value={newUser.password}
                                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label-text font-bold mb-1 block">Role</label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    {['student', 'teacher'].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setNewUser({...newUser, role})}
                                            className={`p-3 rounded-xl border-2 transition-all font-bold capitalize ${
                                                newUser.role === role 
                                                ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/20' 
                                                : 'border-slate-100 bg-slate-50 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                                            }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="btn-brand w-full mt-6"> Create Account </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminUsers;