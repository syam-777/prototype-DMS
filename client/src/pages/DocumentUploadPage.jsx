import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    case_number: '',
    category: 'evidence',
    classification: 'confidential'
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (user?.role !== 'admin' && user?.role !== 'investigator') {
    return <div className="p-8 text-center text-red-500">Unauthorized. Only investigators and admins can upload documents.</div>;
  }

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError('');

    const data = new FormData();
    data.append('document', file);
    data.append('title', formData.title);
    data.append('case_number', formData.case_number);
    data.append('category', formData.category);
    data.append('classification', formData.classification);

    try {
      const res = await api.post('/documents', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/documents/${res.data.document.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document.');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Upload Secure Document</h1>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center mb-6">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          
          {/* File Upload Zone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Document File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:bg-slate-50 transition-colors">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">PDF, DOCX, JPG, PNG up to 50MB</p>
                {file && (
                  <div className="mt-4 flex items-center justify-center text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <File className="w-4 h-4 mr-2" />
                    {file.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                required
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., Suspect Statement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Case Number</label>
              <input
                required
                type="text"
                name="case_number"
                value={formData.case_number}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., CASE-2023-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="fir">FIR</option>
                <option value="statement">Statement</option>
                <option value="chargesheet">Chargesheet</option>
                <option value="evidence">Evidence</option>
                <option value="warrant">Warrant</option>
                <option value="court order">Court Order</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Classification Level</label>
              <select
                name="classification"
                value={formData.classification}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="public">Public</option>
                <option value="confidential">Confidential</option>
                <option value="restricted">Restricted</option>
                <option value="top_secret">Top Secret</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium mr-3 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center disabled:opacity-70"
          >
            {uploading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div> Uploading...</>
            ) : (
              'Upload Document'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
