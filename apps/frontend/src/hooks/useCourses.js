import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "../lib/api";
import axios from "axios";

// ── Query Keys ──────────────────────────────────────────
export const courseKeys = {
    all: ["courses"],
    my: () => [...courseKeys.all, "my"],
    detail: (id) => [...courseKeys.all, id],
    roster: (id) => [...courseKeys.all, id, "roster"],
    students: (id) => [...courseKeys.all, id, "students"],
    calendarEvents: (id) => [...courseKeys.all, id, "events"],
};

// ── Queries ─────────────────────────────────────────────

/** Fetch the current user's enrolled/owned courses */
export function useMyCourses() {
    return useQuery({
        queryKey: courseKeys.my(),
        queryFn: async () => {
            const { data } = await axios.get("/api/courses/my");
            return data.courses ?? data.data?.courses ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

/** Fetch a single course by ID */
export function useCourse(courseId) {
    return useQuery({
        queryKey: courseKeys.detail(courseId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/courses/${courseId}`);
            return data.course ?? data.data?.course ?? data;
        },
        enabled: !!courseId,
    });
}

/** Fetch roster (enrolled students) for a course */
export function useCourseRoster(courseId) {
    return useQuery({
        queryKey: courseKeys.roster(courseId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/courses/${courseId}/roster`);
            return data.enrollment ?? data.data?.enrollment ?? [];
        },
        enabled: !!courseId,
    });
}

// ── Mutations ───────────────────────────────────────────

/** Update course details */
export function useUpdateCourse() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }) => coursesApi.update(id, body),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: courseKeys.detail(id) });
            qc.invalidateQueries({ queryKey: courseKeys.my() });
        },
    });
}

/** Delete a course */
export function useDeleteCourse() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => coursesApi.delete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: courseKeys.all });
        },
    });
}

/** Join a course by join code */
export function useJoinCourse() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (joinCode) => coursesApi.join(joinCode),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: courseKeys.my() });
        },
    });
}

/** Create a new course */
export function useCreateCourse() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => coursesApi.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: courseKeys.my() });
        },
    });
}

/** Remove a student enrollment */
export function useRemoveEnrollment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ courseId, studentId }) =>
            axios.delete(`/api/courses/${courseId}/enrollment`, { data: { studentId } }),
        onSuccess: (_, { courseId }) => {
            qc.invalidateQueries({ queryKey: courseKeys.roster(courseId) });
        },
    });
}
