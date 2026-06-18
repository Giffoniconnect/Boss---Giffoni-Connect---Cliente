import React, { useState } from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import ColetaProvasSubetapasCard from '../components/ColetaProvasSubetapasCard';
import { 
  ArrowLeft, FileText, Check, AlertCircle, Sparkles, 
  Send, ShieldCheck, Printer, Download, Clock,
  ExternalLink, Copy, FileCode, ArrowRight, RefreshCw, Settings, CheckCircle2
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export default function RelatorioConsolidadoPF() {
  const {
    caseId,
    fetching,
    saving,
    setSaving,
    error,
    setError,
    success,
    setSuccess,
    client,
    requests,
    wizardState,
    saveWizardStateUpdate,
    navigate,
    caseObj,
    driveFolderId,
    driveFolderUrl,
    clientName,
  } = useColetaState();

  const [generatingRelatorio, setGeneratingRelatorio] = useState(false);
  const [copiedRelatorio, setCopiedRelatorio] = useState(false);
  const [isGdiSettingsOpen, setIsGdiSettingsOpen] = useState(false);
  const [relatorioLogs, setRelatorioLogs] = useState<any[]>([]);

  const handleGenerateRelatorioDocs = async () => {
    setGeneratingRelatorio(true);
    setError(null);
    setSuccess(null);
    const trackingLogs: any[] = [];
    const addTrackLog = (step: string, details?: any) => {
      trackingLogs.push({ step, timestamp: new Date().toISOString(), details });
      setRelatorioLogs([...trackingLogs]);
    };

    addTrackLog("BUTTON_CLICKED", { documentType: "relatorio_provas", clientType: "PF" });

    if (!driveFolderId) {
      addTrackLog("DRIVE_FOLDER_ERROR", { error: "Sem ID de pasta do Drive" });
      setError("Não há pasta real do Google Drive vinculada ao cliente.");
      setGeneratingRelatorio(false);
      return;
    }

    addTrackLog("DRIVE_FOLDER_VALIDATED", { destinationFolderId: driveFolderId });

    const jobId = `job-relatorio-pf-${Date.now()}`;
    const targetCaseId = caseId;
    const targetClientId = client?.id || caseObj?.clientId || "";
    const nomeCompleto = client?.personalDados?.pf_nomeCompleto || clientName || "Cliente";

    let listText = "";
    listText += "=== DOCUMENTOS BÁSICOS DO ESCRITÓRIO ===\n\n";
    basicDocs.forEach((docItem) => {
      const isCustodiado = docItem.files.length > 0;
      const statusStr = isCustodiado ? `CUSTODIADO (${docItem.files.length} fl) ✅` : "AUSENTE ✗";
      const channelStr = docItem.methods.length > 0 ? `(Canais: ${docItem.methods.join(' / ').toUpperCase()})` : "(Não entregue)";
      listText += `• ${docItem.name.toUpperCase()}:\n  - Status: ${statusStr}\n  - Envio ao Cliente: ${docItem.sent ? "Sim" : "Não"}\n  - Recebimento: ${channelStr}\n\n`;
    });

    listText += "=== CERTIFICAÇÃO DE PROVAS MÍNIMAS OBRIGATÓRIAS ===\n\n";
    const minimDocs = [
      { label: 'RG', files: wizardState?.rgFiles || [] },
      { label: 'CPF', files: wizardState?.cpfFiles || [] },
      { label: 'Comprovante de residência', files: wizardState?.comprovanteFiles || [] }
    ];
    minimDocs.forEach((m) => {
      const statusStr = m.files.length > 0 ? "SANEADO ✅" : "AUSENTE ✗";
      listText += `• ${m.label.toUpperCase()}: ${statusStr} (${m.files.length} arquivo(s))\n`;
    });
    listText += "\n";

    listText += "=== OUTRAS PROVAS E PLEITOS ADICIONAIS ===\n\n";
    if (customProvas && customProvas.length > 0) {
      customProvas.forEach((req, idx) => {
        const proofState = wizardState?.q5_provas?.[req.id] || { received: 'nao' };
        const statusStr = proofState.received === 'sim' ? "RECEBIDO ✅" : "PENDENTE COOPERAÇÃO ⏳";
        listText += `${idx + 1}. [${req.documentNumber || 'DOCUMENTO'}] ${req.title}\n`;
        listText += `   - Tipo: ${req.evidenceType || 'Geral'}\n`;
        listText += `   - Status de Custódia: ${statusStr}\n\n`;
      });
    } else {
      listText += "Nenhuma prova adicional customizada requerida para esta instrução processual.\n";
    }

    const placeholders: Record<string, string> = {
      "{{CLIENTE_NOME}}": nomeCompleto,
      "{{NOME_COMPLETO}}": nomeCompleto,
      "{{CLIENT_NOME}}": nomeCompleto,
      "{{CLIENTE}}": nomeCompleto,
      "{{CPF_CNPJ}}": client?.personalDados?.pf_cpf || client?.pfDadosPessoais?.pf_cpf || "",
      "{{CPF}}": client?.personalDados?.pf_cpf || client?.pfDadosPessoais?.pf_cpf || "",
      "{{RG}}": client?.personalDados?.pf_rg || client?.pfDadosPessoais?.pf_rg || "",
      "{{TELEFONE}}": client?.personalDados?.pf_telefone || client?.pfDadosPessoais?.pf_telefone || "",
      "{{ENDERECO}}": client?.personalDados?.pf_endereco || client?.pfDadosPessoais?.pf_endereco || "",
      "{{CASE_ID}}": caseId || "",
      "{{DATA_GERACAO}}": new Date().toLocaleDateString('pt-BR'),
      "{{STATUS_RELATORIO}}": missingDocs.length === 0 ? "TOTALMENTE SANEADO" : "PENDÊNCIAS EM ABERTO",
      "{{PROVAS_LISTADO}}": listText,
      "{{RELATORIO_PROVAS}}": listText,
      "{{PROVAS_DETALHES}}": listText,
      "{{DATA_ASSINATURA}}": new Date().toLocaleDateString('pt-BR'),
      "<<data da assinatura>>": new Date().toLocaleDateString('pt-BR')
    };

    const officialTemplateId = "1BPIOSWMjvLsSWzo_NcMjixrYUhmq7sKW2pRjdp1bS0s";
    addTrackLog("TEMPLATE_SELECTED", { templateKey: "relatorio_provas_pf", templateId: officialTemplateId });

    const caseDocRef = doc(db, 'cases', caseId);

    await updateDoc(caseDocRef, {
      relatorioProvasStatus: "gerando",
      relatorioProvasLogFalha: ""
    });

    const googleAccessToken = localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken') || '';
    const localOverride = localStorage.getItem('portal_boss_gdocs_override') || '';

    const payload = {
      mode: "stateless",
      googleAccessToken,
      documentType: "relatorio_provas_pf",
      caseId: targetCaseId,
      clientId: targetClientId,
      clientType: "PF",
      templateId: officialTemplateId,
      templateKey: "relatorio_provas_pf",
      destinationFolderId: driveFolderId,
      destinationFolderUrl: driveFolderUrl,
      documentName: `Relatório de Provas PF - ${nomeCompleto}`,
      placeholders,
      metadata: { source: "Operational Coleta Flow", attemptJobId: jobId },
      credentialOverride: localOverride
    };

    try {
      addTrackLog("TEMPLATE_COPY_STARTED", { details: "Disparando clonagem do template de Relatório..." });
      const response = await fetch("/api/google-docs/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { error: responseText };
      }

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.errorMessage || responseData.error || responseText || "Falha na geração integrada.");
      }

      const googleDocsId = responseData.googleDocsId;
      const googleDocsUrl = responseData.googleDocsUrl;

      addTrackLog("DOCUMENT_CREATED", { googleDocsId, googleDocsUrl });
      addTrackLog("FLOW_COMPLETED", { message: "Relatório de Provas PF gerado no Google Drive com sucesso!" });

      await updateDoc(caseDocRef, {
        relatorioProvasStatus: "criada",
        relatorioProvasGoogleDocsId: googleDocsId,
        relatorioProvasGoogleDocsUrl: googleDocsUrl,
        relatorioProvasGeneratedAt: new Date().toISOString(),
        relatorioProvasJobLogs: trackingLogs
      });

      setSuccess("Relatório de Provas gerado com absoluto sucesso no Google Docs!");
    } catch (err: any) {
      console.error(err);
      addTrackLog("FLOW_FAILED", { error: err.message });
      await updateDoc(caseDocRef, {
        relatorioProvasStatus: "falha",
        relatorioProvasLogFalha: err.message || "Erro inesperado na geração do documento.",
        relatorioProvasJobLogs: trackingLogs
      });
      setError(`Erro na geração integrado via Google Docs: ${err.message}`);
    } finally {
      setGeneratingRelatorio(false);
    }
  };

  const handleCopyRelatorioLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedRelatorio(true);
      setTimeout(() => setCopiedRelatorio(false), 2000);
    });
  };

  const handleConfirmConsolidate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveWizardStateUpdate({ step5_consolidado_completed: true });
      setSuccess('Relatório de Provas Consolidado validado e fechado na custódia!');
    } catch (err: any) {
      setError(err.message || 'Falha ao consolidar o relatório.');
    } finally {
      setSaving(false);
    }
  };

  const basicDocs = [
    {
      name: 'Procuração Ad Judicia',
      files: wizardState?.procuracaoFiles || [],
      sent: wizardState?.q1_1 === 'sim',
      methods: wizardState?.q1_2 || [],
      required: true
    },
    {
      name: 'Declaração de Hipossuficiência',
      files: wizardState?.declaracaoFiles || [],
      sent: wizardState?.q2_2 === 'sim',
      methods: wizardState?.q2_3 || [],
      required: wizardState?.q2_1 === 'sim'
    },
    {
      name: 'Contrato de Prestação de Serviços',
      files: wizardState?.contratoFiles || [],
      sent: wizardState?.q3_1 === 'sim',
      methods: wizardState?.q3_3 || [],
      required: true
    }
  ];

  const totalMinimosFiles = (wizardState?.rgFiles || []).length + 
                           (wizardState?.cpfFiles || []).length + 
                           (wizardState?.comprovanteFiles || []).length;

  const customProvas = (requests || []).filter(req => {
    const t = (req.title || '').toLowerCase();
    return !t.includes('procuração') && !t.includes('declaração') && !t.includes('contrato');
  });

  const missingDocs = basicDocs.filter(d => d.required && d.files.length === 0);

  return (
    <FluxoStepLayout 
      stepName="Relatório de Provas Consolidado" 
      caseId={caseId}
      coletaSubetapasStep="documentos-consolidado"
      tipoPessoa="PF"
      wizardState={wizardState}
    >
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Etapa 5 — Relatório de Custódia (PF)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{client?.personalDados?.pf_nomeCompleto || 'PF'}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Relatório de Provas Consolidado
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-necessidade-PF`)}
            className="p-2 bg-gray-50 border border-gray-150 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
          >
            <ArrowLeft size={13} className="mr-1" /> Voltar para Necessidades
          </button>
        </div>

        {fetching ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-405 font-mono">Compilando relatório...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* NOTIFICATIONS */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs font-semibold flex gap-2 items-center">
                <AlertCircle size={14} className="text-red-900 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-950 text-xs font-bold flex gap-2 items-center">
                <Check className="text-emerald-550 shrink-0" size={14} />
                <span>{success}</span>
              </div>
            )}

            {/* MAIN PORT BOSS VERTICAL FORM LAYOUT */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-6 text-left">
              
              {/* STAGE METRIC */}
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-120/40 p-5 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] bg-indigo-200/50 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-wider font-mono">Status da Custódia</span>
                  <h3 className="text-sm font-black text-indigo-950">
                    {missingDocs.length === 0 ? 'Documentos Básicos Saneados' : 'Documentos Pendentes Identificados'}
                  </h3>
                  <p className="text-xs font-semibold text-gray-500 leading-normal">
                    Este relatório compila e consolida a integridade da entrega material de todas as provas do processo do cliente para a instrução.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <div className="px-3.5 py-2 bg-white rounded-xl border border-indigo-100 text-center">
                    <span className="block text-xs font-black text-indigo-900">{basicDocs.filter(d => d.files.length > 0).length} / 3</span>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Básicos</span>
                  </div>
                  <div className="px-3.5 py-2 bg-white rounded-xl border border-indigo-100 text-center">
                    <span className="block text-xs font-black text-indigo-900">{totalMinimosFiles}</span>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Anexos</span>
                  </div>
                </div>
              </div>

              {/* VERTICAL SECTIONS - 1. BASIC DOCUMENTS STATUS */}
              <div id="secao-auditoria-basicos" className="space-y-4">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b pb-1">
                  1. Auditoria Física dos Documentos Básicos do Escritório
                </h3>
                
                <div className="space-y-4">
                  {/* PROCURAÇÃO */}
                  <div id="audi-procuracao-box" className="p-5 bg-white border border-gray-150 rounded-2xl shadow-3xs space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                        <h4 className="text-xs font-black text-gray-950 uppercase tracking-wider font-mono">Procuração</h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${wizardState.q1_1 === 'sim' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {wizardState.q1_1 === 'sim' ? '✓ Ativa' : '✗ Ausente'}
                      </span>
                    </div>

                    <div className="space-y-3 pl-2 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Procuração foi gerada? (varia de acordo com a resposta no item 1.1 )</span>
                        <span className="font-extrabold text-gray-800">
                          {wizardState.q1_1 === 'sim' ? 'Sim ✅' : wizardState.q1_1 === 'nao' ? 'Não ❌' : 'Não preenchido ➖'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Entregue ao cliente (varia de acordo com a resposta no item 1.2 )</span>
                        <span className="font-extrabold text-gray-800">
                          {Array.isArray(wizardState.q1_2) && wizardState.q1_2.length > 0 
                            ? `Sim (Canais: ${wizardState.q1_2.join(' / ').toUpperCase()}) ✅` 
                            : 'Não entregue ❌'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Assinado pelo cliente? (varia de acordo com a resposta no item 1.3 )</span>
                        <span className="font-extrabold text-gray-800">
                          {wizardState.q1_3 === 'sim' ? 'Sim ✅' : wizardState.q1_3 === 'nao' ? 'Não ❌' : 'Não preenchido ➖'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Meio de recebimento da procuração do cliente: (varia de acordo com a resposta no item 1.4 )</span>
                        <span className="font-extrabold text-gray-805 uppercase">
                          {wizardState.q1_como_p_recebida 
                            ? (wizardState.q1_como_p_recebida === 'fisico' ? 'Físico 📦' : wizardState.q1_como_p_recebida.toUpperCase()) 
                            : 'Não informado ➖'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Digitalização ou Upload foi realizado (varia de acordo com a resposta no item 1.5 )</span>
                        <span className="font-extrabold text-gray-800">
                          {(wizardState.procuracaoFiles && wizardState.procuracaoFiles.length > 0) 
                            ? 'Sim (Arquivo Custodiado) ✅' 
                            : (wizardState.q1_deseja_digitalizar_p === 'sim' ? 'Sim (Pendente upload) ⏳' : 'Não realizado ❌')}
                        </span>
                      </div>

                      {Array.isArray(wizardState?.procuracaoFiles) && wizardState.procuracaoFiles.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {wizardState.procuracaoFiles.map((f: any, fIdx: number) => (
                            <div key={fIdx} className="flex items-center gap-1.5 text-xs text-blue-900 font-semibold bg-blue-50/50 p-1.5 px-2 rounded-lg">
                              <FileText size={11} className="text-blue-400 shrink-0" />
                              <span className="truncate">{f.name}</span>
                              <span className="text-[10px] text-blue-400 font-mono ml-auto">({f.size})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DECLARAÇÃO DE POBREZA */}
                  <div id="audi-declaracao-box" className="p-5 bg-white border border-gray-150 rounded-2xl shadow-3xs space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${wizardState.q2_1 === 'sim' ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                        <h4 className="text-xs font-black text-gray-950 uppercase tracking-wider font-mono">Declaração de Pobreza</h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${wizardState.q2_1 === 'sim' ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                        {wizardState.q2_1 === 'sim' ? '✓ Requisitado (Gratuidade)' : '➖ Isento / Custas'}
                      </span>
                    </div>

                    {wizardState.q2_1 === 'sim' ? (
                      <div className="space-y-3 pl-2 text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Declaração de Pobreza foi gerada? (varia de acordo com a resposta no item 2.2 )</span>
                          <span className="font-extrabold text-gray-800">
                            {wizardState.q2_2 === 'sim' ? 'Sim ✅' : wizardState.q2_2 === 'nao' ? 'Não ❌' : 'Não preenchido ➖'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Entregue ao cliente (varia de acordo com a resposta no item 2.3 )</span>
                          <span className="font-extrabold text-gray-800">
                            {Array.isArray(wizardState.q2_3) && wizardState.q2_3.length > 0 
                              ? `Sim (Canais: ${wizardState.q2_3.join(' / ').toUpperCase()}) ✅` 
                              : 'Não entregue ❌'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Assinado pelo cliente? (varia de acordo com a resposta no item 2.4 )</span>
                          <span className="font-extrabold text-gray-800">
                            {wizardState.q2_4 === 'sim' ? 'Sim ✅' : wizardState.q2_4 === 'nao' ? 'Não ❌' : 'Não preenchido ➖'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Meio de recebimento da declaração de pobreza cliente: (varia de acordo com a resposta no item 2.5 )</span>
                          <span className="font-extrabold text-gray-805 uppercase">
                            {wizardState.q2_como_d_recebida 
                              ? (wizardState.q2_como_d_recebida === 'fisico' ? 'Físico 📦' : wizardState.q2_como_d_recebida.toUpperCase()) 
                              : 'Não informado ➖'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Digitalização ou Upload foi realizado (varia de acordo com a resposta no item 2.6 )</span>
                          <span className="font-extrabold text-gray-800">
                            {(wizardState.declaracaoFiles && wizardState.declaracaoFiles.length > 0) 
                              ? 'Sim (Arquivo Custodiado) ✅' 
                              : (wizardState.q2_deseja_digitalizar_d === 'sim' ? 'Sim (Pendente upload) ⏳' : 'Não realizado ❌')}
                          </span>
                        </div>

                        {Array.isArray(wizardState?.declaracaoFiles) && wizardState.declaracaoFiles.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {wizardState.declaracaoFiles.map((f: any, fIdx: number) => (
                              <div key={fIdx} className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold bg-amber-50/50 p-1.5 px-2 rounded-lg">
                                <FileText size={11} className="text-amber-400 shrink-0" />
                                <span className="truncate">{f.name}</span>
                                <span className="text-[10px] text-amber-400 font-mono ml-auto">({f.size})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic pl-2">
                        O cliente optou pelo recolhimento de taxas. Deste modo, a Declaração de Pobreza está isenta para esta instrução.
                      </p>
                    )}
                  </div>

                  {/* GUIA DE CUSTAS */}
                  <div id="audi-guiacustas-box" className="p-5 bg-white border border-gray-150 rounded-2xl shadow-3xs space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${wizardState.q2_1 === 'nao' ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                        <h4 className="text-xs font-black text-gray-955 uppercase tracking-wider font-mono">Guia de Custas</h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${wizardState.q2_1 === 'nao' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                        {wizardState.q2_1 === 'nao' ? '✓ Requisitado (Custas)' : '➖ Isento / Gratuidade'}
                      </span>
                    </div>

                    {wizardState.q2_1 === 'nao' ? (
                      <div className="space-y-3 pl-2 text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Guia de custas foi gerada? (varia de acordo com a resposta no item 2.2.1 )</span>
                          <span className="font-extrabold text-gray-800">
                            {wizardState.q2_recolher_custas_gerou_guia === 'sim' ? 'Sim ✅' : wizardState.q2_recolher_custas_gerou_guia === 'nao' ? 'Não ❌' : 'Não preenchido ➖'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Entregue ao cliente (varia de acordo com a resposta no item 2.2.2 )</span>
                          <span className="font-extrabold text-gray-800 uppercase">
                            {wizardState.q2_recolher_custas_como_entregara 
                              ? (wizardState.q2_recolher_custas_como_entregara === 'fisica' ? 'Física/Impressa 📦' : wizardState.q2_recolher_custas_como_entregara.toUpperCase()) 
                              : 'Não entregue ❌'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Digitalização ou Upload da Guia de custas foi realizado (varia de acordo com a resposta no item 2.2.3 )</span>
                          <span className="font-extrabold text-gray-850">
                            {Array.isArray(wizardState.guiaCustasFiles) && wizardState.guiaCustasFiles.length > 0 
                              ? `Sim (${wizardState.guiaCustasFiles.length} arquivo(s) salvo(s) no Drive) ✅` 
                              : 'Não realizado ❌'}
                          </span>
                        </div>

                        {Array.isArray(wizardState?.guiaCustasFiles) && wizardState.guiaCustasFiles.length > 0 && (
                          <div className="space-y-1 pl-2">
                            {wizardState.guiaCustasFiles.map((f: any, fIdx: number) => (
                              <div key={fIdx} className="flex items-center gap-1.5 text-xs text-slate-900 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                <FileText size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate">{f.name}</span>
                                <span className="ml-auto text-[10px] text-gray-400 font-mono">({f.size})</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Meio de recebimento do comprovante de pagamento das custas pelo cliente: (varia de acordo com a resposta no item 2.2.4)</span>
                          <span className="font-extrabold text-gray-808 uppercase">
                            {wizardState.q2_recolher_custas_comprovante_enviado_como 
                              ? (wizardState.q2_recolher_custas_comprovante_enviado_como === 'fisico' ? 'Fisico 📦' : wizardState.q2_recolher_custas_comprovante_enviado_como.toUpperCase()) 
                              : 'Não informado ➖'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 font-bold">Digitalização ou Upload do COMPROVANTE DE PAGAMENTO da Guia de custas foi realizado ? (varia de acordo com a resposta no item 2.2.5)</span>
                          <span className="font-extrabold text-gray-850">
                            {Array.isArray(wizardState.comprovanteGuiaCustasFiles) && wizardState.comprovanteGuiaCustasFiles.length > 0 
                              ? `Sim (${wizardState.comprovanteGuiaCustasFiles.length} arquivo(s) salvo(s) no Drive) ✅` 
                              : 'Não realizado ❌'}
                          </span>
                        </div>

                        {Array.isArray(wizardState?.comprovanteGuiaCustasFiles) && wizardState.comprovanteGuiaCustasFiles.length > 0 && (
                          <div className="space-y-1 pl-2">
                            {wizardState.comprovanteGuiaCustasFiles.map((f: any, fIdx: number) => (
                              <div key={fIdx} className="flex items-center gap-1.5 text-xs text-slate-900 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                <FileText size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate">{f.name}</span>
                                <span className="ml-auto text-[10px] text-gray-400 font-mono">({f.size})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic pl-2">
                        O cliente optou pelo Requerimento de Gratuidade de Justiça (Declaração de Pobreza). Isento de Guia de Custas.
                      </p>
                    )}
                  </div>

                  {/* CONTRATO DE HONORÁRIOS */}
                  <div id="audi-contrato-box" className="p-5 bg-white border border-gray-150 rounded-2xl shadow-3xs space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
                        <h4 className="text-xs font-black text-gray-955 uppercase tracking-wider font-mono">Contrato de honorários</h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${wizardState.q3_1 === 'sim' ? 'bg-red-50 text-red-700 font-bold border border-red-200' : 'bg-gray-100 text-gray-500'}`}>
                        {wizardState.q3_1 === 'sim' ? '✓ Ativo' : '✗ Inexistente'}
                      </span>
                    </div>

                    <div className="space-y-3 pl-2 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Contrato de honorários foi gerado? (varia de acordo com a resposta no item 3.1)</span>
                        <span className="font-extrabold text-gray-800">
                          {wizardState.q3_1 === 'sim' ? 'Sim ✅' : wizardState.q3_1 === 'nao' ? 'Não ❌' : 'Não preenchido ➖'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Entregue ao cliente (varia de acordo com a resposta no item 3.3)</span>
                        <span className="font-extrabold text-gray-800">
                          {Array.isArray(wizardState.q3_3) && wizardState.q3_3.length > 0 
                            ? `Sim (Canais: ${wizardState.q3_3.join(' / ').toUpperCase()}) ✅` 
                            : 'Não entregue ❌'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Assinado pelo cliente? (varia de acordo com a resposta no item 3.4)</span>
                        <span className="font-extrabold text-gray-800">
                          {wizardState.q3_4 === 'sim' ? 'Sim ✅' : wizardState.q3_4 === 'nao' ? 'Não ❌' : 'Não preenchido ➖'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Assinado pelo Advogado? (varia de acordo com a resposta no item 3.5)</span>
                        <span className="font-extrabold text-gray-800">
                          {wizardState.q3_5 === 'sim' ? 'Sim ✅' : wizardState.q3_5 === 'nao' ? 'Não ❌' : 'Não preenchido ➖'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold">Meio de recebimento do contrato de honorários do cliente: (varia de acordo com a resposta no item 3.6)</span>
                        <span className="font-extrabold text-gray-808-sim uppercase">
                          {wizardState.q3_6 === 'sim' ? 'Recebido Digitalizado ✅' : wizardState.q3_6 === 'nao' ? 'Não Recebido / Pendente ❌' : 'Não preenchido ➖'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-gray-405 font-bold">Digitalização ou Upload foi realizado do Contrato de honorários (varia de acordo com a resposta no item 3.7)</span>
                        <span className="font-extrabold text-gray-800">
                          {wizardState.q3_7 === 'sim' ? 'Sim (Custódia Concluída) ✅' : wizardState.q3_7 === 'nao' ? 'Não realizado ❌' : 'Não preenchido ➖'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GDI AUTOMATION - STAGE 5 REPORT GENERATION */}
              <div id="gdocs-relatorio-provas-automatizado" className="space-y-4">
                <h3 className="text-xs font-black text-blue-650 uppercase tracking-wider border-b pb-1 font-mono">
                  GDI — Google Docs Integration (Azul)
                </h3>

                <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/20 border border-blue-150 rounded-3xl p-6 shadow-3xs space-y-5 text-left animate-in fade-in duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-black text-[9px] uppercase tracking-wider font-mono">
                          Automação GDI Ativa
                        </span>
                        <Sparkles size={16} className="text-blue-600 animate-pulse" />
                      </div>
                      <h2 className="text-sm font-black text-slate-900">
                        Gerador de Relatório de Provas via Google Workspace
                      </h2>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                        Esta ferramenta compila e envia a integridade material de todas as provas diretamente ao build receptor do Google Docs para preenchimento de placeholders, indexação e arquivamento automatizado na pasta em tempo real.
                      </p>
                    </div>
                  </div>

                  {!driveFolderId ? (
                    <div className="p-4 bg-rose-50/80 border border-rose-150 rounded-2xl flex items-start gap-3 text-rose-950 text-xs font-semibold leading-relaxed">
                      <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-rose-950">
                        <p className="font-extrabold uppercase text-[9px] tracking-wider text-rose-800 font-mono">Pasta do Cliente Ausente</p>
                        <p className="font-medium text-rose-900 leading-relaxed text-xs">
                          Não é possível gerar o Relatório de Provas para o Google Docs porque a pasta do cliente no Google Drive não está configurada.
                        </p>
                        <p className="text-[10px] text-rose-700 font-semibold italic">
                          Por favor, cadastre ou sincronize a pasta do Drive nas configurações de cadastro do cliente antes de prosseguir.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* CONFIGURAÇÕES DA AUTOMAÇÃO */}
                      <div className="border border-blue-155 rounded-2xl overflow-hidden bg-white/80">
                        <button
                          type="button"
                          onClick={() => setIsGdiSettingsOpen(!isGdiSettingsOpen)}
                          className="w-full px-4.5 py-3 flex items-center justify-between bg-white border-b border-gray-150 hover:bg-gray-55 transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Settings size={14} className="text-blue-600 animate-[spin_8s_linear_infinite]" />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono">Configurações do Google Docs</span>
                          </div>
                          <span className="text-[11px] font-black uppercase text-blue-600 hover:text-blue-800 font-sans">
                            {isGdiSettingsOpen ? 'Ocultar' : 'Visualizar'}
                          </span>
                        </button>

                        {isGdiSettingsOpen && (
                          <div className="p-4.5 space-y-4 bg-white animate-fadeIn text-xs">
                            <div className="space-y-1">
                              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Identificador da Pasta do Cliente (Pasta ID)</p>
                              <p className="font-mono bg-gray-55 border border-gray-150 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 select-all max-w-fit break-all">
                                {driveFolderId}
                              </p>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Template Oficial de Relatório de Provas PF</p>
                              <a
                                href="https://docs.google.com/document/d/1BPIOSWMjvLsSWzo_NcMjixrYUhmq7sKW2pRjdp1bS0s/edit"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-blue-650 hover:text-blue-850 font-extrabold hover:underline"
                              >
                                <FileCode size={14} className="text-blue-500" />
                                <span>Ver template no Google Docs</span>
                                <ExternalLink size={12} className="stroke-[2.5]" />
                              </a>
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => navigate('/boss-giffoni-clientes/configuracoes/integracoes-google-docs')}
                                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800"
                              >
                                Configurar Google Docs <ArrowRight size={10} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Informações da pasta do cliente */}
                      <div className="p-4 bg-white border border-gray-150 rounded-2xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
                        <div className="space-y-1 select-none">
                          <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider">Destino da Pasta Associada</p>
                          <p className="text-slate-800 font-extrabold text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse" />
                            <span>Pasta do Google Drive ({clientName || "Cliente"})</span>
                          </p>
                        </div>
                        {driveFolderUrl && (
                          <a
                            href={driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-250 hover:border-blue-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-3xs whitespace-nowrap"
                          >
                            <div className="flex items-center gap-0.5 mr-1.5 bg-white shadow-3xs border border-gray-100 px-1 py-0.5 rounded-md size-fit shrink-0">
                              <span className="w-1 h-3.5 bg-[#4285F4] rounded-full" />
                              <span className="w-1 h-3.5 bg-[#34A853] rounded-full" />
                              <span className="w-1 h-3.5 bg-[#FBBC05] rounded-full" />
                            </div>
                            <span>Abrir pasta no Drive</span>
                            <ExternalLink size={12} className="stroke-[2.5]" />
                          </a>
                        )}
                      </div>

                      {/* STATUS DA AUTOMAÇÃO */}
                      <div className="border border-blue-150 rounded-2xl p-5 bg-white space-y-2.5 bg-white/80">
                        <p className="font-bold text-blue-500 text-[10px] uppercase tracking-widest font-mono">Status da Automação</p>
                        
                        {caseObj?.relatorioProvasGoogleDocsUrl ? (
                          <div className="p-3 bg-blue-55 border border-blue-200 rounded-xl text-blue-950 text-xs font-bold leading-relaxed flex items-center gap-2 font-mono">
                            <CheckCircle2 className="text-blue-600" size={16} />
                            <span>Relatório de Provas gerado com sucesso! ✅</span>
                          </div>
                        ) : generatingRelatorio ? (
                          <div className="p-3 bg-blue-50/50 border border-blue-250 rounded-xl text-blue-900 text-xs font-bold flex items-center gap-2 animate-pulse font-mono">
                            <RefreshCw className="text-blue-500 shrink-0 animate-spin" size={14} />
                            <span>Sincronizando com GDI... Substituindo placeholders secundários</span>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-gray-50/40 border border-gray-200 rounded-xl text-gray-400 text-xs font-semibold flex items-center gap-2 font-mono">
                            <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
                            <span>Aguardando comando de geração do relatório integrado.</span>
                          </div>
                        )}
                      </div>

                      {caseObj?.relatorioProvasGoogleDocsUrl && (
                        <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-3xs animate-in slide-in-from-top-1 duration-200">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-blue-50 border border-blue-150 rounded-xl text-blue-650">
                              <FileText size={20} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Documento do Google Docs</h3>
                              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                O arquivo de Relatório de Provas de etapa 5 já foi assinalado e está pronto para consulta.
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 pt-1.5">
                            <a
                              href={caseObj.relatorioProvasGoogleDocsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-4.5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-3xs cursor-pointer font-bold w-full"
                            >
                              <ExternalLink size={13} />
                              <span>Abrir Relatório no Google Docs</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyRelatorioLink(caseObj.relatorioProvasGoogleDocsUrl)}
                              className={`inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-black uppercase transition-all border shadow-3xs cursor-pointer font-bold w-full ${
                                copiedRelatorio 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                                  : 'bg-white border-gray-250 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {copiedRelatorio ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copiedRelatorio ? "Link Copiado!" : "Copiar Link"}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ACTION REGREATE BUTTON IN COLUNA UNICA */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleGenerateRelatorioDocs}
                          disabled={generatingRelatorio}
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs transition-all flex items-center justify-center gap-1.5 font-bold"
                        >
                          <RefreshCw size={12} className={generatingRelatorio ? "animate-spin" : ""} />
                          <span>
                            {generatingRelatorio ? "Gerando Relatório..." : caseObj?.relatorioProvasGoogleDocsUrl ? "Regerar Relatório de Provas" : "Gerar Relatório de Provas Solicitadas"}
                          </span>
                        </button>
                      </div>

                      {/* RECENT GDI LOGS ACTION LIST */}
                      {relatorioLogs.length > 0 && (
                        <div className="p-4 bg-gray-55 border border-gray-150 rounded-2xl space-y-2 text-left">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider font-mono">Histórico de Transações GDI</p>
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pl-1">
                            {relatorioLogs.map((log, lIdx) => (
                              <div key={lIdx} className="flex items-start gap-2 text-[11px] leading-tight">
                                <span className="text-gray-400 font-mono text-[9px] shrink-0 pt-0.5">{log.timestamp.split('T')[1].slice(0, 8)}</span>
                                <span className="text-blue-700 font-black font-mono shrink-0 uppercase text-[9px] bg-blue-50 px-1 py-0.5 rounded">{log.step}</span>
                                {log.details && (
                                  <span className="text-gray-600 font-medium truncate"> - {JSON.stringify(log.details)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>

              {/* VERTICAL SECTIONS - 2. MINIMUM MANDATORY DOCUMENTS */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b pb-1">
                  2. Certificação de Provas Mínimas Obrigatórias
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'RG', files: wizardState?.rgFiles || [] },
                    { label: 'CPF', files: wizardState?.cpfFiles || [] },
                    { label: 'Comprovante de residencia', files: wizardState?.comprovanteFiles || [] }
                  ].map((minim, mIdx) => (
                    <div key={mIdx} className="p-3 bg-gray-50/40 border rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-850 truncate max-w-[250px]">{minim.label}</p>
                        <span className="text-[10px] text-gray-400 font-semibold">{minim.files.length} arquivo(s)</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${minim.files.length > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                        {minim.files.length > 0 ? 'Saneado' : 'Ausente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VERTICAL SECTIONS - 3. OTHER CUSTOM CLIENT EVIDENCE */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b pb-1">
                  3. outras Provas solicitadas
                </h3>
                {customProvas.length > 0 ? (
                  <div className="space-y-3">
                    {customProvas.map((req, rIdx) => {
                      const proofState = wizardState?.q5_provas?.[req.id] || { received: 'nao' };
                      return (
                        <div key={rIdx} className="p-3 bg-gray-50/50 border rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-mono font-bold block w-max uppercase mb-1">{req.documentNumber || 'ADICIONAL'}</span>
                            <span className="font-extrabold text-gray-800 block">{req.title}</span>
                            <span className="text-[11px] text-gray-400 font-semibold">{req.evidenceType}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${proofState.received === 'sim' ? 'bg-emerald-50 text-emerald-850' : 'bg-red-50 text-red-850'}`}>
                              {proofState.received === 'sim' ? 'Recebido' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-405 italic bg-gray-50/55 p-3 rounded-xl border border-dashed border-gray-200">
                    Nenhuma outra prova específica exigida para o caso de instrução.
                  </p>
                )}
              </div>

              {/* ACTION PORT BOSS BUTTON */}
              <div className="pt-4 border-t border-gray-100 flex flex-col items-stretch">
                <button
                  type="button"
                  onClick={handleConfirmConsolidate}
                  disabled={saving}
                  className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    wizardState?.step5_consolidado_completed 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>
                    {saving ? 'Processando consolidado...' : wizardState?.step5_consolidado_completed ? 'Relatório Já Validado' : 'Validar e Consolidar Custódia de Provas'}
                  </span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </FluxoStepLayout>
  );
}
