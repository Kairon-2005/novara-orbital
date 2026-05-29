export default function Loading() {
  return (
    <div className="p-9 animate-pulse space-y-4">
      <div className="h-5 w-48 bg-gray-100 rounded" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
