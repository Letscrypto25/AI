export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl border p-8 text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold text-gray-800">Access Denied</h1>
        <p className="text-gray-500 text-sm">Your account is not registered for this app. Contact your administrator.</p>
      </div>
    </div>
  );
}
