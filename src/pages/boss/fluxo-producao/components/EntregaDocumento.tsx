import React from 'react';
import { Printer, MessageCircle, Mail, Settings, Check, ExternalLink } from 'lucide-react';

interface EntregaDocumentoProps {
  tipoDocumento: 'procuracao' | 'declaracao' | 'contrato';
  tipoPessoa: 'PF' | 'PJ';
  googleDocsUrl?: string;
  whatsappCliente?: string;
  emailCliente?: string;
  nomeCliente?: string;
  selectedMethods: string[];
  onMethodsChange: (methods: string[]) => void;
  outroValue: string;
  onOutroChange: (value: string) => void;
  questionNumber?: string;
}

export default function EntregaDocumento({
  tipoDocumento,
  tipoPessoa,
  googleDocsUrl = '',
  whatsappCliente = '',
  emailCliente = '',
  nomeCliente = 'Cliente',
  selectedMethods,
  onMethodsChange,
  outroValue,
  onOutroChange,
  questionNumber = '1.2'
}: EntregaDocumentoProps) {

  // Resolve localized text based on documento
  const getDocInfo = () => {
    switch (tipoDocumento) {
      case 'procuracao':
        return {
          label: 'Procuração Ad Judicia',
          title: 'a procuração',
          fallbackUrl: 'https://docs.google.com/document/d/1pro-placeholder'
        };
      case 'declaracao':
        return {
          label: 'Declaração de Hipossuficiência',
          title: 'a declaração',
          fallbackUrl: 'https://docs.google.com/document/d/1dec-placeholder'
        };
      case 'contrato':
        return {
          label: 'Contrato de Honorários',
          title: 'o contrato',
          fallbackUrl: 'https://docs.google.com/document/d/1con-placeholder font-medium'
        };
      default:
        return {
          label: 'Documento',
          title: 'o documento',
          fallbackUrl: ''
        };
    }
  };

  const docInfo = getDocInfo();

  // Handle method selection
  const toggleMethod = (method: string) => {
    const updated = selectedMethods.includes(method)
      ? selectedMethods.filter((m) => m !== method)
      : [...selectedMethods, method];
    onMethodsChange(updated);
  };

  // Generate clean direct link for WhatsApp
  // Remove non-numeric characters for phone number
  const cleanPhone = whatsappCliente.replace(/\D/g, '');
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}`;

  // Generate deep compose mail link for Gmail
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    emailCliente
  )}&su=${encodeURIComponent(
    `Envio de ${docInfo.label} — ${nomeCliente}`
  )}&body=${encodeURIComponent(
    `Prezado(a) ${nomeCliente},\n\nSegue em anexo ${docInfo.title} para sua conferência e assinatura.\n\nQualquer dúvida, estamos à disposição.\n\nAtenciosamente,\nEscritório de Advocacia`
  )}`;

  // Google Docs Url fallback if empty
  const docUrl = googleDocsUrl || docInfo.fallbackUrl;

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div className="space-y-1">
        <p className="text-xs font-extrabold text-gray-800">
          {questionNumber} Como você entregará o documento ao cliente?
        </p>
        <p className="text-[11px] text-gray-400">
          Selecione uma ou mais formas de entrega para liberar as respectivas ações e logs operacionais.
        </p>
      </div>

      {/* Selector Badges/Toggles */}
      <div className="flex flex-wrap gap-2.5">
        {[
          { key: 'fisica', label: 'Físico (em mãos)', color: 'border-slate-200 text-slate-800 hover:border-slate-300' },
          { key: 'whatsapp', label: 'WhatsApp', color: 'border-emerald-200 text-emerald-800 hover:border-emerald-300' },
          { key: 'email', label: 'E-mail', color: 'border-blue-200 text-blue-800 hover:border-blue-300' },
          { key: 'outro', label: 'Outro', color: 'border-purple-200 text-purple-800 hover:border-purple-300' }
        ].map((m) => {
          const isActive = selectedMethods.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggleMethod(m.key)}
              className={`px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                isActive
                  ? 'bg-gray-900 border-gray-900 text-white shadow-xs scale-[1.02]'
                  : `bg-white ${m.color}`
              }`}
            >
              {isActive && <Check size={12} className="text-white" />}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Content Columns / Cards for chosen methods */}
      <div className="space-y-3.5 pt-1">
        {/* 1.2.1 Físico en Mãos */}
        {selectedMethods.includes('fisica') && (
          <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                  {questionNumber}.1 — Entrega Física
                </span>
                <p className="text-xs font-extrabold text-slate-900">
                  Imprimir {docInfo.label}
                </p>
              </div>
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs"
              >
                <Printer size={12} />
                <span>Imprimir {docInfo.label}</span>
              </a>
            </div>

            {/* Validation Log */}
            <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-center gap-2 text-[11px] font-bold text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{docInfo.label} gerado disponível para impressão.</span>
            </div>
          </div>
        )}

        {/* 1.2.2 WhatsApp */}
        {selectedMethods.includes('whatsapp') && (
          <div className="border border-emerald-150 rounded-2xl p-4 bg-emerald-50/20 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block font-mono">
                    {questionNumber}.2 — WhatsApp Integration
                  </span>
                  <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.2 tracking-wider">
                    Automação Reservada
                  </span>
                </div>
                <p className="text-xs font-extrabold text-emerald-950">
                  Transmissão por WhatsApp ({whatsappCliente || 'Número não cadastrado'})
                </p>
                <p className="text-[10px] text-emerald-700/80 font-semibold font-sans">
                  Ação futura: enviar automaticamente o documento ao cliente via WhatsApp.
                </p>
              </div>

              {cleanPhone && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs"
                >
                  <MessageCircle size={12} />
                  <span>Ver conversa de WhatsApp</span>
                </a>
              )}
            </div>

            {/* Validation Log */}
            <div className="bg-emerald-500/10 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2 text-[11px] font-bold text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{docInfo.label} enviado com sucesso (fila de envio futuro programada).</span>
            </div>
          </div>
        )}

        {/* 1.2.3 E-mail (Gmail) */}
        {selectedMethods.includes('email') && (
          <div className="border border-blue-150 rounded-2xl p-4 bg-blue-50/25 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block font-mono">
                    {questionNumber}.3 — Gmail Integration
                  </span>
                  <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200 rounded px-1.5 py-0.2 tracking-wider">
                    Automação Reservada
                  </span>
                </div>
                <p className="text-xs font-extrabold text-blue-950">
                  Transmissão por E-mail ({emailCliente || 'Email não cadastrado'})
                </p>
                <p className="text-[10px] text-blue-700/85 font-semibold font-sans">
                  Ação futura: enviar automaticamente o documento ao cliente via Gmail.
                </p>
              </div>

              {emailCliente && (
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs"
                >
                  <Mail size={12} />
                  <span>Abrir conversa no Gmail</span>
                </a>
              )}
            </div>

            {/* Validation Log */}
            <div className="bg-blue-500/10 border border-blue-200 p-2.5 rounded-xl flex items-center gap-2 text-[11px] font-bold text-blue-800">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>{docInfo.label} enviado com sucesso (fila de envio futuro programada).</span>
            </div>
          </div>
        )}

        {/* 1.2.4 Outro Canal de Entrega */}
        {selectedMethods.includes('outro') && (
          <div className="border border-purple-150 rounded-2xl p-4 bg-purple-50/20 space-y-3.5 animate-in fade-in duration-200">
            <div className="space-y-2">
              <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block font-mono">
                {questionNumber}.4 — Outro Canal de Comunicação
              </span>
              <p className="text-xs font-extrabold text-purple-950">
                Registrar forma alternativa de entrega
              </p>
              <input
                type="text"
                placeholder="Ex: Entregue via portador, Telegram, etc..."
                value={outroValue}
                onChange={(e) => onOutroChange(e.target.value)}
                className="w-full max-w-md px-3.5 py-2 bg-white border border-purple-200 focus:border-purple-500 rounded-xl text-xs font-semibold focus:outline-hidden transition-all shadow-3xs"
              />
            </div>

            {outroValue.trim() && (
              <div className="bg-purple-500/10 border border-purple-200 p-2.5 rounded-xl flex items-center gap-2 text-[11px] font-bold text-purple-800">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>Forma alternativa de entrega registrada.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
