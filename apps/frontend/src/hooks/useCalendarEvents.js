import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { courseKeys } from "./useCourses";

// ── Queries ─────────────────────────────────────────────

/** Fetch calendar events for a course */
export function useCourseCalendarEvents(courseId) {
    return useQuery({
        queryKey: courseKeys.calendarEvents(courseId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/courses/${courseId}/events`);
            return data.events ?? data.calendarEvents ?? data.data ?? [];
        },
        enabled: !!courseId,
    });
}

// ── Mutations ───────────────────────────────────────────

/** Create a calendar event */
export function useCreateCalendarEvent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ courseId, ...body }) =>
            axios.post(`/api/courses/${courseId}/events`, body),
        onSuccess: (_, { courseId }) => {
            qc.invalidateQueries({ queryKey: courseKeys.calendarEvents(courseId) });
        },
    });
}

/** Update a calendar event */
export function useUpdateCalendarEvent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ courseId, eventId, ...body }) =>
            axios.put(`/api/courses/${courseId}/events/${eventId}`, body),
        onSuccess: (_, { courseId }) => {
            qc.invalidateQueries({ queryKey: courseKeys.calendarEvents(courseId) });
        },
    });
}

/** Delete a calendar event */
export function useDeleteCalendarEvent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ courseId, eventId }) =>
            axios.delete(`/api/courses/${courseId}/events/${eventId}`),
        onSuccess: (_, { courseId }) => {
            qc.invalidateQueries({ queryKey: courseKeys.calendarEvents(courseId) });
        },
    });
}
