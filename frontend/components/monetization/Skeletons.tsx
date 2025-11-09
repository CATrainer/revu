export function MessageSkeleton() {
  return (
    <div className="flex justify-start animate-in fade-in">
      <div className="max-w-3xl w-2/3">
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <MessageSkeleton />
      <div className="flex justify-end">
        <div className="max-w-3xl w-1/3">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
      <MessageSkeleton />
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-4" />
          <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function DecisionsSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectWorkspaceSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32" />
        </div>
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-20" />
      </div>

      {/* Progress Dashboard */}
      <ProgressSkeleton />

      {/* Tabs */}
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-96" />

      {/* Content */}
      <div className="dashboard-card overflow-hidden" style={{ height: '600px' }}>
        <ChatSkeleton />
      </div>
    </div>
  );
}
