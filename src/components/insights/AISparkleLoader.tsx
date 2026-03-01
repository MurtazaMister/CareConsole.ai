export default function AISparkleLoader() {
  return (
    <div className="flex items-center gap-3 py-3">
      <svg
        className="ai-sparkle w-5 h-5 text-primary flex-shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
      </svg>
      <span className="ai-shimmer-text text-sm font-medium">
        Generating explanation...
      </span>
    </div>
  )
}
