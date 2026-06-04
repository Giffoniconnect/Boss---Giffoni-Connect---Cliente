import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { BossLayout } from '../../../components/Layout';
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Play, 
  Terminal, 
  AlertCircle, 
  Check, 
  X,
  Info,
  Layers,
  Scale,
  Briefcase,
  FileCheck,
  DollarSign,
  Fingerprint,
  Archive,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';

interface GoogleDocsConfig {
  status: 'não_configurado' | 'preparado' | 'em_teste' | 'ativo' | 'erro';
  templatesStrategy: string;
  notes: string;
  endpointUrl: string;
  integrationKey: string;
  lastEndpoint?: string;
  lastHttpStatus?: number;
  lastResponse?: string;
  lastTestAt?: string;
  lastSentPayload?: any;
  lastReceivedPayload?: any;
}

export default function GoogleDocsIntegration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Connection fields
  const [config, setConfig] = useState<GoogleDocsConfig>({
    status: 'não_configurado',
    templatesStrategy: 'standard_procuracao',
    notes: '',
    endpointUrl: 'https://ais-dev-rhz6adgbzyburidkotjy46-599536317399.us-east1.run.app',
    integrationKey: '',
    lastEndpoint: '',
    lastHttpStatus: undefined,
    lastResponse: '',
    lastTestAt: '',
    lastSentPayload: null,
    lastReceivedPayload: null
  });

  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [testing, setTesting] = useState(false);

  // Diagnostic collapsible states
  const [expandSentPayload, setExpandSentPayload] = useState(false);
  const [expandReceivedPayload, setExpandReceivedPayload] = useState(false);
  const [connectionTestLabel, setConnectionTestLabel] = useState<string>('');
  
  const [diagnosticState, setDiagnosticState] = useState<'sem_diagnostico' | 'invalida' | 'parcial' | 'operacional'>('sem_diagnostico');
  const [diagnosticMessage, setDiagnosticMessage] = useState<string>('');

  const handleDiagnosticarGDI = async () => {
    setTesting(true);
    setFeedback(null);
    setDiagnosticState('sem_diagnostico');
    setDiagnosticMessage('');

    const targetUrl = (config.endpointUrl || '').trim();
    const integrationKey = (config.integrationKey || '').trim();

    if (!targetUrl) {
      setDiagnosticState('invalida');
      setDiagnosticMessage('Diagnóstico Falhou: URL do GDI não informada.');
      setFeedback({ type: 'error', message: 'A URL do GDI é obrigatória para o diagnóstico.' });
      setTesting(false);
      return;
    }

    if (!targetUrl.toLowerCase().startsWith('https://')) {
      setDiagnosticState('invalida');
      setDiagnosticMessage('Diagnóstico Falhou: A URL deve começar obrigatoriamente com "https://"');
      setTesting(false);
      return;
    }

    const blockedTerms = [
      "aistudio.google.com",
      "showpreview",
      "showassistant",
      "accounts.google.com",
      "firebaseapp login",
      "firebaseapp",
      "/__/auth/handler"
    ];

    const lower = targetUrl.toLowerCase();
    for (const term of blockedTerms) {
      if (lower.includes(term)) {
        setDiagnosticState('invalida');
        setDiagnosticMessage(`Diagnóstico Falhou: A URL contém o termo restrito "${term}".`);
        setTesting(false);
        return;
      }
    }

    try {
      const resp = await fetch("/api/proxy-google-docs/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEndpoint: targetUrl,
          integrationKey: integrationKey
        })
      });

      const data = await resp.json();
      
      const timestamp = new Date().toLocaleTimeString();
      if (data.success) {
        setDiagnosticState('operacional');
        setDiagnosticMessage(`Diagnóstico de Conexão Bem-Sucedido: O canal está 100% operacional no endpoint configurado! Código de resposta testada: HTTP ${data.status}`);
        setFeedback({
          type: 'success',
          message: 'Excelente! O diagnóstico fático confirmou que a API e o barramento do GDI estão 🟢 Operacionais.'
        });
        setLogs(prev => [...prev, `[${timestamp}] Diagnóstico concluído com sucesso (STATUS: 🟢 Operacional).`]);
      } else {
        if (data.errorCode === 'GDI_ENDPOINT_RETURNS_HTML') {
          setDiagnosticState('invalida');
          setDiagnosticMessage(`Diagnóstico Negado (Critério 3): ${data.error}`);
          setFeedback({
            type: 'error',
            message: `Erro Crítico de API: ${data.error}`
          });
          setLogs(prev => [...prev, `[${timestamp}] Diagnóstico falhou: URL retornou login/HTML (STATUS: 🔴 Inválida).`]);
        } else {
          setDiagnosticState('parcial');
          setDiagnosticMessage(`Diagnóstico Parcial: ${data.error || 'Falha de comunicação ou autenticação.'}`);
          setFeedback({
            type: 'error',
            message: `Atenção: A URL respondeu parcialmente, mas falhou na validação de contrato/JSON. Erro: ${data.error}`
          });
          setLogs(prev => [...prev, `[${timestamp}] Diagnóstico parcial: falha de JSON ou status restrito (STATUS: 🟡 Parcial).`]);
        }
      }
    } catch (err: any) {
      setDiagnosticState('parcial');
      setDiagnosticMessage(`Diagnóstico Parcial: Erro ao efetuar probe fático de conexão. ${err.message || err}`);
      setFeedback({ type: 'error', message: `Erro na ponte GDI: ${err.message || err}` });
    } finally {
      setTesting(false);
    }
  };

  const handleClearInvalidGDI = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      
      const updatedGDocs = {
        ...currentData.googleDocs,
        buildUrl: '',
        endpointUrl: '',
        status: 'não_configurado',
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGDocs
      });

      setConfig(prev => ({
        ...prev,
        status: 'não_configurado',
        endpointUrl: '',
      }));

      setDiagnosticState('sem_diagnostico');
      setDiagnosticMessage('');

      setFeedback({
        type: 'success',
        message: 'Configurações inválidas do GDI apagadas do Firestore com sucesso! O barramento foi resetado para não configurado.'
      });
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Configuração GDI invadida limpa no Firestore.`]);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erro ao limpar Firestore: ${err.message || err}` });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRealGDI = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const realGdiUrl = 'https://ais-dev-rhz6adgbzyburidkotjy46-599536317399.us-east1.run.app';
      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      const updatedGDocs = {
        ...currentData.googleDocs,
        buildUrl: realGdiUrl,
        endpointUrl: realGdiUrl,
        status: 'ativo',
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGDocs
      });

      setConfig(prev => ({
        ...prev,
        endpointUrl: realGdiUrl,
        status: 'ativo'
      }));

      setFeedback({
        type: 'success',
        message: 'A URL operacional homologada do GDI foi salva com total sucesso! (status = ativo)'
      });
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Salvamento fático da URL real efetuado.`]);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erro ao salvar URL real do GDI: ${err.message || err}` });
    } finally {
      setSaving(false);
    }
  };

  const handleCorrectGdiNow = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const realGdiUrl = 'https://ais-dev-rhz6adgbzyburidkotjy46-599536317399.us-east1.run.app';
      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      const updatedGDocs = {
        ...currentData.googleDocs,
        buildUrl: realGdiUrl,
        endpointUrl: realGdiUrl,
        status: 'ativo',
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGDocs
      });

      // Reload config from database
      const freshSnap = await getDoc(docRef);
      if (freshSnap.exists()) {
        const data = freshSnap.data();
        if (data.googleDocs) {
          setConfig({
            status: data.googleDocs.status || 'ativo',
            templatesStrategy: data.googleDocs.templatesStrategy || '',
            notes: data.googleDocs.notes || '',
            endpointUrl: data.googleDocs.endpointUrl || '',
            integrationKey: data.googleDocs.integrationKey || '',
            lastEndpoint: data.googleDocs.lastEndpoint || '',
            lastHttpStatus: data.googleDocs.lastHttpStatus || undefined,
            lastResponse: data.googleDocs.lastResponse || '',
            lastTestAt: data.googleDocs.lastTestAt || '',
            lastSentPayload: data.googleDocs.lastSentPayload || null,
            lastReceivedPayload: data.googleDocs.lastReceivedPayload || null
          });
        }
      }

      setFeedback({
        type: 'success',
        message: 'GDI API Base URL corrigida e salva com absoluto sucesso! URL carregada: ' + realGdiUrl
      });
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Botão Corrigir URL GDI agora acionado faticamente.`]);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erro ao corrigir URL: ${err.message || err}` });
    } finally {
      setSaving(false);
    }
  };

  const handleManualTestGDI = async () => {
    setTesting(true);
    setFeedback(null);
    setConnectionTestLabel('Testando...');
    const targetUrl = (config.endpointUrl || '').trim();
    try {
      let isSuccess = false;
      let isHtml = false;
      let responseStatus = 0;
      let text = '';

      // Direct probe attempt
      try {
        const directResp = await fetch(`${targetUrl}/api/config`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-BOSS-Google-Docs-Integration-Key": config.integrationKey || "boss_docs_live_standard"
          }
        });
        responseStatus = directResp.status;
        text = await directResp.text();
        const contentType = directResp.headers.get("content-type") || "";

        const isHtmlResponse = contentType.includes("html") || 
                               text.trim().startsWith("<") || 
                               text.toLowerCase().includes("<!doctype html") || 
                               text.toLowerCase().includes("<html") ||
                               text.toLowerCase().includes("login") ||
                               text.toLowerCase().includes("sign in");

        if (responseStatus === 200 && !isHtmlResponse) {
          try {
            JSON.parse(text);
            isSuccess = true;
          } catch {
            isSuccess = false;
          }
        } else if (isHtmlResponse) {
          isHtml = true;
        }
      } catch (directErr) {
        console.warn("[Direct probe got block/CORS/network failure - falling back to integrated backend node proxy...]");
      }

      // Proxy fallback
      if (!isSuccess && !isHtml) {
        const proxyResp = await fetch("/api/test-google-docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gdiBaseUrl: targetUrl,
            integrationKey: config.integrationKey || "boss_docs_live_standard",
            isDiagnostic: false
          })
        });
        
        const proxyData = await proxyResp.json();
        responseStatus = proxyData.status || proxyResp.status;
        isSuccess = proxyData.success === true;
        
        const lastResponseStr = String(proxyData.error || proxyData.lastResponse || '');
        if (lastResponseStr.toLowerCase().includes("html") || lastResponseStr.toLowerCase().includes("login")) {
          isHtml = true;
        }
      }

      if (isSuccess && responseStatus === 200) {
        setConnectionTestLabel('status = conectado');
        setFeedback({
          type: 'success',
          message: 'O teste de conexão GDI com o Cloud Run retornou código HTTP 200 e JSON válido! (status = conectado)'
        });
        
        // Save test result silently in Firestore
        try {
          const docRef = doc(db, 'settings', 'connectors');
          const docSnap = await getDoc(docRef);
          const currentData = docSnap.exists() ? docSnap.data() : {};
          
          await setDoc(docRef, {
            ...currentData,
            googleDocs: {
              ...currentData.googleDocs,
              status: 'ativo',
              endpointUrl: targetUrl,
              lastHttpStatus: 200,
              lastResponse: 'status = conectado',
              lastTestAt: new Date().toLocaleString('pt-BR')
            }
          });
          
          setConfig(prev => ({
            ...prev,
            status: 'ativo',
            endpointUrl: targetUrl,
            lastHttpStatus: 200,
            lastResponse: 'status = conectado',
            lastTestAt: new Date().toLocaleString('pt-BR')
          }));
        } catch (dbErr) {
          console.error("[Manual test state write failure]:", dbErr);
        }
      } else {
        setConnectionTestLabel('status = inválido');
        setFeedback({
          type: 'error',
          message: 'O teste com a URL do GDI retornou HTML/login redirecionado ou status inválido. (status = inválido)'
        });
        
        try {
          const docRef = doc(db, 'settings', 'connectors');
          const docSnap = await getDoc(docRef);
          const currentData = docSnap.exists() ? docSnap.data() : {};
          
          await setDoc(docRef, {
            ...currentData,
            googleDocs: {
              ...currentData.googleDocs,
              status: 'erro',
              lastHttpStatus: responseStatus,
              lastResponse: 'status = inválido',
              lastTestAt: new Date().toLocaleString('pt-BR')
            }
          });

          setConfig(prev => ({
            ...prev,
            status: 'erro',
            lastHttpStatus: responseStatus,
            lastResponse: 'status = inválido',
            lastTestAt: new Date().toLocaleString('pt-BR')
          }));
        } catch (dbErr) {
          console.error("[Manual test error state write failure]:", dbErr);
        }
      }
    } catch (err: any) {
      setConnectionTestLabel('status = inválido');
      setFeedback({ type: 'error', message: `Erro fático ao testar: ${err.message || err}` });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const docSnap = await getDoc(doc(db, 'settings', 'connectors'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.googleDocs) {
            const loadedEndpointUrl = data.googleDocs.endpointUrl || '';

            setConfig({
              status: data.googleDocs.status || 'não_configurado',
              templatesStrategy: data.googleDocs.templatesStrategy || '',
              notes: data.googleDocs.notes || '',
              endpointUrl: loadedEndpointUrl,
              integrationKey: data.googleDocs.integrationKey || '',
              lastEndpoint: data.googleDocs.lastEndpoint || '',
              lastHttpStatus: data.googleDocs.lastHttpStatus || undefined,
              lastResponse: data.googleDocs.lastResponse || '',
              lastTestAt: data.googleDocs.lastTestAt || '',
              lastSentPayload: data.googleDocs.lastSentPayload || null,
              lastReceivedPayload: data.googleDocs.lastReceivedPayload || null
            });
          }
        }
      } catch (err) {
        console.error('Erro ao ler Google Docs de settings/connectors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const validateUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) {
      return 'GDI API Base URL é obrigatória.';
    }

    if (!trimmed.toLowerCase().startsWith('https://')) {
      return 'A URL do GDI deve começar obrigatoriamente com "https://"';
    }

    const lower = trimmed.toLowerCase();
    
    // Strict block pattern validation: No AI Studio, accounts.google, localhost, or firebase handler
    const blockedTerms = [
      "aistudio.google.com",
      "showpreview",
      "showassistant",
      "accounts.google.com",
      "localhost",
      "127.0.0.1",
      "/__/auth/handler"
    ];

    for (const term of blockedTerms) {
      if (lower.includes(term)) {
        return `Salvamento Bloqueado: A URL fornecida contém o termo inválido/restrito "${term}". Certifique-se de usar a URL pública homologada do GDI.`;
      }
    }

    if (!lower.includes('.run.app')) {
      return 'A URL do GDI deve ser uma URL homologada terminando com ".run.app".';
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const gapiBaseUrl = (config.endpointUrl || '').trim();
    const integrationKey = (config.integrationKey || '').trim();
    const status = config.status || 'não_configurado';

    // Regra de Negócio Crítica:
    // Só permitir salvar o status da integração como “Automação Ativa” (status = 'ativo')
    // se o diagnóstico estiver em estado 🟢 Operacional.
    if (status === 'ativo' && diagnosticState !== 'operacional') {
      setFeedback({
        type: 'error',
        message: 'Ativação Bloqueada: Para definir o status como Ativo (Automação Ativa), a integração do barramento externa deve antes obter o diagnóstico 🟢 Operacional. Clique no botão "Diagnosticar GDI" abaixo para testar seu canal de API real.'
      });
      setSaving(false);
      return;
    }

    // Se houver URL ou chave ou status diferente de não configurado, validamos a URL
    if (status !== 'não_configurado' || gapiBaseUrl || integrationKey) {
      const urlError = validateUrl(gapiBaseUrl);
      if (urlError) {
        setFeedback({ type: 'error', message: urlError });
        setSaving(false);
        return;
      }

      if (!integrationKey) {
        setFeedback({ type: 'error', message: 'O salvamento foi bloqueado: Chave de Integração GDI (X-BOSS-Google-Docs-Integration-Key) não foi fornecida.' });
        setSaving(false);
        return;
      }
    }

    try {
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDocs: {
          status: config.status,
          templatesStrategy: config.templatesStrategy.trim(),
          notes: config.notes.trim(),
          buildUrl: gapiBaseUrl,
          endpointUrl: gapiBaseUrl,
          integrationKey: integrationKey,
          lastEndpoint: config.lastEndpoint || '',
          lastHttpStatus: config.lastHttpStatus || null,
          lastResponse: config.lastResponse || '',
          lastTestAt: config.lastTestAt || '',
          lastSentPayload: config.lastSentPayload || null,
          lastReceivedPayload: config.lastReceivedPayload || null
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setFeedback({ type: 'success', message: 'Configurações de integração com Google Docs salvas com absoluto sucesso!' });
      
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [
        ...prev,
        `[${timestamp}] Configurações atualizadas e salvas com sucesso no banco de dados.`
      ]);
    } catch (err: any) {
      console.error('Erro ao salvar GDI:', err);
      setFeedback({ type: 'error', message: `Erro ao salvar configurações fáticas: ${err.message || err}` });
    } finally {
      setSaving(false);
    }
  };

  const handleTestGDI = async (isDiagnostic: boolean) => {
    setTesting(true);
    setFeedback(null);

    const gapiBaseUrl = (config.endpointUrl || '').trim();
    const integrationKey = (config.integrationKey || '').trim();

    const urlError = validateUrl(gapiBaseUrl);
    if (urlError) {
      setFeedback({ type: 'error', message: urlError });
      setTesting(false);
      return;
    }

    if (!integrationKey) {
      setFeedback({ type: 'error', message: 'Por favor, informe a Chave de Integração GDI (X-BOSS-Google-Docs-Integration-Key).' });
      setTesting(false);
      return;
    }

    // Ping payload standard vs diagnostic payload
    const testPayload = isDiagnostic ? {
      source: "Portal BOSS Clientes",
      target: "GDI",
      documentType: "procuracao_pf",
      caseId: "diagnostico_case_id",
      clientId: "diagnostico_client_id",
      clientType: "PF",
      destinationFolderId: "diagnostico_folder_id",
      destinationFolderUrl: "https://drive.google.com/drive/folders/diagnostico_folder",
      templateKey: "procuracao-pf",
      payload: {
        nomeCompleto: "Diagnóstico Real BOSS GDI",
        nacionalidade: "Brasileiro",
        estadoCivil: "Solteiro",
        profissao: "Engenheiro de Software",
        cpf: "000.000.005-00",
        rg: "MG-00.000.000",
        endereco: "Avenida Principal",
        numero: "100",
        complemento: "Apt 201",
        bairro: "Centro",
        cidade: "Viçosa",
        estado: "MG",
        cep: "36570-000",
        email: "diagnostico@exemplo.com",
        telefone: "(31) 99999-9999",
        whatsapp: "(31) 99999-9999",
        localAssinatura: "Viçosa, MG",
        advogadoNome: "RODRIGO GIFFONI RODRIGUES",
        advogadoOab: "OAB/MG 157.320",
        dataAssinatura: "data da assinatura eletrônica"
      }
    } : {
      source: "Portal BOSS Clientes",
      target: "GDI",
      documentType: "diagnostico_ping",
      action: "ping",
      templateKey: "ping",
      payload: {
        ping: true,
        timestamp: new Date().toISOString()
      }
    };

    try {
      const resp = await fetch("/api/test-google-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gdiBaseUrl: gapiBaseUrl,
          integrationKey,
          isDiagnostic
        })
      });

      const data = await resp.json();
      const timestamp = new Date().toLocaleTimeString();
      const testTimestamp = new Date().toLocaleString('pt-BR');

      const lastEndpoint = data.endpoint || (isDiagnostic ? `${gapiBaseUrl}/api/webhook/gdi-job` : `${gapiBaseUrl}/api/config`);
      const lastHttpStatus = data.status || resp.status;
      const responseTime = data.durationMs ? `${data.durationMs} ms` : "0 ms";
      const lastResponse = data.error ? `Erro: ${data.error}` : JSON.stringify(data.data || data, null, 2);

      const newLogs = [
        `[${timestamp}] Teste acionamento GDI: ${isDiagnostic ? "DIAGNÓSTICO REAL (POST /api/webhook/gdi-job)" : "PING CONEXÃO (GET /api/config)"}.`,
        `[${timestamp}] URL Endpoint: ${lastEndpoint}`,
        `[${timestamp}] Tempo de resposta medido: ${responseTime}`,
        `[${timestamp}] Resposta HTTP status: ${lastHttpStatus}`,
        `[${timestamp}] Conteúdo retornado: ${lastResponse}`
      ];

      setLogs(prev => [...prev, ...newLogs]);

      const isSucceeded = data.success === true;
      const updatedStatus = isSucceeded ? ('ativo' as const) : ('erro' as const);

      const updated = {
        ...config,
        status: updatedStatus,
        lastEndpoint,
        lastHttpStatus,
        lastResponse,
        lastTestAt: testTimestamp,
        lastSentPayload: testPayload,
        lastReceivedPayload: data.data || (data.error ? { error: data.error } : data)
      };
      setConfig(updated);

      // Save real-time settings on test success / status updates
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDocs: {
          status: updatedStatus,
          templatesStrategy: config.templatesStrategy.trim(),
          notes: config.notes.trim(),
          buildUrl: gapiBaseUrl,
          endpointUrl: gapiBaseUrl,
          integrationKey: integrationKey,
          lastEndpoint,
          lastHttpStatus,
          lastResponse,
          lastTestAt: testTimestamp,
          lastSentPayload: testPayload,
          lastReceivedPayload: data.data || (data.error ? { error: data.error } : data)
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (isSucceeded) {
        setFeedback({ 
          type: 'success', 
          message: `O teste de conexão com o GDI retornou HTTP ${lastHttpStatus} com JSON válido em ${responseTime}!` 
        });
      } else {
        setFeedback({ 
          type: 'error', 
          message: `O teste do GDI falhou (${lastHttpStatus ? `HTTP ${lastHttpStatus}` : 'Erro de rede'}): ${data.error || "Retorno inválido ou nulo."}` 
        });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: `Falha ao testar conexão externa: ${err.message || err}` });
    } finally {
      setTesting(false);
      setShowLogs(true);
    }
  };

  const handleDisable = async () => {
    const timestamp = new Date().toLocaleTimeString();
    const updated = { 
      ...config, 
      status: 'não_configurado' as const,
      lastTestAt: '',
      lastHttpStatus: undefined,
      lastResponse: '',
      lastEndpoint: ''
    };
    setConfig(updated);
    
    try {
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDocs: {
          status: 'não_configurado',
          buildUrl: (config.endpointUrl || '').trim(),
          endpointUrl: (config.endpointUrl || '').trim(),
          integrationKey: (config.integrationKey || '').trim(),
          templatesStrategy: (config.templatesStrategy || '').trim(),
          notes: (config.notes || '').trim(),
          lastEndpoint: '',
          lastHttpStatus: null,
          lastResponse: '',
          lastTestAt: '',
          lastSentPayload: null,
          lastReceivedPayload: null
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setLogs(prev => [
        ...prev,
        `[${timestamp}] Provedor desativado voluntariamente pelo operador.`
      ]);
      setFeedback({ type: 'success', message: 'Módulo GDI desativado com sucesso!' });
    } catch (err) {
      console.error(err);
    }
  };

  const shortcutCards = [
    { name: "Procuração", desc: "Minuta de procuração judicial preenchida no fluxo de produção.", icon: Briefcase, color: "text-blue-600 bg-blue-50" },
    { name: "Declaração de Hipossuficiência", desc: "Atestado fático de isenção de custas preenchido automaticamente.", icon: FileCheck, color: "text-purple-600 bg-purple-50" },
    { name: "Contrato de Honorários", desc: "Contrato assinado em subetapa com as faturas vinculadas.", icon: Layers, color: "text-amber-600 bg-amber-50" },
    { name: "Recibo de Dinheiro Físico", desc: "Provimento de recibo instantâneo quando pago via dinheiro físico.", icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { name: "Relatório de Auditoria Documental", desc: "Integridade das provas e documentos mínimos do caso.", icon: Fingerprint, color: "text-cyan-600 bg-cyan-50" },
    { name: "Pré-Petição", desc: "Rascunho de fundamentação inicial sob os fatos e documentos.", icon: Scale, color: "text-indigo-600 bg-indigo-50" },
    { name: "Outros Modelos", desc: "Integração dinâmica para fluxos adicionais futuramente.", icon: Archive, color: "text-slate-600 bg-slate-50" }
  ];

  if (loading) {
    return (
      <BossLayout>
        <div className="flex-1 p-6 md:p-10 flex items-center justify-center bg-gray-50 text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-cyan-600 rounded-full animate-spin"></div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500 font-mono">Sincronizando Google Docs...</span>
          </div>
        </div>
      </BossLayout>
    );
  }

  return (
    <BossLayout>
      <div className="flex-1 p-6 md:p-10 space-y-6 max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button 
              onClick={() => navigate('/boss-giffoni-clientes/configuracoes')}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-950 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Voltar para Configurações
            </button>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Google Docs Integration (GDI)</h2>
                <p className="text-xs text-gray-500 font-medium font-mono">Módulo Server-To-Server de Documentos Inteligentes</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 text-[9px] font-black uppercase border tracking-widest rounded-lg font-mono shadow-sm ${
              config.status === 'ativo' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              config.status === 'preparado' ? 'bg-blue-50 text-blue-800 border-blue-200' :
              config.status === 'em_teste' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              config.status === 'erro' ? 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse' :
              'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
              {config.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-slate-900 border border-slate-950 p-6 rounded-3xl flex gap-4 text-slate-100 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
            <FileText size={180} className="text-white" />
          </div>
          <Info size={24} className="text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1 relative z-10">
            <p className="text-xs font-black uppercase tracking-widest text-cyan-400 font-mono">Conector Real Homologado GDI</p>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              Este barramento permite preencher de forma 100% autônoma e em tempo real minutas estruturadas no Google Docs usando tokens do cadastro de Clientes PF/PJ do Portal BOSS, vinculando as peças diretamente às pastas do Google Drive de cada caso.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            {/* MAIN CONFIGURATION FORM */}
            <form onSubmit={handleSave} className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm animate-fadeIn">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 border-b border-gray-100 pb-3">Parâmetros de Barramento GDI</h3>
              
              <div className="space-y-5">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">GDI API Base URL *</label>
                  <p className="text-[11px] text-gray-500 font-medium">URL pública de produção do seu runtime Cloud Run para acesso à API do GDI.</p>
                  <input
                    type="text"
                    required
                    value={config.endpointUrl}
                    onChange={(e) => setConfig({ ...config, endpointUrl: e.target.value })}
                    placeholder="https://gdi-api.exemplo.run.app"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="text-[10px] text-indigo-600 font-mono font-medium">Receptor Webhook: {config.endpointUrl.trim() ? `${config.endpointUrl.trim().replace(/\/$/, "")}/api/webhook/gdi-job` : ''}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Chave de Integração GDI (settings.connectors.googleDocs.integrationKey) *</label>
                  <p className="text-[11px] text-gray-500 font-medium">Token secreto fornecido no header X-BOSS-Google-Docs-Integration-Key.</p>
                  <input
                    type="password"
                    value={config.integrationKey}
                    onChange={(e) => setConfig({ ...config, integrationKey: e.target.value })}
                    placeholder="boss_docs_live_xxxxxxxx"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Estratégia de Modelos (folder templateKey ID)</label>
                  <input
                    type="text"
                    value={config.templatesStrategy}
                    onChange={(e) => setConfig({ ...config, templatesStrategy: e.target.value })}
                    placeholder="id_do_modelo_padrao"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Status da Conexão *</label>
                  <select
                    value={config.status}
                    onChange={(e) => setConfig({ ...config, status: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                  >
                    <option value="não_configurado">Não Configurado</option>
                    <option value="preparado">Preparado</option>
                    <option value="em_teste">Em Testes</option>
                    <option value="ativo">Ativo</option>
                    <option value="erro">Erro</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Notas Técnicas de Implantação</label>
                  <textarea
                    value={config.notes}
                    onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                    rows={2}
                    placeholder="Documente notas de roteamento ou segredos vinculados a este nó fático..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* REPAIR AND DIAGNOSTIC QUICK-ACTIONS (Section 6, 7 & 8) */}
              <div className="bg-slate-50 border border-indigo-100 p-5 rounded-2xl space-y-3 shadow-inner my-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-950 font-mono flex items-center gap-2">
                  <Activity size={12} className="text-indigo-600 shrink-0" />
                  <span>Controles de Autocorreção e Diagnóstico GDI (Ajuste Imediato)</span>
                </p>
                <p className="text-[11px] text-gray-650 leading-normal">
                  Utilize as ações rápidas abaixo para forçar a limpeza de URLs inválidas/AI Studio ou sincronizar imediatamente a URL de homologação real do GDI.
                </p>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Button: Diagnosticar GDI */}
                  <button
                    type="button"
                    onClick={handleDiagnosticarGDI}
                    id="btn-diagnose-gdi"
                    className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                    title="Realizar probe fático de conexão e verificação de login redirect, HTML e JSON"
                  >
                    <Activity size={12} className="shrink-0 text-white animate-spin" style={{ animationDuration: '4s' }} />
                    <span>Diagnosticar GDI</span>
                  </button>

                  {/* 6. Button: Limpar configuração inválida do GDI */}
                  <button
                    type="button"
                    onClick={handleClearInvalidGDI}
                    id="btn-clear-invalid-gdi"
                    className="px-3.5 py-1.5 bg-rose-55 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Limpar URL do AI Studio e redefinir barramento no Firestore"
                  >
                    <X size={11} className="shrink-0" />
                    <span>Limpar configuração inválida do GDI</span>
                  </button>

                  {/* 7. Button: Salvar URL real do GDI */}
                  <button
                    type="button"
                    onClick={handleSaveRealGDI}
                    id="btn-save-real-gdi"
                    className="px-3.5 py-1.5 bg-emerald-55 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Salvar URL homologada real no Firestore"
                  >
                    <Check size={11} className="shrink-0" />
                    <span>Salvar URL real do GDI</span>
                  </button>

                  {/* Button: Corrigir URL GDI agora */}
                  <button
                    type="button"
                    onClick={handleCorrectGdiNow}
                    id="btn-correct-gdi-now"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                    title="Corrigir URL GDI agora para a URL homologada real no Firestore"
                  >
                    <Check size={11} className="shrink-0 text-white" />
                    <span>Corrigir URL GDI agora</span>
                  </button>

                  {/* 8. Button: Testar Conexão GDI */}
                  <button
                    type="button"
                    onClick={handleManualTestGDI}
                    id="btn-test-connection-gdi"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Invocar GET /api/config e verificar se retorna JSON fático"
                  >
                    <Play size={11} className="shrink-0 text-white" />
                    <span>Testar Conexão GDI</span>
                  </button>

                  {connectionTestLabel && (
                    <span id="gdi-test-status-badge" className={`px-2.5 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider rounded-lg ${
                      connectionTestLabel.includes('conectado') 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                    }`}>
                      {connectionTestLabel}
                    </span>
                  )}
                </div>
              </div>

              {feedback && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-start justify-between ${
                  feedback.type === 'success' ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 animate-fadeIn' : 'bg-rose-50 text-rose-950 border border-rose-200 animate-fadeIn'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={16} className={`shrink-0 mt-0.5 ${feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
                    <span>{feedback.message}</span>
                  </div>
                  <button type="button" onClick={() => setFeedback(null)} className="shrink-0">
                    <X size={14} className="opacity-60 hover:opacity-100 cursor-pointer" />
                  </button>
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={() => handleTestGDI(false)}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <Play size={12} className="shrink-0" />
                    <span>{testing ? 'Verificando...' : 'Testar Conexão GDI'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={testing}
                    onClick={() => handleTestGDI(true)}
                    className="px-4 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer"
                    title="Enviar payload de diagnóstico real"
                  >
                    <Check size={12} className="shrink-0" />
                    <span>{testing ? 'Verificando...' : 'Enviar payload de diagnóstico real'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLogs(!showLogs)}
                    className="px-3.5 py-2 bg-gray-50 hover:bg-gray-105 text-gray-750 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2"
                  >
                    <Terminal size={12} className="shrink-0" />
                    <span>Logs</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {config.status !== 'não_configurado' && (
                    <button
                      type="button"
                      onClick={handleDisable}
                      className="px-4 py-2 hover:bg-red-50 text-red-500 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                    >
                      Desativar
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer transition-all"
                  >
                    <Save size={14} className="shrink-0" />
                    <span>{saving ? 'Gravando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 space-y-6">
            
            {/* ETAPA 4 — DIAGNÓSTICO VISUAL */}
            <div className="bg-slate-900 border border-slate-950 rounded-3xl p-6 text-white space-y-5 shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Activity size={16} className="text-cyan-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">Diagnóstico da Integração GDI</h3>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">1. GDI API URL:</span>
                  <p className="text-slate-100 font-mono break-all font-bold bg-slate-950 p-2 rounded-xl border border-slate-800 text-[10px]">
                    {config.endpointUrl || '(Não configurada)'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">2. Webhook URL:</span>
                  <p className="text-slate-100 font-mono break-all font-bold bg-slate-950 p-2 rounded-xl border border-slate-800 text-[10px]">
                    {config.endpointUrl ? `${config.endpointUrl.trim().replace(/\/$/, "")}/api/webhook/gdi-job` : '(Não configurada)'}
                  </p>
                </div>

                <div className="space-y-1 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">3. Status:</span>
                  <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase font-mono tracking-wider ${
                    config.status === 'ativo' ? 'bg-emerald-950/80 text-emerald-400' :
                    config.status === 'erro' ? 'bg-rose-955/80 text-rose-400 animate-pulse' :
                    'bg-slate-950 text-slate-400'
                  }`}>
                    {config.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">4. Último teste:</span>
                  <span className="text-slate-200 text-[11px] font-mono leading-none">
                    {config.lastTestAt || '(Nenhum realizado)'}
                  </span>
                </div>

                <div className="space-y-1 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">5. Última resposta:</span>
                  <span className="font-mono text-slate-200 text-[11px] bg-slate-950 p-1 px-2 rounded-lg border border-slate-850">
                    {config.lastHttpStatus ? `HTTP ${config.lastHttpStatus}` : 'N/A'}
                  </span>
                </div>

                <div className="space-y-1.5 border-t border-slate-800 pt-3 flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">Fato de Diagnóstico GDI (API):</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      diagnosticState === 'operacional' ? 'bg-emerald-500 animate-pulse' :
                      diagnosticState === 'parcial' ? 'bg-amber-500 animate-pulse' :
                      diagnosticState === 'invalida' ? 'bg-rose-500 animate-pulse' :
                      'bg-slate-500'
                    }`} />
                    <span className="font-mono text-[10px] font-black uppercase tracking-wider text-slate-100">
                      {diagnosticState === 'operacional' ? '🟢 Operacional' :
                       diagnosticState === 'parcial' ? '🟡 Parcial' :
                       diagnosticState === 'invalida' ? '🔴 Inválida' :
                       '⚪ Sem Diagnóstico'}
                    </span>
                  </div>
                  {diagnosticMessage && (
                    <p className={`p-2 rounded-lg text-[10px] leading-relaxed font-semibold font-mono ${
                      diagnosticState === 'operacional' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40' :
                      diagnosticState === 'parcial' ? 'bg-amber-950/40 text-amber-300 border border-amber-900/40' :
                      'bg-rose-955/40 text-rose-300 border border-rose-900/40 animate-pulse'
                    }`}>
                      {diagnosticMessage}
                    </p>
                  )}
                </div>

                {/* 6. Último payload enviado */}
                <div className="space-y-1 bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <button 
                    type="button" 
                    onClick={() => setExpandSentPayload(!expandSentPayload)}
                    className="w-full flex items-center justify-between text-left outline-none cursor-pointer"
                  >
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">6. Último Payload Enviado</span>
                    {expandSentPayload ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                  </button>
                  {expandSentPayload && (
                    <div className="pt-2 animate-fadeIn">
                      <pre className="text-[10px] text-slate-300 font-mono overflow-auto max-h-48 leading-tight bg-slate-900 border border-slate-800 p-2 rounded-lg">
                        {config.lastSentPayload ? JSON.stringify(config.lastSentPayload, null, 2) : '(Ainda não enviado)'}
                      </pre>
                    </div>
                  )}
                </div>

                {/* 7. Último payload recebido */}
                <div className="space-y-1 bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <button 
                    type="button" 
                    onClick={() => setExpandReceivedPayload(!expandReceivedPayload)}
                    className="w-full flex items-center justify-between text-left outline-none cursor-pointer"
                  >
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">7. Último Payload Recebido</span>
                    {expandReceivedPayload ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                  </button>
                  {expandReceivedPayload && (
                    <div className="pt-2 animate-fadeIn">
                      <pre className="text-[10px] text-slate-300 font-mono overflow-auto max-h-48 leading-tight bg-slate-900 border border-slate-800 p-2 rounded-lg">
                        {config.lastReceivedPayload ? JSON.stringify(config.lastReceivedPayload, null, 2) : '(Ainda não recebido)'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOG PANEL */}
        {showLogs && (
          <div className="bg-slate-900 border border-slate-950 p-6 rounded-3xl text-slate-100 font-mono text-xs space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-2">
                <Terminal size={14} className="text-indigo-400" />
                <span>Histórico de Logs — GDI Real-time Engine</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLogs(false)}
                className="text-slate-400 hover:text-white font-sans text-xs font-semibold cursor-pointer"
              >
                Ocultar Logs
              </button>
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-2 bg-slate-950 p-4 rounded-2xl shadow-inner scrollbar-thin text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">Nenhum log gerado na sessão de monitoria atual. Efetue testes de conexão.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="hover:bg-slate-900/40 p-1 rounded border-l-2 border-indigo-500/80 pl-2 transition">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SHORTCUTS */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Atalhos de Automação de Documentos</h3>
            <p className="text-xs text-gray-500 font-medium">Modelos preparados que serão futuramente vinculados ao Google Docs real</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcutCards.map((card, idx) => (
              <div key={idx} className="bg-white border border-gray-150 rounded-2xl p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-tight">{card.name}</h4>
                  <p className="text-[11px] text-gray-500 leading-normal font-semibold">
                    {card.desc}
                  </p>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider font-mono">Placeholder Futuro</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BossLayout>
  );
}
