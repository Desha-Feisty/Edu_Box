import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
    getCourse,
    createCourse,
    joinCourseByCode,
    updateCourse,
    deleteCourse,
    getRoster,
    removeEnrollment,
    listAllCourses,
    listMyCourses,
    exportCourseGradesCsv,
    exportGradesMatrixCsv,
} from "../controllers/course.controller.js";

const router = Router();

// More lenient limiter for read operations
const readLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute for reads
    message: { error: "Too many read requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/", authMiddleware, requireRole("teacher"), createCourse);
router.get("/", authMiddleware, readLimiter, listMyCourses);
router.get("/my", authMiddleware, readLimiter, listMyCourses);
router.get("/my-courses", authMiddleware, readLimiter, listMyCourses);
router.get("/all", authMiddleware, readLimiter, listAllCourses);
router.get("/:id", authMiddleware, readLimiter, getCourse);
router.patch("/:id", authMiddleware, requireRole("teacher"), updateCourse);
router.delete("/:id", authMiddleware, requireRole("teacher"), deleteCourse);
router.post("/join", authMiddleware, requireRole("student"), joinCourseByCode);
router.get("/:id/roster", authMiddleware, requireRole("teacher"), getRoster);
router.get(
    "/:id/grades/export",
    authMiddleware,
    requireRole("teacher"),
    exportCourseGradesCsv,
);
router.get(
    "/:id/grades/matrix-export",
    authMiddleware,
    requireRole("teacher"),
    exportGradesMatrixCsv,
);
router.delete(
    "/:id/enrollment",
    authMiddleware,
    requireRole("teacher"),
    removeEnrollment,
);
export default router;
