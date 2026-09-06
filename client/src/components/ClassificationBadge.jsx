import React from 'react';

export default function ClassificationBadge({ level }) {
  const styles = {
    public: 'bg-green-100 text-green-800',
    confidential: 'bg-yellow-100 text-yellow-800',
    restricted: 'bg-orange-100 text-orange-800',
    top_secret: 'bg-red-100 text-red-800',
  };

  const style = styles[level?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  const display = level ? level.replace('_', ' ').toUpperCase() : 'UNKNOWN';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {display}
    </span>
  );
}
