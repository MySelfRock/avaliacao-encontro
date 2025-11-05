
export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

export type PastoralInterest = 'sim' | 'talvez' | 'nao' | '';

export type EncontroStatus = 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';

export interface Encontro {
  id?: number;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  tema: string;
  codigo_acesso: string; // Código único para o link público
  status: EncontroStatus;
  max_participantes?: number;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EncontroWithStats extends Encontro {
  total_avaliacoes: number;
  media_geral: number;
}

export interface EvaluationData {
  basicInfo: {
    coupleName: string;
    encounterDate: string;
  };
  encontroId?: number; // Vinculo com o encontro
  preEncontro: {
    communicationClarity: Rating;
    registrationEase: Rating;
    comments: string;
  };
  duranteEncontro: {
    palestras: {
      relevance: Rating;
      clarity: Rating;
      duration: Rating;
      comments: string;
    };
    ambientes: {
      comfort: Rating;
      cleanliness: Rating;
      decoration: Rating;
      comments: string;
    };
    refeicoes: {
      quality: Rating;
      organization: Rating;
      comments: string;
    };
    musicas: {
      suitability: Rating;
      quality: Rating;
      comments: string;
    };
    equipe: {
      availability: Rating;
      organization: Rating;
      comments: string;
    };
  };
  posEncontro: {
    geral: {
      expectations: Rating;
      overallRating: Rating;
      recommendation: Rating;
      comments: string;
    };
    pastoral: {
      interest: PastoralInterest;
      contactInfo: string;
    };
    finalMessage: string;
  };
}
