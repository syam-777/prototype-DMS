import { useState, useEffect, useContext } from 'react';
import { ShieldCheck, ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

export default function AuditLogPage() {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit?limit=50&offset=0');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.get('/audit/verify');
      setVerificationResult(res.data);
    } catch (err) {
      console.error(err);
      setVerificationResult({ valid: false, error: 'Failed to connect to verification server' });
    } finally {
      setVerifying(false);
    }
  };

  const getActionColor = (action) => {
    const colors = {
      UPLOAD: 'bg-blue-100 text-blue-800',
      VIEW: 'bg-gray-100 text-gray-800',
      EDIT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-green-100 text-green-800',
      ACCESS_DENIED: 'bg-red-100 text-red-800 border border-red-300',
      SHARE: 'bg-purple-100 text-purple-800',
      SIGN: 'bg-teal-100 text-teal-800'
    };
    return colors[action] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-purple-600" />
            System Audit Log
          </h1>
          <p className="text-slate-500 mt-1">Immutable record of all system activity and document access.</p>
        </div>
        
        {user?.role === 'admin' && (
          <button 
            onClick={handleVerify}
            disabled={verifying}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium flex items-center transition-colors disabled:opacity-70 shadow-sm"
          >
            {verifying ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-5 h-5 mr-2 text-green-400" />
            )}
            Verify Chain Integrity
          </button>
        )}
      </div>

      {verificationResult && (
        <div className={`mb-6 p-4 rounded-lg flex items-start border ${verificationResult.valid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {verificationResult.valid ? (
            <ShieldCheck className="w-6 h-6 mr-3 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-6 h-6 mr-3 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="font-bold text-lg">{verificationResult.valid ? 'Cryptographic Chain Valid' : 'Chain Integrity Compromised!'}</h3>
            <p className="mt-1 opacity-90">
              {verificationResult.valid 
                ? 'All audit records have been cryptographically verified. No tampering detected in the blockchain ledger.' 
                : `Verification failed at block index ${verificationResult.brokenAt}. The chain has been modified.`}
            </p>
          </div>
          <button onClick={() => setVerificationResult(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                <th className="p-4 font-medium w-16 text-center">#</th>
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Document ID</th>
                <th className="p-4 font-medium hidden md:table-cell">Details</th>
                <th className="p-4 font-medium">Timestamp</th>
                <th className="p-4 font-medium">Hash Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></td></tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-center text-slate-400 text-xs font-mono">{log.id}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-800">{log.full_name || log.user_id}</td>
                    <td className="p-4 text-sm text-slate-600 font-mono">{log.document_id || '-'}</td>
                    <td className="p-4 text-sm text-slate-600 hidden md:table-cell truncate max-w-xs">{log.details}</td>
                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded" title={log.entry_hash}>
                        {log.entry_hash ? log.entry_hash.substring(0, 16) + '...' : 'GENESIS'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">No audit logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
