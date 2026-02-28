interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: string;
  className?: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'pink' | 'teal' | 'emerald';
  tooltip?: string;
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400',
  pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400',
  teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
  brand: 'bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400',
};

export default function StatCard({ title, value, icon, className = '', color, tooltip }: StatCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 ${className} group relative`}>
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            {tooltip && (
              <div className="relative inline-block">
                <svg
                  className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 z-50 whitespace-pre-line">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              </div>
            )}
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
