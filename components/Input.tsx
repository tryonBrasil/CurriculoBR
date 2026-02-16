
import React from 'react';

interface InputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  error?: string | null;
  onBlur?: () => void;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder, 
  multiline, 
  error,
  onBlur 
}) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
        {error && <span className="text-[10px] font-bold text-red-500 animate-in fade-in">{error}</span>}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={3}
          className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all resize-none leading-relaxed dark:bg-slate-800 dark:text-white ${
            error 
              ? 'border-red-300 bg-red-50 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-900/20' 
              : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:border-slate-700 dark:focus:border-blue-400'
          }`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all dark:bg-slate-800 dark:text-white ${
            error 
              ? 'border-red-300 bg-red-50 focus:ring-red-500/10 dark:border-red-800 dark:bg-red-900/20' 
              : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:border-slate-700 dark:focus:border-blue-400'
          }`}
        />
      )}
    </div>
  );
};

export default Input;
