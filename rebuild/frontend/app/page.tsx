export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome to Repruv</h1>
      <p>Start with a demo or log in.</p>
      <div className="flex gap-2">
        <a className="px-3 py-2 bg-black text-white rounded" href="/demo">Start Demo</a>
        <a className="px-3 py-2 border rounded" href="/login">Login</a>
      </div>
      <p className="text-xs text-gray-500">Phase 1: Supabase Auth handled on login page; backend handles user records.</p>
    </div>
  )
}
