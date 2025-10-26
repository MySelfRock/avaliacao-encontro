
import React from 'react';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
  <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl mb-8 border-l-4 border-pastoral-blue-500 hover:shadow-2xl transition-shadow duration-300 animate-fadeIn">
    <h2 className="text-2xl font-bold text-pastoral-blue-800 pb-4 mb-6 flex items-center gap-3">
      <div className="w-2 h-8 bg-gradient-to-b from-pastoral-blue-500 to-paroquia-gold-500 rounded-full"></div>
      {title}
    </h2>
    <div className="space-y-6">
        {children}
    </div>
  </div>
);
