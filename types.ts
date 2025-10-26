
export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

export type PastoralInterest = 'sim' | 'talvez' | 'nao' | '';

export interface EvaluationData {
  basicInfo: {
    coupleName: string;
    encounterDate: string;
  };
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
