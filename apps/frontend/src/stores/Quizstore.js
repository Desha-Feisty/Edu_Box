import { create } from "zustand";
import axios from "axios";
import useAuthStore from "./Authstore";

const useQuizStore = create((set) => ({
    quizzes: [],
    availableQuizzes: [],
    myGrades: [],
    quizGrades: [],
    currentAttempt: null,
    attemptQuestions: [],
    gradesLoading: false,
    gradesError: null,
    attemptError: null,
    errMsg: null,
    setQuizzes: (quizzes) => set({ quizzes }),
    setErrMsg: (errMsg) => set({ errMsg }),
    clearErrMsg: () => set({ errMsg: null }),

    createQuiz: async (courseId, quizData) => {
        try {
            set({ errMsg: null });
            const token = useAuthStore.getState().token;
            if (!token) {
                const errMsg = "Not authenticated. Please log in again.";
                set({ errMsg });
                throw new Error(errMsg);
            }
            const response = await axios.post(
                `/api/quizzes/${courseId}/quizzes`,
                quizData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            if (response.status === 201) {
                set((state) => ({
                    quizzes: [...state.quizzes, response.data.quiz],
                }));
                return response.data;
            }
            const errMsg =
                response.data?.errMsg ||
                response.data?.error ||
                "Failed to create quiz";
            set({ errMsg });
            throw new Error(errMsg);
        } catch (error) {
            const errMsg =
                error.response?.data?.errMsg ||
                error.response?.data?.error ||
                error.message ||
                "Failed to create quiz";
            set({ errMsg });
            throw new Error(errMsg);
        }
    },

    listCourseQuizzes: async (courseId) => {
        try {
            set({ errMsg: null });
            const token = useAuthStore.getState().token;
            const response = await axios.get(
                `/api/quizzes/course/${courseId}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            if (response.status === 200) {
                set({ quizzes: response.data.filteredQuizzes });
            }
        } catch (error) {
            set({
                errMsg:
                    error.response?.data?.errMsg ||
                    error.response?.data?.error ||
                    error.message,
            });
        }
    },

    deleteQuiz: async (quizId) => {
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.delete(`/api/quizzes/${quizId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 200) {
                set((state) => ({
                    quizzes: state.quizzes.filter((q) => q._id !== quizId),
                }));
            }
        } catch (error) {
            set({ errMsg: error.message });
        }
    },

    getQuiz: async (quizId) => {
        try {
            set({ errMsg: null });
            const token = useAuthStore.getState().token;
            if (!token) {
                const errMsg = "Not authenticated. Please log in again.";
                set({ errMsg });
                throw new Error(errMsg);
            }
            const response = await axios.get(`/api/quizzes/${quizId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data.quiz || response.data;
        } catch (error) {
            const errMsg = error.response?.data?.errMsg || error.message;
            set({ errMsg });
            throw new Error(errMsg);
        }
    },

    listQuizQuestions: async (quizId) => {
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.get(`/api/quizzes/${quizId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // The backend returns { quiz, questions }
            return response.data.questions || [];
        } catch (error) {
            set({ errMsg: error.message });
            return [];
        }
    },

    addQuestion: async (quizId, questionData) => {
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.post(
                `/api/quizzes/${quizId}/questions`,
                questionData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            return response.data.question;
        } catch (error) {
            set({ errMsg: error.response?.data?.errMsg || error.message });
            throw error;
        }
    },

    updateQuestion: async (questionId, questionData) => {
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.put(
                `/api/questions/${questionId}`,
                questionData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            return response.data.question;
        } catch (error) {
            set({ errMsg: error.response?.data?.errMsg || error.message });
            throw error;
        }
    },

    deleteQuestion: async (questionId) => {
        try {
            const token = useAuthStore.getState().token;
            await axios.delete(`/api/questions/${questionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (error) {
            set({ errMsg: error.response?.data?.errMsg || error.message });
            throw error;
        }
    },

    fetchAvailableQuizzes: async () => {
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.get("/api/quizzes/available", {
                headers: { Authorization: `Bearer ${token}` },
            });
            set({ availableQuizzes: response.data.quizzes || [] });
        } catch {
            set({ availableQuizzes: [] });
        }
    },

    listMyGrades: async () => {
        try {
            set({ gradesLoading: true, gradesError: null });
            const token = useAuthStore.getState().token;
            const response = await axios.get("/api/attempts/my-grades", {
                headers: { Authorization: `Bearer ${token}` },
            });
            set({ myGrades: response.data.results || [] });
        } catch (error) {
            if (error.response?.status === 404) {
                set({ myGrades: [], gradesError: null });
            } else {
                set({
                    myGrades: [],
                    gradesError:
                        error.response?.data?.errMsg ||
                        error.response?.data?.error ||
                        error.message,
                });
            }
        } finally {
            set({ gradesLoading: false });
        }
    },

    startAttempt: async (quizId) => {
        try {
            set({ attemptError: null });
            const token = useAuthStore.getState().token;
            
            const response = await axios.post(
                "/api/attempts/start",
                { quizId },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 30000,
                }
            );

            const attemptData = {
                _id: response.data.attemptId,
                endAt: response.data.endAt,
            };

            set({
                currentAttempt: attemptData,
                attemptQuestions: response.data.questions || [],
            });

            return { attempt: attemptData, questions: response.data.questions };
        } catch (error) {
            set({
                attemptError: error.response?.data?.errMsg || error.message,
            });
            return null;
        }
    },

    fetchAttempt: async (attemptId) => {
        try {
            set({ attemptError: null });
            const token = useAuthStore.getState().token;
            const response = await axios.get(`/api/attempts/${attemptId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const attempt = response.data.attempt;
            let questions;

            if (attempt?.status === "inProgress") {
                // For in-progress attempts, fetch questions from the quiz API
                // but don't rely on it for choices - they're already in responses
                const quizResponse = await axios.get(
                    `/api/quizzes/${response.data.quiz._id}`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                const quizQuestions = quizResponse.data.questions || [];
                const answeredMap = new Map(
                    (response.data.responses || []).map((r) => [r.questionId, r]),
                );
                
                // Get choices from responses if available, otherwise use quiz questions
                questions = response.data.responses?.length > 0 && response.data.responses[0]?.choices?.length > 0
                    ? response.data.responses.map((r) => ({
                        _id: r.questionId,
                        prompt: r.prompt,
                        questionType: r.questionType,
                        points: r.points,
                        choices: r.choices || [],
                        selectedChoiceIds: r.selectedChoiceIds,
                        textAnswer: r.textAnswer,
                    }))
                    : quizQuestions.map((q) => {
                        const answered = answeredMap.get(q._id?.toString() || q._id);
                        return answered
                            ? { ...q, selectedChoiceIds: answered.selectedChoiceIds, textAnswer: answered.textAnswer }
                            : q;
                    });
            } else {
                questions = (response.data.responses || []).map((r) => ({
                    _id: r.questionId,
                    prompt: r.prompt,
                    questionType: r.questionType,
                    points: r.points,
                    choices: r.choices || [],
                    selectedChoiceIds: r.selectedChoiceIds,
                    textAnswer: r.textAnswer,
                    aiScore: r.aiScore,
                    aiFeedback: r.aiFeedback,
                }));
            }

            set({
                currentAttempt: attempt,
                attemptQuestions: questions,
            });

            return response.data;
        } catch (error) {
            const status = error.response?.status;
            const errMsg = error.response?.data?.errMsg || error.message;
            set({ attemptError: errMsg });

            // Propagate 404 errors so calling components can handle redirects
            if (status === 404) {
                throw error;
            }

            return null;
        }
    },

    submitAnswer: async (attemptId, questionId, selectedChoiceIds, textAnswer) => {
        try {
            const token = useAuthStore.getState().token;
            const payload = { questionId };
            
            if (textAnswer != null) {
                payload.textAnswer = textAnswer;
            } else if (selectedChoiceIds) {
                payload.selectedChoiceIds = selectedChoiceIds;
            }
            
            await axios.patch(
                `/api/attempts/${attemptId}/answers`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            return true;
        } catch {
            return false;
        }
    },

    submitAttempt: async (attemptId) => {
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.post(
                `/api/attempts/${attemptId}/submit`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            );
            set({ currentAttempt: null, attemptQuestions: [] });
            // Return the full response data including gradingMode
            return response.data;
        } catch {
            return false;
        }
    },

    generateAiQuestions: async (quizId, topic, count, questionType = "mcq_single", points = 1) => {
        try {
            set({ errMsg: null });
            const token = useAuthStore.getState().token;
            const response = await axios.post(
                `/api/quizzes/${quizId}/questions/generate-ai`,
                { topic, count, questionType, points },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            return response.data;
        } catch (error) {
            const errMsg =
                error.response?.data?.errMsg ||
                error.response?.data?.error ||
                error.message ||
                "Failed to generate AI questions";
            set({ errMsg });
            throw error;
        }
    },

    generateFromFile: async (quizId, file, questionType = "mcq_single", count = 5, points = 1) => {
        try {
            set({ errMsg: null });
            const token = useAuthStore.getState().token;
            const formData = new FormData();
            formData.append("file", file);
            formData.append("questionType", questionType);
            formData.append("count", String(count));
            formData.append("points", String(points));
            const response = await axios.post(
                `/api/quizzes/${quizId}/questions/generate-from-file`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            return response.data;
        } catch (error) {
            const errMsg =
                error.response?.data?.errMsg ||
                error.response?.data?.error ||
                error.message ||
                "Failed to generate questions from file";
            set({ errMsg });
            throw error;
        }
    },

    publishQuiz: async (quizId) => {
        try {
            set({ errMsg: null });
            const token = useAuthStore.getState().token;
            const response = await axios.post(
                `/api/quizzes/${quizId}/publish`,
                {},
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            set((state) => ({
                quizzes: state.quizzes.map((q) =>
                    q._id === quizId ? { ...q, published: true } : q,
                ),
            }));
            return response.data;
        } catch (error) {
            const errMsg =
                error.response?.data?.errMsg ||
                error.response?.data?.error ||
                error.message ||
                "Failed to publish quiz";
            set({ errMsg });
            throw error;
        }
    },

    updateQuiz: async (quizId, quizData) => {
        try {
            set({ errMsg: null });
            const token = useAuthStore.getState().token;
            if (!token) {
                const errMsg = "Not authenticated. Please log in again.";
                set({ errMsg });
                throw new Error(errMsg);
            }
            const response = await axios.put(`/api/quizzes/${quizId}`, quizData, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 200) {
                set((state) => ({
                    quizzes: state.quizzes.map((q) =>
                        q._id === quizId ? { ...q, ...response.data.quiz } : q,
                    ),
                }));
                return response.data;
            }
            const errMsg =
                response.data?.errMsg ||
                response.data?.error ||
                "Failed to update quiz";
            set({ errMsg });
            throw new Error(errMsg);
        } catch (error) {
            const errMsg =
                error.response?.data?.errMsg ||
                error.response?.data?.error ||
                error.message ||
                "Failed to update quiz";
            set({ errMsg });
            throw new Error(errMsg);
        }
    },

    unpublishQuiz: async (quizId) => {
        try {
            set({ errMsg: null });
            const token = useAuthStore.getState().token;
            const response = await axios.put(
                `/api/quizzes/${quizId}`,
                { published: false },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            set((state) => ({
                quizzes: state.quizzes.map((q) =>
                    q._id === quizId ? { ...q, published: false } : q,
                ),
            }));
            return response.data;
        } catch (error) {
            const errMsg =
                error.response?.data?.errMsg ||
                error.response?.data?.error ||
                error.message ||
                "Failed to unpublish quiz";
            set({ errMsg });
            throw error;
        }
    },

    listQuizGrades: async (quizId) => {
        try {
            set({ errMsg: null, gradesLoading: true, gradesError: null });
            const token = useAuthStore.getState().token;
            const response = await axios.get(`/api/quizzes/${quizId}/grades`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ quizGrades: response.data.results || [], gradesLoading: false });
            return response.data;
        } catch (error) {
            set({
                quizGrades: [],
                gradesError: error.response?.data?.errMsg ||
                    error.response?.data?.error ||
                    error.message ||
                    "Failed to fetch quiz grades",
                gradesLoading: false,
            });
            throw error;
        }
    },
}));

export default useQuizStore;
