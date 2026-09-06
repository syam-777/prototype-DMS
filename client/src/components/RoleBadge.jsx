import React from 'react';
import { Shield } from 'lucide-react';

export default function RoleBadge({ role }) {
  const roleStyles = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    investigator: 'bg-blue-100 text-blue-800 border-blue-200',
    officer: 'bg-green-100 text-green-800 border-green-200',
    legal: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  const currentStyle = roleStyles[role] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStyle}`}>
      <Shield className="w-3 h-3 mr-1" />
      {role ? role.toUpperCase() : 'UNKNOWN'}
    </span>
  );
}
