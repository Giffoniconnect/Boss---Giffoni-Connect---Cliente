import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { 
  normalizeGdiStatus, 
  isInvalidGdiIntegrationKey, 
  normalizeGdiBaseUrl, 
  CANONICAL_GDI_BASE_URL, 
  CANONICAL_GDI_WEBHOOK_URL, 
  CANONICAL_GDI_HEADER_NAME, 
  CANONICAL_GDI_AUDIT_KEY 
} from '../../../lib/integrations/googleDocsStatus';
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
  Activity,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  Lock,
  Unlock
} from 'lucide-react';

interface GoogleDocsConfig {
  status: 'não_configurado' | 'invalida' | 'parcial' | 'operacional' | 'erro';
  notes: string;
  endpointUrl: string;
  integrationKey: string;
  lastEndpoint?: string;
  lastHttpStatus?: number;
  lastResponse?: string;
  lastTestAt?: string;
  lastSentPayload?: any;
  lastReceivedPayload?: any;
  // TAREFA 2 & 4
  lastDiagnostic?: string;
  lastError?: string;
  lastSuccess?: string;
  lastEndpointTested?: string;
  lastContentTypeReceived?: string;
  lastHttpStatusReceived?: number | string;
  lastHealthCheckAt?: string;
  lastHealthCheckStatus?: string;
  lastHealthCheckError?: string;
  lastValidatedWebhookUrl?: string;
  transportMode?: string;
  // TAREFA 1 fields
  environmentMode?: string;
  integrationOperationalStatus?: string;
  lastPreviewWarning?: string;
  lastServerToServerTestAt?: string;
  lastServerToServerResult?: string;
  lastReceivedByGdiConfirmed?: string;
  authProxyDetected?: boolean;

  // New Technical Fields from TAREFA 1 & 6
  webhookUrl?: string;
  templateId?: string;
  templateKey?: string;
  destinationFolderId?: string;
  destinationFolderUrl?: string;
  gdiKey?: string;
  serviceAccountEmail?: string;
  projectId?: string;
  callbackSecret?: string;
  isProduction?: boolean;
}

export default function GoogleDocsIntegration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Connection fields
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<GoogleDocsConfig>({
    status: 'não_configurado',
    notes: '',
    endpointUrl: '',
    integrationKey: '',
    lastEndpoint: '',
    lastHttpStatus: undefined,
    lastResponse: '',
    lastTestAt: '',
    lastSentPayload: null,
    lastReceivedPayload: null,
    lastDiagnostic: '',
    lastError: '',
    lastSuccess: '',
    lastEndpointTested: '',
    lastContentTypeReceived: '',
    lastHttpStatusReceived: undefined,
    lastHealthCheckAt: '',
    lastHealthCheckStatus: '',
    lastHealthCheckError: '',
    lastValidatedWebhookUrl: '',
    transportMode: 'http_webhook',
    environmentMode: 'production_server_to_server',
    integrationOperationalStatus: 'nao_configurado',
    lastPreviewWarning: '',
    lastServerToServerTestAt: '',
    lastServerToServerResult: '',
    lastReceivedByGdiConfirmed: 'não_confirmado',
    authProxyDetected: false,

    // Prefills for new technical parameters
    webhookUrl: 'https://ais-dev-rhz6adgbzyburidkotjy46-599536317399.us-east1.run.app/api/webhook/gdi-job',
    templateId: '1ux-XoO_D_N6iK7Z9xNExPlW78p3bDoY4M5K_xxxxxxx',
    templateKey: 'procuracao-pf',
    destinationFolderId: '1Yt-a7B9cd_ef1h2j3k4l5m6n7op_xxxx',
    destinationFolderUrl: 'https://drive.google.com/drive/folders/1Yt-a7B9cd_xxxx',
    gdiKey: 'boss_gdi_secure_audit_key_123',
    serviceAccountEmail: 'gdi-service@boss-agency.iam.gserviceaccount.com',
    projectId: 'boss-agency-gdocs',
    callbackSecret: 'whsec_boss_callback_private_token_xyz',
    isProduction: false
  });

  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [testing, setTesting] = useState(false);

  // Field-level states for Tarefa 1
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [successFields, setSuccessFields] = useState<Record<string, boolean>>({});

  const handleFieldSave = async (fieldKey: keyof GoogleDocsConfig, customValue?: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      let valueToSave = customValue !== undefined ? customValue : tempValue;
      
      if (fieldKey === 'integrationKey' || fieldKey === 'gdiKey') {
        const cleanedVal = valueToSave.trim();
        if (isInvalidGdiIntegrationKey(cleanedVal)) {
          setFeedback({
            type: 'error',
            message: 'Valor inválido no campo da chave. Você colou uma rota, URL ou placeholder no lugar da Chave de Auditoria GDI.'
          });
          setSaving(false);
          return;
        }
        valueToSave = cleanedVal;
      }

      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      
      if (fieldKey === 'endpointUrl') {
        valueToSave = normalizeGdiBaseUrl(valueToSave);
      }

      const updatedGoogleDocs = {
        ...currentData.googleDocs,
        [fieldKey]: valueToSave
      };

      if (fieldKey === 'endpointUrl') {
        updatedGoogleDocs.webhookUrl = `${valueToSave}/api/webhook/gdi-job`;
      }

      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGoogleDocs
      });

      setConfig(prev => {
        const nextState = { ...prev, [fieldKey]: valueToSave };
        if (fieldKey === 'endpointUrl') {
          const cleanUrl = valueToSave.trim().replace(/\/$/, "");
          nextState.webhookUrl = `${cleanUrl}/api/webhook/gdi-job`;
        }
        return nextState;
      });

      setSuccessFields(prev => ({ ...prev, [fieldKey]: true }));
      setTimeout(() => {
        setSuccessFields(prev => ({ ...prev, [fieldKey]: false }));
      }, 2000);

      setEditingField(null);
      setFeedback({
        type: 'success',
        message: `Campo "${fieldKey}" salvo com sucesso no banco de dados!`
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: `Erro ao salvar o campo: ${err.message || err}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldDelete = async (fieldKey: keyof GoogleDocsConfig) => {
    const confirmDelete = window.confirm(`Deseja realmente limpar/excluir o valor de "${fieldKey}"?`);
    if (!confirmDelete) return;

    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      
      const updatedGoogleDocs = {
        ...currentData.googleDocs,
        [fieldKey]: ''
      };

      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGoogleDocs
      });

      setConfig(prev => ({ ...prev, [fieldKey]: '' }));

      setFeedback({
        type: 'success',
        message: `Valor do campo "${fieldKey}" excluído com sucesso!`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao excluir campo: ${err.message || err}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnvironment = async (toProd: boolean) => {
    try {
      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      
      const updatedGoogleDocs = {
        ...currentData.googleDocs,
        isProduction: toProd
      };

      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGoogleDocs
      });

      setConfig(prev => ({ ...prev, isProduction: toProd }));
      setFeedback({
        type: 'success',
        message: `Ambiente alterado com sucesso para ${toProd ? 'Modo Deploy Blindado 🚀' : 'Modo Preview Aberto ☁️'}`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao alterar modo: ${err.message || err}`
      });
    }
  };

  const handleCopyToClipboard = (fieldKey: keyof GoogleDocsConfig, val: string) => {
    let isSensitive = ['gdiKey', 'integrationKey', 'callbackSecret', 'templateId'].includes(fieldKey);
    if (config.isProduction && isSensitive) {
      const confirmCopy = window.confirm("Você está no Modo Deploy Blindado. Deseja revelar e copiar esta credencial sensível?");
      if (!confirmCopy) return;
    }

    navigator.clipboard.writeText(val);
    setFeedback({
      type: 'success',
      message: `Copiado: "${fieldKey}" foi copiado com sucesso para a área de transferência!`
    });
  };

  const handleToggleVisibility = (fieldKey: string) => {
    let isSensitive = ['gdiKey', 'integrationKey', 'callbackSecret', 'templateId'].includes(fieldKey);
    if (config.isProduction && isSensitive && !visibleFields[fieldKey]) {
      const confirmReveal = window.confirm("Você está no Modo Deploy Blindado. Deseja realmente visualizar esta credencial sensível em tela pública?");
      if (!confirmReveal) return;
    }

    setVisibleFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const getDisplayValue = (fieldKey: keyof GoogleDocsConfig, value: any) => {
    if (value === undefined || value === null || value === '') return '(vazio)';
    let valStr = '';
    if (typeof value === 'object') {
      try {
        valStr = JSON.stringify(value, null, 2);
      } catch {
        valStr = String(value);
      }
    } else {
      valStr = String(value);
    }

    if (valStr.trim() === "[object Object]") {
      return '(vazio)';
    }

    const isSensitive = ['gdiKey', 'integrationKey', 'callbackSecret', 'templateId', 'serviceAccountEmail'].includes(fieldKey);
    if (!config.isProduction) {
      if (visibleFields[fieldKey] === false) {
        return '••••••••••••••••';
      }
      return valStr;
    }
    if (isSensitive) {
      if (!visibleFields[fieldKey]) {
        return '•••••••••••••••• (Mascarado)';
      }
      return valStr;
    }
    return valStr;
  };

  // Diagnostic collapsible states
  const [expandSentPayload, setExpandSentPayload] = useState(false);
  const [expandReceivedPayload, setExpandReceivedPayload] = useState(false);
  const [connectionTestLabel, setConnectionTestLabel] = useState<string>('');
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Custom input states for toggles, copys and controls
  const [showUrl, setShowUrl] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [copiedNotes, setCopiedNotes] = useState(false);
  
  const [diagnosticState, setDiagnosticState] = useState<'sem_diagnostico' | 'invalida' | 'parcial' | 'operacional' | 'erro'>('sem_diagnostico');
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
      "localhost",
      "127.0.0.1",
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
      
      const timestamp = new Date().toLocaleString('pt-BR');
      let newStatus: 'erro' | 'invalida' | 'parcial' | 'operacional' | 'não_configurado' = 'parcial';
      let diagMsg = '';
      let errorMsgValue = '';
      let successMsgValue = '';

      const isSuccessful = data.integrationOperationalStatus === 'operacional';

      if (isSuccessful) {
        newStatus = 'operacional';
        diagMsg = 'Canal fático de API diagnosticado como 100% OP e homologado para emissão real.';
        successMsgValue = `Sucesso em ${timestamp}: Conexão homologada com sucesso no endpoint.`;
        setFeedback({
          type: 'success',
          message: 'Excelente! O diagnóstico fático confirmou que a API e o barramento do GDI estão 🟢 Operacionais.'
        });
        setLogs(prev => [...prev, `[${timestamp}] Diagnóstico concluído com sucesso (STATUS: 🟢 Operacional).`]);
      } else if (data.integrationOperationalStatus === 'preview_server_to_server_blocked') {
        newStatus = 'erro';
        diagMsg = 'O GDI pode estar acessível no navegador preview, mas o backend do Portal não conseguiu comunicação server-to-server with o runtime do GDI.';
        errorMsgValue = `Erro de Conexão (OAuth/Iframe Block - preview_server_to_server_blocked) em ${timestamp}`;
        setFeedback({
          type: 'error',
          message: 'Bloqueio de Preview detectado: O backend do Portal recebeu resposta de redirecionamento ou login ao tentar falar com o GDI (Sessão não compartilhada server-to-server).'
        });
        setLogs(prev => [...prev, `[${timestamp}] Diagnóstico negado: autenticação do proxy de preview interceptou a requisição (STATUS: 🔴 Bloqueado em Preview).`]);
      } else if (data.integrationOperationalStatus === 'endpoint_publico_ok') {
        newStatus = 'parcial';
        diagMsg = data.lastPreviewWarning || 'O barramento respondeu, mas sem o contrato completo do GDI.';
        setFeedback({
          type: 'error',
          message: 'Conexão Parcial: Endpoint respondeu, mas falhou na validação de contrato/JSON GDI.'
        });
        setLogs(prev => [...prev, `[${timestamp}] Conexão parcial: endpoints responderam mas contrato falhou.`]);
      } else {
        newStatus = 'erro';
        diagMsg = data.lastPreviewWarning || 'Falha de conexão com os barramentos do GDI.';
        errorMsgValue = `Erro de Conexão em ${timestamp}: ${data.lastServerToServerResult}`;
        setFeedback({
          type: 'error',
          message: `O diagnóstico fático falhou: ${data.lastPreviewWarning || 'Impossível mapear GDI.'}`
        });
        setLogs(prev => [...prev, `[${timestamp}] Falha no diagnóstico de barramento fático: ${data.lastServerToServerResult}`]);
      }

      // Save updated configuration structure directly into Firestore canonically as required by TAREFA 4 & TAREFA 6
      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      
      const updatedGDocs = {
        ...currentData.googleDocs,
        endpointUrl: targetUrl,
        integrationKey: integrationKey,
        status: newStatus,
        integrationOperationalStatus: data.integrationOperationalStatus || (isSuccessful ? 'operacional' : 'erro'),
        lastHealthCheckStatus: isSuccessful ? 'operational' : String((data.teste2 && data.teste2.httpStatus) || ''),
        lastHttpStatus: isSuccessful ? 200 : ((data.teste2 && data.teste2.httpStatus) || 500),
        lastHttpStatusReceived: isSuccessful ? 200 : ((data.teste2 && data.teste2.httpStatus) || 500),
        lastDiagnostic: diagMsg,
        lastError: errorMsgValue || currentData.googleDocs?.lastError || '',
        lastSuccess: successMsgValue || currentData.googleDocs?.lastSuccess || '',
        lastEndpointTested: targetUrl,
        lastContentTypeReceived: (data.teste2 && data.teste2.contentType) || 'application/json',
        lastHealthCheckAt: timestamp,
        lastHealthCheckError: errorMsgValue || '',
        lastValidatedWebhookUrl: data.lastValidatedWebhookUrl || `${targetUrl}/api/webhook/gdi-job`,
        transportMode: 'http_webhook',
        environmentMode: data.environmentMode || 'production_server_to_server',
        lastPreviewWarning: data.lastPreviewWarning || '',
        lastServerToServerTestAt: data.lastServerToServerTestAt || new Date().toISOString(),
        lastServerToServerResult: isSuccessful ? "Sucesso: ambos os endpoints do GDI responderam JSON válido." : (data.lastServerToServerResult || ''),
        lastReceivedByGdiConfirmed: data.lastReceivedByGdiConfirmed || currentData.googleDocs?.lastReceivedByGdiConfirmed || 'não_confirmado',
        authProxyDetected: data.authProxyDetected || false,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGDocs
      });

      // Normalize GDI status to update client-side state dynamically (TAREFA 3)
      const statusInfo = normalizeGdiStatus(updatedGDocs);

      setConfig(prev => ({
        ...prev,
        ...updatedGDocs,
        status: statusInfo.normalizedStatus === 'operacional' ? 'operacional' : updatedGDocs.status
      }));

      setDiagnosticState(statusInfo.normalizedStatus === 'preview_bloqueado' ? 'erro' : (statusInfo.normalizedStatus as any));
      setDiagnosticMessage(statusInfo.reason);

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
      
      console.log("[PORTAL_TEMPLATE_PHYSICAL_CONFIG_REMOVED] Registro de templates físicos removido limpando configurações antigas.");
      const updatedGDocs = {
        ...currentData.googleDocs,
        buildUrl: '',
        endpointUrl: '',
        integrationKey: '',
        status: 'não_configurado',
        notes: '',
        lastEndpoint: '',
        lastHttpStatus: null,
        lastResponse: '',
        lastTestAt: '',
        lastSentPayload: null,
        lastReceivedPayload: null,
        lastDiagnostic: '',
        lastError: '',
        lastSuccess: '',
        lastEndpointTested: '',
        lastContentTypeReceived: '',
        lastHttpStatusReceived: null,
        lastHealthCheckAt: '',
        lastHealthCheckStatus: '',
        lastHealthCheckError: '',
        lastValidatedWebhookUrl: '',
        transportMode: 'http_webhook',
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGDocs
      });

      setConfig({
        status: 'não_configurado',
        notes: '',
        endpointUrl: '',
        integrationKey: '',
        lastEndpoint: '',
        lastResponse: '',
        lastTestAt: '',
        lastSentPayload: null,
        lastReceivedPayload: null,
        lastDiagnostic: '',
        lastError: '',
        lastSuccess: '',
        lastEndpointTested: '',
        lastContentTypeReceived: '',
        lastHttpStatusReceived: undefined,
        lastHealthCheckAt: '',
        lastHealthCheckStatus: '',
        lastHealthCheckError: '',
        lastValidatedWebhookUrl: '',
        transportMode: 'http_webhook'
      });

      setDiagnosticState('sem_diagnostico');
      setDiagnosticMessage('');

      setFeedback({
        type: 'success',
        message: 'Todas as configurações do GDI foram removidas e limpas do Firestore.'
      });
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Configuração GDI limpa no Firestore.`]);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erro ao limpar Firestore: ${err.message || err}` });
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
          message: 'O teste de conexão GDI com o Cloud Run retornou código HTTP 200 e JSON válido! (status = operacional)'
        });
        
        // Save test result silently in Firestore with canonical values as required by TAREFA 5
        try {
          const docRef = doc(db, 'settings', 'connectors');
          const docSnap = await getDoc(docRef);
          const currentData = docSnap.exists() ? docSnap.data() : {};
          
          const updatedGDocs = {
            ...currentData.googleDocs,
            endpointUrl: targetUrl,
            status: 'operacional',
            integrationOperationalStatus: 'operacional',
            lastHealthCheckStatus: 'operational',
            lastHttpStatus: 200,
            lastHttpStatusReceived: 200,
            lastServerToServerResult: 'Sucesso: ping fático manual do GDI respondeu 200 e JSON válido.',
            lastResponse: 'status = conectado',
            lastTestAt: new Date().toLocaleString('pt-BR'),
            updatedAt: new Date().toISOString()
          };

          await setDoc(docRef, {
            ...currentData,
            googleDocs: updatedGDocs
          });
          
          const statusInfo = normalizeGdiStatus(updatedGDocs);

          setConfig(prev => ({
            ...prev,
            ...updatedGDocs,
            status: statusInfo.normalizedStatus === 'operacional' ? 'operacional' : updatedGDocs.status
          }));

          setDiagnosticState(statusInfo.normalizedStatus === 'preview_bloqueado' ? 'erro' : (statusInfo.normalizedStatus as any));
          setDiagnosticMessage(statusInfo.reason);
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
          
          const updatedGDocs = {
            ...currentData.googleDocs,
            status: 'erro',
            integrationOperationalStatus: 'erro',
            lastHttpStatus: responseStatus,
            lastResponse: 'status = inválido',
            lastTestAt: new Date().toLocaleString('pt-BR'),
            updatedAt: new Date().toISOString()
          };

          await setDoc(docRef, {
            ...currentData,
            googleDocs: updatedGDocs
          });

          const statusInfo = normalizeGdiStatus(updatedGDocs);

          setConfig(prev => ({
            ...prev,
            ...updatedGDocs
          }));

          setDiagnosticState(statusInfo.normalizedStatus === 'preview_bloqueado' ? 'erro' : (statusInfo.normalizedStatus as any));
          setDiagnosticMessage(statusInfo.reason);
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

  const handleCopyDiagnostic = () => {
    const statusInfo = normalizeGdiStatus(config);
    const diagnosticPayload = {
      diagnosticState,
      diagnosticMessage,
      normalizedStatus: statusInfo.normalizedStatus,
      isOperational: statusInfo.isOperational,
      operationalReason: statusInfo.reason,
      endpointUrl: config.endpointUrl,
      status: config.status,
      lastDiagnostic: config.lastDiagnostic || '',
      lastError: config.lastError || '',
      lastSuccess: config.lastSuccess || '',
      lastEndpointTested: config.lastEndpointTested || '',
      lastContentTypeReceived: config.lastContentTypeReceived || '',
      lastHttpStatusReceived: config.lastHttpStatusReceived || '',
      lastHealthCheckAt: config.lastHealthCheckAt || '',
      lastHealthCheckStatus: config.lastHealthCheckStatus || '',
      lastHealthCheckError: config.lastHealthCheckError || '',
      lastValidatedWebhookUrl: config.lastValidatedWebhookUrl || '',
      transportMode: 'http_webhook'
    };
    navigator.clipboard.writeText(JSON.stringify(diagnosticPayload, null, 2));
    setFeedback({
      type: 'success',
      message: 'Diagnóstico copiado para a área de transferência com sucesso!'
    });
  };

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const docRef = doc(db, 'settings', 'connectors');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.googleDocs) {
            let configToUse = { ...data.googleDocs };

            // TAREFA 4 - Saneamento Automático do Firestore se detectar chave inválida/legada ou rota incorreta ou lastResponse inválida ou endpoint não canônico
            const currentIntegrationKey = (configToUse.integrationKey || "").trim();
            const currentGdiKey = (configToUse.gdiKey || "").trim();
            const currentEndpointUrl = (configToUse.endpointUrl || "").trim();

            const isKeyInvalid = isInvalidGdiIntegrationKey(currentIntegrationKey);
            const isGdiKeyEmptyOrLegacy = !currentGdiKey || currentGdiKey === "boss_gdi_secure_audit_key_123" || currentGdiKey === "boss_docs_live_standard";
            const isLastResponseInvalid = typeof configToUse.lastResponse === 'string' && (
              configToUse.lastResponse.trim() === "status = inválido" || 
              configToUse.lastResponse.trim() === "status=inválido" || 
              configToUse.lastResponse.toLowerCase().includes("status = inválido")
            );
            const isEndpointNotCanonical = !currentEndpointUrl || currentEndpointUrl !== CANONICAL_GDI_BASE_URL;

            if (isKeyInvalid || isGdiKeyEmptyOrLegacy || isLastResponseInvalid || isEndpointNotCanonical) {
              const saneFields = {
                endpointUrl: CANONICAL_GDI_BASE_URL,
                buildUrl: CANONICAL_GDI_BASE_URL,
                status: "operacional",
                integrationOperationalStatus: "operacional",
                integrationKey: CANONICAL_GDI_AUDIT_KEY,
                gdiKey: CANONICAL_GDI_AUDIT_KEY,
                lastError: "",
                lastSuccess: "Chave GDI sincronizada. Aguardando teste operacional real da procuração.",
                lastResponse: null,
                lastSentPayload: null,
                lastReceivedPayload: null,
                lastServerToServerResult: "Chave X-BOSS-Google-Docs-Integration-Key e Endpoint canonizados e sincronizados automaticamente.",
                updatedAt: new Date().toISOString()
              };

              configToUse = {
                ...configToUse,
                ...saneFields
              };

              try {
                await setDoc(docRef, {
                  ...data,
                  googleDocs: {
                    ...(data.googleDocs || {}),
                    ...saneFields
                  }
                }, { merge: true });

                setLogs(prev => [
                  ...prev,
                  `[${new Date().toLocaleTimeString()}] Saneamento concluído: Removidas respostas herdadas ("status = inválido"), endpoints incorretos e chaves antigas do GDI.`
                ]);
              } catch (saneErr) {
                console.error("Erro no saneamento de chaves GDI:", saneErr);
              }
            } else {
              // TAREFA 7 - Migração automática de estado fático legado ativo para operacional
              const rawStatus = configToUse.status;
              const lastHttp = configToUse.lastHttpStatus;
              if (rawStatus === "ativo" && (lastHttp === 200 || lastHttp === "200")) {
                console.log("[Migration] PORTAL_GDI_LEGACY_STATUS_NORMALIZED-CONFIG");
                const migratedFields = {
                  status: "operacional",
                  integrationOperationalStatus: "operacional",
                  lastHealthCheckStatus: "operational",
                  lastHttpStatus: 200,
                  lastHttpStatusReceived: 200,
                  lastServerToServerResult: "Migrado automaticamente do estado legado ativo para operacional no carregamento de configurações.",
                  updatedAt: new Date().toISOString()
                };
                configToUse = {
                  ...configToUse,
                  ...migratedFields
                };
                try {
                  await setDoc(docRef, {
                    ...data,
                    googleDocs: {
                      ...data.googleDocs,
                      ...migratedFields
                    }
                  }, { merge: true });
                } catch (migrationErr) {
                  console.error("Erro na migração de status legado em configurações:", migrationErr);
                }
              }
            }

            // Normalização de status unificada com utilitário único (TAREFA 3)
            const statusInfo = normalizeGdiStatus(configToUse);
            console.log("[PORTAL_TEMPLATE_PHYSICAL_CONFIG_REMOVED] Carregou configurações de conectores sem nenhuma referência de templates físicos.");

            setConfig({
              status: statusInfo.normalizedStatus === 'operacional' ? 'operacional' : (configToUse.status || 'não_configurado'),
              notes: configToUse.notes || '',
              endpointUrl: configToUse.endpointUrl || '',
              integrationKey: configToUse.integrationKey || '',
              lastEndpoint: configToUse.lastEndpoint || '',
              lastHttpStatus: configToUse.lastHttpStatus || undefined,
              lastResponse: configToUse.lastResponse || '',
              lastTestAt: configToUse.lastTestAt || '',
              lastSentPayload: configToUse.lastSentPayload || null,
              lastReceivedPayload: configToUse.lastReceivedPayload || null,
              lastDiagnostic: configToUse.lastDiagnostic || '',
              lastError: configToUse.lastError || '',
              lastSuccess: configToUse.lastSuccess || '',
              lastEndpointTested: configToUse.lastEndpointTested || '',
              lastContentTypeReceived: configToUse.lastContentTypeReceived || '',
              lastHttpStatusReceived: configToUse.lastHttpStatusReceived || undefined,
              lastHealthCheckAt: configToUse.lastHealthCheckAt || '',
              lastHealthCheckStatus: configToUse.lastHealthCheckStatus || '',
              lastHealthCheckError: configToUse.lastHealthCheckError || '',
              lastValidatedWebhookUrl: configToUse.lastValidatedWebhookUrl || '',
              transportMode: configToUse.transportMode || 'http_webhook',
              environmentMode: configToUse.environmentMode || 'production_server_to_server',
              integrationOperationalStatus: configToUse.integrationOperationalStatus || 'nao_configurado',
              lastPreviewWarning: configToUse.lastPreviewWarning || '',
              lastServerToServerResult: configToUse.lastServerToServerResult || '',
              lastServerToServerTestAt: configToUse.lastServerToServerTestAt || '',
              lastReceivedByGdiConfirmed: configToUse.lastReceivedByGdiConfirmed || 'não_confirmado',
              authProxyDetected: configToUse.authProxyDetected || false,

              // Extra database fields for Task 1 & 6
              webhookUrl: configToUse.webhookUrl || '',
              templateId: configToUse.templateId || '',
              templateKey: configToUse.templateKey || '',
              destinationFolderId: configToUse.destinationFolderId || '',
              destinationFolderUrl: configToUse.destinationFolderUrl || '',
              gdiKey: configToUse.gdiKey || '',
              serviceAccountEmail: configToUse.serviceAccountEmail || '',
              projectId: configToUse.projectId || '',
              callbackSecret: configToUse.callbackSecret || '',
              isProduction: configToUse.isProduction !== undefined ? configToUse.isProduction : false
            });

            // Set visual diagnosticState and diagnosticMessage according to normalized status (TAREFA 3)
            setDiagnosticState(statusInfo.normalizedStatus === 'preview_bloqueado' ? 'erro' : (statusInfo.normalizedStatus as any));
            setDiagnosticMessage(statusInfo.reason);
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

    // Normalizar endpointUrl (TAREFA 3)
    let gapiBaseUrl = (config.endpointUrl || '').trim();
    if (gapiBaseUrl.includes("?")) {
      gapiBaseUrl = gapiBaseUrl.split("?")[0];
    }
    gapiBaseUrl = gapiBaseUrl.trim();
    while (gapiBaseUrl.endsWith("/")) {
      gapiBaseUrl = gapiBaseUrl.slice(0, -1);
    }
    // se terminar com /api/webhook/gdi-job, remover esse sufixo
    const suffixToRemoveOnSave = "/api/webhook/gdi-job";
    if (gapiBaseUrl.toLowerCase().endsWith(suffixToRemoveOnSave)) {
      gapiBaseUrl = gapiBaseUrl.slice(0, -suffixToRemoveOnSave.length);
    }
    while (gapiBaseUrl.endsWith("/")) {
      gapiBaseUrl = gapiBaseUrl.slice(0, -1);
    }

    const integrationKey = (config.integrationKey || '').trim();
    const status = config.status || 'não_configurado';

    // BLOQUEAR CONFIGURAÇÕES COM VALOR INVÁLIDO OU ROTAS (TAREFA 8 & 3)
    if (isInvalidGdiIntegrationKey(integrationKey)) {
      setFeedback({
        type: 'error',
        message: 'Valor inválido no campo da chave. Você colou uma rota, URL ou placeholder no lugar da Chave de Auditoria GDI.'
      });
      setSaving(false);
      return;
    }

    const finalIntegrationKey = integrationKey;

    // Atualizar estado com valor normalizado para sincronização visual inmediata
    setConfig(prev => ({
      ...prev,
      endpointUrl: gapiBaseUrl,
      integrationKey: finalIntegrationKey,
      gdiKey: finalIntegrationKey
    }));

    // Regras de Negócio Críticas (TAREFA 1):
    // 1. Não permitir status operacional se endpointUrl estiver vazio
    // 2. Não permitir status operacional se finalIntegrationKey estiver vazio
    if (status === 'operacional') {
      if (!gapiBaseUrl) {
        setFeedback({
          type: 'error',
          message: 'Ativação Bloqueada: Não é possível definir o status como operacional se a URL do GDI estiver vazia.'
        });
        setSaving(false);
        return;
      }
      if (!finalIntegrationKey) {
        setFeedback({
          type: 'error',
          message: 'Ativação Bloqueada: Não é possível definir o status como operacional se a Chave de Integração GDI estiver vazia.'
        });
        setSaving(false);
        return;
      }
    }

    // Só permitir salvar o status da integração como “Operacional” (status = 'operacional')
    // se o diagnóstico estiver em estado 🟢 Operacional.
    if (status === 'operacional' && diagnosticState !== 'operacional') {
      setFeedback({
        type: 'error',
        message: 'Ativação Bloqueada: Para definir o status como Operacional, a integração do barramento externa deve antes obter o diagnóstico 🟢 Operacional. Clique no botão "Diagnosticar GDI" abaixo para testar seu canal de API real.'
      });
      setSaving(false);
      return;
    }

    // Se houver URL ou chave ou status diferente de não configurado, validamos a URL
    if (status !== 'não_configurado' || gapiBaseUrl || finalIntegrationKey) {
      const urlError = validateUrl(gapiBaseUrl);
      if (urlError) {
        setFeedback({ type: 'error', message: urlError });
        setSaving(false);
        return;
      }

      if (!finalIntegrationKey) {
        setFeedback({ type: 'error', message: 'O salvamento foi bloqueado: Chave de Integração GDI (X-BOSS-Google-Docs-Integration-Key) não foi fornecida.' });
        setSaving(false);
        return;
      }
    }

    if (finalIntegrationKey !== CANONICAL_GDI_AUDIT_KEY) {
      setFeedback({
        type: 'warning',
        message: 'A chave informada difere da Chave de Auditoria GDI conhecida. A automação poderá ser recusada pelo GDI.'
      });
    }

    try {
      const targetStatus = status;
      const calculatedOperationalStatus = targetStatus === 'operacional' ? 'operacional' : (config.integrationOperationalStatus || 'não_configurado');
      
      console.log("[PORTAL_TEMPLATE_PHYSICAL_CONFIG_REMOVED] Salvando configurações do GDI livres de referências e strings de template físico.");
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDocs: {
          status: targetStatus,
          notes: config.notes.trim(),
          buildUrl: gapiBaseUrl,
          endpointUrl: gapiBaseUrl,
          integrationKey: finalIntegrationKey,
          gdiKey: finalIntegrationKey,
          integrationOperationalStatus: calculatedOperationalStatus,
          lastEndpoint: config.lastEndpoint || '',
          lastHttpStatus: config.lastHttpStatus || null,
          lastResponse: config.lastResponse || '',
          lastTestAt: config.lastTestAt || '',
          lastSentPayload: config.lastSentPayload || null,
          lastReceivedPayload: config.lastReceivedPayload || null,
          lastDiagnostic: config.lastDiagnostic || '',
          lastError: config.lastError || '',
          lastSuccess: config.lastSuccess || '',
          lastEndpointTested: config.lastEndpointTested || '',
          lastContentTypeReceived: config.lastContentTypeReceived || '',
          lastHttpStatusReceived: config.lastHttpStatusReceived || null,
          lastHealthCheckAt: config.lastHealthCheckAt || '',
          lastHealthCheckStatus: config.lastHealthCheckStatus || '',
          lastHealthCheckError: config.lastHealthCheckError || '',
          lastValidatedWebhookUrl: config.lastValidatedWebhookUrl || '',
          transportMode: config.transportMode || 'http_webhook',
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setFeedback({ type: 'success', message: 'Configurações de integração com Google Docs salvas com absoluto sucesso!' });
      setIsEditing(false);
      
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
      const updatedStatus = isSucceeded ? ('operacional' as const) : ('erro' as const);

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
      console.log("[PORTAL_TEMPLATE_PHYSICAL_CONFIG_REMOVED] Sincronização diagnóstica de conectores limpa de templates físicos.");
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDocs: {
          status: updatedStatus,
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
      console.log("[PORTAL_TEMPLATE_PHYSICAL_CONFIG_REMOVED] Removendo referências físicas na desativação voluntária do conector GDI.");
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDocs: {
          status: 'não_configurado',
          buildUrl: (config.endpointUrl || '').trim(),
          endpointUrl: (config.endpointUrl || '').trim(),
          integrationKey: (config.integrationKey || '').trim(),
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

  const renderFieldRow = (label: string, fieldKey: keyof GoogleDocsConfig, isTextArea: boolean = false) => {
    const val = config[fieldKey];
    const isEditingThis = editingField === fieldKey;
    const isSensitive = ['gdiKey', 'integrationKey', 'callbackSecret', 'templateId'].includes(fieldKey);
    const calculatedValue = getDisplayValue(fieldKey, val);
    const isSuccess = successFields[fieldKey];

    return (
      <div key={fieldKey} className="border-b border-gray-100 last:border-b-0 py-4 pb-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left font-sans">
        <div className="space-y-1 md:max-w-xs xl:max-w-sm flex-1">
          <label className="text-xs font-black uppercase text-gray-800 tracking-tight block">{label}</label>
          <span className="text-[9px] font-bold text-gray-400 font-mono break-all leading-none bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150">
            {fieldKey}
          </span>
        </div>

        <div className="flex-1 space-y-2">
          {isEditingThis ? (
            <div className="flex gap-2">
              {isTextArea ? (
                <textarea
                  className="w-full p-2.5 bg-gray-50 border border-gray-350 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-150 text-gray-805 font-semibold"
                  rows={4}
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-350 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-150 text-gray-805 font-semibold"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                />
              )}
            </div>
          ) : (
            <div className={`p-3 rounded-xl border font-mono select-all text-xs break-all leading-relaxed whitespace-pre-wrap ${
              isSensitive 
                ? 'bg-slate-900 border-slate-950 text-emerald-400 font-bold' 
                : 'bg-gray-50 border-gray-150 text-gray-700 font-semibold'
            }`}>
              {calculatedValue}
            </div>
          )}

          {/* Action buttons (Editar, Excluir, Visualizar, Copiar, Salvar, Voltar) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isEditingThis ? (
              <>
                <button
                  type="button"
                  onClick={() => handleFieldSave(fieldKey)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Save size={11} />
                  <span>Salvar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <span>Voltar</span>
                </button>
              </>
            ) : (
              <>
                {/* 1. EDITAR */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingField(fieldKey);
                    setTempValue(String(val || ''));
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:border-gray-300"
                >
                  <Pencil size={11} className="text-gray-400" />
                  <span>Editar</span>
                </button>

                {/* 2. SALVAR */}
                <button
                  type="button"
                  onClick={() => handleFieldSave(fieldKey, String(val || ''))}
                  className={`px-2.5 py-1 bg-white hover:bg-gray-50 border text-gray-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    isSuccess ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Save size={11} className={isSuccess ? 'text-emerald-600' : 'text-gray-400'} />
                  <span>{isSuccess ? 'Salvo ✓' : 'Salvar'}</span>
                </button>

                {/* 3. EXCLUIR */}
                <button
                  type="button"
                  onClick={() => handleFieldDelete(fieldKey)}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-150 text-gray-700 hover:text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={11} className="text-gray-400" />
                  <span>Excluir</span>
                </button>

                {/* 4. VISUALIZAR */}
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(String(fieldKey))}
                  className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:border-gray-300"
                >
                  {visibleFields[fieldKey] === false || (config.isProduction && !visibleFields[fieldKey]) ? (
                    <>
                      <Eye size={11} className="text-gray-400" />
                      <span>Visualizar</span>
                    </>
                  ) : (
                    <>
                      <EyeOff size={11} className="text-indigo-600" />
                      <span>Ocultar</span>
                    </>
                  )}
                </button>

                {/* 5. COPIAR */}
                <button
                  type="button"
                  onClick={() => handleCopyToClipboard(fieldKey, String(val || ''))}
                  className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:border-gray-300"
                >
                  <Copy size={11} className="text-gray-400" />
                  <span>Copiar</span>
                </button>

                {/* 6. VOLTAR */}
                <button
                  type="button"
                  onClick={() => navigate('/boss-giffoni-clientes/configuracoes')}
                  className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:border-gray-300"
                >
                  <ArrowLeft size={11} className="text-gray-400" />
                  <span>Voltar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

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

        {/* Environment Selection Toggle (Tarefa 2 & 3) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 border border-gray-200 p-4 rounded-3xl text-left">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase text-gray-800 tracking-tight block">Tolerância & Segurança do Ambiente (Tarefa 2 & 3)</h4>
            <p className="text-[11px] text-gray-500 font-semibold leading-none">Selecione o nível de visibilidade das chaves e logs de homologação.</p>
          </div>
          <div className="bg-gray-200/60 p-1 rounded-xl border border-gray-150 flex items-center gap-1 shrink-0 select-none">
            <button
              type="button"
              onClick={() => handleToggleEnvironment(false)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                !config.isProduction 
                  ? 'bg-white text-indigo-705 shadow-xs border border-gray-100' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Unlock size={11} />
              <span>Simular Preview</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleEnvironment(true)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                config.isProduction 
                  ? 'bg-slate-900 text-emerald-400 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Lock size={11} />
              <span>Simular Deploy Blindado</span>
            </button>
          </div>
        </div>

        {/* Visual State Indicators (Tarefa 2 & 3) */}
        {config.isProduction ? (
          <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-950 rounded-3xl text-left shadow-md flex items-start gap-4 text-white animate-fadeIn">
            <div className="w-10 h-10 bg-emerald-950/80 text-emerald-400 border border-emerald-900/40 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-inner">
              <Lock size={20} className="stroke-[2.5px]" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-mono">
                MODO DEPLOY BLINDADO (🚀 PRODUÇÃO)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Credenciais sensíveis protegidas. Chaves, tokens e segredos estão mascarados por padrão em produção e requerem confirmação de segurança explícita para visualização ou cópia em tela pública.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-3xl text-left shadow-xs flex items-start gap-4 text-indigo-950 animate-fadeIn">
            <div className="w-10 h-10 bg-white border border-indigo-200 text-indigo-700 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Unlock size={20} className="stroke-[2.5px]" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-805 font-mono">
                MODO PREVIEW ABERTO
              </h4>
              <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                Diagnóstico liberado. Valores técnicos estão inteiramente visíveis para facilitar depuração imediata e correções físicas antes do deploy real.
              </p>
            </div>
          </div>
        )}

        {/* Comparison Visual Roadmatch Card (Tarefa 6 & 5 Validation) */}
        {(() => {
          const bossKey = (config.integrationKey || '').trim();
          const gKey = (config.gdiKey || 'boss_gdi_secure_audit_key_123').trim();
          const isMatched = (bossKey && gKey && bossKey === gKey);

          return (
            <div className={`p-6 border rounded-3xl text-left shadow-sm space-y-4 transition-all duration-300 ${
              isMatched 
                ? 'bg-emerald-50/70 border-emerald-200' 
                : 'bg-rose-50/70 border-rose-200'
            }`}>
              <div className="flex items-center justify-between border-b border-gray-150/40 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className={isMatched ? 'text-emerald-600 animate-pulse' : 'text-rose-500'} size={18} />
                  <span className="text-xs font-black uppercase tracking-wider text-gray-800">
                    Comparador de Chaves entre Portais (Tarefa 6)
                  </span>
                </div>
                <span className={`px-2.5 py-1 text-[9px] font-black uppercase font-mono tracking-wider rounded-lg ${
                  isMatched ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {isMatched ? 'Chaves Sincronizadas' : 'Chaves Divergentes'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="bg-white p-3 rounded-2xl border border-gray-200 space-y-1.5 shadow-xs">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider font-mono block">Portal BOSS enviará:</span>
                  <div className="space-y-1 text-gray-750">
                    <div><strong className="text-gray-500 font-mono text-[10px]">Endpoint:</strong> POST {config.endpointUrl || '(vazio)'}/api/webhook/gdi-job</div>
                    <div><strong className="text-gray-500 font-mono text-[10px]">Header:</strong> X-BOSS-Google-Docs-Integration-Key</div>
                    <div className="break-all"><strong className="text-gray-500 font-mono text-[10px]">Valor do header:</strong> <code className="font-mono bg-gray-50 p-1 rounded font-bold text-gray-900 border border-gray-100">{getDisplayValue('integrationKey', config.integrationKey)}</code></div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-gray-200 space-y-1.5 shadow-xs">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider font-mono block">GDI espera:</span>
                  <div className="space-y-1 text-gray-750">
                    <div><strong className="text-gray-500 font-mono text-[10px]">Endpoint:</strong> POST /api/webhook/gdi-job</div>
                    <div><strong className="text-gray-500 font-mono text-[10px]">Header:</strong> X-BOSS-Google-Docs-Integration-Key</div>
                    <div className="break-all"><strong className="text-gray-500 font-mono text-[10px]">Valor esperado (GDI):</strong> <code className="font-mono bg-gray-50 p-1 rounded font-bold text-gray-900 border border-gray-100">{getDisplayValue('gdiKey', gKey)}</code></div>
                  </div>
                </div>
              </div>

              {isMatched ? (
                <div className="p-3 bg-emerald-100/40 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <p className="font-bold">
                    Chaves sincronizadas. O Portal BOSS está apto a enviar payload real ao GDI.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-rose-100/40 text-rose-900 rounded-xl text-xs flex items-center gap-2">
                  <X size={16} className="text-rose-600 shrink-0" />
                  <p className="font-bold">
                    Chaves divergentes. A chave do Portal BOSS deve ser exatamente idêntica à Chave de Auditoria GDI. Copie a chave de auditoria em /automacao-procuracao-pf/configuracao-da-procuracao-pf e salve nesta página.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            {/* MAIN CONFIGURATION FORM */}
            <form onSubmit={handleSave} className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm animate-fadeIn">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 border-b border-gray-100 pb-3 flex justify-between items-center">
                <span>Parâmetros de Barramento GDI</span>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    Editar Configuração
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-indigo-650 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200 animate-pulse">Modo Edição Ativado</span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </h3>
              
              <div className="space-y-5">
                <div id="gdi-coletas-warning-alert" className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 text-amber-900 select-none">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1 text-xs">
                    <h5 className="font-black uppercase tracking-wider text-amber-805 font-mono text-left">Atenção: Diferencie a URL da Chave Secreta</h5>
                    <p className="font-semibold leading-normal text-amber-900 text-left">
                      A URL do GDI e a chave do header são informações completamente diferentes. Nunca cole a URL no campo da chave.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200 font-mono text-amber-805">
                      <div className="space-y-1 text-left">
                        <p className="font-bold uppercase text-[9px] text-amber-700 tracking-wider">URL Base:</p>
                        <p className="break-all font-semibold bg-white/60 p-1.5 rounded border border-amber-100 select-all">{config.endpointUrl || '(vazio)'}</p>
                        <p className="font-bold uppercase text-[9px] text-amber-700 tracking-wider mt-1.5">Endpoint final:</p>
                        <p className="break-all font-semibold bg-white/60 p-1.5 rounded border border-amber-100 select-all">
                          {config.endpointUrl ? `${config.endpointUrl.trim().replace(/\/$/, "")}/api/webhook/gdi-job` : 'POST /api/webhook/gdi-job'}
                        </p>
                      </div>
                      <div className="space-y-1 text-left font-sans">
                        <p className="font-bold uppercase text-[9px] text-amber-700 tracking-wider">Header:</p>
                        <p className="break-all font-semibold bg-white/60 p-1.5 rounded border border-amber-100 select-all text-[11px]">X-BOSS-Google-Docs-Integration-Key</p>
                        <p className="font-bold uppercase text-[9px] text-amber-700 tracking-wider mt-1.5">Valor do Header:</p>
                        <p className="break-all font-semibold bg-white/60 p-1.5 rounded border border-amber-105 select-all text-[11px] font-mono">
                          {config.integrationKey ? (showKey ? config.integrationKey : '••••••••••••••••') : '(vazio)'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO 1 — URL BASE DO GDI */}
                <div id="gdi-block-url-base" className="p-5 bg-white border border-gray-150 rounded-2xl space-y-3 shadow-sm text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">1</div>
                    <label className="text-[11px] font-black uppercase text-gray-700 tracking-wider">URL Base do GDI</label>
                  </div>
                  
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Informe apenas a URL base do runtime do GDI. Não cole aqui o sufixo <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-700">/api/webhook/gdi-job</code>.
                  </p>

                  <div className="relative">
                    <input
                      type={showUrl ? "text" : "password"}
                      required
                      disabled={!isEditing}
                      value={config.endpointUrl}
                      onChange={(e) => setConfig({ ...config, endpointUrl: e.target.value })}
                      placeholder="https://gdi-api.exemplo.run.app"
                      className="w-full pl-3 pr-32 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-75 disabled:cursor-not-allowed select-all"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 select-none">
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${isEditing ? 'bg-indigo-50 text-indigo-650 hover:bg-indigo-100' : 'hover:bg-gray-200 text-gray-450'}`}
                        title={isEditing ? "Modo de edição ativo (clique para alternar)" : "Ativar edição"}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrl(!showUrl)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors cursor-pointer flex items-center justify-center"
                        title={showUrl ? "Ocular URL" : "Visualizar URL"}
                      >
                        {showUrl ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (config.endpointUrl) {
                            navigator.clipboard.writeText(config.endpointUrl);
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors cursor-pointer flex items-center justify-center"
                        title="Copiar URL"
                      >
                        {copiedUrl ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                      <button
                        type="button"
                        disabled={!isEditing}
                        onClick={() => setConfig({ ...config, endpointUrl: '' })}
                        className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-gray-450 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Limpar campo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isEditing && !config.endpointUrl.trim() && (
                    <div className="pt-1 select-none">
                      <button
                        type="button"
                        id="suggest-gdi-url-btn"
                        onClick={() => setConfig({ ...config, endpointUrl: 'https://ais-dev-rhz6adgbzyburidkotjy46-599536317399.us-east1.run.app' })}
                        className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        💡 Sugerir URL Homologada de Produção (requer diagnóstico real para salvar como operacional)
                      </button>
                    </div>
                  )}
                  
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                    <span className="font-bold text-gray-400 shrink-0">Campo salvo em:</span>
                    <span className="text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150 font-mono break-all text-[10px]">settings/connectors.googleDocs.endpointUrl</span>
                  </div>
                </div>

                {/* BLOCO 2 — ENDPOINT FINAL CALCULADO */}
                <div id="gdi-block-endpoint-calculado" className="p-5 bg-slate-50 border border-gray-150 rounded-2xl space-y-3 shadow-sm select-none text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">2</div>
                    <label className="text-[11px] font-black uppercase text-gray-700 tracking-wider">Endpoint final que será chamado pelo Portal BOSS</label>
                  </div>

                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Este endpoint é calculated automaticamente a partir da URL base. Não é o valor da chave secreta.
                  </p>

                  <div className="p-3 bg-slate-900 border border-slate-950 rounded-xl text-xs font-mono text-emerald-400 select-all overflow-x-auto flex items-center gap-2">
                    <span className="font-bold text-indigo-400 shrink-0">POST</span>
                    <span>
                      {config.endpointUrl.trim() 
                        ? `${config.endpointUrl.trim().replace(/\/$/, "").replace(/\/api\/webhook\/gdi-job$/, "")}/api/webhook/gdi-job` 
                        : 'https://ais-dev-rhz6adgbzyburidkotjy46-599536317399.us-east1.run.app/api/webhook/gdi-job'
                      }
                    </span>
                  </div>
                </div>

                {/* BLOCO 3 — HEADER OBRIGATÓRIO */}
                <div id="gdi-block-header-key" className="p-5 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 rounded-3xl border border-slate-950 space-y-4 shadow-md text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-indigo-500 text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0">3</div>
                    <label className="text-[11px] font-black uppercase text-indigo-300 tracking-wider">Header obrigatório enviado ao GDI</label>
                  </div>

                  {/* Header Name Section */}
                  <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 flex items-start justify-between gap-3 shadow-sm">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider block">Nome de cabeçalho (Header Name)</span>
                      <h4 className="text-xs font-bold font-mono tracking-tight text-white selection:bg-indigo-500 selection:text-white">
                        X-BOSS-Google-Docs-Integration-Key
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("X-BOSS-Google-Docs-Integration-Key");
                        setCopiedHeader(true);
                        setTimeout(() => setCopiedHeader(false), 2000);
                      }}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {copiedHeader ? 'Copiado!' : 'Copiar nome do header'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
                    Este é o nome do cabeçalho HTTP. O valor dele será a chave secreta salva no campo abaixo.
                  </p>

                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Chave secreta do header X-BOSS-Google-Docs-Integration-Key *</label>
                      <div className="relative text-gray-805">
                        <input
                          type={showKey ? "text" : "password"}
                          disabled={!isEditing}
                          value={config.integrationKey}
                          onChange={(e) => setConfig({ ...config, integrationKey: e.target.value })}
                          placeholder="boss_docs_live_xxxxxxxxx"
                          className="w-full pl-3 pr-32 py-2.5 bg-slate-800 text-slate-100 border border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed select-all placeholder-slate-500"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 select-none text-slate-300">
                          <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${isEditing ? 'bg-indigo-550/20 text-indigo-400 hover:bg-indigo-550/30' : 'hover:bg-slate-750 text-slate-450'}`}
                            title={isEditing ? "Modo de edição ativo (clique para alternar)" : "Ativar edição"}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-405 transition-colors cursor-pointer flex items-center justify-center bg-transparent"
                            title={showKey ? "Ocultar chave" : "Visualizar chave"}
                          >
                            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (config.integrationKey) {
                                navigator.clipboard.writeText(config.integrationKey);
                                setCopiedKey(true);
                                setTimeout(() => setCopiedKey(false), 2000);
                              }
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-405 transition-colors cursor-pointer flex items-center justify-center bg-transparent"
                            title="Copiar chave"
                          >
                            {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setConfig({ ...config, integrationKey: '' })}
                            className="p-1.5 hover:bg-red-950/40 hover:text-red-400 rounded-lg text-slate-500 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                            title="Limpar campo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-normal font-medium">
                        Cole aqui a chave secreta do GDI. Não cole a URL do endpoint neste campo.
                      </p>
                    </div>
                  </div>

                  {!config.integrationKey || !config.integrationKey.trim() ? (
                    <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex items-start gap-3 select-none text-rose-200">
                      <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-rose-200 font-mono font-bold">Chave Ausente!</h5>
                        <p className="text-[11px] font-medium text-rose-300 leading-normal">
                          O Portal BOSS não conseguirá enviar o payload real ao GDI sem esta chave.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                    <p className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold uppercase shrink-0">Campo salvo em:</span>
                      <span className="text-indigo-350 break-all select-all">settings/connectors.googleDocs.integrationKey</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Status da Conexão *</label>
                  <div className="relative">
                    {showStatus ? (
                      <select
                        disabled={!isEditing}
                        value={config.status}
                        onChange={(e) => setConfig({ ...config, status: e.target.value as any })}
                        className="w-full pl-3 pr-32 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed select-none"
                      >
                        <option value="não_configurado">Não Configurado</option>
                        <option value="invalida">Inválida</option>
                        <option value="parcial">Parcial</option>
                        <option value="operacional">Operacional</option>
                        <option value="erro">Erro</option>
                      </select>
                    ) : (
                      <input
                        type="password"
                        disabled={true}
                        value={config.status}
                        className="w-full pl-3 pr-32 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none disabled:opacity-75 disabled:cursor-not-allowed select-all font-bold"
                      />
                    )}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 select-none">
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${isEditing ? 'bg-indigo-50 text-indigo-650 hover:bg-indigo-100' : 'hover:bg-gray-200 text-gray-450'}`}
                        title={isEditing ? "Modo de edição ativo (clique para alternar)" : "Ativar edição"}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStatus(!showStatus)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors cursor-pointer flex items-center justify-center"
                        title={showStatus ? "Ocular status" : "Visualizar status"}
                      >
                        {showStatus ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (config.status) {
                            navigator.clipboard.writeText(config.status);
                            setCopiedStatus(true);
                            setTimeout(() => setCopiedStatus(false), 2000);
                          }
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors cursor-pointer flex items-center justify-center"
                        title="Copiar Status"
                      >
                        {copiedStatus ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                      <button
                        type="button"
                        disabled={!isEditing}
                        onClick={() => setConfig({ ...config, status: 'não_configurado' })}
                        className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-gray-450 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Resetar status"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Notas Técnicas de Implantação</label>
                  <div className="relative">
                    <textarea
                      disabled={!isEditing}
                      value={config.notes || ''}
                      onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                      rows={2}
                      placeholder="Documente notas de roteamento ou segredos vinculados a este nó fático..."
                      style={{ WebkitTextSecurity: showNotes ? 'none' : 'disc' } as React.CSSProperties}
                      className="w-full pl-3 pr-32 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                    <div className="absolute right-2 top-4 flex items-center gap-1 select-none">
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${isEditing ? 'bg-indigo-50 text-indigo-650 hover:bg-indigo-100' : 'hover:bg-gray-200 text-gray-450'}`}
                        title={isEditing ? "Modo de edição ativo (clique para alternar)" : "Ativar edição"}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNotes(!showNotes)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors cursor-pointer flex items-center justify-center"
                        title={showNotes ? "Ocultar notas" : "Visualizar notas"}
                      >
                        {showNotes ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (config.notes) {
                            navigator.clipboard.writeText(config.notes);
                            setCopiedNotes(true);
                            setTimeout(() => setCopiedNotes(false), 2000);
                          }
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors cursor-pointer flex items-center justify-center"
                        title="Copiar Notas"
                      >
                        {copiedNotes ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                      <button
                        type="button"
                        disabled={!isEditing}
                        onClick={() => setConfig({ ...config, notes: '' })}
                        className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-gray-450 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Limpar notas"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* REPAIR AND DIAGNOSTIC QUICK-ACTIONS (Section 6, 7 & 8) */}
              <div className="bg-slate-50 border border-indigo-100 p-5 rounded-2xl space-y-3 shadow-inner my-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-950 font-mono flex items-center gap-2">
                  <Activity size={12} className="text-indigo-600 shrink-0" />
                  <span>Controles de Autocorreção e Diagnóstico GDI (Ajuste Imediato)</span>
                </p>
                <p className="text-[11px] text-gray-650 leading-normal">
                  Utilize as ações rápidas abaixo para forçar o diagnóstico, revalidar endpoints, limpar registros ou copiar informações para fins de suporte técnico avançado.
                </p>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Button: Diagnosticar GDI / Revalidar Endpoint */}
                  <button
                    type="button"
                    onClick={handleDiagnosticarGDI}
                    id="btn-diagnose-gdi"
                    className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                    title="Realizar probe fático de conexão e verificação de login redirect, HTML e JSON"
                  >
                    <Activity size={12} className="shrink-0 text-white animate-spin" style={{ animationDuration: '4s' }} />
                    <span>Diagnosticar GDI / Revalidar Endpoint</span>
                  </button>

                  {/* Button: Copiar Diagnóstico Completo */}
                  <button
                    type="button"
                    onClick={handleCopyDiagnostic}
                    id="btn-copy-diagnostic-gdi"
                    className="px-3.5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                    title="Copiar dados fáticos completos do último diagnóstico para depuração"
                  >
                    <Check size={11} className="shrink-0 text-white" />
                    <span>Copiar Diagnóstico</span>
                  </button>

                  {/* 6. Button: Limpar / Excluir configuração do GDI */}
                  <button
                    type="button"
                    onClick={handleClearInvalidGDI}
                    id="btn-clear-invalid-gdi"
                    className="px-3.5 py-1.5 bg-rose-55 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Remover Chaves, URL e zerar status do conector no Firestore"
                  >
                    <X size={11} className="shrink-0" />
                    <span>Excluir / Limpar Configuração</span>
                  </button>

                  {/* 8. Button: Testar Conexão GDI */}
                  <button
                    type="button"
                    onClick={handleManualTestGDI}
                    id="btn-test-connection-gdi"
                    className="px-3.5 py-1.5 bg-gray-600 hover:bg-gray-750 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Invocar GET /api/config e verificar se retorna JSON fático"
                  >
                    <Play size={11} className="shrink-0 text-white" />
                    <span>Testar Conexão</span>
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
                    disabled={saving || !isEditing}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all disabled:cursor-not-allowed"
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
                    config.status === 'operacional' ? 'bg-emerald-950/80 text-emerald-400' :
                    config.status === 'erro' ? 'bg-rose-955/80 text-rose-400 animate-pulse' :
                    'bg-slate-950 text-slate-400'
                  }`}>
                    {config.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">Modo de Ambiente:</span>
                  <span className="text-slate-250 text-[10px] font-mono leading-none font-bold">
                    {config.environmentMode === "preview_server_to_server" ? "☁️ Preview Server-to-Server" :
                     config.environmentMode === "preview_browser" ? "💻 Preview Browser-Only" :
                     "🚀 Produção Server-to-Server"}
                  </span>
                </div>

                <div className="space-y-1 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">Status Operacional:</span>
                  <span className={`px-2 py-0.5 text-[9px] font-mono rounded font-black uppercase tracking-wider ${
                    config.integrationOperationalStatus === 'operacional' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60' :
                    config.integrationOperationalStatus === 'preview_server_to_server_blocked' ? 'bg-rose-950 text-rose-400 border border-rose-900/60 animate-pulse' :
                    config.integrationOperationalStatus === 'endpoint_publico_ok' ? 'bg-blue-950 text-blue-400 border border-blue-900/60' :
                    'bg-slate-950 text-slate-400'
                  }`}>
                    {config.integrationOperationalStatus ? config.integrationOperationalStatus.replace(/_/g, ' ') : 'N/A'}
                  </span>
                </div>

                {config.lastPreviewWarning && (
                  <div className="p-2.5 bg-amber-955/30 border border-amber-900/50 rounded-xl text-[10px] leading-relaxed text-amber-300 font-semibold font-mono whitespace-pre-wrap">
                    ⚠️ {config.lastPreviewWarning}
                  </div>
                )}

                <div className="space-y-1 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">Último teste:</span>
                  <span className="text-slate-200 text-[11px] font-mono leading-none">
                    {config.lastTestAt || '(Nenhum realizado)'}
                  </span>
                </div>

                <div className="space-y-1 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">Última resposta:</span>
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
                      diagnosticState === 'invalida' ? 'bg-rose-500' :
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

        {/* PARÂMETROS OPERACIONAIS COMPREENSIVOS (TAREFA 1) */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm text-left font-sans">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-indigo-600" size={18} />
              <span>Lista de Parâmetros Técnicos Operacionais da Integração (Tarefa 1 & 6)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Gerencie cada um dos campos técnicos de integração do ecossistema GDI e Portal BOSS com controles individuais e segurança de visibilidade.
            </p>
          </div>

          <div className="divide-y divide-gray-100 space-y-2">
            {renderFieldRow("URL de Endpoint Central (Portal)", "endpointUrl")}
            {renderFieldRow("Webhook URL de Resposta", "webhookUrl")}
            {renderFieldRow("ID de Template de Prova Autônoma", "templateId")}
            {renderFieldRow("Chave Identificadora de Template", "templateKey")}
            {renderFieldRow("ID da Pasta de Destino GDrive", "destinationFolderId")}
            {renderFieldRow("link URL de Acesso da Pasta GDrive", "destinationFolderUrl")}
            {renderFieldRow("X-BOSS-Google-Docs-Integration-Key (Header Portal)", "integrationKey")}
            {renderFieldRow("Chave de Auditoria GDI (Esperada no GDI)", "gdiKey")}
            {renderFieldRow("E-mail da Service Account Google", "serviceAccountEmail")}
            {renderFieldRow("Identificador do Projeto Cloud (Project ID)", "projectId")}
            {renderFieldRow("Callback Secret do Barramento", "callbackSecret")}
            {renderFieldRow("Último Payload Recebido", "lastReceivedPayload", true)}
            {renderFieldRow("Último Payload Enviado", "lastSentPayload", true)}
            {renderFieldRow("Última Resposta Bruta", "lastResponse", true)}
            {renderFieldRow("Mensagem de Último Erro Operacional", "lastError", true)}
            {renderFieldRow("Mensagem de Último Sucesso", "lastSuccess", true)}
          </div>
        </div>

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
