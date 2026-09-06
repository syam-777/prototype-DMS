import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, User } from 'lucide-react';
import ClassificationBadge from './ClassificationBadge';

export default function DocumentCard({ doc }) {
  return (
    <Link to={`/documents/${doc.id}`} className="block bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-slate-800 truncate pr-2">{doc.title}</h3>
        <ClassificationBadge level={doc.classification} />
      </div>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-slate-500">Case: <span className="font-medium text-slate-700">{doc.case_number}</span></p>
        <div className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600">
          {doc.category}
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-slate-500 border-t pt-3 border-slate-100">
        <div className="flex items-center">
          <User className="w-3 h-3 mr-1" />
          <span>{doc.uploaded_by}</span>
        </div>
        <div className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          <span>{new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}
