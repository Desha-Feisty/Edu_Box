import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

// ── Query Keys ──────────────────────────────────────────
export const attemptKeys = {
    all: ["attempts"],
    myGrades: () => [...attemptKeys.all, "my-grades"],
    detail: (id) => [...attemptKeys.all, id],
    recentTeacher: () => [...attemptKeys.all, "recent", "teacher"],
    studentCourse: (studentId, courseId) => [...attemptKeys.all, "student", studentId, "course", courseId],
};

// ── Queries ─────────────────────────────────────────────

/** Fetch current user's grades */
export function useMyGrades() {
    return useQuery({
        queryKey: attemptKeys.myGrades(),
        queryFn: async () => {
            const { data } = await axios.get("/api/attempts/my-grades");
            return data.results ?? data.data ?? [];
        },
        staleTime: 2 * 60 * 1000,
    });
}

/** Fetch a single attempt by ID */
export function useAttemptDetail(attemptId) {
    return useQuery({
        queryKey: attemptKeys.detail(attemptId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/attempts/${attemptId}`);
            return data.attempt ?? data.data?.attempt ?? data;
        },
        enabled: !!attemptId,
    });
}

/** Fetch recent submissions (teacher view) */
export function useRecentSubmissions() {
    return useQuery({
        queryKey: attemptKeys.recentTeacher(),
        queryFn: async () => {
            const { data } = await axios.get("/api/attempts/recent/teacher");
            return { submissions: data.submissions ?? [], totalCount: data.totalCount ?? 0 };
        },
        staleTime: 60 * 1000,
    });
}

/** Fetch a student's grades for a specific course (teacher view) */
export function useStudentCourseGrades(studentId, courseId) {
    return useQuery({
        queryKey: attemptKeys.studentCourse(studentId, courseId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/attempts/student/${studentId}/course/${courseId}`);
            return data.results ?? data.data ?? [];
        },
        enabled: !!studentId && !!courseId,
    });
}

// ── Mutations ───────────────────────────────────────────

/** Start a quiz attempt */
export function useStartAttempt() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (quizId) => axios.post("/api/attempts/start", { quizId }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: attemptKeys.myGrades() });
        },
    });
}

/** Submit an answer during an attempt */
export function useSubmitAnswer() {
    return useMutation({
        mutationFn: ({ attemptId, questionId, choices, text }) =>
            axios.patch(`/api/attempts/${attemptId}/answers`, {
                questionId,
                choices,
                text,
            }),
    });
}

/** Finalize and submit an attempt */
export function useSubmitAttempt() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (attemptId) => axios.post(`/api/attempts/${attemptId}/submit`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: attemptKeys.myGrades() });
        },
    });
}

/** Override a score (teacher grading) */
export function useOverrideScore() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ attemptId, index, score, feedback }) =>
            axios.patch(`/api/attempts/${attemptId}/responses/${index}/score`, {
                score,
                feedback,
            }),
        onSuccess: (_, { attemptId }) => {
            qc.invalidateQueries({ queryKey: attemptKeys.detail(attemptId) });
        },
    });
}
