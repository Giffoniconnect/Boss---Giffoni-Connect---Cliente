import React from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import EntregaDocumento from '../components/EntregaDocumento';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Settings, CheckSquare, Sparkles, Check, AlertCircle, RefreshCw, ExternalLink,
  Copy, FolderOpen, FileCode
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
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
  const [forceNewVersion, setForceNewVersion] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [sentPayload, setSentPayload] = React.useState<any>(null);
  const [showPayload, setShowPayload] = React.useState(false);
  const [copiedPayload, setCopiedPayload] = React.useState(false);
  const [gdiConfigured, setGdiConfigured] = React.useState<boolean | null>(null);
  const [loadedGdiUrl, setLoadedGdiUrl] = React.useState<string>('');

  // Verificação em tempo real da configuração de GDI no banco Firestore
  React.useEffect(() => {
    async function checkGDI() {
      try {
        const connectorsSnap = await getDoc(doc(db, 'settings', 'connectors'));
        if (connectorsSnap.exists()) {
          const data = connectorsSnap.data();
          let gUrl = '';
          if (data.googleDocs) {
            gUrl = data.googleDocs.buildUrl || data.googleDocs.endpointUrl || '';
          }
          if (!gUrl && data.googleDrive) {
            gUrl = data.googleDrive.buildUrl || '';
          }
          
          const lowerUrl = gUrl.toLowerCase();
          const HOMOLOGATED_GDI_BASE_URL = "https://ais-dev-rhz6adgbzyburidkotjy46-599536317399.us-east1.run.app";
          const isInvalid = lowerUrl.includes('aistudio.google.com') || 
                             lowerUrl.includes('showpreview') || 
                             lowerUrl.includes('showassistant') || 
                             lowerUrl.includes('accounts.google.com') ||
                             lowerUrl.includes('localhost') ||
                             lowerUrl.includes('127.0.0.1') ||
                             lowerUrl.includes('/__/auth/handler') ||
                             !gUrl.trim();

          if (isInvalid) {
            gUrl = HOMOLOGATED_GDI_BASE_URL;
            try {
              const updatedGDocs = {
                ...(data.googleDocs || {}),
                buildUrl: HOMOLOGATED_GDI_BASE_URL,
                endpointUrl: HOMOLOGATED_GDI_BASE_URL,
                status: 'ativo',
                updatedAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'settings', 'connectors'), {
                ...data,
                googleDocs: updatedGDocs
              });
              console.log("[GDI Repair] Dynamic Firestore correction executed successfully inside checkGDI logic in ProcuracaoPF.tsx");
            } catch (dbErr) {
              console.error("[GDI Repair] Failed to update Firestore connectors settings in checkGDI:", dbErr);
            }
          }

          // Clean up any query string if present
          if (gUrl.includes('?')) {
            gUrl = gUrl.split('?')[0];
          }
          
          setLoadedGdiUrl(gUrl);

          if (gUrl.trim()) {
            setGdiConfigured(true);
            return;
          }
        }
        setGdiConfigured(false);
      } catch (err) {
        console.error("Erro ao verificar conectores GDI:", err);
        setGdiConfigured(false);
      }
    }
    checkGDI();
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

  // Check and auto-clean mock/invalid references on client load
  React.useEffect(() => {
    if (!caseId || !localCaseObj) return;
    const url = localCaseObj.procuracaoGoogleDocsUrl;
    if (url && isMockUrl(url)) {
      const runCleanup = async () => {
        try {
          const caseDocRef = doc(db, 'cases', caseId);
          await updateDoc(caseDocRef, {
            procuracaoGoogleDocsId: "",
            procuracaoGoogleDocsUrl: "",
            procuracaoStatus: "pendente",
            procuracaoGeneratedAt: "",
            procuracaoLogFalha: "",
            procuracaoGoogleDocsJobId: "",
            procuracaoGoogleDocsJobLogs: [
              {
                action: "PORTAL_PROC_PF_INVALID_REFERENCE_REMOVED",
                timestamp: new Date().toISOString(),
                message: "A referência de Procuração inválida ou mockada contendo URLs não operacionais foi limpa automaticamente pelo sistema BOSS."
              }
            ]
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
          console.error("Erro na limpeza automática de referência mockada:", err);
        }
      };
      runCleanup();
    }
  }, [caseId, localCaseObj]);

  const currentCase = localCaseObj || caseObj;

  const getAuditPayload = () => {
    if (sentPayload) return sentPayload;
    if (activeJob?.payload) {
      return {
        documentType: activeJob.documentType || 'procuracao_pf',
        caseId: activeJob.caseId || caseId,
        clientId: activeJob.portalClientId || currentCase?.clientId || '',
        clientType: activeJob.clientType || 'PF',
        destinationFolderId: activeJob.destinationFolderId || driveFolderId,
        destinationFolderUrl: activeJob.destinationFolderUrl || driveFolderUrl,
        templateKey: activeJob.templateKey || 'procuracao-pf',
        payload: activeJob.payload
      };
    }
    return null;
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
        const jobs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
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
    // 1. Antes de enviar, validar: caseId, clientId, destinationFolderId, destinationFolderUrl, nomeCompleto, cpf
    const targetCaseId = caseId;
    const targetClientId = currentCase?.clientId || '';
    const destinationFolderId = driveFolderId;
    const destinationFolderUrl = driveFolderUrl;
    const nomeCompleto = client?.pfDadosPessoais?.pf_nomeCompleto || client?.pfData?.pf_nomeCompleto || '';
    const cpf = client?.pfDadosPessoais?.pf_cpf || client?.pfData?.pf_cpf || '';

    if (!targetCaseId) {
      setError("Erro de validação: caseId do caso está ausente.");
      return;
    }
    if (!targetClientId) {
      setError("Erro de validação: clientId do caso está ausente.");
      return;
    }
    // 2. Se não houver destinationFolderId: bloquear envio e mostrar mensagem específica
    if (!destinationFolderId) {
      setError("Não é possível gerar a Procuração porque a pasta Google Drive do cliente ainda não foi vinculada.");
      return;
    }
    if (!destinationFolderUrl) {
      setError("Não é possível gerar a Procuração porque a URL da pasta Google Drive está ausente.");
      return;
    }
    if (!nomeCompleto) {
      setError("Não é possível gerar a Procuração porque o Nome Completo do cliente está ausente no cadastro.");
      return;
    }
    if (!cpf) {
      setError("Não é possível gerar a Procuração porque o CPF do cliente está ausente no cadastro.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const timestampDataLoaded = new Date().toISOString();
    const timestampFolderFound = new Date().toISOString();

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
      }
    ];

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const caseDocRef = doc(db, 'cases', targetCaseId);

    try {
      // Clean up past errors
      setError(null);

      // Fetch GDI connection settings from Firestore
      const connectorsSnap = await getDoc(doc(db, 'settings', 'connectors'));
      let gdiBaseUrl = '';
      let gdiIntegrationKey = '';

      if (connectorsSnap.exists()) {
        const data = connectorsSnap.data();
        if (data.googleDocs) {
          gdiBaseUrl = data.googleDocs.buildUrl || data.googleDocs.endpointUrl || '';
          gdiIntegrationKey = data.googleDocs.integrationKey || '';
        }
        // Fallback to googleDrive configuration if googleDocs configuration is empty
        if (!gdiBaseUrl && data.googleDrive) {
          gdiBaseUrl = data.googleDrive.buildUrl || '';
        }
        if (!gdiIntegrationKey && data.googleDrive) {
          gdiIntegrationKey = data.googleDrive.integrationKey || '';
        }
      }

      // Enforce clean HOMOLOGATED_GDI_BASE_URL fallback if URL is empty or points to AI Studio
      const HOMOLOGATED_GDI_BASE_URL = "https://ais-dev-rhz6adgbzyburidkotjy46-599536317399.us-east1.run.app";
      let legacyUrlDetected = false;
      const lowerGdiBase = gdiBaseUrl.toLowerCase();
      if (
        lowerGdiBase.includes('aistudio.google.com') ||
        lowerGdiBase.includes('showpreview') ||
        lowerGdiBase.includes('showassistant') ||
        lowerGdiBase.includes('accounts.google.com') ||
        lowerGdiBase.includes('localhost') ||
        lowerGdiBase.includes('127.0.0.1') ||
        lowerGdiBase.includes('/__/auth/handler') ||
        !gdiBaseUrl.trim()
      ) {
        gdiBaseUrl = HOMOLOGATED_GDI_BASE_URL;
        legacyUrlDetected = true;

        // Perform actual write to database instead of memory-only fallback
        try {
          const connectorsData = connectorsSnap.exists() ? connectorsSnap.data() : {};
          const updatedGDocs = {
            ...(connectorsData.googleDocs || {}),
            buildUrl: HOMOLOGATED_GDI_BASE_URL,
            endpointUrl: HOMOLOGATED_GDI_BASE_URL,
            status: 'ativo',
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'settings', 'connectors'), {
            ...connectorsData,
            googleDocs: updatedGDocs
          });
          console.log("[GDI Repair] Dynamic Firestore correction executed successfully inside handleSendJob logic in ProcuracaoPF.tsx");
        } catch (dbErr) {
          console.error("[GDI Repair] Failed to update corrected GDI URL in Firestore inside handleSendJob:", dbErr);
        }
      }

      // Enforce no query string
      if (gdiBaseUrl.includes("?")) {
        gdiBaseUrl = gdiBaseUrl.split("?")[0];
      }

      if (legacyUrlDetected) {
        initialLogs.push({
          action: "PORTAL_GDI_LEGACY_URL_REPLACED",
          timestamp: new Date().toISOString(),
          message: "URL antiga/inválida do AI Studio detectada de forma fática na Procuração PF. Substituição dinâmica efetuada para o canal homologado."
        });
      }

      // Block submission if database URL or displayed URL still reflects the old AI Studio paths
      if (gdiBaseUrl.toLowerCase().includes('aistudio.google.com') || loadedGdiUrl.toLowerCase().includes('aistudio.google.com')) {
        throw new Error("Erro de persistência crítico: A URL do GDI inválida do AI Studio ainda é detectada na tela ou no carregamento. Envio bloqueado.");
      }

      // Validar conexão antes de enviar
      if (!gdiBaseUrl) {
        throw new Error("GDI API ainda não configurada. Informe a URL pública real da API do Google Docs Integrations.");
      }

      if (!gdiIntegrationKey) {
        throw new Error("Chave de integração do GDI não configurada em settings/connectors.googleDocs.integrationKey.");
      }

      if (!gdiBaseUrl.toLowerCase().startsWith('http://') && !gdiBaseUrl.toLowerCase().startsWith('https://')) {
        throw new Error("A URL do GDI precisa começar com http ou https.");
      }

      const payload = {
        nomeCompleto,
        nacionalidade: client?.pfDadosPessoais?.pf_nacionalidade || client?.pfData?.pf_nacionalidade || '',
        estadoCivil: client?.pfDadosPessoais?.pf_estadoCivil || client?.pfData?.pf_estadoCivil || '',
        profissao: client?.pfDadosPessoais?.pf_profissao || client?.pfData?.pf_profissao || '',
        cpf,
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

      const currentVersion = currentCase?.procuracaoVersion || 1;
      const nextVersion = currentCase?.procuracaoGoogleDocsUrl ? currentVersion + 1 : 1;

      // Log: request started
      initialLogs.push({
        action: "PORTAL_GDI_REQUEST_STARTED",
        timestamp: new Date().toISOString(),
        message: "Efetuando disparo HTTP real para o webhook do receptor GDI..."
      });

      // 4. Enquanto envia: status = "enviando_para_gdi"
      await updateDoc(caseDocRef, {
        procuracaoStatus: "enviando_para_gdi"
      });

      // Maintain internal job log document for tracking on interface
      const initialJob = {
        id: jobId,
        source: "Portal BOSS Clientes",
        target: "GDI",
        documentType: "procuracao_pf",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        caseId: targetCaseId,
        portalClientId: targetClientId,
        clientType: "PF",
        destinationFolderId,
        destinationFolderUrl,
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
        logs: initialLogs
      };

      await setDoc(doc(db, 'googleDocsJobs', jobId), initialJob);

      // Align endpoint path
      let targetEndpoint = gdiBaseUrl.trim();
      if (!targetEndpoint.endsWith("/api/webhook/gdi-job")) {
        if (targetEndpoint.endsWith("/")) {
          targetEndpoint += "api/webhook/gdi-job";
        } else {
          targetEndpoint += "/api/webhook/gdi-job";
        }
      }

      const externalPayload = {
        source: "Portal BOSS Clientes",
        target: "GDI",
        documentType: "procuracao_pf",
        caseId: targetCaseId,
        clientId: targetClientId,
        clientType: "PF",
        destinationFolderId,
        destinationFolderUrl,
        templateKey: "procuracao-pf",
        payload
      };

      // Guard payload audit state
      setSentPayload(externalPayload);

      // Log: request sent
      initialLogs.push({
        action: "PORTAL_GDI_REQUEST_SENT",
        timestamp: new Date().toISOString(),
        message: `Disparando requisição real via proxy para o GDI (${targetEndpoint}).`
      });

      await updateDoc(doc(db, 'googleDocsJobs', jobId), {
        logs: initialLogs,
        updatedAt: new Date().toISOString()
      });

      // 3. Enviar requisição real para o GDI via Proxy
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
        const errorDetail = `Falha na API Proxy (Status HTTP: ${proxyResponse.status}). Error: ${responseData.error || responseData.errorMessage || responseText || "Erro não mapeado"}\n` +
          `targetEndpoint: ${targetEndpoint}\n` +
          `Chave de Integração Presente (integrationKey): ${gdiIntegrationKey ? "sim" : "não"}\n` +
          `documentType: procuracao_pf\n` +
          `caseId: ${targetCaseId}\n` +
          `clientId: ${targetClientId}`;

        throw new Error(errorDetail);
      }

      // Successful fields mapped from GDI response
      const googleDocsId = responseData.googleDocsId || responseData.id || '';
      const googleDocsUrl = responseData.googleDocsUrl || responseData.url || '';
      const generatedAt = responseData.generatedAt || new Date().toISOString();
      const outputFolderId = responseData.destinationFolderId || destinationFolderId;
      const outputFolderUrl = responseData.destinationFolderUrl || destinationFolderUrl;
      const gdiResponseLogs = responseData.logs || [];

      // 7. NÃO SALVAR SUCESSO SE O RETORNO FOR MOCK
      if (isMockUrl(googleDocsUrl)) {
        const mockErrorLogs = [
          ...initialLogs,
          {
            action: "PORTAL_GDI_INVALID_DOCUMENT_URL",
            timestamp: new Date().toISOString(),
            message: "Disparo bloqueado: O GDI retornou um documento inválido ou ambiente simulado."
          }
        ];

        await updateDoc(caseDocRef, {
          procuracaoStatus: "falha",
          procuracaoLogFalha: "O GDI retornou um documento inválido. Nenhum vínculo foi salvo.",
          procuracaoGoogleDocsJobLogs: mockErrorLogs,
          procuracaoGoogleDocsJobId: jobId
        });

        await updateDoc(doc(db, 'googleDocsJobs', jobId), {
          status: "failed",
          updatedAt: new Date().toISOString(),
          errorMessage: "O GDI retornou um documento inválido. Nenhum vínculo foi salvo.",
          logs: mockErrorLogs
        });

        throw new Error("O GDI retornou um documento inválido. Nenhum vínculo foi salvo.");
      }

      // Combine logs
      const successLogs = [
        ...initialLogs,
        {
          action: "PORTAL_GDI_RESPONSE_SUCCESS",
          timestamp: new Date().toISOString(),
          message: `GDI retornou documento gerado com sucesso. ID: ${googleDocsId}`
        },
        ...gdiResponseLogs,
        {
          action: "PORTAL_PROC_PF_CASE_UPDATED",
          timestamp: new Date().toISOString(),
          message: "Caso atualizado no Portal com as referências físicas e URLs da Procuração PF."
        }
      ];

      // 5. Se o GDI retornar sucesso, salvar no caso
      await updateDoc(caseDocRef, {
        procuracaoStatus: "criada",
        procuracaoGoogleDocsId: googleDocsId,
        procuracaoGoogleDocsUrl: googleDocsUrl,
        procuracaoGeneratedAt: generatedAt,
        procuracaoDestinationFolderId: outputFolderId,
        procuracaoDestinationFolderUrl: outputFolderUrl,
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
          fileName: `Procuração PF - V${nextVersion}`
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

      const failureLogs = [
        ...initialLogs,
        {
          action: "PORTAL_GDI_RESPONSE_FAILED",
          timestamp: new Date().toISOString(),
          message: `Ocorreu uma falha na geração/integração com o GDI: ${errorMessage}`
        }
      ];

      // 6. Se o GDI retornar falha, salvar
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
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-semibold flex gap-3 items-start select-all">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
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
                                <div>
                                  <p className="font-extrabold text-rose-950 uppercase tracking-widest text-[9px] font-mono">GDI não Configurado</p>
                                  <p className="text-rose-900 font-semibold mt-1">GDI API ainda não configurada. Informe a URL pública real da API do Google Docs Integrations.</p>
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
                                disabled={saving || gdiConfigured === false}
                                onClick={handleSendJob}
                                className="w-full md:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer font-bold"
                              >
                                <Sparkles size={14} />
                                <span>{forceNewVersion ? 'Gerar Nova Versão' : 'Gerar Procuração'}</span>
                              </button>
                            </div>

                            {activeJob && activeJob.status === 'failed' && (
                              <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-2.5 text-xs">
                                <AlertCircle size={15} className="text-rose-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="font-extrabold text-rose-950 uppercase tracking-widest text-[9px] font-mono">Erro de Geração</p>
                                  <p className="text-rose-900 font-semibold mt-1">Ocorreu uma falha ao gerar a procuração. Por favor, verifique os dados cadastrais do cliente e tente novamente.</p>
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

          </div>
        )}

      </div>
    </FluxoStepLayout>
  );
}

