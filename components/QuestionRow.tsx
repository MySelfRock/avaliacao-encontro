
import React from 'react';

interface QuestionRowProps {
  label: string;
  children: React.ReactNode;
}

export const QuestionRow: React.FC<QuestionRowProps> = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
    <p className="text-md text-gray-700 mb-2 sm:mb-0 mr-4">{label}</p>
    {children}
  </div>
);
