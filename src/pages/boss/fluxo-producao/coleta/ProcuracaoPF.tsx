import React from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import EntregaDocumento from '../components/EntregaDocumento';
import { buildProcuracaoPfPlaceholders } from '../../../../lib/documents/procuracaoPfPlaceholders';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Settings, CheckSquare, Sparkles, Check, AlertCircle, RefreshCw, ExternalLink,
  Copy, FolderOpen, FileCode
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { normalizeGdiStatus } from '../../../../lib/integrations/googleDocsStatus';

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

  const [localCaseObj, setLocalCaseObj] = React.useState<any>(null);

  // Sync with caseObj from hook on mount/load
  React.useEffect(() => {
    if (caseObj) {
      setLocalCaseObj(caseObj);
    }
  }, [caseObj]);

  // Set up real-time listener for current case to react to changes and cleanups
  React.useEffect(() => {
    if (!caseId) return;
    const unsubscribe = onSnapshot(doc(db, 'cases', caseId), (snapshot) => {
      if (snapshot.exists()) {
        setLocalCaseObj(snapshot.data());
      }
    }, (err) => {
      console.error("Erro na escuta de cases:", err);
    });
    return () => unsubscribe();
  }, [caseId]);

  const [activeJob, setActiveJob] = React.useState<any>(null);
  const [allCaseJobs, setAllCaseJobs] = React.useState<any[]>([]);
  const [copiedDiagnostics, setCopiedDiagnostics] = React.useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = React.useState(false);
  const [googleDocsConfig, setGoogleDocsConfig] = React.useState<any>(null);

  const [forceNewVersion, setForceNewVersion] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [sentPayload, setSentPayload] = React.useState<any>(null);
  const [showPayload, setShowPayload] = React.useState(false);
  const [copiedPayload, setCopiedPayload] = React.useState(false);
  const [gdiConfigured, setGdiConfigured] = React.useState<boolean | null>(null);
  const [loadedGdiUrl, setLoadedGdiUrl] = React.useState<string>('');
  const [gdiStatus, setGdiStatus] = React.useState<string>('não_configurado');

  // 1. Estados cruciais da Seção 5 para a tentativa ativa fática
  const [currentAttemptJobId, setCurrentAttemptJobId] = React.useState<string | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = React.useState<string | null>(null);
  const [showGenerationError, setShowGenerationError] = React.useState<boolean>(false);
  const [revalidating, setRevalidating] = React.useState(false);

  const liveCheckedRef = React.useRef(false);

  // Live revalidation of the GDI connection (Task 1)
  const revalidateGdiLive = async (config: any): Promise<boolean> => {
    const endpoint = config?.endpointUrl || loadedGdiUrl;
    const key = config?.integrationKey;
    if (!endpoint || !key) {
      console.warn("[PORTAL_GDI_LIVE_REVALIDATION_FAILED] Endpoint or integrationKey missing.");
      setError("Endpoint ou Chave do GDI ausente para revalidação.");
      setGdiConfigured(false);
      return false;
    }

    setRevalidating(true);
    let targetUrl = endpoint.trim();
    if (targetUrl.endsWith('/')) {
      targetUrl = targetUrl.slice(0, -1);
    }
    if (targetUrl.includes("?")) {
      targetUrl = targetUrl.split("?")[0];
    }

    console.log("[PORTAL_GDI_LIVE_REVALIDATION_STARTED] Starting live check on " + targetUrl);
    
    try {
      const resp = await fetch("/api/proxy-google-docs/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointUrl: targetUrl,
          integrationKey: key
        })
      });

      if (!resp.ok) {
        throw new Error(`Proxy respondeu erro HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const now = new Date().toISOString();
      const docRef = doc(db, 'settings', 'connectors');

      if (data.success) {
        console.log("[PORTAL_GDI_LIVE_REVALIDATION_SUCCESS] Live check success! Updating settings/connectors to operacional.");
        
        const updatedGDocs = {
          ...config,
          status: "operacional",
          diagnosticState: "operacional",
          normalizedStatus: "operacional",
          isOperational: true,
          integrationOperationalStatus: "operacional",
          operationalReason: "GDI revalidado ao vivo com sucesso.",
          lastHealthCheckAt: now,
          lastHealthCheckStatus: "operational",
          lastHealthCheckError: "",
          lastValidatedWebhookUrl: `${targetUrl}/api/webhook/gdi-job`,
          lastHttpStatus: 200,
          lastHttpStatusReceived: 200,
          lastEndpointTested: `${targetUrl}/api/health`,
          lastContentTypeReceived: "application/json",
          lastSuccess: "GDI operacional revalidado ao vivo.",
          lastError: "",
          transportMode: "http_webhook",
          updatedAt: now
        };

        try {
          await setDoc(docRef, {
            googleDocs: updatedGDocs
          }, { merge: true });
        } catch (dbErr) {
          console.warn("[PORTAL_GDI_LIVE_REVALIDATION_WARNING] Permissões insuficientes para salvar estado do GDI no Firestore, mas prosseguindo com fluxo local.", dbErr);
        }

        setGdiConfigured(true);
        setGdiStatus("operacional");
        setError(null);
        return true;
      } else {
        console.warn("[PORTAL_GDI_LIVE_REVALIDATION_FAILED] Live check failed on GDI backend: " + data.error);
        
        const updatedGDocs = {
          ...config,
          status: "erro",
          diagnosticState: "erro",
          normalizedStatus: "erro",
          isOperational: false,
          integrationOperationalStatus: "erro",
          operationalReason: data.error || "GDI não respondeu nos conformes exigidos.",
          lastHealthCheckAt: now,
          lastHealthCheckStatus: "failed",
          lastHealthCheckError: data.error || "",
          lastValidatedWebhookUrl: `${targetUrl}/api/webhook/gdi-job`,
          lastHttpStatus: data.failedStatus || 500,
          lastHttpStatusReceived: data.failedStatus || 500,
          lastEndpointTested: data.failedEndpoint || `${targetUrl}/api/health`,
          lastContentTypeReceived: data.failedContentType || "unknown",
          lastSuccess: "",
          lastError: data.error || "Erro na validação do GDI.",
          transportMode: "http_webhook",
          updatedAt: now
        };

        try {
          await setDoc(docRef, {
            googleDocs: updatedGDocs
          }, { merge: true });
        } catch (dbErr) {
          console.warn("[PORTAL_GDI_LIVE_REVALIDATION_WARNING] Permissões insuficientes para salvar estado do GDI no Firestore.", dbErr);
        }

        const detailedError = `Falha na revalidação ao vivo com GDI: ${data.error || 'Não operacional'}\n` +
          `Endpoint testado: ${data.failedEndpoint || 'N/A'}\n` +
          `Status HTTP: ${data.failedStatus || 'N/A'}\n` +
          `Content-Type: ${data.failedContentType || 'N/A'}\n` +
          `Resposta recebida: ${data.failedResponseText || 'N/A'}`;

        setError(detailedError);
        setGdiConfigured(false);
        setGdiStatus("erro");
        return false;
      }
    } catch (err: any) {
      console.error("[PORTAL_GDI_LIVE_REVALIDATION_FAILED] Exceptional live check failure:", err);
      const errMsg = err.message || String(err);
      setError(`Falha ao revalidar GDI ao vivo: ${errMsg}`);
      setGdiConfigured(false);
      setGdiStatus("erro");
      return false;
    } finally {
      setRevalidating(false);
    }
  };

  // Verificação em tempo real da configuração de GDI no banco Firestore via onSnapshot (TAREFA 8 & TAREFA 7 & TAREFA 2)
  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'connectors'), async (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.googleDocs) {
            // TAREFA 7 - Migrar status legado "ativo" para "operacional" de forma resiliente
            const rawStatus = data.googleDocs.status;
            const lastHttp = data.googleDocs.lastHttpStatus;
            if (rawStatus === "ativo" && (lastHttp === 200 || lastHttp === "200")) {
              console.log("[Migration] PORTAL_GDI_LEGACY_STATUS_NORMALIZED");
              try {
                await updateDoc(doc(db, 'settings', 'connectors'), {
                  "googleDocs.status": "operacional",
                  "googleDocs.integrationOperationalStatus": "operacional",
                  "googleDocs.lastHealthCheckStatus": "operational",
                  "googleDocs.lastHttpStatus": 200,
                  "googleDocs.lastHttpStatusReceived": 200,
                  "googleDocs.lastServerToServerResult": "Migrado automaticamente do estado legado ativo para operacional.",
                  "googleDocs.updatedAt": new Date().toISOString()
                });
                return; // Let the next snapshot trigger handle normal loading
              } catch (migrationErr) {
                console.error("Erro na migração automática de conector GDI:", migrationErr);
              }
            }

            const endpointUrl = (data.googleDocs.endpointUrl || "").trim();
            const integrationKey = (data.googleDocs.integrationKey || "").trim();

            if (rawStatus === "erro" && endpointUrl && integrationKey) {
              if (!liveCheckedRef.current) {
                liveCheckedRef.current = true;
                console.log("[PORTAL_GDI_RESIDUAL_ERROR_STATUS_DETECTED] Residual error detected. Attempting live revalidation before blocking.");
                
                // Do NOT block immediately. Let it bypass rawStatus === "erro"
                setGdiConfigured(true);
                setGdiStatus("verificando");
                setLoadedGdiUrl(endpointUrl);
                setGoogleDocsConfig({
                  ...data.googleDocs,
                  normalizedStatus: "verificando",
                  operationalReason: "Verificando integridade operacional ao vivo com o GDI..."
                });
                
                setTimeout(() => {
                  revalidateGdiLive(data.googleDocs);
                }, 100);
              } else {
                const statusInfo = normalizeGdiStatus(data.googleDocs);
                setGdiStatus(statusInfo.normalizedStatus);
                setLoadedGdiUrl(statusInfo.endpointUrl);
                setGdiConfigured(statusInfo.isOperational);
                setGoogleDocsConfig({
                  ...data.googleDocs,
                  normalizedStatus: statusInfo.normalizedStatus,
                  operationalReason: statusInfo.reason,
                  targetEndpoint: statusInfo.targetEndpoint
                });
              }
            } else {
              const statusInfo = normalizeGdiStatus(data.googleDocs);
              setGdiStatus(statusInfo.normalizedStatus);
              setLoadedGdiUrl(statusInfo.endpointUrl);
              setGdiConfigured(statusInfo.isOperational);
              setGoogleDocsConfig({
                ...data.googleDocs,
                normalizedStatus: statusInfo.normalizedStatus,
                operationalReason: statusInfo.reason,
                targetEndpoint: statusInfo.targetEndpoint
              });
            }
          } else {
            setGdiConfigured(false);
            setGdiStatus('não_configurado');
            setGoogleDocsConfig(null);
          }
        } else {
          setGdiConfigured(false);
          setGdiStatus('não_configurado');
          setGoogleDocsConfig(null);
        }
      } catch (err) {
        console.error("Erro ao escutar conectores GDI:", err);
        setGdiConfigured(false);
        setGdiStatus('não_configurado');
      }
    }, (err) => {
      console.error("Erro na escuta de settings/connectors:", err);
    });

    return () => unsub();
  }, []);

  const isMockUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('mock') ||
      lower.includes('fake') ||
      lower.includes('teste') ||
      lower.includes('diagnostic') ||
      lower.includes('localhost') ||
      lower.includes('undefined') ||
      lower.includes('null')
    );
  };

  // Check and auto-clean mock/invalid references on client load (Task 1 & Task 7)
  React.useEffect(() => {
    if (!caseId || !localCaseObj) return;
    const url = localCaseObj.procuracaoGoogleDocsUrl;
    const isUrlMock = url && isMockUrl(url);
    const isUrlInvalid = url && !url.toLowerCase().startsWith('https://docs.google.com/document/d/');
    const isStatusActiveWithoutUrl = localCaseObj.procuracaoStatus === 'criada' && !url;

    if (isUrlMock || isUrlInvalid || isStatusActiveWithoutUrl) {
      const runCleanup = async () => {
        try {
          const caseDocRef = doc(db, 'cases', caseId);
          const logsToAppend = [...(localCaseObj.procuracaoGoogleDocsJobLogs || [])];
          logsToAppend.push({
            action: "PORTAL_PROC_PF_RESIDUAL_CASE_DATA_CLEANED",
            timestamp: new Date().toISOString(),
            message: "Dados residuais e estados expirados limpos automaticamente."
          });
          if (isUrlMock) {
            logsToAppend.push({
              action: "PORTAL_PROC_PF_MOCK_REFERENCE_REMOVED",
              timestamp: new Date().toISOString(),
              message: "Referências de URL simulada (mock) ou fakes de teste removidas de cases/{caseId} com absoluto sucesso."
            });
          }

          await updateDoc(caseDocRef, {
            procuracaoGoogleDocsId: "",
            procuracaoGoogleDocsUrl: "",
            procuracaoStatus: "pendente",
            procuracaoGeneratedAt: "",
            procuracaoLogFalha: "",
            procuracaoGoogleDocsJobId: "",
            procuracaoGoogleDocsJobLogs: logsToAppend
          });

          // Update local state immediately to avoid flashing
          setLocalCaseObj((prev: any) => {
            if (!prev) return null;
            return {
              ...prev,
              procuracaoGoogleDocsId: "",
              procuracaoGoogleDocsUrl: "",
              procuracaoStatus: "pendente",
              procuracaoGeneratedAt: "",
              procuracaoLogFalha: "",
              procuracaoGoogleDocsJobId: ""
            };
          });
        } catch (err) {
          console.error("Erro na limpeza automática de referência:", err);
        }
      };
      runCleanup();
    }
  }, [caseId, localCaseObj]);

  const currentCase = localCaseObj || caseObj;

  const getAuditPayload = () => {
    if (sentPayload) return sentPayload;
    if (activeJob) {
      return {
        contractVersion: activeJob.contractVersion || 'gdi.placeholders.v1',
        documentType: activeJob.documentType || 'procuracao_pf',
        caseId: activeJob.caseId || caseId,
        clientId: activeJob.portalClientId || currentCase?.clientId || '',
        clientType: activeJob.clientType || 'PF',
        destinationFolderId: activeJob.destinationFolderId || driveFolderId,
        destinationFolderUrl: activeJob.destinationFolderUrl || driveFolderUrl,
        templateKey: activeJob.templateKey || 'procuracao-pf',
        placeholders: activeJob.placeholders || activeJob.payload || null
      };
    }
    return null;
  };

  const handleCopyDiagnostics = () => {
    const report = {
      caseId,
      clientId: currentCase?.clientId || '',
      clientName,
      driveFolderId,
      driveFolderUrl,
      gdiEndpointUrl: loadedGdiUrl,
      gdiStatus,
      lastHealthCheckAt: googleDocsConfig?.lastHealthCheckAt || googleDocsConfig?.updatedAt || 'N/A',
      activeJobId: activeJob?.id || 'N/A',
      activeJobStatus: activeJob?.status || 'N/A',
      currentAttemptJobId: currentAttemptJobId || 'N/A',
      procuracaoStatus: currentCase?.procuracaoStatus || 'N/A',
      procuracaoGoogleDocsUrl: currentCase?.procuracaoGoogleDocsUrl || 'N/A',
      procuracaoLogFalha: currentCase?.procuracaoLogFalha || 'N/A'
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedDiagnostics(true);
    setTimeout(() => setCopiedDiagnostics(false), 2000);
  };

  const handleRevalidateGdi = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const connectorsSnap = await getDoc(doc(db, 'settings', 'connectors'));

      if (!connectorsSnap.exists()) {
        throw new Error("Documento settings/connectors não encontrado.");
      }

      const data = connectorsSnap.data();
      const googleDocs = data.googleDocs;

      if (!googleDocs?.endpointUrl || !googleDocs?.integrationKey) {
        throw new Error("Endpoint URL ou Integration Key do GDI ausentes.");
      }

      const ok = await revalidateGdiLive(googleDocs);

      if (!ok) {
        throw new Error("Revalidação real do GDI falhou. Verifique o erro técnico exibido.");
      }

      setSuccess("GDI revalidado ao vivo com sucesso. O botão Gerar Procuração está liberado.");
    } catch (err: any) {
      setError(`Erro ao revalidar GDI ao vivo: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleForceCleanAttempt = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setCurrentAttemptJobId(null);
    setAttemptStartedAt(null);
    setForceNewVersion(true);
    try {
      const caseDocRef = doc(db, 'cases', caseId);
      await updateDoc(caseDocRef, {
        procuracaoStatus: "pendente",
        procuracaoLogFalha: "",
      });
      setSuccess("Visualização de tentativa limpa forçada. Pronto para gerar nova procuração!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Erro ao redefinir estado de erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLiveRevalidateGdi = async (): Promise<boolean> => {
    return revalidateGdiLive(googleDocsConfig);
  };

  const handleCleanProcuracaoResidualState = async () => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const now = new Date();
      const caseDocRef = doc(db, 'cases', caseId);
      await updateDoc(caseDocRef, {
        procuracaoGoogleDocsId: "",
        procuracaoGoogleDocsUrl: "",
        procuracaoStatus: "pendente",
        procuracaoGeneratedAt: "",
        procuracaoLogFalha: "",
        procuracaoGoogleDocsJobId: "",
        procuracaoGoogleDocsJobLogs: [
          ...(currentCase?.procuracaoGoogleDocsJobLogs || []),
          {
            action: "PORTAL_PROC_PF_RESIDUAL_CASE_DATA_CLEANED",
            timestamp: now.toISOString(),
            message: "Limpeza manual de dados residuais e expurgos executada pelo usuário com sucesso."
          }
        ]
      });

      // Update local state immediately
      setLocalCaseObj((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          procuracaoGoogleDocsId: "",
          procuracaoGoogleDocsUrl: "",
          procuracaoStatus: "pendente",
          procuracaoGeneratedAt: "",
          procuracaoLogFalha: "",
          procuracaoGoogleDocsJobId: ""
        };
      });

      if (allCaseJobs && allCaseJobs.length > 0) {
        for (const job of allCaseJobs) {
          let needsUpdate = false;
          const updates: any = {};

          if (job.status === 'pending') {
            needsUpdate = true;
            updates.status = 'timeout';
            updates.errorCode = 'GDI_JOB_STALE_PENDING';
            updates.errorMessage = 'Job antigo pendente marcado como timeout para não interferir na nova geração.';
            updates.updatedAt = now.toISOString();
            updates.logs = [
              ...(job.logs || []),
              {
                action: "PORTAL_PROC_PF_STALE_JOB_TIMEOUT",
                timestamp: now.toISOString(),
                message: "Parcialmente pendente - Limpo manualmente via painel administrativo."
              }
            ];
          } else if (job.status === 'success') {
            const url = job.result?.googleDocsUrl;
            const isUrlMockOrInvalid = !url || isMockUrl(url) || !url.toLowerCase().startsWith('https://docs.google.com/document/d/');
            if (isUrlMockOrInvalid) {
              needsUpdate = true;
              updates.status = 'failed';
              updates.errorCode = 'GDI_SUCCESS_WITHOUT_REAL_DOCUMENT';
              updates.errorMessage = 'Job antigo marcado como sucesso mas com URL simulada ou inválida.';
              updates.updatedAt = now.toISOString();
              updates.logs = [
                ...(job.logs || []),
                {
                  action: "PORTAL_PROC_PF_INVALID_SUCCESS_JOB_MARKED_FAILED",
                  timestamp: now.toISOString(),
                  message: "Job antigo limpo devido a referências ou links de documentos inexistentes."
                }
              ];
            }
          }

          if (needsUpdate) {
            await updateDoc(doc(db, 'googleDocsJobs', job.id), updates);
          }
        }
      }

      setSuccess("Limpeza de resíduos e normalização executados com absoluto sucesso!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error("Erro ao executar limpeza de resíduos:", err);
      setError(`Falha ao executar limpeza de resíduos: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClearMockReference = async () => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const caseDocRef = doc(db, 'cases', caseId);
      const clearLogs = [
        {
          action: "PORTAL_PROC_PF_MOCK_REFERENCE_CLEARED",
          timestamp: new Date().toISOString(),
          message: "A referência de Procuração mockada foi limpa com absoluto sucesso pelo usuário."
        }
      ];
      await updateDoc(caseDocRef, {
        procuracaoGoogleDocsId: "",
        procuracaoGoogleDocsUrl: "",
        procuracaoStatus: "pendente",
        procuracaoGeneratedAt: "",
        procuracaoLogFalha: "",
        procuracaoGoogleDocsJobId: "",
        procuracaoGoogleDocsJobLogs: clearLogs
      });
      setSuccess("Referência mockada limpa com absoluto sucesso!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error("Erro ao limpar referência mockada:", err);
      setError(`Falha ao limpar referência mockada: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Erro ao copiar link:", err);
    });
  };

  // Helper to background check/repair job statuses in the DB (Task 2)
  const auditJobsAndRepairInDatabase = async (jobs: any[]) => {
    const now = new Date();
    for (const job of jobs) {
      let needsUpdate = false;
      const updates: any = {};

      if (job.status === 'pending') {
        const createdTime = new Date(job.createdAt).getTime();
        const elapsedMs = now.getTime() - createdTime;
        if (elapsedMs > 5 * 60 * 1000) {
          needsUpdate = true;
          updates.status = 'timeout';
          updates.errorCode = 'GDI_JOB_STALE_PENDING';
          updates.errorMessage = 'Job antigo pendente marcado como timeout para não interferir na nova geração.';
          updates.updatedAt = now.toISOString();
          updates.logs = [
            ...(job.logs || []),
            {
              action: "PORTAL_PROC_PF_STALE_JOB_TIMEOUT",
              timestamp: now.toISOString(),
              message: "Job pendente há mais de 5 minutos marcado como timeout por inatividade."
            }
          ];
        }
      }

      if (job.status === 'success') {
        const url = job.result?.googleDocsUrl;
        const id = job.result?.googleDocsId;
        const isUrlMockOrInvalid = !url || isMockUrl(url) || !url.toLowerCase().startsWith('https://docs.google.com/document/d/');
        if (isUrlMockOrInvalid || !id) {
          needsUpdate = true;
          updates.status = 'failed';
          updates.errorCode = 'GDI_SUCCESS_WITHOUT_REAL_DOCUMENT';
          updates.errorMessage = 'Job marcado como sucesso anteriormente mas não contém documento real do Google Docs.';
          updates.updatedAt = now.toISOString();
          updates.logs = [
            ...(job.logs || []),
            {
              action: "PORTAL_PROC_PF_INVALID_SUCCESS_JOB_MARKED_FAILED",
              timestamp: now.toISOString(),
              message: "Job de sucesso com documento inválido ou ausente marcado como falha."
            }
          ];
        }
      }

      if (needsUpdate) {
        try {
          await updateDoc(doc(db, 'googleDocsJobs', job.id), updates);
        } catch (err) {
          console.error(`Erro ao reparar job ${job.id}:`, err);
        }
      }
    }
  };

  // Real-time synchronization and monitoring hook (Tasks 2 & 3)
  React.useEffect(() => {
    if (!caseId) return;

    const q = query(
      collection(db, 'googleDocsJobs'),
      where('caseId', '==', caseId),
      where('documentType', '==', 'procuracao_pf')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const jobs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        auditJobsAndRepairInDatabase(jobs);

        jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllCaseJobs(jobs);

        const now = new Date();
        const validActiveJob = jobs.find(job => {
          if (currentAttemptJobId && job.id === currentAttemptJobId) {
            return true;
          }
          if (job.status === 'success') {
            const url = job.result?.googleDocsUrl;
            return url && !isMockUrl(url) && url.toLowerCase().startsWith('https://docs.google.com/document/d/');
          }
          if (job.status === 'pending') {
            const createdTime = new Date(job.createdAt).getTime();
            const elapsedMs = now.getTime() - createdTime;
            return elapsedMs <= 5 * 60 * 1000;
          }
          return false;
        });

        setActiveJob(validActiveJob || null);
      } else {
        setActiveJob(null);
        setAllCaseJobs([]);
      }
    }, (err) => {
      console.error("Erro na escuta de googleDocsJobs:", err);
    });

    return () => unsubscribe();
  }, [caseId, currentAttemptJobId]);

  // Synchronize case fields when job status changes
  React.useEffect(() => {
    if (!activeJob || !currentCase) return;

    const isJobSuccess = activeJob.status === 'success';
    const isJobFailed = activeJob.status === 'failed';

    const caseDocRef = doc(db, 'cases', caseId);

    const updateCaseFromJob = async () => {
      try {
        if (isJobSuccess && currentCase.procuracaoGoogleDocsJobId !== activeJob.id) {
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
        } else if (isJobFailed && currentCase.procuracaoGoogleDocsJobId !== activeJob.id) {
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
  }, [activeJob, currentCase, caseId]);

  const handleNextPhase = () => {
    saveWizardStateUpdate({ step1_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-declaracao-PF`);
    });
  };

  const handleSendJob = async () => {
    // 1. Antes de enviar, validar: caseId, clientId, googleDriveClientFolderId, googleDriveClientFolderUrl, nomeCompleto, cpf
    const targetCaseId = caseId;
    const targetClientId = currentCase?.clientId || '';
    const googleDriveClientFolderId = client?.googleDriveClientFolderId || '';
    const googleDriveClientFolderUrl = client?.googleDriveClientFolderUrl || '';
    const destinationFolderId = googleDriveClientFolderId;
    const destinationFolderUrl = googleDriveClientFolderUrl;
    const nomeCompleto = client?.pfDadosPessoais?.pf_nomeCompleto || client?.pfData?.pf_nomeCompleto || '';
    const cpf = client?.pfDadosPessoais?.pf_cpf || client?.pfData?.pf_cpf || '';

    if (!targetCaseId) {
      setError("Erro de validação: caseId do caso está ausente.");
      setShowGenerationError(true);
      return;
    }
    if (!targetClientId) {
      setError("Erro de validação: clientId do caso está ausente.");
      setShowGenerationError(true);
      return;
    }
    // 2. Se não houver googleDriveClientFolderId: bloquear com "Não há pasta real do Google Drive vinculada ao cliente."
    if (!googleDriveClientFolderId) {
      setError("Não há pasta real do Google Drive vinculada ao cliente.");
      setShowGenerationError(true);
      return;
    }
    if (!nomeCompleto) {
      setError("Não é possível gerar a Procuração porque o Nome Completo do cliente está ausente no cadastro.");
      setShowGenerationError(true);
      return;
    }
    if (!cpf) {
      setError("Não é possível gerar a Procuração porque o CPF do cliente está ausente no cadastro.");
      setShowGenerationError(true);
      return;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const caseDocRef = doc(db, 'cases', targetCaseId);

    // Configuração fática de rastreio de tentativa única segundo a Seção 5
    setSaving(true);
    setError(null);
    setSuccess(null);
    setShowGenerationError(false);
    setCurrentAttemptJobId(jobId);
    setAttemptStartedAt(new Date().toISOString());

    const timestampDataLoaded = new Date().toISOString();
    const timestampFolderFound = new Date().toISOString();

    let placeholders: Record<string, string>;
    try {
      placeholders = buildProcuracaoPfPlaceholders(client);
    } catch (err: any) {
      setError(err.message || "Erro ao calcular placeholders.");
      setShowGenerationError(true);
      setSaving(false);
      return;
    }

    // Setup initial logs using required codes
    const initialLogs = [
      {
        action: "PORTAL_PROC_PF_DATA_LOADED",
        timestamp: timestampDataLoaded,
        message: "Dados do cliente e da procuração pf carregados e validados no Portal BOSS."
      },
      {
        action: "PORTAL_PROC_PF_FOLDER_FOUND",
        timestamp: timestampFolderFound,
        message: `Diretório Google Drive do cliente localizado com sucesso ID: ${destinationFolderId}.`
      },
      {
        action: "PORTAL_PROC_PF_PLACEHOLDERS_BUILT",
        timestamp: new Date().toISOString(),
        message: "O Portal BOSS montou com absoluto sucesso o mapa exclusivo de placeholders do cliente (placeholders-only)."
      }
    ];

    try {
      // Fetch GDI connection settings from Firestore
      const connectorsSnap = await getDoc(doc(db, 'settings', 'connectors'));
      let googleDocs: any = null;

      if (connectorsSnap.exists()) {
        const data = connectorsSnap.data();
        googleDocs = data.googleDocs;
      }

      let statusInfo = normalizeGdiStatus(googleDocs);
      let gdiOperational = statusInfo.isOperational;

      if (!gdiOperational && googleDocs?.endpointUrl && googleDocs?.integrationKey) {
        console.log("[PORTAL_GDI_LIVE_REVALIDATION_STARTED] Revalidando GDI automaticamente antes de desistir...");
        const revalidated = await revalidateGdiLive(googleDocs);
        if (revalidated) {
          gdiOperational = true;
          const connectorsSnapUpdated = await getDoc(doc(db, 'settings', 'connectors'));
          if (connectorsSnapUpdated.exists()) {
            googleDocs = connectorsSnapUpdated.data().googleDocs;
            statusInfo = normalizeGdiStatus(googleDocs);
          }
        } else {
          console.warn("[PORTAL_GDI_LIVE_REVALIDATION_FAILED] Revalidação ao vivo automática falhou.");
        }
      }

      if (!gdiOperational) {
        console.error("[PORTAL_GDI_LIVE_REVALIDATION_FAILED] GDI não está operacional. Abortando geração.");
        throw new Error("GDI não operacional após revalidação ao vivo.");
      }

      let gdiBaseUrl = googleDocs?.endpointUrl || "";
      const gdiIntegrationKey = (googleDocs?.integrationKey || '').trim();

      // Clean query string from GDI URL (TAREFA 6)
      if (gdiBaseUrl.includes("?")) {
        gdiBaseUrl = gdiBaseUrl.split("?")[0];
      }

      // Safeguards for restricted domains (TAREFA 6)
      const lowerGdiBase = gdiBaseUrl.toLowerCase();
      if (
        lowerGdiBase.includes('aistudio.google.com') ||
        lowerGdiBase.includes('showpreview') ||
        lowerGdiBase.includes('showassistant') ||
        lowerGdiBase.includes('accounts.google.com') ||
        lowerGdiBase.includes('localhost') ||
        lowerGdiBase.includes('127.0.0.1') ||
        lowerGdiBase.includes('/__/auth/handler')
      ) {
         throw new Error("A URL do GDI configurada não é uma API de produção válida (contém domínios restritos ou locais).");
      }

      const currentVersion = currentCase?.procuracaoVersion || 1;
      const nextVersion = currentCase?.procuracaoGoogleDocsUrl ? currentVersion + 1 : 1;

      // Log: request started
      initialLogs.push({
        action: "PORTAL_GDI_REQUEST_STARTED",
        timestamp: new Date().toISOString(),
        message: "Efetuando disparo HTTP real para o webhook do receptor GDI..."
      });

      // Enquanto envia: status = "enviando_para_gdi" e limpamos a falha anterior do documento do caso
      await updateDoc(caseDocRef, {
        procuracaoStatus: "enviando_para_gdi",
        procuracaoLogFalha: ""
      });

      // TAREFA 3 — AJUSTAR JOB INTERNO DO PORTAL (sem payload cru)
      const initialJob = {
        id: jobId,
        contractVersion: "gdi.placeholders.v1",
        source: "Portal BOSS Clientes",
        target: "GDI",
        documentType: "procuracao_pf",
        templateKey: "procuracao-pf",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        caseId: targetCaseId,
        portalClientId: targetClientId,
        clientType: "PF",
        destinationFolderId,
        destinationFolderUrl,
        outputFileName: `Procuração PF - ${nomeCompleto} - ${targetCaseId}`,
        placeholders,
        result: {
          googleDocsId: null,
          googleDocsUrl: null,
          fileName: null
        },
        errorCode: null,
        errorMessage: null,
        logs: initialLogs
      };

      await setDoc(doc(db, 'googleDocsJobs', jobId), initialJob);

      // TAREFA 6 — GARANTIR TARGET ENDPOINT
      let targetEndpoint = gdiBaseUrl.trim();
      if (!targetEndpoint.endsWith("/api/webhook/gdi-job")) {
        if (targetEndpoint.endsWith("/")) {
          targetEndpoint += "api/webhook/gdi-job";
        } else {
          targetEndpoint += "/api/webhook/gdi-job";
        }
      }

      // TAREFA 2 — ALTERAR PAYLOAD ENVIADO AO GDI
      const externalPayload = {
        contractVersion: "gdi.placeholders.v1",
        templateKey: "procuracao-pf",
        caseId: targetCaseId,
        clientId: targetClientId,
        destinationFolderId: googleDriveClientFolderId,
        destinationFolderUrl: googleDriveClientFolderUrl,
        outputFileName: `Procuração PF - ${nomeCompleto}`,
        placeholders
      };

      // Guard payload audit state
      setSentPayload(externalPayload);

      // Log: request sent
      initialLogs.push({
        action: "PORTAL_GDI_REQUEST_SENT_PLACEHOLDERS_ONLY",
        timestamp: new Date().toISOString(),
        message: `Disparando requisição real de placeholders-only via proxy para o GDI (${targetEndpoint}).`
      });

      // TAREFA 4 — LOGAR O PONTO EXATO ANTES DO POST
      initialLogs.push({
        action: "PORTAL_GDI_POST_ABOUT_TO_SEND",
        timestamp: new Date().toISOString(),
        message: `Ponto exato antes do POST. targetEndpoint: ${targetEndpoint}, hasIntegrationKey: true, contractVersion: gdi.placeholders.v1, destinationFolderId: ${googleDriveClientFolderId}, templateKey: procuracao-pf, placeholdersCount: ${Object.keys(placeholders || {}).length}`,
        targetEndpoint,
        hasIntegrationKey: true,
        contractVersion: "gdi.placeholders.v1",
        destinationFolderId: googleDriveClientFolderId,
        templateKey: "procuracao-pf",
        placeholdersCount: Object.keys(placeholders || {}).length
      } as any);

      await updateDoc(doc(db, 'googleDocsJobs', jobId), {
        logs: initialLogs,
        updatedAt: new Date().toISOString()
      });

      // Enviar requisição real para o GDI via Proxy
      const proxyResponse = await fetch("/api/proxy-google-docs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetEndpoint,
          payload: externalPayload,
          integrationKey: gdiIntegrationKey
        })
      });

      // Log: response received
      initialLogs.push({
        action: "PORTAL_GDI_RESPONSE_RECEIVED",
        timestamp: new Date().toISOString(),
        message: `Resposta de conexão recebida via proxy. Canal retornado com status HTTP: ${proxyResponse.status}`
      });

      await updateDoc(doc(db, 'googleDocsJobs', jobId), {
        logs: initialLogs,
        updatedAt: new Date().toISOString()
      });

      const responseText = await proxyResponse.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { error: responseText };
      }

      if (!proxyResponse.ok) {
        // Detailed error description for proxy integration diagnostics
        const errorDetail = responseData.error || responseData.errorMessage || responseText || "Erro não mapeado";
        throw new Error(errorDetail);
      }

      // TAREFA 7 — VALIDAR RETORNO DO GDI
      const googleDocsId = responseData.googleDocsId;
      const googleDocsUrl = responseData.googleDocsUrl;
      const outputFolderId = responseData.destinationFolderId || destinationFolderId;
      const outputFolderUrl = responseData.destinationFolderUrl || destinationFolderUrl;
      const gdiResponseLogs = responseData.logs || [];

      if (!googleDocsUrl) {
        // Se não retornar googleDocsUrl, mostrar o erro bruto.
        const bruteErrorText = responseData.error || responseData.errorMessage || responseText || "O GDI não retornou a URL do documento (googleDocsUrl).";
        throw new Error(bruteErrorText);
      }

      // Combine logs
      const successLogs = [
        ...initialLogs,
        {
          action: "PORTAL_GDI_PAYLOAD_DELIVERY_CONFIRMED",
          timestamp: new Date().toISOString(),
          message: "O GDI registrou o job de emissão de procuração fática com absoluto sucesso."
        },
        {
          action: "PORTAL_GDI_RESPONSE_SUCCESS",
          timestamp: new Date().toISOString(),
          message: `GDI retornou documento gerado com absoluto sucesso. ID: ${googleDocsId}`
        },
        ...gdiResponseLogs,
        {
          action: "PORTAL_PROC_PF_CASE_UPDATED",
          timestamp: new Date().toISOString(),
          message: "Caso atualizado no Portal com as referências físicas e URLs da Procuração PF."
        }
      ];

      // Update connectors lastReceivedByGdiConfirmed to confirmed
      try {
        const connectorsDocRef = doc(db, 'settings', 'connectors');
        const connectorsDocSnap = await getDoc(connectorsDocRef);
        if (connectorsDocSnap.exists()) {
          const currentConnectorsData = connectorsDocSnap.data();
          await updateDoc(connectorsDocRef, {
            "googleDocs.lastReceivedByGdiConfirmed": "confirmado",
            "googleDocs.lastServerToServerResult": `Sucesso na geração da procuração do caso: ${targetCaseId}`,
            "googleDocs.lastServerToServerTestAt": new Date().toISOString()
          });
        }
      } catch (connErr) {
        console.error("Erro ao atualizar lastReceivedByGdiConfirmed no conector:", connErr);
      }

      // TAREFA 8 — SALVAR RESULTADO NO CASO (com valores canônicos)
      await updateDoc(caseDocRef, {
        procuracaoStatus: "criada",
        procuracaoGoogleDocsId: googleDocsId,
        procuracaoGoogleDocsUrl: googleDocsUrl,
        procuracaoGeneratedAt: responseData.generatedAt || new Date().toISOString(),
        procuracaoDestinationFolderId: destinationFolderId,
        procuracaoDestinationFolderUrl: destinationFolderUrl,
        procuracaoGoogleDocsJobLogs: successLogs,
        procuracaoVersion: nextVersion,
        procuracaoGoogleDocsJobId: jobId
      });

      // Update internal job logs in real time
      await updateDoc(doc(db, 'googleDocsJobs', jobId), {
        status: "success",
        updatedAt: new Date().toISOString(),
        result: {
          googleDocsId,
          googleDocsUrl,
          fileName: responseData.fileName || `Procuração PF - ${nomeCompleto} - ${targetCaseId}`
        },
        logs: successLogs
      });

      await saveWizardStateUpdate({ q1_1: 'sim' });

      setForceNewVersion(false);
      setSuccess("Procuração PF gerada e indexada no GDI com sucesso!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("[GDI Execution Failed]", err);
      const errorMessage = err.message || "Erro desconhecido durante o processamento do GDI.";

      // Habilitar a exibição do erro fático na tela para a tentativa em curso
      setShowGenerationError(true);

      const failureLogs = [
        ...initialLogs,
        {
          action: "PORTAL_GDI_PAYLOAD_DELIVERY_NOT_CONFIRMED",
          timestamp: new Date().toISOString(),
          message: `Falha na entrega de payload fático ao GDI. Erro: ${errorMessage}`
        },
        {
          action: "PORTAL_GDI_RESPONSE_FAILED",
          timestamp: new Date().toISOString(),
          message: `Ocorreu uma falha na geração/integração com o GDI: ${errorMessage}`
        }
      ];

      // Se o GDI retornar falha, salvar
      await updateDoc(caseDocRef, {
        procuracaoStatus: "falha",
        procuracaoLogFalha: errorMessage,
        procuracaoGoogleDocsJobLogs: failureLogs,
        procuracaoGoogleDocsJobId: jobId
      });

      await updateDoc(doc(db, 'googleDocsJobs', jobId), {
        status: "failed",
        updatedAt: new Date().toISOString(),
        errorMessage,
        logs: failureLogs
      });

      if (errorMessage.includes("Configuração GDI inválida")) {
        setError(errorMessage);
      } else {
        setError(`Erro na automação real do GDI: ${errorMessage}`);
      }
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
            {showGenerationError && error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-semibold flex gap-3 items-start select-all">
                <AlertCircle size={16} className="text-red-00 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-[10px] uppercase text-red-950 tracking-wide font-mono">Erro de Processamento / Configuração</p>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] text-red-905 leading-relaxed">{error}</pre>
                </div>
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

                    {currentCase?.procuracaoGoogleDocsUrl && !isMockUrl(currentCase.procuracaoGoogleDocsUrl) && !forceNewVersion ? (
                      <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-3xs animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-600">
                            <FileText size={20} />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Procuração Gerada</h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                              O documento de Procuração PF já foi indexado e está disponível para preenchimento de assinaturas.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2.5 pt-1.5">
                          <a
                            href={currentCase.procuracaoGoogleDocsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-3xs cursor-pointer font-bold"
                          >
                            <ExternalLink size={13} />
                            Abrir Procuração
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(currentCase.procuracaoGoogleDocsUrl)}
                            className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-black uppercase transition-all border shadow-3xs cursor-pointer font-bold ${
                              copied 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                                : 'bg-white border-gray-250 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            {copied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copied ? "Copiado!" : "Copiar Link"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setSuccess(null);
                              setForceNewVersion(true);
                            }}
                            className="px-4.5 py-2 bg-white hover:bg-gray-50 border border-gray-250 text-slate-800 text-xs font-black uppercase rounded-xl transition-all shadow-3xs cursor-pointer font-bold"
                          >
                            Gerar nova versão
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Se estiver aguardando / processando o job */}
                        {activeJob?.status === 'pending' || saving ? (
                          <div className="bg-white border border-indigo-150 rounded-2xl p-5 space-y-4 shadow-3xs animate-pulse font-sans">
                            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="text-indigo-600 animate-spin" size={17} />
                                <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                                  Gerando procuração segura... Por favor, aguarde alguns instantes.
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full animate-infinite-loading w-3/4"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {forceNewVersion && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-1 text-xs">
                                <div className="flex items-center gap-2 text-amber-950 font-semibold md:truncate">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping" />
                                  <span>Iniciando controle de versão { (currentCase?.procuracaoVersion || 1) + 1 }. Uma nova cópia será salva.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForceNewVersion(false)}
                                  className="text-xs font-black text-slate-500 hover:text-slate-800 uppercase cursor-pointer whitespace-nowrap"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}

                            {gdiConfigured === false && (
                              <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-2.5 text-xs animate-fadeIn">
                                <AlertCircle size={15} className="text-rose-500 mt-0.5 shrink-0" />
                                <div className="space-y-1 w-full">
                                  <p className="font-extrabold text-rose-950 uppercase tracking-widest text-[9px] font-mono">GDI Desabilitado ou Não Homologado</p>
                                  <p className="text-rose-900 font-semibold mt-1">
                                    O barramento de emissão do GDI não está elegível para solicitações automáticas.
                                  </p>
                                  
                                  <div className="mt-2 bg-white/70 p-2.5 rounded-lg border border-rose-200/50 font-mono text-[10px] text-rose-950 space-y-1">
                                    <div><span className="font-bold text-rose-900 font-mono uppercase tracking-wide text-[9px]">Status lido no Firestore:</span> <span className="font-bold text-rose-800">{googleDocsConfig?.status || 'não_configurado'}</span></div>
                                    <div><span className="font-bold text-rose-900 font-mono uppercase tracking-wide text-[9px]">Status normalizado:</span> <span className="font-bold text-rose-800">{gdiStatus}</span></div>
                                    <div><span className="font-bold text-rose-900 font-mono uppercase tracking-wide text-[9px]">Endpoint:</span> <code className="bg-rose-50/50 px-1 rounded border border-rose-100 font-bold block overflow-x-auto my-0.5 py-0.5">{googleDocsConfig?.endpointUrl || 'N/A'}</code></div>
                                    <div><span className="font-bold text-rose-900 font-mono uppercase tracking-wide text-[9px]">Chave presente:</span> <span className="font-bold text-rose-800">{googleDocsConfig?.integrationKey ? 'Sim' : 'Não'}</span></div>
                                    <div className="pt-1.5 mt-1 border-t border-rose-150 leading-relaxed text-[11px] text-rose-900">
                                      <span className="font-extrabold text-rose-950 font-mono uppercase tracking-wide text-[9px] block">Motivo do Rejeite:</span>
                                      {googleDocsConfig?.operationalReason || 'Nenhum motivo de rejeição especificado.'}
                                    </div>
                                  </div>

                                  {googleDocsConfig?.endpointUrl && googleDocsConfig?.integrationKey && (
                                    <div className="pt-2 pb-1">
                                      <button
                                        type="button"
                                        disabled={revalidating || saving}
                                        onClick={handleLiveRevalidateGdi}
                                        className="px-3 py-1.5 bg-rose-605 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1 cursor-pointer transition-all border border-rose-700"
                                      >
                                        <RefreshCw size={11} className={revalidating ? 'animate-spin' : ''} />
                                        <span>{revalidating ? "Validando GDI..." : "Revalidar GDI agora"}</span>
                                      </button>
                                    </div>
                                  )}

                                  <p className="text-rose-750 font-bold mt-1.5 text-[11px]">
                                    Acesse <strong className="font-extrabold uppercase text-rose-900">Configurações &gt; Integrações (Google Docs)</strong> para submeter o endpoint a um Diagnóstico fático de API real e restaurar a conformidade de comunicação do Portal.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* GDI URLs info display (Section 9) */}
                            {loadedGdiUrl && (
                              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5 text-xs animate-fadeIn">
                                <p className="font-extrabold text-indigo-950 uppercase tracking-widest text-[9px] font-mono flex items-center gap-1.5 align-middle">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-650 shrink-0" />
                                  <span>Canal de Integração GDI Ativo (Server-to-Server)</span>
                                </p>
                                <div className="space-y-1 font-mono text-[10px] text-gray-700 leading-normal">
                                  <div>
                                    <span className="font-bold text-gray-500">GDI API Base URL carregada:</span>{' '}
                                    <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-100/60 text-indigo-900 break-all">{loadedGdiUrl}</code>
                                  </div>
                                  <div>
                                    <span className="font-bold text-gray-505">Webhook final:</span>{' '}
                                    <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-100/60 text-indigo-900 break-all">
                                      {loadedGdiUrl.trim().replace(/\/$/, "")}/api/webhook/gdi-job
                                    </code>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-1">
                              <button
                                type="button"
                                disabled={saving || (gdiConfigured === false && (!googleDocsConfig?.endpointUrl || !googleDocsConfig?.integrationKey))}
                                onClick={handleSendJob}
                                className="w-full md:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer font-bold"
                              >
                                <Sparkles size={14} />
                                <span>{forceNewVersion ? 'Gerar Nova Versão' : 'Gerar Procuração'}</span>
                              </button>
                            </div>

                            {showGenerationError && activeJob && activeJob.status === 'failed' && activeJob.id === currentAttemptJobId && (
                              <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-2.5 text-xs animate-in duration-200 fade-in zoom-in-95">
                                <AlertCircle size={15} className="text-rose-500 mt-0.5 shrink-0 animate-bounce" />
                                <div>
                                  <p className="font-extrabold text-rose-950 uppercase tracking-widest text-[9px] font-mono flex items-center gap-1.5 font-bold">
                                    <span>Erro de Geração na Tentativa Atual</span>
                                  </p>
                                  <p className="text-rose-900 font-medium mt-1">
                                    Ocorreu uma falha ao gerar a procuração. Por favor, verifique os dados cadastrais do cliente e tente novamente.
                                  </p>
                                  {activeJob.errorMessage && (
                                    <pre className="mt-2 p-2 bg-slate-950 border border-slate-900 rounded-lg text-rose-450 font-mono text-[10px] overflow-auto max-h-32 whitespace-pre-wrap select-all">
                                      {activeJob.errorMessage}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* HISTÓRICO DE ERROS DA SESSÃO ANTERIOR (Exibição não-intrusiva sob demanda) */}
                            {currentCase?.procuracaoStatus === 'falha' && currentCase?.procuracaoLogFalha && !showGenerationError && (
                              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-gray-750 font-black uppercase tracking-wider text-[9px] font-mono">
                                    <AlertCircle size={12} className="text-gray-400" />
                                    <span>Histórico: Falha na Geração Anterior</span>
                                  </div>
                                  <span className="text-[9px] text-gray-400 font-mono">
                                    {currentCase.procuracaoGeneratedAt ? new Date(currentCase.procuracaoGeneratedAt).toLocaleString('pt-BR') : 'Sem data informada'}
                                  </span>
                                </div>
                                <p className="text-gray-650 font-medium leading-relaxed">
                                  Existe um registro histórico de falha de geração associado a este caso. Você pode tentar gerar novamente a qualquer momento com o botão acima.
                                </p>
                                <details className="group border border-gray-150 rounded-lg bg-white p-2">
                                  <summary className="font-bold text-gray-500 text-[9px] uppercase tracking-wider flex items-center justify-between cursor-pointer select-none">
                                    <span>Ver detalhes do log de erro</span>
                                    <span className="text-indigo-600 font-black group-open:hidden">Exibir</span>
                                    <span className="text-indigo-600 font-black hidden group-open:inline">Ocultar</span>
                                  </summary>
                                  <pre className="mt-2 p-2 bg-slate-950 border border-slate-900 rounded-lg text-rose-400 font-mono text-[9px] overflow-auto max-h-36 whitespace-pre-wrap leading-tight select-all">
                                    {currentCase.procuracaoLogFalha}
                                  </pre>
                                </details>
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
                    googleDocsUrl={currentCase?.procuracaoGoogleDocsUrl || ''}
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

            {/* COLLAPSIBLE DIAGNOSTIC PANEL (Task 5) */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xs space-y-4 mt-6">
              <button
                type="button"
                onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
                className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none select-none"
              >
                <div className="flex items-center gap-2">
                  <Settings className="text-gray-500 shrink-0" size={16} />
                  <span className="text-sm font-black text-gray-800 uppercase tracking-wider font-mono">
                    Diagnóstico da rota atual
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-600 hover:underline">
                  {isDiagnosticsOpen ? "Recolher Painel" : "Expandir Painel"}
                </span>
              </button>

              {isDiagnosticsOpen && (
                <div className="pt-4 border-t border-gray-100 space-y-4 animate-in duration-200 slide-in-from-top-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pb-1 border-b border-gray-200 font-sans">
                        Parâmetros da Rota & Caso
                      </p>
                      <div>
                        <span className="text-gray-500">caseId:</span>{" "}
                        <span className="text-gray-800 font-bold select-all">{caseId || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">clientId:</span>{" "}
                        <span className="text-gray-800 font-bold select-all">{currentCase?.clientId || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">clientName:</span>{" "}
                        <span className="text-gray-800 font-bold">{clientName || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">driveFolderId:</span>{" "}
                        <span className="text-gray-850 font-bold select-all">{driveFolderId || "⚠️ Ausente"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">driveFolderUrl:</span>{" "}
                        {driveFolderUrl ? (
                          <a href={driveFolderUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-bold truncate block">
                            {driveFolderUrl}
                          </a>
                        ) : (
                          <span className="text-rose-600 font-bold">⚠️ Ausente</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pb-1 border-b border-gray-200 font-sans">
                        Integração & Estado Ativo
                      </p>
                      <div>
                        <span className="text-gray-500 text-[10px]">gdiEndpointUrl:</span>{" "}
                        <code className="text-indigo-900 font-bold break-all block text-[11px] bg-indigo-50/50 p-1 rounded border border-indigo-100/50 my-1">{loadedGdiUrl || "N/A"}</code>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 justify-between py-1">
                        <span className="text-gray-500">Modo Ambiente:</span>
                        <span className="text-gray-800 font-bold text-[11px]">
                          {googleDocsConfig?.environmentMode === "preview_server_to_server" ? "☁️ Preview Server-to-Server" :
                           googleDocsConfig?.environmentMode === "preview_browser" ? "💻 Preview Browser-Only" :
                           googleDocsConfig?.environmentMode ? "🚀 Produção Server-to-Server" : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 justify-between py-1">
                        <span className="text-gray-500">Status Operacional GDI:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          googleDocsConfig?.integrationOperationalStatus === "operacional" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          googleDocsConfig?.integrationOperationalStatus === "preview_server_to_server_blocked" ? "bg-rose-100 text-rose-805 animate-pulse border border-rose-200" :
                          googleDocsConfig?.integrationOperationalStatus === "endpoint_publico_ok" ? "bg-blue-100 text-blue-800" :
                          "bg-rose-100 text-rose-800"
                        }`}>{googleDocsConfig?.integrationOperationalStatus || gdiStatus}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 justify-between py-1 border-b border-dashed border-gray-150 pb-2">
                        <span className="text-gray-500">Entrega Confirmada pelo GDI:</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                          googleDocsConfig?.lastReceivedByGdiConfirmed === "confirmado" ? "bg-emerald-500 text-white" :
                          "bg-gray-205 text-gray-700 border border-gray-300"
                        }`}>{googleDocsConfig?.lastReceivedByGdiConfirmed || "não_confirmado"}</span>
                      </div>

                      {googleDocsConfig?.lastPreviewWarning && (
                        <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[10px] font-medium leading-relaxed">
                          ⚠️ {googleDocsConfig.lastPreviewWarning}
                        </div>
                      )}

                      {googleDocsConfig?.lastServerToServerResult && (
                        <div className="p-2 bg-slate-900 border border-slate-950 text-slate-200 rounded-xl text-[10px] font-mono leading-relaxed max-h-20 overflow-auto">
                          ℹ️ {googleDocsConfig.lastServerToServerResult}
                        </div>
                      )}

                      <div className="pt-1.5">
                        <span className="text-gray-500">lastHealthCheckAt:</span>{" "}
                        <span className="text-gray-800 font-bold">{googleDocsConfig?.lastHealthCheckAt || googleDocsConfig?.updatedAt || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">procuracaoStatus:</span>{" "}
                        <span className="text-gray-800 font-bold uppercase">{currentCase?.procuracaoStatus || "pendente"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">procuracaoGoogleDocsUrl:</span>{" "}
                        {currentCase?.procuracaoGoogleDocsUrl ? (
                          <a href={currentCase.procuracaoGoogleDocsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-bold truncate block">
                            {currentCase.procuracaoGoogleDocsUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400">Nenhum</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-mono space-y-1">
                    <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pb-1 border-b border-gray-200 font-sans">
                      Controle de Rastreabilidade dos Jobs
                    </p>
                    <div>
                      <span className="text-gray-500">activeJobId:</span>{" "}
                      <span className="text-indigo-900 font-bold">{activeJob?.id || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">activeJobStatus:</span>{" "}
                      <span className="text-gray-800 font-bold">{activeJob?.status || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">currentAttemptJobId:</span>{" "}
                      <span className="text-indigo-900 font-bold">{currentAttemptJobId || "N/A"}</span>
                    </div>
                    {currentCase?.procuracaoLogFalha && (
                      <div className="pt-2">
                        <span className="text-rose-600 font-bold block pb-1">procuracaoLogFalha:</span>
                        <pre className="p-2 bg-slate-900 text-rose-450 border border-slate-950 rounded-xl max-h-24 overflow-auto text-[10px] whitespace-pre-wrap select-all leading-relaxed font-mono">
                          {currentCase.procuracaoLogFalha}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* ADMIN CONTROL BUTTONS */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleCopyDiagnostics}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-250 text-gray-700 font-bold uppercase rounded-xl text-[10px] tracking-wide transition-all cursor-pointer shadow-3xs"
                    >
                      <Copy size={12} />
                      <span>{copiedDiagnostics ? "Copiado!" : "Copiar diagnóstico da rota"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCleanProcuracaoResidualState}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold uppercase rounded-xl text-[10px] tracking-wide transition-all cursor-pointer shadow-3xs"
                    >
                      <Trash2 size={12} />
                      <span>Limpar resíduos da Procuração deste caso</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevalidateGdi}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-250 text-gray-700 font-bold uppercase rounded-xl text-[10px] tracking-wide transition-all cursor-pointer shadow-3xs"
                    >
                      <RefreshCw size={12} />
                      <span>Revalidar GDI</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleForceCleanAttempt}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold uppercase rounded-xl text-[10px] tracking-wide transition-all cursor-pointer shadow-3xs"
                    >
                      <Sparkles size={12} />
                      <span>Forçar nova tentativa limpa</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </FluxoStepLayout>
  );
}

