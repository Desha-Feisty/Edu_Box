import type { Response } from "express";
import type { AuthRequest } from "../types/authRequest.js";
import User from "../models/user.js";
import Course from "../models/course.js";
import Quiz from "../models/quiz.js";
import Attempt from "../models/attempt.js";
import Enrollment from "../models/enrollment.js";
import ActivityLog from "../models/activityLog.js";
import { Types } from "mongoose";
import os from "os";
import { getLogs as fetchLogs, getLogStats as fetchLogStats, exportLogsToCsv } from "../services/logger.js";
import { getCache, setCache, clearCache } from "../utils/cache.js";
import { PASSWORD_VALIDATION, PAGINATION } from "../utils/constants.js";

// Sanitize search input to prevent regex injection
const sanitizeSearchInput = (input: unknown): string => {
    if (typeof input !== "string") return "";
    return input.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Validate password strength
const validatePassword = (password: string): string | null => {
    if (!password || password.length < PASSWORD_VALIDATION.MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_VALIDATION.MIN_LENGTH} characters`;
    }
    if (PASSWORD_VALIDATION.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        return "Password must contain an uppercase letter";
    }
    if (PASSWORD_VALIDATION.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        return "Password must contain a lowercase letter";
    }
    if (PASSWORD_VALIDATION.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
        return "Password must contain a number";
    }
    return null;
};

/**
 * List all users in the system with pagination
 */
export const listUsers = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
        const { search, role } = req.query;
        
        const skip = (page - 1) * limit;
        
        // Build filter
        const filter: Record<string, unknown> = {};
        
        if (role && role !== "all") {
            filter.role = role;
        }
        
if (search) {
            const searchRegex = new RegExp(sanitizeSearchInput(search), "i");
            filter.$or = [
                { name: { $regex: searchRegex } },
                { email: { $regex: searchRegex } }
            ];
        }
        
        const [users, total] = await Promise.all([
            User.find(filter).select("-password").sort("-createdAt").skip(skip).limit(limit).lean(),
            User.countDocuments(filter)
        ]);
        
        return res.status(200).json({ 
            users, 
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Admin listUsers error:", error);
        return res.status(500).json({ errMsg: "Failed to fetch users" });
    }
};

/**
 * Add a new user (Student or Teacher)
 */
export const addUser = async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, password, role } = req.body;

        if (!["student", "teacher", "admin"].includes(role)) {
            return res.status(400).json({ errMsg: "Invalid role. Only 'student', 'teacher', and 'admin' can be added." });
        }

        // Validate password strength
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ errMsg: passwordError });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ errMsg: "Email already in use" });
        }

        const user = new User({ name, email, password, role });
        await user.save();

        return res.status(201).json({ user: { id: user._id, name, email, role } });
    } catch (error) {
        console.error("Admin addUser error:", error);
        return res.status(500).json({ errMsg: "Failed to create user" });
    }
};

/**
 * Delete a user and cleanup their data
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ errMsg: "User not found" });

        // Cleanup based on role
        if (user.role === "teacher") {
            const teacherCourses = await Course.find({ teacher: user._id });
            const courseIds = teacherCourses.map(c => c._id);
            
            // Parallel cleanup of all teacher-owned data
            await Promise.all([
                Quiz.deleteMany({ course: { $in: courseIds } }),
                Enrollment.deleteMany({ course: { $in: courseIds } }),
                Course.deleteMany({ teacher: user._id }),
            ]);
        } else if (user.role === "student") {
            // Parallel cleanup of student data
            await Promise.all([
                Attempt.deleteMany({ user: user._id }),
                Enrollment.deleteMany({ user: user._id }),
            ]);
        }

        await User.findByIdAndDelete(id);
        return res.status(200).json({ msg: "User and associated data deleted successfully" });
    } catch (error) {
        console.error("Admin deleteUser error:", error);
        return res.status(500).json({ errMsg: "Failed to delete user" });
    }
};

/**
 * Get high-level platform statistics
 * Cached in Redis for 60 seconds.
 */
export const getPlatformStats = async (req: AuthRequest, res: Response) => {
    const CACHE_KEY = "admin:stats:platform";
    const cached = await getCache<{ stats: unknown }>(CACHE_KEY);
    if (cached) return res.status(200).json(cached);

    try {
        const [userCount, courseCount, quizCount, attemptCount] = await Promise.all([
            User.countDocuments(),
            Course.countDocuments(),
            Quiz.countDocuments(),
            Attempt.countDocuments({ status: { $in: ["graded", "late"] } })
        ]);

        const result = {
            stats: {
                totalUsers: userCount,
                totalCourses: courseCount,
                totalQuizzes: quizCount,
                completedAttempts: attemptCount
            }
        };
        await setCache(CACHE_KEY, result, 300_000); // 5 min cache
        return res.status(200).json(result);
    } catch (error) {
        console.error("Admin getPlatformStats error:", error);
        return res.status(500).json({ errMsg: "Failed to fetch platform stats" });
    }
};

/**
 * Get detailed platform analytics
 * Uses batch queries instead of N+1 per-course lookups.
 * Cached in Redis for 5 minutes.
 */
export const getPlatformAnalytics = async (req: AuthRequest, res: Response) => {
    const CACHE_KEY = "admin:analytics";
    const cached = await getCache<{ courseAnalytics: unknown[] }>(CACHE_KEY);
    if (cached) { res.status(200).json(cached); return; }

    try {
        const courses = await Course.find().populate("teacher", "name").lean();
        const courseIds = courses.map(c => c._id);

        // Batch fetch all data upfront — no per-course queries
        const [enrollments, quizzes] = await Promise.all([
            Enrollment.find({ course: { $in: courseIds }, status: "active" }).lean(),
            Quiz.find({ course: { $in: courseIds } }).lean()
        ]);

        const quizIds = quizzes.map(q => q._id);
        const attemptResults = await Attempt.find({
            quiz: { $in: quizIds },
            status: { $in: ["graded", "late"] }
        }).lean();

        // Pre-aggregate enrollment counts per course
        const enrollmentCountByCourse: Record<string, number> = {};
        for (const e of enrollments) {
            const cid = String(e.course);
            enrollmentCountByCourse[cid] = (enrollmentCountByCourse[cid] || 0) + 1;
        }

        // Pre-aggregate quiz counts and attempts per course
        const quizCountByCourse: Record<string, number> = {};
        const attemptScoreSum: Record<string, number> = {};
        const attemptMaxSum: Record<string, number> = {};
        const attemptCountByCourse: Record<string, number> = {};

        for (const q of quizzes) {
            const cid = String(q.course);
            quizCountByCourse[cid] = (quizCountByCourse[cid] || 0) + 1;
        }

        for (const a of attemptResults) {
            const qid = String(a.quiz);
            const quiz = quizzes.find((qu) => String(qu._id) === qid);
            if (!quiz) continue;
            const cid = String(quiz.course);
            attemptScoreSum[cid] = (attemptScoreSum[cid] || 0) + (a.score || 0);
            attemptMaxSum[cid] = (attemptMaxSum[cid] || 0) + ((a.maxScore as number) || 0);
            attemptCountByCourse[cid] = (attemptCountByCourse[cid] || 0) + 1;
        }

        // Compute per-course analytics in memory
        const courseAnalytics = courses.map(course => {
            const cid = String(course._id);
            const maxSum = attemptMaxSum[cid] || 0;
            const avgScore = maxSum > 0
                ? Math.round(((attemptScoreSum[cid] ?? 0) / maxSum) * 100)
                : 0;

            return {
                id: course._id,
                title: course.title || "Untitled",
                teacher: (course.teacher as { name?: string })?.name || "Unknown",
                enrollmentCount: enrollmentCountByCourse[cid] || 0,
                quizCount: quizCountByCourse[cid] || 0,
                avgScore,
                participation: attemptCountByCourse[cid] || 0
            };
        });

        res.status(200).json({ courseAnalytics });
        await setCache(CACHE_KEY, { courseAnalytics }, 300_000); // 5 min cache
    } catch (error) {
        console.error("Admin getPlatformAnalytics error:", error);
        res.status(500).json({ errMsg: "Failed to fetch platform analytics" });
    }
};

/**
 * Get platform activity over time (last 7/30 days)
 * Cached in Redis for 60 seconds.
 */
export const getPlatformActivity = async (req: AuthRequest, res: Response) => {
    const { days = "7" } = req.query;
    const daysNum = parseInt(days as string) || 7;
    const CACHE_KEY = `admin:activity:${daysNum}`;
    const cached = await getCache(CACHE_KEY);
    if (cached) { res.status(200).json(cached); return; }

    try {
        const { days = "7" } = req.query;
        const daysNum = parseInt(days as string) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        startDate.setHours(0, 0, 0, 0);

        // Get all graded/late attempts in the date range
        const attempts = await Attempt.find({
            submittedAt: { $gte: startDate },
            status: { $in: ["graded", "late"] }
        }).select("submittedAt").lean();

        // Group by date
        const dailyAttempts: Record<string, number> = {};
        for (let i = 0; i < daysNum; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0] ?? "";
            dailyAttempts[dateStr] = 0;
        }

        attempts.forEach((a) => {
            if (!a.submittedAt) return;
            const dateStr = new Date(a.submittedAt).toISOString().split("T")[0] ?? "";
            if (dailyAttempts[dateStr] !== undefined) {
                dailyAttempts[dateStr]++;
            }
        });

        const result = Object.entries(dailyAttempts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const totalAttempts = result.reduce((sum, r) => sum + r.count, 0);
        const averageDaily = daysNum > 0 ? totalAttempts / daysNum : 0;

        const responseData = {
            dailyAttempts: result,
            totalAttempts,
            averageDaily: Math.round(averageDaily * 10) / 10
        };
        res.status(200).json(responseData);
        await setCache(CACHE_KEY, responseData, 60_000); // 1 min cache
    } catch (error) {
        console.error("Admin getPlatformActivity error:", error);
        res.status(500).json({ errMsg: "Failed to fetch platform activity" });
    }
};

/**
 * Get teacher performance metrics
 * Batches all queries upfront — no per-teacher N+1 lookups.
 * Cached for 5 minutes.
 */
export const getTeacherPerformance = async (req: AuthRequest, res: Response) => {
    const CACHE_KEY = "admin:teachers:performance";
    const cached = await getCache<{ teachers: unknown[] }>(CACHE_KEY);
    if (cached) { res.status(200).json(cached); return; }

    try {
        const teachers = await User.find({ role: "teacher" }).select("name email").lean();

        // Batch fetch all data upfront
        const [courses, enrollments, quizzes, attempts] = await Promise.all([
            Course.find().select("_id teacher").lean(),
            Enrollment.find({ status: "active" }).lean(),
            Quiz.find({ published: true }).lean(),
            Attempt.find({ status: { $in: ["graded", "late"] } }).lean()
        ]);

        // Index data by teacher for O(1) lookup
        const coursesByTeacher: Record<string, typeof courses> = {};
        for (const c of courses) {
            const tid = String(c.teacher);
            if (!coursesByTeacher[tid]) coursesByTeacher[tid] = [];
            coursesByTeacher[tid].push(c);
        }

        // Index enrollments and quizzes by course ID
        const enrollmentsByCourse: Record<string, number> = {};
        for (const e of enrollments) {
            const cid = String(e.course);
            enrollmentsByCourse[cid] = (enrollmentsByCourse[cid] || 0) + 1;
        }

        const quizzesByCourse: Record<string, string[]> = {};
        for (const q of quizzes) {
            const cid = String(q.course);
            if (!quizzesByCourse[cid]) quizzesByCourse[cid] = [];
            quizzesByCourse[cid].push(String(q._id));
        }

        // Index attempts by quiz ID
        const attemptsByQuiz: Record<string, typeof attempts> = {};
        for (const a of attempts) {
            const qid = String(a.quiz);
            if (!attemptsByQuiz[qid]) attemptsByQuiz[qid] = [];
            attemptsByQuiz[qid].push(a);
        }

        // Compute per-teacher stats in memory
        const teacherStats = teachers.map(teacher => {
            const tid = String(teacher._id);
            const tCourses = coursesByTeacher[tid] || [];
            const courseIds = tCourses.map(c => String(c._id));

            const studentCount = courseIds.reduce((sum, cid) => sum + (enrollmentsByCourse[cid] || 0), 0);
            const tQuizzes = courseIds.flatMap(cid => quizzesByCourse[cid] || []);

            let totalScore = 0;
            let totalMax = 0;
            const activeStudentSet = new Set<string>();

            for (const qid of tQuizzes) {
                const qAttempts = attemptsByQuiz[qid] || [];
                for (const a of qAttempts) {
                    const uid = String(a.user);
                    activeStudentSet.add(uid);
                    totalScore += a.score || 0;
                    totalMax += a.maxScore || 0;
                }
            }

            const avgScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

            return {
                id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                courseCount: tCourses.length,
                studentCount,
                quizCount: tQuizzes.length,
                avgScore,
                activeStudents: activeStudentSet.size,
                totalAttempts: totalScore > 0 ? attempts.filter(a =>
                    tQuizzes.includes(String(a.quiz))
                ).length : 0
            };
        });

        teacherStats.sort((a, b) => b.avgScore - a.avgScore);

        res.status(200).json({ teachers: teacherStats });
        await setCache(CACHE_KEY, { teachers: teacherStats }, 300_000); // 5 min cache
    } catch (error) {
        console.error("Admin getTeacherPerformance error:", error);
        res.status(500).json({ errMsg: "Failed to fetch teacher performance" });
    }
};

/**
 * Get enhanced platform stats
 * Uses aggregation pipelines instead of loading full datasets into memory.
 * Cached in Redis for 5 minutes.
 */
export const getEnhancedStats = async (req: AuthRequest, res: Response) => {
    const CACHE_KEY = "admin:stats:enhanced";
    const cached = await getCache<{ stats: unknown }>(CACHE_KEY);
    if (cached) { res.status(200).json(cached); return; }

    try {
        // Single aggregation for avg score (avoids loading all attempts into memory)
        const [avgResult, participatedRecently] = await Promise.all([
            Attempt.aggregate([
                { $match: { status: { $in: ["graded", "late"] }, maxScore: { $gt: 0 } } },
                { $group: { _id: null, totalScore: { $sum: "$score" }, totalMax: { $sum: "$maxScore" } } }
            ]),
            // Distinct users with attempts in last 30 days (aggregation, not find+distinct)
            Attempt.aggregate([
                { $match: { submittedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, status: { $in: ["graded", "late"] } } },
                { $group: { _id: "$user" } }
            ])
        ]);

        const avgPlatformScore = avgResult[0]
            ? (avgResult[0].totalScore / avgResult[0].totalMax) * 100
            : 0;

        const [totalUsers, totalStudents, totalTeachers, totalCourses, totalQuizzes, coursesWithQuizzes, newSignupsLast30Days, loginsLast30Days, activeThisWeek] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "student" }),
            User.countDocuments({ role: "teacher" }),
            Course.countDocuments(),
            Quiz.countDocuments({ published: true }),
            Course.countDocuments({ quizCount: { $gt: 0 } }),
            User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
            User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
            Attempt.countDocuments({ submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
        ]);

        const participationRate = totalStudents > 0
            ? Math.round((participatedRecently.length / totalStudents) * 100)
            : 0;

        res.status(200).json({
            stats: {
                totalUsers,
                totalStudents,
                totalTeachers,
                totalCourses,
                totalQuizzes,
                coursesWithQuizzes,
                avgPlatformScore: Math.round(avgPlatformScore),
                activeThisWeek,
                participationRate,
                newSignupsLast30Days,
                loginsLast30Days
            }
        });
        await setCache(CACHE_KEY, { stats: { totalUsers, totalStudents, totalTeachers, totalCourses, totalQuizzes, coursesWithQuizzes, avgPlatformScore: Math.round(avgPlatformScore), activeThisWeek, participationRate, newSignupsLast30Days, loginsLast30Days } }, 300_000); // 5 min cache
    } catch (error) {
        console.error("Admin getEnhancedStats error:", error);
        res.status(500).json({ errMsg: "Failed to fetch enhanced stats" });
    }
};

export const getLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { action, userId, startDate, endDate, page = "1", limit = "50", search } = req.query;
        
        const options: {
            action?: string;
            userId?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            skip?: number;
            search?: string;
        } = {};
        
        if (action) options.action = action as string;
        if (userId) options.userId = userId as string;
        if (search) options.search = search as string;
        
        if (startDate) {
            const sd = new Date(startDate as string);
            if (!isNaN(sd.getTime())) options.startDate = sd;
        }
        if (endDate) {
            const ed = new Date(endDate as string);
            if (!isNaN(ed.getTime())) options.endDate = ed;
        }
        
        const parsedLimit = parseInt(limit as string, 10);
        options.limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
        
        const parsedPage = parseInt(page as string, 10);
        const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        options.skip = (pageNum - 1) * options.limit;
        
        const result = await fetchLogs(options);
        
        res.status(200).json(result);
    } catch (error) {
        console.error("Admin getLogs error:", error);
        res.status(500).json({ errMsg: "Failed to fetch logs" });
    }
};

/**
 * Get log statistics
 * Cached in Redis for 2 minutes.
 */
export const getLogStats = async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const CACHE_KEY = `admin:logs:stats:${days}`;
    const cached = await getCache(CACHE_KEY);
    if (cached) { res.status(200).json(cached); return; }

    try {
        const stats = await fetchLogStats(days);
        res.status(200).json(stats);
        await setCache(CACHE_KEY, stats, 120_000); // 2 min cache
    } catch (error) {
        console.error("Admin getLogStats error:", error);
        res.status(500).json({ errMsg: "Failed to fetch log stats" });
    }
};

/**
 * Get latest log timestamp for polling - returns just the timestamp of the newest log
 */
export const getLatestLogTimestamp = async (req: AuthRequest, res: Response) => {
    try {
        const latestLog = await ActivityLog.findOne().sort("-createdAt").select("createdAt");
        res.status(200).json({ latestTimestamp: latestLog?.createdAt?.toISOString() || null });
    } catch (error) {
        console.error("Admin getLatestLogTimestamp error:", error);
        res.status(500).json({ errMsg: "Failed to fetch latest log timestamp" });
    }
};

export const exportLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ errMsg: "startDate and endDate are required" });
        }
        
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ errMsg: "Invalid startDate or endDate" });
        }
        
        if (end < start) {
            return res.status(400).json({ errMsg: "endDate must be after startDate" });
        }
        
        const MAX_RANGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
        if (end.getTime() - start.getTime() > MAX_RANGE_MS) {
            return res.status(400).json({ errMsg: "Date range cannot exceed 1 year" });
        }
        
        const csv = await exportLogsToCsv(start, end);
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=activity-logs.csv");
        return res.send(csv);
    } catch (error) {
        console.error("Admin exportLogs error:", error);
        return res.status(500).json({ errMsg: "Failed to export logs" });
    }
};

/**
 * Get system health metrics
 * Cached in Redis for 30 seconds (changes frequently).
 */
export const getSystemHealth = async (req: AuthRequest, res: Response) => {
    const CACHE_KEY = "admin:system-health";
    const cached = await getCache(CACHE_KEY);
    if (cached) { res.status(200).json(cached); return; }

    try {
        const [userCount, courseCount, quizCount, attemptCount, logCount] = await Promise.all([
            User.countDocuments(),
            Course.countDocuments(),
            Quiz.countDocuments(),
            Attempt.countDocuments(),
            ActivityLog.countDocuments(),
        ]);
        
        const memoryUsage = process.memoryUsage();
        const cpuLoad = os.loadavg();
        
        // Windows often returns 0,0,0 for loadavg - set to N/A
        const platform = os.platform();
        let displayCpuLoad = {
            "1min": cpuLoad[0]?.toFixed(2) || "0.00",
            "5min": cpuLoad[1]?.toFixed(2) || "0.00",
            "15min": cpuLoad[2]?.toFixed(2) || "0.00",
        };
        
        // If all values are 0 on Windows, set to N/A (TODO: use systeminformation or os-utils for real Windows CPU metrics)
        if (cpuLoad[0] === 0 && cpuLoad[1] === 0 && cpuLoad[2] === 0 && platform === "win32") {
            displayCpuLoad = {
                "1min": "N/A",
                "5min": "N/A",
                "15min": "N/A",
            };
        }
        
        const uptime = process.uptime();
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        
        const recentErrors = await ActivityLog.countDocuments({
            action: "system_error",
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });
        
        // Calculate uptime percentage (based on start time)
        const uptimePercentage = Math.min(100, Math.round((uptime / (24 * 60 * 60)) * 100));
        
        // Get activity trend from last 7 days (parallel queries)
        const dayRanges = Array.from({ length: 7 }, (_, i) => {
            const dayStart = new Date();
            dayStart.setDate(dayStart.getDate() - (6 - i));
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            return { start: dayStart, end: dayEnd };
        });

        const dayCounts = await Promise.all(
            dayRanges.map(({ start, end }) =>
                ActivityLog.countDocuments({
                    createdAt: { $gte: start, $lte: end },
                }),
            ),
        );

        const last7Days = dayRanges.map(({ start }, i) => ({
            date: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
            logs: dayCounts[i],
        }));
        
        const responseData = {
            platform: {
                totalUsers: userCount,
                totalCourses: courseCount,
                totalQuizzes: quizCount,
                totalAttempts: attemptCount,
                totalLogs: logCount,
            },
            system: {
                uptime: `${uptimeHours}h ${uptimeMinutes}m`,
                uptimePercentage,
                memory: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
                },
                cpuLoad: displayCpuLoad,
                platform: os.platform(),
                nodeVersion: process.version,
            },
            health: {
                errorsLast24h: recentErrors,
                status: recentErrors > 10 ? "warning" : "healthy",
            },
            activityTrend: last7Days,
        };
        res.status(200).json(responseData);
        await setCache(CACHE_KEY, responseData, 30_000);
    } catch (error) {
        console.error("Admin getSystemHealth error:", error);
        res.status(500).json({ errMsg: "Failed to fetch system health" });
    }
};
