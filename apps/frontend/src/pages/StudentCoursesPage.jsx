import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/Authstore";
import useTeacherStore from "../stores/Teacherstore";
import axios from "axios";
import toast from "react-hot-toast";
import StudentCoursesTab from "../components/student/StudentCoursesTab";
import ChatWindow from "../components/ChatWindow";
import NoteCard from "../components/NoteCard";
import { Modal } from "../components/common/Modal";
import { Plus, BookOpen } from "lucide-react";

function StudentCoursesPage() {
    const { token } = useAuthStore();
    const { allCourses, listMyCourses, listCourseNotes } = useTeacherStore();
    const navigate = useNavigate();

    const [joinCode, setJoinCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [contentModalCourse, setContentModalCourse] = useState(null);
    const [contentNotes, setContentNotes] = useState([]);
    const [contentNotesLoading, setContentNotesLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatCourseId, setChatCourseId] = useState(null);
    const [chatPeerId, setChatPeerId] = useState(null);
    const [chatPeerName, setChatPeerName] = useState("");

    const loadCourseContentNotes = async (courseId) => {
        setContentNotesLoading(true);
        try {
            const notes = await listCourseNotes(courseId);
            setContentNotes(notes);
        } catch (err) {
            console.error("Failed to load course notes:", err);
            setContentNotes([]);
        } finally {
            setContentNotesLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        listMyCourses();
    }, [token, navigate, listMyCourses]);

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

            const newCourse = {
                ...res.data.course,
                enrolledAt: res.data.enrolledAt || new Date(),
            };

            const currentCourses = useTeacherStore.getState().allCourses;
            useTeacherStore.getState().setAllCourses([...currentCourses, newCourse]);

            toast.success("Successfully joined course!");
        } catch (err) {
            toast.error(err.response?.data?.errMsg || "Failed to join course");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        My Courses
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Manage your enrolled courses
                    </p>
                </div>

                {/* Join Course Section */}
                <div className="bg-white dark:bg-base-200 rounded-2xl mb-10 border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
                    <div className="px-6 py-5 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-100 dark:bg-brand-900/40 rounded-xl">
                                <Plus className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
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
                                className="input input-bordered flex-1 bg-white/50 dark:bg-base-300/50 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-brand"
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

                {/* Courses Grid */}
                <StudentCoursesTab
                    allCourses={allCourses}
                    setChatCourseId={setChatCourseId}
                    setChatPeerId={setChatPeerId}
                    setChatPeerName={setChatPeerName}
                    setIsChatOpen={setIsChatOpen}
                    setViewContentCourse={setContentModalCourse}
                    loadCourseContentNotes={loadCourseContentNotes}
                />
            </main>

            {/* View Content Modal */}
            <Modal
                isOpen={!!contentModalCourse}
                onClose={() => setContentModalCourse(null)}
                title={contentModalCourse?.title || "Course Content"}
                size="xl"
            >
                {contentNotesLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <span className="loading loading-spinner loading-lg text-brand-500" />
                    </div>
                ) : contentNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No content available yet</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">Check back later for notes and materials</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {contentNotes.map((note) => (
                            <NoteCard key={note._id} note={note} isTeacher={false} />
                        ))}
                    </div>
                )}
            </Modal>

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
        </>
    );
}

export default StudentCoursesPage;