import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Info,
  ShieldCheck,
  FileCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Calendar,
  Layers,
  Loader2,
  HardDrive,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  Eye,
  Activity,
  Award,
  ChevronRight,
  CheckSquare,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface ExtendedProtocolData {
  protocolResponsible: string;
  expectedProtocolDate: string;
  actualProtocolDate: string;
  protocolSystem: string;
  protocolStatus: 'nao_preparado' | 'aguardando_revisao' | 'pronto_para_protocolar' | 'agendado' | 'protocolado' | 'devolvido' | 'cancelado';
  processNumber: string;
  protocolReceiptName: string;
  protocolReceiptUrl: string;
  googleDriveFileId: string;
  googleDrivePrepared: boolean;
  notes: string;
  convertedToJudicialCase: boolean;
  completedAt: string;
  updatedAt: string;

  // Step 1.9.1 fields
  clientsList: string[];
  exAdversosList: string[];
  subject: string;
  court: string;
  comarca: string;

  // Step 1.9.2 Perícia fields
  periciaMarked: boolean;
  periciaDate: string;
  periciaTime: string;
  periciaLocal: string;
  periciaPerito: string;
  periciaType: 'presencial' | 'online';
  periciaEscritorioComparecer: boolean;

  // Step 1.9.3 Prazo fields
  prazoMarked: boolean;
  prazoQual: string;
  prazoFatal: string;
  prazoResponsavel: string;
  prazoSeguranca: string;
  prazoDependeClienteInfo: boolean;
  prazoQualInfo: string;
  prazoDependeClienteProva: boolean;
  prazoQualProva: string;

  // Step 1.9.4 Audiência fields
  audienciaMarked: boolean;
  audienciaDate: string;
  audienciaTime: string;
  audienciaLocal: string;
  audienciaJuizo: string;
  audienciaType: 'presencial' | 'online';
  audienciaPlatform: string;
  audienciaPlatformType: 'zoom' | 'webex' | 'gmeet' | 'teams' | 'outro';
  audienciaLink: string;
  audienciaClienteAvisado: boolean;

  // Step 1.9.5 Contrato fields
  contratoCriado: boolean;
  contratoValorTotal: string;
  contratoParcelas: string;
  contratoVencimentoDia: string;
  contratoAssinado: boolean;

  // Step 1.9.6 Andamento fields
  andamentoConferido: boolean;
  andamentoResumo: string;

  // Step 1.9.7 Controladoria fields
  controladoriaMigrado: boolean;
  controladoriaData: string;
  controladoriaResponsavel: string;
}

const DEFAULT_PROTOCOL: ExtendedProtocolData = {
  protocolResponsible: '',
  expectedProtocolDate: '',
  actualProtocolDate: '',
  protocolSystem: '',
  protocolStatus: 'nao_preparado',
  processNumber: '',
  protocolReceiptName: '',
  protocolReceiptUrl: '',
  googleDriveFileId: '',
  googleDrivePrepared: false,
  notes: '',
  convertedToJudicialCase: false,
  completedAt: '',
  updatedAt: '',

  clientsList: [],
  exAdversosList: [],
  subject: '',
  court: '',
  comarca: '',

  periciaMarked: false,
  periciaDate: '',
  periciaTime: '',
  periciaLocal: '',
  periciaPerito: '',
  periciaType: 'presencial',
  periciaEscritorioComparecer: false,

  prazoMarked: false,
  prazoQual: '',
  prazoFatal: '',
  prazoResponsavel: '',
  prazoSeguranca: '',
  prazoDependeClienteInfo: false,
  prazoQualInfo: '',
  prazoDependeClienteProva: false,
  prazoQualProva: '',

  audienciaMarked: false,
  audienciaDate: '',
  audienciaTime: '',
  audienciaLocal: '',
  audienciaJuizo: '',
  audienciaType: 'presencial',
  audienciaPlatform: '',
  audienciaPlatformType: 'zoom',
  audienciaLink: '',
  audienciaClienteAvisado: false,

  contratoCriado: false,
  contratoValorTotal: '',
  contratoParcelas: '',
  contratoVencimentoDia: '',
  contratoAssinado: false,

  andamentoConferido: false,
  andamentoResumo: '',

  controladoriaMigrado: false,
  controladoriaData: '',
  controladoriaResponsavel: ''
};

// CNJ Format: 0000000-00.0000.0.00.0000 (20 digits)
function formatCNJ(value: string) {
  const clean = value.replace(/\D/g, '').substring(0, 20);
  if (clean.length === 0) return '';
  
  let formatted = '';
  const n = clean.substring(0, 7);
  formatted = n;
  if (clean.length > 7) {
    const d = clean.substring(7, 9);
    formatted += '-' + d;
  }
  if (clean.length > 9) {
    const a = clean.substring(9, 13);
    formatted += '.' + a;
  }
  if (clean.length > 13) {
    const j = clean.substring(13, 14);
    formatted += '.' + j;
  }
  if (clean.length > 14) {
    const tr = clean.substring(14, 16);
    formatted += '.' + tr;
  }
  if (clean.length > 16) {
    const o = clean.substring(16, 20);
    formatted += '.' + o;
  }
  return formatted;
}

export default function ProtocoloFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [protocol, setProtocol] = useState<ExtendedProtocolData>(DEFAULT_PROTOCOL);

  const [activeSubetapa, setActiveSubetapa] = useState(1);

  // Additional Inline State for Client & Ex-Adverso lists
  const [newClientInput, setNewClientInput] = useState('');
  const [newExAdversoInput, setNewExAdversoInput] = useState('');
  const [copiedFormula, setCopiedFormula] = useState(false);

  // Validation
  const isCNJValid = (value: string) => {
    return value.replace(/\D/g, '').length === 20;
  };

  useEffect(() => {
    if (!caseId) return;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const caseRef = doc(db, 'cases', caseId!);
        const caseSnap = await getDoc(caseRef);

        if (!caseSnap.exists()) {
          setError(`Caso de ID [${caseId}] não encontrado.`);
          setLoading(false);
          return;
        }

        const cData = caseSnap.data();
        setCaseObj(cData);

        let resolvedPrimaryClient = 'Cliente';
        if (cData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', cData.clientId));
          if (clientSnap.exists()) {
            const cliData = clientSnap.data();
            setClient(cliData);
            resolvedPrimaryClient = cliData.type === 'PF'
              ? (cliData.pfDadosPessoais?.pf_nomeCompleto || cliData.pfData?.pf_nomeCompleto || 'Cliente')
              : (cliData.pjDadosEmpresa?.pj_razaoSocial || cliData.pjData?.pj_razaoSocial || 'Cliente');
          }
        }

        const rawProtocol = cData.protocol || {};
        
        // Auto pull clientsList and pre-populate if empty
        let loadedClientsList = rawProtocol.clientsList || [];
        if (!Array.isArray(loadedClientsList) || loadedClientsList.length === 0) {
          loadedClientsList = [resolvedPrimaryClient];
        }

        // Auto pull defendant from EDRP structuring when empty
        let loadedExAdversosList = rawProtocol.exAdversosList || [];
        if (!Array.isArray(loadedExAdversosList) || loadedExAdversosList.length === 0) {
          const edrpDef = cData.edrp?.structuring?.defendant || {};
          let resolvedDefName = '';
          if (edrpDef.type === 'PF') {
            resolvedDefName = edrpDef.pf_nomeCompleto || '';
          } else if (edrpDef.type === 'PJ') {
            resolvedDefName = edrpDef.pj_razaoSocial || '';
          }
          if (!resolvedDefName && cData.opposingParty) {
            resolvedDefName = cData.opposingParty;
          }
          if (resolvedDefName) {
            loadedExAdversosList = [resolvedDefName];
          }
        }

        const resolvedSubject = rawProtocol.subject || cData.subject || cData.edrp?.structuring?.notes || '';
        const resolvedCourt = rawProtocol.court || cData.court || cData.edrp?.structuring?.competence || '';
        const resolvedComarca = rawProtocol.comarca || cData.comarca || cData.edrp?.structuring?.comarca || '';

        const merged: ExtendedProtocolData = {
          protocolResponsible: rawProtocol.protocolResponsible || '',
          expectedProtocolDate: rawProtocol.expectedProtocolDate || '',
          actualProtocolDate: rawProtocol.actualProtocolDate || '',
          protocolSystem: rawProtocol.protocolSystem || '',
          protocolStatus: rawProtocol.protocolStatus || 'nao_preparado',
          processNumber: rawProtocol.processNumber || '',
          protocolReceiptName: rawProtocol.protocolReceiptName || '',
          protocolReceiptUrl: rawProtocol.protocolReceiptUrl || '',
          googleDriveFileId: rawProtocol.googleDriveFileId || '',
          googleDrivePrepared: rawProtocol.googleDrivePrepared || false,
          notes: rawProtocol.notes || '',
          convertedToJudicialCase: rawProtocol.convertedToJudicialCase || false,
          completedAt: rawProtocol.completedAt || '',
          updatedAt: rawProtocol.updatedAt ?? '',

          clientsList: loadedClientsList,
          exAdversosList: loadedExAdversosList,
          subject: resolvedSubject,
          court: resolvedCourt,
          comarca: resolvedComarca,

          periciaMarked: rawProtocol.periciaMarked ?? false,
          periciaDate: rawProtocol.periciaDate || '',
          periciaTime: rawProtocol.periciaTime || '',
          periciaLocal: rawProtocol.periciaLocal || '',
          periciaPerito: rawProtocol.periciaPerito || '',
          periciaType: rawProtocol.periciaType || 'presencial',
          periciaEscritorioComparecer: rawProtocol.periciaEscritorioComparecer ?? false,

          prazoMarked: rawProtocol.prazoMarked ?? false,
          prazoQual: rawProtocol.prazoQual || '',
          prazoFatal: rawProtocol.prazoFatal || '',
          prazoResponsavel: rawProtocol.prazoResponsavel || '',
          prazoSeguranca: rawProtocol.prazoSeguranca || '',
          prazoDependeClienteInfo: rawProtocol.prazoDependeClienteInfo ?? false,
          prazoQualInfo: rawProtocol.prazoQualInfo || '',
          prazoDependeClienteProva: rawProtocol.prazoDependeClienteProva ?? false,
          prazoQualProva: rawProtocol.prazoQualProva || '',

          audienciaMarked: rawProtocol.audienciaMarked ?? false,
          audienciaDate: rawProtocol.audienciaDate || '',
          audienciaTime: rawProtocol.audienciaTime || '',
          audienciaLocal: rawProtocol.audienciaLocal || '',
          audienciaJuizo: rawProtocol.audienciaJuizo || '',
          audienciaType: rawProtocol.audienciaType || 'presencial',
          audienciaPlatform: rawProtocol.audienciaPlatform || '',
          audienciaPlatformType: rawProtocol.audienciaPlatformType || 'zoom',
          audienciaLink: rawProtocol.audienciaLink || '',
          audienciaClienteAvisado: rawProtocol.audienciaClienteAvisado ?? false,

          contratoCriado: rawProtocol.contratoCriado ?? false,
          contratoValorTotal: rawProtocol.contratoValorTotal || '',
          contratoParcelas: rawProtocol.contratoParcelas || '',
          contratoVencimentoDia: rawProtocol.contratoVencimentoDia || '',
          contratoAssinado: rawProtocol.contratoAssinado ?? false,

          andamentoConferido: rawProtocol.andamentoConferido ?? false,
          andamentoResumo: rawProtocol.andamentoResumo || '',

          controladoriaMigrado: rawProtocol.controladoriaMigrado ?? false,
          controladoriaData: rawProtocol.controladoriaData || '',
          controladoriaResponsavel: rawProtocol.controladoriaResponsavel || ''
        };

        setProtocol(merged);
      } catch (err: any) {
        console.error(err);
        setError(`Erro ao buscar dados do protocolo: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  const handleSyncFromStructuring = () => {
    if (!caseObj) return;

    const primaryClient = client
      ? (client.type === 'PF'
          ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || '')
          : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || ''))
      : '';

    const edrpDef = caseObj.edrp?.structuring?.defendant || {};
    let resolvedDefName = '';
    if (edrpDef.type === 'PF') {
      resolvedDefName = edrpDef.pf_nomeCompleto || '';
    } else if (edrpDef.type === 'PJ') {
      resolvedDefName = edrpDef.pj_razaoSocial || '';
    }
    if (!resolvedDefName && caseObj.opposingParty) {
      resolvedDefName = caseObj.opposingParty;
    }

    const resolvedSubject = caseObj.subject || caseObj.edrp?.structuring?.notes || '';
    const resolvedCourt = caseObj.court || caseObj.edrp?.structuring?.competence || '';
    const resolvedComarca = caseObj.comarca || caseObj.edrp?.structuring?.comarca || '';

    setProtocol((prev) => ({
      ...prev,
      clientsList: prev.clientsList.length === 0 && primaryClient ? [primaryClient] : prev.clientsList,
      exAdversosList: prev.exAdversosList.length === 0 && resolvedDefName ? [resolvedDefName] : prev.exAdversosList,
      subject: prev.subject || resolvedSubject,
      court: prev.court || resolvedCourt,
      comarca: prev.comarca || resolvedComarca
    }));

    setSuccess('Sincronizados com sucesso os dados de Autor, Ré, Assunto, Vara e Comarca definidos na estruturação!');
  };

  const handleChange = (field: keyof ExtendedProtocolData, value: any) => {
    setProtocol((prev) => {
      let val = value;
      if (field === 'processNumber') {
        val = formatCNJ(value);
      }
      return { ...prev, [field]: val };
    });
  };

  // Helper lists handlers
  const handleAddClient = () => {
    if (!newClientInput.trim()) return;
    setProtocol((prev) => ({
      ...prev,
      clientsList: [...prev.clientsList, newClientInput.trim()]
    }));
    setNewClientInput('');
  };

  const handleRemoveClient = (index: number) => {
    setProtocol((prev) => ({
      ...prev,
      clientsList: prev.clientsList.filter((_, idx) => idx !== index)
    }));
  };

  const handleAddExAdverso = () => {
    if (!newExAdversoInput.trim()) return;
    setProtocol((prev) => ({
      ...prev,
      exAdversosList: [...prev.exAdversosList, newExAdversoInput.trim()]
    }));
    setNewExAdversoInput('');
  };

  const handleRemoveExAdverso = (index: number) => {
    setProtocol((prev) => ({
      ...prev,
      exAdversosList: prev.exAdversosList.filter((_, idx) => idx !== index)
    }));
  };

  // Formula generator
  const generatedTodoistFormula = `[${protocol.clientsList.join(' & ')}] x [${protocol.exAdversosList.join(' & ')}] - [${protocol.subject || 'Assunto'}] - [${protocol.processNumber || 'Sem CNJ'}] - [${protocol.court || 'Sem Vara'}] - [${protocol.comarca || 'Sem Comarca'}]`;

  const copyTodoistFormula = () => {
    navigator.clipboard.writeText(generatedTodoistFormula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  const handleSave = async (silent = false, action: 'none' | 'exit' | 'advance' = 'none') => {
    if (!caseId) return false;
    setSaving(true);
    setError(null);
    if (!silent) setSuccess(null);

    // CRITICAL: Prevent progress or save validation if CNJ has not been filled out with exactly 20 digits.
    if (!isCNJValid(protocol.processNumber)) {
      setError('🚨 O número do processo (CNJ) é obrigatório e de preenchimento obrigatório com exatamente 20 dígitos.');
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    try {
      const now = new Date().toISOString();

      const updatedProtocol: ExtendedProtocolData = {
        ...protocol,
        completedAt: protocol.protocolStatus === 'protocolado' ? (protocol.completedAt || now) : '',
        updatedAt: now
      };

      const payload: any = {
        protocol: updatedProtocol,
        processNumber: protocol.processNumber,
        updatedAt: now
      };

      // Handle transition rules
      const isInitialField = caseObj?.registrationTypeKey === 'peticao_inicial';
      if (isInitialField && protocol.protocolStatus === 'protocolado') {
        updatedProtocol.convertedToJudicialCase = true;
        payload.registrationTypeKey = 'processo_judicial_ajuizado';
        payload.registrationType = 'Processo Judicial Ajuizado';
        payload.actionCategory = 'judicial';
        payload.statusPublicoCliente = `Processo nº ${protocol.processNumber}`;
        payload.statusInterno = 'Protocolado';
        payload.caseLifecycle = 'caso';
      }

      if (action === 'advance') {
        payload.productionStage = 'controladoria';
        payload.statusInterno = 'Em controladoria';
      } else {
        payload.statusInterno = protocol.protocolStatus === 'protocolado' ? 'Protocolado' : (caseObj?.statusInterno || 'Aguardando protocolo');
      }

      await updateDoc(doc(db, 'cases', caseId!), payload);

      setCaseObj((prev: any) => ({
        ...prev,
        ...payload,
        protocol: updatedProtocol
      }));

      if (!silent) {
        setSuccess('Etapa 1.9 Protocolo e Distribuição salva de forma exemplar no Connect!');
      }

      if (action === 'exit') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      } else if (action === 'advance') {
        navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/compliance`);
      }

      return true;
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar protocolo: ${err.message || err}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Protocolo / Distribuição" caseId={caseId}>
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-gray-900" size={28} />
          <span className="text-xs font-bold font-mono tracking-wide uppercase">
            Carregando Sincronizador de Protocolo...
          </span>
        </div>
      </FluxoStepLayout>
    );
  }

  const resolvedClientName = client
    ? (client.type === 'PF'
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Sem Nome')
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Razão Social Ausente'))
    : 'Buscando Cliente...';

  const resolvedClientSlug = client?.slug || 'sem-slug';

  return (
    <FluxoStepLayout
      stepName="Protocolo"
      caseId={caseId}
      statusText={caseObj?.statusInterno || 'Aguardando protocolo'}
    >
      <div className="space-y-8 font-sans">
        
        {/* Alerts & Errors */}
        {error && (
          <div className="p-5 bg-red-50 border border-red-150 rounded-2xl text-red-955 text-xs flex gap-3 items-center shadow-xs">
            <AlertCircle size={18} className="text-red-650 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-5 bg-emerald-50 border border-emerald-150 rounded-2xl text-emerald-950 text-xs flex gap-3 items-center shadow-xs">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold leading-relaxed">{success}</span>
          </div>
        )}

        {/* DETAILS PANEL */}
        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md font-mono">
                {resolvedClientSlug}
              </span>
              <h4 className="text-sm font-extrabold text-gray-900 leading-tight">
                {resolvedClientName}
              </h4>
              <p className="text-[11px] text-gray-450 font-medium">
                Caso vinculado: <strong className="text-gray-700 font-mono">{caseId}</strong> • Tipo Original: <strong className="text-indigo-600">{caseObj?.registrationType || 'Não Definido'}</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSyncFromStructuring}
                className="text-[10px] font-bold px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-750 hover:bg-indigo-100/80 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Layers size={13} />
                Sincronizar Estruturação
              </button>
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl border border-gray-150 bg-white text-gray-700 flex items-center">
                Fase do Caso: {caseObj?.productionStage || 'protocolo'}
              </span>
            </div>
          </div>
        </div>

        {/* METRICS / DIGITAL CASE FILE DISPLAY */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-950 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="text-indigo-400" size={18} />
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-300">Resumo do Protocolo Cadastrado</h4>
              <p className="text-[9.5px] text-slate-400">Esta é a mesma informação oficial fática que aparecerá no setor de Controladoria e de Auditoria.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wider">Autor da Ação</span>
              <p className="font-bold text-slate-100 break-words">
                {protocol.clientsList.length > 0 ? protocol.clientsList.join(' & ') : <span className="text-slate-500 italic">Vazio fático</span>}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wider">Parte Ré / Ex-Adverso</span>
              <p className="font-bold text-slate-100 break-words">
                {protocol.exAdversosList.length > 0 ? protocol.exAdversosList.join(' & ') : <span className="text-slate-500 italic">Vazio fático</span>}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wider">Assunto Principal</span>
              <p className="font-bold text-slate-100 break-words">
                {protocol.subject || <span className="text-slate-500 italic">Preencher na Subetapa 1</span>}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wider">Vara / Órgão do Tribunal</span>
              <p className="font-bold text-slate-100 break-words">
                {protocol.court || <span className="text-slate-500 italic">Preencher na Subetapa 1</span>}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wider">Comarca de Jurisdição</span>
              <p className="font-bold text-slate-100 break-words">
                {protocol.comarca || <span className="text-slate-500 italic">Preencher na Subetapa 1</span>}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-rose-400 font-bold block uppercase tracking-wider">Distribuição (Número CNJ)</span>
              <p className="font-mono font-bold text-rose-100">
                {protocol.processNumber || <span className="text-slate-500 italic">Preenchimento obrigatório</span>}
              </p>
            </div>
          </div>
        </div>

        {/* SUBETAPA CONTAINER SYSTEM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Side navigation matching professional UX */}
          <div className="lg:col-span-4 bg-white border border-gray-150 rounded-3xl p-4.5 space-y-2">
            <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400 px-3.5 pb-2.5 border-b border-gray-100/60 mb-2">Subetapas do Protocolo</span>
            
            {[
              { id: 1, title: '1. Cadastrar Protocolo', desc: 'Dados do processo / CNJ', icon: FileText },
              { id: 2, title: '2. Perícia Marcada?', desc: 'Laudos e exames fáticos', icon: Activity },
              { id: 3, title: '3. Prazo em Aberto?', desc: 'Prazos processuais', icon: Clock },
              { id: 4, title: '4. Audiência Marcada?', desc: 'Ritos virtuais ou físicos', icon: Calendar },
              { id: 5, title: '5. Conferir Andamento', desc: 'Certidão recente de trâmite', icon: FileCheck },
            ].map((sub) => {
              const isActive = activeSubetapa === sub.id;
              
              // Helper complete logic
              let isComplete = false;
              if (sub.id === 1) {
                isComplete = protocol.clientsList.length > 0 && isCNJValid(protocol.processNumber);
              } else if (sub.id === 2) {
                isComplete = !protocol.periciaMarked || (protocol.periciaMarked && !!protocol.periciaDate);
              } else if (sub.id === 3) {
                isComplete = !protocol.prazoMarked || (protocol.prazoMarked && !!protocol.prazoFatal);
              } else if (sub.id === 4) {
                isComplete = !protocol.audienciaMarked || (protocol.audienciaMarked && !!protocol.audienciaDate);
              } else if (sub.id === 5) {
                isComplete = !protocol.andamentoConferido || (protocol.andamentoConferido && !!protocol.andamentoResumo);
              }

              const IconComponent = sub.icon;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveSubetapa(sub.id)}
                  className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3.5 transition-all text-xs font-semibold cursor-pointer border ${
                    isActive
                      ? 'bg-slate-900 border-slate-950 text-white shadow-sm'
                      : 'bg-white border-transparent hover:border-gray-150 text-gray-700'
                  }`}
                >
                  <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border ${
                    isActive 
                      ? 'bg-slate-800 border-slate-700 text-indigo-300' 
                      : isComplete 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                        : 'bg-gray-50 border-gray-150 text-gray-500'
                  }`}>
                    {isComplete ? <CheckSquare size={13} /> : <IconComponent size={14} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={`block font-black uppercase text-[10px] tracking-tight leading-tight ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {sub.title}
                    </span>
                    <span className={`block font-medium text-[9.5px] mt-0.5 truncate ${isActive ? 'text-slate-400' : 'text-gray-400'}`}>
                      {sub.desc}
                    </span>
                  </div>

                  {isComplete && !isActive && (
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active section block */}
          <div className="lg:col-span-8 space-y-6">

                       {activeSubetapa === 1 && (
              <div className="border border-gray-150 rounded-3xl p-6 space-y-6 bg-white shadow-3xs animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                      01
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Subetapa 1 — Cadastrar Protocolo</h3>
                      <p className="text-[10.5px] text-gray-400">Insira a distribuição judicial para vincular o CNJ e sincronizar os registros.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncFromStructuring}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4.5 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-750 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-3xs"
                  >
                    <RefreshCw size={12} />
                    <span>Puxar Dados Automaticamente</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Autor input */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-550">Relação de Autores / Clientes *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newClientInput}
                        onChange={(e) => setNewClientInput(e.target.value)}
                        placeholder="Adicionar autor"
                        className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleAddClient}
                        className="px-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {protocol.clientsList.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Vazio. Clique em "Puxar Dados Automaticamente".</span>
                      ) : (
                        protocol.clientsList.map((c, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-150 text-indigo-750 text-xs font-bold rounded-xl">
                            <span>{c}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveClient(idx)}
                              className="text-indigo-400 hover:text-indigo-800 font-bold text-[11px] font-sans"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Ré input */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-550">Relação de Réus / Ex-Adversos</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newExAdversoInput}
                        onChange={(e) => setNewExAdversoInput(e.target.value)}
                        placeholder="Adicionar réu / ex-adverso"
                        className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleAddExAdverso}
                        className="px-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {protocol.exAdversosList.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Adicione réus ou clique em "Puxar Dados".</span>
                      ) : (
                        protocol.exAdversosList.map((exa, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-150 text-red-750 text-xs font-bold rounded-xl">
                            <span>{exa}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExAdverso(idx)}
                              className="text-red-400 hover:text-red-800 font-bold text-[11px] font-sans"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Assunto Principal *</label>
                    <input
                      type="text"
                      value={protocol.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                      placeholder="Ex: Concessão de BPC LOAS"
                      className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Vara / Órgão do Tribunal *</label>
                    <input
                      type="text"
                      value={protocol.court}
                      onChange={(e) => handleChange('court', e.target.value)}
                      placeholder="Ex: 5ª Vara Previdenciária Federal"
                      className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Comarca de Jurisdição *</label>
                    <input
                      type="text"
                      value={protocol.comarca}
                      onChange={(e) => handleChange('comarca', e.target.value)}
                      placeholder="Ex: Curitiba - PR"
                      className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-red-500">
                      Número do Processo de Distribuição (CNJ) *
                    </label>
                    {isCNJValid(protocol.processNumber) ? (
                      <span className="text-[9px] text-emerald-600 font-black tracking-widest uppercase font-mono">CNJ Preenchido com 20 dígitos</span>
                    ) : (
                      <span className="text-[9px] text-red-500 font-black tracking-widest uppercase font-mono">Faltam {20 - protocol.processNumber.replace(/\D/g, '').length} dígitos</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={protocol.processNumber}
                    onChange={(e) => handleChange('processNumber', e.target.value)}
                    placeholder="0000000-00.0000.0.00.0000"
                    className={`w-full bg-white border focus:ring-1 rounded-xl px-3.5 py-3 text-xs font-mono font-bold transition-all ${
                      isCNJValid(protocol.processNumber) 
                        ? 'border-emerald-250 focus:border-emerald-600 focus:ring-emerald-600 text-emerald-950' 
                        : 'border-red-250 focus:border-indigo-650 focus:ring-indigo-650'
                    }`}
                  />
                </div>

                {/* VER PROTOCOLO CADASTRADO PREVIEW (exactly same layout shown in controladoria) */}
                {isCNJValid(protocol.processNumber) && (
                  <div className="border border-emerald-150 bg-emerald-50/20 p-5 rounded-2xl space-y-3.5 animate-in slide-in-from-top-3 duration-200">
                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      Visualizar Protocolo Cadastrado
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-700">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-black uppercase">Autor(es) / Clientes</span>
                        <span className="text-gray-900 font-bold">{protocol.clientsList.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block font-black uppercase">Réu(s) / Adversários</span>
                        <span className="text-gray-900 font-bold">{protocol.exAdversosList.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block font-black uppercase">Assunto Definido</span>
                        <span className="text-gray-900 font-bold">{protocol.subject}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block font-black uppercase">Vara / Comarca</span>
                        <span className="text-gray-900 font-bold">{protocol.court} — {protocol.comarca}</span>
                      </div>
                      <div className="sm:col-span-2 p-3 bg-white border border-emerald-100 rounded-xl inline-flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-emerald-600 block font-black uppercase font-sans">Número Único CNJ Distribuído</span>
                          <span className="text-emerald-900 font-mono font-black text-[13px]">{protocol.processNumber}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase bg-emerald-600 text-white px-2.5 py-1 rounded-lg">REGISTRADO</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formula generator copy banner */}
                <div className="bg-slate-900 border border-slate-950 rounded-2xl p-5 text-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono tracking-widest font-black uppercase text-indigo-400 bg-indigo-950/85 px-2 py-0.5 rounded">
                      Fórmula Todoist de Organização Comercial
                    </span>
                    <p className="text-[11px] text-slate-100 font-mono font-bold break-all leading-normal">
                      {generatedTodoistFormula}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyTodoistFormula}
                    className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase bg-slate-800 hover:bg-slate-750 text-white shrink-0 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    {copiedFormula ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedFormula ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUBETAPA 2: IF PERÍCIA MARKED */}
            {activeSubetapa === 2 && (
              <div className="border border-gray-150 rounded-3xl p-6 space-y-6 bg-white shadow-3xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                      02
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Subetapa 2 — Se possui Perícia Marcada?</h3>
                      <p className="text-[10.5px] text-gray-400">Informe se o juiz designou perícia, exame fático ou auditoria judicial.</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 border border-gray-200 p-1.5 rounded-2xl bg-gray-50/50">
                    <button
                      type="button"
                      onClick={() => handleChange('periciaMarked', true)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        protocol.periciaMarked ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('periciaMarked', false)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !protocol.periciaMarked ? 'bg-gray-250 text-gray-800 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {protocol.periciaMarked ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in slide-in-from-top-3 duration-200">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Dia da Perícia</label>
                      <input
                        type="date"
                        value={protocol.periciaDate}
                        onChange={(e) => handleChange('periciaDate', e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Horário</label>
                      <input
                        type="time"
                        value={protocol.periciaTime}
                        onChange={(e) => handleChange('periciaTime', e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Perito Responsável</label>
                      <input
                        type="text"
                        value={protocol.periciaPerito}
                        onChange={(e) => handleChange('periciaPerito', e.target.value)}
                        placeholder="Expert designado pelo juiz"
                        className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-semibold placeholder-gray-300"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Local da Perícia</label>
                      <input
                        type="text"
                        value={protocol.periciaLocal}
                        onChange={(e) => handleChange('periciaLocal', e.target.value)}
                        placeholder="Clínica, IML, ou endereço de vistoria"
                        className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder-gray-300"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Modalidade de Perícia</label>
                      <div className="flex gap-2 border border-gray-150 p-1 rounded-xl bg-gray-50/55 h-[38px] items-center">
                        <button
                          type="button"
                          onClick={() => handleChange('periciaType', 'presencial')}
                          className={`flex-1 text-center text-[11px] font-bold py-1 rounded-lg transition-all cursor-pointer ${
                            protocol.periciaType === 'presencial' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500'
                          }`}
                        >
                          Presencial
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChange('periciaType', 'online')}
                          className={`flex-1 text-center text-[11px] font-bold py-1 rounded-lg transition-all cursor-pointer ${
                            protocol.periciaType === 'online' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500'
                          }`}
                        >
                          Online
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-3 flex items-center gap-3 bg-indigo-50/50 p-3.5 border border-indigo-100 rounded-2xl">
                      <input
                        type="checkbox"
                        id="periciaEscritorioComparecer"
                        checked={protocol.periciaEscritorioComparecer}
                        onChange={(e) => handleChange('periciaEscritorioComparecer', e.target.checked)}
                        className="w-4.5 h-4.5 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer text-indigo-600"
                      />
                      <label htmlFor="periciaEscritorioComparecer" className="text-xs text-indigo-900 font-bold select-none cursor-pointer">
                        O escritório precisa comparecer faticamente para assistir judicialmente o cliente?
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-150 text-gray-500 rounded-2xl text-xs text-center font-semibold">
                    Caso não possui perícia designada faticamente nos autos.
                  </div>
                )}
              </div>
            )}

            {/* SUBETAPA 3: IF DEADLINE OPEN */}
            {activeSubetapa === 3 && (
              <div className="border border-gray-150 rounded-3xl p-6 space-y-6 bg-white shadow-3xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-xs font-sans">
                      03
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Subetapa 3 — Se possui prazo em aberto?</h3>
                      <p className="text-[10.5px] text-gray-400">Insira as obrigações judiciais com dia e hora fatal em aberto.</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 border border-gray-200 p-1.5 rounded-2xl bg-gray-50/50">
                    <button
                      type="button"
                      onClick={() => handleChange('prazoMarked', true)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        protocol.prazoMarked ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('prazoMarked', false)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !protocol.prazoMarked ? 'bg-gray-250 text-gray-800 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {protocol.prazoMarked ? (
                  <div className="space-y-5 animate-in slide-in-from-top-3 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Qual prazo está aberto?</label>
                        <input
                          type="text"
                          value={protocol.prazoQual}
                          onChange={(e) => handleChange('prazoQual', e.target.value)}
                          placeholder="Ex: Réplica, manifestação sobre o laudo fático"
                          className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder-gray-300"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-red-500 font-black">PRAZO FATAL *</label>
                        <input
                          type="date"
                          value={protocol.prazoFatal}
                          onChange={(e) => handleChange('prazoFatal', e.target.value)}
                          className="w-full bg-white border border-red-200 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2 text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Responsável</label>
                        <input
                          type="text"
                          value={protocol.prazoResponsavel}
                          onChange={(e) => handleChange('prazoResponsavel', e.target.value)}
                          placeholder="Dr. Arthur, Mariana..."
                          className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder-gray-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-600 font-bold">PRAZO SEGURANÇA *</label>
                        <input
                          type="date"
                          value={protocol.prazoSeguranca}
                          onChange={(e) => handleChange('prazoSeguranca', e.target.value)}
                          className="w-full bg-white border border-indigo-200 text-indigo-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-bold"
                        />
                      </div>

                      {/* Depends block */}
                      <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 border border-indigo-100 rounded-2xl bg-indigo-50/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">Depende de INFO do cliente?</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleChange('prazoDependeClienteInfo', true)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                  protocol.prazoDependeClienteInfo ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
                                }`}
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChange('prazoDependeClienteInfo', false)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                  !protocol.prazoDependeClienteInfo ? 'bg-gray-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
                                }`}
                              >
                                Não
                              </button>
                            </div>
                          </div>

                          {protocol.prazoDependeClienteInfo && (
                            <div className="space-y-1.5 animate-fadeIn">
                              <input
                                type="text"
                                value={protocol.prazoQualInfo}
                                onChange={(e) => handleChange('prazoQualInfo', e.target.value)}
                                placeholder="Descreva a informação pendente..."
                                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 border border-purple-100 rounded-2xl bg-purple-50/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-purple-950 uppercase tracking-wider">Depende de PROVAS do cliente?</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                  protocol.prazoDependeClienteProva ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
                                }`}
                                onClick={() => handleChange('prazoDependeClienteProva', true)}
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                  !protocol.prazoDependeClienteProva ? 'bg-gray-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
                                }`}
                                onClick={() => handleChange('prazoDependeClienteProva', false)}
                              >
                                Não
                              </button>
                            </div>
                          </div>

                          {protocol.prazoDependeClienteProva && (
                            <div className="space-y-1.5 animate-fadeIn">
                              <input
                                type="text"
                                value={protocol.prazoQualProva}
                                onChange={(e) => handleChange('prazoQualProva', e.target.value)}
                                placeholder="Descreva quais documentos faltam..."
                                className="w-full bg-white border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* VER PRAZO CADASTRADO PREVIEW */}
                    {protocol.prazoFatal && (
                      <div className="border border-indigo-150 bg-indigo-50/20 p-5 rounded-2xl space-y-3 animate-in slide-in-from-top-3 duration-200">
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />
                          Visualizar Prazo Cadastrado
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-700">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-black uppercase">Obrigação Judicial / Descrição</span>
                            <span className="text-gray-900 font-bold">{protocol.prazoQual || "Prazo geral / Manifestação fática"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 block font-black uppercase">Responsável Designado</span>
                            <span className="text-gray-900 font-bold">{protocol.prazoResponsavel || "Não designado"}</span>
                          </div>
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                            <span className="text-[9px] text-red-600 block font-black uppercase">Data Limite Fatal</span>
                            <span className="text-red-900 font-mono font-black text-[13px]">{protocol.prazoFatal}</span>
                          </div>
                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <span className="text-[9px] text-indigo-600 block font-black uppercase">Filtro de Segurança</span>
                            <span className="text-indigo-900 font-mono font-black text-[13px]">{protocol.prazoSeguranca || "Sem margem de segurança"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-150 text-gray-500 rounded-2xl text-xs text-center font-semibold">
                    Caso não possui prazos fatais abertos nos autos judicialmente.
                  </div>
                )}
              </div>
            )}

            {/* SUBETAPA 4: IF AUDIENCIA MARKED */}
            {activeSubetapa === 4 && (
              <div className="border border-gray-150 rounded-3xl p-6 space-y-6 bg-white shadow-3xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                      04
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Subetapa 4 — Se possui audiência marcada?</h3>
                      <p className="text-[10.5px] text-gray-400">Insira a pauta judicial e rito em que o tribunal designou audiência.</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 border border-gray-200 p-1.5 rounded-2xl bg-gray-50/50">
                    <button
                      type="button"
                      onClick={() => handleChange('audienciaMarked', true)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        protocol.audienciaMarked ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('audienciaMarked', false)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !protocol.audienciaMarked ? 'bg-gray-250 text-gray-800 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {protocol.audienciaMarked ? (
                  <div className="space-y-5 animate-in slide-in-from-top-3 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Dia da Audiência</label>
                        <input
                          type="date"
                          value={protocol.audienciaDate}
                          onChange={(e) => handleChange('audienciaDate', e.target.value)}
                          className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Horário da Sessão</label>
                        <input
                          type="time"
                          value={protocol.audienciaTime}
                          onChange={(e) => handleChange('audienciaTime', e.target.value)}
                          className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Vara / Juízo Designado</label>
                        <input
                          type="text"
                          value={protocol.audienciaJuizo}
                          onChange={(e) => handleChange('audienciaJuizo', e.target.value)}
                          placeholder="Ex: Vara de Família de Osasco"
                          className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder-gray-300"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                          {protocol.audienciaType === 'presencial' ? 'Endereço Completo da Audiência *' : 'Local ou Fórum'}
                        </label>
                        <input
                          type="text"
                          value={protocol.audienciaLocal}
                          onChange={(e) => handleChange('audienciaLocal', e.target.value)}
                          placeholder={protocol.audienciaType === 'presencial' ? 'Informe o endereço físico completo da audiência' : 'Rua fática do Fórum ou Tribunal'}
                          className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder-gray-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Modalidade</label>
                        <div className="flex gap-2 border border-gray-150 p-1 rounded-xl bg-gray-50/55 h-[38px] items-center">
                          <button
                            type="button"
                            onClick={() => handleChange('audienciaType', 'presencial')}
                            className={`flex-1 text-center text-[11px] font-bold py-1 rounded-lg transition-all cursor-pointer ${
                              protocol.audienciaType === 'presencial' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500'
                            }`}
                          >
                            Presencial
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChange('audienciaType', 'online')}
                            className={`flex-1 text-center text-[11px] font-bold py-1 rounded-lg transition-all cursor-pointer ${
                              protocol.audienciaType === 'online' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500'
                            }`}
                          >
                            Online
                          </button>
                        </div>
                      </div>

                      {protocol.audienciaType === 'online' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Tipo de Sistema</label>
                            <select
                              value={protocol.audienciaPlatformType}
                              onChange={(e) => handleChange('audienciaPlatformType', e.target.value)}
                              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-bold h-[38px]"
                            >
                              <option value="MEET">MEET</option>
                              <option value="Zoom">Zoom</option>
                              <option value="Microsoft TEAMS">Microsoft TEAMS</option>
                              <option value="Cisco Webex">Cisco Webex</option>
                              <option value="outro">outro (blancket)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Link de Conexão Virtual</label>
                            <input
                              type="text"
                              value={protocol.audienciaLink}
                              onChange={(e) => handleChange('audienciaLink', e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                          </div>
                        </>
                      )}

                      <div className="md:col-span-3 flex items-center gap-3 bg-emerald-50/50 p-3.5 border border-emerald-100 rounded-2xl">
                        <input
                          type="checkbox"
                          id="audienciaClienteAvisado"
                          checked={protocol.audienciaClienteAvisado}
                          onChange={(e) => handleChange('audienciaClienteAvisado', e.target.checked)}
                          className="w-4.5 h-4.5 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer text-indigo-600"
                        />
                        <label htmlFor="audienciaClienteAvisado" className="text-xs text-emerald-950 font-bold select-none cursor-pointer">
                          O cliente foi devidamente avisado faticamente de todos os detalhes desta audiência?
                        </label>
                      </div>
                    </div>

                    {/* VER AUDIÊNCIA MARCADA PREVIEW */}
                    {protocol.audienciaDate && (
                      <div className="border border-violet-150 bg-violet-50/20 p-5 rounded-2xl space-y-3 animate-in slide-in-from-top-3 duration-200">
                        <h4 className="text-xs font-black text-violet-950 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-violet-600 shrink-0" />
                          Visualizar Audiência Marcada
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-700">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-black uppercase">Juízo / Vara Designado</span>
                            <span className="text-gray-900 font-bold">{protocol.audienciaJuizo || "Juízo do caso"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 block font-black uppercase">Data e Horário</span>
                            <span className="text-gray-900 font-black text-violet-950">{protocol.audienciaDate} às {protocol.audienciaTime || '00:00'}</span>
                          </div>
                          <div className={protocol.audienciaType === 'presencial' ? "sm:col-span-2 p-3 bg-violet-50 border border-violet-100 rounded-xl" : "p-3 bg-violet-50 border border-violet-100 rounded-xl"}>
                            <span className="text-[9px] text-violet-600 block font-black uppercase">Modalidade / {protocol.audienciaType === 'presencial' ? 'Endereço Físico' : 'Sistema'}</span>
                            <span className="text-violet-900 font-bold">
                              {protocol.audienciaType === 'presencial' 
                                ? `Presencial - ${protocol.audienciaLocal || 'Não informado'}` 
                                : `Online - Plataforma: ${protocol.audienciaPlatformType || 'Sem plataforma'}`}
                            </span>
                          </div>
                          {protocol.audienciaType === 'online' && (
                            <div className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-[9px] text-gray-400 block font-black uppercase">Sala de Videoconferência</span>
                                {protocol.audienciaLink ? (
                                  <a href={protocol.audienciaLink} target="_blank" rel="noreferrer" className="text-indigo-650 hover:underline inline-flex items-center gap-1 font-bold">
                                    <span>Acessar Sala Virtual</span>
                                    <ExternalLink size={12} className="text-indigo-650" />
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic">Link não inserido</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-150 text-gray-500 rounded-2xl text-xs text-center font-semibold">
                    Caso não possui audiência designada faticamente nos autos.
                  </div>
                )}
              </div>
            )}

            {/* SUBETAPA 5: RECENT UPDATES / ANDAMENTO */}
            {activeSubetapa === 5 && (
              <div className="border border-gray-150 rounded-3xl p-6 space-y-6 bg-white shadow-3xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-xs font-sans">
                      05
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Subetapa 5 — Conferir Andamento Processual</h3>
                      <p className="text-[10.5px] text-gray-400">Verifique nos portais judiciais se houve nova publicação ou andamento relevante.</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 border border-gray-200 p-1.5 rounded-2xl bg-gray-50/50">
                    <button
                      type="button"
                      onClick={() => handleChange('andamentoConferido', true)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        protocol.andamentoConferido ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Conferido
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('andamentoConferido', false)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !protocol.andamentoConferido ? 'bg-gray-250 text-gray-800 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Pendente
                    </button>
                  </div>
                </div>

                {protocol.andamentoConferido ? (
                  <div className="space-y-1.5 animate-in slide-in-from-top-3 duration-200">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Resumo da Última Movimentação Judicial Encontrada</label>
                    <textarea
                      value={protocol.andamentoResumo}
                      onChange={(e) => handleChange('andamentoResumo', e.target.value)}
                      placeholder="Ex: Conclusos para decisão, despachado, expedida intimação..."
                      className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-xs text-gray-800 font-medium placeholder-gray-300 min-h-[90px]"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-150 text-gray-500 rounded-2xl text-xs text-center font-semibold">
                    Certidão de movimentação judicial recente pendente nos autos.
                  </div>
                )}
              </div>
            )}

            {/* Subetapas controller controls: anterior and proxima */}
            <div className="flex justify-between items-center bg-gray-50/70 border border-gray-100 rounded-2xl p-4.5 mt-4">
              <button
                type="button"
                disabled={activeSubetapa === 1}
                onClick={() => setActiveSubetapa((prev) => Math.max(1, prev - 1))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft size={13} />
                Subetapa Anterior
              </button>

              <span className="text-[10px] font-black text-gray-400 uppercase font-mono">
                {activeSubetapa} / 5
              </span>

              <button
                type="button"
                disabled={activeSubetapa === 5}
                onClick={() => setActiveSubetapa((prev) => Math.min(5, prev + 1))}
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-800 hover:text-slate-950 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Próxima Subetapa
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM NAV BAR */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.revisao(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            Voltar para Revisão
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'none')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <Save size={13} />
              {saving ? 'Gravando...' : 'Salvar Protocolo'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'exit')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 hover:bg-gray-50 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              Salvar e Sair
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'advance')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-7 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              <span>Salvar e Avançar</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
