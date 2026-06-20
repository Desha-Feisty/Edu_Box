import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useTeacherStore from "../stores/Teacherstore";
import useAuthStore from "../stores/Authstore";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    Edit,
    Trash2,
    MessageCircle,
    Calendar,
    User,
    History,
    Save,
    X,
} from "lucide-react";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import PageWrapper from "./layout/PageWrapper";

export default function NoteDetail() {
    const { noteId } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [note, setNote] = useState(null);
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const getNoteWithComments = useTeacherStore(
        (state) => state.getNoteWithComments,
    );
    const updateNote = useTeacherStore((state) => state.updateNote);
    const deleteNote = useTeacherStore((state) => state.deleteNote);

    const loadNote = useCallback(async () => {
        setIsLoading(true);
        try {
            const { note: loadedNote, comments: loadedComments } =
                await getNoteWithComments(noteId);
            setNote(loadedNote);
            setComments(loadedComments || []);
            setEditContent(loadedNote.content);
        } catch (err) {
            toast.error(err.message || "Failed to load note");
        } finally {
            setIsLoading(false);
        }
    }, [noteId, getNoteWithComments]);

     
    useEffect(() => {
        loadNote();
    }, [noteId, loadNote]);

    const handleEdit = async () => {
        if (!editContent.trim()) {
            toast.error("Content cannot be empty");
            return;
        }

        setIsUploading(true);
        try {
            await updateNote(noteId, { content: editContent });
            setNote({ ...note, content: editContent });
            setIsEditMode(false);
            toast.success("Note updated successfully");
        } catch (err) {
            toast.error(err.message || "Failed to update note");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (
            !window.confirm(
                "Delete this note permanently? All comments will be deleted.",
            )
        )
            return;

        setIsUploading(true);
        try {
            await deleteNote(noteId);
            toast.success("Note deleted successfully");
            const homePath = user?.role === "teacher" ? "/teacher/courses" : user?.role === "admin" ? "/admin" : "/student/courses";
            navigate(homePath);
        } catch (err) {
            toast.error(err.message || "Failed to delete note");
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <PageWrapper>
                <div className="min-h-screen flex items-center justify-center dark:bg-base-300">
                    <span className="loading loading-spinner loading-lg text-blue-600"></span>
                </div>
            </PageWrapper>
        );
    }

    if (!note) {
        return (
            <PageWrapper>
                <div className="min-h-screen flex flex-col items-center justify-center px-6 relative z-10">
                    <div className="glass-panel max-w-md w-full border border-white/40 dark:border-slate-700/50 shadow-xl rounded-3xl p-8 text-center bg-white/50 dark:bg-base-300/50">
                        <p className="text-slate-600 dark:text-slate-400 text-lg font-bold mb-6">Note not found</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="btn-brand"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </button>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    const isNoteAuthor = user?.id === note?.teacher._id;
    const noteDate = new Date(note?.createdAt).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <PageWrapper>
            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-8 animate-in fade-in duration-500 relative z-10">
                {/* Note Card */}
                <div className="glass-panel overflow-hidden border border-white/40 dark:border-slate-700/50 shadow-xl mb-8 rounded-3xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <div className="p-8 md:p-10">
                        {/* Note Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-700/50 gap-4">
                            <div className="flex-1 w-full">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="btn btn-ghost btn-xs gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 w-fit"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </button>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 line-clamp-2">
                                    {note.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                        <User className="w-4 h-4" />
                                        <span>{note.teacher?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                        <Calendar className="w-4 h-4" />
                                        <span>{noteDate}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {isNoteAuthor && (
                                <div className="flex gap-2">
                                    {!isEditMode && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    setIsEditMode(true)
                                                }
                                                className="btn btn-outline border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-base-300/50 hover:bg-slate-50 dark:hover:bg-slate-800 btn-sm gap-2"
                                            >
                                                <Edit className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                disabled={isUploading}
                                                className="btn btn-outline border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 btn-sm gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Note Content */}
                        {isEditMode ? (
                            <div className="space-y-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                                            Edit Content
                                        </span>
                                    </label>
                                    <textarea
                                        value={editContent}
                                        onChange={(e) =>
                                            setEditContent(e.target.value)
                                        }
                                        className="textarea h-64 bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-base resize-y rounded-2xl"
                                        disabled={isUploading}
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleEdit}
                                        disabled={isUploading}
                                        className="btn-brand px-8"
                                    >
                                        {isUploading ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5 mr-2" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditMode(false);
                                            setEditContent(note.content);
                                        }}
                                        disabled={isUploading}
                                        className="btn btn-ghost rounded-xl px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                                    >
                                        <X className="w-5 h-5 mr-2" />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed text-lg">
                                    {note.content}
                                </p>
                            </div>
                        )}

                        {/* Edit History */}
                        {note.editHistory && note.editHistory.length > 0 && (
                            <div className="collapse collapse-arrow glass-card bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 mt-8 rounded-2xl">
                                <input type="checkbox" />
                                <div className="collapse-title font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3 py-4">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                                        <History className="w-4 h-4" />
                                    </div>
                                    Edit History ({note.editHistory.length})
                                </div>
                                <div className="collapse-content pb-4 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="space-y-3 pl-12 border-l-2 border-slate-200 dark:border-slate-700 ml-6">
                                        {note.editHistory.map((edit, idx) => (
                                            <div key={idx} className="relative">
                                                <div className="absolute -left-[3.25rem] w-3 h-3 bg-white dark:bg-base-300 border-2 border-blue-400 rounded-full top-1.5"></div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-300">
                                                    {new Date(edit.editedAt).toLocaleString()}
                                                </p>
                                                <p className="text-xs mt-0.5 text-slate-500">
                                                    Version {note.editHistory.length - idx}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Comments Section */}
                <div className="glass-panel overflow-hidden border border-white/40 dark:border-slate-700/50 shadow-xl rounded-3xl">
                    <div className="p-8 md:p-10">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Discussion Track
                            </h2>
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 ml-[3.5rem]">
                            {comments.length}{" "}
                            {comments.length === 1 ? "comment" : "comments"}
                        </p>

                        {/* Comment Form */}
                        <CommentForm
                            noteId={noteId}
                            onCommentAdded={loadNote}
                        />

                        {/* Comments List */}
                        <div className="mt-8 space-y-4">
                            {comments.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50/50 dark:bg-base-300/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                                        <MessageCircle className="w-8 h-8" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        No comments yet. Be the first to share
                                        your thoughts!
                                    </p>
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment._id} className="glass-card bg-white/40 dark:bg-base-300/40 p-1 rounded-2xl border border-white/40 dark:border-slate-700/50 hover:shadow-md transition-shadow">
                                        <CommentItem
                                            comment={comment}
                                            isTeacher={isNoteAuthor}
                                            onCommentDeleted={loadNote}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </PageWrapper>
    );
}
