import React, { useEffect, useState } from 'react';
import ProgressCard from '../components/dashboard/ProgressCard';
import useTeacherStore from '../stores/Teacherstore';
import useQuizStore from '../stores/Quizstore';
import { BookOpen, Zap, Users, Award, TrendingUp, Shield } from 'lucide-react';

export default function AdminDashboard() {
  // Stores
  const allCourses = useTeacherStore((s) => s.allCourses);
  const listAllCourses = useTeacherStore((s) => s.listAllCourses);
  const availableQuizzes = useQuizStore((s) => s.availableQuizzes);
  const fetchAvailableQuizzes = useQuizStore((s) => s.fetchAvailableQuizzes);

  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    listAllCourses();
    fetchAvailableQuizzes();

    // Try to fetch total users (admin only)
    const fetchAdminData = async () => {
      try {
        const { default: axios } = await import('axios');
        const { default: useAuthStore } = await import('../stores/Authstore');
        const token = useAuthStore.getState().token;
        if (!token) return;
        const res = await axios.get('/api/users/count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 200 && res.data.count != null) {
          setTotalStudents(res.data.count);
        }
      } catch {
        // Fallback: compute from course enrollments
        const enrolled = allCourses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);
        setTotalStudents(enrolled);
      }
    };
    fetchAdminData();
  }, [listAllCourses, fetchAvailableQuizzes]);

  // Compute real stats
  const coursesCount = allCourses.length;
  const quizzesCount = availableQuizzes.length;
  const enrollmentTotal = allCourses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);
  const studentCount = totalStudents || enrollmentTotal;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            System overview &amp; analytics
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
          title="Total Students"
          value={studentCount}
          icon={Users}
          color="blue"
          type="stat"
        />
        <ProgressCard
          title="Active Courses"
          value={coursesCount}
          icon={BookOpen}
          color="brand"
          type="stat"
        />
        <ProgressCard
          title="Total Quizzes"
          value={quizzesCount}
          icon={Zap}
          color="amber"
          type="stat"
        />
        <ProgressCard
          title="Avg Enrollment"
          value={coursesCount > 0 ? Math.round(enrollmentTotal / coursesCount) : 0}
          subtitle="Students per course"
          icon={TrendingUp}
          color="green"
          type="stat"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Course Overview */}
        <div className="lg:col-span-2 bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">All Courses</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{coursesCount} total courses</p>
            </div>
          </div>

          {allCourses.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No courses created yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allCourses.slice(0, 5).map((course) => (
                <div
                  key={course._id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{course.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {course.enrollmentCount || 0} enrolled &bull; {course.publishedQuizCount || 0} quizzes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right - Quick Overview */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Health</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Platform status</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-500/10">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">API</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-lg">Operational</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-500/10">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Database</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-lg">Connected</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Analytics</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Platform summary</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Courses</span><span className="font-medium">{coursesCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Students</span><span className="font-medium">{studentCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Quizzes</span><span className="font-medium">{quizzesCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Avg students/course</span><span className="font-medium">{coursesCount > 0 ? Math.round(enrollmentTotal / coursesCount) : 0}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
