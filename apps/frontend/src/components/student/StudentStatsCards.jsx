import { BookOpen, Zap, Award } from "lucide-react";

export default function StudentStatsCards({ allCourses, availableQuizzes, avgScore }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-8">
            <div className="relative bg-white dark:bg-base-200 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            My Courses
                        </p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {allCourses.length}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5.5 h-5.5 text-brand-600 dark:text-brand-400" />
                    </div>
                </div>
            </div>

            <div className="relative bg-white dark:bg-base-200 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            Quizzes Available
                        </p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {availableQuizzes.length}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5.5 h-5.5 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>
            </div>

            <div className="relative bg-white dark:bg-base-200 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            Average Score
                        </p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {avgScore}%
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Award className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}
