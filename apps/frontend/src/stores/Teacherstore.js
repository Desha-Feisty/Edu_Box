import { create } from "zustand";
import axios from "axios";
import useAuthStore from "./Authstore";

const useTeacherStore = create((set, get) => ({
    errMsg: null,
    setErrMsg: (errMsg) => set({ errMsg: errMsg }),
    clearErrMsg: () => set({ errMsg: null }),
    allCourses: [],
    setAllCourses: (allCourses) => set({ allCourses: allCourses }),
    recentChats: [],
    recentChatsLoading: false,
    createCourse: async (title, description) => {
        // Wait for auth token to be available with timeout
        const MAX_WAIT_MS = 5000;
        const RETRY_DELAY = 100;
        let token = useAuthStore.getState().token;
        const startTime = Date.now();
        let retries = 3;

        while (!token && retries > 0) {
            if (Date.now() - startTime > MAX_WAIT_MS) {
                set({ errMsg: "Authentication timeout. Please refresh." });
                return;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            token = useAuthStore.getState().token;
            retries--;
        }

        if (!token) {
            set({ errMsg: "Not authenticated. Please log in again." });
            return;
        }
        const courseData = { title, description };
        try {
            const response = await axios.post("/api/courses", courseData, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status !== 201) {
                throw new Error("Failed to create course");
            }
            const data = response.data.course;
            set((state) => ({ allCourses: [...state.allCourses, data] }));
        } catch { /* Silent */ }
    },
    listMyCourses: async () => {
        try {
            // Wait for auth token to be available with timeout
            const MAX_WAIT_MS = 5000;
            const RETRY_DELAY = 100;
            let token = useAuthStore.getState().token;
            const startTime = Date.now();
            let retries = 3;

            while (!token && retries > 0) {
                if (Date.now() - startTime > MAX_WAIT_MS) {
                    set({ errMsg: "Authentication timeout. Please refresh." });
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                token = useAuthStore.getState().token;
                retries--;
            }

            if (!token) {
                set({ errMsg: "Not authenticated. Please log in again." });
                return;
            }
            const response = await axios.get("/api/courses/my", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status !== 200) {
                throw new Error("Failed to list courses");
            }
            set({ allCourses: response.data.courses });
        } catch (error) {
            set({ errMsg: error.message });
        }
    },
    getCourse: async (id) => {
        try {
            const response = await axios.get(`/api/courses/${id}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${useAuthStore.getState().token}`,
                },
            });
            if (response.status !== 200) {
                throw new Error("Failed to get course");
            }
            const data = response.data.course;
            set((state) => {
                const exists = state.allCourses.find(
                    (c) => (c._id || c.id) === id,
                );
                if (exists) {
                    return {
                        allCourses: state.allCourses.map((course) =>
                            (course._id || course.id) === id ? data : course,
                        ),
                    };
                } else {
                    return { allCourses: [...state.allCourses, data] };
                }
            });
        } catch (error) {
            set({ errMsg: error.message });
        }
    },
    updateCourse: async (id, title, description) => {
        const courseData = { title, description };
        try {
            const response = await axios.patch(
                `/api/courses/${id}`,
                courseData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${useAuthStore.getState().token}`,
                    },
                },
            );
            if (response.status !== 200) {
                throw new Error("Failed to update course");
            }
            const data = response.data.course;
            set((state) => ({
                allCourses: state.allCourses.map((course) =>
                    (course._id || course.id) === id ? data : course,
                ),
            }));
        } catch (error) {
            set({ errMsg: error.message });
        }
    },

    deleteCourse: async (id) => {
        try {
            const response = await axios.delete(`/api/courses/${id}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${useAuthStore.getState().token}`,
                },
            });
            if (response.status !== 200) {
                throw new Error("Failed to delete course");
            }
            set((state) => ({
                allCourses: state.allCourses.filter(
                    (course) => (course._id || course.id) !== id,
                ),
            }));
        } catch (error) {
            set({ errMsg: error.message });
        }
    },
    listAllCourses: async () => {
        try {
            const response = await axios.get("/api/courses", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${useAuthStore.getState().token}`,
                },
            });
            if (response.status !== 200) {
                throw new Error("Failed to list courses");
            }
            const data = response.data.courses;
            set((state) => ({ allCourses: [...state.allCourses, ...data] }));
        } catch (error) {
            set({ errMsg: error.message });
        }
    },
    getRoster: async (id) => {
        try {
            const response = await axios.get(`/api/courses/${id}/roster`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${useAuthStore.getState().token}`,
                },
            });
            if (response.status !== 200) {
                throw new Error("Failed to get roster");
            }
            const data = response.data;
            set((state) => ({
                allCourses: state.allCourses.map((course) =>
                    (course._id || course.id) === id ? data : course,
                ),
            }));
            return data; // Return the roster data
        } catch (error) {
            set({ errMsg: error.message });
            throw error; // Re-throw so the calling function can handle it
        }
    },

    removeEnrollment: async (courseId, studentId) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await axios.delete(
                `/api/courses/${courseId}/enrollment`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    data: { studentId },
                },
            );

            if (response.status !== 200) {
                throw new Error("Failed to remove student");
            }

            return response.data;
        } catch (error) {
            set({ errMsg: error.message });
            throw error;
        }
    },

    // Community Notes Actions
    createNote: async (courseId, { title, content }) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await axios.post(
                `/api/notes/courses/${courseId}/notes`,
                { title, content },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (response.status !== 201) {
                throw new Error("Failed to create note");
            }

            return response.data.note;
        } catch (error) {
            throw new Error(error.response?.data?.errMsg || error.message);
        }
    },

    listCourseNotes: async (courseId) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await axios.get(
                `/api/notes/courses/${courseId}/notes`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (response.status !== 200) {
                throw new Error("Failed to fetch notes");
            }

            return response.data.notes || [];
        } catch (error) {
            throw new Error(error.response?.data?.errMsg || error.message);
        }
    },

    getNoteWithComments: async (noteId) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await axios.get(`/api/notes/${noteId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status !== 200) {
                throw new Error("Failed to fetch note");
            }

            return {
                note: response.data.note,
                comments: response.data.comments,
            };
        } catch (error) {
            throw new Error(error.response?.data?.errMsg || error.message);
        }
    },

    updateNote: async (noteId, { title, content }) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const updateData = {};
            if (title) updateData.title = title;
            if (content) updateData.content = content;

            const response = await axios.put(
                `/api/notes/${noteId}`,
                updateData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (response.status !== 200) {
                throw new Error("Failed to update note");
            }

            return response.data.note;
        } catch (error) {
            throw new Error(error.response?.data?.errMsg || error.message);
        }
    },

    deleteNote: async (noteId) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await axios.delete(`/api/notes/${noteId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status !== 200) {
                throw new Error("Failed to delete note");
            }

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.errMsg || error.message);
        }
    },

    addComment: async (noteId, { content }) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await axios.post(
                `/api/comments/${noteId}/comments`,
                { content },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (response.status !== 201) {
                throw new Error("Failed to add comment");
            }

            return response.data.comment;
        } catch (error) {
            throw new Error(error.response?.data?.errMsg || error.message);
        }
    },

    deleteComment: async (commentId) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await axios.delete(`/api/comments/${commentId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status !== 200) {
                throw new Error("Failed to delete comment");
            }

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.errMsg || error.message);
        }
    },

    updateComment: async (commentId, { content }) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await axios.put(
                `/api/comments/${commentId}`,
                { content },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (response.status !== 200) {
                throw new Error("Failed to update comment");
            }

            return response.data.comment;
        } catch (error) {
            throw new Error(error.response?.data?.errMsg || error.message);
        }
    },

    listRecentChats: async (silent = false) => {
        // Prevent overlapping requests
        if (get().recentChatsLoading) return;
        
        if (!silent) set({ recentChatsLoading: true });
        
        // Get current user ID and token
        const authState = useAuthStore.getState();
        const currentUser = authState.user;
        const currentUserId = currentUser?.id || currentUser?._id;
        const token = authState.token;
        
        if (!token) {
            set({ recentChatsLoading: false });
            return;
        }
        
        try {
            const response = await axios.get("/api/chats/v2/recent", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.status !== 200) {
                throw new Error("Failed to list recent chats");
            }
            const data = response.data.results || response.data;
            const conversationList = Object.entries(data)
                .map(([key, convData]) => {
                    const { messages, peer, course, peerId, courseId } =
                        convData;
                    if (!messages || messages.length === 0) return null;

                    const lastMsg = messages[0];
                    const isMine =
                        lastMsg.sender &&
                        (lastMsg.sender._id || lastMsg.sender) ===
                            currentUserId;

                    return {
                        _id: key,
                        peer,
                        course,
                        text: lastMsg.text,
                        createdAt: lastMsg.createdAt,
                        sender: lastMsg.sender,
                        peerId,
                        courseId,
                        messages,
                        isMine,
                    };
                })
                .filter(Boolean)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            set({ recentChats: conversationList, recentChatsLoading: false });
        } catch { /* Silent */ }
    },

    // Recent teacher submissions (for dashboard)
    recentSubmissions: [],
    recentSubmissionsLoading: false,
    listRecentSubmissions: async (silent = false) => {
        if (get().recentSubmissionsLoading) return;
        if (!silent) set({ recentSubmissionsLoading: true });

        const authState = useAuthStore.getState();
        const token = authState.token;
        if (!token) {
            set({ recentSubmissionsLoading: false });
            return;
        }

        try {
            const response = await axios.get('/api/attempts/recent/teacher', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.status !== 200) throw new Error('Failed to list recent submissions');
            const data = response.data.submissions || [];
            set({ recentSubmissions: data, recentSubmissionsLoading: false });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('listRecentSubmissions error', err);
            set({ recentSubmissionsLoading: false });
        }
    },

    // Calendar Events
    calendarEvents: [],
    setCalendarEvents: (events) => set({ calendarEvents: events }),

    createCalendarEvent: async (courseId, eventData) => {
        try {
            const response = await axios.post(
                `/api/courses/${courseId}/events`,
                eventData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${useAuthStore.getState().token}`,
                    },
                }
            );
            if (response.status === 201) {
                set((state) => ({
                    calendarEvents: [...state.calendarEvents, response.data.calendarEvent],
                }));
                return response.data.calendarEvent;
            }
            throw new Error("Failed to create event");
        } catch (error) {
            set({ errMsg: error.response?.data?.errMsg || error.message });
            throw error;
        }
    },

    listCourseCalendarEvents: async (courseId) => {
        try {
            const response = await axios.get(`/api/courses/${courseId}/events`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${useAuthStore.getState().token}`,
                },
            });
            if (response.status === 200) {
                set({ calendarEvents: response.data.events || [] });
            }
        } catch (error) {
            set({ errMsg: error.response?.data?.errMsg || error.message });
        }
    },

    updateCalendarEvent: async (courseId, eventId, eventData) => {
        try {
            const response = await axios.put(
                `/api/courses/${courseId}/events/${eventId}`,
                eventData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${useAuthStore.getState().token}`,
                    },
                }
            );
            if (response.status === 200) {
                set((state) => ({
                    calendarEvents: state.calendarEvents.map((e) =>
                        e._id === eventId ? response.data.calendarEvent : e
                    ),
                }));
                return response.data.calendarEvent;
            }
            throw new Error("Failed to update event");
        } catch (error) {
            set({ errMsg: error.response?.data?.errMsg || error.message });
            throw error;
        }
    },

    deleteCalendarEvent: async (courseId, eventId) => {
        try {
            const response = await axios.delete(`/api/courses/${courseId}/events/${eventId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${useAuthStore.getState().token}`,
                },
            });
            if (response.status === 200) {
                set((state) => ({
                    calendarEvents: state.calendarEvents.filter((e) => e._id !== eventId),
                }));
            }
        } catch (error) {
            set({ errMsg: error.response?.data?.errMsg || error.message });
            throw error;
        }
    },
}));

export default useTeacherStore;
