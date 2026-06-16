import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/Authstore";
import useTeacherStore from "../stores/Teacherstore";
import useQuizStore from "../stores/Quizstore";
import axios from "axios";
import toast from "react-hot-toast";
import ChatWindow from "../components/ChatWindow";
import PageWrapper from "../components/layout/PageWrapper";
import Leaderboard from "../components/Leaderboard";
import {
    BookOpen,
    Zap,
    MessageSquare,
    Plus,
    Trophy,
    TrendingUp,
} from "lucide-react";

import StudentStatsCards from "../components/student/StudentStatsCards";
import StudentCoursesTab from "../components/student/StudentCoursesTab";
import StudentQuizzesTab from "../components/student/StudentQuizzesTab";
import StudentGradesTab from "../components/student/StudentGradesTab";
import StudentCommunityTab from "../components/student/StudentCommunityTab";
import StudentChatsTab from "../components/student/StudentChatsTab";
import CourseContentModal from "../components/student/CourseContentModal";

function StudentPage() {
    const { token } = useAuthStore();
    const { allCourses, listMyCourses, listCourseNotes } = useTeacherStore();
    const {
        startAttempt,
        attemptError,
        myGrades,
        gradesLoading,
        gradesError,
        listMyGrades,
        availableQuizzes,
        fetchAvailableQuizzes,
    } = useQuizStore();
    const navigate = useNavigate();

    const [joinCode, setJoinCode] = useState("");
    const [activeTab, setActiveTab] = useState("courses");
    const [isLoading, setIsLoading] = useState(false);
    const [startingQuizId, setStartingQuizId] = useState(null);
    const [viewContentCourse, setViewContentCourse] = useState(null);
    const [courseContentNotes, setCourseContentNotes] = useState([]);
    const [contentNotesLoading, setContentNotesLoading] = useState(false);
    const [allCourseNotes, setAllCourseNotes] = useState([]);
    const [allNotesLoading, setAllNotesLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatCourseId, setChatCourseId] = useState(null);
    const [chatPeerId, setChatPeerId] = useState(null);
    const [chatPeerName, setChatPeerName] = useState("");

    const loadAllCourseNotes = useCallback(async () => {
        setAllNotesLoading(true);
        try {
            const allNotes = [];
            for (const course of allCourses) {
                const notes = await listCourseNotes(course._id);
                allNotes.push(...notes);
            }
            setAllCourseNotes(allNotes);
        } catch (err) {
            toast.error(err.message || "Failed to load notes");
            setAllCourseNotes([]);
        } finally {
            setAllNotesLoading(false);
        }
    }, [allCourses, listCourseNotes]);

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        listMyCourses();
        fetchAvailableQuizzes();
        listMyGrades();
    }, [token, navigate, fetchAvailableQuizzes, listMyCourses, listMyGrades]);

    useEffect(() => {
        if (activeTab === "quizzes") {
            fetchAvailableQuizzes();
            const interval = setInterval(fetchAvailableQuizzes, 30000);
            return () => clearInterval(interval);
        }
    }, [activeTab, fetchAvailableQuizzes]);

    useEffect(() => {
        if (activeTab === "grades") {
            listMyGrades();
        }
    }, [activeTab, listMyGrades]);

     
    useEffect(() => {
        if (activeTab === "community") {
            loadAllCourseNotes();
        }
    }, [activeTab, loadAllCourseNotes]);

    const loadCourseContentNotes = async (courseId) => {
        setContentNotesLoading(true);
        try {
            const notes = await listCourseNotes(courseId);
            setCourseContentNotes(notes);
        } catch (err) {
            console.error("Failed to load course notes:", err);
            setCourseContentNotes([]);
        } finally {
            setContentNotesLoading(false);
        }
    };

    const handleJoinCourse = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) {
            toast.error("Please enter a join code");
            return;
        }
        setIsLoading(true);
        try {
            const res = await axios.post(
                "/api/courses/join",
                { joinCode },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            setJoinCode("");
            
            // Add the new course directly to the state instead of waiting for fetch
            const newCourse = {
                ...res.data.course,
                enrolledAt: res.data.enrolledAt || new Date(),
            };
            
            // Update the store directly
            const currentCourses = useTeacherStore.getState().allCourses;
            useTeacherStore.getState().setAllCourses([...currentCourses, newCourse]);
            
            toast.success("Successfully joined course!");
        } catch (err) {
            toast.error(err.response?.data?.errMsg || "Failed to join course");
        } finally {
            setIsLoading(false);
        }
    };

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

    const availableGrades = myGrades.filter(g => g.score !== null);
    const avgScore =
        availableGrades.length > 0
            ? (
                  availableGrades.reduce((sum, g) => sum + g.score, 0) /
                  availableGrades.length
              ).toFixed(1)
            : 0;

    const unattemptedQuizzes = availableQuizzes.filter((q) => !q.isAttempted);

    return (
        <PageWrapper>
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <StudentStatsCards
                    allCourses={allCourses}
                    availableQuizzes={unattemptedQuizzes}
                    avgScore={avgScore}
                />

                {/* Join Course Section */}
                <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] mb-8">
                    <div className="px-5 py-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5 justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                                <Plus className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Join a New Course
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Enter the code provided by your teacher
                                </p>
                            </div>
                        </div>
                        <form
                            onSubmit={handleJoinCourse}
                            className="flex gap-3 w-full md:w-auto md:min-w-[400px]"
                        >
                            <input
                                type="text"
                                placeholder="e.g. MATH101"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                className="input w-full h-11 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-base-300/60 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-brand px-6 py-2.5 text-sm"
                            >
                                {isLoading ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                ) : (
                                    "Join"
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Pill Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar gap-1.5 mb-8 bg-slate-200/50 dark:bg-slate-800/30 p-1 rounded-xl w-max border border-slate-200 dark:border-slate-700/40">
                    {[
                        { id: "courses", label: "My Courses", icon: BookOpen },
                        { id: "quizzes", label: "Available Quizzes", icon: Zap },
                        { id: "leaderboard", label: "Leaderboard", icon: Trophy },
                        { id: "grades", label: "My Grades", icon: TrendingUp },
                        { id: "community", label: "Community Notes", icon: MessageSquare },
                        { id: "chats", label: "Chats", icon: MessageSquare },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                                activeTab === id
                                    ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/40"
                            }`}
                        >
                            <Icon
                                className={`w-4 h-4 ${activeTab === id ? "opacity-100" : "opacity-60"}`}
                            />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === "courses" && (
                    <StudentCoursesTab
                        allCourses={allCourses}
                        setChatCourseId={setChatCourseId}
                        setChatPeerId={setChatPeerId}
                        setChatPeerName={setChatPeerName}
                        setIsChatOpen={setIsChatOpen}
                        setViewContentCourse={setViewContentCourse}
                        loadCourseContentNotes={loadCourseContentNotes}
                    />
                )}

                {activeTab === "quizzes" && (
                    <StudentQuizzesTab
                        availableQuizzes={unattemptedQuizzes}
                        startingQuizId={startingQuizId}
                        handleStartQuiz={handleStartQuiz}
                    />
                )}

                {activeTab === "leaderboard" && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Trophy className="w-6 h-6 text-yellow-500" />
                                    Course Leaderboards
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    See how you rank against your peers
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-500">
                                    Select Course:
                                </span>
                                <select
                                    className="select select-bordered select-sm bg-white dark:bg-base-300 rounded-xl focus:ring-2 focus:ring-yellow-500/50"
                                    value={
                                        chatCourseId || allCourses[0]?._id || ""
                                    }
                                    onChange={(e) =>
                                        setChatCourseId(e.target.value)
                                    }
                                >
                                    {allCourses.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {allCourses.length > 0 ? (
                            <Leaderboard
                                courseId={chatCourseId || allCourses[0]._id}
                                isTeacher={false}
                            />
                        ) : (
                            <div className="text-center py-16 bg-white dark:bg-base-200 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/50">
                                <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium">
                                    Join a course to see the leaderboard!
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "grades" && (
                    <StudentGradesTab
                        gradesLoading={gradesLoading}
                        gradesError={gradesError}
                        myGrades={myGrades}
                        viewContentCourse={viewContentCourse}
                    />
                )}

                {activeTab === "community" && (
                    <StudentCommunityTab
                        allNotesLoading={allNotesLoading}
                        allCourseNotes={allCourseNotes}
                    />
                )}

                {activeTab === "chats" && (
                    <StudentChatsTab allCourses={allCourses} />
                )}
            </main>

            <CourseContentModal
                viewContentCourse={viewContentCourse}
                setViewContentCourse={setViewContentCourse}
                setCourseContentNotes={setCourseContentNotes}
                availableQuizzes={unattemptedQuizzes}
                startingQuizId={startingQuizId}
                handleStartQuiz={handleStartQuiz}
                contentNotesLoading={contentNotesLoading}
                courseContentNotes={courseContentNotes}
            />

            {isChatOpen && chatCourseId && chatPeerId && (
                <ChatWindow
                    courseId={chatCourseId}
                    peerId={chatPeerId}
                    peerName={chatPeerName}
                    onClose={() => {
                        setIsChatOpen(false);
                        setChatCourseId(null);
                        setChatPeerId(null);
                        setChatPeerName("");
                    }}
                />
            )}
        </PageWrapper>
    );
}

export default StudentPage;
