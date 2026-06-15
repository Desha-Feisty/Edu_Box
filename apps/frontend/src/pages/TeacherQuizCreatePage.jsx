import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
    BookOpen,
    Users,
    FileQuestion,
    Clock,
    Repeat,
    BarChart3,
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    Sparkles,
} from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";
import useAuthStore from "../stores/Authstore";
import useTeacherStore from "../stores/Teacherstore";
import useQuizStore from "../stores/Quizstore";

const STEPS = [
    { id: 1, label: "Course", icon: BookOpen },
    { id: 2, label: "Details", icon: FileQuestion },
];

export default function TeacherQuizCreatePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useAuthStore((state) => state.token);
    const { allCourses, listMyCourses } = useTeacherStore();
    const { createQuiz, updateQuiz, getQuiz } = useQuizStore();

    const preselectedCourseId = searchParams.get("courseId");
    const editQuizId = searchParams.get("editQuizId");
    const isEditing = !!editQuizId;

    const [step, setStep] = useState(preselectedCourseId ? 2 : 1);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
    const [newQuiz, setNewQuiz] = useState({
        title: "",
        description: "",
        openAt: "",
        closeAt: "",
        durationMinutes: 30,
        attemptsAllowed: 1,
        gradingMode: "onSubmit",
        questionsPerAttempt: "",
    });

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        const loadData = async () => {
            setIsLoading(true);
            await listMyCourses();
            setIsLoading(false);
        };
        loadData();
    }, [token, navigate, listMyCourses]);

     
    useEffect(() => {
        if (preselectedCourseId && allCourses.length > 0) {
            const course = allCourses.find((c) => (c._id || c.id) === preselectedCourseId);
            if (course) {
                setSelectedCourse(course);
            }
        }
    }, [preselectedCourseId, allCourses]);

    // S3-6: Edit mode — fetch existing quiz data to pre-populate form
    useEffect(() => {
        if (!editQuizId || !allCourses.length) return;
        const loadQuiz = async () => {
            setIsLoading(true);
            try {
                const quiz = await getQuiz(editQuizId);
                // Pre-populate form fields
                setNewQuiz({
                    title: quiz.title || "",
                    description: quiz.description || "",
                    openAt: quiz.openAt ? quiz.openAt.slice(0, 16) : "",
                    closeAt: quiz.closeAt ? quiz.closeAt.slice(0, 16) : "",
                    durationMinutes: quiz.durationMinutes || 30,
                    attemptsAllowed: quiz.attemptsAllowed || 1,
                    gradingMode: quiz.gradingMode || "onSubmit",
                    questionsPerAttempt: quiz.questionsPerAttempt ?? "",
                });
                // Find and select the course
                const cId = typeof quiz.course === "object" ? (quiz.course._id || quiz.course.id) : quiz.course;
                const course = allCourses.find((c) => (c._id || c.id) === cId);
                if (course) {
                    setSelectedCourse(course);
                }
            } catch (_) {
                toast.error("Failed to load quiz for editing");
                navigate("/teacher");
            } finally {
                setIsLoading(false);
            }
        };
        loadQuiz();
    }, [editQuizId, allCourses, getQuiz, navigate]);

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        if (!selectedCourse) {
            toast.error("Please select a course first");
            setStep(1);
            return;
        }
        if (!newQuiz.title.trim()) {
            toast.error("Quiz title is required");
            setStep(2);
            return;
        }

        // B2: Frontend date validation
        if (newQuiz.openAt) {
            const openDate = new Date(newQuiz.openAt);
            if (openDate <= new Date()) {
                toast.error("Open date must be in the future");
                return;
            }
        }
        if (newQuiz.closeAt && newQuiz.openAt) {
            const closeDate = new Date(newQuiz.closeAt);
            const openDate = new Date(newQuiz.openAt);
            if (closeDate <= openDate) {
                toast.error("Close date must be after open date");
                return;
            }
        }

        const courseId = selectedCourse._id || selectedCourse.id;
        if (!courseId) {
            toast.error("Invalid course selected");
            setStep(1);
            return;
        }
        setIsCreatingQuiz(true);
        try {
            if (isEditing) {
                await updateQuiz(editQuizId, newQuiz);
                toast.success("Quiz updated successfully");
                navigate(`/teacher/quiz/${editQuizId}/questions`);
            } else {
                const result = await createQuiz(courseId, newQuiz);
                toast.success("Quiz created successfully");
                navigate(`/teacher/quiz/${result.quiz._id}/questions`);
            }
        } catch (err) {
            toast.error(err.message || (isEditing ? "Failed to update quiz" : "Failed to create quiz"));
        } finally {
            setIsCreatingQuiz(false);
        }
    };

    const selectCourse = (course) => {
        setSelectedCourse(course);
        setStep(2);
    };

    const goBack = () => setStep(1);

    if (isLoading) {
        return (
            <PageWrapper>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-10 h-10 border-4 border-violet-200 dark:border-violet-700 border-t-violet-600 rounded-full animate-spin" />
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {isEditing ? "Edit Quiz" : "Create Quiz"}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {isEditing ? "Update your quiz settings" : "Set up a new quiz for your students"}
                    </p>
                </div>

                {/* Step Indicator */}
                <div className="bg-white dark:bg-base-200 rounded-2xl p-2 mb-8 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        {STEPS.map((s, idx) => {
                            const Icon = s.icon;
                            const isActive = step === s.id;
                            const isCompleted = step > s.id;
                            return (
                                <div key={s.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                                isActive
                                                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                                                    : isCompleted
                                                        ? "bg-green-500 text-white"
                                                        : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                <Icon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <span
                                            className={`text-sm font-medium ${
                                                isActive
                                                    ? "text-violet-600 dark:text-violet-400"
                                                    : isCompleted
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-slate-400 dark:text-slate-500"
                                            }`}
                                        >
                                            {s.label}
                                        </span>
                                    </div>
                                    {idx < STEPS.length - 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-4 rounded-full transition-colors ${
                                                isCompleted
                                                    ? "bg-green-500"
                                                    : "bg-slate-200 dark:bg-slate-700"
                                            }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step 1: Course Selection */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Select a Course
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Choose which course this quiz belongs to
                                </p>
                            </div>
                        </div>

                        {allCourses.length === 0 ? (
                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-12 text-center">
                                <BookOpen className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                                <p className="text-slate-600 dark:text-slate-300 mb-4">
                                    No courses yet. Create one first.
                                </p>
                                <button
                                    onClick={() => navigate("/teacher/courses")}
                                    className="btn btn-primary rounded-xl"
                                >
                                    Go to Courses
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {allCourses.map((course) => (
                                    <button
                                        key={course._id}
                                        onClick={() => selectCourse(course)}
                                        className="bg-white dark:bg-base-200 rounded-2xl p-6 text-left border border-slate-100 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-lg hover:shadow-violet-500/10 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                                <BookOpen className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 dark:group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                            {course.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                                            {course.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                {course.enrollmentCount || 0}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileQuestion className="w-3.5 h-3.5" />
                                                {course.quizCount || 0}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Quiz Details */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Selected Course Badge */}
                        <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border border-violet-200 dark:border-violet-500/30 rounded-2xl p-4 mb-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                            {isEditing ? "Editing quiz for" : "Creating quiz for"}
                                        </p>
                                        <p className="font-bold text-slate-900 dark:text-white">
                                            {selectedCourse?.title}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={goBack}
                                    className="btn btn-ghost btn-sm text-slate-500 hover:text-violet-600 dark:hover:text-violet-400"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Change
                                </button>
                            </div>
                        </div>

                        {/* Quiz Form */}
                        <form onSubmit={handleCreateQuiz}>
                            <div className="bg-white dark:bg-base-200 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                            <FileQuestion className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                                Quiz Details
                                            </h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Configure your quiz settings
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Title & Description */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                                    Quiz Title
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={newQuiz.title}
                                                onChange={(e) =>
                                                    setNewQuiz({ ...newQuiz, title: e.target.value })}
                                                className="input input-bordered rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-violet-500/20"
                                                placeholder="e.g., Midterm Exam"
                                            />
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                                    Grading Mode
                                                </span>
                                            </label>
                                            <select
                                                value={newQuiz.gradingMode}
                                                onChange={(e) =>
                                                    setNewQuiz({ ...newQuiz, gradingMode: e.target.value })}
                                                className="select select-bordered rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-violet-500/20"
                                            >
                                                <option value="onSubmit">Grade immediately</option>
                                                <option value="onClose">Grade when quiz closes</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                                Description
                                            </span>
                                        </label>
                                        <textarea
                                            value={newQuiz.description}
                                            onChange={(e) =>
                                                setNewQuiz({ ...newQuiz, description: e.target.value })}
                                            className="textarea textarea-bordered rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-violet-500/20 h-24"
                                            placeholder="Optional description for students..."
                                        />
                                    </div>

                                    {/* Schedule */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">
                                            Schedule
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium text-slate-700 dark:text-slate-300">
                                                        <Clock className="w-4 h-4 inline mr-1 text-green-500" />
                                                        Open Date
                                                    </span>
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    required
                                                    value={newQuiz.openAt}
                                                    onChange={(e) =>
                                                        setNewQuiz({ ...newQuiz, openAt: e.target.value })}
                                                    className="input input-bordered rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-violet-500/20"
                                                />
                                            </div>
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium text-slate-700 dark:text-slate-300">
                                                        <Clock className="w-4 h-4 inline mr-1 text-red-500" />
                                                        Close Date
                                                    </span>
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    required
                                                    value={newQuiz.closeAt}
                                                    onChange={(e) =>
                                                        setNewQuiz({ ...newQuiz, closeAt: e.target.value })}
                                                    className="input input-bordered rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-violet-500/20"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quiz Settings */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">
                                            Settings
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium text-slate-700 dark:text-slate-300">
                                                        Duration (min)
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={newQuiz.durationMinutes}
                                                        onChange={(e) =>
                                                            setNewQuiz({ ...newQuiz, durationMinutes: parseInt(e.target.value) })}
                                                        className="input input-bordered rounded-xl h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-violet-500/20 w-full text-center"
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium text-slate-700 dark:text-slate-300">
                                                        Attempts
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <Repeat className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={newQuiz.attemptsAllowed}
                                                        onChange={(e) =>
                                                            setNewQuiz({ ...newQuiz, attemptsAllowed: parseInt(e.target.value) })}
                                                        className="input input-bordered rounded-xl h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-violet-500/20 w-full text-center"
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium text-slate-700 dark:text-slate-300">
                                                        Questions/Attempt
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <BarChart3 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="All"
                                                        value={newQuiz.questionsPerAttempt}
                                                        onChange={(e) =>
                                                            setNewQuiz({
                                                                ...newQuiz,
                                                                questionsPerAttempt: e.target.value === "" ? "" : parseInt(e.target.value),
                                                            })}
                                                        className="input input-bordered rounded-xl h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-violet-500/20 w-full text-center"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Preview */}
                                <div className="p-6 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-t border-violet-100 dark:border-violet-500/30">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-violet-500" />
                                        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                                            Quiz Preview
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-violet-100 dark:border-violet-500/30">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Course</p>
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                                {selectedCourse?.title}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-violet-100 dark:border-violet-500/30">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Title</p>
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                                {newQuiz.title || "—"}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-violet-100 dark:border-violet-500/30">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Duration</p>
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                {newQuiz.durationMinutes} min
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-violet-100 dark:border-violet-500/30">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Attempts</p>
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                {newQuiz.attemptsAllowed}x
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        className="btn btn-ghost text-slate-600 dark:text-slate-400"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreatingQuiz || !newQuiz.title.trim()}
                                        className="btn btn-primary rounded-xl px-8 shadow-lg shadow-violet-500/20"
                                    >
                                        {isCreatingQuiz ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm" />
                                                {isEditing ? "Saving..." : "Creating..."}
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                {isEditing ? "Save Changes" : "Create Quiz"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </PageWrapper>
    );
}
