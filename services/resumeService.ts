import { supabase } from './authService';
import { ResumeData, TemplateId } from '../types';

export interface SavedResume {
  id: string;
  title: string;
  template: TemplateId;
  fontSize: number;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

export const resumeService = {
  saveResume: async (userId: string, title: string, data: ResumeData, template: TemplateId, fontSize: number) => {
    const { data: existing } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', userId)
      .eq('title', title)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('resumes')
        .update({
          data,
          template,
          font_size: fontSize,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
      return existing.id;
    } else {
      const { data: newResume, error } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          title,
          data,
          template,
          font_size: fontSize,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return newResume.id;
    }
  },

  listResumes: async (userId: string) => {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, title, template, font_size, created_at, updated_at, is_default')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      id: r.id,
      title: r.title,
      template: r.template as TemplateId,
      fontSize: r.font_size,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isDefault: r.is_default,
    }));
  },

  getResume: async (resumeId: string) => {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, title, data, template, font_size')
      .eq('id', resumeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Currículo não encontrado');
    return {
      id: data.id,
      title: data.title,
      data: data.data as ResumeData,
      template: data.template as TemplateId,
      fontSize: data.font_size,
    };
  },

  deleteResume: async (resumeId: string) => {
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', resumeId);
    if (error) throw new Error(error.message);
  },

  renameResume: async (resumeId: string, newTitle: string) => {
    const { error } = await supabase
      .from('resumes')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', resumeId);
    if (error) throw new Error(error.message);
  },

  createPublicShare: async (userId: string, resumeId: string) => {
    const { data, error } = await supabase
      .from('public_shares')
      .insert({ user_id: userId, resume_id: resumeId })
      .select('share_token')
      .single();
    if (error) throw new Error(error.message);
    return data.share_token;
  },

  getPublicResume: async (shareToken: string) => {
    const { data: share, error: shareError } = await supabase
      .from('public_shares')
      .select('resume_id, expires_at')
      .eq('share_token', shareToken)
      .maybeSingle();

    if (shareError) throw new Error(shareError.message);
    if (!share) throw new Error('Link compartilhado não encontrado');

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new Error('Link expirado');
    }

    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('id, title, data, template, font_size')
      .eq('id', share.resume_id)
      .maybeSingle();

    if (resumeError) throw new Error(resumeError.message);
    if (!resume) throw new Error('Currículo não encontrado');

    return {
      id: resume.id,
      title: resume.title,
      data: resume.data as ResumeData,
      template: resume.template as TemplateId,
      fontSize: resume.font_size,
    };
  },

  deletePublicShare: async (shareToken: string) => {
    const { error } = await supabase
      .from('public_shares')
      .delete()
      .eq('share_token', shareToken);
    if (error) throw new Error(error.message);
  },
};
