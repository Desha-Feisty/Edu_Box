import { Zap, Clock, BookMarked, CheckCircle, Calendar, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StudentQuizzesTab({
    availableQuizzes,
    startingQuizId,
    handleStartQuiz
}) {
    const navigate = useNavigate();
    const handleClick = (quizId) => {
        if (handleStartQuiz && typeof handleStartQuiz === 'function') {
            handleStartQuiz(quizId);
        }
    };
    
    return (
        <div>
            {availableQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 flex items-center justify-center mb-6 shadow-inner">
                        <Sparkles className="w-10 h-10 text-violet-500 dark:text-violet-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                        No Quizzes Available
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8">
                        There are no quizzes available to take right now. 
                        Check back later or explore your courses for upcoming quizzes.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate("/student/courses")}
                            className="btn btn-outline gap-2 rounded-xl border-slate-300 dark:border-slate-600"
                        >
                            <Calendar className="w-4 h-4" />
                            Browse Courses
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {availableQuizzes.map((quiz) => {
                        const isLocked = quiz.timingStatus === "upcoming";
                        const isClosed = quiz.timingStatus === "closed";

                        return (
                            <div
                                key={quiz._id}
                                className={`glass-card transition-all ${isLocked ? "opacity-75" : ""}`}
                            >
                                <div className="card-body p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className={`card-title text-lg ${isLocked ? "text-slate-500" : "text-slate-900 dark:text-white"}`}>
                                                    {quiz.title}
                                                </h3>
                                                {quiz.isAttempted && (
                                                    <span className="badge badge-success badge-sm shadow-sm gap-1 pl-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Attempted
                                                    </span>
                                                )}
                                                {isLocked && (
                                                    <span className="badge badge-neutral badge-sm shadow-sm gap-1 pl-1">
                                                        <Clock className="w-3 h-3" />
                                                        Upcoming
                                                    </span>
                                                )}
                                                {isClosed && (
                                                    <span className="badge badge-ghost badge-sm shadow-sm gap-1 pl-1 border-slate-300">
                                                        Closed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">
                                                {quiz.description}
                                            </p>
                                            <div className="flex flex-wrap gap-4 text-xs font-medium">
                                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                    <BookMarked className="w-4 h-4 text-blue-500" />
                                                    {quiz.course?.title}
                                                </div>
                                                <div className={`flex items-center gap-1 ${isLocked ? "text-blue-600 dark:text-blue-400 font-bold" : isClosed ? "text-red-500" : "text-slate-500"}`}>
                                                    <Clock className="w-4 h-4" />
                                                    {isLocked 
                                                        ? `Opens: ${new Date(quiz.openAt).toLocaleString()}` 
                                                        : isClosed 
                                                            ? `Closed: ${new Date(quiz.closeAt).toLocaleString()}`
                                                            : `Closes: ${new Date(quiz.closeAt).toLocaleString()}`
                                                    }
                                                </div>
                                                {quiz.questionsPerAttempt && (
                                                    <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                                        <span>🎲 {quiz.questionsPerAttempt} random questions</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <button
                                                onClick={(e) => handleClick(quiz._id, e)}
                                                disabled={startingQuizId === quiz._id || isLocked || isClosed}
                                                className={`btn gap-2 ml-4 shadow-lg min-w-[140px] ${
                                                    isLocked || isClosed
                                                        ? "btn-ghost bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none"
                                                        : quiz.isAttempted
                                                            ? "btn-outline dark:border-slate-600 dark:text-slate-300 shadow-none hover:bg-slate-50 dark:hover:bg-slate-800"
                                                            : "btn-success shadow-success/30 text-white"
                                                }`}
                                            >
                                                {startingQuizId === quiz._id ? (
                                                    <>
                                                        <span className="loading loading-spinner loading-xs"></span>
                                                        Starting...
                                                    </>
                                                ) : isLocked ? (
                                                    "Locked"
                                                ) : isClosed ? (
                                                    "Expired"
                                                ) : (
                                                    <>
                                                        <Zap className="w-5 h-5" />
                                                        {quiz.isAttempted ? "Retake" : "Start Quiz"}
                                                    </>
                                                )}
                                            </button>
                                            {isLocked && (
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-wider">Not yet open</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
