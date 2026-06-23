import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useQuizStore from "../stores/Quizstore";
import useAuthStore from "../stores/Authstore";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    Send,
    EyeOff,
    CheckCircle,
    X,
    Sparkles,
    Link,
    Copy,
} from "lucide-react";

import { ConfirmDialog } from "../components/common/Modal";

function QuizQuestionsPage() {
    const { id: quizId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const {
        listQuizQuestions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        regenerateRubric,
        generateAiQuestions,
        generateFromFile,
        publishQuiz,
        unpublishQuiz,
        errMsg,
        clearErrMsg,
    } = useQuizStore();

    const [questions, setQuestions] = useState([]);
    const [quizPublished, setQuizPublished] = useState(false);
    const [courseId, setCourseId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiCount, setAiCount] = useState(5);
    const [aiQuestionType, setAiQuestionType] = useState("mcq_single");
    const [aiPoints, setAiPoints] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSourceMode, setAiSourceMode] = useState("topic"); // "topic" | "file"
    const [aiFile, setAiFile] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const [inlinePointsEditId, setInlinePointsEditId] = useState(null);
    const [inlinePointsValue, setInlinePointsValue] = useState(1);

    const [formData, setFormData] = useState({
        prompt: "",
        questionType: "mcq_single",
        points: 1,
        choices: [
            { text: "", isCorrect: true },
            { text: "", isCorrect: false },
        ],
        sampleAnswer: "",
        rubric: "",
    });

    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await listQuizQuestions(quizId);
            setQuestions(data.questions || data);
            if (data.quiz) {
                setQuizPublished(data.quiz.published || false);
                const courseIdValue = data.quiz.course?._id || data.quiz.course;
                if (courseIdValue) {
                    setCourseId(courseIdValue);
                }
            }
        } catch {
            // Silent error
        } finally {
            setIsLoading(false);
        }
    }, [quizId, listQuizQuestions]);

     
    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        fetchQuestions();
    }, [quizId, token, navigate, fetchQuestions]);

    const handlePublish = async () => {
        try {
            await publishQuiz(quizId);
            setQuizPublished(true);
            setPublishSuccess(true);
            toast.success("Quiz published successfully");
            setTimeout(() => setPublishSuccess(false), 8000);
        } catch (err) {
            toast.error(err.message || "Failed to publish quiz");
        }
    };

    const handleUnpublish = async () => {
        try {
            await unpublishQuiz(quizId);
            setQuizPublished(false);
            toast.success("Quiz unpublished successfully");
        } catch (err) {
            toast.error(err.message || "Failed to unpublish quiz");
        }
    };

    const handleChoiceChange = (index, field, value) => {
        const newChoices = [...formData.choices];
        newChoices[index][field] = value;

        if (field === "isCorrect" && value === true) {
            newChoices.forEach((c, i) => {
                if (i !== index) c.isCorrect = false;
            });
        }
        setFormData({ ...formData, choices: newChoices });
    };

    const addChoice = () => {
        setFormData({
            ...formData,
            choices: [...formData.choices, { text: "", isCorrect: false }],
        });
    };

    const removeChoice = (index) => {
        if (formData.choices.length <= 2) {
            toast.error("At least 2 choices are required");
            return;
        }
        const newChoices = formData.choices.filter((_, i) => i !== index);
        if (!newChoices.some((c) => c.isCorrect)) {
            newChoices[0].isCorrect = true;
        }
        setFormData({ ...formData, choices: newChoices });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.prompt.trim()) {
            toast.error("Question prompt is required");
            return;
        }

        // Validate based on question type
        if (formData.questionType === "mcq_single") {
            if (formData.choices.some((c) => !c.text.trim())) {
                toast.error("All choice text fields must be filled");
                return;
            }
            if (!formData.choices.some((c) => c.isCorrect)) {
                toast.error("Select a correct answer");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // Prepare payload based on question type
            const payload = { ...formData };
            if (formData.questionType === "written") {
                // Remove choices for written questions
                delete payload.choices;
                // Only include sampleAnswer and rubric if they have values
                if (!payload.sampleAnswer) delete payload.sampleAnswer;
                if (!payload.rubric) delete payload.rubric;
            }

            if (editingId) {
                await updateQuestion(editingId, payload);
                toast.success("Question updated successfully");
            } else {
                await addQuestion(quizId, payload);
                toast.success("Question added successfully");
            }
            setFormData({
                prompt: "",
                questionType: "mcq_single",
                points: 1,
                choices: [
                    { text: "", isCorrect: true },
                    { text: "", isCorrect: false },
                ],
                sampleAnswer: "",
                rubric: "",
            });
            setIsAdding(false);
            setEditingId(null);
            fetchQuestions();
        } catch (err) {
            toast.error(err.message || "Failed to save question");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAiGenerate = async (e) => {
        e.preventDefault();
        setIsGenerating(true);
        try {
            if (aiSourceMode === "file") {
                if (!aiFile) {
                    toast.error("Please select a file");
                    setIsGenerating(false);
                    return;
                }
                await generateFromFile(quizId, aiFile, aiQuestionType, aiCount, aiPoints);
                toast.success(`Successfully generated ${aiCount} ${aiQuestionType === "written" ? "written" : "multiple choice"} questions from file!`);
            } else {
                if (!aiTopic.trim()) {
                    toast.error("Please enter a topic");
                    setIsGenerating(false);
                    return;
                }
                await generateAiQuestions(quizId, aiTopic, aiCount, aiQuestionType, aiPoints);
                toast.success(`Successfully generated ${aiCount} ${aiQuestionType === "written" ? "written" : "multiple choice"} questions!`);
            }
            setIsAiModalOpen(false);
            setAiTopic("");
            setAiFile(null);
            setAiSourceMode("topic");
            setAiQuestionType("mcq_single");
            setAiPoints(1);
            fetchQuestions();
        } catch (err) {
            const errorMsg = err.response?.data?.errMsg || err.message || "Failed to generate AI questions";
            toast.error(errorMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                toast.error("File must be under 10MB");
                e.target.value = "";
                return;
            }
            const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
            if (!allowedTypes.includes(file.type)) {
                toast.error("Only PDF, DOCX, and TXT files are allowed");
                e.target.value = "";
                return;
            }
            setAiFile(file);
        }
    };

    const handleEdit = (q) => {
        setFormData({
            prompt: q.prompt,
            questionType: q.questionType || "mcq_single",
            points: q.points,
            choices: q.choices ? q.choices.map((c) => ({
                text: c.text,
                isCorrect: c.isCorrect,
            })) : [
                { text: "", isCorrect: true },
                { text: "", isCorrect: false },
            ],
            sampleAnswer: q.sampleAnswer || "",
            rubric: q.rubric || "",
        });
        setEditingId(q._id);
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (questionId) => {
        setDeleteConfirmId(questionId);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmId) return;
        try {
            await deleteQuestion(deleteConfirmId);
            fetchQuestions();
            toast.success("Question deleted successfully");
        } catch {
            toast.error("Failed to delete question");
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleInlinePointsSave = async (questionId) => {
        const value = inlinePointsValue;
        if (value < 1) {
            toast.error("Points must be at least 1");
            setInlinePointsEditId(null);
            return;
        }
        try {
            await updateQuestion(questionId, { points: value });
            toast.success("Points updated");
            setInlinePointsEditId(null);

            // Regenerate rubric for written questions to match new point value
            const question = questions.find((q) => q._id === questionId);
            if (question?.questionType === "written" && question?.rubric) {
                try {
                    await regenerateRubric(questionId);
                } catch {
                    // Non-critical — points already saved
                }
            }

            fetchQuestions();
        } catch {
            toast.error("Failed to update points");
        }
    };

    if (isLoading)
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-base-300">
                <span className="loading loading-spinner loading-lg text-blue-600"></span>
            </div>
        );

    return (
            <main className="max-w-5xl mx-auto px-6 py-8 animate-in fade-in duration-500 relative z-10">
                {/* Error Alert */}
                {errMsg && (
                    <div className="alert alert-error mb-8">
                        <span>{errMsg}</span>
                        <button
                            onClick={clearErrMsg}
                            className="btn btn-ghost btn-sm"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Questions Header Card */}
                <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] mb-8 overflow-hidden">
                    <div className="p-8 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-brand-700"></div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-1">
                                    <button
                                        onClick={() => courseId ? navigate(`/teacher/course/${courseId}`) : navigate(-1)}
                                        className="btn btn-ghost btn-xs btn-circle dark:text-slate-300"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <p className="text-sm font-medium uppercase tracking-wider">Manage Questions</p>
                                </div>
                                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                                    Quiz Content
                                    <span className={`badge border-0 text-sm font-semibold ${
                                        quizPublished
                                            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                    }`}>
                                        {quizPublished ? "Published" : "Draft"}
                                    </span>
                                    <span className="badge badge-primary bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-0">{questions.length}</span>
                                </h1>
                            </div>
                            {!isAdding && (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => navigate(`/teacher/quiz/create?editQuizId=${quizId}`)}
                                        className="btn btn-ghost gap-2 rounded-xl"
                                    >
                                        <Edit className="w-5 h-5" />
                                        Settings
                                    </button>
                                    {!quizPublished ? (
                                        <button
                                            onClick={handlePublish}
                                            className="btn bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20 border-0 rounded-xl hover:-translate-y-0.5 transition-transform"
                                        >
                                            <Send className="w-5 h-5 mr-1" />
                                            Publish Quiz
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleUnpublish}
                                            className="btn bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 border-0 rounded-xl hover:-translate-y-0.5 transition-transform"
                                        >
                                            <EyeOff className="w-5 h-5 mr-1" />
                                            Unpublish
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step 10: Publish success banner */}
                        {publishSuccess && (
                            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between flex-wrap gap-3 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-green-800 dark:text-green-200">Quiz is live!</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">Students can now access it during the scheduled window.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/student/quizzes/${quizId}`;
                                        navigator.clipboard.writeText(url);
                                        toast.success("Quiz link copied to clipboard");
                                    }}
                                    className="btn btn-sm bg-green-600 hover:bg-green-500 text-white border-0 rounded-xl gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy Quiz Link
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Generator Modal */}
                {isAiModalOpen && (
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] mb-8 animate-in slide-in-from-top-4 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-accent-500"></div>
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-fuchsia-500" />
                                    Magic Quiz Generator
                                </h2>
                                <button onClick={() => setIsAiModalOpen(false)} className="btn btn-ghost btn-circle btn-sm">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleAiGenerate} className="space-y-6">
                                {/* Source Mode Tabs */}
                                <div className="tabs tabs-box bg-slate-100/50 dark:bg-base-300/50 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        className={`tab flex-1 rounded-lg text-sm font-medium transition-all ${aiSourceMode === "topic" ? "bg-white dark:bg-base-200 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
                                        onClick={() => { setAiSourceMode("topic"); setAiFile(null); }}
                                    >
                                        ✏️ Topic Text
                                    </button>
                                    <button
                                        type="button"
                                        className={`tab flex-1 rounded-lg text-sm font-medium transition-all ${aiSourceMode === "file" ? "bg-white dark:bg-base-200 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
                                        onClick={() => { setAiSourceMode("file"); setAiTopic(""); }}
                                    >
                                        📄 Upload File
                                    </button>
                                </div>

                                {aiSourceMode === "topic" ? (
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                                What should the questions be about?
                                            </span>
                                        </label>
                                        <textarea
                                            required
                                            value={aiTopic}
                                            onChange={(e) => setAiTopic(e.target.value)}
                                            className="textarea h-32 bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 rounded-xl text-lg resize-y"
                                            placeholder="E.g., The history of the Roman Empire, Newton's Laws of Motion, or paste a block of text..."
                                        />
                                    </div>
                                ) : (
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                                Upload a document
                                            </span>
                                        </label>
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-fuchsia-400 dark:hover:border-fuchsia-500 transition-colors">
                                            {aiFile ? (
                                                <div className="space-y-3">
                                                    <div className="text-4xl">📄</div>
                                                    <p className="font-medium text-slate-900 dark:text-white truncate max-w-xs mx-auto">
                                                        {aiFile.name}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {(aiFile.size / 1024).toFixed(1)} KB
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setAiFile(null); }}
                                                        className="btn btn-ghost btn-xs text-slate-500 hover:text-error"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                        <label className="cursor-pointer block p-4">
                                            <div className="text-4xl mb-3">📂</div>
                                                    <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                        Click to upload or drag & drop
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        PDF, DOCX, or TXT (max 10MB)
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.docx,.txt"
                                                        onChange={handleFileChange}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Question Type Selector */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                            Question Type
                                        </span>
                                    </label>
                                    <div className="flex gap-4">
                                        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${aiQuestionType === "mcq_single" ? "bg-brand-50/50 dark:bg-brand-900/10 border-brand-400 dark:border-brand-500/50" : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                            <input
                                                type="radio"
                                                name="aiQuestionType"
                                                value="mcq_single"
                                                checked={aiQuestionType === "mcq_single"}
                                                onChange={(e) => setAiQuestionType(e.target.value)}
                                                className="radio radio-primary"
                                            />
                                            <span className="font-medium text-sm">Multiple Choice</span>
                                        </label>
                                        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${aiQuestionType === "written" ? "bg-brand-50/50 dark:bg-brand-900/10 border-brand-400 dark:border-brand-500/50" : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                            <input
                                                type="radio"
                                                name="aiQuestionType"
                                                value="written"
                                                checked={aiQuestionType === "written"}
                                                onChange={(e) => setAiQuestionType(e.target.value)}
                                                className="radio radio-primary"
                                            />
                                            <span className="font-medium text-sm">Written (AI Graded)</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="flex gap-6">
                                <div className="form-control max-w-xs">
                                    <label className="label">
                                        <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                            Number of Questions
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={aiCount}
                                        onChange={(e) => setAiCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                                        className="input bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 rounded-xl text-lg w-32 font-mono"
                                    />
                                </div>
                                <div className="form-control max-w-xs">
                                    <label className="label">
                                        <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                            Points per Question
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={aiPoints}
                                        onChange={(e) => setAiPoints(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                                        className="input bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 rounded-xl text-lg w-32 font-mono"
                                    />
                                </div>
                            </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isGenerating}
                                        className="btn bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white px-8 rounded-xl shadow-lg shadow-purple-500/20 border-0 hover:-translate-y-0.5 transition-transform gap-2"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Generate
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add/Edit Form */}
                {isAdding && (
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] mb-8 animate-in slide-in-from-top-4 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                        <div className="p-8">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit className="w-6 h-6 text-emerald-500" />
                                {editingId ? "Edit Question" : "Add New Question"}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Question Type Selector */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                            Question Type
                                        </span>
                                    </label>
                                    <div className="flex gap-4">
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.questionType === "mcq_single" ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-400 dark:border-emerald-500/50" : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                            <input
                                                type="radio"
                                                name="questionType"
                                                value="mcq_single"
                                                checked={formData.questionType === "mcq_single"}
                                                onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
                                                className="radio radio-primary"
                                            />
                                            <span className="font-medium">Multiple Choice</span>
                                        </label>
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.questionType === "written" ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-400 dark:border-emerald-500/50" : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                            <input
                                                type="radio"
                                                name="questionType"
                                                value="written"
                                                checked={formData.questionType === "written"}
                                                onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
                                                className="radio radio-primary"
                                            />
                                            <span className="font-medium">Written (AI Graded)</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Question Prompt */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                            Question Prompt
                                        </span>
                                    </label>
                                    <textarea
                                        required
                                        value={formData.prompt}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                prompt: e.target.value,
                                            })
                                        }
                                        className="textarea h-32 bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-xl text-lg resize-y"
                                        placeholder="Enter your question here..."
                                    />
                                </div>

                                {/* Points */}
                                <div className="form-control max-w-xs">
                                    <label className="label">
                                        <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                            Point Value
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.points}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                points: parseInt(
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                        className="input bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-xl text-lg w-32 font-mono"
                                    />
                                </div>

                                {formData.questionType === "mcq_single" && (
                                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                    <label className="label px-0">
                                        <span className="label-text font-semibold text-lg text-slate-800 dark:text-slate-200">
                                            Answer Choices
                                        </span>
                                    </label>
                                    <div className="space-y-3">
                                        {formData.choices.map((choice, index) => (
                                            <div
                                                key={index}
                                                className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center p-5 rounded-2xl border-2 transition-all ${choice.isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-400 dark:border-emerald-500/50 shadow-sm shadow-emerald-500/10' : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                                            >
                                                <div className="form-control flex-1 w-full">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={choice.text}
                                                        onChange={(e) => handleChoiceChange(index, "text", e.target.value)}
                                                        className="input input-lg w-full bg-white dark:bg-base-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded-xl border-slate-200 dark:border-slate-700"
                                                        placeholder={`Option ${index + 1}`}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                                                    <div className="form-control">
                                                        <label className="label cursor-pointer gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                                            <input
                                                                type="radio"
                                                                name="correct"
                                                                checked={choice.isCorrect}
                                                                onChange={() => handleChoiceChange(index, "isCorrect", true)}
                                                                className="radio radio-success"
                                                            />
                                                            <span className={`label-text font-bold ${choice.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                                                                Correct Answer
                                                            </span>
                                                        </label>
                                                    </div>

                                                    {formData.choices.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeChoice(index)}
                                                            className="btn btn-ghost btn-circle text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:text-red-400 transition-colors"
                                                            title="Remove choice"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addChoice}
                                        className="btn btn-outline border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 w-full rounded-2xl py-6 gap-2 border-dashed mt-4 group"
                                    >
                                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        Add Another Option
                                    </button>
                                </div>
                                )}

                                {formData.questionType === "written" && (
                                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            <strong>AI Grading:</strong> Student answers will be automatically graded using AI. You can optionally provide a sample answer and rubric to help the AI grade more accurately.
                                        </p>
                                    </div>
                                    
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                                Sample Answer (Optional)
                                            </span>
                                        </label>
                                        <textarea
                                            value={formData.sampleAnswer}
                                            onChange={(e) => setFormData({ ...formData, sampleAnswer: e.target.value })}
                                            className="textarea h-24 bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-xl resize-y"
                                            placeholder="Enter a sample ideal answer to help the AI grade more accurately..."
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                                Rubric (Optional)
                                            </span>
                                        </label>
                                        <textarea
                                            value={formData.rubric}
                                            onChange={(e) => setFormData({ ...formData, rubric: e.target.value })}
                                            className="textarea h-24 bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-xl resize-y"
                                            placeholder="Enter grading criteria or rubric to help the AI evaluate answers..."
                                        />
                                    </div>
                                </div>
                                )}

                                {/* Form Actions */}
                                <div className="flex gap-4 pt-6 border-t border-slate-200 dark:border-slate-700/50 mt-8">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="btn btn-success text-white px-8 rounded-xl shadow-lg shadow-success/20 hover:-translate-y-0.5 transition-transform gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                {editingId ? "Save Changes" : "Create Question"}
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAdding(false);
                                            setEditingId(null);
                                            setFormData({
                                                prompt: "",
                                                questionType: "mcq_single",
                                                points: 1,
                                                choices: [
                                                    { text: "", isCorrect: true },
                                                    { text: "", isCorrect: false },
                                                ],
                                                sampleAnswer: "",
                                                rubric: "",
                                            });
                                        }}
                                        className="btn btn-ghost px-6 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Questions List */}
                <div className="space-y-6">
                    {!isAdding && (
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsAiModalOpen(true)}
                                className="btn bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20 border-0 rounded-xl"
                            >
                                <Sparkles className="w-5 h-5 mr-1" />
                                Magic Generate
                            </button>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="btn-brand"
                            >
                                <Plus className="w-5 h-4" />
                                Add Question
                            </button>
                        </div>
                    )}
                    {questions.length === 0 && !isAdding ? (
                        <div className="bg-brand-50/50 dark:bg-brand-900/10 rounded-2xl border border-brand-200 dark:border-brand-900/50">
                            <div className="p-12 text-center">
                                <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-500">
                                    <Plus className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No questions yet</h3>
                                <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                                    Get started by adding your first question to this quiz.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="btn-brand px-8"
                                    >
                                        <Plus className="w-5 h-5 mr-1" />
                                        Add Question
                                    </button>
                                    <button
                                        onClick={() => setIsAiModalOpen(true)}
                                        className="btn bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20 border-0 rounded-xl"
                                    >
                                        <Sparkles className="w-5 h-5 mr-1" />
                                        Generate with AI
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        questions.map((q, idx) => (
                            <div
                                key={q._id}
                                className="glass-card overflow-hidden hover:-translate-y-1 transition-all group"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-400 dark:bg-blue-500 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors"></div>
                                <div className="p-5 ml-1.5 border-b border-slate-100 dark:border-slate-800/50">
                                    {/* Question Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-base shadow-inner border border-blue-200 dark:border-blue-800">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                {q._id === inlinePointsEditId ? (
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="100"
                                                            value={inlinePointsValue}
                                                            onChange={(e) => setInlinePointsValue(Math.max(1, parseInt(e.target.value) || 1))}
                                                            onBlur={() => handleInlinePointsSave(q._id)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    (e.target as HTMLInputElement).blur();
                                                                } else if (e.key === "Escape") {
                                                                    setInlinePointsEditId(null);
                                                                }
                                                            }}
                                                            className="input input-xs bg-white/60 dark:bg-base-300/60 border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 w-16 text-center font-mono"
                                                            autoFocus
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">pts</span>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="badge badge-ghost font-medium text-slate-600 dark:text-slate-400 mb-1 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        onClick={() => {
                                                            setInlinePointsEditId(q._id);
                                                            setInlinePointsValue(q.points);
                                                        }}
                                                        title="Click to edit points"
                                                    >
                                                        {q.points} {q.points === 1 ? "Point" : "Points"}
                                                    </div>
                                                )}
                                                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                                    {q.questionType === "written" ? "Written Question" : "Multiple Choice"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(q)}
                                                className="btn btn-square btn-sm btn-ghost hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                title="Edit Question"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(q._id)}
                                                className="btn btn-square btn-sm btn-ghost hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400"
                                                title="Delete Question"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Question Prompt */}
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3 leading-relaxed">
                                        {q.prompt}
                                    </h3>

                                    {/* Answer Choices or Sample Answer */}
                                    {q.questionType === "written" ? (
                                        <div className="space-y-3">
                                            {q.sampleAnswer && (
                                                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sample Answer</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{q.sampleAnswer}"</p>
                                                </div>
                                            )}
                                            {q.rubric && (
                                                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Grading Rubric</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300">{q.rubric}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.choices?.map((c, i) => (
                                                <div
                                                    key={i}
                                                    className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                                                        c.isCorrect
                                                            ? "bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-500/50 shadow-sm shadow-emerald-500/10"
                                                            : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
                                                    }`}
                                                >
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${c.isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-400'}`}>
                                                        {c.isCorrect ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-semibold">{String.fromCharCode(65 + i)}</span>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-sm ${c.isCorrect ? "font-bold text-emerald-900 dark:text-emerald-100" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                                                            {c.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

            {/* Delete Confirmation Modal */}
            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Question"
                message="Are you sure you want to delete this question? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
            />
            </main>
    );
}

export default QuizQuestionsPage;