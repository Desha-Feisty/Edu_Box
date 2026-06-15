import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useTeacherStore from "../stores/Teacherstore";
import useQuizStore from "../stores/Quizstore";
import useAuthStore from "../stores/Authstore";
import ChatWindow from "../components/ChatWindow";
import toast from "react-hot-toast";
import {
    BookOpen,
    Users,
    Award,
    MessageSquare,
    Trophy,
    TrendingUp,
    Calendar,
} from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import Leaderboard from "../components/Leaderboard";

import CourseHeader from "../components/teacher/CourseHeader";
import CourseQuizzesTab from "../components/teacher/CourseQuizzesTab";
import CourseStudentsTab from "../components/teacher/CourseStudentsTab";
import CourseGradesTab from "../components/teacher/CourseGradesTab";
import CourseCommunityTab from "../components/teacher/CourseCommunityTab";
import CourseEventsTab from "../components/teacher/CourseEventsTab";
import TeacherChatTab from "../components/teacher/TeacherChatTab";

function TeacherCoursePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const {
        allCourses,
        updateCourse,
        deleteCourse,
        getCourse,
        getRoster,
        removeEnrollment,
    } = useTeacherStore();
    const {
        quizzes,
        listCourseQuizzes,
        deleteQuiz,
        publishQuiz,
        unpublishQuiz,
        listQuizGrades,
        quizGrades,
        gradesLoading,
        gradesError,
        errMsg: quizErrMsg,
        clearErrMsg: clearQuizErrMsg,
    } = useQuizStore();

    const [course, setCourse] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ title: "", description: "" });
    const [chatOpen, setChatOpen] = useState(false);
    const [chatCourseId, setChatCourseId] = useState(null);
    const [chatPeerId, setChatPeerId] = useState(null);
    const [chatPeerName, setChatPeerName] = useState("");
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [selectedQuizTitle, setSelectedQuizTitle] = useState("");
    const [activeTab, setActiveTab] = useState("quizzes");
    const [courseNotes, setCourseNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentGrades, setStudentGrades] = useState({});

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        const currentCourse = allCourses.find((c) => (c._id || c.id) === id);
        if (!currentCourse) {
            getCourse(id);
        }
        listCourseQuizzes(id);
    }, [id, token, navigate]);

    useEffect(() => {
        if (selectedQuiz) {
            listQuizGrades(selectedQuiz);
        }
    }, [selectedQuiz, listQuizGrades]);

    const loadCourseNotes = async () => {
        setNotesLoading(true);
        try {
            const notes = await useTeacherStore.getState().listCourseNotes(id);
            setCourseNotes(notes);
        } catch {
            toast.error("Failed to load notes");
        } finally {
            setNotesLoading(false);
        }
    };

    const loadEnrolledStudents = async () => {
        setStudentsLoading(true);
        try {
            const roster = await getRoster(id);
            const enrollment = roster?.enrollment || [];
            setEnrolledStudents(enrollment);

            // Load grades for each student
            const gradesMap = {};
            for (const student of enrollment) {
                try {
                    if (!student?.user?._id) continue;
                    const response = await fetch(
                        `/api/attempts/student/${student.user._id}/course/${id}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        },
                    );
                    if (response.ok) {
                        const data = await response.json();
                        gradesMap[student.user._id] = data.results || [];
                    } else {
                        console.error(
                            "Failed to load grades for student",
                            student.user._id,
                        );
                    }
                } catch (gradeErr) {
                    console.error(
                        "Error loading grades for student",
                        student.user._id,
                        gradeErr,
                    );
                }
            }
            setStudentGrades(gradesMap);
        } catch {
            toast.error("Failed to load students");
        } finally {
            setStudentsLoading(false);
        }
    };

     
    useEffect(() => {
        if (activeTab === "community") {
            loadCourseNotes();
        } else if (activeTab === "students") {
            loadEnrolledStudents();
        }
    }, [activeTab, loadCourseNotes, loadEnrolledStudents]);

    const handleRemoveStudent = async (studentId, studentName) => {
        if (
            window.confirm(
                `Remove ${studentName} from this course? They will lose access to all course materials.`,
            )
        ) {
            try {
                await removeEnrollment(id, studentId);
                toast.success("Student removed from course");
                // Reload the students list
                loadEnrolledStudents();
            } catch {
                toast.error("Failed to remove student");
            }
        }
    };

     
    useEffect(() => {
        const currentCourse = allCourses.find((c) => (c._id || c.id) === id);
        if (currentCourse) {
            setCourse(currentCourse);
            setEditData({
                title: currentCourse.title,
                description: currentCourse.description,
            });
        }
    }, [allCourses, id]);

    const handleUpdateCourse = async (e) => {
        e.preventDefault();
        setIsUpdatingCourse(true);
        try {
            await updateCourse(id, editData.title, editData.description);
            setIsEditing(false);
            toast.success("Course updated successfully");
        } catch {
            toast.error("Failed to update course");
        } finally {
            setIsUpdatingCourse(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (
            window.confirm(
                "Are you sure? This will delete the entire course and all associated data.",
            )
        ) {
            try {
                await deleteCourse(id);
                toast.success("Course deleted successfully");
                navigate("/teacher");
            } catch {
                toast.error("Failed to delete course");
            }
        }
    };

    const handlePublishQuiz = async (quizId) => {
        try {
            await publishQuiz(quizId);
            toast.success("Quiz published successfully");
        } catch (err) {
            toast.error(
                err.response?.data?.errMsg ||
                    err.message ||
                    "Failed to publish quiz",
            );
        }
    };

    const handleUnpublishQuiz = async (quizId) => {
        try {
            await unpublishQuiz(quizId);
            toast.success("Quiz unpublished successfully");
        } catch {
            toast.error("Failed to unpublish quiz");
        }
    };

    const handleDeleteQuiz = async (quizId) => {
        if (
            window.confirm(
                "Delete this quiz? All student attempts will be deleted.",
            )
        ) {
            try {
                await deleteQuiz(quizId);
                toast.success("Quiz deleted successfully");
            } catch {
                toast.error("Failed to delete quiz");
            }
        }
    };

    const handleCopyJoinCode = () => {
        navigator.clipboard.writeText(course.joinCode);
        toast.success("Join code copied to clipboard!");
    };

    if (!course)
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-base-300">
                <span className="loading loading-spinner loading-lg text-blue-600"></span>
            </div>
        );

    return (
        <PageWrapper>
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <CourseHeader
                    course={course}
                    navigate={navigate}
                    handleCopyJoinCode={handleCopyJoinCode}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    handleDeleteCourse={handleDeleteCourse}
                    handleUpdateCourse={handleUpdateCourse}
                    editData={editData}
                    setEditData={setEditData}
                    isUpdatingCourse={isUpdatingCourse}
                />

                {/* Quiz Error Alert */}
                {quizErrMsg && (
                    <div className="alert alert-error mb-4">
                        <span>{quizErrMsg}</span>
                        <button
                            onClick={clearQuizErrMsg}
                            className="btn btn-ghost btn-sm"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Teacher Store Error Alert */}
                {useTeacherStore.getState().errMsg && (
                    <div className="alert alert-error mb-8">
                        <span>{useTeacherStore.getState().errMsg}</span>
                        <button
                            onClick={() =>
                                useTeacherStore.getState().clearErrMsg()
                            }
                            className="btn btn-ghost btn-sm"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Modern Pill Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 bg-slate-200/50 dark:bg-base-300/50 p-1.5 rounded-2xl w-max border border-slate-200 dark:border-slate-700/50">
                    {[
                        { id: "quizzes", label: "Quizzes", icon: BookOpen },
                        { id: "events", label: "Events", icon: Calendar },
                        {
                            id: "analytics",
                            label: "Analytics",
                            icon: TrendingUp,
                        },
                        {
                            id: "leaderboard",
                            label: "Leaderboard",
                            icon: Trophy,
                        },
                        { id: "students", label: "Students", icon: Users },
                        { id: "grades", label: "Student Grades", icon: Award },
                        {
                            id: "community",
                            label: "Community Notes",
                            icon: MessageSquare,
                        },
                        {
                            id: "chat",
                            label: "Chat",
                            icon: MessageSquare,
                        },
                    ].map(({ id: tabId, label, icon: TabIcon }) => (
                        <button
                            key={tabId}
                            onClick={() => setActiveTab(tabId)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                                activeTab === tabId
                                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
                            }`}
                        >
                            <TabIcon
                                className={`w-4 h-4 ${activeTab === tabId ? "opacity-100" : "opacity-70"}`}
                            />
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === "quizzes" && (
                    <CourseQuizzesTab
                        quizzes={quizzes}
                        navigate={navigate}
                        handlePublishQuiz={handlePublishQuiz}
                        handleUnpublishQuiz={handleUnpublishQuiz}
                        handleDeleteQuiz={handleDeleteQuiz}
                        courseId={id}
                    />
                )}

                {activeTab === "events" && (
                    <CourseEventsTab
                        courseId={id}
                        course={course}
                    />
                )}

                {activeTab === "analytics" && (
                    <div className="animate-in fade-in duration-500">
                        <AnalyticsDashboard courseId={id} mode="teacher" />
                    </div>
                )}

                {activeTab === "leaderboard" && (
                    <div className="animate-in fade-in duration-500">
                        <Leaderboard courseId={id} isTeacher={true} />
                    </div>
                )}

                {activeTab === "students" && (
                    <CourseStudentsTab
                        studentsLoading={studentsLoading}
                        enrolledStudents={enrolledStudents}
                        studentGrades={studentGrades}
                        courseId={id}
                        setChatCourseId={setChatCourseId}
                        setChatPeerId={setChatPeerId}
                        setChatPeerName={setChatPeerName}
                        setChatOpen={setChatOpen}
                        handleRemoveStudent={handleRemoveStudent}
                    />
                )}

                {activeTab === "grades" && (
                    <CourseGradesTab
                        quizzes={quizzes}
                        selectedQuiz={selectedQuiz}
                        setSelectedQuiz={setSelectedQuiz}
                        selectedQuizTitle={selectedQuizTitle}
                        setSelectedQuizTitle={setSelectedQuizTitle}
                        gradesLoading={gradesLoading}
                        gradesError={gradesError}
                        quizGrades={quizGrades}
                        courseId={id}
                    />
                )}

                {activeTab === "community" && (
                    <CourseCommunityTab
                        courseId={id}
                        loadCourseNotes={loadCourseNotes}
                        notesLoading={notesLoading}
                        courseNotes={courseNotes}
                    />
                )}

                {activeTab === "chat" && <TeacherChatTab />}
            </main>

            {chatOpen && chatCourseId && chatPeerId && (
                <ChatWindow
                    courseId={chatCourseId}
                    peerId={chatPeerId}
                    peerName={chatPeerName}
                    onClose={() => {
                        setChatOpen(false);
                        setChatCourseId(null);
                        setChatPeerId(null);
                        setChatPeerName("");
                    }}
                />
            )}
        </PageWrapper>
    );
}

export default TeacherCoursePage;
