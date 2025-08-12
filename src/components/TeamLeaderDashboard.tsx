import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Users, Plus, Check, X, Key } from 'lucide-react';
import { supabase, createOTPRequest, verifyOTP } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User, OTPRequest } from '../types';

export const TeamLeaderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<User[]>([]);
  const [otpRequests, setOtpRequests] = useState<OTPRequest[]>([]);
  const [showCreateWorker, setShowCreateWorker] = useState(false);
  const [newWorkerUsername, setNewWorkerUsername] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<User | null>(null);
  const [enteredOTP, setEnteredOTP] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load workers under this team leader
      const { data: workerData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .eq('team_leader_id', user?.id);

      if (workerData) setWorkers(workerData);

      // Load pending OTP requests
      const { data: otpData } = await supabase
        .from('otp_requests')
        .select('*')
        .eq('team_leader_id', user?.id)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString());

      if (otpData) setOtpRequests(otpData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('users').insert([{
        username: newWorkerUsername,
        role: 'worker',
        team_leader_id: user?.id,
        warehouse_name: user?.warehouse_name,
        is_approved: false
      }]);

      if (error) throw error;

      setNewWorkerUsername('');
      setShowCreateWorker(false);
      loadData();
    } catch (error) {
      console.error('Error creating worker:', error);
    }
  };

  const handleWorkerLogin = async (worker: User) => {
    try {
      // Create OTP request
      await createOTPRequest(worker.id, user!.id);
      setSelectedWorker(worker);
      setShowOTPModal(true);
      loadData();
    } catch (error) {
      console.error('Error creating OTP:', error);
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;

    try {
      await verifyOTP(selectedWorker.id, enteredOTP);
      
      // Approve the worker
      await supabase
        .from('users')
        .update({ is_approved: true })
        .eq('id', selectedWorker.id);

      setShowOTPModal(false);
      setSelectedWorker(null);
      setEnteredOTP('');
      loadData();
      alert('Worker approved successfully!');
    } catch (error) {
      alert('Invalid or expired OTP');
      console.error('Error verifying OTP:', error);
    }
  };

  const stats = {
    totalWorkers: workers.length,
    approvedWorkers: workers.filter(w => w.is_approved).length,
    pendingWorkers: workers.filter(w => !w.is_approved).length,
    pendingOTPs: otpRequests.length
  };

  return (
    <Layout title="Team Leader Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Workers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorkers}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <Check className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approvedWorkers}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <X className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingWorkers}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <Key className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending OTPs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOTPs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Worker */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Worker Management</h3>
              <button
                onClick={() => setShowCreateWorker(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Worker</span>
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {showCreateWorker && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <form onSubmit={handleCreateWorker} className="flex space-x-4">
                  <input
                    type="text"
                    placeholder="Worker Username"
                    value={newWorkerUsername}
                    onChange={(e) => setNewWorkerUsername(e.target.value)}
                    className="input-field flex-1"
                    required
                  />
                  <button type="submit" className="btn-primary">Create</button>
                  <button
                    type="button"
                    onClick={() => setShowCreateWorker(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workers.map((worker) => (
                    <tr key={worker.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {worker.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          worker.is_approved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {worker.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(worker.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!worker.is_approved && (
                          <button
                            onClick={() => handleWorkerLogin(worker)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Generate OTP
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pending OTP Requests */}
        {otpRequests.length > 0 && (
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Pending OTP Requests</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {otpRequests.map((otp) => {
                  const worker = workers.find(w => w.id === otp.worker_id);
                  return (
                    <div key={otp.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Worker: {worker?.username}
                        </h4>
                        <p className="text-sm text-gray-600">
                          OTP: <span className="font-mono font-bold">{otp.otp_code}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires: {new Date(otp.expires_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* OTP Verification Modal */}
        {showOTPModal && selectedWorker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Verify OTP for {selectedWorker.username}
              </h3>
              
              <form onSubmit={handleOTPVerification} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP Code
                  </label>
                  <input
                    type="text"
                    value={enteredOTP}
                    onChange={(e) => setEnteredOTP(e.target.value)}
                    className="input-field"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary flex-1">
                    Verify & Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOTPModal(false);
                      setSelectedWorker(null);
                      setEnteredOTP('');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};