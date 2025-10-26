import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Interessado {
  avaliacao_id: number;
  nome_casal: string | null;
  data_encontro: string | null;
  data_avaliacao: string;
  nivel_interesse: 'sim' | 'talvez' | 'nao' | '';
  contato: string;
  nota_geral: number;
}

export function Interessados() {
  const [interessados, setInteressados] = useState<Interessado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInteressados();
  }, []);

  const fetchInteressados = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/pastoral/interessados');

      if (!response.ok) {
        throw new Error('Erro ao buscar interessados');
      }

      const result = await response.json();
      setInteressados(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar interessados:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Contato copiado para a área de transferência!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getInterestBadge = (interest: string) => {
    if (interest === 'sim') {
      return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">✅ Sim</span>;
    }
    if (interest === 'talvez') {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">🤔 Talvez</span>;
    }
    return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">❌ Não</span>;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'text-paroquia-gold-500' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const exportToPDF = () => {
    if (interessados.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título
    doc.setFontSize(20);
    doc.setTextColor(41, 98, 255);
    doc.text('Interessados na Pastoral Familiar', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total: ${interessados.length} interessado(s)`, pageWidth / 2, 28, { align: 'center' });

    // Mapeamento de interesse
    const interestMap: Record<string, string> = {
      'sim': 'Sim',
      'talvez': 'Talvez',
      'nao': 'Não',
      '': 'N/A'
    };

    // Tabela com os interessados
    autoTable(doc, {
      startY: 40,
      head: [['Nome', 'Interesse', 'Data Encontro', 'Nota Geral', 'Contato']],
      body: interessados.map((pessoa) => [
        pessoa.nome_casal || 'Anônimo',
        interestMap[pessoa.nivel_interesse] || pessoa.nivel_interesse,
        pessoa.data_encontro ? formatDate(pessoa.data_encontro) : 'N/A',
        `${pessoa.nota_geral} ⭐`,
        pessoa.contato,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 98, 255] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // Rodapé
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, finalY);

    // Salvar PDF
    doc.save(`interessados-pastoral-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pastoral-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando interessados...</p>
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
            onClick={fetchInteressados}
            className="bg-pastoral-blue-600 text-white px-6 py-2 rounded-lg hover:bg-pastoral-blue-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center animate-fadeIn">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-pastoral-blue-700 to-pastoral-blue-500 bg-clip-text text-transparent mb-4">
            👥 Interessados na Pastoral Familiar
          </h1>
          <p className="text-lg text-gray-700 mb-4">
            Lista de pessoas que demonstraram interesse em participar da Pastoral
          </p>
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg mb-4">
            <span className="text-3xl font-bold text-pastoral-blue-700">{interessados.length}</span>
            <span className="text-gray-600">interessado(s)</span>
          </div>
          {interessados.length > 0 && (
            <div>
              <button
                onClick={exportToPDF}
                className="bg-pastoral-blue-600 hover:bg-pastoral-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Baixar Lista em PDF
              </button>
            </div>
          )}
        </div>

        {interessados.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-xl text-center">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Nenhum interessado ainda</h3>
            <p className="text-gray-500">
              Quando alguém demonstrar interesse na Pastoral Familiar e deixar contato, aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {interessados.map((pessoa) => (
              <div
                key={pessoa.avaliacao_id}
                className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-pastoral-blue-500 hover:shadow-2xl transition-shadow animate-fadeIn"
              >
                {/* Header do Card */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-pastoral-blue-800">
                      {pessoa.nome_casal || 'Anônimo'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      ID da Avaliação: #{pessoa.avaliacao_id}
                    </p>
                  </div>
                  {getInterestBadge(pessoa.nivel_interesse)}
                </div>

                {/* Informações */}
                <div className="space-y-3 mb-4">
                  {pessoa.data_encontro && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <svg className="w-5 h-5 text-pastoral-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <span className="text-sm">
                        <strong>Encontro:</strong> {formatDate(pessoa.data_encontro)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5 text-pastoral-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span className="text-sm">
                      <strong>Avaliado em:</strong> {formatDate(pessoa.data_avaliacao)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-paroquia-gold-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm text-gray-700 mr-2"><strong>Nota Geral:</strong></span>
                    {renderStars(pessoa.nota_geral)}
                  </div>
                </div>

                {/* Contato */}
                <div className="bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-4 rounded-xl border-2 border-pastoral-blue-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1 font-semibold">📞 Contato:</p>
                      <p className="text-sm text-pastoral-blue-800 font-medium break-all">
                        {pessoa.contato}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(pessoa.contato)}
                      className="bg-pastoral-blue-600 hover:bg-pastoral-blue-700 text-white p-2 rounded-lg transition flex-shrink-0"
                      title="Copiar contato"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão de Atualizar */}
        {interessados.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={fetchInteressados}
              className="bg-white hover:bg-gray-50 text-pastoral-blue-700 font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-pastoral-blue-200 flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Atualizar Lista
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
