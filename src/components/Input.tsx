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
  label, value, onChange, type = 'text', placeholder, multiline, error, onBlur 
}) => {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 tracking-wide">{label}</label>
        {error && <span className="text-xs font-semibold text-red-500 animate-in fade-in">{error}</span>}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={3}
          className={`w-full px-4 py-3.5 border-2 rounded-xl text-base outline-none transition-all resize-none leading-relaxed dark:bg-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 ${
            error
              ? 'border-red-300 bg-red-50 focus:border-red-400 dark:border-red-700 dark:bg-red-900/20'
              : 'border-slate-200 focus:border-blue-500 bg-white dark:border-slate-700 dark:focus:border-blue-400'
          }`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-3.5 border-2 rounded-xl text-base outline-none transition-all dark:bg-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 ${
            error
              ? 'border-red-300 bg-red-50 focus:border-red-400 dark:border-red-700 dark:bg-red-900/20'
              : 'border-slate-200 focus:border-blue-500 bg-white dark:border-slate-700 dark:focus:border-blue-400'
          }`}
        />
      )}
    </div>
  );
};

export default Input;
