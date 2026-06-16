import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressCard from '../components/dashboard/ProgressCard';
import CourseCalendar from '../components/dashboard/CourseCalendar';
import useAuthStore from '../stores/Authstore';
import useTeacherStore from '../stores/Teacherstore';
import useQuizStore from '../stores/Quizstore';
import { BookOpen, Zap, FileText, Award, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const navigate = useNavigate();

  // Stores
  const user = useAuthStore((s) => s.user);
  const allCourses = useTeacherStore((s) => s.allCourses);
  const listMyCourses = useTeacherStore((s) => s.listMyCourses);
  const availableQuizzes = useQuizStore((s) => s.availableQuizzes);
  const myGrades = useQuizStore((s) => s.myGrades);
  const fetchAvailableQuizzes = useQuizStore((s) => s.fetchAvailableQuizzes);
  const listMyGrades = useQuizStore((s) => s.listMyGrades);
  const startAttempt = useQuizStore((s) => s.startAttempt);
  const attemptError = useQuizStore((s) => s.attemptError);
  const calendarEvents = useAuthStore((s) => s.calendarEvents);
  const listEnrolledCalendarEvents = useAuthStore((s) => s.listEnrolledCalendarEvents);

  const [startingQuizId, setStartingQuizId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await listMyCourses();
      await fetchAvailableQuizzes();
      await listMyGrades();

      // Fetch calendar events for enrolled courses
      const courses = useTeacherStore.getState().allCourses;
      if (courses.length > 0) {
        const courseIds = courses.map((c) => c._id || c.id).filter(Boolean);
        if (courseIds.length > 0) {
          await listEnrolledCalendarEvents(courseIds);
        }
      }
    };
    loadData();
  }, [listMyCourses, fetchAvailableQuizzes, listMyGrades, listEnrolledCalendarEvents]);

  // Compute real stats
  const completedQuizzes = myGrades.filter((g) => g.status === 'graded' || g.status === 'late');
  const avgScore = completedQuizzes.length > 0
    ? Math.round(completedQuizzes.reduce((sum, g) => sum + (g.score || 0), 0) / completedQuizzes.length)
    : 0;

  // Upcoming quizzes not yet attempted
  const upcomingQuizzes = availableQuizzes
    .filter((q) => q.timingStatus === 'open' && !q.isAttempted)
    .slice(0, 3);

  const recentGrades = myGrades
    .filter((g) => g.score !== null)
    .slice(0, 5);

  const handleStartQuiz = async (quizId) => {
    setStartingQuizId(quizId);
    try {
      const result = await startAttempt(quizId);
      if (result && result.attempt) {
        navigate(`/student/quiz/${result.attempt._id}`);
      } else {
        toast.error(attemptError || 'Failed to start quiz');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred while starting the quiz');
    } finally {
      setStartingQuizId(null);
    }
  };

  // Determine completed quiz IDs
  const completedQuizIds = useMemo(() => new Set(
    myGrades
      .filter((g) => g.status === 'graded' || g.status === 'late')
      .map((g) => g.quiz?._id || g.quizId)
      .filter(Boolean)
  ), [myGrades]);

  // Calendar events from quizzes + calendar
  const calendarEventList = useMemo(() => [
    ...availableQuizzes.map((q) => ({
      ...q,
      type: 'quiz',
      completed: completedQuizIds.has(q._id),
    })),
    ...(calendarEvents || []).map((e) => ({ ...e, type: 'calendar-event' })),
  ], [availableQuizzes, calendarEvents, completedQuizIds]);

  const handleCalendarEventClick = (event) => {
    if (event.type === 'quiz' && event._id) {
      navigate(`/student/quiz/${event._id}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Here&apos;s your learning overview for today
          </p>
        </div>
        <div className="hidden md:block">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressCard
          title="My Courses"
          value={allCourses.length}
          icon={BookOpen}
          color="brand"
          type="stat"
        />
        <ProgressCard
          title="Available Quizzes"
          value={availableQuizzes.length}
          icon={Zap}
          color="blue"
          type="stat"
        />
        <ProgressCard
          title="Completed"
          value={completedQuizzes.length}
          subtitle={`of ${availableQuizzes.length + completedQuizzes.length} total`}
          icon={FileText}
          color="green"
          type="stat"
        />
        <ProgressCard
          title="Average Score"
          value={`${avgScore}%`}
          subtitle={completedQuizzes.length > 0 ? 'Great progress!' : 'No grades yet'}
          icon={Award}
          color={avgScore >= 80 ? 'green' : avgScore >= 60 ? 'amber' : 'red'}
          type="stat"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upcoming Quizzes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Quizzes</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ready to take</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/student/quizzes')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {upcomingQuizzes.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No quizzes available right now</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingQuizzes.map((quiz) => (
                  <button
                    key={quiz._id}
                    onClick={() => handleStartQuiz(quiz._id)}
                    disabled={startingQuizId === quiz._id}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                      <Zap className="w-5.5 h-5.5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{quiz.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {quiz.course?.title} &bull; {quiz.durationMinutes} min
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 whitespace-nowrap">
                        {startingQuizId === quiz._id ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          'Show'
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Calendar */}
          <CourseCalendar
            events={calendarEventList}
            onEventClick={handleCalendarEventClick}
          />
        </div>

        {/* Right Column - Recent Grades & Progress */}
        <div className="space-y-6">
          {/* Recent Grades */}
          <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Grades</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your latest scores</p>
              </div>
            </div>

            {recentGrades.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No grades yet</p>
                <p className="text-sm">Complete a quiz to see your score</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGrades.map((grade, index) => (
                  <div
                    key={grade.attemptId || index}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      grade.score >= 80
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                        : grade.score >= 60
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      {grade.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{grade.quiz?.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{grade.course?.title}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                      grade.status === 'graded'
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {grade.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/student/grades')}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              View all grades
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Course Progress */}
          <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Course Progress</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your learning journey</p>
              </div>
            </div>

            <div className="space-y-4">
              {allCourses.slice(0, 3).map((course) => {
                const publishedCount = course.publishedQuizCount || 0;
                const progress = Math.min(publishedCount * 25, 100);
                return (
                  <ProgressCard
                    key={course._id}
                    title={course.title}
                    value={progress}
                    total={100}
                    subtitle={`${publishedCount} quiz(s) published`}
                    icon={BookOpen}
                    color="brand"
                    type="compact"
                  />
                );
              })}
              {allCourses.length === 0 && (
                <p className="text-center py-4 text-slate-500 dark:text-slate-400">No courses yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
