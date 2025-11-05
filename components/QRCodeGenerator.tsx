import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  url: string;
  title?: string;
  size?: number;
}

export function QRCodeGenerator({ url, title = 'Acesse a Avaliação', size = 256 }: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Criar um canvas para converter SVG em PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Definir tamanho do canvas com margem
    const padding = 40;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2;

    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Converter SVG para imagem
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size);
      URL.revokeObjectURL(url);

      // Download da imagem
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = `qrcode-avaliacao-encontro-${new Date().toISOString().split('T')[0]}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    };

    img.src = url;
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border-l-4 border-pastoral-blue-500 animate-fadeIn">
      <h3 className="text-2xl font-bold text-pastoral-blue-800 mb-4 flex items-center gap-2">
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd"/>
          <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z"/>
        </svg>
        {title}
      </h3>

      <div className="text-center">
        <p className="text-gray-600 mb-6">
          Compartilhe este QR Code para que os avaliadores possam acessar o formulário de avaliação facilmente.
        </p>

        {/* QR Code Display */}
        <div
          ref={qrRef}
          className="bg-white p-8 rounded-xl shadow-inner inline-block mb-6"
        >
          <QRCodeSVG
            value={url}
            size={size}
            level="H"
            includeMargin={false}
            fgColor="#1e40af"
            bgColor="#ffffff"
          />
        </div>

        {/* URL Display */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p className="text-xs text-gray-500 mb-1">URL da Avaliação:</p>
          <p className="text-sm font-mono text-pastoral-blue-700 break-all">{url}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={downloadQRCode}
            className="bg-pastoral-blue-600 hover:bg-pastoral-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Baixar QR Code
          </button>

          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-gray-50 text-pastoral-blue-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 justify-center border-2 border-pastoral-blue-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Imprimir
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 text-left bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-semibold text-pastoral-blue-800 mb-2">💡 Dicas de uso:</p>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>Baixe o QR Code e compartilhe nas redes sociais ou WhatsApp</li>
            <li>Imprima e coloque em local visível durante o encontro</li>
            <li>Projete em telão para facilitar o acesso de todos os participantes</li>
            <li>O QR Code possui alta correção de erros e funciona mesmo com pequenos danos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
