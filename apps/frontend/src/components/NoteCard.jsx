import { useNavigate } from "react-router-dom";
import { MessageCircle, ArrowRight, User } from "lucide-react";
import { useRef, useCallback } from "react";

export default function NoteCard({ note, isTeacher }) {
    const navigate = useNavigate();
    const cardRef = useRef(null);

    const handleViewDetails = () => {
        navigate(`/note/${note._id}`);
    };

    const handleRipple = useCallback((e) => {
        const card = cardRef.current;
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const ripple = document.createElement("span");
        const size = Math.max(rect.width, rect.height);

        ripple.style.cssText = `
            position: absolute;
            top: ${e.clientY - rect.top - size / 2}px;
            left: ${e.clientX - rect.left - size / 2}px;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(139, 92, 246, 0.15);
            transform: scale(0);
            animation: note-ripple 0.6s ease-out forwards;
            pointer-events: none;
        `;
        card.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }, []);

    const handleClick = (e) => {
        handleRipple(e);
        handleViewDetails();
    };

    const createdDate = new Date(note.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (
        <div
            ref={cardRef}
            className="glass-card group cursor-pointer overflow-hidden relative"
            onClick={handleClick}
        >
            <div className="card-body p-5">
                <div className="flex items-start justify-between mb-3">
                    <h4 className="card-title text-base text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition line-clamp-2">
                        {note.title}
                    </h4>
                    {isTeacher && (
                        <div className="badge badge-primary badge-sm shadow-sm shadow-primary/20">
                            Your Note
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                    <User className="w-4 h-4" />
                    <span>{note.teacher?.name || "Unknown"}</span>
                    <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                    <span>{createdDate}</span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 text-sm line-clamp-2 mb-4">
                    {note.content}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MessageCircle className="w-4 h-4" />
                        <span>
                            {note.commentCount || 0}{" "}
                            {note.commentCount === 1 ? "comment" : "comments"}
                        </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition" />
                </div>
            </div>
        </div>
    );
}
