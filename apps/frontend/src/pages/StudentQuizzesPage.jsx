import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/Authstore";
import useQuizStore from "../stores/Quizstore";
import toast from "react-hot-toast";
import StudentQuizzesTab from "../components/student/StudentQuizzesTab";

function StudentQuizzesPage() {
    const { token } = useAuthStore();
    const {
        startAttempt,
        attemptError,
        availableQuizzes,
        fetchAvailableQuizzes,
    } = useQuizStore();
    const navigate = useNavigate();

    const [startingQuizId, setStartingQuizId] = useState(null);

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        fetchAvailableQuizzes();
    }, [token, navigate, fetchAvailableQuizzes]);

    useEffect(() => {
        const interval = setInterval(fetchAvailableQuizzes, 30000);
        return () => clearInterval(interval);
    }, [fetchAvailableQuizzes]);

    const handleStartQuiz = async (quizId) => {
        setStartingQuizId(quizId);
        try {
            const result = await startAttempt(quizId);
            if (result && result.attempt) {
                navigate(`/student/quiz/${result.attempt._id}`);
            } else {
                toast.error(attemptError || "Failed to start quiz");
            }
        } catch (err) {
            toast.error(
                err.message || "An error occurred while starting the quiz",
            );
        } finally {
            setStartingQuizId(null);
        }
    };

    const unattemptedQuizzes = availableQuizzes.filter((q) => !q.isAttempted);

    return (
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Available Quizzes
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Take quizzes to test your knowledge
                    </p>
                </div>

                <StudentQuizzesTab
                    availableQuizzes={unattemptedQuizzes}
                    startingQuizId={startingQuizId}
                    handleStartQuiz={handleStartQuiz}
                />
            </main>
    );
}

export default StudentQuizzesPage;