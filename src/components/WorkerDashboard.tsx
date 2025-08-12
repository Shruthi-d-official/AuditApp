import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Play, Square, Package, Search, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BinMaster, CountingSession, CountingRecord } from '../types';

export const WorkerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<CountingSession | null>(null);
  const [bins, setBins] = useState<BinMaster[]>([]);
  const [filteredBins, setFilteredBins] = useState<BinMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBin, setSelectedBin] = useState<BinMaster | null>(null);
  const [quantity, setQuantity] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [todayRecords, setTodayRecords] = useState<CountingRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredBins(
        bins.filter(bin => 
          bin.bin_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bin.location.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredBins(bins);
    }
  }, [searchTerm, bins]);

  const loadData = async () => {
    try {
      // Load bins for the warehouse
      const { data: binData } = await supabase
        .from('bin_master')
        .select('*')
        .eq('warehouse_name', user?.warehouse_name)
        .order('bin_code');

      if (binData) {
        setBins(binData);
        setFilteredBins(binData);
      }

      // Check for active session
      const { data: sessionData } = await supabase
        .from('counting_sessions')
        .select('*')
        .eq('worker_id', user?.id)
        .eq('status', 'active')
        .single();

      if (sessionData) setCurrentSession(sessionData);

      // Load today's records
      const today = new Date().toISOString().split('T')[0];
      const { data: recordsData } = await supabase
        .from('counting_records')
        .select('*')
        .eq('username', user?.username)
        .gte('date', today)
        .order('created_at', { ascending: false });

      if (recordsData) setTodayRecords(recordsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const startCounting = async () => {
    try {
      const { data, error } = await supabase
        .from('counting_sessions')
        .insert([{
          worker_id: user?.id,
          start_time: new Date().toISOString(),
          status: 'active',
          total_bins_counted: 0,
          total_qty_counted: 0
        }])
        .select()
        .single();

      if (error) throw error;
      setCurrentSession(data);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const endCounting = async () => {
    if (!currentSession) return;

    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(currentSession.start_time);
      const timeTakenMinutes = Math.round((new Date(endTime).getTime() - startTime.getTime()) / (1000 * 60));

      // Update session
      await supabase
        .from('counting_sessions')
        .update({
          end_time: endTime,
          status: 'completed'
        })
        .eq('id', currentSession.id);

      // Calculate efficiency and create efficiency record
      const efficiencyScore = Math.min(100, Math.round((currentSession.total_bins_counted / Math.max(1, timeTakenMinutes)) * 60));

      await supabase.from('worker_efficiency').insert([{
        warehouse_name: user?.warehouse_name,
        date: new Date().toISOString().split('T')[0],
        username: user?.username,
        bins_counted: currentSession.total_bins_counted,
        qty_counted: currentSession.total_qty_counted,
        time_taken_minutes: timeTakenMinutes,
        efficiency_score: efficiencyScore,
        ranking: 1 // This would be calculated based on all workers
      }]);

      setCurrentSession(null);
      loadData();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleBinSelect = (bin: BinMaster) => {
    setSelectedBin(bin);
    setQuantity('');
  };

  const handleQuantitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBin || !quantity || !currentSession) return;
    setShowConfirmation(true);
  };

  const confirmQuantity = async () => {
    if (!selectedBin || !quantity || !currentSession) return;

    try {
      // Create counting record
      await supabase.from('counting_records').insert([{
        session_id: currentSession.id,
        warehouse_name: user?.warehouse_name,
        date: new Date().toISOString().split('T')[0],
        team_leader_name: 'TL1', // This should come from the actual team leader
        username: user?.username,
        bin_no: selectedBin.bin_code,
        qty_counted: parseInt(quantity),
        qty_as_per_books: Math.floor(Math.random() * 100) + 50, // Mock data
        difference: 0 // Will be calculated
      }]);

      // Update session totals
      await supabase
        .from('counting_sessions')
        .update({
          total_bins_counted: currentSession.total_bins_counted + 1,
          total_qty_counted: currentSession.total_qty_counted + parseInt(quantity)
        })
        .eq('id', currentSession.id);

      setShowConfirmation(false);
      setSelectedBin(null);
      setQuantity('');
      setSearchTerm('');
      loadData();
    } catch (error) {
      console.error('Error saving count:', error);
    }
  };

  const stats = {
    todayBins: todayRecords.length,
    todayQty: todayRecords.reduce((sum, record) => sum + record.qty_counted, 0),
    sessionBins: currentSession?.total_bins_counted || 0,
    sessionQty: currentSession?.total_qty_counted || 0
  };

  if (!user?.is_approved) {
    return (
      <Layout title="Worker Dashboard">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Waiting for Approval
            </h2>
            <p className="text-gray-600">
              Your account is pending approval from your team leader.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Worker Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Bins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayBins}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Qty</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayQty}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Session Bins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sessionBins}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Session Qty</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sessionQty}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Control */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Counting Session</h3>
              <p className="text-sm text-gray-600">
                {currentSession 
                  ? `Started at ${new Date(currentSession.start_time).toLocaleTimeString()}`
                  : 'No active session'
                }
              </p>
            </div>
            
            <div>
              {currentSession ? (
                <button
                  onClick={endCounting}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>End Counting</span>
                </button>
              ) : (
                <button
                  onClick={startCounting}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Counting</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bin Selection and Quantity Entry */}
        {currentSession && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bin Selection */}
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Select Bin</h3>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search bins..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredBins.map((bin) => (
                    <button
                      key={bin.id}
                      onClick={() => handleBinSelect(bin)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedBin?.id === bin.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{bin.bin_code}</div>
                      <div className="text-sm text-gray-500">{bin.location}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quantity Entry */}
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Enter Quantity</h3>
              </div>
              <div className="p-6">
                {selectedBin ? (
                  <form onSubmit={handleQuantitySubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected Bin: {selectedBin.bin_code}
                      </label>
                      <p className="text-sm text-gray-500 mb-4">
                        Location: {selectedBin.location}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="input-field"
                        placeholder="Enter quantity"
                        min="0"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full btn-primary"
                      disabled={!quantity}
                    >
                      Submit Count
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a bin to enter quantity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Today's Records */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Today's Counting Records</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bin No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty Counted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.bin_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.qty_counted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && selectedBin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm Quantity
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bin:</span>
                  <span className="font-medium">{selectedBin.bin_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">{selectedBin.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium text-primary-600">{quantity}</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={confirmQuantity}
                  className="btn-primary flex-1"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};