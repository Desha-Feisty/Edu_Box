import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

// ── Query Keys ──────────────────────────────────────────
export const quizKeys = {
    all: ["quizzes"],
    course: (courseId) => [...quizKeys.all, "course", courseId],
    available: () => [...quizKeys.all, "available"],
    detail: (id) => [...quizKeys.all, id],
    grades: (id) => [...quizKeys.all, id, "grades"],
    questions: (id) => [...quizKeys.all, id, "questions"],
};

// ── Queries ─────────────────────────────────────────────

/** Fetch quizzes for a specific course */
export function useCourseQuizzes(courseId) {
    return useQuery({
        queryKey: quizKeys.course(courseId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/quizzes/course/${courseId}`);
            return data.filteredQuizzes ?? data.quizzes ?? data.data ?? [];
        },
        enabled: !!courseId,
    });
}

/** Fetch available quizzes (for student dashboard) */
export function useAvailableQuizzes() {
    return useQuery({
        queryKey: quizKeys.available(),
        queryFn: async () => {
            const { data } = await axios.get("/api/quizzes/available");
            return data.quizzes ?? data.data ?? [];
        },
        staleTime: 2 * 60 * 1000,
    });
}

/** Fetch a single quiz with questions */
export function useQuizDetail(quizId) {
    return useQuery({
        queryKey: quizKeys.detail(quizId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/quizzes/${quizId}`);
            return data.quiz ?? data.data?.quiz ?? data;
        },
        enabled: !!quizId,
    });
}

/** Fetch grades for a specific quiz (teacher view) */
export function useQuizGrades(quizId) {
    return useQuery({
        queryKey: quizKeys.grades(quizId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/quizzes/${quizId}/grades`);
            return data.results ?? data.data ?? [];
        },
        enabled: !!quizId,
    });
}

/** Fetch questions for a quiz */
export function useQuizQuestions(quizId) {
    return useQuery({
        queryKey: quizKeys.questions(quizId),
        queryFn: async () => {
            const { data } = await axios.get(`/api/quizzes/${quizId}`);
            return data.questions ?? data.quiz?.questions ?? [];
        },
        enabled: !!quizId,
    });
}

// ── Mutations ───────────────────────────────────────────

/** Create a quiz */
export function useCreateQuiz() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ courseId, ...body }) =>
            axios.post(`/api/quizzes/${courseId}/quizzes`, body),
        onSuccess: (_, { courseId }) => {
            qc.invalidateQueries({ queryKey: quizKeys.course(courseId) });
        },
    });
}

/** Update a quiz */
export function useUpdateQuiz() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ quizId, ...body }) =>
            axios.put(`/api/quizzes/${quizId}`, body),
        onSuccess: (_, { quizId }) => {
            qc.invalidateQueries({ queryKey: quizKeys.detail(quizId) });
            qc.invalidateQueries({ queryKey: quizKeys.all });
        },
    });
}

/** Delete a quiz */
export function useDeleteQuiz() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (quizId) => axios.delete(`/api/quizzes/${quizId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: quizKeys.all });
        },
    });
}

/** Publish/unpublish a quiz */
export function usePublishQuiz() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ quizId, published }) =>
            published
                ? axios.post(`/api/quizzes/${quizId}/publish`)
                : axios.put(`/api/quizzes/${quizId}`, { published: false }),
        onSuccess: (_, { quizId }) => {
            qc.invalidateQueries({ queryKey: quizKeys.detail(quizId) });
            qc.invalidateQueries({ queryKey: quizKeys.available() });
        },
    });
}

/** Add a question to a quiz */
export function useAddQuestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ quizId, ...body }) =>
            axios.post(`/api/quizzes/${quizId}/questions`, body),
        onSuccess: (_, { quizId }) => {
            qc.invalidateQueries({ queryKey: quizKeys.questions(quizId) });
            qc.invalidateQueries({ queryKey: quizKeys.detail(quizId) });
        },
    });
}
