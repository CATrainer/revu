'use client';

type View = 'chat' | 'tasks' | 'progress' | 'decisions';

interface Props {
  currentView: View;
  onViewChange: (view: View) => void;
}

const views = [
  { id: 'chat' as View, label: 'Chat', icon: '💬' },
  { id: 'tasks' as View, label: 'Tasks', icon: '✓' },
  { id: 'progress' as View, label: 'Progress', icon: '📊' },
  { id: 'decisions' as View, label: 'Decisions', icon: '📋' },
];

export default function ViewToggle({ currentView, onViewChange }: Props) {
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition font-medium text-sm ${
            currentView === view.id
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span>{view.icon}</span>
          <span className="hidden sm:inline">{view.label}</span>
        </button>
      ))}
    </div>
  );
}
