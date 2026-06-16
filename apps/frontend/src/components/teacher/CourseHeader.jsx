import { ArrowLeft, Edit, Trash2, CheckCircle, Copy } from "lucide-react";

export default function CourseHeader({
    course,
    navigate,
    handleCopyJoinCode,
    isEditing,
    setIsEditing,
    handleDeleteCourse,
    handleUpdateCourse,
    editData,
    setEditData,
    isUpdatingCourse
}) {
    return (
        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] mb-8 overflow-hidden">
            <div className="p-8 md:p-10 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => navigate("/teacher")}
                                className="btn btn-ghost btn-sm btn-circle dark:text-slate-300"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Managing Course</p>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 bg-clip-text">
                            {course.title}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-2xl text-lg leading-relaxed">
                            {course.description}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800/50 font-mono font-medium shadow-sm">
                                <Copy className="w-4 h-4 opacity-70" />
                                <span>Join Code: </span>
                                <span className="font-bold tracking-wider">{course.joinCode}</span>
                            </div>
                            <button
                                onClick={handleCopyJoinCode}
                                className="btn btn-ghost text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl px-4"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 md:flex-col lg:flex-row">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`btn btn-outline border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-6 ${isEditing ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white/50 dark:bg-slate-800/30'}`}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            {isEditing ? "Cancel Edit" : "Edit Course"}
                        </button>
                        <button
                            onClick={handleDeleteCourse}
                            className="btn btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 rounded-xl px-6"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </button>
                    </div>
                </div>

                {/* Edit Form */}
                {isEditing && (
                    <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700/50 animate-in slide-in-from-top-4 duration-300">
                        <h3 className="font-bold text-xl mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Edit className="w-5 h-5 text-blue-500" />
                            Edit Course Details
                        </h3>
                        <form
                            onSubmit={handleUpdateCourse}
                            className="space-y-5 max-w-3xl"
                        >
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                        Course Title
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={editData.title}
                                    onChange={(e) =>
                                        setEditData({
                                            ...editData,
                                            title: e.target.value,
                                        })
                                    }
                                    className="input input-bordered bg-white/50 dark:bg-base-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-xl transition-all"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                        Description
                                    </span>
                                </label>
                                <textarea
                                    value={editData.description}
                                    onChange={(e) =>
                                        setEditData({
                                            ...editData,
                                            description: e.target.value,
                                        })
                                    }
                                    className="textarea textarea-bordered h-28 bg-white/50 dark:bg-base-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-xl transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={isUpdatingCourse}
                                    className="btn-brand px-8"
                                >
                                    {isUpdatingCourse ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="btn btn-ghost rounded-xl px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
