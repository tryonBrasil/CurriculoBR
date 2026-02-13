
export interface Experience {
  id: string;
  company: string;
  position: string;
  period: string;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  year: string;
}

export interface Language {
  id: string;
  name: string;
  level: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: string;
  languages: Language[];
  certifications: Certification[];
  photoUrl?: string;
}

export type TemplateId = 'teal_sidebar' | 'executive_red' | 'corporate_gray' | 'minimal_red_line' | 'modern_blue' | 'classic_serif' | 'swiss_minimal' | 'executive_navy' | 'modern_vitae';
