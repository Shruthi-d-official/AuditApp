import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { VendorDashboard } from './components/VendorDashboard';
import { TeamLeaderDashboard } from './components/TeamLeaderDashboard';
import { WorkerDashboard } from './components/WorkerDashboard';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'vendor':
      return <VendorDashboard />;
    case 'team_leader':
      return <TeamLeaderDashboard />;
    case 'worker':
      return <WorkerDashboard />;
    default:
      return <Login />;
  }
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;