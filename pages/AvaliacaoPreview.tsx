import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_ENDPOINTS } from '../config/api';

interface AvaliacaoData {
  id: number;
  couple_name: string;
  encounter_date: string;
  created_at: string;
  pre_encontro: {
    communication_clarity: number;
    registration_ease: number;
    comments: string;
  };
  palestras: {
    relevance: number;
    clarity: number;
    duration: number;
    comments: string;
  };
  ambientes: {
    comfort: number;
    cleanliness: number;
    decoration: number;
    comments: string;
  };
  refeicoes: {
    quality: number;
    organization: number;
    comments: string;
  };
  musicas: {
    suitability: number;
    quality: number;
    comments: string;
  };
  equipe: {
    availability: number;
    organization: number;
    comments: string;
  };
  avaliacao_geral: {
    expectations: number;
    overall_rating: number;
    recommendation: number;
    comments: string;
  };
  pastoral: {
    interest: string;
    contact_info: string;
  };
  mensagem_final: {
    message: string;
  };
}

export function AvaliacaoPreview() {
  const { id } = useParams<{ id: string }>();
  const [avaliacao, setAvaliacao] = useState<AvaliacaoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAvaliacao();
    }
  }, [id]);

  const fetchAvaliacao = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.avaliacoes}/${id}`);
      const result = await response.json();
      if (result.success) {
        setAvaliacao(result.data);
      }
    } catch (err) {
      console.error('Erro ao buscar avaliação:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = () => {
    if (!avaliacao) return;

    setIsGenerating(true);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(0, 86, 163);
    doc.text('Avaliação do Encontro de Santificação', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}`, pageWidth / 2, 30, { align: 'center' });

    if (avaliacao.couple_name) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Casal: ${avaliacao.couple_name}`, 20, 45);
    }

    let yPos = 55;

    const sectionData = [
      { title: 'Pré-Encontro', items: [
        { label: 'Clareza das informações', value: avaliacao.pre_encontro?.communication_clarity },
        { label: 'Facilidade da inscrição', value: avaliacao.pre_encontro?.registration_ease },
      ]},
      { title: 'Palestras', items: [
        { label: 'Relevância', value: avaliacao.palestras?.relevance },
        { label: 'Clareza didática', value: avaliacao.palestras?.clarity },
        { label: 'Duração', value: avaliacao.palestras?.duration },
      ]},
      { title: 'Ambientes', items: [
        { label: 'Conforto', value: avaliacao.ambientes?.comfort },
        { label: 'Limpeza', value: avaliacao.ambientes?.cleanliness },
        { label: 'Decoração', value: avaliacao.ambientes?.decoration },
      ]},
      { title: 'Refeições', items: [
        { label: 'Qualidade', value: avaliacao.refeicoes?.quality },
        { label: 'Organização', value: avaliacao.refeicoes?.organization },
      ]},
      { title: 'Músicas', items: [
        { label: 'Adequação', value: avaliacao.musicas?.suitability },
        { label: 'Qualidade', value: avaliacao.musicas?.quality },
      ]},
      { title: 'Equipe', items: [
        { label: 'Disponibilidade', value: avaliacao.equipe?.availability },
        { label: 'Organização', value: avaliacao.equipe?.organization },
      ]},
    ];

    sectionData.forEach(section => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 86, 163);
      doc.text(section.title, 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(80);
      section.items.forEach(item => {
        if (item.value) {
          const stars = '★'.repeat(item.value) + '☆'.repeat(5 - item.value);
          doc.text(`${item.label}: ${stars}`, 25, yPos);
          yPos += 6;
        }
      });
      yPos += 5;
    });

    if (avaliacao.avaliacao_geral) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 86, 163);
      doc.text('Avaliação Geral', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Nota Geral: ${avaliacao.avaliacao_geral.overall_rating}/5`, 25, yPos);
      yPos += 6;
      doc.text(`Recomendação: ${avaliacao.avaliacao_geral.recommendation}/5`, 25, yPos);
      yPos += 6;
      doc.text(`Expectativas: ${avaliacao.avaliacao_geral.expectations}/5`, 25, yPos);
      yPos += 10;

      if (avaliacao.avaliacao_geral.comments) {
        doc.setTextColor(0);
        const comments = doc.splitTextToSize(`Comentário: ${avaliacao.avaliacao_geral.comments}`, pageWidth - 40);
        doc.text(comments, 20, yPos);
        yPos += comments.length * 5 + 10;
      }
    }

    if (avaliacao.pastoral) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 86, 163);
      doc.text('Participação na Pastoral', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      const interestText = avaliacao.pastoral.interest === 'sim' ? 'Sim, temos interesse!' :
                          avaliacao.pastoral.interest === 'talvez' ? 'Talvez, gostaríamos de mais informações' :
                          'Não';
      doc.text(interestText, 25, yPos);
      yPos += 6;

      if (avaliacao.pastoral.contact_info) {
        doc.text(`Contato: ${avaliacao.pastoral.contact_info}`, 25, yPos);
      }
    }

    if (avaliacao.mensagem_final?.message) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 86, 163);
      doc.text('Mensagem Final', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      const msg = doc.splitTextToSize(avaliacao.mensagem_final.message, pageWidth - 40);
      doc.text(msg, 20, yPos);
    }

    const filename = `avaliacao-${avaliacao.id || 'export'}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    setIsGenerating(false);
  };

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return <span className="text-gray-400">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pastoral-blue-600"></div>
      </div>
    );
  }

  if (!avaliacao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Avaliação não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => window.history.back()}
              className="text-pastoral-blue-600 hover:text-pastoral-blue-800 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Gerando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Baixar PDF
              </>
            )}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Avaliação #{avaliacao.id}
          </h1>
          {avaliacao.couple_name && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Casal: {avaliacao.couple_name}
            </p>
          )}

          <div className="space-y-6">
            {[
              { title: 'Pré-Encontro', data: avaliacao.pre_encontro, fields: ['communication_clarity', 'registration_ease'] },
              { title: 'Palestras', data: avaliacao.palestras, fields: ['relevance', 'clarity', 'duration'] },
              { title: 'Ambientes', data: avaliacao.ambientes, fields: ['comfort', 'cleanliness', 'decoration'] },
              { title: 'Refeições', data: avaliacao.refeicoes, fields: ['quality', 'organization'] },
              { title: 'Músicas', data: avaliacao.musicas, fields: ['suitability', 'quality'] },
              { title: 'Equipe', data: avaliacao.equipe, fields: ['availability', 'organization'] },
            ].map(section => (
              <div key={section.title} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {section.title}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {section.fields.map(field => (
                    <div key={field}>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {field.replace('_', ' ')}
                      </p>
                      {renderStars(section.data?.[field as keyof typeof section.data])}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {avaliacao.avaliacao_geral && (
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Avaliação Geral
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nota Geral</p>
                    {renderStars(avaliacao.avaliacao_geral.overall_rating)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Recomendação</p>
                    {renderStars(avaliacao.avaliacao_geral.recommendation)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Expectativas</p>
                    {renderStars(avaliacao.avaliacao_geral.expectations)}
                  </div>
                </div>
                {avaliacao.avaliacao_geral.comments && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{avaliacao.avaliacao_geral.comments}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}