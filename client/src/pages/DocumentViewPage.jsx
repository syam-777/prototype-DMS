import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Edit, Shield, History, Users, Activity, FileText, Share2, PenTool } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';
import ClassificationBadge from '../components/ClassificationBadge';
import RoleBadge from '../components/RoleBadge';
import Modal from '../components/Modal';

export default function DocumentViewPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [shareForm, setShareForm] = useState({ userId: '', accessLevel: 'view' });

  useEffect(() => {
    fetchDoc();
    fetchUsers();
  }, [id]);

  const fetchDoc = async () => {
    try {
      const res = await api.get(`/documents/${id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (version = null) => {
    try {
      const url = version ? `/documents/${id}/download/${version}` : `/documents/${id}/download`;
      // Note: In a real app, we'd handle the blob response to force download
      // For this demo, we can just open in a new tab if it's a proxy, or use fetch blob
      const response = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', data.document.original_filename || data.document.title);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download file");
    }
  };

  const handleSign = async () => {
    try {
      await api.post(`/documents/${id}/sign`);
      fetchDoc(); // refresh data
      alert("Document signed successfully!");
    } catch (err) {
      alert("Failed to sign document");
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/documents/${id}/share`, shareForm);
      setShareModalOpen(false);
      fetchDoc(); // refresh
    } catch (err) {
      alert("Failed to share document");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data || !data.document) return <div className="p-8">Document not found or access denied.</div>;

  const { document, versions, access, signatures } = data;
  const isOwnerOrAdmin = user?.role === 'admin' || document.uploaded_by === user?.id;
  const canEdit = isOwnerOrAdmin || access?.some(a => a.user_id === user?.id && a.access_level === 'edit');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-t-xl border-b-0 border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
            <ClassificationBadge level={document.classification} />
          </div>
          <p className="text-slate-500">Case: <span className="font-semibold text-slate-700">{document.case_number}</span> • Uploaded by {document.uploaded_by}</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <button onClick={() => handleDownload()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors">
            <Download className="w-4 h-4 mr-2" /> Download
          </button>
          {canEdit && (
            <div>
              <input type="file" id="new-version" className="sr-only" onChange={async (e) => {
                if (e.target.files[0]) {
                  const changeDesc = prompt("Enter change description for this new version:");
                  if (changeDesc) {
                    const formData = new FormData();
                    formData.append('document', e.target.files[0]);
                    formData.append('change_description', changeDesc);
                    try {
                      await api.post(`/documents/${id}/versions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                      fetchDoc();
                      alert("New version uploaded successfully!");
                    } catch (err) {
                      alert("Failed to upload new version");
                    }
                  }
                  e.target.value = null;
                }
              }} />
              <label htmlFor="new-version" className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center transition-colors">
                <Edit className="w-4 h-4 mr-2" /> New Version
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-50 border-x border-slate-200 flex overflow-x-auto">
        <button onClick={() => setActiveTab('details')} className={`px-6 py-3 font-medium text-sm flex items-center border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}>
          <FileText className="w-4 h-4 mr-2" /> Details
        </button>
        <button onClick={() => setActiveTab('versions')} className={`px-6 py-3 font-medium text-sm flex items-center border-b-2 ${activeTab === 'versions' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}>
          <History className="w-4 h-4 mr-2" /> Versions ({versions?.length || 0})
        </button>
        <button onClick={() => setActiveTab('access')} className={`px-6 py-3 font-medium text-sm flex items-center border-b-2 ${activeTab === 'access' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}>
          <Users className="w-4 h-4 mr-2" /> Access Rights
        </button>
        <button onClick={() => setActiveTab('signatures')} className={`px-6 py-3 font-medium text-sm flex items-center border-b-2 ${activeTab === 'signatures' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}>
          <PenTool className="w-4 h-4 mr-2" /> Signatures ({signatures?.length || 0})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl p-6 min-h-[400px]">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Metadata</h3>
              <dl className="space-y-3">
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                  <dt className="text-sm font-medium text-slate-500">Category</dt>
                  <dd className="text-sm text-slate-900 col-span-2">{document.category}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                  <dt className="text-sm font-medium text-slate-500">Created At</dt>
                  <dd className="text-sm text-slate-900 col-span-2">{new Date(document.created_at).toLocaleString()}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                  <dt className="text-sm font-medium text-slate-500">Current Version</dt>
                  <dd className="text-sm text-slate-900 col-span-2 font-mono bg-slate-100 px-2 py-0.5 rounded w-max">v{document.current_version}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Security & Integrity</h3>
              <div className="bg-slate-900 rounded-xl p-5 text-white">
                <div className="flex items-center text-green-400 mb-3">
                  <Shield className="w-5 h-5 mr-2" />
                  <span className="font-medium">Protected Document</span>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-slate-400 block mb-1">SHA-256 Content Hash (Latest)</span>
                  <div className="font-mono text-xs bg-slate-800 p-2 rounded break-all border border-slate-700">
                    {versions && versions.length > 0 ? versions[0].content_hash : 'N/A'}
                  </div>
                </div>
                <button onClick={handleSign} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center">
                  <PenTool className="w-4 h-4 mr-2 text-green-400" /> Digital Sign
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Version History</h3>
            <div className="space-y-4">
              {versions?.map((ver, idx) => (
                <div key={ver.version_number} className="flex gap-4 border border-slate-200 rounded-lg p-4 bg-white relative">
                  {idx !== versions.length - 1 && <div className="absolute left-[31px] top-[48px] bottom-[-16px] w-0.5 bg-slate-200"></div>}
                  <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 z-10 border-4 border-white">
                    {ver.version_number}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900">Modified by {ver.changed_by}</p>
                        <p className="text-sm text-slate-500">{new Date(ver.created_at).toLocaleString()}</p>
                      </div>
                      <button onClick={() => handleDownload(ver.version_number)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg text-sm font-medium flex items-center">
                        <Download className="w-4 h-4 mr-1" /> Get
                      </button>
                    </div>
                    <p className="text-sm mt-2 text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">{ver.change_description}</p>
                    <div className="mt-2 text-xs font-mono text-slate-400 truncate">Hash: {ver.content_hash}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Access Control List</h3>
              {isOwnerOrAdmin && (
                <button onClick={() => setShareModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center">
                  <Share2 className="w-4 h-4 mr-2" /> Grant Access
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-sm text-slate-500">
                    <th className="p-3 font-medium">User</th>
                    <th className="p-3 font-medium">Access Level</th>
                    <th className="p-3 font-medium">Granted By</th>
                    <th className="p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {access?.map((a, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{a.user_name || `User ID: ${a.user_id}`}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${a.access_level === 'edit' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                          {a.access_level}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-500">{a.granted_by_name || '-'}</td>
                      <td className="p-3 text-sm text-slate-500">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {access?.length === 0 && (
                    <tr><td colSpan="4" className="p-4 text-center text-slate-500">No external access granted.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'signatures' && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Digital Signatures</h3>
            {signatures && signatures.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {signatures.map((sig, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex items-start space-x-3">
                    <div className="bg-green-100 p-2 rounded-full text-green-600">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Signed by {sig.signed_by}</p>
                      <p className="text-xs text-slate-500 mb-2">{new Date(sig.signed_at).toLocaleString()}</p>
                      <div className="text-[10px] font-mono bg-white p-2 border border-slate-200 rounded break-all text-slate-400">
                        {sig.signature_hash}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No signatures yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <Modal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} title="Grant Document Access">
        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select User</label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={shareForm.userId}
              onChange={e => setShareForm({...shareForm, userId: e.target.value})}
            >
              <option value="">-- Choose User --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Access Level</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={shareForm.accessLevel}
              onChange={e => setShareForm({...shareForm, accessLevel: e.target.value})}
            >
              <option value="view">View Only (Read)</option>
              <option value="edit">Can Edit (Write)</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShareModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Grant Access</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
