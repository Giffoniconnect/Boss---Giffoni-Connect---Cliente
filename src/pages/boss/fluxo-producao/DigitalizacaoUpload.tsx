import React, { useState, useEffect } from 'react';
import { useColetaState } from './hooks/useColetaState';
import { flowRoutes } from './utils/flowRoutes';
import FluxoStepLayout from './components/FluxoStepLayout';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Loader2,
  FileCheck2,
  FolderLock,
  RefreshCw,
  Server,
  CloudLightning,
  AlertTriangle,
  History,
  QrCode,
  FolderOpen,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface DocItem {
  id: string;
  label: string;
  key: string;
  field: string;
  prefix: string;
  required: boolean;
}

export default function DigitalizacaoUpload() {
  const {
    caseId,
    client,
    clientName,
    clientSlug,
    caseObj,
    wizardState,
    saveWizardStateUpdate,
    addWizardFile,
    removeWizardFile,
    fetching,
    saving,
    navigate
  } = useColetaState();

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localComments, setLocalComments] = useState<string>('');
  const [activeSubetapa, setActiveSubetapa] = useState<'digitalizacao' | 'auditoria'>('digitalizacao');

  const isPJ = client?.type === 'PJ';
  const suffix = isPJ ? 'PJ' : 'PF';

  // Load digitalizacao comments or log if available
  useEffect(() => {
    if (wizardState?.digitalizacao_notes) {
      setLocalComments(wizardState.digitalizacao_notes);
    }
  }, [wizardState]);

  // Handle comments save
  const handleSaveNotes = async () => {
    try {
      await saveWizardStateUpdate({
        digitalizacao_notes: localComments
      });
      setSuccessMsg("Observações de digitalização salvas com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg("Erro ao salvar observações: " + err.message);
    }
  };

  // Toggle audit validation checklist
  const handleToggleAuditVerification = async (itemId: string) => {
    const currentVal = wizardState?.[`audit_verified_${itemId}`] || false;
    try {
      await saveWizardStateUpdate({
        [`audit_verified_${itemId}`]: !currentVal
      });
      setSuccessMsg(`Situação do documento alterada com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 3050);
    } catch (err: any) {
      setErrorMsg("Falha ao salvar auditoria de conformidade: " + err.message);
    }
  };

  // Define document list dynamically based on Client Type
  const pfDocs: DocItem[] = [
    { id: 'procuracao', label: 'Procuração (PF)', key: 'p', field: 'procuracaoFiles', prefix: 'Doc. 01 - Procuração', required: true },
    { id: 'declaracao', label: 'Declaração de Hipossuficiência', key: 'd', field: 'declaracaoFiles', prefix: 'Doc. 02 - Declaração de Hipossuficiência', required: true },
    { id: 'contrato', label: 'Contrato de Honorários (PF)', key: 'c', field: 'contratoFiles', prefix: 'Doc. 03 - Contrato de Honorários', required: true },
    { id: 'rg', label: 'Documento de Identidade (RG/CNH)', key: 'rg', field: 'rgFiles', prefix: 'Doc. 04 - RG', required: true },
    { id: 'cpf', label: 'Cadastro de Pessoa Física (CPF)', key: 'cpf', field: 'cpfFiles', prefix: 'Doc. 05 - CPF', required: true },
    { id: 'residencia', label: 'Comprovante de Residência', key: 'residencia', field: 'residenciaFiles', prefix: 'Doc. 06 - Comprovante de Residência', required: true }
  ];

  const pjDocs: DocItem[] = [
    { id: 'cnpj', label: 'Cartão CNPJ Atualizado', key: 'cnpj', field: 'cnpjFiles', prefix: 'Doc. 01 - CNPJ', required: true },
    { id: 'contratoSocial', label: 'Contrato Social ou Estatuto', key: 'social', field: 'contratoSocialFiles', prefix: 'Doc. 02 - Contrato Social', required: true },
    { id: 'enderecoSede', label: 'Comprovante de Endereço da Sede', key: 'sede', field: 'enderecoSedeFiles', prefix: 'Doc. 03 - Comprovante de Endereço da Sede', required: true },
    { id: 'procuracaoPJ', label: 'Procuração (PJ)', key: 'p', field: 'procuracaoFiles', prefix: 'Doc. 04 - Procuração', required: true },
    { id: 'declaracaoPJ', label: 'Declaração de Hipossuficiência (PJ)', key: 'd', field: 'declaracaoFiles', prefix: 'Doc. 05 - Declaração de Hipossuficiência', required: true },
    { id: 'contratoPJ', label: 'Contrato de Honorários (PJ)', key: 'c', field: 'contratoFiles', prefix: 'Doc. 06 - Contrato de Honorários', required: true },
    { id: 'rgSocio', label: 'RG do Sócio Administrador', key: 'rgSocio', field: 'rgSocioFiles', prefix: 'Doc. 07 - RG do Sócio', required: true },
    { id: 'cpfSocio', label: 'CPF do Sócio Administrador', key: 'cpfSocio', field: 'cpfSocioFiles', prefix: 'Doc. 08 - CPF do Sócio', required: true },
    { id: 'residenciaSocio', label: 'Comprovante de Residência do Sócio', key: 'res_socio', field: 'residenciaSocioFiles', prefix: 'Doc. 09 - Comprovante de Residência do Sócio', required: true }
  ];

  const docs = isPJ ? pjDocs : pfDocs;

  // File uploading handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, item: DocItem) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const sizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    const lastDotIndex = file.name.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? file.name.substring(lastDotIndex) : '';

    // Precise Naming pattern: 'Doc. XX - [Document Type] - [Client Name][Extension]'
    const cleanClientName = (clientName || 'Cliente').trim();
    const finalName = `${item.prefix} - ${cleanClientName}${extension}`;

    setUploadingField(item.field);
    setErrorMsg(null);

    try {
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = err => reject(err);
      });
      const base64 = await base64Promise;

      // Google Drive access token from local storage
      const googleAccessToken = localStorage.getItem('oauth_google_access_token') ||
                                localStorage.getItem('portal_boss_google_accessToken');

      const targetFolder = (client?.googleDriveClientFolderId || client?.gdriveFolderId || caseObj?.gdriveFolderId || '').trim();

      const response = await fetch('/api/google-docs/upload-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folderId: targetFolder || '1YUl0Z3hbptBaXfdp0vSnvGTQv0ChsPMs', // fallback standard folder
          fileName: finalName,
          fileBase64: base64,
          mimeType: file.type,
          googleAccessToken
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.errorMessage || 'Falha ao enviar arquivo para o Google Drive através do Gateway');
      }

      // Add to local wizard files list
      await addWizardFile(item.field, finalName, sizeStr, resData.webViewLink || '');
      setSuccessMsg(`Documento incorporado e sincronizado com o Drive: "${finalName}"`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro de integração ao enviar "${finalName}": ${err.message || err}`);
    } finally {
      setUploadingField(null);
    }
  };

  // Resolve status functions for row items
  const getDocStatuses = (item: DocItem) => {
    const fileList = wizardState[item.field] || [];
    const isUploaded = fileList.length > 0;

    let received = 'nao';
    let receivedChannel = '';
    let autoDigitalize = '';

    // Map wizardState questions based on document type to determine if received physically (requires digitalization)
    if (item.id === 'procuracao' || item.id === 'procuracaoPJ') {
      received = wizardState.q1_3 || 'nao';
      receivedChannel = wizardState.q1_como_p_recebida || '';
      autoDigitalize = wizardState.q1_deseja_digitalizar_p || '';
    } else if (item.id === 'declaracao' || item.id === 'declaracaoPJ') {
      received = wizardState.q2_4 || 'nao';
      receivedChannel = wizardState.q2_como_d_recebida || '';
      autoDigitalize = wizardState.q2_deseja_digitalizar_d || '';
    } else if (item.id === 'contrato' || item.id === 'contratoPJ') {
      received = wizardState.q3_4 || 'nao';
      receivedChannel = wizardState.q3_como_c_recebida || '';
      autoDigitalize = wizardState.q3_deseja_digitalizar_c || '';
    } else if (item.id === 'rg' || item.id === 'rgSocio') {
      received = wizardState.q4_rg === 'sim' || (wizardState.rgFiles?.length > 0) ? 'sim' : 'nao';
      receivedChannel = wizardState.rgFiles?.length > 0 ? 'whatsapp' : 'fisico';
      autoDigitalize = wizardState.q4_rg_digitalizar_agora || '';
    } else if (item.id === 'cpf' || item.id === 'cpfSocio') {
      received = wizardState.q4_cpf === 'sim' || (wizardState.cpfFiles?.length > 0) ? 'sim' : 'nao';
      receivedChannel = wizardState.cpfFiles?.length > 0 ? 'whatsapp' : 'fisico';
      autoDigitalize = wizardState.q4_cpf_digitalizar_agora || '';
    } else if (item.id === 'residencia' || item.id === 'residenciaSocio') {
      received = wizardState.q4_residencia === 'sim' || (wizardState.residenciaFiles?.length > 0) ? 'sim' : 'nao';
      receivedChannel = wizardState.residenciaFiles?.length > 0 ? 'whatsapp' : 'fisico';
      autoDigitalize = wizardState.q4_residencia_digitalizar_agora || '';
    } else {
      // CNPJ, Contrato Social, Endereço Sede fallback
      received = fileList.length > 0 ? 'sim' : 'nao';
      receivedChannel = 'whatsapp';
      autoDigitalize = 'sim';
    }

    // Determine Digitalization status
    let tagDigitalizacao: 'digitalizado' | 'pendente' | 'n_a' = 'n_a';
    if (isUploaded) {
      tagDigitalizacao = 'digitalizado';
    } else if (received === 'sim') {
      if (receivedChannel === 'fisico' && autoDigitalize === 'nao') {
        tagDigitalizacao = 'pendente';
      } else {
        tagDigitalizacao = 'digitalizado';
      }
    }

    // Determine Upload status
    let tagUpload: 'concluido' | 'pendente' | 'aguardando' = 'aguardando';
    if (isUploaded) {
      tagUpload = 'concluido';
    } else if (received === 'sim') {
      tagUpload = 'pendente';
    }

    return {
      received: received === 'sim',
      channel: receivedChannel || 'Não especificado',
      digitalizacao: tagDigitalizacao,
      upload: tagUpload,
      fileList
    };
  };

  // Quick Action: Mark physical doc as digitalized (sets qX_deseja_digitalizar = 'sim')
  const handleMarkAsDigitalized = async (item: DocItem) => {
    try {
      if (item.id === 'procuracao' || item.id === 'procuracaoPJ') {
        await saveWizardStateUpdate({ q1_deseja_digitalizar_p: 'sim', q1_como_p_recebida: 'email' });
      } else if (item.id === 'declaracao' || item.id === 'declaracaoPJ') {
        await saveWizardStateUpdate({ q2_deseja_digitalizar_d: 'sim', q2_como_d_recebida: 'email' });
      } else if (item.id === 'contrato' || item.id === 'contratoPJ') {
        await saveWizardStateUpdate({ q3_deseja_digitalizar_c: 'sim', q3_como_c_recebida: 'email' });
      }
      setSuccessMsg(`Documento "${item.label}" marcado como digitalizado!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg("Erro ao alterar estado: " + err.message);
    }
  };

  // Main status calculations for header metrics
  const calculatedStatuses = docs.map(d => getDocStatuses(d));
  
  const totalDocsCount = docs.length;
  const numDigitalized = calculatedStatuses.filter(s => s.digitalizacao === 'digitalizado').length;
  const numPendingDig = calculatedStatuses.filter(s => s.digitalizacao === 'pendente').length;
  const numUploaded = calculatedStatuses.filter(s => s.upload === 'concluido').length;
  const numPendingUpload = calculatedStatuses.filter(s => s.upload === 'pendente').length;

  const pctCompleted = Math.round((numUploaded / totalDocsCount) * 100) || 0;

  const numAudited = docs.filter(d => wizardState?.[`audit_verified_${d.id}`] === true).length;
  const pctAudited = Math.round((numAudited / totalDocsCount) * 100) || 0;

  // Complete Step
  const handleToggleStepCompleted = async () => {
    const currentStatus = wizardState?.digitalizacao_upload_completed || false;
    try {
      await saveWizardStateUpdate({
        digitalizacao_upload_completed: !currentStatus
      });
      setSuccessMsg(!currentStatus ? "Etapa de Digitalização/Upload finalizada!" : "Etapa reaberta!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar situação final do fluxo: " + err.message);
    }
  };

  if (fetching) {
    return (
      <FluxoStepLayout stepName="Digitalização & Central de Uploads" caseId={caseId}>
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-[2rem] shadow-xs">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-bold font-sans text-sm tracking-tight">Sincronizando faturamento, cadastro e repositório de arquivos...</p>
        </div>
      </FluxoStepLayout>
    );
  }

  return (
    <FluxoStepLayout stepName="Digitalização e Central de Uploads" caseId={caseId}>
      <div className="space-y-6">
        
        {/* Banner with general instructions */}
        <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-gray-250">
          <div className="space-y-1.5 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 rounded-full border border-sky-150">
              <CloudLightning size={12} /> CENTRAL DE PROCESSAMENTO E DIGITAIS
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Processamento de Digitalização & Uploads
            </h1>
            <p className="text-sm font-semibold text-gray-400 leading-relaxed md:w-11/12">
              Gerencie centralizadamente todos os documentos coletados do cliente <strong className="text-gray-700">{clientName || 'indefinido'}</strong>. 
              Aqui você faz o upload definitivo no Google Drive e monitora o que está pendente de digitalização física, corrigindo as pendências do fluxo operacional.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => navigate(flowRoutes.solicitacoesProvas(caseId!))}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-2xl text-xs font-bold text-gray-600 flex items-center gap-2 cursor-pointer transition-all outline-none"
            >
              <ArrowLeft size={14} /> Voltar para Coleta
            </button>
            <button
              onClick={() => navigate(flowRoutes.solicitacoesInformacoes(caseId!))}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-xs transition-all outline-none"
            >
              Info. Complementares <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Diagnostic notification messages */}
        {errorMsg && (
          <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold text-rose-800">Falha na Operação</p>
              <p className="text-xs text-rose-600 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50/70 border border-emerald-250 p-4 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold text-emerald-800">Sincronização Ativa</p>
              <p className="text-xs text-emerald-600 mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* 2 Subetapas Selector */}
        <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-xs space-y-4">
          <div className="text-left font-sans">
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Subetapas do Setor de Digitalização e Uploads
            </h3>
            <p className="text-[12px] text-gray-400 font-semibold mt-0.5">
              Gerencie de forma independente cada fase do processamento digital de ativos e auditoria da Giffoni Advogados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subetapa 1 Button */}
            <button
              type="button"
              onClick={() => setActiveSubetapa('digitalizacao')}
              className={`flex items-center justify-between p-4.5 border rounded-2xl text-left cursor-pointer outline-none relative overflow-hidden group transition-all ${
                activeSubetapa === 'digitalizacao'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs scale-[1.01]'
                  : numUploaded > 0
                  ? 'bg-emerald-50/55 border-emerald-150 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-250 hover:shadow-xs'
                  : 'bg-gray-50/50 border-gray-150 text-gray-655 hover:bg-gray-100 hover:border-gray-250 hover:text-gray-950'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0 font-sans">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  activeSubetapa === 'digitalizacao' ? 'bg-indigo-500 text-white' : numUploaded > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-150 text-gray-400'
                }`}>
                  <Upload size={18} />
                </div>
                <div className="min-w-0">
                  <span className={`text-[10px] uppercase font-black tracking-widest block font-mono ${activeSubetapa === 'digitalizacao' ? 'text-indigo-200' : 'text-gray-450'}`}>
                    Subetapa 01 / 02
                  </span>
                  <span className="text-[13px] font-extrabold tracking-tight block leading-tight mt-0.5">
                    Setor de Digitalização e Uploads
                  </span>
                  <span className={`text-[11px] block mt-0.5 opacity-85 ${activeSubetapa === 'digitalizacao' ? 'text-indigo-150' : 'text-gray-500'}`}>
                    {numUploaded} de {totalDocsCount} sincronizados
                  </span>
                </div>
              </div>
              
              {numUploaded === totalDocsCount && (
                <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-black shadow-xs">
                  ✓
                </div>
              )}
            </button>

            {/* Subetapa 2 Button */}
            <button
              type="button"
              onClick={() => setActiveSubetapa('auditoria')}
              className={`flex items-center justify-between p-4.5 border rounded-2xl text-left cursor-pointer outline-none relative overflow-hidden group transition-all ${
                activeSubetapa === 'auditoria'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs scale-[1.01]'
                  : wizardState?.digitalizacao_upload_completed === true
                  ? 'bg-emerald-50/55 border-emerald-150 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-250 hover:shadow-xs'
                  : 'bg-gray-50/50 border-gray-150 text-gray-655 hover:bg-gray-100 hover:border-gray-250 hover:text-gray-950'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0 font-sans">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  activeSubetapa === 'auditoria' ? 'bg-indigo-500 text-white' : wizardState?.digitalizacao_upload_completed === true ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-150 text-gray-400'
                }`}>
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <span className={`text-[10px] uppercase font-black tracking-widest block font-mono ${activeSubetapa === 'auditoria' ? 'text-indigo-200' : 'text-gray-450'}`}>
                    Subetapa 02 / 02
                  </span>
                  <span className="text-[13px] font-extrabold tracking-tight block leading-tight mt-0.5">
                    Auditoria do Setor de Digitalização
                  </span>
                  <span className={`text-[11px] block mt-0.5 opacity-85 ${activeSubetapa === 'auditoria' ? 'text-indigo-150' : 'text-gray-500'}`}>
                    {numAudited} de {totalDocsCount} auditados
                  </span>
                </div>
              </div>

              {numAudited === totalDocsCount && (
                <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-black shadow-xs">
                  ✓
                </div>
              )}
            </button>
          </div>
        </div>

        {/* SUBETAPA 01 - Setor de Digitalização e Uploads */}
        {activeSubetapa === 'digitalizacao' && (
          <div className="space-y-6 animate-fade-in text-left">
            {/* Bento Grid layout containing global statistics & workflow metadata */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-150 rounded-[2rem] p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileCheck2 size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total de Documentos</span>
              <p className="text-xl font-black text-gray-900 tracking-tight">{totalDocsCount}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-[2rem] p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Já Digitalizados ({numDigitalized})</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xl font-black text-gray-900 tracking-tight">
                  {numDigitalized === totalDocsCount ? '100%' : `${numDigitalized} / ${totalDocsCount}`}
                </span>
                {numPendingDig > 0 && (
                  <span className="text-[10px] bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded-full border border-amber-200">
                    {numPendingDig} físicos pendentes
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-[2rem] p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Upload size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Upload Concluído</span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-gray-900 tracking-tight">{numUploaded} / {totalDocsCount}</span>
                <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden shrink-0">
                  <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${pctCompleted}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-[2rem] p-5 shadow-xs flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${numPendingUpload > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
              <AlertCircle size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Pendentes de Upload</span>
              <p className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                {numPendingUpload}
                {numPendingUpload > 0 ? (
                  <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-1.5 py-0.5 rounded-full border border-red-200">
                    Ação Necessária
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-200">
                    Processo em ordem
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Document Tracking List */}
        <div className="bg-white border border-gray-150 rounded-[2rem] shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-150 bg-gray-50/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">Ledger de Controle de Digitalização</h2>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Veja a listagem definitiva de itens. Conclua os uploads pendentes aplicando a padronização oficial de arquivos.</p>
            </div>
            
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-xs text-gray-500">Formato de Nomenclatura Ativo:</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded text-[10px] font-mono font-black text-indigo-700 tracking-tight border border-gray-250">
                Doc. XX - [Tipo de Documento] - {clientName || 'Nome do Cliente'}
              </kbd>
            </div>
          </div>

          <div className="divide-y divide-gray-150">
            {docs.map((docItem, index) => {
              const status = getDocStatuses(docItem);
              const isUploadingThis = uploadingField === docItem.field;

              return (
                <div key={docItem.id} className="p-6 bg-white hover:bg-gray-50/40 transition-colors flex flex-col space-y-4">
                  
                  {/* 1. Tipo de Documento */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">0{index + 1}</span>
                      <h4 className="text-sm lg:text-base font-black text-gray-900 tracking-tight">{docItem.label}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-400">Padrão de nomeação final no Drive:</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-mono text-gray-700 font-semibold break-all">
                        {docItem.prefix} - {clientName || 'Cliente'}
                      </span>
                    </div>
                  </div>

                  {/* Separator line */}
                  <div className="border-t border-gray-100 my-1"></div>

                  {/* Vertical elements stacked exactly one under another */}
                  <div className="space-y-3.5">
                    
                    {/* 2. Origem do Recebimento */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="text-xs font-black uppercase text-gray-400 tracking-wider w-48 shrink-0">Origem do Recebimento:</span>
                      <div>
                        {status.received ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-extrabold capitalize ${status.channel === 'fisico' ? 'text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg' : 'text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg'}`}>
                            ● {status.channel === 'fisico' ? '📄 Físico (papel)' : `📱 Digital (${status.channel})`}
                          </span>
                        ) : (
                          <span className="text-xs font-extrabold text-gray-450 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">Aguardando Coleta</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Situação de Digitalização */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="text-xs font-black uppercase text-gray-400 tracking-wider w-48 shrink-0">Situação de Digitalização:</span>
                      <div>
                        {status.digitalizacao === 'digitalizado' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-black text-xs tracking-tight border border-emerald-150">
                            Digitalizado
                          </span>
                        ) : status.digitalizacao === 'pendente' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-black text-xs tracking-tight border border-amber-150">
                            Pendente Física (Setor)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full font-black text-xs tracking-tight border border-gray-150">
                            Não aplicável
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4. Upload no Google Drive */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="text-xs font-black uppercase text-gray-400 tracking-wider w-48 shrink-0">Upload no Google Drive:</span>
                      <div>
                        {status.upload === 'concluido' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full font-black text-xs tracking-tight border border-sky-150">
                            Concluído no Drive
                          </span>
                        ) : status.upload === 'pendente' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-full font-black text-xs tracking-tight border border-red-150">
                            Pendente de Upload
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-400 rounded-full font-black text-xs tracking-tight border border-gray-200">
                            Aguardando
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 5. Fazer Upload e Renomear (renomeado para Upload e Renomeação Automatica) */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 pt-1">
                      <span className="text-xs font-black uppercase text-gray-400 tracking-wider w-48 shrink-0 mt-1">Ações / Arquivo:</span>
                      <div className="flex-1 w-full space-y-3">
                        {status.received && status.upload !== 'concluido' && (
                          <div className="flex flex-wrap items-center gap-3">
                            {status.digitalizacao === 'pendente' && (
                              <button
                                onClick={() => handleMarkAsDigitalized(docItem)}
                                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-black tracking-tight cursor-pointer transition-colors"
                              >
                                Forçar como Digitalizado
                              </button>
                            )}
                            
                            <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black tracking-tight cursor-pointer transition-colors">
                              {isUploadingThis ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>Sincronizando...</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={14} />
                                  <span>Upload e Renomeação Automatica</span>
                                </>
                              )}
                              <input
                                type="file"
                                className="hidden"
                                disabled={isUploadingThis}
                                onChange={(e) => handleFileUpload(e, docItem)}
                              />
                            </label>
                          </div>
                        )}

                        {/* Already uploaded file list. Built carefully with deep widths and word-breaks to prevent any spill & keep robust padding */}
                        {status.fileList.length > 0 ? (
                          <div className="space-y-1.5 w-full max-w-xxl">
                            {status.fileList.map((file: any, fIdx: number) => (
                              <div key={fIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-indigo-50/50 border border-indigo-150 rounded-xl gap-3 w-full">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <FileText size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-mono font-bold text-gray-900 text-xs break-all whitespace-normal leading-relaxed">
                                      {file.name}
                                    </p>
                                    <span className="text-[10px] text-indigo-500 font-extrabold block mt-0.5">Tamanho: {file.size} - Sincronizado</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeWizardFile(docItem.field, fIdx)}
                                  className="p-2 text-xs font-black text-red-500 hover:bg-red-50 border border-transparent hover:border-red-150 rounded-lg cursor-pointer transition-colors shrink-0 outline-none text-right"
                                >
                                  Excluir
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : status.upload === 'concluido' ? (
                          <p className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1.5">
                            <span className="text-emerald-500">✓</span> Atribuído / Sincronizado por canal direto no fluxo
                          </p>
                        ) : (
                          <div className="p-4 border border-dashed border-gray-200 rounded-2xl text-left bg-gray-50/30 max-w-md">
                            <p className="text-xs text-gray-400 font-semibold leading-relaxed">Nenhum arquivo de upload definitivo anexado a esta seção.</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Operational logs & notes regarding digitalizations */}
        <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight">Observações Operacionais do Setor de Digitalização</h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Registre comentários relacionados à integridade física do acervo ou status de envio.</p>
            </div>
            
            <textarea
              className="w-full h-24 p-3 border border-gray-200 rounded-2xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              placeholder="Ex: Contrato assinado foi guardado na caixa de arquivo número 12, pendente de assinatura física do segundo sócio..."
              value={localComments}
              onChange={(e) => setLocalComments(e.target.value)}
            />

            <div className="flex justify-end">
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : "Salvar Observações"}
              </button>
            </div>
          </div>

          <div className="p-5 bg-indigo-50/30 border border-indigo-100 rounded-3xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block font-mono">Processamento de Lote</span>
              <h4 className="text-xs font-black text-indigo-900 tracking-tight">Abertura de Guia Física</h4>
              <p className="text-[11px] font-semibold text-indigo-700/80 leading-relaxed">
                As guias impressas que estão classificadas como <span className="underline">Pendente Física (Setor)</span> contam com armazenamento de segurança. O protocolo documental do caso será auditado na etapa de Compliance antes da distribuição do processo judicial.
              </p>
            </div>

            <div className="pt-2 border-t border-indigo-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-bold">Protocolo físico:</span>
              <span className="text-[10px] font-mono font-bold text-gray-700 bg-white border border-gray-150 px-2 py-0.5 rounded">
                CASE-{caseId?.substring(0, 8).toUpperCase()}-DIG
              </span>
            </div>
          </div>
        </div>
          </div>
        )}

        {/* SUBETAPA 02: AUDITORIA DO SETOR DE DIGITALIZAÇÃO E UPLOADS */}
        {activeSubetapa === 'auditoria' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Integrated Drive and Folder Information box */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
              
              {/* Folder Access Card */}
              <div className="lg:col-span-2 bg-[#5cb85c]/5 border border-[#5cb85c]/25 hover:border-[#5cb85c]/45 rounded-3xl p-6 transition flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-3xs shrink-0">
                    <FolderOpen size={26} className="stroke-[2px]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider font-mono">Repositório Geral Integrado</span>
                    <h4 className="font-extrabold text-gray-900 text-sm mt-0.5 truncate max-w-sm">
                      Pasta do Caso no Google Drive
                    </h4>
                    <span className="text-[11px] font-mono font-medium text-gray-450 block truncate max-w-xs sm:max-w-md">
                      Google Drive Folder ID: {client?.googleDriveClientFolderId || client?.gdriveFolderId || caseObj?.gdriveFolderId || '1YUl0Z3hbptBaXfdp0vSnvGTQv0ChsPMs'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const targetFolder = (client?.googleDriveClientFolderId || client?.gdriveFolderId || caseObj?.gdriveFolderId || '').trim();
                    const folderLink = `https://drive.google.com/drive/folders/${targetFolder || '1YUl0Z3hbptBaXfdp0vSnvGTQv0ChsPMs'}`;
                    window.open(folderLink, '_blank', 'noopener,noreferrer');
                  }}
                  className="py-3 px-5 bg-[#5cb85c] hover:bg-[#4cae4c] hover:shadow-xs text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <span>Abrir pasta de destino</span>
                  <ExternalLink size={13} />
                </button>
              </div>

              {/* Audit Progress Card */}
              <div className="bg-white border border-gray-150 rounded-3xl p-6 flex flex-col justify-between text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Aprovação da Auditoria</span>
                  <span className="text-xs font-black text-indigo-600 font-mono">
                    {pctAudited}% completo
                  </span>
                </div>
                
                <div className="mt-2.5">
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-550"
                      style={{ width: `${pctAudited}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 font-semibold mt-3 leading-relaxed">
                  {numAudited} de {totalDocsCount} documentos assinados e certificados pelo auditor de integridade.
                </p>
              </div>

            </div>

            {/* Audit Ledger table */}
            <div className="bg-white border border-gray-150 rounded-[2rem] shadow-xs overflow-hidden">
              <div className="p-6 border-b border-gray-150 bg-gray-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
                <div>
                  <h2 className="text-base font-black text-gray-900 tracking-tight">Painel de Coleta & Auditoria de Ativos Estendida</h2>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Validação visual e acionamento direto de cada arquivo digitalizado e armazenado na nuvem.</p>
                </div>

                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 text-[11px] text-indigo-800 font-bold">
                  <ShieldCheck size={14} className="text-indigo-600 animate-pulse" />
                  <span>Controle Criptográfico Ativo</span>
                </div>
              </div>

              <div className="divide-y divide-gray-150 text-left font-sans">
                {docs.map((docItem, index) => {
                  const status = getDocStatuses(docItem);
                  const isVerified = wizardState?.[`audit_verified_${docItem.id}`] === true;

                  return (
                    <div key={docItem.id} className="p-6 bg-white hover:bg-gray-50/30 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-left">
                      {/* Document Info */}
                      <div className="space-y-1 block text-left md:max-w-xs lg:max-w-md w-full">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg text-xs font-bold font-mono flex items-center justify-center ${isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                            0{index + 1}
                          </span>
                          <h4 className="text-sm font-black text-gray-850 tracking-tight leading-snug">{docItem.label}</h4>
                        </div>
                        <p className="text-[11px] font-mono text-gray-400 tracking-tight truncate">
                          {docItem.prefix} - {clientName || 'Cliente'}
                        </p>
                      </div>

                      {/* Files details and Link */}
                      <div className="flex-1 w-full min-w-0 block text-left">
                        {status.fileList.length > 0 ? (
                          <div className="space-y-1.5 w-full">
                            {status.fileList.map((file: any, fIdx: number) => {
                              // construct search URL if url missing
                              const openUrl = file.url || `https://drive.google.com/drive/search?q=${encodeURIComponent(file.name)}`;
                              return (
                                <div key={fIdx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-gray-150 rounded-xl gap-3 text-xs w-full text-left">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <FileText size={15} className="text-indigo-650 shrink-0" />
                                    <span className="font-mono text-gray-750 font-bold truncate max-w-xs">{file.name}</span>
                                    <span className="text-[10px] text-gray-400 font-semibold shrink-0">({file.size})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}
                                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-gray-250 text-gray-655 rounded-lg font-bold font-sans text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <span>Acessar no Drive</span>
                                    <ExternalLink size={10} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-gray-450 bg-gray-50 p-2.5 rounded-xl border border-dashed border-gray-200 block text-left">
                            {status.received ? (
                              <span className="text-amber-600 font-bold">● Pendente de upload definitivo pelo Setor</span>
                            ) : (
                              <span>Aguardando coleta documental</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Verification action */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAuditVerification(docItem.id)}
                          className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isVerified
                              ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-3xs'
                              : 'bg-white border-gray-250 text-gray-650 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200'
                          }`}
                        >
                          {isVerified ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>Auditado ✓</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                              <span>Aprovar Auditoria</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* POP procedures */}
            <div className="bg-indigo-50/40 border border-indigo-150 p-5 rounded-[1.5rem] text-xs font-medium text-indigo-900 grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
              <div className="md:col-span-3 space-y-1 block text-left">
                <p className="font-bold text-indigo-950 flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="text-indigo-655" size={16} />
                  Procedimento Operacional Padrão (POP) de Auditoria
                </p>
                <p className="leading-relaxed font-semibold text-gray-500">
                  A subetapa de auditoria garante a fidelidade de todos os documentos anexados pelo setor de digitalização. Cada documento aprovado é marcado no Ledger Auditável. Ao auditar todos os documentos, marque a atividade como finalizada no botão do painel inferior.
                </p>
              </div>
              <div className="bg-white border border-indigo-100 rounded-xl p-3 flex flex-col justify-center text-center">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block font-mono">Status da Auditoria</span>
                <span className={`text-base font-black uppercase tracking-tight block mt-1 ${pctAudited === 100 ? 'text-emerald-600' : 'text-gray-700'}`}>
                  {pctAudited === 100 ? '✓ COMPLIANTE' : `${numAudited} / ${totalDocsCount}`}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Action Controls for step locking and advancing */}
        <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 font-sans">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FolderLock size={16} className="text-indigo-600" />
              Finalizar Atividade do Fluxo
            </h3>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              Marque esta tarefa como concluída para indicar aos demais setores que a triagem, digitalização e upload automático no Drive foram finalizados.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handleToggleStepCompleted}
              className={`px-5 py-3 rounded-2xl text-xs font-black tracking-tight flex items-center gap-2 cursor-pointer transition-all ${
                wizardState?.digitalizacao_upload_completed === true
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-250 hover:bg-emerald-100/70'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
              }`}
            >
              {wizardState?.digitalizacao_upload_completed === true ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-600 animate-pulse" />
                  <span>Atividade Finalizada! (Clique para Reabrir)</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span>Marcar Atividade como Finalizada</span>
                </>
              )}
            </button>

            {activeSubetapa === 'digitalizacao' ? (
              <button
                onClick={() => setActiveSubetapa('auditoria')}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black tracking-tight shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span>Avançar para Auditoria (Subetapa 02)</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={() => navigate(flowRoutes.solicitacoesInformacoes(caseId!))}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black tracking-tight shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span>Avançar para Info. Complementares</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
