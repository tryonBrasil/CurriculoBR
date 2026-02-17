import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ResumeData, TemplateId, Experience, Education, Skill, Language, Course, SectionId } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import PhotoCropModal from './components/PhotoCropModal';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import AdUnit from './components/AdUnit'; 
import { useResumeHistory } from './hooks/useResumeHistory';
import { enhanceTextStream, generateSummaryStream, suggestSkills, parseResumeWithAI } from './services/geminiService';
import { extractTextFromPDF } from './services/pdfService';
import { 
  validateEmailError, 
  validatePhoneError, 
  validateURLError, 
  validateDateRange 
} from './services/validationService';

const STEPS = [
  { id: 'info', label: 'Dados', icon: 'fa-id-card' },
  { id: 'experience', label: 'Experiência', icon: 'fa-briefcase' },
  { id: 'education', label: 'Educação', icon: 'fa-graduation-cap' },
  { id: 'skills', label: 'Habilidades', icon: 'fa-bolt' },
  { id: 'extras', label: 'Extras', icon: 'fa-plus-circle' },
  { id: 'summary', label: 'Resumo', icon: 'fa-align-left' },
];

const TEMPLATES = [
  { id: 'modern_blue', label: 'Modern Blue', desc: 'Profissional e Limpo' },
  { id: 'executive_navy', label: 'Executive Navy', desc: 'Premium e Luxuoso' },
  { id: 'modern_vitae', label: 'Modern Vitae', desc: 'Elegante e Espaçoso' },
  { id: 'classic_serif', label: 'Classic Serif', desc: 'Tradicional Acadêmico' },
  { id: 'swiss_minimal', label: 'Swiss Minimal', desc: 'Design Suíço' },
  { id: 'teal_sidebar', label: 'Teal Sidebar', desc: 'Corporativo Moderno' },
  { id: 'executive_red', label: 'Executive Red', desc: 'Liderança Sênior' },
  { id: 'corporate_gray', label: 'Corporate Gray', desc: 'Minimalista Pro' },
  { id: 'minimal_red_line', label: 'Minimal Red', desc: 'Impacto Visual' },
];

const STORAGE_KEY = 'curriculobr_data';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms'>('home');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.55);
  const [fontSize, setFontSize] = useState(12);
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [highlightedStep, setHighlightedStep] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; action: () => void } | null>(null);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  
  const { data, updateData, undo, redo, canUndo, canRedo, setHistoryDirect } = useResumeHistory(INITIAL_RESUME_DATA);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string |
