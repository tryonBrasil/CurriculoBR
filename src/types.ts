
export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface Language {
  id: string;
  name: string;
  level: string;
  percentage: number;
}

export interface Course {
  id: string;
  name: string;
  institution: string;
  year: string;
}

export type SectionId = 'summary' | 'experience' | 'education' | 'skills' | 'extras';

export interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    jobTitle: string;
    drivingLicense: string; // Novo campo
    photoUrl?: string;
  };
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  courses: Course[];
  sectionOrder: SectionId[];
}

export type TemplateId = 'teal_sidebar' | 'executive_red' | 'corporate_gray' | 'minimal_red_line' | 'modern_blue' | 'classic_serif' | 'swiss_minimal' | 'executive_navy' | 'modern_vitae';

