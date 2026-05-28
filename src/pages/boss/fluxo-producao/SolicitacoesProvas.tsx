import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
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
  Eye
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

  // Tab navigation
  const [activeStepTab, setActiveStepTab] = useState<'procuracao' | 'custas' | 'contrato' | 'checklist_provas' | 'provas_customizadas'>('procuracao');

  // Form inputs for Custom Evidence
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [formAllowUpload, setFormAllowUpload] = useState(true);
  const [formMaxFiles, setFormMaxFiles] = useState(5);

  const [typePdf, setTypePdf] = useState(true);
  const [typeAudio, setTypeAudio] = useState(false);
  const [typeVideo, setTypeVideo] = useState(false);

  const [formStatus, setFormStatus] = useState<EvidenceRequest['status']>('pendente');
  const [formAnalysisStatus, setFormAnalysisStatus] = useState('');
  const [formAnalysisNotes, setFormAnalysisNotes] = useState('');

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
      const payload: any = {
        caseId: caseId!,
        clientId: caseObj?.clientId || '',
        clientSlug: clientSlug || '',
        title: formTitle.trim(),
        description: formDesc.trim(),
        dueDate: formDueDate || '',
        visibleToClient: formVisible,
        allowUpload: formAllowUpload,
        expectedFileTypes: expectedTypes,
        maxFiles: Number(formMaxFiles) || 1,
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
      setFormDueDate('');
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
    setFormTitle(req.title);
    setFormDesc(req.description);
    setFormDueDate(req.dueDate || '');
    setFormVisible(req.visibleToClient);
    setFormAllowUpload(req.allowUpload !== false);
    setFormMaxFiles(req.maxFiles || 5);
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
      await updateDoc(doc(db, 'cases', caseId!), {
        productionStage: "solicitacoes-informacoes",
        updatedAt: nowISO,
        desejaRecolherCustas,
        guiaCustasNecessaria,
        guiaCustasStatus,
        procuracaoStatus,
        declaracaoPobrezaStatus,
        contratoHonorariosStatus,
        checklistProvasGoogleDocsStatus
      });
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId!}/solicitacoes-informacoes`);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao avançar de etapa: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStepVisualStatus = (step: 'procuracao' | 'custas' | 'contrato' | 'checklist') => {
    if (step === 'procuracao') {
      if (procuracaoStatus === 'criada') return { icon: '✅', label: 'Concluído', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
      if (procuracaoStatus === 'falha') return { icon: '❌', label: 'Falha', color: 'bg-rose-50 border-rose-200 text-rose-800' };
      if (procuracaoStatus === 'aguardando') return { icon: '⏳', label: 'Aguardando Automação', color: 'bg-amber-50 border-amber-200 text-amber-800' };
      return { icon: '⏳', label: 'Pendente', color: 'bg-gray-50 border-gray-200 text-gray-700' };
    }
    if (step === 'custas') {
      if (desejaRecolherCustas) {
        if (guiaCustasStatus === 'aprovado') return { icon: '✅', label: 'Custas Pagas', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
        if (guiaCustasStatus === 'rejeitado') return { icon: '❌', label: 'Guia Rejeitada', color: 'bg-rose-50 border-rose-200 text-rose-800' };
        return { icon: '⏳', label: 'Aguardando Guia', color: 'bg-amber-50 border-amber-200 text-amber-800' };
      } else {
        if (declaracaoPobrezaStatus === 'criada') return { icon: '✅', label: 'Dec. Criada', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
        if (declaracaoPobrezaStatus === 'falha') return { icon: '❌', label: 'Falha Dec.', color: 'bg-rose-50 border-rose-200 text-rose-800' };
        if (declaracaoPobrezaStatus === 'aguardando') return { icon: '⏳', label: 'Aguardando Automação', color: 'bg-amber-50 border-amber-200 text-amber-800' };
        return { icon: '⏳', label: 'Pendente', color: 'bg-gray-50 border-gray-200 text-gray-700' };
      }
    }
    if (step === 'contrato') {
      if (contratoHonorariosStatus === 'criada') return { icon: '✅', label: 'Concluído', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
      if (contratoHonorariosStatus === 'falha') return { icon: '❌', label: 'Falha', color: 'bg-rose-50 border-rose-200 text-rose-800' };
      if (contratoHonorariosStatus === 'aguardando') return { icon: '⏳', label: 'Aguardando Automação', color: 'bg-amber-50 border-amber-200 text-amber-800' };
      return { icon: '⏳', label: 'Pendente', color: 'bg-gray-50 border-gray-200 text-gray-700' };
    }
    if (step === 'checklist') {
      if (checklistProvasGoogleDocsStatus === 'criada') return { icon: '✅', label: 'Gerado Docs', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
      if (checklistProvasGoogleDocsStatus === 'falha') return { icon: '❌', label: 'Falha', color: 'bg-rose-50 border-rose-200 text-rose-800' };
      if (checklistProvasGoogleDocsStatus === 'aguardando') return { icon: '⏳', label: 'Aguardando Automação', color: 'bg-amber-50 border-amber-200 text-amber-800' };
      return { icon: '⏳', label: 'Não Criado', color: 'bg-gray-50 border-gray-200 text-gray-700' };
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
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono block">Estrutura Visual de 4 Etapas</span>
                
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
                    <span>4. Checklist no Google Docs</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-inherit font-mono font-black uppercase">
                      {getStepVisualStatus('checklist').icon}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStepTab('provas_customizadas')}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex justify-between items-center transition-all border-dashed border border-indigo-200 ${
                      activeStepTab === 'provas_customizadas' ? 'bg-indigo-600 text-white' : 'bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    <span>Fichário de Provas Fáticas ({customRequests.length})</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-200 text-indigo-900 rounded font-mono font-black">EXTRA</span>
                  </button>
                </div>
              </div>

              {/* CHECKLIST VISUAL GERAL CARD */}
              <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 font-sans border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <FileCheck2 size={16} className="text-indigo-600" />
                  <span>Resumo do Checklist Geral</span>
                </h4>

                <div className="space-y-2">
                  {/* Item 1 */}
                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-700">1. Procuração</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('procuracao').color}`}>
                      {getStepVisualStatus('procuracao').icon} {getStepVisualStatus('procuracao').label}
                    </span>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-700">2. Custas / Declaração</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('custas').color}`}>
                      {getStepVisualStatus('custas').icon} {getStepVisualStatus('custas').label}
                    </span>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-700">3. Contrato de Honorários</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('contrato').color}`}>
                      {getStepVisualStatus('contrato').icon} {getStepVisualStatus('contrato').label}
                    </span>
                  </div>

                  {/* Item 4 */}
                  <div className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-700">4. Checklist de Provas</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStepVisualStatus('checklist').color}`}>
                      {getStepVisualStatus('checklist').icon} {getStepVisualStatus('checklist').label}
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

              {/* STEP 4: CHECKLIST OF PROOFS IN GOOGLE DOCS AUTOMATION */}
              {activeStepTab === 'checklist_provas' && (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">Etapa 4 de 4</span>
                      <h3 className="text-base font-black text-gray-900">Documento de Checklist de Provas Solicitadas</h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">
                        Gera automaticamente um arquivo formatado no Google Docs dentro da pasta do cliente com o checklist atualizado de todas as provas solicitadas nesta tela.
                      </p>
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Acionar Automação</span>
                      <button
                        type="button"
                        onClick={() => triggerAutomation('Checklist de Provas', 'aguardando')}
                        className="w-full py-3 px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-805 text-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={14} className="animate-spin text-indigo-600" style={{ animationDuration: '8s' }} />
                        <span>Gerar Checklist de Provas (004)</span>
                      </button>

                      {/* SIMULATION CHOOSERS */}
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                        <span className="text-[9px] font-mono uppercase text-gray-400 block">Provedor de Resposta (MOCK DE BACKEND)</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => triggerAutomation('Checklist de Provas', 'criada')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex-1"
                          >
                            Simular Sucesso
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerAutomation('Checklist de Provas', 'falha')}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex-1"
                          >
                            Simular Falha
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">Status do Checklist</span>
                        {checklistProvasGoogleDocsStatus === 'criada' ? (
                          <span className="px-2 py-1 inline-block text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-250 rounded font-mono">Checklist Sincronizado</span>
                        ) : (
                          <span className="px-2 py-1 inline-block text-[10px] font-bold bg-amber-50 text-amber-805 border border-amber-250 rounded font-mono">Pendente de Atualização</span>
                        )}
                      </div>

                      {checklistProvasUpdatedAt && (
                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">Última Sincronização</span>
                          <span className="font-semibold text-gray-800">{new Date(checklistProvasUpdatedAt).toLocaleString('pt-BR')}</span>
                        </div>
                      )}

                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold font-mono">Google Docs URL</span>
                        {checklistProvasGoogleDocsUrl ? (
                          <a href={checklistProvasGoogleDocsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline break-all block p-2 bg-indigo-50/50 rounded-lg">
                            {checklistProvasGoogleDocsUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic block">Checklist pendente de compilação</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LIST ALL EVIDENCE REQUESTED TO BE EXPORTED */}
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-3.5 border border-gray-150">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono block">Provas a exportar no Google Docs ({customRequests.length})</span>
                    
                    {customRequests.length === 0 ? (
                      <p className="text-xs text-gray-400 leading-normal italic">Nenhuma prova fática adicional requisitada até o momento.</p>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {customRequests.map((req, idx) => (
                          <div key={req.id} className="py-2 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-gray-800">{idx + 1}. {req.title}</span>
                              <p className="text-[11px] text-gray-400 font-medium truncate max-w-[450px]">{req.description}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {req.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: PROVAS CUSTOMIZADAS EXTRA MANAGER */}
              {activeStepTab === 'provas_customizadas' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT AREA: REQS TABLE */}
                    <div className="md:col-span-7 space-y-4">
                      
                      <div className="flex justify-between items-center bg-white border border-gray-150 p-4 rounded-3xl">
                        <div>
                          <h4 className="text-xs font-black uppercase text-gray-800 font-mono block">Provas Customizadas Cadastradas ({customRequests.length})</h4>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Clique em editar para gerenciar formatos e visibilidade técnica.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRefreshToggle(p => p + 1)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                          <RefreshCw size={14} className={loadingRequests ? 'animate-spin' : ''} />
                        </button>
                      </div>

                      {customRequests.length === 0 ? (
                        <div className="p-10 border-2 border-dashed border-gray-150 rounded-3xl text-center text-gray-400 flex flex-col items-center justify-center bg-white/50">
                          <FolderOpen size={32} className="text-gray-300 mb-2" />
                          <span className="text-xs font-semibold">Fichário vazio</span>
                          <p className="text-[10px] text-gray-400 max-w-xs mt-1">Requisite comprovantes fáticos adicionais do cliente no formulário ao lado.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customRequests.map((req) => (
                            <div key={req.id} className={`p-4 bg-white border rounded-2xl space-y-3 transition-all ${editingId === req.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-150 hover:border-gray-200'}`}>
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <h5 className="text-xs font-extrabold text-gray-900">{req.title}</h5>
                                  <p className="text-[11px] text-gray-500 max-w-sm leading-relaxed">{req.description}</p>
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {req.expectedFileTypes?.map((fmt) => (
                                      <span key={fmt} className="text-[8px] font-black uppercase text-blue-850 text-blue-800 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 font-mono">
                                        {fmt}
                                      </span>
                                    ))}
                                    <span className="text-[8px] font-black text-gray-500 bg-gray-50 px-1 py-0.5 rounded border border-gray-100 font-mono">
                                      {req.maxFiles} arq. max
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <RequestStatusBadge status={req.status} />
                                  <RequestVisibilityBadge visible={req.visibleToClient} />
                                </div>
                              </div>

                              {req.clientObservation && (
                                <div className="p-2.5 bg-gray-50 border border-gray-105 rounded-xl text-[11px] font-semibold text-gray-700">
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Resp. Cliente:</span>
                                  “{req.clientObservation}”
                                </div>
                              )}

                              {(req.bossAnalysisStatus || req.bossAnalysisNotes) && (
                                <div className="p-2.5 bg-indigo-50/20 border border-indigo-100/30 rounded-xl text-[11px] space-y-0.5">
                                  <span className="text-[8px] font-black text-indigo-700 uppercase tracking-wider">Anotações da Auditoria</span>
                                  {req.bossAnalysisNotes && <p className="italic text-gray-600">“{req.bossAnalysisNotes}”</p>}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 gap-2">
                                <span className="text-[9px] text-gray-405 font-mono">
                                  Criado em: {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                                </span>

                                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                  {req.status !== 'aprovado' && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusUpdate(req.id, 'aprovado', 'aprovado')}
                                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-transparent rounded-lg cursor-pointer transition-colors"
                                    >
                                      Aprovar
                                    </button>
                                  )}
                                  {req.status !== 'rejeitado' && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusUpdate(req.id, 'rejeitado', 'rejeitado')}
                                      className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-800 border border-transparent rounded-lg cursor-pointer transition-colors"
                                    >
                                      Rejeitar
                                    </button>
                                  )}
                                  {req.status !== 'arquivado' && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusUpdate(req.id, 'arquivado')}
                                      className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-transparent rounded-lg cursor-pointer transition-colors flex items-center gap-0.5"
                                    >
                                      <Archive size={9} />
                                      <span>Arquivar</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleEditInit(req)}
                                    className="p-1 hover:bg-gray-150 border border-gray-200 rounded text-gray-600 cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* RIGHT AREA: FORM EDITOR INTAKE */}
                    <form onSubmit={handleSubmitForm} className="md:col-span-5 bg-white border border-gray-150 rounded-3xl p-5 space-y-3.5 shadow-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <h4 className="text-xs font-black uppercase text-gray-600 tracking-wider font-mono">
                          {editingId ? 'Editar Prova' : 'Agendar Pedido de Prova'}
                        </h4>
                        {editingId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setFormTitle('');
                              setFormDesc('');
                              setFormDueDate('');
                            }}
                            className="text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded"
                          >
                            Novo
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Título da Reclamação / Prova *</label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="Ex: Extrato bancário de empréstimos"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Instruções Técnicas e Orientação *</label>
                        <textarea
                          rows={3}
                          value={formDesc}
                          onChange={(e) => setFormDesc(e.target.value)}
                          placeholder="Ex: Escaneie o arquivo completo retroativo a 3 meses..."
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Prazo limite</label>
                          <input
                            type="date"
                            value={formDueDate}
                            onChange={(e) => setFormDueDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white text-xs font-semibold rounded-xl outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-400 block font-mono">Max arquivos</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={formMaxFiles}
                            onChange={(e) => setFormMaxFiles(Number(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white text-xs font-bold rounded-xl outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* ALLOW UPLOAD SWITCH */}
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-semibold">
                        <div>
                          <span className="block text-gray-700">Permitir upload no portal?</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={formAllowUpload}
                          onChange={(e) => setFormAllowUpload(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </div>

                      {/* FORMAT CHECKBOXES */}
                      {formAllowUpload && (
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] space-y-1.5 font-semibold text-gray-750">
                          <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-mono">Formatos Compatíveis</span>
                          <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={typePdf} onChange={(e) => setTypePdf(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
                              <span>PDF Padrão PJe</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={typeAudio} onChange={(e) => setTypeAudio(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
                              <span>Mídia de Áudio</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={typeVideo} onChange={(e) => setTypeVideo(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
                              <span>Mídia de Vídeo</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* VISIBLE SWITCH */}
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-semibold">
                        <div>
                          <span className="block text-gray-700">Visível no portal do cliente?</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={formVisible}
                          onChange={(e) => setFormVisible(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </div>

                      {editingId && (
                        <div className="p-3 bg-indigo-50/20 border border-indigo-150 rounded-xl space-y-2 text-[11px]">
                          <span className="text-[9px] font-black uppercase text-indigo-780 block font-mono">Dados da Auditoria Técnica</span>
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
                            <textarea value={formAnalysisNotes} onChange={(e) => setFormAnalysisNotes(e.target.value)} className="w-full p-2 border rounded bg-white" rows={2} />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-2.5 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <span>{editingId ? 'Salvar Alteração' : 'Criar Pedido de Prova'}</span>}
                      </button>
                    </form>

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
