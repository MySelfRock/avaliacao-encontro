import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeGenerator } from '../components/QRCodeGenerator';

interface Estatisticas {
  totalAvaliacoes: number;
  mediaPreEncontro: {
    avg_communication: number;
    avg_registration: number;
  };
  mediaPalestras: {
    avg_relevance: number;
    avg_clarity: number;
    avg_duration: number;
  };
  mediaAmbientes: {
    avg_comfort: number;
    avg_cleanliness: number;
    avg_decoration: number;
  };
  mediaRefeicoes: {
    avg_quality: number;
    avg_organization: number;
  };
  mediaMusicas: {
    avg_suitability: number;
    avg_quality: number;
  };
  mediaEquipe: {
    avg_availability: number;
    avg_organization: number;
  };
  mediaAvaliacaoGeral: {
    avg_expectations: number;
    avg_overall: number;
    avg_recommendation: number;
  };
  interestePastoral: Array<{
    interest: string;
    count: number;
  }>;
}

export function Estatisticas() {
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEstatisticas();
  }, []);

  const fetchEstatisticas = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.estatisticas);

      if (!response.ok) {
        throw new Error('Erro ao buscar estatísticas');
      }

      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRating = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0.0';
    return value.toFixed(1);
  };

  const getRatingColor = (value: number): string => {
    if (value >= 4.5) return 'text-green-600 bg-green-50';
    if (value >= 3.5) return 'text-blue-600 bg-blue-50';
    if (value >= 2.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const exportToPDF = async () => {
    if (!stats) return;

    try {
      console.log('Iniciando geração do PDF...');

      // Buscar avaliações detalhadas
      console.log('Buscando avaliações detalhadas...');
      const response = await fetch(`${API_ENDPOINTS.avaliacoes}/detalhadas`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta da API:', errorText);
        throw new Error('Erro ao buscar avaliações detalhadas');
      }
      const result = await response.json();
      const avaliacoes = result.data;
      console.log(`${avaliacoes.length} avaliações carregadas`);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Título
      doc.setFontSize(20);
      doc.setTextColor(41, 98, 255);
      doc.text('Relatório Completo de Avaliações', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Encontros de Santificação - Paróquia São Benedito', pageWidth / 2, 28, { align: 'center' });

      // Total de Avaliações
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total de Avaliações: ${stats.totalAvaliacoes}`, 14, 45);

      // Seção de Estatísticas Resumidas
      let yPos = 55;
      doc.setFontSize(16);
      doc.setTextColor(41, 98, 255);
      doc.text('RESUMO ESTATÍSTICO', 14, yPos);

      // Pré-Encontro
      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(41, 98, 255);
      doc.text('Pré-Encontro', 14, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        head: [['Critério', 'Média']],
        body: [
          ['Clareza da Comunicação', `${formatRating(stats.mediaPreEncontro.avg_communication)} ⭐`],
          ['Facilidade de Inscrição', `${formatRating(stats.mediaPreEncontro.avg_registration)} ⭐`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 98, 255], fontSize: 10 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Palestras
      yPos = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setTextColor(212, 175, 55);
      doc.text('Palestras', 14, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        head: [['Critério', 'Média']],
        body: [
          ['Relevância', `${formatRating(stats.mediaPalestras.avg_relevance)} ⭐`],
          ['Clareza', `${formatRating(stats.mediaPalestras.avg_clarity)} ⭐`],
          ['Duração', `${formatRating(stats.mediaPalestras.avg_duration)} ⭐`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [212, 175, 55], fontSize: 10 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Ambientes
      yPos = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      doc.text('Ambientes', 14, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        head: [['Critério', 'Média']],
        body: [
          ['Conforto', `${formatRating(stats.mediaAmbientes.avg_comfort)} ⭐`],
          ['Limpeza', `${formatRating(stats.mediaAmbientes.avg_cleanliness)} ⭐`],
          ['Decoração', `${formatRating(stats.mediaAmbientes.avg_decoration)} ⭐`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontSize: 10 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Refeições
      yPos = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setTextColor(255, 140, 0);
      doc.text('Refeições', 14, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        head: [['Critério', 'Média']],
        body: [
          ['Qualidade', `${formatRating(stats.mediaRefeicoes.avg_quality)} ⭐`],
          ['Organização', `${formatRating(stats.mediaRefeicoes.avg_organization)} ⭐`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [255, 140, 0], fontSize: 10 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Músicas
      yPos = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setTextColor(147, 51, 234);
      doc.text('Músicas', 14, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        head: [['Critério', 'Média']],
        body: [
          ['Adequação', `${formatRating(stats.mediaMusicas.avg_suitability)} ⭐`],
          ['Qualidade', `${formatRating(stats.mediaMusicas.avg_quality)} ⭐`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234], fontSize: 10 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Equipe
      yPos = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text('Equipe', 14, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        head: [['Critério', 'Média']],
        body: [
          ['Disponibilidade', `${formatRating(stats.mediaEquipe.avg_availability)} ⭐`],
          ['Organização', `${formatRating(stats.mediaEquipe.avg_organization)} ⭐`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], fontSize: 10 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Avaliação Geral
      yPos = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text('Avaliação Geral', 14, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        head: [['Critério', 'Média']],
        body: [
          ['Expectativas', `${formatRating(stats.mediaAvaliacaoGeral.avg_expectations)} ⭐`],
          ['Nota Geral', `${formatRating(stats.mediaAvaliacaoGeral.avg_overall)} ⭐`],
          ['Recomendação', `${formatRating(stats.mediaAvaliacaoGeral.avg_recommendation)} ⭐`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Interesse na Pastoral
      yPos = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setTextColor(41, 98, 255);
      doc.text('Interesse na Pastoral Familiar', 14, yPos);

      const interestMap: Record<string, string> = {
        'sim': 'Sim, temos interesse!',
        'talvez': 'Talvez',
        'nao': 'Não',
        '': 'Não respondeu'
      };

      autoTable(doc, {
        startY: yPos + 3,
        head: [['Resposta', 'Quantidade', 'Percentual']],
        body: stats.interestePastoral.map((item) => [
          interestMap[item.interest] || item.interest,
          item.count.toString(),
          `${((item.count / stats.totalAvaliacoes) * 100).toFixed(1)}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 98, 255], fontSize: 10 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Nova página para Avaliações Detalhadas
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(41, 98, 255);
      doc.text('AVALIAÇÕES DETALHADAS', 14, 20);

      // Iterar por cada avaliação
      console.log('Gerando páginas detalhadas...');
      avaliacoes.forEach((av: any, index: number) => {
        try {
          console.log(`Processando avaliação ${index + 1}/${avaliacoes.length}`);

          if (index > 0) {
            doc.addPage();
          }

          let y = 30;

          // Cabeçalho da Avaliação
          doc.setFontSize(14);
          doc.setTextColor(41, 98, 255);
          doc.text(`Avaliação #${av.avaliacao?.id || index + 1}`, 14, y);

          y += 7;
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(`Casal: ${av.avaliacao?.couple_name || 'Anônimo'}`, 14, y);

          y += 5;
          if (av.avaliacao?.encounter_date) {
            try {
              doc.text(`Data do Encontro: ${new Date(av.avaliacao.encounter_date).toLocaleDateString('pt-BR')}`, 14, y);
              y += 5;
            } catch (e) {
              console.warn('Erro ao formatar data:', e);
            }
          }

        // Pré-Encontro
        y += 5;
        doc.setFontSize(11);
        doc.setTextColor(41, 98, 255);
        doc.text('PRÉ-ENCONTRO', 14, y);

        autoTable(doc, {
          startY: y + 2,
          head: [['Pergunta', 'Nota']],
          body: [
            ['Clareza da Comunicação', `${av.preEncontro?.communication_clarity || 0} ⭐`],
            ['Facilidade de Inscrição', `${av.preEncontro?.registration_ease || 0} ⭐`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [41, 98, 255], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        if (av.preEncontro?.comments) {
          y = (doc as any).lastAutoTable.finalY + 3;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Comentários:', 14, y);
          y += 3;
          const splitComments = doc.splitTextToSize(av.preEncontro.comments, pageWidth - 28);
          doc.text(splitComments, 14, y);
          y = y + (splitComments.length * 3);
        } else {
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Palestras
        doc.setFontSize(11);
        doc.setTextColor(212, 175, 55);
        doc.text('PALESTRAS', 14, y);

        autoTable(doc, {
          startY: y + 2,
          head: [['Pergunta', 'Nota']],
          body: [
            ['Relevância', `${av.palestras?.relevance || 0} ⭐`],
            ['Clareza', `${av.palestras?.clarity || 0} ⭐`],
            ['Duração', `${av.palestras?.duration || 0} ⭐`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [212, 175, 55], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        if (av.palestras?.comments) {
          y = (doc as any).lastAutoTable.finalY + 3;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Comentários:', 14, y);
          y += 3;
          const splitComments = doc.splitTextToSize(av.palestras.comments, pageWidth - 28);
          doc.text(splitComments, 14, y);
          y = y + (splitComments.length * 3);
        } else {
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Verificar se precisa de nova página
        if (y > 200) {
          doc.addPage();
          y = 20;
        }

        // Ambientes
        doc.setFontSize(11);
        doc.setTextColor(34, 197, 94);
        doc.text('AMBIENTES', 14, y);

        autoTable(doc, {
          startY: y + 2,
          head: [['Pergunta', 'Nota']],
          body: [
            ['Conforto', `${av.ambientes?.comfort || 0} ⭐`],
            ['Limpeza', `${av.ambientes?.cleanliness || 0} ⭐`],
            ['Decoração', `${av.ambientes?.decoration || 0} ⭐`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        if (av.ambientes?.comments) {
          y = (doc as any).lastAutoTable.finalY + 3;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Comentários:', 14, y);
          y += 3;
          const splitComments = doc.splitTextToSize(av.ambientes.comments, pageWidth - 28);
          doc.text(splitComments, 14, y);
          y = y + (splitComments.length * 3);
        } else {
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Verificar se precisa de nova página
        if (y > 200) {
          doc.addPage();
          y = 20;
        }

        // Refeições
        doc.setFontSize(11);
        doc.setTextColor(255, 140, 0);
        doc.text('REFEIÇÕES', 14, y);

        autoTable(doc, {
          startY: y + 2,
          head: [['Pergunta', 'Nota']],
          body: [
            ['Qualidade', `${av.refeicoes?.quality || 0} ⭐`],
            ['Organização', `${av.refeicoes?.organization || 0} ⭐`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [255, 140, 0], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        if (av.refeicoes?.comments) {
          y = (doc as any).lastAutoTable.finalY + 3;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Comentários:', 14, y);
          y += 3;
          const splitComments = doc.splitTextToSize(av.refeicoes.comments, pageWidth - 28);
          doc.text(splitComments, 14, y);
          y = y + (splitComments.length * 3);
        } else {
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Verificar se precisa de nova página
        if (y > 200) {
          doc.addPage();
          y = 20;
        }

        // Músicas
        doc.setFontSize(11);
        doc.setTextColor(147, 51, 234);
        doc.text('MÚSICAS', 14, y);

        autoTable(doc, {
          startY: y + 2,
          head: [['Pergunta', 'Nota']],
          body: [
            ['Adequação', `${av.musicas?.suitability || 0} ⭐`],
            ['Qualidade', `${av.musicas?.quality || 0} ⭐`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [147, 51, 234], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        if (av.musicas?.comments) {
          y = (doc as any).lastAutoTable.finalY + 3;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Comentários:', 14, y);
          y += 3;
          const splitComments = doc.splitTextToSize(av.musicas.comments, pageWidth - 28);
          doc.text(splitComments, 14, y);
          y = y + (splitComments.length * 3);
        } else {
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Verificar se precisa de nova página
        if (y > 200) {
          doc.addPage();
          y = 20;
        }

        // Equipe
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38);
        doc.text('EQUIPE', 14, y);

        autoTable(doc, {
          startY: y + 2,
          head: [['Pergunta', 'Nota']],
          body: [
            ['Disponibilidade', `${av.equipe?.availability || 0} ⭐`],
            ['Organização', `${av.equipe?.organization || 0} ⭐`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        if (av.equipe?.comments) {
          y = (doc as any).lastAutoTable.finalY + 3;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Comentários:', 14, y);
          y += 3;
          const splitComments = doc.splitTextToSize(av.equipe.comments, pageWidth - 28);
          doc.text(splitComments, 14, y);
          y = y + (splitComments.length * 3);
        } else {
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Verificar se precisa de nova página
        if (y > 200) {
          doc.addPage();
          y = 20;
        }

        // Avaliação Geral
        doc.setFontSize(11);
        doc.setTextColor(34, 197, 94);
        doc.text('AVALIAÇÃO GERAL', 14, y);

        autoTable(doc, {
          startY: y + 2,
          head: [['Pergunta', 'Nota']],
          body: [
            ['Expectativas', `${av.avaliacaoGeral?.expectations || 0} ⭐`],
            ['Nota Geral', `${av.avaliacaoGeral?.overall_rating || 0} ⭐`],
            ['Recomendação', `${av.avaliacaoGeral?.recommendation || 0} ⭐`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        if (av.avaliacaoGeral?.comments) {
          y = (doc as any).lastAutoTable.finalY + 3;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Comentários:', 14, y);
          y += 3;
          const splitComments = doc.splitTextToSize(av.avaliacaoGeral.comments, pageWidth - 28);
          doc.text(splitComments, 14, y);
          y = y + (splitComments.length * 3);
        } else {
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Interesse Pastoral
        if (av.pastoral) {
          y += 3;
          doc.setFontSize(10);
          doc.setTextColor(41, 98, 255);
          doc.text(`Interesse na Pastoral: ${interestMap[av.pastoral.interest] || 'Não informado'}`, 14, y);

          if (av.pastoral.contact_info) {
            y += 5;
            doc.setTextColor(0, 0, 0);
            doc.text(`Contato: ${av.pastoral.contact_info}`, 14, y);
          }
        }

        // Mensagem Final
        if (av.mensagemFinal?.message) {
          y += 5;
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text('Mensagem Final:', 14, y);
          y += 4;
          const splitMsg = doc.splitTextToSize(av.mensagemFinal.message, pageWidth - 28);
          doc.text(splitMsg, 14, y);
        }

          // Linha separadora (se não for a última avaliação)
          if (index < avaliacoes.length - 1) {
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setDrawColor(200, 200, 200);
            doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
          }
        } catch (avError) {
          console.error(`Erro ao processar avaliação ${index + 1}:`, avError);
          // Continua para a próxima avaliação
        }
      });

      // Rodapé na última página
      console.log('Finalizando PDF...');
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, pageHeight - 10);

      // Salvar PDF
      console.log('Salvando PDF...');
      const fileName = `relatorio-completo-avaliacoes-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      console.log('PDF gerado com sucesso!');

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao gerar relatório em PDF: ${errorMessage}\n\nVerifique o console para mais detalhes.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pastoral-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border-l-4 border-red-500">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchEstatisticas}
            className="bg-pastoral-blue-600 text-white px-6 py-2 rounded-lg hover:bg-pastoral-blue-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const interestMap: Record<string, string> = {
    'sim': 'Sim, temos interesse!',
    'talvez': 'Talvez',
    'nao': 'Não',
    '': 'Não respondeu'
  };

  // Obter URL completa para o QR Code
  const formUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center animate-fadeIn">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-pastoral-blue-700 to-pastoral-blue-500 bg-clip-text text-transparent mb-4">
            📊 Estatísticas das Avaliações
          </h1>
          <p className="text-lg text-gray-700 mb-4">
            Análise completa dos Encontros de Santificação
          </p>
          <button
            onClick={exportToPDF}
            className="bg-pastoral-blue-600 hover:bg-pastoral-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Baixar Relatório em PDF
          </button>
        </div>

        {/* QR Code para Avaliação */}
        <div className="mb-8">
          <QRCodeGenerator
            url={formUrl}
            title="QR Code para Avaliação"
          />
        </div>

        {/* Total de Avaliações */}
        <div className="bg-gradient-to-br from-pastoral-blue-600 to-pastoral-blue-700 text-white p-8 rounded-2xl shadow-2xl mb-8 animate-fadeIn">
          <div className="text-center">
            <p className="text-lg opacity-90 mb-2">Total de Avaliações</p>
            <p className="text-6xl font-bold">{stats.totalAvaliacoes}</p>
            <p className="text-sm opacity-75 mt-2">encontros avaliados</p>
          </div>
        </div>

        {/* Grid de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Pré-Encontro */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-pastoral-blue-500 animate-fadeIn">
            <h3 className="text-xl font-bold text-pastoral-blue-800 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
              </svg>
              Pré-Encontro
            </h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaPreEncontro.avg_communication)}`}>
                <p className="text-sm font-medium mb-1">Clareza da Comunicação</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaPreEncontro.avg_communication)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaPreEncontro.avg_registration)}`}>
                <p className="text-sm font-medium mb-1">Facilidade de Inscrição</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaPreEncontro.avg_registration)} ⭐</p>
              </div>
            </div>
          </div>

          {/* Palestras */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-paroquia-gold-500 animate-fadeIn">
            <h3 className="text-xl font-bold text-paroquia-gold-700 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
              </svg>
              Palestras
            </h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaPalestras.avg_relevance)}`}>
                <p className="text-sm font-medium mb-1">Relevância</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaPalestras.avg_relevance)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaPalestras.avg_clarity)}`}>
                <p className="text-sm font-medium mb-1">Clareza</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaPalestras.avg_clarity)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaPalestras.avg_duration)}`}>
                <p className="text-sm font-medium mb-1">Duração</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaPalestras.avg_duration)} ⭐</p>
              </div>
            </div>
          </div>

          {/* Ambientes */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-green-500 animate-fadeIn">
            <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
              Ambientes
            </h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaAmbientes.avg_comfort)}`}>
                <p className="text-sm font-medium mb-1">Conforto</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaAmbientes.avg_comfort)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaAmbientes.avg_cleanliness)}`}>
                <p className="text-sm font-medium mb-1">Limpeza</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaAmbientes.avg_cleanliness)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaAmbientes.avg_decoration)}`}>
                <p className="text-sm font-medium mb-1">Decoração</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaAmbientes.avg_decoration)} ⭐</p>
              </div>
            </div>
          </div>

          {/* Refeições */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-orange-500 animate-fadeIn">
            <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
              </svg>
              Refeições
            </h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaRefeicoes.avg_quality)}`}>
                <p className="text-sm font-medium mb-1">Qualidade</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaRefeicoes.avg_quality)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaRefeicoes.avg_organization)}`}>
                <p className="text-sm font-medium mb-1">Organização</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaRefeicoes.avg_organization)} ⭐</p>
              </div>
            </div>
          </div>

          {/* Músicas */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-purple-500 animate-fadeIn">
            <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
              </svg>
              Músicas
            </h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaMusicas.avg_suitability)}`}>
                <p className="text-sm font-medium mb-1">Adequação</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaMusicas.avg_suitability)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaMusicas.avg_quality)}`}>
                <p className="text-sm font-medium mb-1">Qualidade</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaMusicas.avg_quality)} ⭐</p>
              </div>
            </div>
          </div>

          {/* Equipe */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-red-500 animate-fadeIn">
            <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
              Equipe
            </h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaEquipe.avg_availability)}`}>
                <p className="text-sm font-medium mb-1">Disponibilidade</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaEquipe.avg_availability)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaEquipe.avg_organization)}`}>
                <p className="text-sm font-medium mb-1">Organização</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaEquipe.avg_organization)} ⭐</p>
              </div>
            </div>
          </div>

          {/* Avaliação Geral */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-blue-600 animate-fadeIn md:col-span-2 lg:col-span-1">
            <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
              </svg>
              Avaliação Geral
            </h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaAvaliacaoGeral.avg_expectations)}`}>
                <p className="text-sm font-medium mb-1">Expectativas</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaAvaliacaoGeral.avg_expectations)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaAvaliacaoGeral.avg_overall)}`}>
                <p className="text-sm font-medium mb-1">Nota Geral</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaAvaliacaoGeral.avg_overall)} ⭐</p>
              </div>
              <div className={`p-3 rounded-lg ${getRatingColor(stats.mediaAvaliacaoGeral.avg_recommendation)}`}>
                <p className="text-sm font-medium mb-1">Recomendação</p>
                <p className="text-2xl font-bold">{formatRating(stats.mediaAvaliacaoGeral.avg_recommendation)} ⭐</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interesse na Pastoral */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border-l-4 border-pastoral-blue-500 animate-fadeIn">
          <h3 className="text-2xl font-bold text-pastoral-blue-800 mb-6 flex items-center gap-2">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
            </svg>
            Interesse na Pastoral Familiar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.interestePastoral.map((item) => (
              <div
                key={item.interest}
                className="bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-6 rounded-xl border-2 border-pastoral-blue-200"
              >
                <p className="text-sm text-gray-600 mb-2">{interestMap[item.interest] || item.interest}</p>
                <p className="text-4xl font-bold text-pastoral-blue-700">{item.count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((item.count / stats.totalAvaliacoes) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
