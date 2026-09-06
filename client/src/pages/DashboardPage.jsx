import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, Activity, ShieldAlert, Plus, Search } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../utils/api';
import DocumentCard from '../components/DocumentCard';

export default function DashboardPage() {
  const { user } = useContext(AuthContext);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/documents');
        const documents = res.data.documents || [];
        setDocs(documents.slice(0, 5));
        setStats({ total: documents.length });
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Welcome back, {user?.username}</h1>
        <p className="text-slate-500 mt-1">Here is the latest activity in your secure environment.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Accessible Documents</h3>
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{loading ? '-' : stats.total}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Recent Uploads</h3>
            <div className="bg-green-100 p-2 rounded-lg text-green-600">
              <Upload className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">-</p>
          <p className="text-xs text-slate-400 mt-2">Last 7 days</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Pending Reviews</h3>
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">0</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Audit Events</h3>
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">-</p>
          <p className="text-xs text-slate-400 mt-2">Today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Documents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Recent Documents</h2>
            <Link to="/documents" className="text-blue-600 text-sm hover:underline font-medium">View All</Link>
          </div>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="bg-slate-200 h-32 rounded-lg"></div>)}
            </div>
          ) : docs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-500">No documents found.</p>
            </div>
          )}
        </div>

        {/* Quick Actions & Audit snippet */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {(user?.role === 'investigator' || user?.role === 'admin') && (
                <Link to="/documents/upload" className="flex items-center p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                  <Plus className="w-5 h-5 mr-3 text-blue-400" />
                  <span className="font-medium">Upload Document</span>
                </Link>
              )}
              <Link to="/search" className="flex items-center p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <Search className="w-5 h-5 mr-3 text-green-400" />
                <span className="font-medium">Global Search</span>
              </Link>
              <Link to="/audit" className="flex items-center p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <Activity className="w-5 h-5 mr-3 text-purple-400" />
                <span className="font-medium">View Audit Logs</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
