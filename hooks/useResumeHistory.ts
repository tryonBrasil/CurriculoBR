
import { useState, useCallback } from 'react';
import { ResumeData } from '../types';

export function useResumeHistory(initialData: ResumeData) {
  const [history, setHistory] = useState<{ past: ResumeData[], present: ResumeData, future: ResumeData[] }>({
    past: [],
    present: initialData,
    future: []
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;
    setHistory(curr => {
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future]
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setHistory(curr => {
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture
      };
    });
  }, [canRedo]);

  const update = useCallback((newData: ResumeData | ((prev: ResumeData) => ResumeData)) => {
    setHistory(curr => {
      const nextData = typeof newData === 'function' 
        ? (newData as (prev: ResumeData) => ResumeData)(curr.present) 
        : newData;
      
      if (JSON.stringify(nextData) === JSON.stringify(curr.present)) return curr;
      
      return {
        past: [...curr.past, curr.present].slice(-20), // Limit history to 20 steps
        present: nextData,
        future: []
      };
    });
  }, []);

  return { 
    data: history.present, 
    updateData: update, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    setHistoryDirect: setHistory 
  };
}
