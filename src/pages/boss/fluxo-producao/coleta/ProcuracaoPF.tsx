import React from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import EntregaDocumento from '../components/EntregaDocumento';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Settings, CheckSquare, Sparkles, Check, AlertCircle, RefreshCw, ExternalLink
} from 'lucide-react';
import { doc, setDoc, updateDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export default function ProcuracaoPF() {
  const {
    caseId,
    fetching,
    saving,
    error,
    success,
    clientName,
    client,
    caseObj,
    wizardState,
    saveWizardStateUpdate,
    addWizardFile,
    removeWizardFile,
    navigate,
    driveFolderId,
    driveFolderUrl,
    setError,
    setSuccess,
    setSaving
  } = useColetaState();

  const [activeJob, setActiveJob] = React.useState<any>(null);
  const [forceNewVersion, setForceNewVersion] = React.useState(false);

  // Real-time synchronization and monitoring hook
  React.useEffect(() => {
    if (!caseId) return;

    const q = query(
      collection(db, 'googleDocsJobs'),
      where('caseId', '==', caseId),
      where('documentType', '==', 'procuracao_pf')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const jobs = snapshot.docs.map(d => d.data());
        jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActiveJob(jobs[0]);
      } else {
        setActiveJob(null);
      }
    }, (err) => {
      console.error("Erro na escuta de googleDocsJobs:", err);
    });

    return () => unsubscribe();
  }, [caseId]);

  // Synchronize case fields when job status changes
  React.useEffect(() => {
    if (!activeJob || !caseObj) return;

    const isJobSuccess = activeJob.status === 'success';
    const isJobFailed = activeJob.status === 'failed';

    const caseDocRef = doc(db, 'cases', caseId);

    const updateCaseFromJob = async () => {
      try {
        if (isJobSuccess && caseObj.procuracaoGoogleDocsJobId !== activeJob.id) {
          const hasResultLog = activeJob.logs?.some((l: any) => l.action === 'PORTAL_PROC_PF_RESULT_RECEIVED');
          
          let updatedLogs = [...(activeJob.logs || [])];
          if (!hasResultLog) {
            updatedLogs.push(
              {
                action: "PORTAL_PROC_PF_RESULT_RECEIVED",
                timestamp: new Date().toISOString(),
                message: "Dados do Google Docs recebidos com sucesso pelo Portal BOSS."
              },
              {
                action: "PORTAL_PROC_PF_CASE_UPDATED",
                timestamp: new Date().toISOString(),
                message: "Caso atualizado com o link do documento da Procuração PF."
              }
            );

            await updateDoc(doc(db, 'googleDocsJobs', activeJob.id), {
              logs: updatedLogs,
              updatedAt: new Date().toISOString()
            });
          }

          await updateDoc(caseDocRef, {
            procuracaoStatus: "criada",
            procuracaoGoogleDocsId: activeJob.result?.googleDocsId || '',
            procuracaoGoogleDocsUrl: activeJob.result?.googleDocsUrl || '',
            procuracaoGeneratedAt: activeJob.updatedAt || new Date().toISOString(),
            procuracaoGoogleDocsJobId: activeJob.id,
            procuracaoDestinationFolderId: activeJob.destinationFolderId || '',
            procuracaoDestinationFolderUrl: activeJob.destinationFolderUrl || '',
            procuracaoVersion: activeJob.version || 1
          });
        } else if (isJobFailed && caseObj.procuracaoGoogleDocsJobId !== activeJob.id) {
          const hasFailLog = activeJob.logs?.some((l: any) => l.action === 'PORTAL_PROC_PF_FAILED');
          
          let updatedLogs = [...(activeJob.logs || [])];
          if (!hasFailLog) {
            updatedLogs.push({
              action: "PORTAL_PROC_PF_FAILED",
              timestamp: new Date().toISOString(),
              message: `Falha na geração do documento pelo receptor: ${activeJob.errorMessage || 'Unknown error'}`
            });

            await updateDoc(doc(db, 'googleDocsJobs', activeJob.id), {
              logs: updatedLogs,
              updatedAt: new Date().toISOString()
            });
          }

          await updateDoc(caseDocRef, {
            procuracaoStatus: "falha",
            procuracaoLogFalha: activeJob.errorMessage || 'Erro inesperado na geração do documento pelo build integrador.',
            procuracaoGoogleDocsJobId: activeJob.id
          });
        }
      } catch (err) {
        console.error("Erro ao sincronizar caso com o job de documento:", err);
      }
    };

    updateCaseFromJob();
  }, [activeJob, caseObj, caseId]);

  const handleNextPhase = () => {
    saveWizardStateUpdate({ step1_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-declaracao-PF`);
    });
  };

  const handleSendJob = async () => {
    if (!driveFolderId) {
      setError("Não é possível enviar a Procuração para o Google Docs Integration porque a pasta do cliente ainda não possui googleDriveClientFolderId.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const payload = {
        nomeCompleto: client?.pfDadosPessoais?.pf_nomeCompleto || client?.pfData?.pf_nomeCompleto || '',
        nacionalidade: client?.pfDadosPessoais?.pf_nacionalidade || client?.pfData?.pf_nacionalidade || '',
        estadoCivil: client?.pfDadosPessoais?.pf_estadoCivil || client?.pfData?.pf_estadoCivil || '',
        profissao: client?.pfDadosPessoais?.pf_profissao || client?.pfData?.pf_profissao || '',
        cpf: client?.pfDadosPessoais?.pf_cpf || client?.pfData?.pf_cpf || '',
        rg: client?.pfDadosPessoais?.pf_rg || client?.pfData?.pf_rg || '',
        endereco: client?.pfDadosPessoais?.pf_endereco || client?.pfData?.pf_endereco || '',
        numero: client?.pfDadosPessoais?.pf_numero || client?.pfData?.pf_numero || '',
        complemento: client?.pfDadosPessoais?.pf_complemento || client?.pfData?.pf_complemento || '',
        bairro: client?.pfDadosPessoais?.pf_bairro || client?.pfData?.pf_bairro || '',
        cidade: client?.pfDadosPessoais?.pf_cidade || client?.pfData?.pf_cidade || '',
        estado: client?.pfDadosPessoais?.pf_estado || client?.pfData?.pf_estado || '',
        cep: client?.pfDadosPessoais?.pf_cep || client?.pfData?.pf_cep || '',
        email: client?.pfDadosPessoais?.pf_email || client?.pfData?.pf_email || '',
        telefone: client?.pfDadosPessoais?.pf_telefone || client?.pfData?.pf_telefone || '',
        whatsapp: client?.pfDadosPessoais?.pf_whatsapp || client?.pfData?.pf_whatsapp || '',
        localAssinatura: "Viçosa, MG",
        advogadoNome: "RODRIGO GIFFONI RODRIGUES",
        advogadoOab: "OAB/MG 157.320",
        dataAssinatura: "data da assinatura eletrônica"
      };

      const currentVersion = caseObj?.procuracaoVersion || 1;
      const nextVersion = caseObj?.procuracaoGoogleDocsUrl ? currentVersion + 1 : 1;

      const newJob = {
        id: jobId,
        source: "Portal BOSS Clientes",
        target: "Google Docs Integrations",
        documentType: "procuracao_pf",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        caseId: caseId,
        portalClientId: caseObj?.clientId || '',
        clientType: "PF",
        destinationFolderId: driveFolderId,
        destinationFolderUrl: driveFolderUrl,
        templateKey: "procuracao-pf",
        version: nextVersion,
        payload,
        result: {
          googleDocsId: null,
          googleDocsUrl: null,
          fileName: null
        },
        errorCode: null,
        errorMessage: null,
        logs: [
          {
            action: "PORTAL_PROC_PF_DATA_LOADED",
            timestamp: new Date().toISOString(),
            message: "Dados da Procuração PF carregados com sucesso."
          },
          {
            action: driveFolderId ? "PORTAL_PROC_PF_FOLDER_FOUND" : "PORTAL_PROC_PF_FOLDER_MISSING",
            timestamp: new Date().toISOString(),
            message: driveFolderId ? `Diretório Google Drive do Cliente localizado (${driveFolderId}).` : "Pasta do Google Drive não localizada."
          },
          {
            action: "PORTAL_PROC_PF_JOB_CREATED",
            timestamp: new Date().toISOString(),
            message: `Job ${jobId} criado na coleção googleDocsJobs.`
          },
          {
            action: "PORTAL_PROC_PF_JOB_SENT",
            timestamp: new Date().toISOString(),
            message: `Job ${jobId} enviado ao processador de Integrações do Google Docs.`
          }
        ]
      };

      await setDoc(doc(db, 'googleDocsJobs', jobId), newJob);
      
      await saveWizardStateUpdate({ q1_1: 'sim' });

      setForceNewVersion(false);
      setSuccess("Job enviado ao Build Google Docs Integration.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao disparar automação: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const FileUploadBox = ({ field }: { field: string }) => {
    const files = wizardState[field] || [];
    return (
      <div className="space-y-2 mt-1">
        <label className="group flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer">
          <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-1" size={20} />
          <span className="text-[11px] font-bold text-gray-700">Anexar Procuração Assinada (PDF)</span>
          <input 
            type="file" 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const name = e.target.files[0].name;
                const size = (e.target.files[0].size / 1024 / 1024).toFixed(2) + ' MB';
                addWizardFile(field, name, size);
              }
            }}
          />
        </label>
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-150 rounded-xl text-xs">
                <span className="truncate font-semibold text-indigo-900 flex items-center gap-1">
                  <FileText size={12} /> {f.name} <span className="text-[10px] text-indigo-400 font-normal">({f.size})</span>
                </span>
                <button type="button" onClick={() => removeWizardFile(field, idx)} className="text-rose-600 hover:bg-rose-100 p-1 rounded-lg">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <FluxoStepLayout stepName="Coleta de Documentos" caseId={caseId}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Etapa 1 — Pessoa Física (PF)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{clientName}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Solicitação da Procuração Ad Judicia
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/card-iniciar-coleta-obrigatoria`)}
            className="p-2 bg-gray-50 border border-gray-150 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
          >
            <ArrowLeft size={13} className="mr-1" /> Voltar ao Card
          </button>
        </div>

        {fetching ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 font-mono">Carregando dados da etapa...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* NOTIFICATION TOASTS */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs font-semibold flex gap-2 items-center">
                <AlertCircle size={14} className="text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 text-xs font-bold flex gap-2 items-center">
                <Check className="text-emerald-500 shrink-0" size={14} />
                <span>{success}</span>
              </div>
            )}

            {/* FLOW QUESTIONNAIRE CARD */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-5">
              
              {/* AUTOMAÇÃO INTELIGENTE CARD PANEL */}
              <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/20 border border-indigo-150 rounded-3xl p-6 shadow-3xs space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-2.5 bg-indigo-100 text-indigo-800 rounded-full font-black text-[9px] uppercase tracking-wider font-mono">
                        Automação Ativa
                      </span>
                      <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900">
                      Gerador de Procuração PF via Google Workspace
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      Esta ferramenta envia os dados consolidados do cadastro de pessoa física diretamente ao build receptor do Google Docs para preenchimento de placeholders, indexação e arquivamento automatizado na pasta em tempo real.
                    </p>
                  </div>
                </div>

                {!driveFolderId ? (
                  <div className="p-4 bg-rose-50/80 border border-rose-150 rounded-2xl flex items-start gap-3 text-rose-950 text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
                    <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-rose-950">
                      <p className="font-extrabold uppercase text-[9px] tracking-wider text-rose-800 font-mono">Pasta do Cliente Ausente</p>
                      <p className="font-medium text-rose-900 leading-relaxed text-xs">
                        Não é possível enviar a Procuração para o Google Docs Integration porque a pasta do cliente ainda não possui googleDriveClientFolderId.
                      </p>
                      <p className="text-[10px] text-rose-700 font-semibold italic">
                        Por favor, cadastre ou sincronize a pasta do Drive nas configurações de cadastro do cliente antes de prosseguir.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Informações da pasta do cliente */}
                    <div className="p-3.5 bg-white border border-gray-150 rounded-2xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs animate-in fade-in">
                      <div className="space-y-1">
                        <p className="font-bold text-gray-500 text-[10px] uppercase tracking-wider">Destino da Pasta Associada</p>
                        <p className="text-slate-800 font-extrabold truncate max-w-md flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-pulse" />
                          Pasta ID: <span className="font-mono bg-slate-50 border border-gray-100 rounded px-1.5 py-0.5 font-bold select-all">{driveFolderId}</span>
                        </p>
                      </div>
                      {driveFolderUrl && (
                        <a
                          href={driveFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-150 transition-all cursor-pointer shadow-3xs"
                        >
                          Abrir Pasta <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    {/* Regra Anti-Duplicidade */}
                    {caseObj?.procuracaoGoogleDocsUrl && !forceNewVersion ? (
                      <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4.5 space-y-3.5 animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-start gap-3">
                          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                          <div className="space-y-0.5">
                            <h3 className="text-xs font-black text-amber-950 uppercase tracking-wide">Procuração Detectada</h3>
                            <p className="text-xs text-amber-900 font-medium">
                              Já existe uma Procuração gerada para este caso.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          <a
                            href={caseObj.procuracaoGoogleDocsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase rounded-xl transition-all shadow-3xs cursor-pointer"
                          >
                            <ExternalLink size={13} />
                            Abrir Procuração existente
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setSuccess(null);
                              setForceNewVersion(true);
                            }}
                            className="px-4 py-2 bg-white hover:bg-gray-50 border border-slate-205 text-slate-800 text-xs font-extrabold uppercase rounded-xl transition-all shadow-3xs cursor-pointer"
                          >
                            Gerar nova versão
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Se estiver aguardando / processando o job */}
                        {activeJob?.status === 'pending' ? (
                          <div className="bg-white border border-indigo-150 rounded-2xl p-5 space-y-4 shadow-3xs animate-pulse">
                            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="text-indigo-600 animate-spin" size={17} />
                                <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                                  Aguardando geração da Procuração pelo Build Google Docs.
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">
                                Job ID: {activeJob.id}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full animate-infinite-loading w-3/4"></div>
                              </div>
                            </div>

                            {activeJob?.logs && activeJob.logs.length > 0 && (
                              <div className="mt-3 bg-slate-50 rounded-xl p-3.5 border border-gray-150/50 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Etapas dos Logs em Tempo Real</p>
                                <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                                  {activeJob.logs.map((log: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 animate-in fade-in">
                                      <span className="text-indigo-500 font-extrabold">✓</span>
                                      <span className="text-[11px] font-mono font-bold text-indigo-900 border-r border-indigo-100 pr-1.5 whitespace-nowrap">{log.action}</span>
                                      <span className="text-slate-600 break-words">{log.message}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {forceNewVersion && (
                              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-1 text-xs">
                                <div className="flex items-center gap-2 text-amber-950 font-semibold md:truncate">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping" />
                                  <span>Iniciando controle de versão { (caseObj?.procuracaoVersion || 1) + 1 }. Uma nova cópia será catalogada.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForceNewVersion(false)}
                                  className="text-xs font-black text-slate-500 hover:text-slate-800 uppercase"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-1">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={handleSendJob}
                                className="w-full md:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
                              >
                                <Sparkles size={14} className="animate-pulse" />
                                <span>{forceNewVersion ? 'Gerar Nova Versão' : 'Enviar para Google Docs Integration'}</span>
                              </button>
                            </div>

                            {activeJob && activeJob.status !== 'pending' && (
                              <div className="mt-4 pt-3.5 border-t border-gray-150/70 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-slate-400">Última Operação Registrada</p>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    activeJob.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-red-50 text-red-700 border border-red-150'
                                  }`}>
                                    {activeJob.status === 'success' ? 'Sincronizado' : 'Erro'}
                                  </span>
                                </div>

                                {activeJob.status === 'success' ? (
                                  <div className="p-3.5 bg-emerald-50/40 border border-emerald-150 rounded-xl space-y-2">
                                    <div className="flex items-start gap-2">
                                      <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                                      <div className="space-y-1">
                                        <p className="text-xs text-emerald-900 font-extrabold">A Procuração PF foi criada e processada com sucesso!</p>
                                        <p className="text-[11px] text-emerald-800 font-medium">Pasta sincronizada. Você pode visualizar o documento finalizado no link abaixo ou nas opções do formulário.</p>
                                      </div>
                                    </div>
                                    
                                    {activeJob.result?.googleDocsUrl && (
                                      <div className="pt-1">
                                        <a
                                          href={activeJob.result.googleDocsUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-black uppercase tracking-wider transition-all shadow-3xs"
                                        >
                                          <ExternalLink size={11} /> Abrir Procuração Google Docs
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3.5 bg-rose-50/50 border border-rose-150 rounded-xl flex items-start gap-2 text-xs">
                                    <AlertCircle size={15} className="text-rose-500 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="font-extrabold text-rose-950 uppercase tracking-widest text-[9px] font-mono">Erro de Processamento</p>
                                      <p className="text-rose-900 font-bold mt-0.5">{activeJob.errorMessage || 'Erro inesperado na geração do documento pelo build integrador.'}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <p className="text-xs font-extrabold text-gray-800">1.1 Você gerou a procuração do cliente?</p>
                <div className="flex gap-4 mt-2">
                  {['sim', 'nao'].map(o => (
                    <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase text-gray-700">
                      <input 
                        type="radio" 
                        name="q1_1" 
                        checked={wizardState.q1_1 === o} 
                        onChange={() => saveWizardStateUpdate({ q1_1: o })} 
                        className="text-indigo-600"
                      />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </div>

              {wizardState.q1_1 === 'sim' && (
                <div className="space-y-4 border-l-2 border-indigo-200 pl-4 animate-in fade-in duration-200">
                  
                  <EntregaDocumento
                    tipoDocumento="procuracao"
                    tipoPessoa="PF"
                    googleDocsUrl={caseObj?.procuracaoGoogleDocsUrl || ''}
                    whatsappCliente={client?.pfDadosPessoais?.pf_whatsapp || client?.pfDadosPessoais?.pf_telefone || client?.pfData?.pf_whatsapp || client?.pfData?.pf_telefone || ''}
                    emailCliente={client?.pfDadosPessoais?.pf_email || client?.pfData?.pf_email || ''}
                    nomeCliente={clientName}
                    selectedMethods={wizardState.q1_2 || []}
                    onMethodsChange={(newMethods: string[]) => saveWizardStateUpdate({ q1_2: newMethods })}
                    outroValue={wizardState.q1_2_outro || ''}
                    onOutroChange={(val: string) => saveWizardStateUpdate({ q1_2_outro: val })}
                    questionNumber="1.2"
                  />

                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-gray-800">1.3 O cliente assinou a procuração?</p>
                    <div className="flex gap-4 mt-1.5">
                      {['sim', 'nao'].map(o => (
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-750">
                          <input 
                            type="radio" 
                            name="q1_3" 
                            checked={wizardState.q1_3 === o} 
                            onChange={() => saveWizardStateUpdate({ q1_3: o })} 
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-gray-800">1.4 Você solicitou a digitalização da procuração?</p>
                    <div className="flex gap-4 mt-1.5">
                      {['sim', 'nao'].map(o => (
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-750">
                          <input 
                            type="radio" 
                            name="q1_4" 
                            checked={wizardState.q1_4 === o} 
                            onChange={() => saveWizardStateUpdate({ q1_4: o })} 
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-gray-800">1.5 Você recebeu a procuração digitalizada?</p>
                    <div className="flex gap-4 mt-1.5">
                      {['sim', 'nao'].map(o => (
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-750">
                          <input 
                            type="radio" 
                            name="q1_5" 
                            checked={wizardState.q1_5 === o} 
                            onChange={() => saveWizardStateUpdate({ q1_5: o })} 
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-extrabold text-gray-800">1.6 Deseja anexar a procuração digitalizada no sistema agora?</p>
                    <div className="flex gap-4 mt-1.5">
                      {['sim', 'nao'].map(o => (
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-750">
                          <input 
                            type="radio" 
                            name="q1_6" 
                            checked={wizardState.q1_6 === o} 
                            onChange={() => saveWizardStateUpdate({ q1_6: o })} 
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                    {wizardState.q1_6 === 'sim' && <FileUploadBox field="procuracaoFiles" />}
                  </div>

                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  disabled={!wizardState.q1_1 || saving}
                  onClick={handleNextPhase}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Próxima Fase</span>
                  <ArrowRight size={13} />
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </FluxoStepLayout>
  );
}

