import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { LOCAL_FALLBACK_TEMPLATES } from '../Configuracoes';
import FluxoStepLayout from './components/FluxoStepLayout';
import RequestStatusBadge from './components/RequestStatusBadge';
import RequestVisibilityBadge from './components/RequestVisibilityBadge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Info, 
  Plus, 
  Edit2, 
  Check, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Archive,
  RefreshCw,
  FolderOpen,
  FileCheck2,
  HardDrive,
  ExternalLink,
  Globe,
  HelpCircle,
  Eye,
  CheckCircle
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface EvidenceRequest {
  id: string;
  caseId: string;
  clientId: string;
  clientSlug: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pendente' | 'enviado' | 'em_analise' | 'aprovado' | 'rejeitado' | 'complemento_solicitado' | 'arquivado';
  visibleToClient: boolean;
  allowUpload: boolean;
  expectedFileTypes: string[];
  maxFiles: number;
  clientObservation?: string;
  bossAnalysisStatus?: string;
  bossAnalysisNotes?: string;
  createdAt: string;
  updatedAt: string;
  documentNumber?: string;
  documentType?: string;
  generatedFileName?: string;
  serviceStatus?: string;
  integrationPayload?: any;
  googleDocsUrl?: string;
  googleDocsId?: string;
  automationLog?: string;
}

export default function SolicitacoesProvas() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  // Root screen states
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // DB entities
  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [requests, setRequests] = useState<EvidenceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [docTemplates, setDocTemplates] = useState<any[]>([]);

  // 4 documentary steps states (saved in the case document)
  const [procuracaoStatus, setProcuracaoStatus] = useState<'aguardando' | 'criada' | 'falha' | 'pendente'>('pendente');
  const [procuracaoGoogleDocsUrl, setProcuracaoGoogleDocsUrl] = useState('');
  const [procuracaoGoogleDocsId, setProcuracaoGoogleDocsId] = useState('');
  const [procuracaoLogFalha, setProcuracaoLogFalha] = useState('');

  const [desejaRecolherCustas, setDesejaRecolherCustas] = useState(false);
  const [guiaCustasNecessaria, setGuiaCustasNecessaria] = useState(false);
  const [guiaCustasStatus, setGuiaCustasStatus] = useState<'pendente' | 'aprovado' | 'rejeitado' | 'aguardando'>('aguardando');
  const [declaracaoPobrezaStatus, setDeclaracaoPobrezaStatus] = useState<'aguardando' | 'criada' | 'falha' | 'pendente'>('pendente');
  const [declaracaoPobrezaGoogleDocsUrl, setDeclaracaoPobrezaGoogleDocsUrl] = useState('');
  const [declaracaoPobrezaGoogleDocsId, setDeclaracaoPobrezaGoogleDocsId] = useState('');
  const [declaracaoPobrezaLogFalha, setDeclaracaoPobrezaLogFalha] = useState('');

  const [contratoHonorariosStatus, setContratoHonorariosStatus] = useState<'aguardando' | 'criada' | 'falha' | 'pendente'>('pendente');
  const [contratoHonorariosGoogleDocsUrl, setContratoHonorariosGoogleDocsUrl] = useState('');
  const [contratoHonorariosGoogleDocsId, setContratoHonorariosGoogleDocsId] = useState('');
  const [contratoHonorariosLogFalha, setContratoHonorariosLogFalha] = useState('');

  const [checklistProvasGoogleDocsStatus, setChecklistProvasGoogleDocsStatus] = useState<'aguardando' | 'criada' | 'falha' | 'pendente'>('pendente');
  const [checklistProvasGoogleDocsUrl, setChecklistProvasGoogleDocsUrl] = useState('');
  const [checklistProvasGoogleDocsId, setChecklistProvasGoogleDocsId] = useState('');
  const [checklistProvasLogFalha, setChecklistProvasLogFalha] = useState('');
  const [checklistProvasUpdatedAt, setChecklistProvasUpdatedAt] = useState('');

  // Tab navigation & Step management
  const [activeStepTab, setActiveStepTab] = useState<'procuracao' | 'custas' | 'contrato' | 'checklist_provas' | 'auditoria'>('procuracao');

  // Form inputs for Custom Evidence
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [formAllowUpload, setFormAllowUpload] = useState(true);
  const [formMaxFiles, setFormMaxFiles] = useState(1);

  const [typePdf, setTypePdf] = useState(true);
  const [typeAudio, setTypeAudio] = useState(false);
  const [typeVideo, setTypeVideo] = useState(false);

  const [formStatus, setFormStatus] = useState<EvidenceRequest['status']>('pendente');
  const [formAnalysisStatus, setFormAnalysisStatus] = useState('');
  const [formAnalysisNotes, setFormAnalysisNotes] = useState('');

  const [formDocNumber, setFormDocNumber] = useState('');
  const [useDefaultDeadline, setUseDefaultDeadline] = useState(true);

  const [auditData, setAuditData] = useState<any>({});

  const [refreshToggle, setRefreshToggle] = useState(0);

  const clientName = client 
    ? (client.type === 'PF' 
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Sem Nome') 
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Sem Razão Social'))
    : '';
  const clientSlug = client?.slug || '';

  // Google Drive Folder configuration retrieval
  const driveFolderId = client?.googleDriveClientFolderId || client?.gdriveFolderId || caseObj?.gdriveFolderId || '';
  const driveFolderUrl = client?.googleDriveClientFolderUrl || client?.gdriveFolderUrl || caseObj?.gdriveFolderUrl || '';
  const hasDriveFolder = !!driveFolderId;

  useEffect(() => {
    if (!caseId) {
      setError('Identificador do caso correspondente ausente.');
      setFetching(false);
      return;
    }

    async function loadData() {
      try {
        setLoadingRequests(true);
        const caseSnap = await getDoc(doc(db, 'cases', caseId!));
        if (!caseSnap.exists()) {
          setError(`Caso referenciado por ID [${caseId}] não existe no banco de dados.`);
          setFetching(false);
          setLoadingRequests(false);
          return;
        }
        const cData = caseSnap.data();
        setCaseObj(cData);

        // Fetch states from caseObj if they exist
        if (cData.procuracaoStatus) setProcuracaoStatus(cData.procuracaoStatus);
        if (cData.procuracaoGoogleDocsUrl) setProcuracaoGoogleDocsUrl(cData.procuracaoGoogleDocsUrl);
        if (cData.procuracaoGoogleDocsId) setProcuracaoGoogleDocsId(cData.procuracaoGoogleDocsId);
        if (cData.procuracaoLogFalha) setProcuracaoLogFalha(cData.procuracaoLogFalha);

        if (cData.desejaRecolherCustas !== undefined) setDesejaRecolherCustas(cData.desejaRecolherCustas);
        if (cData.guiaCustasNecessaria !== undefined) setGuiaCustasNecessaria(cData.guiaCustasNecessaria);
        if (cData.guiaCustasStatus) setGuiaCustasStatus(cData.guiaCustasStatus);
        if (cData.declaracaoPobrezaStatus) setDeclaracaoPobrezaStatus(cData.declaracaoPobrezaStatus);
        if (cData.declaracaoPobrezaGoogleDocsUrl) setDeclaracaoPobrezaGoogleDocsUrl(cData.declaracaoPobrezaGoogleDocsUrl);
        if (cData.declaracaoPobrezaGoogleDocsId) setDeclaracaoPobrezaGoogleDocsId(cData.declaracaoPobrezaGoogleDocsId);
        if (cData.declaracaoPobrezaLogFalha) setDeclaracaoPobrezaLogFalha(cData.declaracaoPobrezaLogFalha);

        if (cData.contratoHonorariosStatus) setContratoHonorariosStatus(cData.contratoHonorariosStatus);
        if (cData.contratoHonorariosGoogleDocsUrl) setContratoHonorariosGoogleDocsUrl(cData.contratoHonorariosGoogleDocsUrl);
        if (cData.contratoHonorariosGoogleDocsId) setContratoHonorariosGoogleDocsId(cData.contratoHonorariosGoogleDocsId);
        if (cData.contratoHonorariosLogFalha) setContratoHonorariosLogFalha(cData.contratoHonorariosLogFalha);

        if (cData.checklistProvasGoogleDocsStatus) setChecklistProvasGoogleDocsStatus(cData.checklistProvasGoogleDocsStatus);
        if (cData.checklistProvasGoogleDocsUrl) setChecklistProvasGoogleDocsUrl(cData.checklistProvasGoogleDocsUrl);
        if (cData.checklistProvasGoogleDocsId) setChecklistProvasGoogleDocsId(cData.checklistProvasGoogleDocsId);
        if (cData.checklistProvasLogFalha) setChecklistProvasLogFalha(cData.checklistProvasLogFalha);
        if (cData.checklistProvasUpdatedAt) setChecklistProvasUpdatedAt(cData.checklistProvasUpdatedAt);

        if (cData.auditData) {
          setAuditData(cData.auditData);
        } else {
          setAuditData({});
        }

        // Fetch Client
        if (cData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', cData.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        // Fetch Evidence Requests
        const q = query(collection(db, 'caseEvidenceRequests'), where('caseId', '==', caseId));
        const querySnap = await getDocs(q);
        const reqList: EvidenceRequest[] = [];
        querySnap.forEach((docSnap) => {
          reqList.push({ id: docSnap.id, ...docSnap.data() } as EvidenceRequest);
        });

        reqList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(reqList);

        // Fetch template configurations 
        const docTemplatesSnap = await getDoc(doc(db, 'settings', 'documentTemplates'));
        if (docTemplatesSnap.exists()) {
          const tData = docTemplatesSnap.data();
          if (tData.templates && Array.isArray(tData.templates)) {
            setDocTemplates(tData.templates);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erro crítico ao carregar: ${err.message || err}`);
      } finally {
        setFetching(false);
        setLoadingRequests(false);
      }
    }

    loadData();
  }, [caseId, refreshToggle]);

  // Reactive automatic 7-day standard deadline
  useEffect(() => {
    if (useDefaultDeadline) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setFormDueDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [useDefaultDeadline]);

  // Dynamic document counter: ignore contract 'Doc. $$$', start at Doc. 03
  useEffect(() => {
    if (!editingId) {
      const customOnes = requests.filter(r => r.status !== 'arquivado' && !['Procuração', 'Declaração de Pobreza', 'Contrato de Honorários', 'Checklist de Provas'].includes(r.documentType || ''));
      const nextNum = 3 + customOnes.length;
      setFormDocNumber(`Doc. ${String(nextNum).padStart(2, '0')}`);
    }
  }, [requests, editingId]);

  // Unified simulation controller for Google Docs automations
  const triggerAutomation = async (
    type: 'Procuração' | 'Declaração de Pobreza' | 'Contrato de Honorários' | 'Checklist de Provas',
    status: 'aguardando' | 'criada' | 'falha' | 'pendente',
    customUrl?: string,
    customId?: string,
    customLog?: string
  ) => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      const numMap = {
        'Procuração': '001',
        'Declaração de Pobreza': '002',
        'Contrato de Honorários': '003',
        'Checklist de Provas': '004'
      };
      const documentNumber = numMap[type];

      let templateId = '';
      if (type !== 'Checklist de Provas') {
        const remoteMatch = docTemplates.find(t => t.name === type || t.id === type.toLowerCase().replace(/[^a-z0-9]/g, '_'));
        templateId = remoteMatch?.templateId || LOCAL_FALLBACK_TEMPLATES.find(t => t.name === type)?.templateId || 'gdocs-template';
      }

      const clientNameText = clientName || 'Cliente';
      const cSlug = clientSlug || clientNameText.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cliente';
      const generatedDocumentName = `${cSlug}_${caseId!.slice(0, 8)}_${type.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}_${documentNumber}.docx`;

      const placeholders = {
        client_name: clientNameText,
        client_slug: cSlug,
        case_id: caseId || '',
        client_email: client?.email || '',
        client_phone: client?.phone || '',
        client_cpf: client?.pfDadosPessoais?.pf_cpf || client?.pfData?.pf_cpf || client?.cnpj || '',
        client_nationality: client?.pfDadosPessoais?.pf_nacionalidade || 'Brasileiro(a)',
        client_address: client?.pfDadosPessoais?.pf_enderecoCompleto || 'Endereço',
        system_date: new Date().toLocaleDateString('pt-BR')
      };

      const createdBy = localStorage.getItem('boss_user_email') || 'direito.rgr@gmail.com';

      const integrationPayload = {
        caseId: caseId!,
        clientId: caseObj?.clientId || '',
        clientSlug: cSlug,
        documentType: type,
        documentNumber,
        templateId,
        targetDriveFolderId: driveFolderId,
        targetDriveFolderUrl: driveFolderUrl,
        generatedDocumentName,
        placeholders,
        createdBy,
        createdAt: nowISO
      };

      // Upsert into caseEvidenceRequests
      const existingReq = requests.find(r => r.documentType === type && r.status !== 'arquivado');
      const reqPayload: any = {
        caseId: caseId!,
        clientId: caseObj?.clientId || '',
        clientSlug: cSlug,
        title: `${documentNumber} - ${type}`,
        description: `Controle operacional fático para ${type}. Automação do pacote de onboarding integrado ao Google Workspace.`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: status === 'criada' ? 'em_analise' : (status === 'falha' ? 'rejeitado' : 'pendente'),
        visibleToClient: true,
        allowUpload: true,
        expectedFileTypes: ['PDF'],
        maxFiles: 1,
        updatedAt: nowISO,
        documentNumber,
        documentType: type,
        generatedFileName: generatedDocumentName,
        integrationPayload,
        serviceStatus: status === 'aguardando' ? 'aguardando_microsservico' : (status === 'criada' ? 'sucesso_microsservico' : (status === 'falha' ? 'falha_microsservico' : 'standby')),
        googleDocsUrl: customUrl || (status === 'criada' ? `https://docs.google.com/document/d/mock-${type.toLowerCase().replace(/[^a-z]/g, '')}-${caseId}` : ''),
        googleDocsId: customId || (status === 'criada' ? `mock-id-${type.toLowerCase().replace(/[^a-z]/g, '')}-${caseId}` : ''),
        automationLog: customLog || (status === 'falha' ? 'Erro 503: Servidor de Templates da Google está temporariamente indisponível' : '')
      };

      if (existingReq) {
        await updateDoc(doc(db, 'caseEvidenceRequests', existingReq.id), reqPayload);
      } else {
        reqPayload.createdAt = nowISO;
        await addDoc(collection(db, 'caseEvidenceRequests'), reqPayload);
      }

      // States updates
      let updates: any = {};
      if (type === 'Procuração') {
        const urlV = reqPayload.googleDocsUrl;
        const idV = reqPayload.googleDocsId;
        const logV = reqPayload.automationLog;
        setProcuracaoStatus(status);
        setProcuracaoGoogleDocsUrl(urlV);
        setProcuracaoGoogleDocsId(idV);
        setProcuracaoLogFalha(logV);
        updates = { procuracaoStatus: status, procuracaoGoogleDocsUrl: urlV, procuracaoGoogleDocsId: idV, procuracaoLogFalha: logV };
      } else if (type === 'Declaração de Pobreza') {
        const urlV = reqPayload.googleDocsUrl;
        const idV = reqPayload.googleDocsId;
        const logV = reqPayload.automationLog;
        setDeclaracaoPobrezaStatus(status);
        setDeclaracaoPobrezaGoogleDocsUrl(urlV);
        setDeclaracaoPobrezaGoogleDocsId(idV);
        setDeclaracaoPobrezaLogFalha(logV);
        updates = { declaracaoPobrezaStatus: status, declaracaoPobrezaGoogleDocsUrl: urlV, declaracaoPobrezaGoogleDocsId: idV, declaracaoPobrezaLogFalha: logV };
      } else if (type === 'Contrato de Honorários') {
        const urlV = reqPayload.googleDocsUrl;
        const idV = reqPayload.googleDocsId;
        const logV = reqPayload.automationLog;
        setContratoHonorariosStatus(status);
        setContratoHonorariosGoogleDocsUrl(urlV);
        setContratoHonorariosGoogleDocsId(idV);
        setContratoHonorariosLogFalha(logV);
        updates = { contratoHonorariosStatus: status, contratoHonorariosGoogleDocsUrl: urlV, contratoHonorariosGoogleDocsId: idV, contratoHonorariosLogFalha: logV };
      } else if (type === 'Checklist de Provas') {
        const urlV = reqPayload.googleDocsUrl;
        const idV = reqPayload.googleDocsId;
        const logV = reqPayload.automationLog;
        setChecklistProvasGoogleDocsStatus(status);
        setChecklistProvasGoogleDocsUrl(urlV);
        setChecklistProvasGoogleDocsId(idV);
        setChecklistProvasLogFalha(logV);
        setChecklistProvasUpdatedAt(nowISO);
        updates = { checklistProvasGoogleDocsStatus: status, checklistProvasGoogleDocsUrl: urlV, checklistProvasGoogleDocsId: idV, checklistProvasLogFalha: logV, checklistProvasUpdatedAt: nowISO };
      }

      await updateDoc(doc(db, 'cases', caseId!), updates);
      setSuccess(`Estado de ${type} modificado para [${status.toUpperCase()}] com persistência garantida.`);
      setRefreshToggle(p => p + 1);
    } catch (err: any) {
      console.error(err);
      setError(`Falha ao simular operação: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRecolherCustas = async (val: boolean) => {
    setDesejaRecolherCustas(val);
    setGuiaCustasNecessaria(val);
    try {
      await updateDoc(doc(db, 'cases', caseId!), { desejaRecolherCustas: val, guiaCustasNecessaria: val });
      setSuccess(`Definição de custas salva com sucesso: ${val ? 'SIM (Recolher Guia)' : 'NÃO (Declarar Pobreza)'}`);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateGuiaStatus = async (val: typeof guiaCustasStatus) => {
    setGuiaCustasStatus(val);
    try {
      await updateDoc(doc(db, 'cases', caseId!), { guiaCustasStatus: val });
      setSuccess(`Status da Guia de Custas atualizada para [${val.toUpperCase()}].`);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleQuickStatusUpdate = async (reqId: string, statusText: EvidenceRequest['status'], analysisStatus?: string) => {
    setError(null);
    setSaving(true);
    const nowISO = new Date().toISOString();
    try {
      const payload: any = { status: statusText, updatedAt: nowISO };
      if (analysisStatus !== undefined) payload.bossAnalysisStatus = analysisStatus;
      await updateDoc(doc(db, 'caseEvidenceRequests', reqId), payload);
      setSuccess('Status de prova alterado rápida!');
      setRefreshToggle(p => p + 1);
    } catch (err: any) {
      console.error(err);
      setError(`Erro na atualização rápida: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getNextDocumentNumber = () => {
    let maxNum = 2; // Começa após Doc. 01 (Procuração), Doc. 02 (Declaração/Custas)
    requests.forEach((r) => {
      if (r.documentNumber && r.documentNumber !== '$$$') {
        const num = parseInt(r.documentNumber.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      } else if (r.title && r.title.startsWith('Doc. ')) {
        const match = r.title.match(/^Doc\.\s*(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    return `Doc. ${String(maxNum + 1).padStart(2, '0')}`;
  };

  const handleToggleAudit = async (docKey: string, field: 'delivered' | 'digitized' | 'uploaded') => {
    const current = auditData[docKey] || { delivered: false, digitized: false, uploaded: false };
    const updated = {
      ...current,
      [field]: !current[field]
    };
    const nextAuditData = {
      ...auditData,
      [docKey]: updated
    };
    setAuditData(nextAuditData);
    
    try {
      await updateDoc(doc(db, 'cases', caseId!), { auditData: nextAuditData });
    } catch (err) {
      console.error('Erro ao auto-salvar auditoria no Firestore:', err);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formTitle.trim() || !formDesc.trim()) {
      setError('Importante: Preencha o título descritivo e as orientações da prova.');
      return;
    }

    const expectedTypes: string[] = [];
    if (typePdf) expectedTypes.push('PDF');
    if (typeAudio) expectedTypes.push('áudio compatível com PJe');
    if (typeVideo) expectedTypes.push('vídeo compatível com PJe');

    if (formAllowUpload && expectedTypes.length === 0) {
      setError('Escolha o formato esperado de arquivo para liberar uploads.');
      return;
    }

    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      const docNumToSave = formDocNumber.trim() || getNextDocumentNumber();
      const prependedTitle = formDocNumber.trim() ? `${formDocNumber.trim()} - ${formTitle.trim()}` : formTitle.trim();

      const payload: any = {
        caseId: caseId!,
        clientId: caseObj?.clientId || '',
        clientSlug: clientSlug || '',
        title: prependedTitle,
        description: formDesc.trim(),
        dueDate: formDueDate || '',
        visibleToClient: formVisible,
        allowUpload: formAllowUpload,
        expectedFileTypes: expectedTypes,
        maxFiles: 1, // Internamente mantido como 1 arquivo por pedido
        documentNumber: docNumToSave,
        updatedAt: nowISO
      };

      if (editingId) {
        payload.status = formStatus;
        payload.bossAnalysisStatus = formAnalysisStatus;
        payload.bossAnalysisNotes = formAnalysisNotes.trim();
        await updateDoc(doc(db, 'caseEvidenceRequests', editingId), payload);
        setSuccess('Comprovante de prova customizado atualizado com êxito!');
      } else {
        payload.status = 'pendente';
        payload.bossAnalysisStatus = '';
        payload.bossAnalysisNotes = '';
        payload.createdAt = nowISO;
        await addDoc(collection(db, 'caseEvidenceRequests'), payload);
        setSuccess('Novo pedido de prova customizado registrado.');
      }

      await updateDoc(doc(db, 'cases', caseId!), { statusPublicoCliente: "Aguardando documentos", productionStatus: "em_producao", updatedAt: nowISO });
      setEditingId(null);
      setFormTitle('');
      setFormDesc('');
      // Reset doc number so we suggest a new one next time
      setFormDocNumber('');
      setRefreshToggle(p => p + 1);
    } catch (err: any) {
      console.error(err);
      setError(`Erro no salvamento fático da prova: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditInit = (req: EvidenceRequest) => {
    setEditingId(req.id);
    let cleanTitle = req.title;
    let docNum = req.documentNumber || '';
    if (!docNum) {
      const match = req.title.match(/^(Doc\.\s*\d+)\s*-\s*(.*)/i);
      if (match) {
        docNum = match[1];
        cleanTitle = match[2];
      }
    } else {
      const prefix = `${docNum} - `;
      if (cleanTitle.startsWith(prefix)) {
        cleanTitle = cleanTitle.substring(prefix.length);
      }
    }

    setFormTitle(cleanTitle);
    setFormDocNumber(docNum);
    setFormDesc(req.description);
    setFormDueDate(req.dueDate || '');
    setFormVisible(req.visibleToClient);
    setFormAllowUpload(req.allowUpload !== false);
    setFormMaxFiles(1);
    setTypePdf(req.expectedFileTypes?.includes('PDF') || false);
    setTypeAudio(req.expectedFileTypes?.includes('áudio compatível com PJe') || false);
    setTypeVideo(req.expectedFileTypes?.includes('vídeo compatível com PJe') || false);
    setFormStatus(req.status);
    setFormAnalysisStatus(req.bossAnalysisStatus || '');
    setFormAnalysisNotes(req.bossAnalysisNotes || '');
  };

  const handleSaveAndAdvance = async () => {
    setSaving(true);
    setError(null);
    const nowISO = new Date().toISOString();
    try {
      const payload = {
        productionStage: "solicitacoes-informacoes",
        evidenceCompleted: true, // Libera pendência em definitivo
        evidenceStatus: 'concluido',
        updatedAt: nowISO,
        desejaRecolherCustas,
        guiaCustasNecessaria,
        guiaCustasStatus,
        procuracaoStatus,
        declaracaoPobrezaStatus,
        contratoHonorariosStatus,
        checklistProvasGoogleDocsStatus,
        auditData
      };
      
      await updateDoc(doc(db, 'cases', caseId!), payload);

      try {
        await setDoc(doc(db, 'casos', caseId!), {
          productionStage: "solicitacoes-informacoes",
          evidenceCompleted: true,
          evidenceStatus: 'concluido',
          updatedAt: nowISO
        }, { merge: true });
      } catch (mirrorErr) {
        console.warn('Erro silencioso no espelho de casos:', mirrorErr);
      }

      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId!}/solicitacoes-informacoes`);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao avançar de etapa: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStepVisualStatus = (step: 'procuracao' | 'custas' | 'contrato' | 'checklist' | 'auditoria') => {
    if (step === 'procuracao') {
      if (procuracaoStatus === 'concluido' || procuracaoStatus === 'criada') return { icon: '✅', label: 'Concluído', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
      if (procuracaoStatus === 'falha') return { icon: '❌', label: 'Falha', color: 'bg-rose-50 border-rose-200 text-rose-800' };
      if (procuracaoStatus === 'aguardando') return { icon: '⏳', label: 'Aguardando Automação', color: 'bg-amber-50 border-amber-200 text-amber-800' };
      if (procuracaoStatus === 'pendente_assinatura') return { icon: '✍️', label: 'Assinatura Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
      if (procuracaoStatus === 'pendente_digitalizacao') return { icon: '📑', label: 'Digitalização Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
      if (procuracaoStatus === 'pendente_upload') return { icon: '📤', label: 'Upload Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
      return { icon: '⏳', label: 'Pendente', color: 'bg-gray-50 border-gray-200 text-gray-700' };
    }
    if (step === 'custas') {
      if (desejaRecolherCustas) {
        if (guiaCustasStatus === 'aprovado') return { icon: '✅', label: 'Custas Pagas', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
        if (guiaCustasStatus === 'rejeitado') return { icon: '❌', label: 'Guia Rejeitada', color: 'bg-rose-50 border-rose-200 text-rose-800' };
        return { icon: '⏳', label: 'Aguardando Guia', color: 'bg-amber-50 border-amber-200 text-amber-805' };
      } else {
        if (declaracaoPobrezaStatus === 'concluido' || declaracaoPobrezaStatus === 'criada') return { icon: '✅', label: 'Dec. Criada', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
        if (declaracaoPobrezaStatus === 'falha') return { icon: '❌', label: 'Falha Dec.', color: 'bg-rose-50 border-rose-200 text-rose-800' };
        if (declaracaoPobrezaStatus === 'aguardando') return { icon: '⏳', label: 'Aguardando Automação', color: 'bg-amber-50 border-amber-200 text-amber-805' };
        if (declaracaoPobrezaStatus === 'pendente_assinatura') return { icon: '✍️', label: 'Assinatura Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
        if (declaracaoPobrezaStatus === 'pendente_digitalizacao') return { icon: '📑', label: 'Digitalização Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
        if (declaracaoPobrezaStatus === 'pendente_upload') return { icon: '📤', label: 'Upload Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
        return { icon: '⏳', label: 'Pendente', color: 'bg-gray-50 border-gray-200 text-gray-700' };
      }
    }
    if (step === 'contrato') {
      if (contratoHonorariosStatus === 'concluido' || contratoHonorariosStatus === 'criada') return { icon: '✅', label: 'Concluído', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
      if (contratoHonorariosStatus === 'falha') return { icon: '❌', label: 'Falha', color: 'bg-rose-50 border-rose-200 text-rose-800' };
      if (contratoHonorariosStatus === 'aguardando') return { icon: '⏳', label: 'Aguardando Automação', color: 'bg-amber-50 border-amber-200 text-amber-805' };
      if (contratoHonorariosStatus === 'pendente_assinatura') return { icon: '✍️', label: 'Assinatura Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
      if (contratoHonorariosStatus === 'pendente_digitalizacao') return { icon: '📑', label: 'Digitalização Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
      if (contratoHonorariosStatus === 'pendente_upload') return { icon: '📤', label: 'Upload Pendente', color: 'bg-indigo-50 border-indigo-200 text-indigo-850' };
      return { icon: '⏳', label: 'Pendente', color: 'bg-gray-50 border-gray-200 text-gray-700' };
    }
    if (step === 'checklist') {
      if (checklistProvasGoogleDocsStatus === 'concluido' || checklistProvasGoogleDocsStatus === 'criada') return { icon: '✅', label: 'Gerado Docs', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
      if (checklistProvasGoogleDocsStatus === 'falha') return { icon: '❌', label: 'Falha', color: 'bg-rose-50 border-rose-200 text-rose-800' };
      if (checklistProvasGoogleDocsStatus === 'aguardando') return { icon: '⏳', label: 'Aguardando Automação', color: 'bg-amber-50 border-amber-200 text-amber-805' };
      return { icon: '⏳', label: 'Não Criado', color: 'bg-gray-50 border-gray-200 text-gray-750' };
    }
    if (step === 'auditoria') {
      const keys = Object.keys(auditData);
      if (keys.length === 0) return { icon: '⏳', label: 'Não Iniciado', color: 'bg-gray-50 border-gray-200 text-gray-500' };
      const total = keys.length;
      const completed = keys.filter(k => auditData[k]?.delivered && auditData[k]?.digitized && auditData[k]?.uploaded).length;
      if (completed === total) return { icon: '✅', label: 'Auditado', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
      return { icon: '🎨', label: `${completed}/${total} Auditados`, color: 'bg-amber-50 border-amber-200 text-amber-800' };
    }
    return { icon: '⏳', label: 'Pendente', color: 'bg-gray-50 border-gray-200 text-gray-700' };
  };

  // Extract non-standard custom proofs to feed step 4 & step 5
  const standardDocTypes = ['Procuração', 'Declaração de Pobreza', 'Contrato de Honorários', 'Checklist de Provas'];
  const customRequests = requests.filter(r => !standardDocTypes.includes(r.documentType || ''));

  return (
    <FluxoStepLayout stepName="Solicitações de Provas" caseId={caseId!} statusText={caseObj?.status === 'rascunho' ? 'Rascunho' : 'Ativo'}>
      <div className="space-y-6">

        {/* MESSAGES */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-990 text-emerald-900 text-xs flex gap-3 items-center">
            <Check className="text-emerald-500 shrink-0" size={16} />
            <span className="font-bold">{success}</span>
          </div>
        )}

        {/* METADATA BANNER */}
        {!fetching && caseObj && (
          <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Cliente</span>
                <span className="font-bold text-gray-800">{clientName || 'Carregando titular...'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Inscrição</span>
                <span className="font-bold text-gray-800 uppercase">{caseObj.registrationType}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Acompanhamento</span>
                <span className="font-bold text-indigo-700">{caseObj.statusPublicoCliente || 'Iniciar triagem'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Pasta Drive</span>
                {hasDriveFolder ? (
                  <a href={driveFolderUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-extrabold hover:underline break-all inline-flex items-center gap-1">
                    <HardDrive size={11} className="shrink-0" />
                    <span>Conectada ({driveFolderId.slice(0, 8)})</span>
                  </a>
                ) : (
                  <span className="text-rose-600 font-extrabold flex items-center gap-1">
                    <AlertTriangle size={11} />
                    <span>Nenhuma Pasta</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GOOGLE DRIVE PENDING ALERTER */}
        {!fetching && !hasDriveFolder && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-xs space-y-1.5 font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500 animate-pulse" size={16} />
              <span className="font-extrabold uppercase">Atenção: Pasta Google Drive Não Encontrada</span>
            </div>
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
              Pasta Google Drive do cliente ainda não configurada. Crie a pasta no cadastro antes de gerar documentos.
            </p>
          </div>
        )}

        {fetching ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-500" size={28} />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Sincronizando Pacote de Provas...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* LEFT AREA: NAVIGATION TABS AND OVERVIEW CHECKLIST GENERAL BACKGROUND */}
            <div className="xl:col-span-4 space-y-4">
              <div className="bg-white border border-gray-150 rounded-3xl p-4 space-y-2 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono block">Estrutura de 5 Etapas</span>
                
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveStepTab('procuracao')}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex justify-between items-center transition-all ${
                      activeStepTab === 'procuracao' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>1. Procuração Automática</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-inherit font-mono font-black uppercase">
                      {getStepVisualStatus('procuracao').icon}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStepTab('custas')}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex justify-between items-center transition-all ${
                      activeStepTab === 'custas' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>2. Custas / Declaração</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-inherit font-mono font-black uppercase">
                      {getStepVisualStatus('custas').icon}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStepTab('contrato')}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex justify-between items-center transition-all ${
                      activeStepTab === 'contrato' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>3. Contrato de Honorários</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-inherit font-mono font-black uppercase">
                      {getStepVisualStatus('contrato').icon}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStepTab('checklist_provas')}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex justify-between items-center transition-all ${
                      activeStepTab === 'checklist_provas' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>4. Solicitação de Provas</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-inherit font-mono font-black uppercase">
                      {getStepVisualStatus('checklist').icon}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStepTab('auditoria')}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex justify-between items-center transition-all border-dashed border border-indigo-200 ${
                      activeStepTab === 'auditoria' ? 'bg-indigo-600 text-white' : 'bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    <span>5. Auditoria de Provas</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-200 text-indigo-900 rounded font-mono font-black">AUDIT</span>
                  </button>
                </div>
              </div>

              {/* CHECKLIST VISUAL GERAL CARD */}
              <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 font-sans border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <FileCheck2 size={16} className="text-indigo-600" />
                  <span>Resumo do Onboarding</span>
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-750">1. Procuração</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('procuracao').color}`}>
                      {getStepVisualStatus('procuracao').icon} {getStepVisualStatus('procuracao').label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-750">2. Custas / Declaração</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('custas').color}`}>
                      {getStepVisualStatus('custas').icon} {getStepVisualStatus('custas').label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-750">3. Contrato de Honorários</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('contrato').color}`}>
                      {getStepVisualStatus('contrato').icon} {getStepVisualStatus('contrato').label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-750">4. Solicitação de Provas</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('checklist').color}`}>
                      {getStepVisualStatus('checklist').icon} {getStepVisualStatus('checklist').label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-750">5. Auditoria de Provas</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('auditoria').color}`}>
                      {getStepVisualStatus('auditoria').icon} {getStepVisualStatus('auditoria').label}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT AREA: ACTIVE DYNAMIC SCREEN STEP DETAILS */}
            <div className="xl:col-span-8 space-y-6">

              {/* STEP 1: PROCURACAO CLIENT AUTOPACK */}
              {activeStepTab === 'procuracao' && (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">Etapa 1 de 4</span>
                      <h3 className="text-base font-black text-gray-900">Procuração Jurídica Ad Judicia</h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">
                        Prepara e gera automaticamente sob preenchimento dinâmico de placeholders fáticos a Procuração via Google Docs.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {procuracaoStatus === 'criada' ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">Gerado</span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">Pendente</span>
                      )}
                    </div>
                  </div>

                  {/* CHECKLIST AUTOMATICO */}
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block font-mono">Checklist Automático</span>
                    <div className="space-y-1.5 text-xs text-gray-700 font-semibold">
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-500" size={15} />
                        <span>Procuração solicitada faticamente</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={procuracaoStatus === 'criada'} readOnly className="rounded border-gray-200 text-indigo-600 focus:ring-0" />
                        <span className={procuracaoStatus === 'criada' ? 'line-through text-gray-400' : ''}>Procuração gerada no Google Docs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={procuracaoStatus === 'criada' && !!procuracaoGoogleDocsId} readOnly className="rounded border-gray-200 text-indigo-600 focus:ring-0" />
                        <span className={procuracaoStatus === 'criada' && !!procuracaoGoogleDocsId ? 'line-through text-gray-400' : ''}>Procuração anexada à pasta do cliente</span>
                      </div>
                    </div>
                  </div>

                  {/* GENERATOR SIMULATOR FRAMEWORK */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Acionar Automação</span>
                      <button
                        type="button"
                        onClick={() => triggerAutomation('Procuração', 'aguardando')}
                        className="w-full py-3 px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-805 text-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={14} className="animate-spin text-indigo-600" style={{ animationDuration: '8s' }} />
                        <span>Gerar Procuração (001)</span>
                      </button>

                      {/* SIMULATION CHOOSERS */}
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                        <span className="text-[9px] font-mono uppercase text-gray-400 block">Provedor de Resposta (MOCK DE BACKEND)</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => triggerAutomation('Procuração', 'criada')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex-1"
                          >
                            Simular Sucesso
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerAutomation('Procuração', 'falha')}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex-1"
                          >
                            Simular Falha
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">Google Docs URL</span>
                        {procuracaoGoogleDocsUrl ? (
                          <a href={procuracaoGoogleDocsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline break-all block p-2 bg-indigo-50/50 rounded-lg">
                            {procuracaoGoogleDocsUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic block">Documento pendente de criação</span>
                        )}
                      </div>

                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">ID do Documento</span>
                        <span className="font-mono text-[11px] block text-gray-700">{procuracaoGoogleDocsId || 'N/A'}</span>
                      </div>

                      {procuracaoLogFalha && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] font-bold">
                          <span className="block text-[9px] text-rose-400 uppercase font-mono">Log de Falha fático</span>
                          {procuracaoLogFalha}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CUSTAS E DECLARACAO DE POBREZA CONTAINER */}
              {activeStepTab === 'custas' && (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">Etapa 2 de 4</span>
                      <h3 className="text-base font-black text-gray-900">Custas Processuais ou Declaração de Pobreza</h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">
                        Defina se o cliente irá arcar com as custas do tribunal ou necessita de declaração judicial de pobreza/insuficiência de fundos.
                      </p>
                    </div>
                  </div>

                  {/* DECISION BOOLEAN QUESTION */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <span className="text-xs font-black text-gray-800 uppercase block tracking-tight">Pergunta Estrutural Operacional</span>
                    <p className="text-xs text-gray-500 leading-normal"><strong>Deseja recolher custas judiciais para esta ação?</strong></p>
                    
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleRecolherCustas(true)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 border ${
                          desejaRecolherCustas 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        SIM, Recolher Guia de Custas
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRecolherCustas(false)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 border ${
                          !desejaRecolherCustas 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        NÃO, Gerar Declaração de Hipossuficiência
                      </button>
                    </div>
                  </div>

                  {/* BRANCH 1: RECOLHER CUSTAS (SIM) */}
                  {desejaRecolherCustas ? (
                    <div className="space-y-4 animate-in fade-in duration-250">
                      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-xs flex gap-3 items-start">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5 animate-pulse" size={18} />
                        <div>
                          <span className="font-extrabold uppercase text-[10px] block mb-1">⚠️ ATENÇÃO: NECESSÁRIO RECOLHER GUIA DE CUSTAS</span>
                          <p className="leading-relaxed font-semibold">
                            Com base na triagem operacional, o cliente requisitou o recolhimento de guia de custas. O sistema não necessita da automação de declaração de pobreza.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                        <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">Checklist de Custas Operacionais</span>
                        <div className="space-y-1.5 text-xs text-gray-750 font-semibold">
                          <div className="flex items-center gap-2">
                            <Check className="text-emerald-500" size={15} />
                            <span>Guia de custas necessária configurada</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={guiaCustasStatus === 'aprovado'} readOnly className="rounded border-gray-200 text-indigo-600" />
                            <span>Guia de custas homologada / paga</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200 space-y-1.5">
                          <span className="text-[9px] font-mono text-gray-400 uppercase">Simular status de guia de custas</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleUpdateGuiaStatus('pendente')} className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer">Pendente</button>
                            <button type="button" onClick={() => handleUpdateGuiaStatus('aprovado')} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer">Paga / Homologada</button>
                            <button type="button" onClick={() => handleUpdateGuiaStatus('rejeitado')} className="bg-rose-100 hover:bg-rose-200 text-rose-900 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer">Rejeitada</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* BRANCH 2: NAO RECOLHER CUSTAS (DECLARAÇÃO DE POBREZA) */
                    <div className="space-y-4 animate-in fade-in duration-250">
                      <div className="p-4 border border-indigo-100 bg-indigo-50/50 rounded-2xl flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
                          <HardDrive size={20} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-gray-900">Automação de Declaração de Hipossuficiência</h4>
                          <p className="text-[11px] text-gray-500 leading-relaxed font-semibold mt-0.5">
                            Gera automaticamente sob preenchimento dinâmico de placeholders fáticos a Declaração de Pobreza jurídica.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block font-mono">Checklist de Automação</span>
                        <div className="space-y-1.5 text-xs text-gray-700 font-semibold">
                          <div className="flex items-center gap-2">
                            <Check className="text-emerald-500" size={15} />
                            <span>Declaração de hipossuficiência solicitada</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={declaracaoPobrezaStatus === 'criada'} readOnly className="rounded border-gray-200 text-indigo-600 focus:ring-0" />
                            <span>Declaração gerada via Google Docs</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={declaracaoPobrezaStatus === 'criada' && !!declaracaoPobrezaGoogleDocsId} readOnly className="rounded border-gray-200 text-indigo-600 focus:ring-0" />
                            <span>Declaração anexada à pasta de destino GDrive</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Acionar Automação</span>
                          <button
                            type="button"
                            onClick={() => triggerAutomation('Declaração de Pobreza', 'aguardando')}
                            className="w-full py-3 px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-805 text-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw size={14} className="animate-spin text-indigo-600" style={{ animationDuration: '8s' }} />
                            <span>Gerar Declaração de Pobreza (002)</span>
                          </button>

                          {/* SIMULATION CHOOSERS */}
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-205 space-y-2">
                            <span className="text-[9px] font-mono uppercase text-gray-400 block">Provedor de Resposta (MOCK DE BACKEND)</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => triggerAutomation('Declaração de Pobreza', 'criada')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex-1"
                              >
                                Simular Sucesso
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerAutomation('Declaração de Pobreza', 'falha')}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex-1"
                              >
                                Simular Falha
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">Google Docs URL</span>
                            {declaracaoPobrezaGoogleDocsUrl ? (
                              <a href={declaracaoPobrezaGoogleDocsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline break-all block p-2 bg-indigo-50/50 rounded-lg">
                                {declaracaoPobrezaGoogleDocsUrl}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic block">Documento pendente de criação</span>
                            )}
                          </div>

                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">ID do Documento</span>
                            <span className="font-mono text-[11px] block text-gray-700">{declaracaoPobrezaGoogleDocsId || 'N/A'}</span>
                          </div>

                          {declaracaoPobrezaLogFalha && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] font-bold">
                              <span className="block text-[9px] text-rose-400 uppercase font-mono">Log de Falha fático</span>
                              {declaracaoPobrezaLogFalha}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: CONTRATO DE HONORARIOS DOCUMENT */}
              {activeStepTab === 'contrato' && (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">Etapa 3 de 4</span>
                      <h3 className="text-base font-black text-gray-900">Contrato de Prestação de Serviços & Honorários Advocatícios</h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">
                        Prepara e gera automaticamente sob preenchimento dinâmico de clausulas fáticas e honorárias o Contrato via Google Docs.
                      </p>
                    </div>
                  </div>

                  {/* CHECKLIST AUTOMATICO */}
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block font-mono">Checklist de Automação</span>
                    <div className="space-y-1.5 text-xs text-gray-700 font-semibold">
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-500" size={15} />
                        <span>Contrato de honorários solicitado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={contratoHonorariosStatus === 'criada'} readOnly className="rounded border-gray-200 text-indigo-600 focus:ring-0" />
                        <span>Contrato gerado no Google Docs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={contratoHonorariosStatus === 'criada' && !!contratoHonorariosGoogleDocsId} readOnly className="rounded border-gray-200 text-indigo-600 focus:ring-0" />
                        <span>Contrato anexador à pasta GDrive do cliente</span>
                      </div>
                    </div>
                  </div>

                  {/* GENERATOR SIMULATOR FRAMEWORK */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Acionar Automação</span>
                      <button
                        type="button"
                        onClick={() => triggerAutomation('Contrato de Honorários', 'aguardando')}
                        className="w-full py-3 px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-805 text-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={14} className="animate-spin text-indigo-600" style={{ animationDuration: '8s' }} />
                        <span>Gerar Contrato de Honorários (003)</span>
                      </button>

                      {/* SIMULATION CHOOSERS */}
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                        <span className="text-[9px] font-mono uppercase text-gray-400 block">Provedor de Resposta (MOCK DE BACKEND)</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => triggerAutomation('Contrato de Honorários', 'criada')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex-1"
                          >
                            Simular Sucesso
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerAutomation('Contrato de Honorários', 'falha')}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex-1"
                          >
                            Simular Falha
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">Google Docs URL</span>
                        {contratoHonorariosGoogleDocsUrl ? (
                          <a href={contratoHonorariosGoogleDocsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline break-all block p-2 bg-indigo-50/50 rounded-lg">
                            {contratoHonorariosGoogleDocsUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic block">Documento pendente de criação</span>
                        )}
                      </div>

                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">ID do Documento</span>
                        <span className="font-mono text-[11px] block text-gray-700">{contratoHonorariosGoogleDocsId || 'N/A'}</span>
                      </div>

                      {contratoHonorariosLogFalha && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] font-bold">
                          <span className="block text-[9px] text-rose-400 uppercase font-mono">Log de Falha fático</span>
                          {contratoHonorariosLogFalha}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: SOLICITACAO DE PROVAS WORKSPACE */}
              {activeStepTab === 'checklist_provas' && (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100 bg-white p-6 rounded-3xl border border-gray-150">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">Etapa 4 de 5</span>
                      <h3 className="text-base font-black text-gray-900">Solicitação de Provas & Triagem de Documentação</h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">
                        Defina prazos e formatos para que o cliente submeta os comprovantes fáticos fundamentais para o sucesso da petição.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: GUIDELINES AND REQUESTS */}
                    <div className="xl:col-span-7 space-y-6">
                      
                      {/* 1. GOOGLE DRIVE DIRECTORY LINK STATUS */}
                      <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 font-mono block">Pasta Operacional Google Drive</span>
                        {hasDriveFolder ? (
                          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 text-emerald-950 font-bold">
                              <HardDrive className="text-emerald-500 animate-pulse" size={16} />
                              <span>Diretório Conectado Ativo</span>
                            </div>
                            <a
                              href={driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 font-extrabold text-[10px] text-white rounded-lg hover:bg-emerald-700 transition"
                            >
                              Abrir Pasta GDrive
                            </a>
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-xs space-y-2 font-bold shadow-xs">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="text-amber-500 animate-pulse" size={16} />
                              <span className="font-extrabold uppercase tracking-tight text-[11px]">Pasta Google Drive Ausente</span>
                            </div>
                            <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
                              Pasta Google Drive do cliente ainda não configurada no cadastro. Crie o diretório remoto antes de disparar as automações de documentos.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 2. PF/PJ CLIENT MANDATORY DOCUMENTS CHECKLIST */}
                      <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono block">Documentação Mínima Mandatória</span>
                          <span className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-black border border-indigo-150 uppercase">
                            Regime {client?.type || (client?.pjDadosEmpresa ? 'PJ' : 'PF')}
                          </span>
                        </div>

                        {/* RENDER DYNAMIC COMPLIANCE CHECKS */}
                        <div className="space-y-4">
                          {/* Office Automated Docs checklist items */}
                          <div>
                            <span className="text-[9px] uppercase font-black tracking-widest text-indigo-600 block mb-2 font-mono">I. Documentos Gerados no Escritório</span>
                            <div className="space-y-2 text-xs font-semibold text-gray-750">
                              <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-transparent">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className={procuracaoStatus === 'criada' ? 'text-emerald-500' : 'text-gray-300'} size={15} />
                                  <span>Doc. 01 - Procuração Ad Judicia</span>
                                </div>
                                <span className="text-[9px] font-bold text-gray-405">{procuracaoStatus === 'criada' ? 'Gerada' : 'Pendente'}</span>
                              </div>

                              <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-transparent">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className={(desejaRecolherCustas ? guiaCustasStatus === 'aprovado' : declaracaoPobrezaStatus === 'criada') ? 'text-emerald-500' : 'text-gray-300'} size={15} />
                                  <span>Doc. 02 - {desejaRecolherCustas ? 'Alerta de Guia de Custas' : 'Declaração de Pobreza'}</span>
                                </div>
                                <span className="text-[9px] font-bold text-gray-405">
                                  {desejaRecolherCustas ? (guiaCustasStatus === 'aprovado' ? 'Paga' : 'Pendente') : (declaracaoPobrezaStatus === 'criada' ? 'Gerada' : 'Pendente')}
                                </span>
                              </div>

                              <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-transparent">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className={contratoHonorariosStatus === 'criada' ? 'text-emerald-500' : 'text-gray-300'} size={15} />
                                  <span className="font-bold text-gray-900 font-mono tracking-tight text-xs">Doc. $$$ - Contrato de Honorários</span>
                                </div>
                                <span className="text-[9px] font-bold text-gray-405">{contratoHonorariosStatus === 'criada' ? 'Gerado' : 'Pendente'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Client Mandatory physical docs checklist items */}
                          <div>
                            <span className="text-[9px] uppercase font-black tracking-widest text-indigo-600 block mb-2 font-mono">II. Documentos de Identificação do Cliente</span>
                            <div className="space-y-2 text-xs font-semibold text-gray-750">
                              {!(client?.type === 'PJ' || !!client?.pjDadosEmpresa) ? (
                                <>
                                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-transparent">
                                    <FileCheck2 className="text-gray-450 text-indigo-500" size={15} />
                                    <span>DOCUMENTO DE IDENTIFICAÇÃO (R.G., CNH, Carteira OAB/Similares) com CPF</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-transparent">
                                    <FileCheck2 className="text-gray-450 text-indigo-500" size={15} />
                                    <span>COMPROVANTE DE RESIDÊNCIA emitido nos últimos 90 dias (água, luz, telefone)</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-transparent">
                                    <FileCheck2 className="text-gray-450 text-indigo-500" size={15} />
                                    <span>CONTRATO SOCIAL / ESTATUTO SOCIAL devidamente registrado + alterações</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-transparent">
                                    <FileCheck2 className="text-gray-450 text-indigo-500" size={15} />
                                    <span>CARTÃO CNPJ ATIVO atualizado impresso da Receita Federal</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-transparent">
                                    <FileCheck2 className="text-gray-450 text-indigo-500" size={15} />
                                    <span>DOCUMENTO DE IDENTIFICAÇÃO DOS SÓCIOS ADMINISTRADORES</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-transparent">
                                    <FileCheck2 className="text-gray-450 text-indigo-500" size={15} />
                                    <span>COMPROVANTE DE ENDEREÇO COMERCIAL DA EMPRESA</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. CURRENT SCHEDULLED CUSTOM PROOFS */}
                      <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono block">Provas e Documentos Sob Agendamento ({customRequests.length})</span>
                        {customRequests.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Nenhum pedido de prova complementar agendado ainda.</p>
                        ) : (
                          <div className="space-y-3">
                            {customRequests.map((req, idx) => (
                              <div key={req.id} className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 font-bold font-mono text-[9px] bg-indigo-100 text-indigo-805 rounded uppercase">
                                      {req.documentNumber || `Doc. ${String(idx + 3).padStart(2, '0')}`}
                                    </span>
                                    <span className="text-xs font-extrabold text-gray-900">{req.title}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 font-semibold line-clamp-2 max-w-[400px]">{req.description}</p>
                                  <div className="flex gap-2 text-[9px] font-bold text-gray-400 font-mono">
                                    <span>Prazo: {req.dueDate ? new Date(req.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                                    <span>•</span>
                                    <span className="uppercase text-indigo-600">{req.expectedFileTypes?.join(', ')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => handleEditInit(req)}
                                    className="p-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                                    title="Editar"
                                  >
                                    <Edit2 size={11} className="text-indigo-600" />
                                    <span>Alt.</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusUpdate(req.id, 'arquivado')}
                                    className="p-1.5 bg-white border border-gray-200 hover:bg-rose-50 rounded-lg text-rose-600 cursor-pointer"
                                    title="Arquivar/Apagar"
                                  >
                                    <Archive size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* RIGHT COLUMN: ACTION SCHEDULER FORM */}
                    <div className="xl:col-span-5">
                      <form onSubmit={handleSubmitForm} className="bg-white border border-gray-150 rounded-3xl p-5 space-y-4 shadow-sm sticky top-4">
                        
                        {/* CALCULATED DOCUMENT NUMBER HEADER */}
                        <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-950 rounded-2xl text-center space-y-0.5">
                          <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider font-mono block">Próximo Documento</span>
                          <span className="text-sm font-black font-mono block text-indigo-900">
                            {editingId ? `Editando: ${formDocNumber || 'Sem Doc'}` : (formDocNumber || 'Calculando...')}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Título da Reclamação / Prova *</label>
                          <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="Ex: Contrato de Empréstimo sob Juros Abusivos"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Identificador / Número do Documento *</label>
                          <input
                            type="text"
                            value={formDocNumber}
                            onChange={(e) => setFormDocNumber(e.target.value)}
                            placeholder="Ex: Doc. 03"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-semibold outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Instruções Técnicas e Orientação *</label>
                          <textarea
                            rows={3}
                            value={formDesc}
                            onChange={(e) => setFormDesc(e.target.value)}
                            placeholder="Ex: Baixe o arquivo PDF completo direto do internet banking com os juros..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-semibold outline-none resize-none leading-relaxed"
                          />
                        </div>

                        {/* DEADLINE WITH 7 DAYS CHECKBOX INTAKE */}
                        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-150 space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Prazo limite</label>
                            <input
                              type="date"
                              disabled={useDefaultDeadline}
                              value={formDueDate}
                              onChange={(e) => setFormDueDate(e.target.value)}
                              className={`w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none ${useDefaultDeadline ? 'bg-gray-150 text-gray-500' : 'bg-white text-gray-800'}`}
                            />
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={useDefaultDeadline}
                              onChange={(e) => setUseDefaultDeadline(e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-0"
                            />
                            <span>Usar prazo padrão de 7 dias</span>
                          </label>
                        </div>

                        {/* ALLOW UPLOAD CONTROL */}
                        <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold text-gray-750">
                          <span>Permitir upload no portal do cliente?</span>
                          <input
                            type="checkbox"
                            checked={formAllowUpload}
                            onChange={(e) => setFormAllowUpload(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </div>

                        {/* FORMATS WITH REMOVAL OF MAXFILES */}
                        {formAllowUpload && (
                          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs space-y-1.5 font-semibold text-gray-750">
                            <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-mono">Formatos Compatíveis (Max. 1 arquivo)</span>
                            <div className="flex flex-col gap-1.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={typePdf} onChange={(e) => setTypePdf(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-0" />
                                <span>PDF Padrão PJe</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={typeAudio} onChange={(e) => setTypeAudio(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-0" />
                                <span>Mídia de Áudio compatível</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={typeVideo} onChange={(e) => setTypeVideo(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-0" />
                                <span>Mídia de Vídeo compatível</span>
                              </label>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold text-gray-750">
                          <span>Visível no portal externo?</span>
                          <input
                            type="checkbox"
                            checked={formVisible}
                            onChange={(e) => setFormVisible(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </div>

                        {editingId && (
                          <div className="p-3 bg-indigo-50/20 border border-indigo-150 rounded-xl space-y-2 text-xs">
                            <span className="text-[9px] font-black uppercase text-indigo-700 block font-mono">Dados da Auditoria Técnica</span>
                            <div className="space-y-1">
                              <label className="block text-gray-500 text-[10px]">Resultado / Status</label>
                              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)} className="w-full p-1 border rounded bg-white font-semibold">
                                <option value="pendente">Pendente</option>
                                <option value="enviado">Submetido</option>
                                <option value="em_analise">Em Análise</option>
                                <option value="aprovado">Aprovado</option>
                                <option value="rejeitado">Rejeitado</option>
                                <option value="complemento_solicitado">Requer Complemento</option>
                                <option value="arquivado">Arquivado</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-gray-500 text-[10px]">Feedback Técnico / Justificativa</label>
                              <textarea value={formAnalysisNotes} onChange={(e) => setFormAnalysisNotes(e.target.value)} className="w-full p-2 border rounded bg-white text-xs" rows={2} />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {editingId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setFormTitle('');
                                setFormDesc('');
                                setFormDocNumber('');
                              }}
                              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-750 text-xs font-bold rounded-xl flex-1 border border-gray-250 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-2.5 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <span>{editingId ? 'Salvar Comprovante' : 'Requisitar Prova'}</span>}
                          </button>
                        </div>

                      </form>
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 5: AUDITORIA DE PROVAS ENTREGUES */}
              {activeStepTab === 'auditoria' && (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-6">
                  
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block">Etapa 5 de 5 • Concorrência Auditoria</span>
                      <h3 className="text-base font-black text-gray-900">Auditoria Física, Digitalização e Upload de Prontuários</h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed font-semibold">
                        Aproveite este painel de compliance para acompanhar a recepção dos originais, conferência técnica no tribunal de arquivos digitalizados, e publicação no Drive do cliente.
                      </p>
                    </div>
                  </div>

                  {/* METRICS HEADERS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5 text-center">
                      <span className="text-[9px] font-mono text-gray-400 font-extrabold uppercase">Total no Prontuário</span>
                      <span className="text-base font-black text-indigo-950 block">{3 + customRequests.length} docs</span>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1.5 text-center">
                      <span className="text-[9px] font-mono text-emerald-600 font-extrabold uppercase">Auditados & Seguros</span>
                      <span className="text-base font-black text-emerald-950 block">
                        {
                          [
                            auditData['procuracao'],
                            auditData['custas_processuais'],
                            auditData['contrato_honorarios'],
                            ...(customRequests.map(r => auditData[r.id]))
                          ].filter(v => v?.delivered && v?.digitized && v?.uploaded).length
                        } docs
                      </span>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-1.5 text-center">
                      <span className="text-[9px] font-mono text-amber-600 font-extrabold uppercase">Diligências Pendentes</span>
                      <span className="text-base font-black text-amber-955 block">
                        {
                          (3 + customRequests.length) - [
                            auditData['procuracao'],
                            auditData['custas_processuais'],
                            auditData['contrato_honorarios'],
                            ...(customRequests.map(r => auditData[r.id]))
                          ].filter(v => v?.delivered && v?.digitized && v?.uploaded).length
                        } pendências
                      </span>
                    </div>
                  </div>

                  {/* MAIN AUDIT INTERACTIVE GRID TABLE */}
                  <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white">
                    <div className="grid grid-cols-12 bg-gray-50 p-3.5 border-b border-gray-150 text-[10px] font-black uppercase text-gray-400 font-mono tracking-wider gap-2">
                      <span className="col-span-2">ID / Ref</span>
                      <span className="col-span-4">Descrição do Comprovante</span>
                      <span className="col-span-2 text-center">I. Coletado</span>
                      <span className="col-span-2 text-center">II. Escaneado</span>
                      <span className="col-span-2 text-center">III. Upload</span>
                    </div>

                    <div className="divide-y divide-gray-150 font-sans text-xs">
                      
                      {/* 1. Procuração */}
                      <div className="grid grid-cols-12 p-3.5 items-center gap-2 hover:bg-gray-50/50">
                        <span className="col-span-2 font-mono font-bold text-gray-450">Doc. 01</span>
                        <div className="col-span-4 space-y-0.5">
                          <span className="font-extrabold text-gray-900 block">Procuração Jurídica Ad Judicia</span>
                          <span className="text-[9px] font-bold text-indigo-600 block uppercase">{procuracaoStatus}</span>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['procuracao']?.delivered || false} onChange={() => handleToggleAudit('procuracao', 'delivered')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['procuracao']?.digitized || false} onChange={() => handleToggleAudit('procuracao', 'digitized')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['procuracao']?.uploaded || false} onChange={() => handleToggleAudit('procuracao', 'uploaded')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                      </div>

                      {/* 2. Custas */}
                      <div className="grid grid-cols-12 p-3.5 items-center gap-2 hover:bg-gray-50/50">
                        <span className="col-span-2 font-mono font-bold text-gray-450">Doc. 02</span>
                        <div className="col-span-4 space-y-0.5">
                          <span className="font-extrabold text-gray-900 block">{desejaRecolherCustas ? 'Guia de Custas Judiciais' : 'Declaração de Pobreza / Hipossuficiência'}</span>
                          <span className="text-[9px] font-bold text-indigo-600 block uppercase">{desejaRecolherCustas ? guiaCustasStatus : declaracaoPobrezaStatus}</span>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['custas_processuais']?.delivered || false} onChange={() => handleToggleAudit('custas_processuais', 'delivered')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['custas_processuais']?.digitized || false} onChange={() => handleToggleAudit('custas_processuais', 'digitized')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['custas_processuais']?.uploaded || false} onChange={() => handleToggleAudit('custas_processuais', 'uploaded')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                      </div>

                      {/* 3. Contrato de Honorarios (with strict dynamic $$$-notation visualization) */}
                      <div className="grid grid-cols-12 p-3.5 items-center gap-2 hover:bg-gray-50/50">
                        <span className="col-span-2 font-mono font-black text-gray-900 tracking-wider">Doc. $$$</span>
                        <div className="col-span-4 space-y-0.5">
                          <span className="font-extrabold text-gray-900 block">Contrato de Prestação de Serviços</span>
                          <span className="text-[9px] font-bold text-indigo-600 block uppercase">{contratoHonorariosStatus}</span>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['contrato_honorarios']?.delivered || false} onChange={() => handleToggleAudit('contrato_honorarios', 'delivered')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['contrato_honorarios']?.digitized || false} onChange={() => handleToggleAudit('contrato_honorarios', 'digitized')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input type="checkbox" checked={auditData['contrato_honorarios']?.uploaded || false} onChange={() => handleToggleAudit('contrato_honorarios', 'uploaded')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                        </div>
                      </div>

                      {/* 4. Scheduled Evidence Proof collection */}
                      {customRequests.map((req, idx) => (
                        <div key={req.id} className="grid grid-cols-12 p-3.5 items-center gap-2 hover:bg-gray-50/50">
                          <span className="col-span-2 font-mono font-bold text-gray-450">{req.documentNumber || `Doc. ${String(idx + 3).padStart(2, '0')}`}</span>
                          <div className="col-span-4 space-y-0.5">
                            <span className="font-extrabold text-gray-900 block truncate">{req.title}</span>
                            <span className="text-[9px] font-bold text-indigo-605 block uppercase text-indigo-650">{req.status}</span>
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input type="checkbox" checked={auditData[req.id]?.delivered || false} onChange={() => handleToggleAudit(req.id, 'delivered')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input type="checkbox" checked={auditData[req.id]?.digitized || false} onChange={() => handleToggleAudit(req.id, 'digitized')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input type="checkbox" checked={auditData[req.id]?.uploaded || false} onChange={() => handleToggleAudit(req.id, 'uploaded')} className="rounded border-gray-300 text-emerald-600 w-4 h-4 cursor-pointer focus:ring-0" />
                          </div>
                        </div>
                      ))}

                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50/50 rounded-2xl flex items-start gap-3.5 text-xs">
                    <CheckCircle className="text-indigo-600 mt-0.5 shrink-0 animate-pulse" size={16} />
                    <p className="leading-relaxed font-semibold text-gray-800">
                      As alterações efetuadas nas caixas de auditoria acima são registradas <strong>imediatamente e de modo seguro</strong> no Firestore sob o nó <code>auditData</code> deste caso, garantindo integridade das métricas do escritório em tempo-real.
                    </p>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* BOTTOM CONTROLS STAGE BAR */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.tipoServico(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-6 py-3 rounded-xl font-bold text-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            Voltar para Tipo de Serviço
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 px-6 py-3 rounded-xl font-bold text-xs hover:bg-gray-150 cursor-pointer"
            >
              <Save size={14} />
              Salvar e Sair
            </button>
            
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAndAdvance}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-950 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold text-xs cursor-pointer shadow-md"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <span>Salvar e Avançar</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
