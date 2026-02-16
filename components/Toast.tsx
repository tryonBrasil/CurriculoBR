
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] toast-animate pointer-events-none">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border pointer-events-auto ${type === 'error' ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/80 dark:border-red-800 dark:text-red-100' : 'bg-green-50 border-green-100 text-green-600 dark:bg-green-900/80 dark:border-green-800 dark:text-green-100'}`}>
        <i className={`fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} text-lg`}></i>
        <span className="font-bold text-sm">{message}</span>
        <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100"><i className="fas fa-times"></i></button>
      </div>
    </div>
  );
};

export default Toast;
