import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressCard from '../components/dashboard/ProgressCard';
import CourseCalendar from '../components/dashboard/CourseCalendar';
import SubmissionList from '../components/dashboard/SubmissionList';
import GradeModal from '../components/dashboard/GradeModal';
import useTeacherStore from '../stores/Teacherstore';
import useAuthStore from '../stores/Authstore';
import useQuizStore from '../stores/Quizstore';
import telemetry from '../lib/telemetry';
import api from '../lib/api';
import EVENTS from '@edubox/shared/telemetry';
import { BookOpen, ClipboardList, Users, Award, Zap, PlusCircle } from 'lucide-react';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [customCalendarEvents, setCustomCalendarEvents] = useState([]);

  // Stores
  const user = useAuthStore((s) => s.user);
  const allCourses = useTeacherStore((s) => s.allCourses);
  const listMyCourses = useTeacherStore((s) => s.listMyCourses);
  const recentSubmissions = useTeacherStore((s) => s.recentSubmissions);
  const listRecentSubmissions = useTeacherStore((s) => s.listRecentSubmissions);
  const availableQuizzes = useQuizStore((s) => s.availableQuizzes);
  const fetchAvailableQuizzes = useQuizStore((s) => s.fetchAvailableQuizzes);

  useEffect(() => {
    listMyCourses();
    listRecentSubmissions();
    fetchAvailableQuizzes();
  }, [listMyCourses, listRecentSubmissions, fetchAvailableQuizzes]);

  // Fetch calendar events for all courses
  useEffect(() => {
    if (allCourses.length === 0) return;
    const fetchEvents = async () => {
      const results = await Promise.allSettled(
        allCourses.map((c) =>
          api.get(`/calendar/${c._id}/events`).then((r) => r.data.calendarEvents || [])
        )
      );
      setCustomCalendarEvents(
        results
          .filter((r) => r.status === 'fulfilled')
          .flatMap((r) => r.value)
      );
    };
    fetchEvents();
  }, [allCourses]);

  // Compute real stats
  const coursesCount = allCourses.length;
  const pendingGrades = recentSubmissions.filter((s) => s.score == null || s.score === undefined).length;
  const totalStudents = allCourses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);

  // Average score from graded submissions
  const gradedSubmissions = recentSubmissions.filter((s) => s.score != null);
  const avgScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length)
    : 0;

  // Build next actions from real pending submissions
  const nextActions = pendingGrades > 0
    ? [{
        id: 'grade-pending',
        title: `${pendingGrades} submission${pendingGrades > 1 ? 's' : ''} pending grading`,
        due: 'Now',
        type: 'grade',
        primaryLabel: `Grade ${pendingGrades}`,
      }]
    : [];

  // Build calendar events from quizzes + custom events
  const calendarEvents = useMemo(() => [
    ...availableQuizzes.map((q) => ({ ...q, type: 'quiz' })),
    ...customCalendarEvents.map((e) => ({ ...e, type: 'calendar-event' })),
  ], [availableQuizzes, customCalendarEvents]);

  const handleStart = (action) => {
    telemetry.track(EVENTS.DASHBOARD_CTA_CLICK, { role: 'teacher', ctaId: action.id, page: 'teacher_dashboard' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Teacher'}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Here&apos;s your teaching overview for today
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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/teacher/quiz/create')}
          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-base-200 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg hover:shadow-brand-500/10 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-sm">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              Create New Quiz
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Set up a quiz in minutes</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/teacher/courses')}
          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-base-200 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg hover:shadow-brand-500/10 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Manage Courses
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">View or edit your courses</p>
          </div>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          color="blue"
          type="stat"
        />
        <ProgressCard
          title="Active Quizzes"
          value={availableQuizzes.length}
          icon={Zap}
          color="amber"
          type="stat"
        />
        <ProgressCard
          title="Courses"
          value={coursesCount}
          subtitle="Created"
          icon={BookOpen}
          color="brand"
          type="stat"
        />
        <ProgressCard
          title="Pending Grades"
          value={pendingGrades}
          subtitle="Awaiting review"
          icon={ClipboardList}
          color="green"
          type="stat"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Priority Actions & Submissions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
            <h3 className="text-lg font-semibold mb-3">Priority Actions</h3>
            {nextActions.length > 0 ? (
              <div className="space-y-3">
                {nextActions.map((a) => (
                  <div key={a.id} className="bg-white dark:bg-base-200 rounded-xl p-4 flex items-center justify-between border border-slate-200/60 dark:border-white/[0.04]">
                    <div>
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-slate-500">Due {a.due}</div>
                    </div>
                    <div>
                      <button className="btn btn-brand" onClick={() => handleStart(a)}>{a.primaryLabel || 'Start'}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No pending actions</div>
            )}

            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Recent Submissions</h4>
              <SubmissionList submissions={recentSubmissions} onGrade={(s) => setSelectedAttempt(s.id)} />
            </div>
          </div>

          {/* Course Calendar */}
          <CourseCalendar events={calendarEvents} />
        </div>

        {/* Right Column - Course Overview & At-risk */}
        <div className="space-y-6">
          {/* Recent Grades Summary */}
          <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Average Score</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Across all submissions</p>
              </div>
            </div>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-slate-900 dark:text-white">{avgScore}%</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {gradedSubmissions.length} submission{gradedSubmissions.length !== 1 ? 's' : ''} graded
              </p>
            </div>
          </div>

          {/* Course Overview */}
          <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Course Overview</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Enrollment across your courses</p>
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

      {/* Grade Modal */}
      {selectedAttempt ? (
        <GradeModal attemptId={selectedAttempt} onClose={() => setSelectedAttempt(null)} onUpdated={(_info) => {
          listRecentSubmissions();
        }} />
      ) : null}
    </div>
  );
}
