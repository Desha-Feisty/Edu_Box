import { motion } from "framer-motion";
import { BookOpen, Sparkles, Shield, Zap } from "lucide-react";
import { Helmet } from "react-helmet-async";

// ─── Animation Variants ──────────────────────────────────────────
const heroContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
};

const heroItem = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 0.9, 0.35, 1] },
    },
};

const cardContainer = {
    hidden: { opacity: 0, x: 40, scale: 0.96 },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { duration: 0.5, ease: [0.22, 0.9, 0.35, 1], delay: 0.15 },
    },
};

const features = [
    {
        icon: Zap,
        title: "AI-Powered Learning",
        desc: "Personalized recommendations and adaptive study paths driven by intelligent algorithms.",
    },
    {
        icon: Shield,
        title: "Secure & Private",
        desc: "Enterprise-grade security with end-to-end encryption for all your educational data.",
    },
    {
        icon: Sparkles,
        title: "Seamless Collaboration",
        desc: "Real-time classroom tools, instant messaging, and interactive assignments in one place.",
    },
];

export default function AuthLayout({ children, title = "EduBox" }) {
    return (
        <div className="min-h-screen flex relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            <Helmet>
                <title>{title}</title>
            </Helmet>

            {/* ── Ambient Background Elements ───────────────────────*/}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Gradient orbs */}
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-300/30 to-fuchsia-300/20 dark:from-violet-600/15 dark:to-fuchsia-600/10 blur-3xl" />
                <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-300/25 to-cyan-300/20 dark:from-blue-600/10 dark:to-cyan-600/8 blur-3xl" />
                <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-300/20 to-pink-300/15 dark:from-purple-600/8 dark:to-pink-600/6 blur-3xl" />

                {/* Subtle grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                        backgroundSize: "32px 32px",
                    }}
                />
            </div>

            {/* ── Main Content ──────────────────────────────────────*/}
            <div className="relative z-10 w-full flex flex-col lg:flex-row">
                {/* ── Left Panel — Hero / Branding ──────────────────*/}
                <motion.div
                    variants={heroContainer}
                    initial="hidden"
                    animate="visible"
                    className="relative flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12 lg:py-0"
                >
                    {/* Logo */}
                    <motion.div
                        variants={heroItem}
                        className="flex items-center gap-3 mb-10"
                    >
                        <div className="bg-gradient-to-br from-brand-700 to-brand-500 rounded-2xl p-3.5 shadow-xl shadow-brand-700/25">
                            <BookOpen className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            Edu
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-brand-500">
                                Box
                            </span>
                        </h1>
                    </motion.div>

                    {/* Headline */}
                    <motion.h2
                        variants={heroItem}
                        className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 dark:text-white leading-tight max-w-lg"
                    >
                        AI-powered learning
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-brand-500">
                            for every student
                        </span>
                    </motion.h2>

                    {/* Feature list */}
                    <motion.div variants={heroItem} className="space-y-5 mt-8 max-w-md">
                        {features.map((f) => (
                            <div key={f.title} className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                    <f.icon className="w-5 h-5 text-brand-700 dark:text-brand-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                        {f.title}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {f.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Decorative stat bar */}
                    <motion.div
                        variants={heroItem}
                        className="mt-10 flex items-center gap-6 text-sm text-slate-400"
                    >
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            99.9% Uptime
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-400" />
                            5K+ Students
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            100+ Courses
                        </span>
                    </motion.div>
                </motion.div>

                {/* ── Right Panel — Auth Card ───────────────────────*/}
                <motion.div
                    variants={cardContainer}
                    initial="hidden"
                    animate="visible"
                    className="relative flex items-center justify-center px-6 sm:px-8 py-8 lg:py-0 lg:min-h-screen lg:w-[480px] xl:w-[520px]"
                >
                    {/* Connecting gradient bar (vertical separator on desktop) */}
                    <div className="hidden lg:block absolute left-0 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-brand-400/40 to-transparent" />

                    <div className="w-full max-w-md">
                        {children}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
