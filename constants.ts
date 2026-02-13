
import { ResumeData } from './types';

export const INITIAL_RESUME_DATA: ResumeData = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  experiences: [],
  education: [],
  skills: '',
  languages: [],
  certifications: [],
  photoUrl: ''
};

export const MOCK_RESUME_DATA: ResumeData = {
  fullName: 'CARLA GOMES CUNHA',
  email: 'carla.cunha@email.com.br',
  phone: '(99) 99999-9999',
  location: 'São Paulo, SP',
  summary: 'Professora de Português dinâmica com mais de 3 anos de experiência lecionando no Ensino Fundamental. Aplico a metodologia sócio-interacionista para incentivar a participação ativa dos alunos. Na minha escola atual, fui avaliada pelos familiares com 95% de satisfação.',
  experiences: [
    {
      id: '1',
      company: 'Escola Carvalho Azevedo',
      position: 'Professora de Português',
      period: 'Jan 2020 - Atual',
      description: '• Lecionei Língua Portuguesa para 10 turmas do Ensino Fundamental;\n• Desenvolvi materiais didáticos relacionados à língua oral e escrita;\n• Planejei aulas com base em metodologia sócio-interacionista;\n• Apliquei e corrigi provas, instruindo os alunos individualmente.',
    }
  ],
  education: [
    {
      id: 'e1',
      school: 'Universidade de São Paulo',
      degree: 'Bacharel e Licenciatura: Letras',
      year: '2015 - 2019',
    }
  ],
  skills: 'Comunicação oral e escrita, Gestão do tempo, Proatividade e dinamismo, Tecnologias educacionais',
  languages: [
    { id: 'l1', name: 'Português', level: 'Nativo' },
    { id: 'l2', name: 'Inglês', level: 'Intermediário' },
    { id: 'l3', name: 'Espanhol', level: 'Básico' }
  ],
  certifications: [
    { id: 'c1', name: 'Metodologias Ativas de Aprendizagem', issuer: 'Coursera', year: '2021' },
    { id: 'c2', name: 'Gestão de Sala de Aula', issuer: 'FGV', year: '2020' }
  ],
  photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
};
