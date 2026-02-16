
import { ResumeData } from './types';

export const INITIAL_RESUME_DATA: ResumeData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    jobTitle: '',
    drivingLicense: '', // Inicializa vazio
    photoUrl: 'https://i.pravatar.cc/300?img=32',
  },
  summary: '',
  experiences: [],
  education: [],
  skills: [],
  languages: [],
  courses: [],
  sectionOrder: ['summary', 'experience', 'education', 'skills', 'extras']
};

export const MOCK_RESUME_DATA: ResumeData = {
  personalInfo: {
    fullName: 'CARLA GOMES CUNHA',
    email: 'carla.cunha@email.com.br',
    phone: '(99) 99999-9999',
    location: 'São Paulo, SP',
    website: '',
    linkedin: 'linkedin.com/in/carla-gomes-cunha',
    jobTitle: 'Professora de Português',
    drivingLicense: 'CNH B', // Exemplo
    photoUrl: 'https://i.pravatar.cc/300?img=32',
  },
  summary: 'Professora de Português dinâmica com mais de 3 anos de experiência lecionando no Ensino Fundamental. Aplico a metodologia sócio-interacionista para incentivar a participação ativa dos alunos. Na minha escola atual, fui avaliada pelos familiares com 95% de satisfação.',
  experiences: [
    {
      id: '1',
      company: 'Escola Carvalho Azevedo',
      position: 'Professora de Português',
      location: 'São Paulo, SP',
      startDate: 'Jan 2020',
      endDate: 'Atual',
      current: true,
      description: '• Lecionei Língua Portuguesa para 10 turmas do Ensino Fundamental;\n• Desenvolvi materiais didáticos relacionados à língua oral e escrita;\n• Planejei aulas com base em metodologia sócio-interacionista;\n• Apliquei e corrigi provas, instruindo os alunos individualmente.',
    }
  ],
  education: [
    {
      id: 'e1',
      institution: 'Universidade de São Paulo',
      degree: 'Bacharel e Licenciatura: Letras',
      field: 'Português e Linguística',
      location: 'São Paulo, SP',
      startDate: '2015',
      endDate: '2019',
    }
  ],
  skills: [
    { id: 's1', name: 'Comunicação oral e escrita', level: 'Expert' },
    { id: 's2', name: 'Gestão do tempo', level: 'Advanced' },
    { id: 's3', name: 'Proatividade e dinamismo', level: 'Expert' },
    { id: 's4', name: 'Tecnologias educacionais', level: 'Advanced' },
  ],
  languages: [
    { id: 'l1', name: 'Português', level: 'Nativo', percentage: 100 },
    { id: 'l2', name: 'Inglês', level: 'C1 - Avançado', percentage: 80 },
    { id: 'l3', name: 'Francês', level: 'B2 - Intermediário', percentage: 60 },
  ],
  courses: [
    { id: 'c1', name: 'BNCC e Metodologias Ativas', institution: 'PUC-SP', year: '2023' },
    { id: 'c2', name: 'Ensino em Ambiente Virtual', institution: 'UFRB', year: '2022' },
  ],
  sectionOrder: ['summary', 'experience', 'education', 'skills', 'extras']
};
