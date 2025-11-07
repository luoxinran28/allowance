'use client';

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Welcome to Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Your Tier</h3>
          <p className="text-2xl text-blue-600">Free</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Licenses</h3>
          <p className="text-2xl text-blue-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Teams</h3>
          <p className="text-2xl text-blue-600">0</p>
        </div>
      </div>
    </div>
  );
}
