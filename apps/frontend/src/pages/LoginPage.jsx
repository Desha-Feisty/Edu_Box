import { useState, useEffect } from "react";
import useAuthStore from "../stores/Authstore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen, LogIn, Mail, Lock, Eye, EyeOff, Users, GraduationCap } from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";
import useThemeStore from "../stores/ThemeStore";

function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const { token, role, isLoggingIn, errMsg, clearErrMsg } = useAuthStore();

    // Initialize theme store here just so it's loaded early if not in App
    useThemeStore();

    useEffect(() => {
        if (token) {
            if (role === "teacher") {
                navigate("/teacher");
            } else if (role === "admin") {
                navigate("/admin");
            } else {
                navigate("/student");
            }
        }
    }, [token, role, navigate]);

    function validateForm() {
        const newErrors = {};
        if (!email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Please enter a valid email";
        }
        if (!password) {
            newErrors.password = "Password is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleLogin() {
        clearErrMsg();
        if (!validateForm()) {
            return;
        }

        try {
            const response = await useAuthStore
                .getState()
                .login(email, password);
            if (response.success) {
                const state = useAuthStore.getState();
                toast.success("Login successful!", { duration: 2000 });
                setTimeout(() => {
                    if (state.role === "teacher") {
                        navigate("/teacher");
                    } else if (state.role === "admin") {
                        navigate("/admin");
                    } else {
                        navigate("/student");
                    }
                }, 500);
            } else {
                toast.error(response.errMsg || "Login failed");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    return (
        <PageWrapper>
            <div className="min-h-screen flex items-center justify-center p-6 relative">
                {/* Decorative blobs */}
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

                <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center z-10">
                    {/* Left Side - Welcome & Branding */}
                    <div className="text-center lg:text-left space-y-8">
                        <div className="join gap-4 items-center justify-center lg:justify-start inline-flex">
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-4 shadow-lg shadow-blue-500/30">
                                <BookOpen className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                                Edu
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                    Box
                                </span>
                            </h1>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                AI-powered learning for every student
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto lg:mx-0">
                                Smart course recommendations, adaptive study
                                help, and seamless classroom collaboration in
                                one AI-driven platform.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                            <div className="flex flex-col items-center">
                                <BookOpen className="w-6 h-6 text-blue-500 mb-2" />
                                <div className="text-3xl font-bold mb-1 text-slate-900 dark:text-white">
                                    100+
                                </div>
                                <div className="text-sm text-slate-500 font-medium">
                                    Courses
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <Users className="w-6 h-6 text-purple-500 mb-2" />
                                <div className="text-3xl font-bold mb-1 text-slate-900 dark:text-white">
                                    5K+
                                </div>
                                <div className="text-sm text-slate-500 font-medium">
                                    Students
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <GraduationCap className="w-6 h-6 text-indigo-500 mb-2" />
                                <div className="text-3xl font-bold mb-1 text-slate-900 dark:text-white">
                                    50+
                                </div>
                                <div className="text-sm text-slate-500 font-medium">
                                    Teachers
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login form */}
                    <div className="w-full max-w-md mx-auto lg:mx-0">
                        <div className="glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden">
                            {/* Subtle highlight */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                            <div className="mb-8 pl-1">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    Welcome Back
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    Please enter your details to sign in.
                                </p>
                            </div>

                            <div className="space-y-5">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium text-slate-700 dark:text-slate-300">
                                            Email
                                        </span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="you@example.com"
                                            className={`input input-lg w-full pl-12 bg-slate-50/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-xl ${errors.email ? "input-error" : ""}`}
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (errors.email) setErrors({ ...errors, email: null });
                                            }}
                                            onKeyPress={handleKeyPress}
                                            disabled={isLoggingIn}
                                        />
                                    </div>
                                    {errors.email && (
                                        <label className="label">
                                            <span className="label-text-alt text-red-500">{errors.email}</span>
                                        </label>
                                    )}
                                </div>

                                <div className="form-control mt-4">
                                    <label className="label">
                                        <span className="label-text font-medium text-slate-700 dark:text-slate-300">
                                            Password
                                        </span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className={`input input-lg w-full pl-12 pr-12 bg-slate-50/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-xl ${errors.password ? "input-error" : ""}`}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (errors.password) setErrors({ ...errors, password: null });
                                            }}
                                            onKeyPress={handleKeyPress}
                                            disabled={isLoggingIn}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <label className="label">
                                            <span className="label-text-alt text-red-500">{errors.password}</span>
                                        </label>
                                    )}
                                </div>

                                {errMsg && (
                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400 text-center">{errMsg}</p>
                                    </div>
                                )}

                                <button
                                    className={`btn btn-primary btn-lg w-full rounded-xl mt-4 font-semibold shadow-lg shadow-blue-500/30 ${isLoggingIn ? "loading" : ""}`}
                                    onClick={handleLogin}
                                    disabled={isLoggingIn}
                                >
                                    {isLoggingIn ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Signing In...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="w-5 h-5 mr-2" />
                                            Sign In
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                    Demo Credentials
                                </p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-slate-100 dark:bg-base-300/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                                            Teacher
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-500 mt-1 truncate">
                                            teacher@test.com
                                        </p>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-base-300/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                                            Student
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-500 mt-1 truncate">
                                            student@test.com
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-xs text-slate-500 font-medium mt-6">
                            🔒 Protected by end-to-end encryption
                        </p>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
}

export default LoginPage;
