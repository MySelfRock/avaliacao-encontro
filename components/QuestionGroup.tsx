
import React from 'react';

interface QuestionGroupProps {
  title: string;
  commentPrompt: string;
  commentValue: string;
  onCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  children: React.ReactNode;
}

export const QuestionGroup: React.FC<QuestionGroupProps> = ({ title, commentPrompt, commentValue, onCommentChange, children }) => (
  <div className="mb-2 p-6 bg-gradient-to-br from-pastoral-blue-50/50 to-blue-50/30 rounded-xl border-2 border-pastoral-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
    <h3 className="text-xl font-semibold text-pastoral-blue-800 mb-4 flex items-center gap-2">
      <div className="w-1.5 h-6 bg-gradient-to-b from-pastoral-blue-400 to-paroquia-gold-400 rounded-full"></div>
      {title}
    </h3>
    <div className="space-y-4 mb-6">
      {children}
    </div>
    <label className="block text-md font-medium text-pastoral-blue-700 mb-2">
      {commentPrompt}
    </label>
    <textarea
      value={commentValue}
      onChange={onCommentChange}
      rows={3}
      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all hover:border-pastoral-blue-300 bg-white"
      placeholder="Sua resposta..."
    />
  </div>
);
