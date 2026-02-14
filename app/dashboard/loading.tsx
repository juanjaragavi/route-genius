/**
 * RouteGenius — Dashboard Loading State
 *
 * Skeleton UI with pulsing placeholder cards shown while dashboard pages load.
 */

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title skeleton */}
      <div>
        <div className="h-8 w-48 sm:w-64 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-full max-w-96 bg-gray-100 rounded-lg" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-6">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-75 bg-gray-100 rounded-xl" />
      </div>

      {/* Table skeleton */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
