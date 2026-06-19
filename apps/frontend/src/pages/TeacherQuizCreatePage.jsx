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
import useAuthStore from "../stores/Authstore";
import useTeacherStore from "../stores/Teacherstore";
import useQuizStore from "../stores/Quizstore";

const STEPS = [
    { id: 1, label: "Course", icon: BookOpen },
    { id: 2, label: "Basics", icon: FileQuestion },
    { id: 3, label: "Schedule", icon: Clock },
    { id: 4, label: "Review", icon: CheckCircle },
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
    const [dateErrors, setDateErrors] = useState({ openAt: "", closeAt: "" });
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

    const validateDates = () => {
        const errors = { openAt: "", closeAt: "" };
        if (newQuiz.openAt) {
            const openDate = new Date(newQuiz.openAt);
            if (openDate.getTime() < Date.now() - 60000) {
                errors.openAt = "Open date must be in the future or within 60 seconds";
            }
        }
        if (newQuiz.closeAt && newQuiz.openAt) {
            const closeDate = new Date(newQuiz.closeAt);
            const openDate = new Date(newQuiz.openAt);
            if (closeDate <= openDate) {
                errors.closeAt = "Close date must be after open date";
            }
        }
        setDateErrors(errors);
        return !errors.openAt && !errors.closeAt;
    };

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

        // Validate dates with inline error display
        if (!validateDates()) return;

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

    const goBack = () => setStep((s) => Math.max(s - 1, 1));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-brand-200 dark:border-brand-700 border-t-brand-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
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

                {/* Step Indicator — hidden when course is preselected */}
                {!preselectedCourseId && (
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
                                                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
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
                                                        ? "text-brand-600 dark:text-brand-400"
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
                )}

                {/* Step 1: Course Selection */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
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
                                    className="btn-brand"
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
                                        className="bg-white dark:bg-base-200 rounded-2xl p-6 text-left border border-slate-100 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg hover:shadow-brand-500/10 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                                <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 dark:group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
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

                {/* Step 2: Basics */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Selected Course Badge */}
                        <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-500/10 dark:to-brand-500/20 border border-brand-200 dark:border-brand-500/30 rounded-2xl p-4 mb-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                                            {isEditing ? "Editing quiz for" : "Creating quiz for"}
                                        </p>
                                        <p className="font-bold text-slate-900 dark:text-white">
                                            {selectedCourse?.title}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={goBack}
                                    className="btn btn-ghost btn-sm text-slate-500 hover:text-brand-600 dark:hover:text-brand-400"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Change
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-base-200 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                        <FileQuestion className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                            Basics
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Basic quiz information
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Title & Grading Mode */}
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
                                            className="input input-bordered rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20"
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
                                            className="select select-bordered rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20"
                                        >
                                            <option value="onSubmit">Grade immediately</option>
                                            <option value="onClose">Grade when quiz closes</option>
                                        </select>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 ml-1 leading-relaxed">
                                            <strong>Grade immediately:</strong> students see results right after submitting &middot;
                                            <strong>Grade when close:</strong> results shown after the quiz window closes
                                        </p>
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
                                        className="textarea textarea-bordered rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20 h-24"
                                        placeholder="Optional description for students..."
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    disabled={!newQuiz.title.trim()}
                                    className="btn-brand gap-2"
                                >
                                    Next: Schedule
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Schedule & Settings */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Compact Course Badge */}
                        <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-500/10 dark:to-brand-500/20 border border-brand-200 dark:border-brand-500/30 rounded-2xl p-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                                        Course
                                    </p>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        {selectedCourse?.title}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-base-200 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                            Schedule & Settings
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Configure timing and rules
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Schedule */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Schedule
                                        </h3>
                                        <div className="space-y-4">
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
                                                    onChange={(e) => {
                                                        setNewQuiz({ ...newQuiz, openAt: e.target.value });
                                                        if (dateErrors.openAt) setDateErrors((p) => ({ ...p, openAt: "" }));
                                                    }}
                                                    onBlur={validateDates}
                                                    className={`input input-bordered rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20 ${
                                                        dateErrors.openAt ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                                                    }`}
                                                />
                                                {dateErrors.openAt && (
                                                    <p className="text-xs text-red-500 mt-1.5 ml-1">{dateErrors.openAt}</p>
                                                )}
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
                                                    onChange={(e) => {
                                                        setNewQuiz({ ...newQuiz, closeAt: e.target.value });
                                                        if (dateErrors.closeAt) setDateErrors((p) => ({ ...p, closeAt: "" }));
                                                    }}
                                                    onBlur={validateDates}
                                                    className={`input input-bordered rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20 ${
                                                        dateErrors.closeAt ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                                                    }`}
                                                />
                                                {dateErrors.closeAt && (
                                                    <p className="text-xs text-red-500 mt-1.5 ml-1">{dateErrors.closeAt}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Settings */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4" />
                                            Settings
                                        </h3>
                                        <div className="space-y-4">
                                            {/* Duration */}
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium text-slate-700 dark:text-slate-300">
                                                        Duration (min)
                                                    </span>
                                                </label>
                                                <div className="flex gap-1.5 mb-2 flex-wrap">
                                                    {[15, 30, 45, 60, 90].map((min) => (
                                                        <button
                                                            key={min}
                                                            type="button"
                                                            onClick={() => setNewQuiz({ ...newQuiz, durationMinutes: min })}
                                                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                                                newQuiz.durationMinutes === min
                                                                    ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                                                                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600"
                                                            }`}
                                                        >
                                                            {min} min
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="relative">
                                                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={newQuiz.durationMinutes}
                                                        onChange={(e) =>
                                                            setNewQuiz({ ...newQuiz, durationMinutes: parseInt(e.target.value) })}
                                                        className="input input-bordered rounded-xl h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20 w-full"
                                                    />
                                                </div>
                                            </div>

                                            {/* Attempts + Questions/Attempt side by side */}
                                            <div className="grid grid-cols-2 gap-4">
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
                                                            className="input input-bordered rounded-xl h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20 w-full text-center"
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
                                                            className="input input-bordered rounded-xl h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500/20 w-full text-center"
                                                        />
                                                    </div>
                                                    <label className="label">
                                                        <span className="label-text-alt text-slate-400">Blank = all</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn btn-ghost text-slate-600 dark:text-slate-400 gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    className="btn-brand gap-2"
                                >
                                    Next: Review
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Review & Submit */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <form onSubmit={handleCreateQuiz}>
                            <div className="bg-white dark:bg-base-200 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                                Review & Confirm
                                            </h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Review quiz settings before creation
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Summary Preview */}
                                    <div className="p-6 bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-500/10 dark:to-brand-500/20 rounded-2xl border border-brand-100 dark:border-brand-500/30">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="w-4 h-4 text-brand-500" />
                                            <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                                                Quiz Preview
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-brand-100 dark:border-brand-500/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Course</p>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                                    {selectedCourse?.title}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-brand-100 dark:border-brand-500/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Title</p>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                                    {newQuiz.title || "—"}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-brand-100 dark:border-brand-500/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Duration</p>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                    {newQuiz.durationMinutes} min
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-brand-100 dark:border-brand-500/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Attempts</p>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                    {newQuiz.attemptsAllowed}x
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-brand-100 dark:border-brand-500/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Open Date</p>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                    {newQuiz.openAt ? new Date(newQuiz.openAt).toLocaleDateString() : "—"}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-brand-100 dark:border-brand-500/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Close Date</p>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                    {newQuiz.closeAt ? new Date(newQuiz.closeAt).toLocaleDateString() : "—"}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-brand-100 dark:border-brand-500/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Grading</p>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                    {newQuiz.gradingMode === "onSubmit" ? "On submit" : "On close"}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-brand-100 dark:border-brand-500/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Questions/Attempt</p>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                    {newQuiz.questionsPerAttempt || "All"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="btn btn-ghost text-slate-600 dark:text-slate-400 gap-2"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreatingQuiz || !newQuiz.title.trim()}
                                        className="btn-brand px-8 shadow-lg shadow-brand-700/25 gap-2"
                                    >
                                        {isCreatingQuiz ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm" />
                                                {isEditing ? "Saving..." : "Creating..."}
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
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
    );
}
