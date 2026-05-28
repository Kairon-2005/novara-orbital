export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center">
        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="p-[28px_36px] space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-[10px] bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
