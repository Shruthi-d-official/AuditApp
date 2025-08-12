import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Users, Check, X, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

export const VendorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [teamLeaders, setTeamLeaders] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<User[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load team leaders under this vendor
      const { data: tlData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'team_leader')
        .eq('vendor_id', user?.id);

      if (tlData) setTeamLeaders(tlData);

      // Load workers under team leaders of this vendor
      const tlIds = tlData?.map(tl => tl.id) || [];
      if (tlIds.length > 0) {
        const { data: workerData } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'worker')
          .in('team_leader_id', tlIds);

        if (workerData) setWorkers(workerData);
      }

      // Load pending team leader approvals
      const { data: pendingData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'team_leader')
        .eq('vendor_id', user?.id)
        .eq('is_approved', false);

      if (pendingData) setPendingApprovals(pendingData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const approveTeamLeader = async (teamLeaderId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_approved: true })
        .eq('id', teamLeaderId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error approving team leader:', error);
    }
  };

  const rejectTeamLeader = async (teamLeaderId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', teamLeaderId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error rejecting team leader:', error);
    }
  };

  const stats = {
    totalTeamLeaders: teamLeaders.length,
    totalWorkers: workers.length,
    activeWorkers: workers.filter(w => w.is_approved).length,
    pendingApprovals: pendingApprovals.length
  };

  return (
    <Layout title="Vendor Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Leaders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTeamLeaders}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Workers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorkers}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <Check className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Workers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeWorkers}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Pending Team Leader Approvals</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {pendingApprovals.map((tl) => (
                  <div key={tl.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <h4 className="font-medium text-gray-900">{tl.username}</h4>
                      <p className="text-sm text-gray-600">Warehouse: {tl.warehouse_name}</p>
                      <p className="text-sm text-gray-500">
                        Requested: {new Date(tl.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => approveTeamLeader(tl.id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => rejectTeamLeader(tl.id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team Leaders */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Team Leaders</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Workers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamLeaders.map((tl) => {
                    const tlWorkers = workers.filter(w => w.team_leader_id === tl.id);
                    return (
                      <tr key={tl.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tl.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tl.warehouse_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tlWorkers.length} workers
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tl.is_approved
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tl.is_approved ? 'Active' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(tl.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Workers */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Workers</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Leader
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workers.map((worker) => {
                    const teamLeader = teamLeaders.find(tl => tl.id === worker.team_leader_id);
                    return (
                      <tr key={worker.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {worker.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teamLeader?.username || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            worker.is_approved
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {worker.is_approved ? 'Active' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(worker.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};