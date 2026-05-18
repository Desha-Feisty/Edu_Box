import { Zap, Clock, BookMarked, CheckCircle } from "lucide-react";

export default function StudentQuizzesTab({
    availableQuizzes,
    startingQuizId,
    handleStartQuiz
}) {
    const handleClick = (quizId) => {
        if (handleStartQuiz && typeof handleStartQuiz === 'function') {
            handleStartQuiz(quizId);
        }
    };
    
    return (
        <div>
            {availableQuizzes.length === 0 ? (
                <div className="card bg-yellow-50 border border-yellow-200 border-dashed">
                    <div className="card-body text-center py-12">
                        <Zap className="w-16 h-16 text-yellow-300 mx-auto mb-4" />
                        <p className="text-gray-600">
                            No quizzes currently available to take.
                        </p>
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
