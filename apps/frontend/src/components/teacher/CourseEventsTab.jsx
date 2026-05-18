import { useEffect, useState } from "react";
import useTeacherStore from "../../stores/Teacherstore";
import toast from "react-hot-toast";
import {
    Calendar,
    Plus,
    Edit,
    Trash2,
    X,
    Save,
    Clock,
    BookOpen,
} from "lucide-react";

const TABS = [
    { id: "quizzes", label: "Quizzes" },
    { id: "events", label: "Events" },
    { id: "students", label: "Students" },
    { id: "grades", label: "Grades" },
    { id: "analytics", label: "Analytics" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "community", label: "Community" },
];

export default function CourseEventsTab({ courseId, _course }) {
    const { 
        calendarEvents, 
        listCourseCalendarEvents,
        createCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
    } = useTeacherStore();

    const [_isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        startAt: "",
        endAt: "",
        eventType: "custom",
    });

    useEffect(() => {
        if (courseId) {
            listCourseCalendarEvents(courseId);
        }
    }, [courseId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (courseId) {
                listCourseCalendarEvents(courseId);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [courseId, listCourseCalendarEvents]);

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            startAt: "",
            endAt: "",
            eventType: "custom",
        });
        setEditingEvent(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.startAt) {
            toast.error("Title and start time are required");
            return;
        }

        setIsLoading(true);
        try {
            if (editingEvent) {
                await updateCalendarEvent(courseId, editingEvent._id, formData);
                toast.success("Event updated successfully");
            } else {
                await createCalendarEvent(courseId, formData);
                toast.success("Event created successfully");
            }
            resetForm();
            listCourseCalendarEvents(courseId);
        } catch (err) {
            toast.error(err.response?.data?.errMsg || "Failed to save event");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (event) => {
        setFormData({
            title: event.title,
            description: event.description || "",
            startAt: event.startAt ? new Date(event.startAt).toISOString().slice(0, 16) : "",
            endAt: event.endAt ? new Date(event.endAt).toISOString().slice(0, 16) : "",
            eventType: event.eventType || "custom",
        });
        setEditingEvent(event);
        setShowForm(true);
    };

    const handleDelete = async (eventId) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            try {
                await deleteCalendarEvent(courseId, eventId);
                toast.success("Event deleted successfully");
            } catch {
                toast.error("Failed to delete event");
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const eventTypeColors = {
        deadline: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        meeting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        announcement: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        custom: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Calendar Events
                </h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn btn-primary rounded-xl gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Event
                </button>
            </div>

            {/* Event Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-base-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingEvent ? "Edit Event" : "Add New Event"}
                            </h3>
                            <button onClick={resetForm} className="btn btn-ghost btn-sm btn-circle">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Title *</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered rounded-xl"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Event title"
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Event Type</span>
                                </label>
                                <select
                                    className="select select-bordered rounded-xl"
                                    value={formData.eventType}
                                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                                >
                                    <option value="custom">Custom</option>
                                    <option value="deadline">Deadline</option>
                                    <option value="meeting">Meeting</option>
                                    <option value="announcement">Announcement</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Description</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered rounded-xl"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Start *</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="input input-bordered rounded-xl"
                                        value={formData.startAt}
                                        onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">End</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="input input-bordered rounded-xl"
                                        value={formData.endAt}
                                        onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="btn btn-primary flex-1 rounded-xl">
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingEvent ? "Update" : "Create"}
                                </button>
                                <button type="button" onClick={resetForm} className="btn btn-ghost rounded-xl">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Events List */}
            {!calendarEvents || calendarEvents.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-base-200 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600">
                    <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                        No events scheduled yet.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn-primary rounded-xl"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Event
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {calendarEvents.map((event) => (
                        <div
                            key={event._id}
                            className="bg-white dark:bg-base-200 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`badge ${eventTypeColors[event.eventType] || eventTypeColors.custom}`}>
                                            {event.eventType}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                        {event.title}
                                    </h3>
                                    {event.description && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                            {event.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {formatDate(event.startAt)}
                                            {event.endAt && ` - ${formatDate(event.endAt)}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(event)}
                                        className="btn btn-square btn-sm btn-ghost"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(event._id)}
                                        className="btn btn-square btn-sm btn-ghost text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}