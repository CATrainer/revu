export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6 animate-pulse">
      <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-40 bg-gray-100 rounded" />
        <div className="h-40 bg-gray-100 rounded" />
        <div className="h-40 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
