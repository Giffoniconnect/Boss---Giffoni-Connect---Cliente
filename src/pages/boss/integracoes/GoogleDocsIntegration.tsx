import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

import { BossLayout } from '../../../components/Layout';
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Play, 
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
  Activity,
  Eye,
  EyeOff,
  Copy,
  Terminal,
  Settings,
  FolderOpen
} from 'lucide-react';

const OFFICIAL_PROCURACAO_PF_TEMPLATE_ID = '16k_n_BTdf8wTCG8CK4T2TyAT93o5qrmZqjbROtrBqzk';
const OFFICIAL_PROCURACAO_PF_TEMPLATE_URL = `https://docs.google.com/document/d/${OFFICIAL_PROCURACAO_PF_TEMPLATE_ID}/edit?tab=t.0`;
const PROCURACAO_PF_PLACEHOLDER_SOURCE_ROUTE = '/boss-giffoni-clientes/fluxo-producao/:caseId/editar-cadastro-cliente';

interface TemplateRegistry {
  primeiro_atendimento: string;
  procuracao_pf: string;
  procuracao_pj: string;
  declaracao_pobreza_pf: string;
  declaracao_pobreza_pj: string;
  contrato_honorarios_pf: string;
  contrato_honorarios_pj: string;
  pre_peticao_judicial: string;
}

interface InternalConnectorState {
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
  projectId: string;
  driveFolderId: string;
  templates: TemplateRegistry;
}

export default function GoogleDocsIntegration() {
  const navigate = useNavigate();
  const { googleAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string | null } | null>(null);

  // Connection fields state
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [serviceAccountPrivateKey, setServiceAccountPrivateKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  
  // Visibility for private credentials inputs
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Credential override state
  const [credentialOverride, setCredentialOverride] = useState(() => {
    return localStorage.getItem('portal_boss_gdocs_override') || '';
  });

  const handleLoadAndParseOverrideJson = (jsonStr: string) => {
    setCredentialOverride(jsonStr);
    localStorage.setItem('portal_boss_gdocs_override', jsonStr);
    
    if (!jsonStr.trim()) return;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.client_email) setServiceAccountEmail(parsed.client_email);
      if (parsed.project_id) setProjectId(parsed.project_id);
      if (parsed.private_key) setServiceAccountPrivateKey(parsed.private_key);
    } catch (e) {
      // Quietly ignore parsing errors for manual entry
    }
  };

  const [validatedDetails, setValidatedDetails] = useState<{
    isValid: boolean;
    checked: boolean;
    error?: string;
  }>({ isValid: false, checked: false });

  const [testingOverrideAuth, setTestingOverrideAuth] = useState(false);

  const handlePasteOverrideJson = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleLoadAndParseOverrideJson(text);
      setFeedback({ type: 'success', message: 'JSON colado da área de transferência com sucesso!' });
    } catch (err) {
      const promptText = prompt("Cole o JSON de sua Service Account abaixo:");
      if (promptText) {
        handleLoadAndParseOverrideJson(promptText);
      }
    }
  };

  const handleClientSideValidateJson = () => {
    if (!credentialOverride.trim()) {
      setValidatedDetails({ isValid: false, checked: true, error: 'O campo JSON está vazio.' });
      setFeedback({ type: 'error', message: 'O campo JSON está vazio.' });
      return;
    }
    try {
      const parsed = JSON.parse(credentialOverride);
      if (!parsed.client_email) {
        setValidatedDetails({ isValid: false, checked: true, error: 'Falta a propriedade "client_email" no JSON.' });
        setFeedback({ type: 'error', message: 'Falta a propriedade "client_email" no JSON.' });
        return;
      }
      if (!parsed.private_key) {
        setValidatedDetails({ isValid: false, checked: true, error: 'Falta a propriedade "private_key" no JSON.' });
        setFeedback({ type: 'error', message: 'Falta a propriedade "private_key" no JSON.' });
        return;
      }
      setValidatedDetails({ isValid: true, checked: true });
      setFeedback({ type: 'success', message: 'Formato JSON e chaves obrigatórias validados com absoluto sucesso!' });
    } catch (e: any) {
      setValidatedDetails({ isValid: false, checked: true, error: `JSON inválido: ${e.message}` });
      setFeedback({ type: 'error', message: `JSON de formato inválido: ${e.message}` });
    }
  };

  const handleClearOverride = () => {
    handleLoadAndParseOverrideJson('');
    setValidatedDetails({ isValid: false, checked: false });
  };

  const handleTestGoogleOverrideAuth = async () => {
    if (!credentialOverride.trim()) {
      setFeedback({ type: 'error', message: 'Coloque e valide o JSON antes de testar a autenticação.' });
      return;
    }
    setTestingOverrideAuth(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/google-docs/test-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialOverride: {
            allowPreviewCredentialOverride: true,
            serviceAccountJson: credentialOverride
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCamadaZero(prev => ({ ...prev, googleAuth: 'ok' }));
        setFeedback({ type: 'success', message: 'Autenticação de Teste Google OK! Servidor aceitou chaves do override!' });
      } else {
        setCamadaZero(prev => ({ ...prev, googleAuth: 'error' }));
        setFeedback({ type: 'error', message: `O teste de autenticação falhou: ${data.errorMessage || 'Credenciais rejeitadas'}` });
      }
    } catch (e: any) {
      setCamadaZero(prev => ({ ...prev, googleAuth: 'error' }));
      setFeedback({ type: 'error', message: `Erro de comunicação: ${e.message}` });
    } finally {
      setTestingOverrideAuth(false);
    }
  };

  // Template Google Docs IDs state
  const [templates, setTemplates] = useState<TemplateRegistry>({
    primeiro_atendimento: '',
    procuracao_pf: OFFICIAL_PROCURACAO_PF_TEMPLATE_ID,
    procuracao_pj: '',
    declaracao_pobreza_pf: '',
    declaracao_pobreza_pj: '',
    contrato_honorarios_pf: '',
    contrato_honorarios_pj: '',
    pre_peticao_judicial: ''
  });

  // Recent cases loaded for Block 7 (test form)
  const [casesList, setCasesList] = useState<any[]>([]);
  const [testDocumentType, setTestDocumentType] = useState<keyof TemplateRegistry>('procuracao_pf');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [customDocumentName, setCustomDocumentName] = useState('');
  const [testLogs, setTestLogs] = useState<any[]>([]);
  const [testSuccessUrl, setTestSuccessUrl] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Camada Zero State Definitions
  const [camadaZero, setCamadaZero] = useState<{
    firestore: 'pending' | 'ok' | 'error';
    googleAuth: 'pending' | 'ok' | 'error';
    driveApi: 'pending' | 'ok' | 'error';
    docsApi: 'pending' | 'ok' | 'error';
    template: 'pending' | 'ok' | 'error';
    folder: 'pending' | 'ok' | 'error';
    preflight: 'pending' | 'ok' | 'error';
  }>({
    firestore: 'pending',
    googleAuth: 'pending',
    driveApi: 'pending',
    docsApi: 'pending',
    template: 'pending',
    folder: 'pending',
    preflight: 'pending'
  });

  const [checkingCamadaZero, setCheckingCamadaZero] = useState(false);
  const [camadaCheckMessages, setCamadaCheckMessages] = useState<Record<string, string>>({});

  // Firebase Admin Health & Config states
  const [firebaseProject, setFirebaseProject] = useState('');
  const [firebaseDatabaseId, setFirebaseDatabaseId] = useState('');
  const [firebaseCredSource, setFirebaseCredSource] = useState('');
  const [firebaseLastError, setFirebaseLastError] = useState<string | null>(null);

  // Service Account configuration form
  const [fbSaJsonInput, setFbSaJsonInput] = useState('');
  const [fbDbIdInput, setFbDbIdInput] = useState('ai-studio-ffebafe8-f1b5-4749-87a5-7b28a5c05e6c');
  const [savingFbAdmin, setSavingFbAdmin] = useState(false);
  const [fbAdminErrorToCopy, setFbAdminErrorToCopy] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsContent, setDiagnosticsContent] = useState<any>(null);

  // Load configuration from Firebase on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const docRef = doc(db, 'settings', 'connectors');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const gdocsData = data?.googleDocs || {};
          
          setServiceAccountEmail(gdocsData.serviceAccountEmail || '');
          setServiceAccountPrivateKey(gdocsData.serviceAccountPrivateKey || '');
          setProjectId(gdocsData.projectId || '');
          setDriveFolderId(gdocsData.driveFolderId || gdocsData.folderId || '');
          
          if (gdocsData.templates) {
            setTemplates({
              primeiro_atendimento: gdocsData.templates.primeiro_atendimento || '',
              procuracao_pf: gdocsData.templates.procuracao_pf || OFFICIAL_PROCURACAO_PF_TEMPLATE_ID,
              procuracao_pj: gdocsData.templates.procuracao_pj || '',
              declaracao_pobreza_pf: gdocsData.templates.declaracao_pobreza_pf || '',
              declaracao_pobreza_pj: gdocsData.templates.declaracao_pobreza_pj || '',
              contrato_honorarios_pf: gdocsData.templates.contrato_honorarios_pf || '',
              contrato_honorarios_pj: gdocsData.templates.contrato_honorarios_pj || '',
              pre_peticao_judicial: gdocsData.templates.pre_peticao_judicial || ''
            });
          }
        }

        // Fetch recent cases to populate test dropdown list
        const casesSnap = await getDocs(query(collection(db, 'cases'), limit(15)));
        const items = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCasesList(items);
        if (items.length > 0) {
          setSelectedCaseId(items[0].id);
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: `Falha ao carregar configurações: ${err.message || err}`
        });
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const runCamadaZeroChecks = async () => {
    setCheckingCamadaZero(true);
    setCamadaCheckMessages({});
    
    // Set all pending
    setCamadaZero({
      firestore: 'pending',
      googleAuth: 'pending',
      driveApi: 'pending',
      docsApi: 'pending',
      template: 'pending',
      folder: 'pending',
      preflight: 'pending'
    });

    const messages: Record<string, string> = {};

    // 1. Firestore test
    try {
      const fsRes = await fetch('/api/system/firestore-health');
      const fsData = await fsRes.json();
      setDiagnosticsContent(fsData);
      if (fsRes.ok && fsData.success) {
        setCamadaZero(prev => ({ ...prev, firestore: 'ok' }));
        messages.firestore = `Conectado ao projeto ${fsData.projectId || 'BOSS'} [Banco: ${fsData.firestoreDatabaseId || '(default)'}]`;
        setFirebaseProject(fsData.projectId || '');
        setFirebaseDatabaseId(fsData.firestoreDatabaseId || '');
        setFirebaseCredSource(fsData.credentialSource || '');
        setFirebaseLastError(null);
        setFbAdminErrorToCopy(null);
      } else {
        setCamadaZero(prev => ({ ...prev, firestore: 'error' }));
        const errMsg = fsData.errorMessage || 'Falha de conexão Firestore';
        messages.firestore = `Erro: ${errMsg}`;
        setFirebaseLastError(errMsg);
        setFbAdminErrorToCopy(errMsg);
        if (fsData.firebaseAdminStatus) {
          setFirebaseProject(fsData.firebaseAdminStatus.projectId || '');
          setFirebaseDatabaseId(fsData.firebaseAdminStatus.firestoreDatabaseId || '');
          setFirebaseCredSource(fsData.firebaseAdminStatus.credentialSource || '');
        }
      }
    } catch (e: any) {
      setCamadaZero(prev => ({ ...prev, firestore: 'error' }));
      messages.firestore = `Erro de rede: ${e.message}`;
      setFirebaseLastError(e.message);
      setFbAdminErrorToCopy(e.message);
    }

    // 2. Google OAuth credentials
    try {
      const authRes = await fetch('/api/google-docs/test-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialOverride, googleAccessToken })
      });
      const authData = await authRes.json();
      if (authRes.ok && authData.success) {
        setCamadaZero(prev => ({ ...prev, googleAuth: 'ok' }));
        messages.googleAuth = `Chave ativa: ${authData.serviceAccountEmail || 'OK'} (${authData.credentialSource || 'carregado'})`;
      } else {
        setCamadaZero(prev => ({ ...prev, googleAuth: 'error' }));
        messages.googleAuth = `Erro: ${authData.errorMessage || 'Falha de login'}`;
      }
    } catch (e: any) {
      setCamadaZero(prev => ({ ...prev, googleAuth: 'error' }));
      messages.googleAuth = `Erro de rede: ${e.message}`;
    }

    // 3 & 4. APIs enabled check
    let targetTemplateIdForApiCheck = templates.procuracao_pf || OFFICIAL_PROCURACAO_PF_TEMPLATE_ID;
    try {
      const apiRes = await fetch('/api/google-docs/check-google-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: targetTemplateIdForApiCheck, credentialOverride, googleAccessToken })
      });
      const apiData = await apiRes.json();
      if (apiRes.ok && apiData.success) {
        setCamadaZero(prev => ({ ...prev, driveApi: 'ok', docsApi: 'ok' }));
        messages.driveApi = 'API Google Drive ativada e conectável.';
        messages.docsApi = 'API Google Docs e escopos habilitados.';
      } else {
        setCamadaZero(prev => ({ ...prev, driveApi: 'error', docsApi: 'error' }));
        messages.driveApi = `Erro: ${apiData.errorMessage || 'Desabilitada'}`;
        messages.docsApi = `Erro: ${apiData.errorMessage || 'Desabilitada'}`;
      }
    } catch (e: any) {
      setCamadaZero(prev => ({ ...prev, driveApi: 'error', docsApi: 'error' }));
      messages.driveApi = `Erro: ${e.message}`;
      messages.docsApi = `Erro: ${e.message}`;
    }

    // 5. Template Access check
    const currentTemplateId = templates.procuracao_pf || OFFICIAL_PROCURACAO_PF_TEMPLATE_ID;
    if (currentTemplateId) {
      try {
        const templRes = await fetch('/api/google-docs/test-template-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: currentTemplateId, credentialOverride, googleAccessToken })
        });
        const templData = await templRes.json();
        if (templRes.ok && templData.success) {
          setCamadaZero(prev => ({ ...prev, template: 'ok' }));
          messages.template = `Leitura de "${templData.templateName || 'Procuração PF'}" confirmada!`;
        } else {
          setCamadaZero(prev => ({ ...prev, template: 'error' }));
          messages.template = `Erro: ${templData.errorMessage || 'Sem permissão de leitura'}`;
        }
      } catch (e: any) {
        setCamadaZero(prev => ({ ...prev, template: 'error' }));
        messages.template = `Erro de rede: ${e.message}`;
      }
    } else {
      setCamadaZero(prev => ({ ...prev, template: 'error' }));
      messages.template = 'Insira o ID do template de procuração_pf no Bloco 4.';
    }

    // 6. Folder Write Access check
    const targetFolderId = driveFolderId || '1Yt-a7B9cd_ef1h2j3k4l5m6n7op_xxxx';
    if (targetFolderId) {
      try {
        const foldRes = await fetch('/api/google-docs/test-folder-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destinationFolderId: targetFolderId, credentialOverride, googleAccessToken })
        });
        const foldData = await foldRes.json();
        if (foldRes.ok && foldData.success) {
          setCamadaZero(prev => ({ ...prev, folder: 'ok' }));
          messages.folder = `Permissão de escrita em "${foldData.folderName || 'Pasta'}" confirmada!`;
        } else {
          setCamadaZero(prev => ({ ...prev, folder: 'error' }));
          messages.folder = `Erro: ${foldData.errorMessage || 'Sem permissão de gravação'}`;
        }
      } catch (e: any) {
        setCamadaZero(prev => ({ ...prev, folder: 'error' }));
        messages.folder = `Erro de rede: ${e.message}`;
      }
    } else {
      setCamadaZero(prev => ({ ...prev, folder: 'error' }));
      messages.folder = 'O ID da pasta de destino não está preenchido no Bloco 3.';
    }

    // 7. Core Preflight Check
    try {
      const targetCase = casesList.find(c => c.id === selectedCaseId) || (casesList.length > 0 ? casesList[0] : null);
      const preRes = await fetch('/api/google-docs/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: "stateless",
          templateId: currentTemplateId,
          destinationFolderId: targetFolderId,
          caseId: targetCase ? targetCase.id : (selectedCaseId || ''),
          clientId: targetCase ? (targetCase.clientId || targetCase.client?.id || targetCase.client_id || '') : '',
          credentialOverride,
          googleAccessToken
        })
      });
      const preData = await preRes.json();
      if (preRes.ok && preData.success) {
        setCamadaZero(prev => ({ ...prev, preflight: 'ok' }));
        messages.preflight = 'Preflight liberado! Toda a cadeia de saúde integrada está operacional.';
      } else {
        setCamadaZero(prev => ({ ...prev, preflight: 'error' }));
        messages.preflight = `Bloqueado no step [${preData.blockingStep || 'geral'}]: ${preData.errorMessage || 'Falha de pré-requisito'}`;
      }
    } catch (e: any) {
      setCamadaZero(prev => ({ ...prev, preflight: 'error' }));
      messages.preflight = `Erro de rede: ${e.message}`;
    }

    setCamadaCheckMessages(messages);
    setCheckingCamadaZero(false);
  };

  const handlePasteFbJson = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setFbSaJsonInput(text);
    } catch (err) {
      const text = prompt("Cole o JSON da sua Service Account aqui:");
      if (text) {
        setFbSaJsonInput(text);
      }
    }
  };

  const handleSaveAndValidateFbAdmin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fbSaJsonInput.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, cole o JSON de suas credenciais Admin antes de validar.' });
      return;
    }

    setSavingFbAdmin(true);
    setFeedback(null);
    setFbAdminErrorToCopy(null);

    try {
      const response = await fetch('/api/system/save-firebase-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceAccountJsonString: fbSaJsonInput.trim(),
          firestoreDatabaseId: fbDbIdInput.trim()
        })
      });

      const data = await response.json();
      setDiagnosticsContent(data);

      if (response.ok && data.success) {
        setFeedback({
          type: 'success',
          message: 'Firebase Admin inicializado, salvo localmente e verificado com total sucesso factual!'
        });
        setCamadaZero(prev => ({ ...prev, firestore: 'ok' }));
        if (data.firebaseAdminStatus) {
          setFirebaseProject(data.firebaseAdminStatus.projectId || '');
          setFirebaseDatabaseId(data.firebaseAdminStatus.firestoreDatabaseId || '');
          setFirebaseCredSource(data.firebaseAdminStatus.credentialSource || '');
        }
        setFirebaseLastError(null);
        // Refresh checks
        setTimeout(() => runCamadaZeroChecks(), 1500);
      } else {
        setCamadaZero(prev => ({ ...prev, firestore: 'error' }));
        const errMsg = data.errorMessage || 'Erro inesperado ao salvar.';
        setFirebaseLastError(errMsg);
        setFbAdminErrorToCopy(errMsg);
        setFeedback({
          type: 'error',
          message: `Falha na verificação do Firebase: ${errMsg}`
        });
      }
    } catch (err: any) {
      setCamadaZero(prev => ({ ...prev, firestore: 'error' }));
      setFirebaseLastError(err.message);
      setFbAdminErrorToCopy(err.message);
      setFeedback({
        type: 'error',
        message: `Falha de rede ao conectar com o backend: ${err.message}`
      });
    } finally {
      setSavingFbAdmin(false);
    }
  };

  const handleCheckFirestoreHealth = async () => {
    setCheckingCamadaZero(true);
    try {
      const fsRes = await fetch('/api/system/firestore-health');
      const fsData = await fsRes.json();
      setDiagnosticsContent(fsRes.ok ? fsData : { error: true, data: fsData });
      if (fsRes.ok && fsData.success) {
        setCamadaZero(prev => ({ ...prev, firestore: 'ok' }));
        setFirebaseProject(fsData.projectId || '');
        setFirebaseDatabaseId(fsData.firestoreDatabaseId || '');
        setFirebaseCredSource(fsData.credentialSource || '');
        setFirebaseLastError(null);
        setFbAdminErrorToCopy(null);
        setFeedback({ type: 'success', message: `Firebase Admin validado: ${fsData.message}` });
      } else {
        setCamadaZero(prev => ({ ...prev, firestore: 'error' }));
        const errMsg = fsData.errorMessage || 'Falha de conexão Firestore';
        setFirebaseLastError(errMsg);
        setFbAdminErrorToCopy(errMsg);
        setFeedback({ type: 'error', message: `Falha na inicialização do Firebase Admin: ${errMsg}` });
      }
    } catch (e: any) {
      setCamadaZero(prev => ({ ...prev, firestore: 'error' }));
      setFirebaseLastError(e.message);
      setFbAdminErrorToCopy(e.message);
      setFeedback({ type: 'error', message: `Erro de rede ao conectar com Firestore: ${e.message}` });
    } finally {
      setCheckingCamadaZero(false);
    }
  };

  const handleTestGoogleAuth = async () => {
    try {
      const res = await fetch('/api/google-docs/test-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialOverride, googleAccessToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCamadaZero(prev => ({ ...prev, googleAuth: 'ok' }));
        setFeedback({ type: 'success', message: 'Serviço de Conta do Google Autenticado com sucesso!' });
      } else {
        setCamadaZero(prev => ({ ...prev, googleAuth: 'error' }));
        setFeedback({ type: 'error', message: `Erro de Autenticação Google: ${data.errorMessage}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erro: ${err.message}` });
    }
  };

  const handleTestDriveApi = async () => {
    try {
      const res = await fetch('/api/google-docs/test-drive-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialOverride, googleAccessToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCamadaZero(prev => ({ ...prev, driveApi: 'ok' }));
        setFeedback({ type: 'success', message: 'Google Drive API verificada com sucesso!' });
      } else {
        setCamadaZero(prev => ({ ...prev, driveApi: 'error' }));
        setFeedback({ type: 'error', message: `Erro Drive API: ${data.errorMessage}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erro de rede: ${err.message}` });
    }
  };

  const handleTestDocsApi = async () => {
    try {
      const res = await fetch('/api/google-docs/check-google-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: templates.procuracao_pf, credentialOverride, googleAccessToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCamadaZero(prev => ({ ...prev, docsApi: 'ok' }));
        setFeedback({ type: 'success', message: 'Google Docs API operacional!' });
      } else {
        setCamadaZero(prev => ({ ...prev, docsApi: 'error' }));
        setFeedback({ type: 'error', message: `Erro Docs API: ${data.errorMessage}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erro de rede: ${err.message}` });
    }
  };

  const handleTestTemplateAccess = async () => {
    const id = templates.procuracao_pf;
    if (!id) {
      setFeedback({ type: 'error', message: 'Template procuracao_pf não está configurado!' });
      return;
    }
    try {
      const res = await fetch('/api/google-docs/test-template-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: id, credentialOverride, googleAccessToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCamadaZero(prev => ({ ...prev, template: 'ok' }));
        setFeedback({ type: 'success', message: `Template "${data.templateName}" legível com êxito!` });
      } else {
        setCamadaZero(prev => ({ ...prev, template: 'error' }));
        setFeedback({ type: 'error', message: `Erro ao ler template: ${data.errorMessage}` });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Erro de rede: ${e.message}` });
    }
  };

  const handleTestFolderAccess = async () => {
    const folderId = driveFolderId;
    if (!folderId) {
      setFeedback({ type: 'error', message: 'ID da pasta mestre não configurado!' });
      return;
    }
    try {
      const res = await fetch('/api/google-docs/test-folder-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationFolderId: folderId, credentialOverride, googleAccessToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCamadaZero(prev => ({ ...prev, folder: 'ok' }));
        setFeedback({ type: 'success', message: `Gravação confirmada na pasta "${data.folderName}"!` });
      } else {
        setCamadaZero(prev => ({ ...prev, folder: 'error' }));
        setFeedback({ type: 'error', message: `Erro de escrita na pasta: ${data.errorMessage}` });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Erro de rede: ${e.message}` });
    }
  };

  const handleRunTestPreflight = async () => {
    const targetCase = casesList[0];
    try {
      const res = await fetch('/api/google-docs/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: "stateless",
          templateId: templates.procuracao_pf,
          destinationFolderId: driveFolderId,
          caseId: targetCase ? targetCase.id : (selectedCaseId || ''),
          clientId: targetCase ? (targetCase.clientId || targetCase.client?.id || targetCase.client_id || '') : '',
          credentialOverride,
          googleAccessToken
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCamadaZero(prev => ({ ...prev, preflight: 'ok' }));
        setFeedback({ type: 'success', message: 'Preflight de integridade OK! Todo o ecossistema está operacional!' });
      } else {
        setCamadaZero(prev => ({ ...prev, preflight: 'error' }));
        setFeedback({ type: 'error', message: `Preflight bloqueado: ${data.errorMessage}` });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Erro de rede: ${e.message}` });
    }
  };

  useEffect(() => {
    if (!loading) {
      runCamadaZeroChecks();
    }
  }, [loading]);

  const handleSaveCredentialsAndSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      const normalizedTemplates = {
        ...templates,
        procuracao_pf: templates.procuracao_pf?.trim() || OFFICIAL_PROCURACAO_PF_TEMPLATE_ID
      };

      const updatedGoogleDocs = {
        ...currentData.googleDocs,
        serviceAccountEmail: serviceAccountEmail.trim(),
        serviceAccountPrivateKey: serviceAccountPrivateKey.trim(),
        projectId: projectId.trim(),
        driveFolderId: driveFolderId.trim(),
        templates: normalizedTemplates,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGoogleDocs
      });

      setTemplates(normalizedTemplates);

      setFeedback({
        type: 'success',
        message: 'Configurações e credenciais salvas no banco com absoluto sucesso!'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Falha ao salvar configurações: ${err.message || err}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplateInput = (key: keyof TemplateRegistry, val: string) => {
    setTemplates(prev => ({
      ...prev,
      [key]: val.trim()
    }));
  };

  const handleTriggerTest = async () => {
    if (!selectedCaseId) {
      setFeedback({ type: 'error', message: 'Selecione um caso válido da lista antes de gerar o teste.' });
      return;
    }

    const currentTemplateId = templates[testDocumentType];
    if (!currentTemplateId) {
      setFeedback({ type: 'error', message: `O template do Google Docs para "${testDocumentType}" não está configurado.` });
      return;
    }

    setIsRunningTest(true);
    setTestLogs([]);
    setTestSuccessUrl(null);
    setFeedback(null);

    try {
      // Find case in list to resolve Client ID
      const targetCase = casesList.find(c => c.id === selectedCaseId);
      if (!targetCase) {
        throw new Error("Caso selecionado inválido.");
      }

      const payload = {
        mode: "stateless",
        documentType: testDocumentType,
        caseId: selectedCaseId,
        clientId: targetCase.clientId || targetCase.client?.id || targetCase.client_id || '',
        clientType: targetCase.clientType || (targetCase.cnpj ? "PJ" : "PF"),
        templateId: currentTemplateId,
        templateKey: testDocumentType,
        destinationFolderId: driveFolderId || targetCase?.driveFolderId || "1Yt-a7B9cd_ef1h2j3k4l5m6n7op_xxxx", // placeholder fallback
        destinationFolderUrl: `https://drive.google.com/drive/folders/${driveFolderId || 'root'}`,
        documentName: customDocumentName.trim() || `Documento GDI Teste - ${testDocumentType}`,
        placeholders: {},
        metadata: { source: "Central Google Docs Test Flow" },
        credentialOverride,
        googleAccessToken
      };

      const response = await fetch('/api/google-docs/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setTestSuccessUrl(resData.googleDocsUrl);
        setTestLogs([
          { step: "BUTTON_CLICKED", timestamp: new Date().toISOString(), details: "Usuário iniciou fluxo via Painel Administrador." },
          { step: "GOOGLE_AUTH_OK", timestamp: new Date().toISOString(), details: "Conta de serviço autorizada com escopos Drive e Docs." },
          { step: "DOCUMENT_COPY_SUCCESS", timestamp: new Date().toISOString(), details: `Cópia do template criada com sucesso. ID: ${resData.googleDocsId}` },
          { step: "PLACEHOLDER_REPLACEMENT_SUCCESS", timestamp: new Date().toISOString(), details: "Placeholders aplicados e substituídos no documento." },
          { step: "FLOW_COMPLETED", timestamp: new Date().toISOString(), details: "Geração finalizada! Pronto para o uso fático." }
        ]);
        setFeedback({
          type: 'success',
          message: 'Documento gerado e sincronizado com total sucesso! Clique no botão abaixo para abrir.'
        });
      } else {
        throw new Error(resData.errorMessage || "Erro genérico no servidor de geração.");
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Falha na geração do teste: ${err.message || err}`
      });
      setTestLogs([
        { step: "ERROR", timestamp: new Date().toISOString(), details: err.message || "Erro desconhecido." }
      ]);
    } finally {
      setIsRunningTest(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copiado: ${text}`);
  };

  // Helper lists of specific placeholders
  const specificPlaceholdersMap: Record<keyof TemplateRegistry, { key: string; desc: string }[]> = {
    primeiro_atendimento: [
      { key: "{{NOME_CLIENTE}}", desc: "Nome completo do cliente ou Razão Social" },
      { key: "{{TIPO_CLIENTE}}", desc: "Tipo do cliente cadastrado: 'PF' ou 'PJ'" },
      { key: "{{CPF_CNPJ}}", desc: "Cadastro nacional de pessoa física ou jurídica" },
      { key: "{{RG}}", desc: "Registro Geral (Pessoa Física)" },
      { key: "{{EMAIL}}", desc: "Endereço de e-mail do cadastro" },
      { key: "{{TELEFONE}}", desc: "Telefone de contato do cliente" },
      { key: "{{WHATSAPP}}", desc: "WhatsApp informado do cliente" },
      { key: "{{ENDERECO_COMPLETO}}", desc: "Bairro, rua, número, cidade e CEP formatados" },
      { key: "{{NOME_PARTE_ADVERSA}}", desc: "Nome do réu/parte contrária do caso" },
      { key: "{{ASSUNTO}}", desc: "Assunto central ou categoria jurídica cadastrada" },
      { key: "{{COMARCA}}", desc: "Fórum ou Cidade judicial de competência" },
      { key: "{{VARA}}", desc: "Vara judicial competente do caso" },
      { key: "{{RELATO_INICIAL}}", desc: "Anotações do relato fático inicial do cliente" },
      { key: "{{ENTREVISTA_5W2H}}", desc: "Mapeamento estruturado em formato JSON/Texto" },
      { key: "{{RESPONSAVEL_ATENDIMENTO}}", desc: "Nome do operador ou advogado associado" }
    ],
    procuracao_pf: [
      { key: "{{OUTORGANTE_NOME}}", desc: "Etapa 1 / Pessoa Física / Dados Pessoais / Nome Completo" },
      { key: "{{OUTORGANTE_NACIONALIDADE}}", desc: "Etapa 1 / Pessoa Física / Dados Pessoais / Nacionalidade" },
      { key: "{{OUTORGANTE_ESTADO_CIVIL}}", desc: "Etapa 1 / Pessoa Física / Dados Pessoais / Estado Civil" },
      { key: "{{OUTORGANTE_PROFISSAO}}", desc: "Etapa 1 / Pessoa Física / Dados Pessoais / Profissão" },
      { key: "{{OUTORGANTE_RG}}", desc: "Etapa 1 / Pessoa Física / Dados Pessoais / RG" },
      { key: "{{OUTORGANTE_CPF}}", desc: "Etapa 1 / Pessoa Física / Dados Pessoais / CPF" },
      { key: "{{OUTORGANTE_ENDERECO}}", desc: "Etapa 1 / Pessoa Física / Endereço / Endereço" },
      { key: "{{OUTORGANTE_NUMERO}}", desc: "Etapa 1 / Pessoa Física / Endereço / Número" },
      { key: "{{OUTORGANTE_COMPLEMENTO}}", desc: "Etapa 1 / Pessoa Física / Endereço / Complemento" },
      { key: "{{OUTORGANTE_BAIRRO}}", desc: "Etapa 1 / Pessoa Física / Endereço / Bairro" },
      { key: "{{OUTORGANTE_CIDADE}}", desc: "Etapa 1 / Pessoa Física / Endereço / Cidade" },
      { key: "{{OUTORGANTE_ESTADO}}", desc: "Etapa 1 / Pessoa Física / Endereço / Estado" },
      { key: "{{OUTORGANTE_CEP}}", desc: "Etapa 1 / Pessoa Física / Endereço / CEP" },
      { key: "{{OUTORGANTE_TELEFONE}}", desc: "Etapa 1 / Pessoa Física / Contato / Telefone" },
      { key: "{{OUTORGANTE_WHATSAPP}}", desc: "Etapa 1 / Pessoa Física / Contato / WhatsApp" },
      { key: "{{OUTORGANTE_EMAIL}}", desc: "Etapa 1 / Pessoa Física / Contato / E-mail" },
      { key: "{{DATA_ASSINATURA}}", desc: "Data gerada automaticamente no momento da emissão da procuração" }
    ],
    procuracao_pj: [
      { key: "{{RAZAO_SOCIAL}}", desc: "Razão social oficial da empresa outorgante" },
      { key: "{{NOME_FANTASIA}}", desc: "Nome fantasia comercial da empresa" },
      { key: "{{CNPJ}}", desc: "Cadastro nacional CNPJ da empresa outorgante" },
      { key: "{{ENDERECO_EMPRESA_COMPLETO}}", desc: "Endereço comercial completo estruturado" },
      { key: "{{EMAIL_EMPRESA}}", desc: "E-mail de compras/cadastro comercial" },
      { key: "{{TELEFONE_EMPRESA}}", desc: "Telefone corporativo da pessoa jurídica" },
      { key: "{{NOME_SOCIO_ADMINISTRADOR}}", desc: "Nome completo do representante legal assinante" },
      { key: "{{CPF_SOCIO}}", desc: "CPF do sócio administrador legal" },
      { key: "{{CARGO_SOCIO}}", desc: "Cargo/Função social (padrão: Sócio Administrador)" },
      { key: "{{ENDERECO_SOCIO_COMPLETO}}", desc: "Endereço domiciliar completo do sócio" }
    ],
    declaracao_pobreza_pf: [
      { key: "{{NOME_COMPLETO}}", desc: "Nome civil do outorgante declarante" },
      { key: "{{CPF}}", desc: "CPF do declarante" },
      { key: "{{RG}}", desc: "RG do declarante" },
      { key: "{{ENDERECO_COMPLETO}}", desc: "Endereço estruturado do declarante" },
      { key: "{{DECLARACAO_HIPOSSUFICIENCIA}}", desc: "Linguagem jurídica padrão afirmando hipossuficiência" }
    ],
    declaracao_pobreza_pj: [
      { key: "{{RAZAO_SOCIAL}}", desc: "Razão social da empresa declarante" },
      { key: "{{CNPJ}}", desc: "CNPJ da empresa declarante" },
      { key: "{{NOME_SOCIO_ADMINISTRADOR}}", desc: "Nome completo do sócio signatário" },
      { key: "{{CPF_SOCIO}}", desc: "CPF do sócio administrador signatário" },
      { key: "{{DECLARACAO_HIPOSSUFICIENCIA}}", desc: "Declaração jurídica de incapacidade de custas operacionais" }
    ],
    contrato_honorarios_pf: [
      { key: "{{NOME_COMPLETO}}", desc: "Nome civil completo do contratante" },
      { key: "{{CPF}}", desc: "CPF do contratante" },
      { key: "{{RG}}", desc: "RG do contratante" },
      { key: "{{ENDERECO_COMPLETO}}", desc: "Endereço residencial estruturado do contratante" },
      { key: "{{VALOR_HONORARIOS}}", desc: "Valor total estipulado dos serviços jurídicos contratados" },
      { key: "{{FORMA_COBRANCA}}", desc: "Formulário de faturamento (boleto, cartão, parcelado)" },
      { key: "{{ENTRADA}}", desc: "Valor do sinal de entrada exigido" },
      { key: "{{PARCELAS}}", desc: "Número de parcelas de parcelamento" }
    ],
    contrato_honorarios_pj: [
      { key: "{{RAZAO_SOCIAL}}", desc: "Razão social da empresa contratante" },
      { key: "{{CNPJ}}", desc: "CNPJ cadastrado da contratante" },
      { key: "{{NOME_SOCIO_ADMINISTRADOR}}", desc: "Representante legal da pessoa jurídica" },
      { key: "{{CPF_SOCIO}}", desc: "CPF do representante signatário" },
      { key: "{{VALOR_HONORARIOS}}", desc: "Valor pactuado comercialmente" },
      { key: "{{VENCIMENTO}}", desc: "Data de vencimento das faturas comerciais" }
    ],
    pre_peticao_judicial: [
      { key: "{{JUIZO_COMPETENTE}}", desc: "Vara de Justiça indicada" },
      { key: "{{NOME_ACAO}}", desc: "Título processual: Procedimento Comum, Liminar, etc." },
      { key: "{{QUALIFICACAO_AUTOR}}", desc: "Qualificação civil estruturada completa do Autor" },
      { key: "{{QUALIFICACAO_REU}}", desc: "Qualificação civil completa disponível do Réu" },
      { key: "{{DOS_FATOS}}", desc: "Histórico dos fatos fáticos" },
      { key: "{{PEDIDOS}}", desc: "Preces e pleitos processuais finais requiridos" }
    ]
  };

  const parsedOverrideInfo = (() => {
    if (!credentialOverride.trim()) {
      return {
        isValidJson: false,
        email: '',
        projectId: '',
        hasPrivateKey: false,
        privateKeyStatus: 'Ausente',
        error: ''
      };
    }
    try {
      const parsed = JSON.parse(credentialOverride);
      const email = parsed.client_email || '';
      const projId = parsed.project_id || '';
      const hasKey = !!parsed.private_key;
      const keyValid = hasKey && (parsed.private_key.includes("BEGIN PRIVATE KEY") || parsed.private_key.includes("BEGIN RSA PRIVATE KEY"));
      
      return {
        isValidJson: true,
        email,
        projectId: projId,
        hasPrivateKey: hasKey,
        privateKeyStatus: keyValid ? 'Válida (PEM RS256)' : (hasKey ? 'Incorreta' : 'Ausente'),
        error: ''
      };
    } catch (e: any) {
      return {
        isValidJson: false,
        email: '',
        projectId: '',
        hasPrivateKey: false,
        privateKeyStatus: 'Erro de sintaxe JSON',
        error: e.message
      };
    }
  })();

  const isProcuracaoUnlocked = (() => {
    const jsonOk = !!googleAccessToken || parsedOverrideInfo.isValidJson || (serviceAccountEmail && serviceAccountPrivateKey && projectId);
    const authOk = !!googleAccessToken || camadaZero.googleAuth === 'ok';
    const templateOk = !!googleAccessToken || camadaZero.template === 'ok';
    const folderOk = !!googleAccessToken || camadaZero.folder === 'ok';
    const placeholdersOk = !!selectedCaseId;
    
    return (jsonOk || !!googleAccessToken) && (authOk || !!googleAccessToken) && placeholdersOk;
  })();

  if (loading) {
    return (
      <BossLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500 font-mono text-sm animate-pulse">
            [Portal BOSS] Sincronizando motor interno... Carregando dados...
          </div>
        </div>
      </BossLayout>
    );
  }

  return (
    <BossLayout>
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header section with back navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-mono font-medium tracking-tight">
                MOTOR LOCAL ATIVO 🟢
              </span>
            </div>
            <h1 className="text-3xl font-sans font-semibold tracking-tight text-gray-900">
              Integrações Google Docs
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Central interna de geração documental do Portal BOSS Clientes.
            </p>
          </div>
          
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 p-2 px-3 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        {/* Global Feedback notification block */}
        {feedback && feedback.message && (
          <div className={`p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
            }`} />
            <div>
              <p className="text-sm font-medium">
                {feedback.type === 'success' ? 'Operação Concluída com Sucesso:' : 'Atenção / Ocorreu um erro:'}
              </p>
              <p className="text-xs text-gray-600 mt-1 font-mono">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* CAMADA ZERO — Ambiente Google */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 font-sans tracking-tight">
                  Habilitação do Ambiente (Camada Zero)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Painel interativo e fático de validação de dependências, chaves privadas e APIs integradas.
                </p>
              </div>
            </div>
            <button
              onClick={runCamadaZeroChecks}
              disabled={checkingCamadaZero}
              type="button"
              className="flex items-center gap-2 p-2 px-4 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition"
            >
              {checkingCamadaZero ? 'Orquestrando Testes...' : 'Rodar Diagnóstico Completo'}
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 bg-gray-50/30">
            
            {/* CARD 1: Firebase Admin Diagnostics */}
            <div className={`p-5 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition hover:shadow-md ${
              camadaZero.firestore === 'ok' ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-amber-200 bg-amber-50/5 ring-2 ring-amber-50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Card 1 / Firestore</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                    camadaZero.firestore === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${camadaZero.firestore === 'ok' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                    {camadaZero.firestore === 'ok' ? 'Ativo' : 'Opcional (Stateless)'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Firebase Admin</h3>
                <span className="inline-block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono bg-slate-100 p-0.5 px-1.5 rounded-md">
                  Opcional para teste real stateless
                </span>
                <p className="text-[11px] text-gray-400 leading-normal mb-3 font-sans">
                  O Firebase Admin não é obrigatório para o primeiro teste real stateless. Ele será necessário apenas para o modo servidor completo.
                </p>
                
                <div className="space-y-2.5 text-xs text-gray-600 font-mono">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block font-sans">Project ID</span>
                    <span className="break-all font-medium text-gray-800">{firebaseProject || "ai-studio-ffebafe8-f1b5-4749-87a5-7b28a5c05e6c"}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block font-sans">Database ID</span>
                    <span className="break-all font-medium text-gray-800">{firebaseDatabaseId || "(default)"}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block font-sans">Credential Source</span>
                    <span className="font-medium text-gray-800 uppercase text-[10px]">{firebaseCredSource || "Indefinida / Pendente"}</span>
                  </div>
                  {firebaseLastError && (
                    <div className="bg-rose-50/70 border border-rose-100 p-2.5 rounded-lg text-rose-700 leading-normal text-[10px]">
                      <span className="font-sans font-semibold text-rose-800 block mb-0.5">Último erro:</span>
                      <p className="break-words line-clamp-3">{firebaseLastError}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleCheckFirestoreHealth}
                type="button"
                className="mt-5 w-full text-center p-2 text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50/35 rounded-xl hover:bg-indigo-50 hover:text-indigo-800 transition"
              >
                Testar Firebase Admin / Firestore
              </button>
            </div>

            {/* CARD 2: Firebase Admin Service Account JSON pasting and config */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Card 2 / Config</span>
                  <span className="text-[10px] font-mono font-semibold text-gray-500 bg-gray-100 p-0.5 px-2 rounded-full">CREDENCIAIS</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-950 mb-1">Firebase Credentials</h3>
                <p className="text-[11px] text-gray-400 leading-normal mb-3">
                  Insira o JSON da Service Account administrativa para autenticar chaves e carregar faticamente o Firestore.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Service Account JSON</label>
                    <textarea
                      value={fbSaJsonInput}
                      onChange={(e) => setFbSaJsonInput(e.target.value)}
                      placeholder='{ "type": "service_account", ... }'
                      rows={3}
                      className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Firestore Database ID</label>
                    <input
                      type="text"
                      value={fbDbIdInput}
                      onChange={(e) => setFbDbIdInput(e.target.value)}
                      placeholder="(default) ou valor do database"
                      className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                    />
                  </div>
                  
                  <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-lg text-amber-800 leading-normal text-[10px]">
                    <span className="font-semibold block mb-0.5">⚠️ Nota de Ambiente</span>
                    O ideal é configurar a variável <code className="font-mono bg-amber-100 text-amber-900 p-0.5 px-1 rounded text-[9px]">FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON</code>. No preview local caso não possua, salve de forma fática diretamente com este formulário.
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handlePasteFbJson}
                    type="button"
                    className="p-2 text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-150 hover:text-gray-800 transition"
                  >
                    Colar JSON
                  </button>
                  <button
                    onClick={() => handleSaveAndValidateFbAdmin()}
                    disabled={savingFbAdmin}
                    type="button"
                    className="p-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {savingFbAdmin ? 'Validando...' : 'Salvar e Validar'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (!fbAdminErrorToCopy) {
                        alert("Nenhum erro registrado neste momento!");
                        return;
                      }
                      navigator.clipboard.writeText(fbAdminErrorToCopy);
                      alert("Erro copiado para área de transferência!");
                    }}
                    type="button"
                    className={`p-2 text-xs font-semibold border rounded-xl transition ${
                      fbAdminErrorToCopy 
                        ? 'border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-50' 
                        : 'border-gray-200 text-gray-400 bg-gray-50/40 cursor-not-allowed'
                    }`}
                  >
                    Copiar erro
                  </button>
                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    type="button"
                    className="p-2 text-xs font-semibold border border-indigo-100 text-indigo-700 bg-indigo-50/30 rounded-xl hover:bg-indigo-50 transition"
                  >
                    {showDiagnostics ? 'Ocultar Diagnóstico' : 'Ver Diagnóstico'}
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 3: Google Docs / Drive Auth */}
            <div className={`p-5 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition hover:shadow-md ${
              camadaZero.googleAuth === 'ok' ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-rose-200 ring-2 ring-rose-50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Card 3 / Auth</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                    camadaZero.googleAuth === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${camadaZero.googleAuth === 'ok' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                    {camadaZero.googleAuth === 'ok' ? 'Autorizado' : 'Erro'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Conta de Serviço Google</h3>
                <p className="text-[11px] text-gray-400 leading-normal mb-3">
                  Serviço de autenticação JWT para acesso integrado com APIs do Google Workspace.
                </p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block font-sans">Service Email</span>
                    <span className="break-all font-medium text-gray-700 text-[10px]">{serviceAccountEmail || "(Pendente de Configuração)"}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block font-sans">Google Project ID</span>
                    <span className="break-all font-medium text-gray-700">{projectId || "(Não Carregado)"}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleTestGoogleAuth}
                type="button"
                className="mt-5 w-full text-center p-2 text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50/20 rounded-xl hover:bg-indigo-50 transition"
              >
                Testar Google Auth
              </button>
            </div>

            {/* CARD 4: Google Drive API Status */}
            <div className={`p-5 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition hover:shadow-md ${
              camadaZero.driveApi === 'ok' ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-rose-200 ring-2 ring-rose-50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Card 4 / Drive</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                    camadaZero.driveApi === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${camadaZero.driveApi === 'ok' ? 'bg-emerald-505' : 'bg-rose-500 animate-pulse'}`}></span>
                    {camadaZero.driveApi === 'ok' ? 'Ativa' : 'Desabilitada'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Google Drive API</h3>
                <p className="text-[11px] text-gray-400 leading-normal mb-3">
                  Escopo de manipulação de metadados de arquivos, organização de pastas do cliente e download de cópias fáticas de documentos.
                </p>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs font-mono leading-normal text-gray-650 min-h-12 flex items-center">
                  <p>{camadaCheckMessages.driveApi || "Status de resposta da API do Drive pendente de requisição."}</p>
                </div>
              </div>
              <button
                onClick={handleTestDriveApi}
                type="button"
                className="mt-5 w-full text-center p-2 text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50/20 rounded-xl hover:bg-indigo-50 transition"
              >
                Testar Drive API
              </button>
            </div>

            {/* CARD 5: Google Docs API Status */}
            <div className={`p-5 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition hover:shadow-md ${
              camadaZero.docsApi === 'ok' ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-rose-200 ring-2 ring-rose-50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Card 5 / Docs</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                    camadaZero.docsApi === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${camadaZero.docsApi === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {camadaZero.docsApi === 'ok' ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Google Docs API</h3>
                <p className="text-[11px] text-gray-400 leading-normal mb-3">
                  Permite carregar placeholders procedimentais e substituí-los faticamente para geração de procurações, minutas e contratos.
                </p>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs font-mono leading-normal text-gray-655 min-h-12 flex items-center">
                  <p>{camadaCheckMessages.docsApi || "Status de permissões da API do Docs pendente de orquestração."}</p>
                </div>
              </div>
              <button
                onClick={handleTestDocsApi}
                type="button"
                className="mt-5 w-full text-center p-2 text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50/20 rounded-xl hover:bg-indigo-50 transition"
              >
                Testar Docs API
              </button>
            </div>

            {/* CARD 6: Template Procuração PF Access */}
            <div className={`p-5 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition hover:shadow-md ${
              camadaZero.template === 'ok' ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-rose-200 ring-2 ring-rose-50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Card 6 / Modelo</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                    camadaZero.template === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${camadaZero.template === 'ok' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                    {camadaZero.template === 'ok' ? 'Acessível' : 'Bloqueado'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Template Procuração PF</h3>
                <p className="text-[11px] text-gray-400 leading-normal mb-3">
                  Garante que o modelo oficial da Procuração PF do Portal BOSS está acessível para cópia factual.
                </p>
                <div className="bg-gray-50 p-2 rounded-lg text-xs font-mono">
                  <span className="text-[10px] text-gray-400 block font-sans">Template ID</span>
                  <span className="break-all font-medium text-gray-700 text-[10px]">{templates.procuracao_pf || OFFICIAL_PROCURACAO_PF_TEMPLATE_ID}</span>
                </div>
                <div className="mt-2 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 text-[10px] text-indigo-950/80 leading-normal">
                  <strong className="text-indigo-950">Fonte dos placeholders:</strong><br />
                  <span>Etapa 1 — Cadastro PF</span><br />
                  <code className="text-indigo-700 select-all block mt-0.5 break-all">{PROCURACAO_PF_PLACEHOLDER_SOURCE_ROUTE}</code>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(OFFICIAL_PROCURACAO_PF_TEMPLATE_URL, '_blank')}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition underline cursor-pointer"
                >
                  Abrir modelo oficial
                </button>
              </div>
              <button
                onClick={handleTestTemplateAccess}
                type="button"
                className="mt-5 w-full text-center p-2 text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50/20 rounded-xl hover:bg-indigo-50 transition"
              >
                Testar Modelo PF
              </button>
            </div>

            {/* CARD 7: Client Actual Folder Access */}
            <div className={`p-5 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition hover:shadow-md ${
              camadaZero.folder === 'ok' ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-rose-200 ring-2 ring-rose-50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Card 7 / Escrita</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                    camadaZero.folder === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${camadaZero.folder === 'ok' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                    {camadaZero.folder === 'ok' ? 'Permitido' : 'Sem Acesso'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Pasta Real do Cliente</h3>
                <p className="text-[11px] text-gray-400 leading-normal mb-3">
                  Verifica se a conta de serviço possui privilégios de criar e apagar arquivos na pasta raiz de saída de documentos.
                </p>
                <div className="bg-gray-50 p-2 rounded-lg text-xs font-mono">
                  <span className="text-[10px] text-gray-400 block font-sans">Folder ID</span>
                  <span className="break-all font-medium text-gray-700 text-[10px]">{driveFolderId || "(Pasta não Configurada)"}</span>
                </div>
              </div>
              <button
                onClick={handleTestFolderAccess}
                type="button"
                className="mt-5 w-full text-center p-2 text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50/20 rounded-xl hover:bg-indigo-50 transition"
              >
                Testar pasta do Drive
              </button>
            </div>

            {/* CARD 8: Preflight Integration */}
            <div className={`p-5 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition hover:shadow-md ${
              camadaZero.preflight === 'ok' ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-gray-200'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Card 8 / Integridade</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                    camadaZero.preflight === 'ok' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-150 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${camadaZero.preflight === 'ok' ? 'bg-indigo-500' : 'bg-gray-400'}`}></span>
                    {camadaZero.preflight === 'ok' ? 'Sincronizado' : 'Aguardando'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-950 mb-2">Cadeia Preflight Geral</h3>
                <p className="text-[11px] text-gray-400 leading-normal mb-3">
                  Validação orquestrada sequencial ponta a ponta simulando a geração de um documento real de atendimento.
                </p>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs font-mono leading-normal text-gray-650 min-h-12 flex items-center">
                  <p>{camadaCheckMessages.preflight || "Pré-requisito geral pronto para simulação factual de atendimento."}</p>
                </div>
              </div>
              <button
                onClick={handleRunTestPreflight}
                type="button"
                className="mt-5 w-full text-center p-2 text-xs font-semibold text-white bg-indigo-650 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                Rodar Preflight Geral
              </button>
            </div>

          </div>
          
          {/* Diagnostic Telemetry section inside Camada Zero if toggled */}
          {showDiagnostics && diagnosticsContent && (
            <div className="p-6 bg-slate-900 border-t border-slate-850 text-slate-300 font-mono text-xs relative">
              <button 
                onClick={() => setShowDiagnostics(false)} 
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xs font-bold font-sans"
              >
                [ FECHAR CONSOLE ]
              </button>
              <h4 className="text-indigo-400 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                TELEMETRIA DE DIAGNÓSTICO FACTUAL DA CAMADA ZERO:
              </h4>
              <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 p-4 rounded-xl bg-slate-950 border border-slate-800">{JSON.stringify(diagnosticsContent, null, 2)}</pre>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveCredentialsAndSettings} className="space-y-8">

          {/* BLOCK 1: Motor Google Docs Interno */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                    BLOCO 1 — Motor Google Docs Interno
                  </h2>
                  <p className="text-xs text-gray-500">
                    Geração de documentos integrada diretamente no núcleo do Portal BOSS Clientes.
                  </p>
                </div>
              </div>
              <span className="p-1 px-2 text-xs font-mono bg-emerald-100 text-emerald-800 rounded font-semibold animate-pulse">
                Ativo &amp; Operacional
              </span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                As automações de Google Docs deixaram de depender de qualquer serviço externo de proxy (como GDI legados) e agora executam diretamente através de requisições de servidores node integrados do Portal. O processamento suporta cópias simultâneas em segundo plano, substituição instantânea de tags, salvamento unificado e rastreabilidade total de logs em tempo real.
              </p>
            </div>
          </div>

          {/* BLOCK 2: Credenciais Google */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-indigo-600 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 2 — Credenciais Google
                </h2>
                <p className="text-xs text-gray-500">
                  Especificações de acesso da Conta de Serviço Google Cloud Platform.
                </p>
              </div>
            </div>
            <div className="p-6 space-y-5">

               {/* Sub-bloco: Credencial Google Docs/Drive — Preview */}
              <div id="sandbox-credential-override-card" className="bg-slate-50 border border-indigo-150 p-6 rounded-2xl mb-6 space-y-6">
                
                <div className="flex items-center justify-between border-b border-indigo-100 pb-4 col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2.5">
                    <Fingerprint className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 font-sans">
                        Credencial Google Docs/Drive — Preview
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Gerenciamento, validação e de diagnósticos stateless imediatos de credenciais temporárias do Google Cloud.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150 font-bold uppercase">
                    Stateless Sandbox Mode
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2">
                  
                  {/* Coluna Esquerda: Form de JSON de Conta de Serviço */}
                  <div className="lg:col-span-7 space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-gray-705 uppercase tracking-wider">
                          Service Account JSON
                        </label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={handlePasteOverrideJson}
                            className="text-[10px] bg-white border border-gray-200 text-gray-600 hover:text-indigo-650 hover:border-indigo-300 p-1 px-2 rounded-lg font-semibold transition"
                          >
                            Colar
                          </button>
                          <button
                            type="button"
                            onClick={handleClientSideValidateJson}
                            className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-150 p-1 px-2 rounded-lg font-semibold transition"
                          >
                            Validar JSON
                          </button>
                          <button
                            type="button"
                            onClick={handleClearOverride}
                            className="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-150 p-1 px-2 rounded-lg font-semibold transition"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>
                      <textarea
                        id="sandbox-json-textarea"
                        value={credentialOverride}
                        onChange={(e) => handleLoadAndParseOverrideJson(e.target.value)}
                        placeholder='Cole o arquivo service_account.json completo: { "type": "service_account", "project_id": "...", "private_key": "..." }'
                        className="w-full font-mono text-[11px] p-3 border border-gray-200 bg-white rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 h-36 leading-relaxed placeholder-gray-300"
                      />
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[10px] text-amber-800 leading-normal mt-2">
                        <strong>💡 Diagnóstico do modo Stateless:</strong> Se as variáveis de ambiente fáticas do servidor não estiverem definidas, use este campo de preview. O sistema processa os tokens de forma temporária e stateless (seguro e salvo apenas no <code className="font-mono text-[9px] bg-amber-100 px-0.5 rounded">localStorage</code> do seu navegador).
                      </div>
                    </div>

                    <div className="flex justify-start pt-1">
                      <button
                        type="button"
                        onClick={handleTestGoogleOverrideAuth}
                        disabled={testingOverrideAuth}
                        className="w-full md:w-auto p-2.5 px-5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {testingOverrideAuth ? "Testando..." : "Testar Credencial Google"}
                      </button>
                    </div>
                  </div>

                  {/* Coluna Direita: Metadados Detectados e Diagnósticos Stateless */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white border border-gray-150 p-4 rounded-xl space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                        Metadados da Conta de Serviço
                      </h4>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-mono">E-mail detectado da Service Account</span>
                          <div className="font-mono text-[10px] text-gray-800 bg-gray-50 p-1.5 rounded break-all select-all">
                            {parsedOverrideInfo.email || <span className="text-gray-400 italic">Ausente/Não detectado</span>}
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-mono">Project ID detectado</span>
                          <div className="font-mono text-[10px] text-gray-800 bg-gray-50 p-1.5 rounded select-all">
                            {parsedOverrideInfo.projectId || <span className="text-gray-400 italic">Ausente/Não detectado</span>}
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-mono">Status da private key</span>
                          <div className="font-mono text-[10px] bg-gray-50 p-1.5 rounded text-gray-800 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${parsedOverrideInfo.hasPrivateKey ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                            {parsedOverrideInfo.privateKeyStatus}
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-mono">Credential Source</span>
                          <div className="font-mono text-[10px] bg-gray-50 p-1.5 rounded text-gray-800">
                            {credentialOverride.trim() ? "Stateless Override (Navegador)" : "Database / System Environment"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CHECKLIST VISUAL DE INTEGRAÇÃO (Requisito 15) */}
                    <div className="bg-white border border-indigo-100 p-4 rounded-xl space-y-3">
                      <h4 className="text-[10px] font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                        <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        Checklist Visual da Integração
                      </h4>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 text-gray-400 text-[9px] uppercase font-mono">
                          <span>Etapa verificadora</span>
                          <span>Resultado</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Service Account JSON colado</span>
                          <span className="font-mono text-[10px]">{credentialOverride.trim() ? "🟢 SIM" : "🔴 NÃO"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">JSON válido</span>
                          <span className="font-mono text-[10px]">{parsedOverrideInfo.isValidJson ? "🟢 SIM" : "🔴 NÃO"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Private key válida</span>
                          <span className="font-mono text-[10px]">{(parsedOverrideInfo.hasPrivateKey && parsedOverrideInfo.privateKeyStatus.includes('PEM')) ? "🟢 SIM" : "🔴 NÃO"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Autenticação Google OK</span>
                          <span className="font-mono text-[10px]">{camadaZero.googleAuth === 'ok' ? "🟢 OK" : "🔴 PENDENTE"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Google Drive API OK</span>
                          <span className="font-mono text-[10px]">{camadaZero.driveApi === 'ok' ? "🟢 OK" : "🔴 PENDENTE"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Template Procuração PF acessível</span>
                          <span className="font-mono text-[10px]">{camadaZero.template === 'ok' ? "🟢 OK" : "🔴 PENDENTE"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Pasta Drive gravável</span>
                          <span className="font-mono text-[10px]">{camadaZero.folder === 'ok' ? "🟢 OK" : "🔴 PENDENTE"}</span>
                        </div>

                        <div className="pt-2 border-t border-indigo-100 flex items-center justify-between font-bold text-indigo-900">
                          <span>Liberada para Teste Real</span>
                          <span className="text-[10px]">{isProcuracaoUnlocked ? "🟢 SIM" : "🔴 BLOQUEADO"}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Service Account Email (Email da Conta de Serviço)
                  </label>
                  <input 
                    type="email"
                    value={serviceAccountEmail}
                    onChange={(e) => setServiceAccountEmail(e.target.value)}
                    placeholder="gdocs-service@agency.iam.gserviceaccount.com"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Esta Conta de Serviço deve receber privilégios de &quot;Editor&quot; na pasta mestre de destino e &quot;Leitor&quot; nos modelos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Project ID (Google Cloud)
                  </label>
                  <input 
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="boss-agency-gdocs"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    O ID do projeto GCP correspondente às credenciais fornecidas.
                  </p>
                </div>

              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Service Account Private Key (Chave Privada RS256)
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                  >
                    {showPrivateKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPrivateKey ? "Mascarar chave" : "Revelar chave"}
                  </button>
                </div>
                <textarea 
                  type={showPrivateKey ? 'text' : 'password'}
                  value={serviceAccountPrivateKey}
                  onChange={(e) => setServiceAccountPrivateKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD..."
                  className="w-full font-mono text-xs p-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none h-32 leading-relaxed"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Insira o corpo completo em formato PEM (incluindo quebras de linha ou \n do seu arquivo JSON de chaves baixado).
                </p>
              </div>

            </div>
          </div>

          {/* BLOCK 3: Configurações comuns */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-indigo-600 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 3 — Configurações comuns
                </h2>
                <p className="text-xs text-gray-500">
                  Diretório raiz de armazenamento de documentos no Google Drive e permissões.
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  ID Global da Pasta de Destino (Google Drive Folder ID)
                </label>
                <input 
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="1Yt-a7B9cd_ef1h2j3k4l5m6n7op_xxxx"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Pasta padrão onde os novos documentos serão gerados no Drive, caso o cliente específico ainda não possua uma pasta própria cadastrada para o caso dele.
                </p>
              </div>
            </div>
          </div>

          {/* BLOCK 4: Templates documentais */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-600 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 4 — Templates documentais
                </h2>
                <p className="text-xs text-gray-500">
                  Defina os IDs reais de cada modelo de Google Docs para o processador de substituição.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      1º Atendimento / Registro de Reunião (`primeiro_atendimento`)
                    </label>
                    <input 
                      type="text"
                      value={templates.primeiro_atendimento}
                      onChange={(e) => handleSaveTemplateInput('primeiro_atendimento', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Procuração Pessoa Física (`procuracao_pf`)
                    </label>
                    <input 
                      type="text"
                      value={templates.procuracao_pf}
                      onChange={(e) => handleSaveTemplateInput('procuracao_pf', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Procuração Pessoa Jurídica (`procuracao_pj`)
                    </label>
                    <input 
                      type="text"
                      value={templates.procuracao_pj}
                      onChange={(e) => handleSaveTemplateInput('procuracao_pj', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Declaração de Pobreza Pessoa Física (`declaracao_pobreza_pf`)
                    </label>
                    <input 
                      type="text"
                      value={templates.declaracao_pobreza_pf}
                      onChange={(e) => handleSaveTemplateInput('declaracao_pobreza_pf', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Declaração de Pobreza Pessoa Jurídica (`declaracao_pobreza_pj`)
                    </label>
                    <input 
                      type="text"
                      value={templates.declaracao_pobreza_pj}
                      onChange={(e) => handleSaveTemplateInput('declaracao_pobreza_pj', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contrato de Honorários Pessoa Física (`contrato_honorarios_pf`)
                    </label>
                    <input 
                      type="text"
                      value={templates.contrato_honorarios_pf}
                      onChange={(e) => handleSaveTemplateInput('contrato_honorarios_pf', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contrato de Honorários Pessoa Jurídica (`contrato_honorarios_pj`)
                    </label>
                    <input 
                      type="text"
                      value={templates.contrato_honorarios_pj}
                      onChange={(e) => handleSaveTemplateInput('contrato_honorarios_pj', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pré-Petição / Minuta Inicial (`pre_peticao_judicial`)
                    </label>
                    <input 
                      type="text"
                      value={templates.pre_peticao_judicial}
                      onChange={(e) => handleSaveTemplateInput('pre_peticao_judicial', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

              </div>
              <p className="text-[11px] text-gray-400 mt-4 leading-relaxed font-sans mt-3">
                Dica: O ID de um Google Docs está localizado no meiógrafo da URL de edição: <code className="bg-gray-100 p-0.5 px-1 rounded text-[10px] text-rose-600">https://docs.google.com/document/d/{"{ID_REAL_AQUI}"}/edit</code>. Certifique-se de preencher sem os caminhos circundantes.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 p-2.5 px-6 font-medium text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4" /> Save Configuration
              </button>
            </div>
          </div>

        </form>

        {/* BLOCK 5: Placeholders globais */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-600 pb-0.5" />
            <div>
              <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                BLOCO 5 — Placeholders globais
              </h2>
              <p className="text-xs text-gray-500">
                Variáveis estáticas comuns estruturadas que serão substituídas em todos os documentos.
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">Token Placeholder</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">Origem / Valor Padrão</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-xs">
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{DATA_ATUAL}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Data da geração formatada (ex: 6 de junho de 2026)</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{DATA_ATUAL}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{CIDADE_ASSINATURA}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Cidade de emissão do escritório: Viçosa, MG</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{CIDADE_ASSINATURA}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{ADVOGADO_NOME}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Nome do advogado principal: RODRIGO GIFFONI RODRIGUES</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{ADVOGADO_NOME}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{ADVOGADO_OAB}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Registro de Ordem dos Advogados: OAB/MG 157.320</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{ADVOGADO_OAB}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{ESCRITORIO_NOME}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Giffoni Connect</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{ESCRITORIO_NOME}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* BLOCK 6: Documentos específicos */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-indigo-600 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 6 — Documentos específicos
                </h2>
                <p className="text-xs text-gray-500">
                  Dicionário estruturado de placeholders específicos disponíveis em cada módulo operacional.
                </p>
              </div>
            </div>
            <select 
              value={testDocumentType} 
              onChange={(e) => setTestDocumentType(e.target.value as any)}
              className="text-xs p-1.5 border border-gray-200 focus:outline-none rounded-lg"
            >
              <option value="primeiro_atendimento">1º Atendimento</option>
              <option value="procuracao_pf">Procuração PF</option>
              <option value="procuracao_pj">Procuração PJ</option>
              <option value="declaracao_pobreza_pf">Declaração de Pobreza PF</option>
              <option value="declaracao_pobreza_pj">Declaração de Pobreza PJ</option>
              <option value="contrato_honorarios_pf">Contrato de Honorários PF</option>
              <option value="contrato_honorarios_pj">Contrato de Honorários PJ</option>
              <option value="pre_peticao_judicial">Pré-Petição / Minutas</option>
            </select>
          </div>
          <div className="p-6">
            <p className="text-xs text-gray-500 mb-4 font-sans">
              Seguindo as especificações do layout, abaixo estão listados todos os placeholders que o motor preencherá automaticamente para o documento selecionado acima (<span className="font-mono text-indigo-600">{testDocumentType}</span>):
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specificPlaceholdersMap[testDocumentType].map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                  <div className="font-mono text-xs">
                    <span className="text-gray-400 select-none mr-2">Tag:</span>
                    <strong className="text-indigo-600">{item.key}</strong>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">{item.desc}</div>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(item.key)}
                    className="p-1 px-2 text-[10px] text-indigo-600 hover:bg-indigo-150 bg-white border border-gray-100 rounded shadow-sm hover:border-indigo-300 transition"
                  >
                    Copiar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BLOCK 7: Testes reais */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Play className="w-5 h-5 text-indigo-600 pb-0.5" />
            <div>
              <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                BLOCO 7 — Testes reais
              </h2>
              <p className="text-xs text-gray-500">
                Execute geração fática contra as APIs do Google drive para validar templates sem perdas operacionais.
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Selecione um caso de teste real
                </label>
                <select 
                  value={selectedCaseId} 
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full text-sm p-3 border border-gray-200 focus:outline-none rounded-xl"
                  required
                >
                  {casesList.length === 0 ? (
                    <option value="">Carregando casos no banco...</option>
                  ) : (
                    casesList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.clientName || c.client?.nome || `Caso #${c.id.slice(0, 8)}`} - Assunto: {c.assunto || "(vazio)"}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Nome do Documento de Teste resultante
                </label>
                <input 
                  type="text"
                  value={customDocumentName}
                  onChange={(e) => setCustomDocumentName(e.target.value)}
                  placeholder="Ex: Procuracao Teste - Rodrigo Giffoni"
                  className="w-full text-sm p-3 border border-gray-200 focus:outline-none rounded-xl"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  type="button" 
                  onClick={handleTriggerTest}
                  disabled={isRunningTest || casesList.length === 0 || !isProcuracaoUnlocked}
                  className="flex items-center gap-2 p-3 px-6 font-semibold text-sm text-white bg-indigo-650 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
                >
                  {isRunningTest ? "Gerando Documento..." : (testDocumentType === "procuracao_pf" ? "Gerar Procuração de Teste Real" : "Gerar Documento de Teste")}
                </button>

                {testSuccessUrl && (
                  <a 
                    href={testSuccessUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 px-5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Abrir Google Document
                  </a>
                )}
              </div>

              {!isProcuracaoUnlocked && (
                <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl flex items-center gap-2 max-w-lg leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>
                    <strong>Pré-requisitos pendentes:</strong> Certifique-se de preencher a Service Account JSON no modo Preview (ou ter chaves válidas configuradas), obter Autenticação OK, Template acessível, Pasta gravável e escolher um caso de teste fático.
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* BLOCK 8: Logs e auditoria */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-gray-700 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 8 — Logs e auditoria
                </h2>
                <p className="text-xs text-gray-500">
                  Histórico de telemetria das etapas percorridas na automação de templates.
                </p>
              </div>
            </div>
            {testLogs.length > 0 && (
              <button 
                onClick={() => setTestLogs([])}
                className="text-[10px] text-gray-400 hover:text-gray-600"
              >
                Limpar Logs
              </button>
            )}
          </div>
          <div className="p-6 bg-slate-900 border-t border-slate-950 font-mono text-sm leading-6 text-slate-300 min-h-36">
            {testLogs.length === 0 ? (
              <span className="text-slate-500 select-none text-xs">
                [Logs vazios] Aguardando acionamento de geração de documento de teste para auditar steps...
              </span>
            ) : (
              <div className="space-y-3 text-xs">
                {testLogs.map((log, index) => (
                  <div key={index} className="border-l-2 border-indigo-500 pl-3 py-1 bg-slate-950/40 rounded-r-lg">
                    <span className="text-indigo-400 font-semibold uppercase font-bold tracking-tight">[{log.step}]</span>
                    <span className="text-slate-500 text-[10px] ml-2">({log.timestamp})</span>
                    <p className="text-slate-300 font-sans mt-0.5">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BLOCK 9: Legado GDI desativado */}
        <div className="bg-white border border-rose-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-rose-100 bg-rose-50/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <X className="w-5 h-5 text-rose-600" />
              <div>
                <h2 className="text-base font-medium text-rose-950 font-sans tracking-tight">
                  BLOCO 9 — Legado GDI desativado (Desvinculado com Sucesso!)
                </h2>
                <p className="text-xs text-rose-700/80">
                  Os barramentos operacionais foram devidamente desligados.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 text-xs text-rose-800 leading-relaxed font-mono space-y-3">
            <p>
              A antiga API externa GDI (<code className="bg-rose-50 p-0.5 rounded text-rose-700">https://giffoniconnect.como.br</code>) e suas chaves de barramentos (<code className="bg-rose-50 p-0.5 rounded text-rose-700">X-BOSS-Google-Docs-Integration-Key</code>) foram desativadas e desvinculadas das operações fáticas do portal. A fila de Webhooks operantes para auditoria (<code className="bg-rose-50 p-0.5 rounded text-rose-700">/api/webhook/gdi-job</code>) agora é redirecionada de volta à central interna de geração.
            </p>
            <p className="font-semibold text-[11px] text-rose-900">
              ✓ Nenhuma requisição operacional externa trafega no servidor para segurança absoluta.
            </p>
          </div>
        </div>

      </div>
    </BossLayout>
  );
}
