import { useEffect, useState } from "react";
import useTeacherStore from "../stores/Teacherstore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Plus,
    Trash2,
    BookOpen,
    Users,
    ArrowRight,
    MessageSquare,
} from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";
import ChatWindow from "../components/ChatWindow";

function TeacherPage() {
    const {
        allCourses,
        listMyCourses,
        createCourse,
        deleteCourse,
        recentChats,
        recentChatsLoading,
        listRecentChats,
    } = useTeacherStore();

    const navigate = useNavigate();

    const [newCourse, setNewCourse] = useState({ title: "", description: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [chatOpen, setChatOpen] = useState(false);
    const [chatCourseId, setChatCourseId] = useState(null);
    const [chatPeerId, setChatPeerId] = useState(null);
    const [chatPeerName, setChatPeerName] = useState("");

    useEffect(() => {
        // Small delay to allow auth store to rehydrate from localStorage
        const timer = setTimeout(() => {
            listMyCourses();
            listRecentChats();
        }, 200);
        return () => clearTimeout(timer);
    }, []);

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        if (!newCourse.title.trim() || !newCourse.description.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            await createCourse(newCourse.title, newCourse.description);
            toast.success("Course created successfully!");
            setNewCourse({ title: "", description: "" });
            setShowForm(false);
} catch {
                toast.error("Failed to create course");
            } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCourse = async (id) => {
        if (
            window.confirm(
                "Are you sure? This will delete all quizzes and enrollments.",
            )
        ) {
            try {
                await deleteCourse(id);
                toast.success("Course deleted successfully");
            } catch {
                toast.error("Failed to delete course");
            }
        }
    };

    return (
        <PageWrapper>
            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12 animate-in fade-in duration-500 w-full relative z-10">
                {/* Header Section */}
                <div className="mb-12">
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        Teacher Dashboard
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage your courses and track student progress
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-10">
                    <div
                        className="relative bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06] cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        onClick={() =>
                            document
                                .getElementById("courses-section")
                                ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                })
                        }
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    Total Courses
                                </p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {allCourses.length}
                                </p>
                                <p className="text-xs text-brand-600 dark:text-brand-400 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click to view ↓
                                </p>
                            </div>
                            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl group-hover:scale-110 transition-transform">
                                <BookOpen className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                            </div>
                        </div>
                    </div>

                    <div className="relative bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    Active Students
                                </p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {allCourses.reduce(
                                        (sum, course) =>
                                            sum +
                                            (course.enrollmentCount || 0),
                                        0,
                                    )}
                                </p>
                            </div>
                            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                                <Users className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                            </div>
                        </div>
                    </div>

                    <div
                        className="relative bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06] group cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    Quick Action
                                </p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                    Create Course
                                </p>
                            </div>
                            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl group-hover:scale-110 transition-transform">
                                <Plus className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create Course Form */}
                {showForm && (
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] mb-10">
                        <div className="p-5 sm:p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-lg">
                                    <Plus className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Create New Course
                                </h3>
                            </div>

                            <form onSubmit={handleCreateCourse} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Course Title
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Advanced React Patterns"
                                        className="input w-full h-11 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-base-300/60 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                                        value={newCourse.title}
                                        onChange={(e) =>
                                            setNewCourse({
                                                ...newCourse,
                                                title: e.target.value,
                                            })
                                        }
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        placeholder="Describe what students will learn..."
                                        className="textarea w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-base-300/60 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all min-h-[96px]"
                                        value={newCourse.description}
                                        onChange={(e) =>
                                            setNewCourse({
                                                ...newCourse,
                                                description: e.target.value,
                                            })
                                        }
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn-brand px-5 py-2.5 text-sm"
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4.5 h-4.5" />
                                                Create Course
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="btn-ghost-neutral px-5 py-2.5 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Recent Chats Section */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            Recent Chats
                        </h3>
                    </div>

                    {recentChatsLoading ? (
                        <div className="flex justify-center p-6">
                            <span className="loading loading-spinner text-brand-500"></span>
                        </div>
                    ) : recentChats?.length === 0 ? (
                        <div className="text-slate-500 dark:text-slate-400 italic p-6 rounded-xl bg-white dark:bg-base-200 border border-dashed border-slate-200 dark:border-slate-700/50 text-center text-sm">
                            No recent chats yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recentChats.map((chat) => (
                                <div
                                    key={chat._id || `${chat.courseId}-${chat.peerId}`}
                                    className="bg-white dark:bg-base-200 rounded-xl p-4 border border-slate-200/60 dark:border-white/[0.06] cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                    onClick={() => {
                                        setChatCourseId(chat.courseId);
                                        setChatPeerId(chat.peerId);
                                        setChatPeerName(
                                            chat.peer?.name || "Student",
                                        );
                                        setChatOpen(true);
                                    }}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                                                {chat.peer?.name || "Unknown"}
                                            </h4>
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                                                {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString("en-GB") : "N/A"}
                                            </span>
                                        </div>
                                        <div className="text-xs text-brand-600 dark:text-brand-400 font-medium mb-2">
                                            {chat.course?.title || "Course"}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/30">
                                            {chat.isMine ? (
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    You:{" "}
                                                </span>
                                            ) : null}
                                            {chat.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Courses Grid */}
                <div id="courses-section">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-lg">
                            <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            Your Courses
                        </h3>
                    </div>

                    {allCourses.length === 0 ? (
                        <div className="bg-white dark:bg-base-200 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/50 p-10 text-center">
                            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-600 dark:text-slate-400 font-medium mb-4">
                                No courses yet. Start teaching by creating your first course!
                            </p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn-brand px-5 py-2.5 text-sm"
                            >
                                <Plus className="w-4.5 h-4.5" />
                                Create First Course
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allCourses.map((course) => (
                                <div
                                    key={course._id || course.id}
                                    className="bg-white dark:bg-base-200 rounded-xl border border-slate-200/60 dark:border-white/[0.06] group cursor-pointer overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    <div
                                        className="p-5 flex flex-col grow"
                                        onClick={() =>
                                            navigate(
                                                `/teacher/course/${course._id || course.id}`,
                                            )
                                        }
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1 text-base">
                                                {course.title}
                                            </h4>
                                            <div className="badge badge-primary badge-sm shadow-sm ml-2 shrink-0 bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border-none text-xs">
                                                {course.joinCode}
                                            </div>
                                        </div>

                                        <p className="text-slate-500 dark:text-slate-400 text-sm grow line-clamp-2 mb-4">
                                            {course.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.04] mt-auto">
                                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded-full">
                                                <Users className="w-3.5 h-3.5 mr-1.5" />
                                                {course.enrollmentCount || 0}
                                            </div>
                                            <ArrowRight className="w-4.5 h-4.5 text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>

                                    {/* Delete Button on Hover */}
                                    <div className="px-5 pb-5 pt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCourse(
                                                    course._id || course.id,
                                                );
                                            }}
                                            className="btn-ghost-neutral w-full !text-red-500 !hover:bg-red-50 dark:!hover:bg-red-900/20 !border !border-red-200 dark:!border-red-800/30 text-xs py-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Course
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Chat Window */}
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

export default TeacherPage;
