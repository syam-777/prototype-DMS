import { useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login, isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setUsername('');
      setPassword('');
      setError('Entered wrong username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 p-4 rounded-full mb-4">
            <Shield className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SecureVault</h1>
          <p className="text-slate-500 mt-2 text-sm">Enterprise Document Management</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center space-x-2 disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowForgot(!showForgot)}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            Forgot Password?
          </button>
        </div>

        {showForgot && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">🔐 Password Reset</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              For security reasons, passwords cannot be reset online. Please contact your <span className="font-bold">System Administrator</span> or raise a ticket at the IT Helpdesk.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              📧 helpdesk@securevault.gov.in &nbsp;|&nbsp; 📞 1800-XXX-XXXX
            </p>
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              ✕ Close
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-amber-700 font-bold text-xs">GOI</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-700">Government of India</p>
              <p className="text-[10px] text-slate-400">Ministry of Law & Justice • Dept. of Legal Affairs</p>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            <span className="font-bold">WARNING:</span> This is a restricted government system. Unauthorized access is prohibited and subject to criminal prosecution under the IT Act, 2000. All activities are monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
