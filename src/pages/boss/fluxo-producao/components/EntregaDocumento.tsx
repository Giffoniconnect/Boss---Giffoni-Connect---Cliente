import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
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
  const { googleAccessToken, loginWithGoogle } = useAuth();
  const { caseId } = useParams<{ caseId: string }>();

  const resolvedGoogleAccessToken = googleAccessToken || localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken') || '';

  const [showWhatsappConfirm, setShowWhatsappConfirm] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState<{
    success: boolean;
    message: string;
    pendingConfirmation?: boolean;
    errorCode?: string;
    fileId?: string | null;
    phoneNormalized?: string;
    delivery?: any;
    diagnostic?: any;
  } | null>(null);

  const [sendingGmail, setSendingGmail] = useState(false);
  const [gmailResult, setGmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const [waDiagnostics, setWaDiagnostics] = useState<{
    configured: boolean;
    tokenSource: string;
    tokenMasked: string;
    provider: string;
    status: string;
    warnings?: string[];
  } | null>(null);

  const [preflightData, setPreflightData] = useState<{
    valid: boolean;
    readiness: string;
    pdfExportCheck: string;
    diagnostic?: any;
    phoneValidation?: any;
  } | null>(null);

  const [testFormatsResult, setTestFormatsResult] = useState<any[] | null>(null);
  const [testingFormats, setTestingFormats] = useState(false);

  const [prechecking, setPrechecking] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Fetch diagnostics on mount
  React.useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const res = await fetch('/api/whatsapp/diagnostics');
        if (res.ok) {
          const data = await res.json();
          setWaDiagnostics(data);
        }
      } catch (err) {
        console.warn('Failed to fetch WA diagnostics:', err);
      }
    };
    fetchDiagnostics();
  }, []);

  const runPreflightCheck = async () => {
    if (!docUrl || docUrl.includes('placeholder')) return;
    setPrechecking(true);
    try {
      const response = await fetch('/api/whatsapp/preflight-send-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleDocsUrl: docUrl,
          phone: whatsappCliente,
          docName: docInfo.label,
          clientName: nomeCliente,
          documentType: tipoDocumento,
          tipoPessoa,
          caseId,
          googleAccessToken: resolvedGoogleAccessToken
        })
      });
      if (response.ok) {
        const data = await response.json();
        setPreflightData(data);
        // Clear previous error if it was a token expiration and preflight succeeds now
        if (whatsappResult && whatsappResult.errorCode === 'GOOGLE_DOCS_TOKEN_EXPIRED') {
          setWhatsappResult(null);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setWhatsappResult({
          success: false,
          message: errorData.errorMessage || "Falha na verificação prévia do documento.",
          errorCode: errorData.errorCode,
          fileId: errorData.diagnostic?.fileId || null
        });
      }
    } catch (err) {
      console.warn('Preflight check failed:', err);
    } finally {
      setPrechecking(false);
    }
  };

  const runTestPhoneFormats = async () => {
    if (!whatsappCliente) return;
    setTestingFormats(true);
    setTestFormatsResult(null);
    try {
      const response = await fetch('/api/whatsapp/test-phone-formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: whatsappCliente,
          message: `Giffoni Advogados — Este é um teste real para validar a comunicação e roteamento correto do WhatsApp com a sua linha telefônica.`
        })
      });
      if (response.ok) {
        const data = await response.json();
        setTestFormatsResult(data.attempts || []);
      } else {
        const err = await response.json().catch(() => ({}));
        alert("Erro ao disparar teste técnico de envio: " + (err.errorMessage || "Falha desconhecida."));
      }
    } catch (e: any) {
      alert("Falha de rede ao disparar teste: " + e.message);
    } finally {
      setTestingFormats(false);
    }
  };

  // Trigger preflight when modal opens
  React.useEffect(() => {
    if (showWhatsappConfirm) {
      runPreflightCheck();
    } else {
      setPreflightData(null);
      setTestFormatsResult(null);
    }
  }, [showWhatsappConfirm]);

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
          caseId,
          googleAccessToken: resolvedGoogleAccessToken
        })
      });
      const raw = await response.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!data) {
        setWhatsappResult({
          success: false,
          message: raw
            ? `Resposta inesperada do servidor: ${raw.slice(0, 300)}`
            : 'Servidor respondeu sem conteúdo ao tentar enviar pelo W.A Speed.'
        });
        return;
      }

      if (response.ok && data.success) {
        setWhatsappResult({
          success: true,
          message: data.message || `Mensagem e PDF aceitos pelo W.A Speed para o número ${data.phoneNormalized || ''}.`,
          phoneNormalized: data.phoneNormalized,
          delivery: data.delivery
        });
        // Close modal on successfully sending after a short delay
        setTimeout(() => {
          setShowWhatsappConfirm(false);
        }, 5000);
      } else {
        setWhatsappResult({
          success: false,
          pendingConfirmation: data.pendingConfirmation || false,
          message: data.errorMessage || 'Falha ao enviar por WhatsApp.',
          errorCode: data.errorCode,
          diagnostic: data.diagnostic,
          phoneNormalized: data.phoneNormalized,
          fileId: data.diagnostic?.fileId || (data.diagnostic?.inspection?.parsedBody?.fileId)
        });
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

    if (!resolvedGoogleAccessToken) {
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
          googleAccessToken: resolvedGoogleAccessToken,
          documentType: tipoDocumento,
          tipoPessoa
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const urls = data.gmailOpenUrls;
        const openUrl = urls?.composeInDraftsByMessageId || urls?.composeByDraftId || urls?.composeByMessageId || urls?.draftById || urls?.draftByMessageId || urls?.inboxThread;
        
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
                  {waDiagnostics === null ? (
                    <span className="text-[9px] font-sans font-semibold text-slate-400 animate-pulse">
                      Buscando status...
                    </span>
                  ) : (
                    <span className={`text-[9px] font-black uppercase border rounded px-1.5 py-0.2 tracking-wider ${
                      waDiagnostics.configured 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}>
                      {waDiagnostics.configured ? 'Conector WA Speed Ativo' : 'W.A Speed Não Configurado'}
                    </span>
                  )}
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
                    <span>WhatsApp Web (Manual — Sem PDF Integrado)</span>
                  </a>
                )}
              </div>
            </div>

            {/* Config warning alerts */}
            {waDiagnostics !== null && !waDiagnostics.configured && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Token W.A Speed não encontrado. Configure Wascript_API ou settings/connectors.whatsapp.waSpeedToken nas configurações.</span>
                </div>
              </div>
            )}

            {(!googleDocsUrl || googleDocsUrl.includes('placeholder')) && (
              <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>O PDF de {docInfo.label} ainda não pôde ser exportado a partir do Google Docs. Verifique permissão do documento/pasta ou renove a conexão Google.</span>
                </div>
              </div>
            )}
 
            {/* Send status feedback */}
            {whatsappResult && (
              <div id="whatsapp-feedback-status-inline" className={`p-2.5 rounded-xl border flex flex-col gap-1.5 text-[11px] ${
                whatsappResult.success 
                  ? 'bg-emerald-500/10 border-emerald-250 text-emerald-800 font-bold' 
                  : whatsappResult.pendingConfirmation
                  ? 'bg-amber-500/10 border-amber-200 text-amber-800 font-bold'
                  : 'bg-rose-550/10 border-rose-200 text-rose-800 font-bold'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    whatsappResult.success 
                      ? 'bg-emerald-550 animate-pulse' 
                      : whatsappResult.pendingConfirmation
                      ? 'bg-amber-550 animate-pulse'
                      : 'bg-rose-550'
                  }`}></span>
                  <span>{whatsappResult.pendingConfirmation ? "O W.A Speed respondeu, mas não confirmou o envio. A mensagem/PDF não foram considerados enviados." : whatsappResult.message}</span>
                </div>
                {whatsappResult.success && whatsappResult.delivery && (
                  <div className="text-[10px] text-emerald-700/80 font-normal pl-3.5 space-y-0.5">
                    <div>Texto: <span className="font-semibold uppercase text-[9px] px-1 py-0.2 bg-emerald-500/15 rounded text-emerald-800">{whatsappResult.delivery.text.confidence}</span> — Documento: <span className="font-semibold uppercase text-[9px] px-1 py-0.2 bg-emerald-500/15 rounded text-emerald-800">{whatsappResult.delivery.document.confidence}</span></div>
                  </div>
                )}
                {whatsappResult.pendingConfirmation && whatsappResult.diagnostic && (
                  <div className="text-[10px] text-amber-700/85 font-normal pl-3 space-y-1 mt-1 border-l-2 border-amber-300">
                    <div>• Telefone normalizado: <span className="font-semibold">{whatsappResult.phoneNormalized || whatsappResult.diagnostic.phoneNormalized || "N/A"}</span></div>
                    <div>• Status HTTP: <span className="font-semibold">{whatsappResult.diagnostic.status || "502 (Ambiguidade)"}</span></div>
                    {whatsappResult.diagnostic.textConfidence && (
                      <div>• Confiança Texto: <span className="font-semibold uppercase text-[9px] px-1.5 py-0.5 bg-amber-500/15 rounded text-amber-800">{whatsappResult.diagnostic.textConfidence}</span></div>
                    )}
                    {whatsappResult.diagnostic.documentConfidence && (
                      <div>• Confiança Documento: <span className="font-semibold uppercase text-[9px] px-1.5 py-0.5 bg-amber-500/15 rounded text-amber-800">{whatsappResult.diagnostic.documentConfidence}</span></div>
                    )}
                    {whatsappResult.diagnostic.textRawBodyPreview && (
                      <div className="mt-1">
                        • Retorno Texto API: 
                        <pre className="max-h-20 overflow-y-auto font-mono text-[9px] bg-amber-500/5 p-1 rounded border border-amber-500/10 mt-0.5 break-all whitespace-pre-wrap">
                          {whatsappResult.diagnostic.textRawBodyPreview}
                        </pre>
                      </div>
                    )}
                    {whatsappResult.diagnostic.documentRawBodyPreview && (
                      <div className="mt-1">
                        • Retorno PDF API: 
                        <pre className="max-h-20 overflow-y-auto font-mono text-[9px] bg-amber-500/5 p-1 rounded border border-amber-500/10 mt-0.5 break-all whitespace-pre-wrap">
                          {whatsappResult.diagnostic.documentRawBodyPreview}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
                {!whatsappResult.success && !whatsappResult.pendingConfirmation && whatsappResult.errorCode && (
                  <div className="text-[10px] text-rose-700/85 font-normal pl-3">
                    Código: {whatsappResult.errorCode}
                  </div>
                )}
                {!whatsappResult.success && !whatsappResult.pendingConfirmation && whatsappResult.diagnostic && (
                  <div className="text-[10px] text-rose-700/85 font-normal pl-3 space-y-1 mt-1 border-l-2 border-rose-300">
                    <div>• Telefone normalizado: <span className="font-semibold">{whatsappResult.diagnostic.phoneNormalized || "N/A"}</span></div>
                    {whatsappResult.diagnostic.status && (
                      <div>• Status API: <span className="font-semibold">{whatsappResult.diagnostic.status}</span></div>
                    )}
                    {whatsappResult.diagnostic.inspection?.reason && (
                      <div>• Motivo: <span className="font-semibold">{whatsappResult.diagnostic.inspection.reason}</span></div>
                    )}
                  </div>
                )}
                {!whatsappResult.success && whatsappResult.fileId && (
                  <div className="text-[10px] text-rose-700/85 font-normal pl-3">
                    ID do documento: {whatsappResult.fileId}
                  </div>
                )}
                {!whatsappResult.success && (whatsappResult.errorCode === 'GOOGLE_DOCS_TOKEN_EXPIRED' || whatsappResult.errorCode === 'GOOGLE_AUTH_UNAUTHORIZED') && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await loginWithGoogle('boss_admin');
                        setWhatsappResult(null);
                      } catch (e: any) {
                        alert("Erro ao reautorizar conta Google: " + e.message);
                      }
                    }}
                    className="mt-1 w-max px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-3xs cursor-pointer flex items-center gap-1 shrink-0 self-start"
                  >
                    <ExternalLink size={10} />
                    <span>Conectar com Google / Renovar Token</span>
                  </button>
                )}
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
                  disabled={sendingGmail || !emailCliente || !docUrl || !resolvedGoogleAccessToken}
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

              {/* Google Connection helper banner */}
              {!resolvedGoogleAccessToken && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col gap-2.5 text-[11px]">
                  <div className="flex gap-1.5 items-center">
                    <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="font-extrabold uppercase tracking-wider text-amber-900">Google Drive & Docs Desconectado</span>
                  </div>
                  <p className="text-amber-800 leading-normal font-medium text-[10.5px]">
                    Sua sessão do Google Docs não possui autorização fática ativa para que o W.A Speed possa ler a procuração/declaração e convertê-la em PDF antes de enviar.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await loginWithGoogle('boss_admin');
                      } catch (e: any) {
                        alert("Erro ao conectar conta Google: " + e.message);
                      }
                    }}
                    className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={12} />
                    <span>Conectar minha Conta Google / Renovar Session Token</span>
                  </button>
                </div>
              )}

              {/* Error/Success feedback inside the modal */}
              {whatsappResult && (
                <div id="whatsapp-feedback-status-modal" className={`p-3 rounded-xl border flex flex-col gap-1.5 text-[11px] ${
                  whatsappResult.success 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800 font-bold' 
                    : whatsappResult.pendingConfirmation
                    ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold'
                    : 'bg-rose-550/10 border-rose-200 text-rose-800 font-bold'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      whatsappResult.success 
                        ? 'bg-emerald-500 animate-pulse' 
                        : whatsappResult.pendingConfirmation
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-rose-550'
                    }`}></span>
                    <span>{whatsappResult.pendingConfirmation ? "O W.A Speed respondeu, mas não confirmou o envio. A mensagem/PDF não foram considerados enviados." : whatsappResult.message}</span>
                  </div>
                  {whatsappResult.success && whatsappResult.delivery && (
                    <div className="text-[10px] text-emerald-700/80 font-normal pl-3.5 space-y-0.5">
                      <div>Texto: <span className="font-semibold uppercase text-[9px] px-1 py-0.2 bg-emerald-500/15 rounded">{whatsappResult.delivery.text.confidence}</span> — Documento: <span className="font-semibold uppercase text-[9px] px-1 py-0.2 bg-emerald-500/15 rounded">{whatsappResult.delivery.document.confidence}</span></div>
                    </div>
                  )}
                  {whatsappResult.pendingConfirmation && whatsappResult.diagnostic && (
                    <div className="text-[10px] text-amber-700/85 font-normal pl-3 space-y-1 mt-1 border-l-2 border-amber-300">
                      <div>• Telefone normalizado: <span className="font-semibold">{whatsappResult.phoneNormalized || whatsappResult.diagnostic.phoneNormalized || "N/A"}</span></div>
                      <div>• Status HTTP: <span className="font-semibold">{whatsappResult.diagnostic.status || "502 (Ambiguidade)"}</span></div>
                      {whatsappResult.diagnostic.textConfidence && (
                        <div>• Confiança Texto: <span className="font-semibold uppercase text-[9px] px-1.5 py-0.5 bg-amber-500/15 rounded">{whatsappResult.diagnostic.textConfidence}</span></div>
                      )}
                      {whatsappResult.diagnostic.documentConfidence && (
                        <div>• Confiança Documento: <span className="font-semibold uppercase text-[9px] px-1.5 py-0.5 bg-amber-500/15 rounded">{whatsappResult.diagnostic.documentConfidence}</span></div>
                      )}
                      {whatsappResult.diagnostic.textRawBodyPreview && (
                        <div className="mt-1">
                          • Retorno Texto API: 
                          <pre className="max-h-20 overflow-y-auto font-mono text-[9px] bg-amber-500/5 p-1 rounded border border-amber-500/10 mt-0.5 break-all whitespace-pre-wrap">
                            {whatsappResult.diagnostic.textRawBodyPreview}
                          </pre>
                        </div>
                      )}
                      {whatsappResult.diagnostic.documentRawBodyPreview && (
                        <div className="mt-1">
                          • Retorno PDF API: 
                          <pre className="max-h-20 overflow-y-auto font-mono text-[9px] bg-amber-500/5 p-1 rounded border border-amber-500/10 mt-0.5 break-all whitespace-pre-wrap">
                            {whatsappResult.diagnostic.documentRawBodyPreview}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                  {!whatsappResult.success && !whatsappResult.pendingConfirmation && whatsappResult.errorCode && (
                    <div className="text-[10px] text-rose-700/85 font-normal pl-3">
                      Código: {whatsappResult.errorCode}
                    </div>
                  )}
                  {!whatsappResult.success && !whatsappResult.pendingConfirmation && whatsappResult.diagnostic && (
                    <div className="text-[10px] text-rose-700/85 font-normal pl-3 space-y-1 mt-1 border-l-2 border-rose-300">
                      <div>• Telefone normalizado: <span className="font-semibold">{whatsappResult.diagnostic.phoneNormalized || "N/A"}</span></div>
                      {whatsappResult.diagnostic.status && (
                        <div>• Status API: <span className="font-semibold">{whatsappResult.diagnostic.status}</span></div>
                      )}
                      {whatsappResult.diagnostic.inspection?.reason && (
                        <div>• Motivo: <span className="font-semibold">{whatsappResult.diagnostic.inspection.reason}</span></div>
                      )}
                    </div>
                  )}
                  {!whatsappResult.success && whatsappResult.fileId && (
                    <div className="text-[10px] text-rose-700/85 font-normal pl-3">
                      ID do documento: {whatsappResult.fileId}
                    </div>
                  )}
                  {!whatsappResult.success && (
                    whatsappResult.errorCode === 'GOOGLE_DOCS_TOKEN_EXPIRED' || 
                    whatsappResult.errorCode === 'GOOGLE_AUTH_UNAUTHORIZED' ||
                    whatsappResult.errorCode === 'GOOGLE_DOCS_CREDENTIALS_MISSING'
                  ) && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await loginWithGoogle('boss_admin');
                          setWhatsappResult(null);
                        } catch (e: any) {
                          alert("Erro ao reautorizar conta Google: " + e.message);
                        }
                      }}
                      className="mt-1 w-max px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-3xs cursor-pointer flex items-center gap-1 shrink-0 self-start"
                    >
                      <ExternalLink size={10} />
                      <span>Conectar com Google / Renovar Token</span>
                    </button>
                  )}
                </div>
              )}

              {/* Technical diagnostics accordion */}
              <div className="border border-slate-150 rounded-xl overflow-hidden mt-3">
                <button
                  type="button"
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings size={12} className="text-slate-500" />
                    Diagnósticos & Logs Técnicos (API)
                  </span>
                  <span>{showTechDetails ? 'Recolher ▲' : 'Expandir ▼'}</span>
                </button>
                {showTechDetails && (
                  <div className="p-3 bg-white border-t border-slate-150 text-[10px] space-y-2.5 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Status Conector</span>
                        <span className="font-extrabold text-slate-800">{waDiagnostics?.configured ? "CONFIGURADO" : "NÃO CONFIGURADO"}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Origem do Token</span>
                        <span className="font-extrabold text-slate-800 break-all">{waDiagnostics?.tokenSource || "N/A"}</span>
                      </div>
                    </div>

                    {preflightData && (
                      <div className="space-y-1 bg-slate-50/50 p-2 rounded border border-slate-100">
                        <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Verificação Prévia (Preflight)</span>
                        <div>• Telefone válido: <span className={preflightData.phoneValidation?.valid ? "font-extrabold text-emerald-600" : "font-extrabold text-rose-600"}>{preflightData.phoneValidation?.valid ? "SIM" : "NÃO"}</span></div>
                        <div>• Validação do PDF: <span className={preflightData.pdfExportCheck === "ok" ? "font-extrabold text-emerald-600" : "font-extrabold text-rose-600"}>{preflightData.pdfExportCheck === "ok" ? "PRONTO" : "FALHA / INDISPONÍVEL"}</span></div>
                        <div>• Status geral de Prontidão: <span className="font-extrabold uppercase">{preflightData.readiness}</span></div>
                      </div>
                    )}

                    {prechecking && (
                      <div className="flex items-center gap-1.5 text-slate-500 py-1 font-semibold animate-pulse">
                        <span className="w-2.5 h-2.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                        <span>Carregando dados de prontidão técnica...</span>
                      </div>
                    )}

                    {whatsappResult && (
                      <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-150">
                        <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Resultado do Último Envio</span>
                        <div>• Sucesso Geral: <span className="font-bold">{whatsappResult.success ? "SIM" : "NÃO"}</span></div>
                        {whatsappResult.pendingConfirmation && (
                          <div className="text-amber-700 font-bold">• Confirmação Pendente (Aguardando Retorno de ID)</div>
                        )}
                        {whatsappResult.delivery && (
                          <div className="space-y-0.5 pl-2 font-semibold">
                            <div>• Confiança Texto: <span className="uppercase">{whatsappResult.delivery.text?.confidence || "N/A"}</span></div>
                            <div>• Detalhe Texto API: <span className="font-mono text-[9px]">{whatsappResult.delivery.text?.reason || "N/A"}</span></div>
                            <div>• Confiança PDF: <span className="uppercase">{whatsappResult.delivery.document?.confidence || "N/A"}</span></div>
                            <div>• Detalhe PDF API: <span className="font-mono text-[9px]">{whatsappResult.delivery.document?.reason || "N/A"}</span></div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Real Batch Diagnostics for W.A Speed */}
                    <div className="pt-2.5 border-t border-slate-150 space-y-2">
                      <span className="text-[9px] uppercase font-black text-indigo-600 tracking-wider block font-mono">
                        Painel de Diagnóstico em Tempo Real (Wascript API)
                      </span>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        O W.A Speed exige padrões de número específicos (com ou sem o 9º dígito). Clique abaixo para disparar mensagens de controle reais para as combinações de números possíveis e confirmar a conectividade seletiva.
                      </p>
                      
                      <button
                        type="button"
                        disabled={testingFormats || !whatsappCliente}
                        onClick={runTestPhoneFormats}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all shadow-3xs cursor-pointer flex items-center gap-1 shrink-0 self-start"
                      >
                        {testingFormats ? (
                          <>
                            <span className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Testando Conexão Real...</span>
                          </>
                        ) : (
                          <span>Testar Conexão Real com W.A Speed</span>
                        )}
                      </button>

                      {testFormatsResult && (
                        <div className="space-y-2 mt-2 bg-slate-50/50 p-2.5 border border-slate-150 rounded-xl max-h-52 overflow-y-auto">
                          <span className="text-[9px] font-black text-slate-600 uppercase block font-mono">Retorno Direto da API W.A Speed:</span>
                          {testFormatsResult.length === 0 ? (
                            <div className="text-slate-500 italic text-[9px]">Nenhum formato alternativo para testar.</div>
                          ) : (
                            testFormatsResult.map((attempt: any, idx: number) => {
                              const isAttemptOk = attempt.inspection?.accepted;
                              return (
                                <div key={idx} className="p-2 bg-white rounded-lg border border-slate-150 text-[9px] space-y-1 font-mono text-slate-700">
                                  <div className="flex items-center justify-between font-bold border-b border-slate-100 pb-1">
                                    <span>Nº: <span className="text-indigo-600 font-extrabold">{attempt.format}</span></span>
                                    <span className={isAttemptOk ? "text-emerald-600 uppercase" : "text-rose-600 uppercase font-extrabold"}>
                                      {isAttemptOk ? "ATIVA / ACEITA" : "FALHA / REJEITADA"}
                                    </span>
                                  </div>
                                  <div>• HTTP Status: <span className="font-extrabold">{attempt.httpStatus || attempt.error || "N/A"}</span></div>
                                  {attempt.inspection?.reason && (
                                    <div>• Status Técnico: <span className="font-semibold text-slate-500 font-sans">{attempt.inspection.reason}</span></div>
                                  )}
                                  {attempt.rawBodyPreview && (
                                    <div className="text-[8px] bg-slate-50 p-1.5 rounded font-mono text-slate-600 max-h-16 overflow-y-auto break-all whitespace-pre-wrap leading-normal border border-slate-100 mt-1">
                                      Corpo: {attempt.rawBodyPreview}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
