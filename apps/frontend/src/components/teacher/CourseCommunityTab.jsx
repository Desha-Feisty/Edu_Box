import { MessageSquare } from "lucide-react";
import NoteForm from "../NoteForm";
import NoteCard from "../NoteCard";
import { SkeletonList } from "../common/Skeleton";
import { EmptyState } from "../common/EmptyState";

export default function CourseCommunityTab({
    courseId,
    loadCourseNotes,
    notesLoading,
    courseNotes
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                <div className="sticky top-20">
                    <NoteForm
                        courseId={courseId}
                        onNoteCreated={loadCourseNotes}
                    />
                </div>
            </div>

            <div className="lg:col-span-3">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                    Course Notes
                </h2>

                {notesLoading ? (
                    <div className="py-12">
                        <SkeletonList rows={3} />
                    </div>
                ) : courseNotes.length === 0 ? (
                    <EmptyState
                        icon={MessageSquare}
                        title="No notes yet"
                        description="No notes posted yet. Create one to engage with students!"
                    />
                ) : (
                    <div className="space-y-4">
                        {courseNotes.map((note) => (
                            <NoteCard
                                key={note._id}
                                note={note}
                                isTeacher={true}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
