import { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { motion } from "framer-motion";
import {
    Calendar as CalendarIcon,
    Clock,
    BookOpen,
    ClipboardList,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

function CourseCalendar({ events = [], onEventClick }) {
    const [calendarRef, setCalendarRef] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Process events for FullCalendar
    const processedEvents = useMemo(() => {
        return events.map((event) => {
            const isExpired = isPast(new Date(event.closeAt || event.endAt));
            const isCompleted = event.completed === true;
            const isOverdue = isExpired && !isCompleted;
            
            return {
                id: event._id,
                title: event.title,
                start: event.openAt || event.startAt,
                end: event.closeAt || event.endAt,
                backgroundColor: isOverdue 
                    ? "#EF4444" 
                    : isCompleted 
                        ? "#22C55E" 
                        : isExpired 
                            ? "#22C55E" 
                            : "#8B5CF6",
                borderColor: isOverdue 
                    ? "#EF4444" 
                    : isCompleted 
                        ? "#22C55E" 
                        : isExpired 
                            ? "#22C55E" 
                            : "#8B5CF6",
                extendedProps: {
                    type: event.type || "quiz",
                    course: event.course,
                    duration: event.durationMinutes,
                    completed: isCompleted,
                    status: isOverdue ? "overdue" : isCompleted ? "completed" : isExpired ? "completed" : "upcoming",
                },
            };
        });
    }, [events]);

    const handleEventClick = (info) => {
        const event = info.event;
        onEventClick?.({
            _id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            ...event.extendedProps,
        });
    };

    const customButtons = {
        prev: {
            text: <ChevronLeft className="w-5 h-5" />,
            click: () => {
                calendarRef?.getApi().prev();
                setCurrentDate(calendarRef?.getApi().getDate());
            },
        },
        next: {
            text: <ChevronRight className="w-5 h-5" />,
            click: () => {
                calendarRef?.getApi().next();
                setCurrentDate(calendarRef?.getApi().getDate());
            },
        },
        today: {
            text: "Today",
            click: () => {
                calendarRef?.getApi().today();
                setCurrentDate(calendarRef?.getApi().getDate());
            },
        },
    };

    const getEventContent = (eventInfo) => {
        const { status, type } = eventInfo.event.extendedProps;
        
        const statusColors = {
            overdue: "bg-red-500",
            completed: "bg-green-500",
            upcoming: "bg-violet-500",
        };

        const statusLabels = {
            overdue: "Overdue",
            completed: "Done",
            upcoming: "",
        };

        return (
            <div className={`flex items-center gap-1.5 px-1.5 py-1 ${statusColors[status]} rounded-md text-white`}>
                {type === "quiz" ? (
                    <ClipboardList className="w-3 h-3 shrink-0" />
                ) : (
                    <BookOpen className="w-3 h-3 shrink-0" />
                )}
                <span className="text-xs font-medium truncate flex-1">
                    {eventInfo.event.title}
                </span>
                {status === "overdue" && (
                    <span className="text-xs font-medium bg-white/20 px-1.5 py-0.5 rounded">
                        {statusLabels.overdue}
                    </span>
                )}
                {status === "completed" && (
                    <span className="text-xs font-medium bg-white/20 px-1.5 py-0.5 rounded">
                        {statusLabels.completed}
                    </span>
                )}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-base-200 rounded-3xl shadow-md overflow-hidden"
        >
            {/* Calendar Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {format(currentDate, "MMMM yyyy")}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                ClipboardList deadlines & schedule
                            </p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-violet-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">Upcoming</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">Overdue</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar */}
            <div className="p-4">
                <FullCalendar
                    ref={setCalendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: "",
                    }}
                    events={processedEvents}
                    eventClick={handleEventClick}
                    customButtons={customButtons}
                    eventContent={getEventContent}
                    height="auto"
                    dayMaxEvents={3}
                    nowIndicator={true}
                    selectable={true}
                    editable={false}
                    eventTimeFormat={{
                        hour: "numeric",
                        minute: "2-digit",
                        meridiem: "short",
                    }}
                    titleFormat={{
                        month: "long",
                        year: "numeric",
                    }}
                    slotLabelFormat={{
                        hour: "numeric",
                        minute: "2-digit",
                        meridiem: "short",
                    }}
                    eventDisplay="block"
                    displayEventTime={true}
                    eventOverlap={true}
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    allDaySlot={true}
                />
            </div>

            {/* Upcoming Deadlines */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    Upcoming Deadlines
                </h4>
                <div className="space-y-2">
                    {events
                        .filter((e) => !isPast(new Date(e.closeAt || e.endAt)))
                        .sort((a, b) => new Date(a.closeAt) - new Date(b.closeAt))
                        .slice(0, 5)
                        .map((event) => {
                            const dueDate = new Date(event.closeAt || event.endAt);
                            const isOverdueToday = isToday(dueDate);
                            
                            return (
                                <button
                                    key={event._id}
                                    onClick={() => onEventClick?.(event)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        isOverdueToday 
                                            ? "bg-red-100 dark:bg-red-500/20" 
                                            : "bg-violet-100 dark:bg-violet-500/20"
                                    }`}>
                                        {isOverdueToday ? (
                                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        ) : (
                                            <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white truncate">
                                            {event.title}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {event.course?.title} • {event.durationMinutes} min
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-sm font-medium ${
                                            isOverdueToday 
                                                ? "text-red-600 dark:text-red-400" 
                                                : "text-slate-600 dark:text-slate-400"
                                        }`}>
                                            {isToday(dueDate)
                                                ? "Today"
                                                : isTomorrow(dueDate)
                                                    ? "Tomorrow"
                                                    : format(dueDate, "MMM d")}
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                            {format(dueDate, "h:mm a")}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    {events.filter((e) => !isPast(new Date(e.closeAt || e.endAt))).length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                            No upcoming deadlines
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default CourseCalendar;