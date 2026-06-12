import React, { useState } from 'react';
import { Printer, MessageCircle, Mail, Settings, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

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

function extractGoogleDocId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function openGoogleDocPrint(docUrl: string) {
  const documentId = extractGoogleDocId(docUrl);

  if (!documentId) {
    window.open(docUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const printUrl = `https://docs.google.com/document/d/${documentId}/preview`;
  const printWindow = window.open(printUrl, "_blank", "noopener,noreferrer");

  if (!printWindow) {
    alert("O navegador bloqueou a janela de impressão. Autorize pop-ups para imprimir o documento.");
  }
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
  const { googleAccessToken } = useAuth();

  const [showWhatsappConfirm, setShowWhatsappConfirm] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState<{ success: boolean; message: string } | null>(null);

  const [sendingGmail, setSendingGmail] = useState(false);
  const [gmailResult, setGmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const getWhatsappMessageText = () => {
    switch (tipoDocumento) {
      case 'procuracao':
        return 'Olá! Aqui é a Giffoni Advogados Associados, segue a *procuração* para sua conferência e assinatura. Por gentileza, assine, digitalize em PDF e nos envie de volta. É sempre um imenso prazer lhe atender.';
      case 'declaracao':
        return 'Olá! Aqui é a Giffoni Advogados Associados, segue a *declaração* para sua conferência e assinatura. Por gentileza, assine, digitalize em PDF e nos envie de volta. É sempre um imenso prazer lhe atender.';
      case 'contrato':
        return 'Olá! Aqui é a Giffoni Advogados Associados, segue o *contrato de honorários* para sua conferência e assinatura. Por gentileza, assine, digitalize em PDF e nos envie de volta. É sempre um imenso prazer lhe atender.';
      default:
        return 'Olá! Aqui é a Giffoni Advogados Associados, segue o documento para sua conferência e assinatura. Por gentileza, assine, digitalize em PDF e nos envie de volta. É sempre um imenso prazer lhe atender.';
    }
  };

  const getSendButtonLabel = () => {
    switch (tipoDocumento) {
      case 'procuracao':
        return 'Preparar envio da Procuração via WhatsApp';
      case 'declaracao':
        return 'Preparar envio da Declaração via WhatsApp';
      case 'contrato':
        return 'Preparar envio do Contrato via WhatsApp';
      default:
        return 'Preparar envio via WhatsApp';
    }
  };

  const getModalTitle = () => {
    switch (tipoDocumento) {
      case 'procuracao':
        return 'Confirmar envio da Procuração via W.A Speed';
      case 'declaracao':
        return 'Confirmar envio da Declaração via W.A Speed';
      case 'contrato':
        return 'Confirmar envio do Contrato via W.A Speed';
      default:
        return 'Confirmar envio via W.A Speed';
    }
  };

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

  // Handle method selection (single-choice)
  const toggleMethod = (method: string) => {
    const updated = selectedMethods.includes(method) ? [] : [method];
    onMethodsChange(updated);
  };

  const handleConfirmWhatsappSend = async () => {
    setSendingWhatsapp(true);
    setWhatsappResult(null);

    const cleanPhoneVal = whatsappCliente.replace(/\D/g, '');
    if (!cleanPhoneVal) {
      setWhatsappResult({ success: false, message: 'WhatsApp do cliente não encontrado.' });
      setSendingWhatsapp(false);
      return;
    }

    if (!docUrl || docUrl.includes('placeholder')) {
      setWhatsappResult({ success: false, message: 'Documento ainda não foi gerado.' });
      setSendingWhatsapp(false);
      return;
    }

    try {
      const response = await fetch('/api/google-docs/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleDocsUrl: docUrl,
          phone: whatsappCliente,
          docName: docInfo.label,
          clientName: nomeCliente,
          documentType: tipoDocumento,
          tipoPessoa,
          googleAccessToken
        })
      });
      const data = await response.json();
      if (response.ok && data.success && !data.simulated) {
        setWhatsappResult({ success: true, message: data.message || 'Mensagem e PDF enviados com sucesso pelo W.A Speed.' });
        // Close modal on successfully sending after a short delay
        setTimeout(() => {
          setShowWhatsappConfirm(false);
        }, 1500);
      } else if (response.ok && data.success && data.simulated) {
        setWhatsappResult({
          success: false,
          message: 'O envio não foi real. O backend retornou modo simulado. Verifique o token W.A Speed.'
        });
      } else if (response.ok && data.partialSuccess) {
        setWhatsappResult({ success: false, message: data.errorMessage || 'Falha parcial ao enviar por WhatsApp.' });
      } else {
        setWhatsappResult({ success: false, message: data.errorMessage || 'Falha ao enviar valor por WhatsApp.' });
      }
    } catch (err: any) {
      setWhatsappResult({ success: false, message: err.message || 'Erro ao conectar à API de WhatsApp.' });
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const handleSendGmail = async () => {
    setSendingGmail(true);
    setGmailResult(null);

    if (!emailCliente) {
      setGmailResult({ success: false, message: 'E-mail do cliente não encontrado.' });
      setSendingGmail(false);
      return;
    }

    if (!docUrl || docUrl.includes('placeholder')) {
      setGmailResult({ success: false, message: 'Documento ainda não foi gerado.' });
      setSendingGmail(false);
      return;
    }

    if (!googleAccessToken) {
      setGmailResult({
        success: false,
        message: 'Conecte sua conta Google/Gmail antes de preparar o rascunho.'
      });
      setSendingGmail(false);
      return;
    }

    try {
      const response = await fetch('/api/google-docs/create-gmail-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleDocsUrl: docUrl,
          email: emailCliente,
          docName: docInfo.label,
          clientName: nomeCliente,
          googleAccessToken,
          documentType: tipoDocumento,
          tipoPessoa
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const urls = data.gmailOpenUrls;
        const openUrl = urls?.draftById || urls?.draftByMessageId || urls?.inboxThread;
        
        if (openUrl) {
          setGmailResult({
            success: true,
            message: 'E-mail aberto no Gmail com destinatário, assunto, corpo e anexo.'
          });
          window.open(openUrl, '_blank', 'noopener,noreferrer');
        } else {
          setGmailResult({
            success: true,
            message: 'Rascunho criado com sucesso, mas o Gmail abriu a pasta de rascunhos. Abra o rascunho recém-criado para enviar.'
          });
          const fallbackUrl = urls?.draftsFolder || 'https://mail.google.com/mail/u/0/#drafts';
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        setGmailResult({
          success: false,
          message: data.errorMessage || 'Não foi possível preparar o e-mail no Gmail. Verifique se sua conta Google está conectada com permissão Gmail.'
        });
      }
    } catch (err: any) {
      setGmailResult({
        success: false,
        message: 'Não foi possível preparar o e-mail no Gmail. Verifique se sua conta Google está conectada com permissão Gmail.'
      });
    } finally {
      setSendingGmail(false);
    }
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
          Selecione o canal exclusivo de entrega para habilitar e realizar os disparos fáticos de envio automático.
        </p>
      </div>

      {/* Selector Badges/Toggles */}
      <div className="flex flex-wrap gap-2.5">
        {[
          {key: 'fisica', label: 'Física/Impressa', color: 'border-slate-200 text-slate-800 hover:border-slate-300'},
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
              <button
                type="button"
                onClick={() => openGoogleDocPrint(docUrl)}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs cursor-pointer"
              >
                <Printer size={12} />
                <span>Imprimir {docInfo.label}</span>
              </button>
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
                    Conector WA Speed Ativo
                  </span>
                </div>
                <p className="text-xs font-extrabold text-emerald-950">
                  Transmissão por WhatsApp ({whatsappCliente || 'Número não cadastrado'})
                </p>
                <p className="text-[10px] text-emerald-700/80 font-semibold font-sans">
                  Preparar a mensagem e o anexo PDF de {docInfo.label} para envio seguro via W.A Speed.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsappConfirm(true)}
                  disabled={sendingWhatsapp}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs cursor-pointer"
                >
                  {sendingWhatsapp ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <MessageCircle size={12} />
                  )}
                  <span>{sendingWhatsapp ? 'Preparando...' : getSendButtonLabel()}</span>
                </button>

                {cleanPhone && (
                  <a
                    href={`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(getWhatsappMessageText())}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-xl transition-all"
                    title="Aviso: Abre o WhatsApp Web convencional apenas com o texto pré-preenchido, sem o PDF anexo de forma automática."
                  >
                    <ExternalLink size={11} />
                    <span>WhatsApp Web (Manual - Sem Anexo)</span>
                  </a>
                )}
              </div>
            </div>

            {/* Send status feedback */}
            {whatsappResult && (
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] font-bold ${
                whatsappResult.success 
                  ? 'bg-emerald-500/10 border-emerald-250 text-emerald-800' 
                  : 'bg-rose-550/10 border-rose-200 text-rose-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${whatsappResult.success ? 'bg-emerald-550 animate-pulse' : 'bg-rose-550'}`}></span>
                <span>{whatsappResult.message}</span>
              </div>
            )}
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
                  <span className="text-[9px] font-black uppercase bg-blue-105 text-blue-800 border border-blue-200 rounded px-1.5 py-0.2 tracking-wider">
                    Conector Gmail
                  </span>
                </div>
                <p className="text-xs font-extrabold text-blue-950">
                  Transmissão por E-mail ({emailCliente || 'Email não cadastrado'})
                </p>
                <p className="text-[10px] text-blue-700/85 font-semibold font-sans">
                  Preparar e-mail rascunho com o PDF de {docInfo.label} anexado automaticamente na sua conta do Gmail integrada.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendGmail}
                  disabled={sendingGmail || !emailCliente || !docUrl || !googleAccessToken}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs cursor-pointer"
                >
                  {sendingGmail ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <Mail size={12} />
                  )}
                  <span>{sendingGmail ? 'Preparando...' : 'Preparar e-mail no Gmail'}</span>
                </button>

                {emailCliente && (
                  <a
                    href={gmailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-xl transition-all text-center"
                    title="Aviso: Abre compose de email convencional sem o PDF anexo de forma automática."
                  >
                    <ExternalLink size={11} />
                    <span>Gmail Web (Manual - Sem Anexo)</span>
                  </a>
                )}
              </div>
            </div>

            {/* Gmail result feedback */}
            {gmailResult && (
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] font-bold ${
                gmailResult.success 
                  ? 'bg-blue-500/10 border-blue-250 text-blue-800' 
                  : 'bg-rose-550/10 border-rose-200 text-rose-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${gmailResult.success ? 'bg-blue-550' : 'bg-rose-550'}`}></span>
                <span>{gmailResult.message}</span>
              </div>
            )}
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

      {/* Confirmation Modal for WhatsApp Delivery */}
      {showWhatsappConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 font-mono">
                <MessageCircle size={16} className="text-emerald-600" />
                {getModalTitle()}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowWhatsappConfirm(false);
                  setWhatsappResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs font-sans text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Cliente</span>
                  <span className="font-extrabold text-slate-800">{nomeCliente}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">WhatsApp</span>
                  <span className="font-extrabold text-slate-800">{whatsappCliente || "Não cadastrado"}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-150">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Documento</span>
                  <span className="font-extrabold text-slate-800">{docInfo.label}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Anexo</span>
                  <span className="font-bold text-slate-600 flex items-center gap-1.5 pt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    PDF convertido a partir do Google Docs
                  </span>
                </div>
              </div>

              {/* Message preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Prévia da Mensagem (com asteriscos para negrito)</span>
                <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-xl text-[11px] font-semibold text-emerald-950 leading-relaxed font-sans whitespace-pre-line">
                  {getWhatsappMessageText()}
                </div>
              </div>

              {/* Validation errors inside the modal */}
              {(!whatsappCliente || !docUrl || docUrl.includes('placeholder')) && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-[11px] font-bold">
                  ⚠️ {' '}
                  {!whatsappCliente 
                    ? 'WhatsApp do cliente não encontrado.' 
                    : (!docUrl || docUrl.includes('placeholder')) 
                    ? 'Documento ainda não foi gerado.' 
                    : ''}
                </div>
              )}

              {/* Error/Success feedback inside the modal */}
              {whatsappResult && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 text-[11px] font-bold ${
                  whatsappResult.success 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : 'bg-rose-550/10 border-rose-200 text-rose-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${whatsappResult.success ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  <span>{whatsappResult.message}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowWhatsappConfirm(false);
                  setWhatsappResult(null);
                }}
                className="px-4 py-2 hover:bg-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all border border-slate-250 cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWhatsappSend}
                disabled={sendingWhatsapp || !whatsappCliente || !docUrl || docUrl.includes('placeholder')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs cursor-pointer flex items-center gap-1.5 text-center"
              >
                {sendingWhatsapp ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Preparando...</span>
                  </>
                ) : (
                  <span>Confirmar envio pelo W.A Speed</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
