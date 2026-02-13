
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ResumeData, TemplateId, Experience, Education, Language, Certification } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import PhotoCropModal from './components/PhotoCropModal';
import AdUnit from './components/AdUnit';
import JobScanner from './components/JobScanner'; 
import CoverLetterGenerator from './components/CoverLetterGenerator';
import { useResumeHistory } from './hooks/useResumeHistory';
import { enhanceTextStream, generateSummaryStream, suggestSkills, parseResumeWithAI } from './services/geminiService';
import { extractTextFromPDF } from './services/pdfService';
import { exportToDocx } from './services/exportService'; 
import { validateEmailError, validatePhoneError } from './services/validationService';

const STEPS = [
  { id: 'info', label: 'Dados', icon: 'fa-id-card' },
  { id: 'experience', label: 'Experiência', icon: 'fa-briefcase' },
  { id: 'education', label: 'Educação', icon: 'fa-graduation-cap' },
  { id: 'skills', label: 'Habilidades', icon: 'fa-bolt' },
  { id: 'languages', label: 'Idiomas', icon: 'fa-language' },
  { id: 'certifications', label: 'Cursos', icon: 'fa-certificate' },
  { id: 'summary', label: 'Resumo', icon: 'fa-align-left' },
  { id: 'scanner', label: 'Scanner', icon: 'fa-crosshairs' },
  { id: 'cover-letter', label: 'Carta', icon: 'fa-envelope-open-text' },
];

const TEMPLATES = [
  { id: 'modern_blue', label: 'Modern Blue', desc: 'Profissional e Limpo' },
  { id: 'executive_red', label: 'Executive Red', desc: 'Liderança Sênior' },
  { id: 'corporate_gray', label: 'Corporate Gray', desc: 'Minimalista Pro' },
  { id: 'classic_serif', label: 'Classic Serif', desc: 'Tradicional Acadêmico' },
  { id: 'swiss_minimal', label: 'Swiss Minimal', desc: 'Design Suíço' },
];

const STORAGE_KEY = 'curriculobr_data_v2';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; action: () => void } | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  
  const { data, updateData, undo, redo, canUndo, canRedo, setHistoryDirect } = useResumeHistory(INITIAL_RESUME_DATA);
  
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) setHistoryDirect({ past: [], present: parsed.data, future: [] });
        if (parsed.template) setTemplate(parsed.template);
        if (parsed.isDarkMode) setIsDarkMode(parsed.isDarkMode);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (view === 'editor') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, template, isDarkMode }));
    }
  }, [data, template, view, isDarkMode]);

  const fitToScreen = useCallback(() => {
    if (!previewContainerRef.current) return;
    const h = previewContainerRef.current.clientHeight;
    const w = previewContainerRef.current.clientWidth;
    const targetScale = Math.min((h - 60) / 1123, (w - 60) / 794);
    setPreviewScale(Math.max(0.2, targetScale));
  }, []);

  useEffect(() => {
    if (view === 'editor') {
      const timer = setTimeout(fitToScreen, 100);
      window.addEventListener('resize', fitToScreen);
      return () => window.removeEventListener('resize', fitToScreen);
    
