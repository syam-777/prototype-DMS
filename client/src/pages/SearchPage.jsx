import { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import api from '../utils/api';
import DocumentCard from '../components/DocumentCard';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setResults(res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Global Search</h1>
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, case numbers, text content..."
            className="w-full pl-12 pr-24 py-4 rounded-xl border border-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
          />
          <Search className="absolute left-4 top-4 h-6 w-6 text-slate-400" />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-medium transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {loading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && hasSearched && (
        <div>
          <h2 className="text-lg font-medium text-slate-700 mb-4 border-b pb-2">
            Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </h2>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map(doc => (
                <div key={doc.document_id} className="relative">
                  <DocumentCard doc={{...doc, id: doc.document_id}} />
                  {doc.snippet && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-blue-50/90 text-sm text-blue-900 border-t border-blue-100 rounded-b-lg truncate" dangerouslySetInnerHTML={{ __html: doc.snippet }} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-slate-900 mb-2">No Matches Found</h3>
              <p className="text-slate-500">Try using different keywords or checking for spelling errors.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
