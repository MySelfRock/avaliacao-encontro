import React, { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import type { EvaluationData, Rating, PastoralInterest, Encontro } from "../types";
import { StarRating } from "../components/StarRating";
import { SectionCard } from "../components/SectionCard";
import { QuestionGroup } from "../components/QuestionGroup";
import { QuestionRow } from "../components/QuestionRow";
import { API_ENDPOINTS } from "../config/api";

const initialFormData: EvaluationData = {
  basicInfo: { coupleName: "", encounterDate: "" },
  encontroId: undefined,
  preEncontro: { communicationClarity: 0, registrationEase: 0, comments: "" },
  duranteEncontro: {
    palestras: { relevance: 0, clarity: 0, duration: 0, comments: "" },
    ambientes: { comfort: 0, cleanliness: 0, decoration: 0, comments: "" },
    refeicoes: { quality: 0, organization: 0, comments: "" },
    musicas: { suitability: 0, quality: 0, comments: "" },
    equipe: { availability: 0, organization: 0, comments: "" },
  },
  posEncontro: {
    geral: {
      expectations: 0,
      overallRating: 0,
      recommendation: 0,
      comments: "",
    },
    pastoral: { interest: "", contactInfo: "" },
    finalMessage: "",
  },
};

export function AvaliacaoForm() {
  const { codigo } = useParams<{ codigo?: string }>();
  const [formData, setFormData] = useState<EvaluationData>(initialFormData);
  const [encontro, setEncontro] = useState<Encontro | null>(null);
  const [isLoadingEncontro, setIsLoadingEncontro] = useState(!!codigo);
  const [encontroError, setEncontroError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (codigo) {
      fetchEncontro(codigo);
    }
  }, [codigo]);

  const fetchEncontro = async (codigoAcesso: string) => {
    try {
      setIsLoadingEncontro(true);
      const response = await fetch(`${API_ENDPOINTS.encontros}/codigo/${codigoAcesso}`);

      if (!response.ok) {
        throw new Error('Encontro não encontrado');
      }

      const result = await response.json();
      setEncontro(result.data);
      setFormData((prev) => ({
        ...prev,
        encontroId: result.data.id,
        basicInfo: {
          ...prev.basicInfo,
          encounterDate: result.data.data_inicio
        }
      }));
      setEncontroError(null);
    } catch (err) {
      setEncontroError(err instanceof Error ? err.message : 'Erro ao buscar encontro');
      console.error('Erro ao buscar encontro:', err);
    } finally {
      setIsLoadingEncontro(false);
    }
  };

  // Handler para avaliações simples (preEncontro)
  const handleSimpleRatingChange = useCallback(
    (field: "communicationClarity" | "registrationEase", value: Rating) => {
      console.log(`⭐ Avaliação preEncontro - ${field}: ${value} estrelas`);
      setFormData((prev) => ({
        ...prev,
        preEncontro: {
          ...prev.preEncontro,
          [field]: value,
        },
      }));
    },
    []
  );

  // Handler para comentários simples (preEncontro)
  const handleSimpleCommentChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      preEncontro: {
        ...prev.preEncontro,
        comments: value,
      },
    }));
  }, []);

  // Handler para avaliações aninhadas (duranteEncontro e posEncontro)
  const handleNestedRatingChange = useCallback(
    <
      S extends "duranteEncontro" | "posEncontro",
      T extends keyof EvaluationData[S],
      F extends keyof EvaluationData[S][T]
    >(
      section: S,
      topic: T,
      field: F,
      value: Rating
    ) => {
      console.log(
        `⭐ Avaliação ${section}.${String(topic)}.${String(
          field
        )}: ${value} estrelas`
      );
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [topic]: {
            ...(prev[section][topic] as object),
            [field]: value,
          },
        },
      }));
    },
    []
  );

  // Handler para comentários aninhados (duranteEncontro e posEncontro)
  const handleNestedCommentChange = useCallback(
    <
      S extends "duranteEncontro" | "posEncontro",
      T extends keyof EvaluationData[S],
      F extends keyof EvaluationData[S][T]
    >(
      section: S,
      topic: T,
      field: F,
      value: string
    ) => {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [topic]: {
            ...(prev[section][topic] as object),
            [field]: value,
          },
        },
      }));
    },
    []
  );

  const handlePastoralInterestChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value as PastoralInterest;
    setFormData((prev) => ({
      ...prev,
      posEncontro: {
        ...prev.posEncontro,
        pastoral: {
          ...prev.posEncontro.pastoral,
          interest: value,
          contactInfo:
            value === "nao" || value === ""
              ? ""
              : prev.posEncontro.pastoral.contactInfo,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("📤 Enviando avaliação para o servidor...");
      console.log("Dados:", JSON.stringify(formData, null, 2));

      const response = await fetch(API_ENDPOINTS.avaliacoes, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar avaliação: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ Avaliação salva com sucesso!", result);

      setIsSubmitted(true);
    } catch (error) {
      console.error("❌ Erro ao enviar avaliação:", error);
      alert(
        "Ocorreu um erro ao enviar sua avaliação. Por favor, verifique se o servidor está rodando e tente novamente.\n\n" +
          "Erro: " +
          (error instanceof Error ? error.message : "Erro desconhecido")
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingEncontro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-4">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-lg">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pastoral-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando informações do encontro...</p>
        </div>
      </div>
    );
  }

  if (encontroError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-4">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-lg border-t-4 border-red-500">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-700 mb-4">
            Encontro não encontrado
          </h1>
          <p className="text-gray-600">
            O código do encontro informado não foi encontrado ou está inválido.
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-4">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-lg border-t-4 border-pastoral-blue-500 animate-fadeIn">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-pastoral-blue-700 mb-4">
            Obrigado por sua avaliação!
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Sua contribuição é muito valiosa para nós e nos ajudará a melhorar
            os futuros encontros. Desejamos a vocês uma jornada abençoada!
          </p>
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-paroquia-gold-600 font-semibold">
              Paróquia São Benedito do Alto da Ponte - Diocese de São José dos
              Campos
            </p>
            <p className="text-xs text-gray-500 mt-1">Pastoral Familiar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 text-gray-800 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10 animate-fadeIn">
          <div className="inline-block bg-gradient-to-r from-pastoral-blue-500 to-pastoral-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-4 shadow-md">
            Pastoral Familiar
          </div>

          {encontro && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-pastoral-blue-600">
              <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-2">
                {encontro.nome}
              </h2>
              {encontro.descricao && (
                <p className="text-gray-600 mb-2">{encontro.descricao}</p>
              )}
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                {encontro.local && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {encontro.local}
                  </span>
                )}
                {encontro.tema && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    {encontro.tema}
                  </span>
                )}
              </div>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-pastoral-blue-700 to-pastoral-blue-500 bg-clip-text text-transparent mb-4">
            Avaliação do Encontro de Noivos
          </h1>
          <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Seu feedback é essencial para o crescimento da nossa pastoral.
            Agradecemos por dedicarem um tempo para nos ajudar!
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-paroquia-dark-400">
            <svg
              className="w-5 h-5 text-paroquia-gold-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              Paróquia São Benedito - Alto da Ponte
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          {/* Seção 1: Informações Básicas */}
          <SectionCard title="Seção 1: Informações Básicas (Opcional)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="coupleName"
                  className="block text-md font-medium text-pastoral-blue-700 mb-2"
                >
                  Nome do Casal (Opcional)
                </label>
                <input
                  type="text"
                  id="coupleName"
                  value={formData.basicInfo.coupleName}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      basicInfo: { ...p.basicInfo, coupleName: e.target.value },
                    }))
                  }
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all hover:border-pastoral-blue-300"
                  placeholder="Ex: João e Maria"
                />
              </div>
              <div>
                <label
                  htmlFor="encounterDate"
                  className="block text-md font-medium text-pastoral-blue-700 mb-2"
                >
                  Data do Encontro que participaram
                </label>
                <input
                  type="date"
                  id="encounterDate"
                  value={formData.basicInfo.encounterDate}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      basicInfo: {
                        ...p.basicInfo,
                        encounterDate: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all hover:border-pastoral-blue-300"
                />
              </div>
            </div>
          </SectionCard>

          {/* Seção 2: Pré-Encontro */}
          <SectionCard title="Seção 2: O Pré-Encontro">
            <QuestionGroup
              title="Comunicação e Inscrição"
              commentPrompt="Deixe aqui seus comentários, críticas ou sugestões sobre a comunicação e o processo de inscrição."
              commentValue={formData.preEncontro.comments}
              onCommentChange={(e) => handleSimpleCommentChange(e.target.value)}
            >
              <QuestionRow label="Clareza das informações recebidas antes do encontro">
                <StarRating
                  rating={formData.preEncontro.communicationClarity}
                  onRatingChange={(v) =>
                    handleSimpleRatingChange("communicationClarity", v)
                  }
                />
              </QuestionRow>
              <QuestionRow label="Facilidade do processo de inscrição">
                <StarRating
                  rating={formData.preEncontro.registrationEase}
                  onRatingChange={(v) =>
                    handleSimpleRatingChange("registrationEase", v)
                  }
                />
              </QuestionRow>
            </QuestionGroup>
          </SectionCard>

          {/* Seção 3: Durante o Encontro */}
          <SectionCard title="Seção 3: Durante o Encontro">
            <QuestionGroup
              title="Palestras e Temas"
              commentPrompt="Quais palestras mais tocaram vocês? Algum tema faltou? Comente sobre os palestrantes."
              commentValue={formData.duranteEncontro.palestras.comments}
              onCommentChange={(e) =>
                handleNestedCommentChange(
                  "duranteEncontro",
                  "palestras",
                  "comments",
                  e.target.value
                )
              }
            >
              <QuestionRow label="Relevância dos temas abordados para a vida do casal">
                <StarRating
                  rating={formData.duranteEncontro.palestras.relevance}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "palestras",
                      "relevance",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Clareza, didática e preparação dos palestrantes">
                <StarRating
                  rating={formData.duranteEncontro.palestras.clarity}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "palestras",
                      "clarity",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Tempo de duração das palestras (foi adequado?)">
                <StarRating
                  rating={formData.duranteEncontro.palestras.duration}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "palestras",
                      "duration",
                      v
                    )
                  }
                />
              </QuestionRow>
            </QuestionGroup>

            <QuestionGroup
              title="Ambientes e Estrutura"
              commentPrompt="Comentários sobre a estrutura física, limpeza e organização do local."
              commentValue={formData.duranteEncontro.ambientes.comments}
              onCommentChange={(e) =>
                handleNestedCommentChange(
                  "duranteEncontro",
                  "ambientes",
                  "comments",
                  e.target.value
                )
              }
            >
              <QuestionRow label="Conforto e organização do salão principal (palestras)">
                <StarRating
                  rating={formData.duranteEncontro.ambientes.comfort}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "ambientes",
                      "comfort",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Limpeza e adequação dos banheiros e áreas comuns">
                <StarRating
                  rating={formData.duranteEncontro.ambientes.cleanliness}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "ambientes",
                      "cleanliness",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Decoração e acolhimento visual do ambiente">
                <StarRating
                  rating={formData.duranteEncontro.ambientes.decoration}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "ambientes",
                      "decoration",
                      v
                    )
                  }
                />
              </QuestionRow>
            </QuestionGroup>

            <QuestionGroup
              title="Refeições (Café, Almoço, Lanches)"
              commentPrompt="Sugestões ou elogios para a equipe de cozinha e alimentação."
              commentValue={formData.duranteEncontro.refeicoes.comments}
              onCommentChange={(e) =>
                handleNestedCommentChange(
                  "duranteEncontro",
                  "refeicoes",
                  "comments",
                  e.target.value
                )
              }
            >
              <QuestionRow label="Qualidade, sabor e variedade das refeições servidas">
                <StarRating
                  rating={formData.duranteEncontro.refeicoes.quality}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "refeicoes",
                      "quality",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Organização dos horários e do local das refeições">
                <StarRating
                  rating={formData.duranteEncontro.refeicoes.organization}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "refeicoes",
                      "organization",
                      v
                    )
                  }
                />
              </QuestionRow>
            </QuestionGroup>

            <QuestionGroup
              title="Músicas e Animação"
              commentPrompt="Comentários sobre a equipe de música e as canções escolhidas."
              commentValue={formData.duranteEncontro.musicas.comments}
              onCommentChange={(e) =>
                handleNestedCommentChange(
                  "duranteEncontro",
                  "musicas",
                  "comments",
                  e.target.value
                )
              }
            >
              <QuestionRow label="Adequação das músicas para os momentos">
                <StarRating
                  rating={formData.duranteEncontro.musicas.suitability}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "musicas",
                      "suitability",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Qualidade técnica da equipe de música">
                <StarRating
                  rating={formData.duranteEncontro.musicas.quality}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "musicas",
                      "quality",
                      v
                    )
                  }
                />
              </QuestionRow>
            </QuestionGroup>

            <QuestionGroup
              title="Equipe de Trabalho (Pastoral Familiar)"
              commentPrompt="Como foi sua interação com a equipe que trabalhou no encontro?"
              commentValue={formData.duranteEncontro.equipe.comments}
              onCommentChange={(e) =>
                handleNestedCommentChange(
                  "duranteEncontro",
                  "equipe",
                  "comments",
                  e.target.value
                )
              }
            >
              <QuestionRow label="Disponibilidade, simpatia e acolhimento da equipe">
                <StarRating
                  rating={formData.duranteEncontro.equipe.availability}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "equipe",
                      "availability",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Organização e pontualidade da equipe na condução">
                <StarRating
                  rating={formData.duranteEncontro.equipe.organization}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "duranteEncontro",
                      "equipe",
                      "organization",
                      v
                    )
                  }
                />
              </QuestionRow>
            </QuestionGroup>
          </SectionCard>

          {/* Seção 4: Pós-Encontro */}
          <SectionCard title="Seção 4: Pós-Encontro e Visão Futura">
            <QuestionGroup
              title="Avaliação Geral"
              commentPrompt="Qual foi o momento mais marcante do encontro para vocês?"
              commentValue={formData.posEncontro.geral.comments}
              onCommentChange={(e) =>
                handleNestedCommentChange(
                  "posEncontro",
                  "geral",
                  "comments",
                  e.target.value
                )
              }
            >
              <QuestionRow label="O encontro atendeu às suas expectativas como casal?">
                <StarRating
                  rating={formData.posEncontro.geral.expectations}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "posEncontro",
                      "geral",
                      "expectations",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Qual sua nota geral para o Encontro de Noivos?">
                <StarRating
                  rating={formData.posEncontro.geral.overallRating}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "posEncontro",
                      "geral",
                      "overallRating",
                      v
                    )
                  }
                />
              </QuestionRow>
              <QuestionRow label="Vocês recomendariam este encontro para outros casais?">
                <StarRating
                  rating={formData.posEncontro.geral.recommendation}
                  onRatingChange={(v) =>
                    handleNestedRatingChange(
                      "posEncontro",
                      "geral",
                      "recommendation",
                      v
                    )
                  }
                />
              </QuestionRow>
            </QuestionGroup>

            <div className="mb-2 p-6 bg-gradient-to-br from-pastoral-blue-50 to-blue-50 rounded-xl border-2 border-pastoral-blue-200 shadow-sm">
              <h3 className="text-xl font-semibold text-pastoral-blue-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-pastoral-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Participação na Pastoral Familiar
              </h3>
              <p className="block text-md font-medium text-gray-700 mb-4">
                Pensando no futuro, vocês teriam interesse em conhecer mais
                sobre a Pastoral Familiar e, talvez, participar da equipe
                conosco?
              </p>
              <div className="space-y-3 mb-4">
                <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/50 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="pastoral"
                    value="sim"
                    checked={formData.posEncontro.pastoral.interest === "sim"}
                    onChange={handlePastoralInterestChange}
                    className="h-4 w-4 text-pastoral-blue-600 border-gray-300 focus:ring-pastoral-blue-500"
                  />
                  <span className="font-medium">Sim, temos interesse!</span>
                </label>
                <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/50 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="pastoral"
                    value="talvez"
                    checked={
                      formData.posEncontro.pastoral.interest === "talvez"
                    }
                    onChange={handlePastoralInterestChange}
                    className="h-4 w-4 text-pastoral-blue-600 border-gray-300 focus:ring-pastoral-blue-500"
                  />
                  <span className="font-medium">
                    Talvez, gostaríamos de mais informações.
                  </span>
                </label>
                <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/50 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="pastoral"
                    value="nao"
                    checked={formData.posEncontro.pastoral.interest === "nao"}
                    onChange={handlePastoralInterestChange}
                    className="h-4 w-4 text-pastoral-blue-600 border-gray-300 focus:ring-pastoral-blue-500"
                  />
                  <span className="font-medium">
                    Não, no momento não temos interesse.
                  </span>
                </label>
              </div>
              {(formData.posEncontro.pastoral.interest === "sim" ||
                formData.posEncontro.pastoral.interest === "talvez") && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-pastoral-blue-200">
                  <label
                    htmlFor="contactInfo"
                    className="block text-md font-medium text-pastoral-blue-700 mb-2"
                  >
                    Se marcou "Sim" ou "Talvez", por favor, deixe seu nome e a
                    melhor forma de contato (WhatsApp ou E-mail) para
                    conversarmos no futuro, sem compromisso.
                  </label>
                  <textarea
                    id="contactInfo"
                    value={formData.posEncontro.pastoral.contactInfo}
                    onChange={(e) =>
                      handleNestedCommentChange(
                        "posEncontro",
                        "pastoral",
                        "contactInfo",
                        e.target.value
                      )
                    }
                    rows={3}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all hover:border-pastoral-blue-300"
                    placeholder="Seu nome e contato..."
                  />
                </div>
              )}
            </div>

            <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl">
              <label
                htmlFor="finalMessage"
                className="block text-xl font-semibold text-pastoral-blue-800 mb-4 flex items-center gap-2"
              >
                <svg
                  className="w-6 h-6 text-paroquia-gold-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                Mensagem Final
              </label>
              <p className="block text-md font-medium text-gray-700 mb-3">
                Deixe aqui qualquer outra sugestão, crítica construtiva ou
                agradecimento que não foi coberto nos tópicos anteriores.
              </p>
              <textarea
                id="finalMessage"
                value={formData.posEncontro.finalMessage}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    posEncontro: {
                      ...p.posEncontro,
                      finalMessage: e.target.value,
                    },
                  }))
                }
                rows={4}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all hover:border-pastoral-blue-300"
                placeholder="Sua mensagem final..."
              />
            </div>
          </SectionCard>

          <div className="mt-10 text-center">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto bg-gradient-to-r from-pastoral-blue-600 to-pastoral-blue-700 text-white font-bold py-4 px-12 rounded-xl hover:from-pastoral-blue-700 hover:to-pastoral-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 flex items-center justify-center mx-auto"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Enviar Avaliação
                </>
              )}
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Suas respostas são confidenciais e nos ajudam a melhorar
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente exportado como AvaliacaoForm
