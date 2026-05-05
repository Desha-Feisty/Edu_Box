/**
 * Shared utilities for grading calculations
 */

/**
 * Calculate score percentage from raw score and responses
 * @param rawScore - The earned score
 * @param responses - Array of responses with question points
 * @returns Score as percentage (0-100)
 */
export function calculateScorePercentage(
    rawScore: number | undefined,
    responses: { question?: { points?: number } | null }[] | null | undefined
): number {
    if (!responses || !responses.length) return 0;
    
    const totalPossiblePoints = responses.reduce(
        (sum, r) => sum + (((r.question as any)?.points) || 1),
        0,
    );
    
    if (totalPossiblePoints <= 0 || rawScore === undefined) return 0;
    
    return Math.round((rawScore / totalPossiblePoints) * 100);
}

/**
 * Calculate raw score and total possible points from responses
 */
export function calculateScoreDetails(responses: any[] | null | undefined): { rawScore: number; totalPossiblePoints: number } {
    if (!responses || !responses.length) {
        return { rawScore: 0, totalPossiblePoints: 0 };
    }
    
    const rawScore = responses.reduce((sum, r) => sum + ((r as any).pointsAwarded || 0), 0);
    const totalPossiblePoints = responses.reduce((sum, r) => sum + (((r.question as any)?.points) || 1), 0);
    
    return { rawScore, totalPossiblePoints };
}

/**
 * Format grade result for API response
 */
export interface GradeResult {
    attemptId: unknown;
    quiz: {
        _id: unknown;
        title: string;
    };
    score: number;
    submittedAt: Date | null;
    status: string;
}

export function formatGradeResult(
    attempt: any,
    user?: any
): GradeResult {
    const scorePercentage = calculateScorePercentage(
        attempt.score,
        attempt.responses
    );
    
    return {
        attemptId: attempt._id,
        quiz: {
            _id: attempt.quiz?._id,
            title: (attempt.quiz as any)?.title || "Unknown Quiz",
        },
        score: scorePercentage,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
    };
}

/**
 * Build grade result object with calculated score
 */
export function buildGradeResult(attempt: any): {
    attemptId: any;
    student?: any;
    score: number;
    rawScore: string;
    submittedAt: Date | null;
    status: string;
} {
    const { rawScore, totalPossiblePoints } = calculateScoreDetails(attempt.responses);
    const scorePercentage = totalPossiblePoints > 0 && attempt.score !== undefined
        ? Math.round((attempt.score / totalPossiblePoints) * 100)
        : 0;

    return {
        attemptId: attempt._id,
        student: attempt.user,
        score: scorePercentage,
        rawScore: `(${rawScore}/${totalPossiblePoints})`,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
    };
}