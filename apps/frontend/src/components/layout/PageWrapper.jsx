import { motion } from "framer-motion";

const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
};

const pageTransition = {
    type: "tween",
    ease: [0.22, 0.9, 0.35, 1],
    duration: 0.3,
};

export default function PageWrapper({ children, className = "" }) {
    return (
        <div
            className={`page-bg relative overflow-x-hidden min-h-screen flex flex-col ${className}`}
        >
            {/* Ambient background — brand-consistent gradient orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none w-screen h-screen">
                <div className="absolute inset-0 mesh-bg-light" />
                <div className="absolute inset-0 mesh-bg-dark" />

                {/* Brand accent orbs */}
                <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-brand-500/8 dark:bg-brand-500/5 blur-3xl" />
                <div className="absolute bottom-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-accent-400/8 dark:bg-accent-400/5 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-700/5 dark:bg-brand-700/3 blur-3xl" />
            </div>

            {/* Main Content with page transition */}
            <motion.div
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="relative z-10 flex-1 flex flex-col"
            >
                {children}
            </motion.div>
        </div>
    );
}
