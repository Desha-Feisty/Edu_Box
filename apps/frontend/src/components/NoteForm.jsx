import { useState } from "react";
import useTeacherStore from "../stores/Teacherstore";
import toast from "react-hot-toast";
import { Send, Type, FileText } from "lucide-react";

export default function NoteForm({ courseId, onNoteCreated }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createNote = useTeacherStore((state) => state.createNote);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        if (content.length < 10) {
            toast.error("Content must be at least 10 characters");
            return;
        }

        setIsSubmitting(true);
        try {
            await createNote(courseId, { title, content });
            toast.success("Note posted successfully!");
            setTitle("");
            setContent("");
            if (onNoteCreated) onNoteCreated();
        } catch (err) {
            toast.error(err.message || "Failed to create note");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden sticky top-28">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                        <FileText className="w-5 h-5" />
                    </div>
                    Post a Note
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Title Input */}
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                                Title
                            </span>
                            <span className={`label-text-alt text-xs font-medium tabular-nums ${title.length > 80 ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                {title.length}/100
                            </span>
                        </label>
                        <div className="relative">
                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="input w-full pl-10 bg-white/60 dark:bg-base-300/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                placeholder="Note title..."
                                disabled={isSubmitting}
                                maxLength={100}
                            />
                        </div>
                    </div>

                    {/* Content Input */}
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                                Content
                            </span>
                            <span className={`label-text-alt text-xs font-medium tabular-nums ${content.length > 4500 ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                {content.length}/5000
                            </span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="textarea w-full bg-white/60 dark:bg-base-300/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-y"
                            placeholder="Share your notes with the class..."
                            rows="5"
                            disabled={isSubmitting}
                            maxLength={5000}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !title.trim() || !content.trim()}
                        className="btn btn-success text-white w-full gap-2 shadow-lg shadow-emerald-500/20 rounded-xl hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:translate-y-0"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Posting...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Post Note
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
