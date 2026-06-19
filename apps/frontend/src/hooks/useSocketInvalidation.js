import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useSocketStore from "../stores/SocketStore";
import { courseKeys } from "./useCourses";
import { quizKeys } from "./useQuizzes";
import { attemptKeys } from "./useAttempts";
import { notifKeys } from "./useNotifications";

/**
 * Maps socket events to TanStack Query key invalidation.
 *
 * Drop this component once in the app tree (e.g. inside <SocketListener>)
 * and it automatically invalidates the right query caches when real-time
 * socket events arrive from the backend.
 *
 * @param {object} props
 * @param {boolean} [props.enabled=true] - Set to false to disable (e.g. on login page)
 */
export default function useSocketInvalidation({ enabled = true } = {}) {
    const qc = useQueryClient();
    const socket = useSocketStore((s) => s.socket);

    useEffect(() => {
        if (!socket || !enabled) return;

        function invalidate(...keys) {
            qc.invalidateQueries({ queryKey: keys });
        }

        // ── Quiz events ─────────────────────────────
        socket.on("new-quiz", () => {
            invalidate(...quizKeys.available());
        });

        // ── Attempt / grade events ───────────────────
        socket.on("quiz-graded", () => {
            invalidate(...attemptKeys.myGrades());
            invalidate(...notifKeys.all);
        });

        socket.on("quiz-missed", () => {
            invalidate(...attemptKeys.myGrades());
            invalidate(...notifKeys.all);
        });

        // ── Course events ────────────────────────────
        socket.on("course-updated", (data) => {
            if (data?.courseId) {
                invalidate(...courseKeys.detail(data.courseId));
            }
            invalidate(...courseKeys.my());
        });

        // ── Calendar events ──────────────────────────
        socket.on("calendar-event", (data) => {
            if (data?.courseId) {
                invalidate(...courseKeys.calendarEvents(data.courseId));
            }
            invalidate(...notifKeys.all);
        });

        socket.on("calendar-event-updated", (data) => {
            if (data?.courseId) {
                invalidate(...courseKeys.calendarEvents(data.courseId));
            }
        });

        socket.on("calendar-event-deleted", (data) => {
            if (data?.courseId) {
                invalidate(...courseKeys.calendarEvents(data.courseId));
            }
        });

        // ── Contest events ───────────────────────────
        socket.on("contest-submitted", () => {
            invalidate(...attemptKeys.myGrades());
            invalidate(...notifKeys.all);
        });

        socket.on("contest-resolved", (data) => {
            if (data?.attemptId) {
                invalidate(...attemptKeys.detail(data.attemptId));
            }
            invalidate(...attemptKeys.myGrades());
            invalidate(...notifKeys.all);
        });

        // ── Notification events ──────────────────────
        socket.on("new-note", () => invalidate(...notifKeys.all));
        socket.on("new-ticket", () => invalidate(...notifKeys.all));
        socket.on("ticket-response", () => invalidate(...notifKeys.all));

        return () => {
            socket.off("new-quiz");
            socket.off("quiz-graded");
            socket.off("quiz-missed");
            socket.off("course-updated");
            socket.off("calendar-event");
            socket.off("calendar-event-updated");
            socket.off("calendar-event-deleted");
            socket.off("contest-submitted");
            socket.off("contest-resolved");
            socket.off("new-note");
            socket.off("new-ticket");
            socket.off("ticket-response");
        };
    }, [socket, qc, enabled]);
}
