import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressCard from '../components/dashboard/ProgressCard';
import CourseCalendar from '../components/dashboard/CourseCalendar';
import useTeacherStore from '../stores/Teacherstore';
import useAuthStore from '../stores/Authstore';
import useQuizStore from '../stores/Quizstore';
import telemetry from '../lib/telemetry';
import api from '../lib/api';
import EVENTS from '@edubox/shared/telemetry';
import { BookOpen, ClipboardList, Users, Award, Zap, PlusCircle, Calendar, MessageSquare } from 'lucide-react';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [customCalendarEvents, setCustomCalendarEvents] = useState([]);
  const [contestedAttempts, setContestedAttempts] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

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

  // Fetch contested attempts
  const fetchContested = async () => {
    try {
      const res = await api.get('/attempts/contested/teacher');
      setContestedAttempts(res.data.attempts || []);
    } catch (_err) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchContested();
    const fetchUnread = async () => {
      try {
        const res = await api.get('/chat/unread/count');
        setUnreadMessages(res.data.unreadCount || 0);
      } catch (_err) {
        // silent fail
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);
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
  const totalStudents = allCourses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);

  // Average score from graded submissions
  const gradedSubmissions = recentSubmissions.filter((s) => s.score != null);
  const avgScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length)
    : 0;

  const contestedTotal = contestedAttempts.reduce((sum, a) => sum + (a.responses?.length || 0), 0);

  // Build contextual next actions based on real teacher data
  const nextActions = useMemo(() => {
    const actions = [];

    // 1 — Courses with enrolled students but NO published quizzes
    const coursesWithoutQuizzes = allCourses.filter(
      (c) => (c.publishedQuizCount || 0) === 0 && (c.enrollmentCount || 0) > 0
    );
    if (coursesWithoutQuizzes.length > 0) {
      actions.push({
        id: 'publish-first-quiz',
        title: `Publish first quiz`,
        description: `${coursesWithoutQuizzes.length} course${coursesWithoutQuizzes.length > 1 ? 's have' : ' has'} students but no quizzes yet`,
        due: 'Now',
        type: 'publish',
        icon: 'Zap',
        primaryLabel: 'Create Quiz',
        navigateTo: '/teacher/quiz/create',
      });
    }

    // 2 — Contested responses (grade review requests from students)
    if (contestedTotal > 0) {
      actions.push({
        id: 'review-contested',
        title: `${contestedTotal} contested grade${contestedTotal > 1 ? 's' : ''}`,
        description: `${contestedAttempts.length} student${contestedAttempts.length > 1 ? 's' : ''} requested a grade review`,
        due: 'Now',
        type: 'contest',
        icon: 'ClipboardList',
        primaryLabel: `Review ${contestedTotal}`,
        navigateTo: '/teacher/review-requests',
      });
    }

    // 2c — Unread messages from students
    if (unreadMessages > 0) {
      actions.push({
        id: 'unread-messages',
        title: `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}`,
        description: 'Students have sent you messages',
        due: 'Now',
        type: 'chat',
        icon: 'MessageSquare',
        primaryLabel: 'View Chats',
        navigateTo: '/teacher/chats',
      });
    }

    // 3 — Calendar event happening today
    const todayStr = new Date().toDateString();
    const todayEvents = customCalendarEvents.filter((e) => {
      const d = e.date ? new Date(e.date).toDateString() : null;
      return d === todayStr;
    });
    if (todayEvents.length > 0) {
      actions.push({
        id: 'today-event',
        title: `Event today: ${todayEvents[0].title}`,
        description: `${todayEvents.length === 1 ? '' : `${todayEvents.length} events — `}Check your schedule`,
        due: 'Today',
        type: 'event',
        icon: 'Calendar',
        primaryLabel: 'View',
        navigateTo: `/teacher/course/${todayEvents[0].courseId || ''}?tab=events`,
      });
    }

    return actions;
  }, [allCourses, customCalendarEvents, contestedAttempts, contestedTotal, unreadMessages]);

  // Build calendar events from quizzes + custom events
  const calendarEvents = useMemo(() => [
    ...availableQuizzes.map((q) => ({ ...q, type: 'quiz' })),
    ...customCalendarEvents.map((e) => ({ ...e, type: 'calendar-event' })),
  ], [availableQuizzes, customCalendarEvents]);

  const handleStart = (action) => {
    telemetry.track(EVENTS.DASHBOARD_CTA_CLICK, { role: 'teacher', ctaId: action.id, page: 'teacher_dashboard' });
    if (action.navigateTo) {
      navigate(action.navigateTo);
    }
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
        <button onClick={() => navigate('/teacher/review-requests')} className="text-left w-full">
          <ProgressCard
            title="Review Requests"
            value={contestedTotal}
            subtitle="Grade reviews needed"
            icon={MessageSquare}
            color="amber"
            type="stat"
          />
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Priority Actions & Submissions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
            <h3 className="text-lg font-semibold mb-3">Priority Actions</h3>
            {nextActions.length > 0 ? (
              <div className="space-y-3">
                {nextActions.map((a) => {
                  const ActionIcon = a.type === 'publish' ? PlusCircle
                    : a.type === 'contest' ? ClipboardList
                    : a.type === 'review' ? ClipboardList
                    : a.type === 'chat' ? MessageSquare
                    : Calendar;
                  const gradient = a.type === 'publish'
                    ? 'from-brand-500 to-brand-600'
                    : a.type === 'contest'
                    ? 'from-amber-500 to-amber-600'
                    : a.type === 'review'
                    ? 'from-amber-500 to-amber-600'
                    : a.type === 'chat'
                    ? 'from-violet-500 to-violet-600'
                    : 'from-blue-500 to-blue-600';
                  return (
                    <div key={a.id} className="bg-white dark:bg-base-200 rounded-xl p-4 flex items-center justify-between border border-slate-200/60 dark:border-white/[0.04] hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}>
                          <ActionIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</div>
                          {a.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{a.description}</div>
                          )}
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Due {a.due}</div>
                        </div>
                      </div>
                      <div>
                        <button className="btn btn-sm btn-brand rounded-xl" onClick={() => handleStart(a)}>
                          {a.primaryLabel || 'Start'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Zap className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">All caught up!</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No pending actions right now</p>
              </div>
            )}

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

    </div>
  );
}
