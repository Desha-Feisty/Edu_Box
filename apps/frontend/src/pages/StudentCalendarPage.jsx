import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/Authstore";
import useTeacherStore from "../stores/Teacherstore";
import useQuizStore from "../stores/Quizstore";
import PageWrapper from "../components/layout/PageWrapper";
import { Calendar, Clock, BookOpen, Zap, Calendar as CalendarIcon } from "lucide-react";

function StudentCalendarPage() {
    const { token, listEnrolledCalendarEvents, calendarEvents } = useAuthStore();
    const { allCourses, listMyCourses } = useTeacherStore();
    const { availableQuizzes, fetchAvailableQuizzes } = useQuizStore();
    const navigate = useNavigate();

    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        listMyCourses();
        fetchAvailableQuizzes();
    }, [token, navigate, listMyCourses, fetchAvailableQuizzes]);

    // Fetch calendar events when courses are loaded
    useEffect(() => {
        if (allCourses.length > 0 && token) {
            const courseIds = allCourses.map((c) => c._id || c.id).filter(Boolean);
            if (courseIds.length > 0) {
                listEnrolledCalendarEvents(courseIds);
            }
        }
    }, [allCourses, token, listEnrolledCalendarEvents]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const getEventsForDay = (day) => {
        if (!day) return [];
        const events = [];

        // Add quiz events
        availableQuizzes.forEach((quiz) => {
            if (quiz.startAt && new Date(quiz.startAt).toDateString() === day.toDateString()) {
                events.push({
                    type: "quiz",
                    title: quiz.title,
                    time: new Date(quiz.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    icon: Zap,
                    color: "amber",
                });
            }
            if (quiz.closeAt && new Date(quiz.closeAt).toDateString() === day.toDateString()) {
                events.push({
                    type: "deadline",
                    title: `${quiz.title} Due`,
                    time: new Date(quiz.closeAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    icon: Clock,
                    color: "red",
                });
            }
        });

        // Add calendar events
        if (calendarEvents && calendarEvents.length > 0) {
            calendarEvents.forEach((event) => {
                if (event.startAt && new Date(event.startAt).toDateString() === day.toDateString()) {
                    let eventColor = "blue";
                    if (event.eventType === "deadline") eventColor = "red";
                    else if (event.eventType === "meeting") eventColor = "blue";
                    else if (event.eventType === "announcement") eventColor = "purple";
                    
                    events.push({
                        type: "calendar-event",
                        title: event.title,
                        time: new Date(event.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        icon: CalendarIcon,
                        color: eventColor,
                    });
                }
            });
        }

        return events;
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const days = getDaysInMonth(currentDate);
    const today = new Date();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isToday = (day) => {
        if (!day) return false;
        return day.toDateString() === today.toDateString();
    };

    return (
        <PageWrapper>
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Calendar
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        View upcoming quizzes and deadlines
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="lg:col-span-2 bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={prevMonth}
                                    className="btn btn-ghost btn-sm btn-circle"
                                >
                                    &lt;
                                </button>
                                <button
                                    onClick={nextMonth}
                                    className="btn btn-ghost btn-sm btn-circle"
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div key={day} className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-2">
                                    {day}
                                </div>
                            ))}
                            {days.map((day, index) => {
                                const events = getEventsForDay(day);
                                return (
                                    <div
                                        key={index}
                                        className={`min-h-[80px] p-2 rounded-xl border ${
                                            day
                                                ? isToday(day)
                                                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                                                    : "border-slate-200 dark:border-slate-700/50"
                                                : "border-transparent"
                                        }`}
                                    >
                                        {day && (
                                            <>
                                                <div className={`text-sm font-medium mb-1 ${
                                                    isToday(day)
                                                        ? "text-brand-600 dark:text-brand-400"
                                                        : "text-slate-700 dark:text-slate-300"
                                                }`}>
                                                    {day.getDate()}
                                                </div>
                                                <div className="space-y-1">
                                                    {events.slice(0, 2).map((event, i) => (
                                                        <div
                                                            key={i}
                                                            className={`text-xs px-1.5 py-0.5 rounded bg-${event.color}-100 dark:bg-${event.color}-900/30 text-${event.color}-700 dark:text-${event.color}-400 truncate`}
                                                        >
                                                            {event.title}
                                                        </div>
                                                    ))}
                                                    {events.length > 2 && (
                                                        <div className="text-xs text-slate-500">
                                                            +{events.length - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Upcoming Events */}
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-brand-500" />
                            Upcoming
                        </h3>
                        <div className="space-y-4">
                            {availableQuizzes.filter(q => q.startAt && new Date(q.startAt) > new Date()).length === 0 ? (
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    No upcoming events
                                </p>
                            ) : (
                                availableQuizzes
                                    .filter(q => q.startAt && new Date(q.startAt) > new Date())
                                    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
                                    .slice(0, 5)
                                    .map((quiz) => (
                                        <div key={quiz._id} className="p-3 bg-slate-50 dark:bg-base-300/50 rounded-xl">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                                                    <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 dark:text-white truncate">
                                                        {quiz.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(quiz.startAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
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

export default StudentCalendarPage;