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
} from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";

function TeacherCoursesPage() {
    const {
        allCourses,
        listMyCourses,
        createCourse,
        deleteCourse,
    } = useTeacherStore();

    const navigate = useNavigate();

    const [newCourse, setNewCourse] = useState({ title: "", description: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            listMyCourses();
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
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        My Courses
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Create and manage your courses
                    </p>
                </div>

                {/* Create Course Button */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn-brand"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create New Course
                    </button>
                </div>

                {/* Create Course Form */}
                {showForm && (
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 mb-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            Create New Course
                        </h3>
                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Course Title</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Introduction to Mathematics"
                                        className="input input-bordered rounded-xl"
                                        value={newCourse.title}
                                        onChange={(e) =>
                                            setNewCourse({ ...newCourse, title: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Join Code</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., MATH101"
                                        className="input input-bordered rounded-xl bg-slate-100 dark:bg-slate-800"
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Description</span>
                                </label>
                                <textarea
                                    placeholder="Describe what students will learn..."
                                    className="textarea textarea-bordered rounded-xl"
                                    value={newCourse.description}
                                    onChange={(e) =>
                                        setNewCourse({ ...newCourse, description: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-brand"
                                >
                                    {isLoading ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        "Create Course"
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn btn-ghost rounded-xl"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Courses Grid */}
                {allCourses.length === 0 ? (
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-dashed border-slate-200/60 dark:border-white/[0.06] p-12 text-center">
                        <BookOpen className="w-16 h-16 text-brand-300 dark:text-brand-600 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">
                            You haven't created any courses yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allCourses.map((course) => (
                            <div
                                key={course._id}
                                className="glass-card group hover:scale-[1.02] transition-all"
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-1">
                                            {course.title}
                                        </h3>
                                        <button
                                            onClick={() => handleDeleteCourse(course._id)}
                                            className="btn btn-ghost btn-sm btn-circle text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                                        {course.description}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            {course.enrollmentCount || 0} students
                                        </span>
                                        <span className="badge bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium border-0 badge-sm">
                                            Active
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/teacher/course/${course._id}`)}
                                        className="btn btn-outline btn-sm w-full rounded-xl group-hover:bg-brand-600 group-hover:text-white transition-colors"
                                    >
                                        Manage Course
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </PageWrapper>
    );
}

export default TeacherCoursesPage;