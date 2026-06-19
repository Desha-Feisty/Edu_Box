import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/Authstore";
import useQuizStore from "../stores/Quizstore";
import StudentGradesTab from "../components/student/StudentGradesTab";

function StudentGradesPage() {
    const { token } = useAuthStore();
    const {
        gradesLoading,
        gradesError,
        myGrades,
        listMyGrades,
    } = useQuizStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        listMyGrades();
    }, [token, navigate, listMyGrades]);

    return (
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        My Grades
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        View your quiz results and performance
                    </p>
                </div>

                <StudentGradesTab
                    gradesLoading={gradesLoading}
                    gradesError={gradesError}
                    myGrades={myGrades}
                    viewContentCourse={null}
                />
            </main>
    );
}

export default StudentGradesPage;