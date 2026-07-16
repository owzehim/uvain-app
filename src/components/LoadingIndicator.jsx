export default function LoadingIndicator({ label = '로딩 중...' }) {
  return (
    <div className="flex items-center gap-2.5" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500 dark:border-gray-700 dark:border-t-orange-500"
      />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}
