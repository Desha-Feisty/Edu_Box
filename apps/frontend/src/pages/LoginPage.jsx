import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
    LogIn,
    Mail,
    Lock,
    UserCheck,
    UserPlus,
    AlertCircle,
    Loader2,
    Sparkles,
    ArrowRight,
    CheckCircle2,
} from "lucide-react";
import useAuthStore from "../stores/Authstore";
import useThemeStore from "../stores/ThemeStore";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/common/Button";
import { Input } from "../components/common/Input";

// ─── Constants ───────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
    { label: "Teacher", email: "teacher@test.com", password: "password", role: "teacher", icon: UserCheck },
    { label: "Student", email: "student@test.com", password: "password", role: "student", icon: UserPlus },
];

const FORM_FIELDS = [
    {
        id: "login-email",
        label: "Email address",
        type: "email",
        icon: Mail,
        placeholder: "you@example.com",
        autoComplete: "email",
        key: "email",
    },
    {
        id: "login-password",
        label: "Password",
        type: "password",
        icon: Lock,
        placeholder: "Enter your password",
        autoComplete: "current-password",
        key: "password",
    },
];

// ─── Animation Variants ──────────────────────────────────────────
const formContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
};

const formItem = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: [0.22, 0.9, 0.35, 1] },
    },
};

const demoCard = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.35, ease: [0.22, 0.9, 0.35, 1], delay: 0.3 + i * 0.08 },
    }),
};

const successVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

// ─── Component ───────────────────────────────────────────────────
export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [isCreatingDemo, setIsCreatingDemo] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const navigate = useNavigate();

    const { token, role, isLoggingIn, errMsg, clearErrMsg, register, login } = useAuthStore();

    // Initialize theme
    useThemeStore();

    // Redirect if already logged in
    useEffect(() => {
        if (token && loginSuccess) {
            const target =
                role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student";
            const t = setTimeout(() => navigate(target, { replace: true }), 600);
            return () => clearTimeout(t);
        }
    }, [token, role, navigate, loginSuccess]);

    // Redirect on mount if token exists (already authenticated)
    useEffect(() => {
        if (token && !loginSuccess) {
            const target =
                role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student";
            navigate(target, { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Validation ──────────────────────────────────────────────
    const validateForm = useCallback(() => {
        const newErrors = {};
        if (!email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Please enter a valid email";
        }
        if (!password) {
            newErrors.password = "Password is required";
        } else if (password.length < 6) {
            newErrors.password = "Must be at least 6 characters";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [email, password]);

    // ── Login ───────────────────────────────────────────────────
    const handleLogin = useCallback(async () => {
        clearErrMsg();
        if (!validateForm()) return;

        try {
            const response = await login(email, password);
            if (response.success) {
                setLoginSuccess(true);
                toast.success("Welcome back!", { duration: 2000, icon: "🎉" });
            } else {
                toast.error(response.errMsg || "Login failed. Please try again.");
            }
        } catch {
            toast.error("An unexpected error occurred. Please try again.");
        }
    }, [email, password, login, clearErrMsg, validateForm]);

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !isLoggingIn && !isCreatingDemo) {
            handleLogin();
        }
    };

    // ── Demo helpers ────────────────────────────────────────────
    const fillDemoCredentials = (creds) => {
        clearErrMsg();
        setEmail(creds.email);
        setPassword(creds.password);
        setErrors({});
        toast.success(`Filled credentials for ${creds.label}`, {
            duration: 2000,
            icon: "🚀",
        });
    };

    const handleCreateDemo = async (creds) => {
        setIsCreatingDemo(true);
        clearErrMsg();
        try {
            const result = await register(
                creds.label === "Teacher" ? "Demo Teacher" : "Demo Student",
                creds.email,
                creds.password,
                creds.role,
            );
            if (result.success) {
                toast.success(`${creds.label} account created! Signing in...`, {
                    duration: 3000,
                    icon: "🎉",
                });
                const loginResult = await login(creds.email, creds.password);
                if (loginResult.success) {
                    setLoginSuccess(true);
                } else {
                    // fill form as fallback
                    setEmail(creds.email);
                    setPassword(creds.password);
                }
            } else {
                toast(`Account exists! Try signing in as ${creds.label}.`, {
                    icon: "💡",
                    duration: 3000,
                });
                setEmail(creds.email);
                setPassword(creds.password);
            }
        } catch {
            toast.error("Unable to create demo account. Try auto-fill instead.");
            setEmail(creds.email);
            setPassword(creds.password);
        } finally {
            setIsCreatingDemo(false);
        }
    };

    const updateField = (key, value) => {
        if (key === "email") setEmail(value);
        if (key === "password") setPassword(value);
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
    };

    // ── Success screen ──────────────────────────────────────────
    if (loginSuccess) {
        return (
            <AuthLayout title="Signing In — EduBox">
                <motion.div
                    variants={successVariants}
                    initial="hidden"
                    animate="visible"
                    className="glass-strong p-10 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Signed In
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                        Redirecting to your dashboard…
                    </p>
                    <Loader2 className="w-5 h-5 animate-spin text-brand-500 mx-auto" />
                </motion.div>
            </AuthLayout>
        );
    }

    // ── Main login view ─────────────────────────────────────────
    return (
        <AuthLayout title="Sign In — EduBox">
            <motion.div
                variants={formContainer}
                initial="hidden"
                animate="visible"
                className="glass-strong"
            >
                {/* Gradient accent bar */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-accent-500" />

                {/* ── Card Header ──────────────────────────────── */}
                <div className="px-6 sm:px-8 pt-8 pb-2">
                    <motion.div variants={formItem} className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Welcome back
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Sign in to your account to continue
                        </p>
                    </motion.div>
                </div>

                {/* ── Form ──────────────────────────────────────── */}
                <div className="px-6 sm:px-8 py-6 space-y-4">
                    {FORM_FIELDS.map((field) => (
                        <motion.div key={field.id} variants={formItem}>
                            <Input
                                id={field.id}
                                label={field.label}
                                type={field.type}
                                icon={field.icon}
                                placeholder={field.placeholder}
                                autoComplete={field.autoComplete}
                                value={field.key === "email" ? email : password}
                                onChange={(e) => updateField(field.key, e.target.value)}
                                onKeyDown={handleKeyPress}
                                error={errors[field.key]}
                                disabled={isLoggingIn || isCreatingDemo}
                            />
                        </motion.div>
                    ))}

                    {/* Server error */}
                    <AnimatePresence>
                        {errMsg && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -8, height: 0 }}
                                className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-2.5"
                                role="alert"
                            >
                                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 dark:text-red-400 flex-1">
                                    {errMsg}
                                </p>
                                <button
                                    onClick={clearErrMsg}
                                    className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors flex-shrink-0"
                                    aria-label="Dismiss error"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.div variants={formItem}>
                        <Button
                            variant="brand"
                            size="xl"
                            fullWidth
                            loading={isLoggingIn}
                            disabled={isCreatingDemo}
                            onClick={handleLogin}
                            icon={isLoggingIn ? undefined : ArrowRight}
                            iconPosition="right"
                        >
                            {isLoggingIn ? "Signing in…" : "Sign in"}
                        </Button>
                    </motion.div>
                </div>

                {/* ── Demo Accounts ────────────────────────────── */}
                <div className="px-6 sm:px-8 pb-8">
                    <motion.div variants={formItem}>
                        <div className="pt-5 border-t border-slate-200 dark:border-white/[0.06]">
                            {/* Section heading */}
                            <div className="flex items-center gap-1.5 mb-3">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                                    Quick access
                                </span>
                            </div>

                            {/* Demo account cards */}
                            <div className="grid grid-cols-2 gap-3">
                                {DEMO_ACCOUNTS.map((creds, i) => (
                                    <motion.div
                                        key={creds.label}
                                        custom={i}
                                        variants={demoCard}
                                        className="group relative bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 transition-all duration-200 hover:border-brand-400/50 dark:hover:border-brand-500/40 hover:shadow-md hover:shadow-brand-500/5"
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <creds.icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                                                {creds.label}
                                            </p>
                                        </div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mb-2.5">
                                            {creds.email}
                                        </p>

                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => fillDemoCredentials(creds)}
                                                className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:opacity-50"
                                                disabled={isLoggingIn || isCreatingDemo}
                                            >
                                                Auto-fill
                                            </button>
                                            <button
                                                onClick={() => handleCreateDemo(creds)}
                                                className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 disabled:opacity-50"
                                                disabled={isLoggingIn || isCreatingDemo}
                                            >
                                                {isCreatingDemo ? (
                                                    <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                                ) : (
                                                    "Create"
                                                )}
                                            </button>
                                        </div>

                                        {/* Hint for mobile */}
                                        <p className="text-[10px] text-slate-400 mt-1.5 hidden max-sm:block">
                                            pass: password
                                        </p>
                                    </motion.div>
                                ))}
                            </div>

                            <p className="text-[10px] text-slate-400 mt-2.5 text-center hidden sm:block">
                                Hover over a role to auto-fill or create account
                            </p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Footer */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.6 } }}
                className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5 flex items-center justify-center gap-1.5"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Protected by end-to-end encryption
            </motion.p>
        </AuthLayout>
    );
}
