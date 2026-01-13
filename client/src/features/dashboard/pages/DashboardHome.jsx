export default function DashboardHome() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-6">
          <svg
            className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-3">
          Welcome to Your Dashboard
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Your personalized dashboard is ready. Access your data, manage your
          account, and stay connected with everything you need in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <div className="px-6 py-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              🔒
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              Secure Access
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Your data is protected
            </p>
          </div>
          <div className="px-6 py-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              ⚡
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              Fast & Reliable
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Optimized performance
            </p>
          </div>
          <div className="px-6 py-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              📊
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              Real-time Updates
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Always up to date
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
