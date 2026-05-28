import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Info, 
  FileText, 
  Calendar, 
  HelpCircle, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Building,
  User,
  Activity,
  UserCheck,
  Scale,
  DollarSign
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

// helper for CNJ process masking
function formatCNJ(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 20);
  if (clean.length === 0) return '';
  let formatted = '';
  // Format: 1234567-89.2023.8.26.0100
  if (clean.length <= 7) {
    formatted = clean;
  } else if (clean.length <= 9) {
    formatted = `${clean.slice(0, 7)}-${clean.slice(7)}`;
  } else if (clean.length <= 13) {
    formatted = `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9)}`;
  } else if (clean.length <= 14) {
    formatted = `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13)}`;
  } else if (clean.length <= 16) {
    formatted = `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14)}`;
  } else {
    formatted = `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14, 16)}.${clean.slice(16, 20)}`;
  }
  return formatted;
}

const resolveRegistrationTypeKey = (key: string, label: string): string => {
  if (key) return key;
  const normalized = (label || '').toLowerCase().trim();
  if (normalized.includes('inicial')) return 'peticao_inicial';
  if (normalized.includes('requerimento') || normalized.includes('adm')) return 'requerimento_administrativo';
  if (normalized.includes('extrajudicial')) return 'extrajudicial';
  if (normalized.includes('andamento')) return 'processo_judicial_em_andamento';
  if (normalized.includes('ajuizado')) return 'processo_judicial_ajuizado';
  return 'peticao_inicial';
};

export default function DadosCaso() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  // Root screen state
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Associated raw loaded documents
  const [client, setClient] = useState<any>(null);
  const [caseObj, setCaseObj] = useState<any>(null);

  // Core inputs
  const [title, setTitle] = useState('');
  const [adverseParty, setAdverseParty] = useState('');
  const [caseType, setCaseType] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [responsibleLawyer, setResponsibleLawyer] = useState('');
  const [tribunal, setTribunal] = useState('');
  const [court, setCourt] = useState('');
  const [district, setDistrict] = useState('');
  const [processNumber, setProcessNumber] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [statusInterno, setStatusInterno] = useState('Em produção');
  const [statusPublicoCliente, setStatusPublicoCliente] = useState('');

  // Flag tracking if customer has manually tailored public status input box
  const [isPublicStatusManuallyEdited, setIsPublicStatusManuallyEdited] = useState(false);

  // Group 1: peticao_inicial specific fields
  const [pretendedActionName, setPretendedActionName] = useState('');
  const [pretendedJurisdiction, setPretendedJurisdiction] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');

  // Group 2: requerimento_administrativo specific fields
  const [administrativeBody, setAdministrativeBody] = useState('');
  const [requirementType, setRequirementType] = useState('');

  // Group 3: extrajudicial specific fields
  const [negotiationType, setNegotiationType] = useState('');
  const [recipientName, setRecipientName] = useState('');

  // Group 4: Audiência scheduler conditional block
  const [audienciaAgendada, setAudienciaAgendada] = useState(false);
  const [audienciaData, setAudienciaData] = useState('');
  const [audienciaHora, setAudienciaHora] = useState('');
  const [audienciaLocalOuLink, setAudienciaLocalOuLink] = useState('');
  const [audienciaResponsavel, setAudienciaResponsavel] = useState('');
  const [audienciaObservacoes, setAudienciaObservacoes] = useState('');

  const statusInternoOptions = [
    'Em produção',
    'Em estruturação',
    'Delegado',
    'Aguardando revisão',
    'Em revisão',
    'Aprovado para protocolo',
    'Aguardando protocolo',
    'Protocolado',
    'Em controladoria',
    'Consolidado',
    'Com pendência',
    'Arquivado'
  ];

  const statusPublicoSuggestions = [
    'Aguardando distribuição',
    'Requerimento pendente',
    'Tratativa extrajudicial pendente',
    'Aguardando documentos',
    'Audiência agendada',
    'Perícia agendada',
    'Processo nº [CNJ]',
    'Em acompanhamento',
    'Arquivado'
  ];

  useEffect(() => {
    if (!caseId) {
      setError('Identificador do caso ausente na URL.');
      setFetching(false);
      return;
    }

    async function loadResources() {
      try {
        const caseSnap = await getDoc(doc(db, 'cases', caseId!));
        if (!caseSnap.exists()) {
          setError(`Caso referenciado por ID [${caseId}] não existe no banco de dados.`);
          setFetching(false);
          return;
        }

        const data = caseSnap.data();
        setCaseObj(data);

        // Map core states
        setTitle(data.title || '');
        setAdverseParty(data.adverseParty || '');
        setCaseType(data.caseType || '');
        setDescription(data.description || '');
        setPriority(data.priority || 'media');
        setResponsibleLawyer(data.responsibleLawyer || '');
        setTribunal(data.tribunal || '');
        setCourt(data.court || data.vara || '');
        setDistrict(data.district || data.comarca || '');
        setProcessNumber(data.processNumber ? formatCNJ(data.processNumber) : '');
        setVisibleToClient(data.visibleToClient !== false);
        setStatusInterno(data.statusInterno || 'Em produção');
        setStatusPublicoCliente(data.statusPublicoCliente || '');

        if (data.statusPublicoCliente) {
          setIsPublicStatusManuallyEdited(true);
        }

        // Map conditional states
        setPretendedActionName(data.pretendedActionName || '');
        setPretendedJurisdiction(data.pretendedJurisdiction || '');
        setEstimatedValue(data.estimatedValue || '');
        setAdministrativeBody(data.administrativeBody || '');
        setRequirementType(data.requirementType || '');
        setNegotiationType(data.negotiationType || '');
        setRecipientName(data.recipientName || '');

        // Map audience states
        setAudienciaAgendada(data.audienciaAgendada || false);
        setAudienciaData(data.audienciaData || '');
        setAudienciaHora(data.audienciaHora || '');
        setAudienciaLocalOuLink(data.audienciaLocalOuLink || '');
        setAudienciaResponsavel(data.audienciaResponsavel || '');
        setAudienciaObservacoes(data.audienciaObservacoes || '');

        // Attempt reading client
        if (data.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', data.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erro crítico ao carregar registros remotos: ${err.message || err}`);
      } finally {
        setFetching(false);
      }
    }

    loadResources();
  }, [caseId]);

  const activeRegKey = resolveRegistrationTypeKey(caseObj?.registrationTypeKey, caseObj?.registrationType);

  const handleCnjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatCNJ(rawVal);
    setProcessNumber(formatted);

    // Auto update statusPublicoCliente unless manually handled
    const isJudicial = activeRegKey === 'processo_judicial_em_andamento' || activeRegKey === 'processo_judicial_ajuizado';
    if (isJudicial && !isPublicStatusManuallyEdited) {
      if (formatted.trim()) {
        setStatusPublicoCliente(`Processo nº ${formatted}`);
      } else {
        setStatusPublicoCliente('Aguardando número do processo');
      }
    }
  };

  const handlePublicStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusPublicoCliente(e.target.value);
    setIsPublicStatusManuallyEdited(true);
  };

  const selectSuggestion = (text: string) => {
    setError(null);
    if (text === 'Processo nº [CNJ]') {
      if (processNumber.trim()) {
        setStatusPublicoCliente(`Processo nº ${processNumber}`);
      } else {
        setStatusPublicoCliente('Processo nº ');
      }
    } else {
      setStatusPublicoCliente(text);
    }
    setIsPublicStatusManuallyEdited(true);
  };

  const validateForm = (): boolean => {
    setError(null);

    if (!title.trim()) {
      setError('Por favor, informe o Título Operacional do Caso.');
      return false;
    }
    if (!caseType.trim()) {
      setError('Por favor, informe a Matéria / Ramo / Tipo de Ação.');
      return false;
    }
    if (!statusInterno) {
      setError('O status operacional interno deve ser definido.');
      return false;
    }
    if (!statusPublicoCliente.trim()) {
      setError('Defina o status de exibição pública do cliente para assegurar a transparência fática.');
      return false;
    }

    const isJudicial = activeRegKey === 'processo_judicial_em_andamento' || activeRegKey === 'processo_judicial_ajuizado';
    if (isJudicial && statusInterno === 'Protocolado' && !processNumber.trim()) {
      setError('O número de processo CNJ é obrigatório quando o status interno for definido como "Protocolado".');
      return false;
    }

    return true;
  };

  const saveCasePayload = async (nextStage?: string): Promise<boolean> => {
    if (!validateForm()) return false;

    setSaving(true);
    setSuccess(null);

    // Status draft resolution
    let currentStatusValue = caseObj?.status || 'rascunho';
    const minFieldsFilled = title.trim() && caseType.trim() && (responsibleLawyer.trim() || adverseParty.trim());
    if (currentStatusValue === 'rascunho' && minFieldsFilled) {
      currentStatusValue = 'ativo';
    }

    const timestamp = new Date().toISOString();
    const payload: any = {
      title: title.trim(),
      adverseParty: adverseParty.trim(),
      caseType: caseType.trim(),
      description: description.trim(),
      priority,
      responsibleLawyer: responsibleLawyer.trim(),
      visibleToClient,
      statusInterno,
      statusPublicoCliente: statusPublicoCliente.trim(),
      status: currentStatusValue,
      updatedAt: timestamp
    };

    if (nextStage) {
      payload.productionStage = nextStage;
    }

    // Capture Group fields
    if (activeRegKey === 'processo_judicial_em_andamento' || activeRegKey === 'processo_judicial_ajuizado') {
      payload.processNumber = processNumber.trim();
      payload.tribunal = tribunal.trim();
      payload.court = court.trim();
      payload.district = district.trim();

      payload.audienciaAgendada = audienciaAgendada;
      payload.audienciaData = audienciaData;
      payload.audienciaHora = audienciaHora;
      payload.audienciaLocalOuLink = audienciaLocalOuLink.trim();
      payload.audienciaResponsavel = audienciaResponsavel.trim();
      payload.audienciaObservacoes = audienciaObservacoes.trim();
    } else if (activeRegKey === 'peticao_inicial') {
      payload.pretendedActionName = pretendedActionName.trim();
      payload.pretendedJurisdiction = pretendedJurisdiction.trim();
      payload.estimatedValue = estimatedValue.trim();
    } else if (activeRegKey === 'requerimento_administrativo') {
      payload.administrativeBody = administrativeBody.trim();
      payload.requirementType = requirementType.trim();
    } else if (activeRegKey === 'extrajudicial') {
      payload.negotiationType = negotiationType.trim();
      payload.recipientName = recipientName.trim();
    }

    try {
      await updateDoc(doc(db, 'cases', caseId!), payload);
      
      await setDoc(doc(db, 'casos', caseId!), {
        id: caseId,
        caseId: caseId,
        clienteId: caseObj.clientId,
        clientId: caseObj.clientId,
        title: payload.title,
        titulo: payload.title,
        adverseParty: payload.adverseParty,
        parteContraria: payload.adverseParty,
        caseType: payload.caseType,
        tipo: payload.caseType,
        description: payload.description,
        descricao: payload.description,
        priority: payload.priority,
        prioridade: payload.priority,
        responsibleLawyer: payload.responsibleLawyer,
        advogadoResponsavel: payload.responsibleLawyer,
        visibleToClient: payload.visibleToClient,
        visivelParaCliente: payload.visibleToClient,
        statusInterno: payload.statusInterno,
        statusPublicoCliente: payload.statusPublicoCliente,
        status: payload.status,
        processNumber: payload.processNumber || '',
        numeroProcesso: payload.processNumber || '',
        tribunal: payload.tribunal || '',
        court: payload.court || '',
        vara: payload.court || '',
        district: payload.district || '',
        comarca: payload.district || '',
        updatedAt: payload.updatedAt,
        atualizadoEm: payload.updatedAt,
        createdAt: caseObj.createdAt || new Date().toISOString(),
        criadoEm: caseObj.createdAt || new Date().toISOString()
      }, { merge: true });

      setSuccess('Dados salvos na base com excelência operacional!');
      setCaseObj({ ...caseObj, ...payload });
      return true;
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao manter persistência de dados: ${err.message || err}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    await saveCasePayload();
  };

  const handleSaveAndAdvance = async () => {
    const successSaved = await saveCasePayload('tipo-producao');
    if (successSaved) {
      navigate(flowRoutes.tipoServico(caseId!));
    }
  };

  const handleSaveAndExit = async () => {
    const successSaved = await saveCasePayload();
    if (successSaved) {
      navigate('/boss-giffoni-clientes/fluxo-producao');
    }
  };

  // Check if incomplete card warning is required
  const registrationTypeName = caseObj?.registrationType || 'Não definido';
  const isJudicial = activeRegKey === 'processo_judicial_em_andamento' || activeRegKey === 'processo_judicial_ajuizado';
  const showCnjWarning = isJudicial && !processNumber.trim();

  // Root screen check error state
  if (!caseId) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-20 bg-white border border-red-200 rounded-3xl shadow-sm text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-black text-gray-900 uppercase">Acesso Bloqueado</h3>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Nenhum identificador fático (caseId) foi fornecido na URL de requisição técnica.
        </p>
        <button
          type="button"
          onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao/cadastro')}
          className="mt-6 inline-flex bg-gray-900 hover:bg-black text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
        >
          Voltar ao Início do Fluxo
        </button>
      </div>
    );
  }

  const clientName = client 
    ? (client.type === 'PF' 
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Sem Nome') 
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Sem Razão Social'))
    : '';
  const clientSlug = client?.slug || '';

  return (
    <FluxoStepLayout stepName="Dados do Caso" caseId={caseId} statusText={caseObj?.status === 'rascunho' ? 'Rascunho' : 'Caso Ativo'}>
      <div className="space-y-8">
        
        {/* HEADER EXPLAINER */}
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Parametros Gerais da Demanda</h3>
          <p className="text-xs text-gray-500 mt-1">
            Qualifique estruturalmente o litígio, configure visibilidade operacional e controle os fluxos fáticos perante o cliente.
          </p>
        </div>

        {/* FEEDBACK BANNERS */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-900 text-xs flex gap-3 items-center animate-fadeIn">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs flex gap-3 items-center animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {fetching ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-500" size={28} />
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-500">Sincronizando Metadados...</span>
          </div>
        ) : (
          <div className="space-y-6">

            {/* TOP METADATA SUMMARY BAR IN COMPLIANCE WITH REGRA 10 */}
            <div className="bg-gray-50 border border-gray-150 rounded-2xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Cliente Titular</span>
                  <h4 className="text-sm font-bold text-gray-950 truncate max-w-[180px]">{clientName || 'Nenhum'}</h4>
                  <p className="text-xs text-gray-500 font-mono">Slug: {clientSlug || 'Sem slug'}</p>
                </div>
                <div className="space-y-1 sm:pl-4">
                  <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Modalidade</span>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{registrationTypeName}</h4>
                  <span className="inline-block text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-mono mt-0.5 uppercase">
                    {activeRegKey}
                  </span>
                </div>
                <div className="space-y-1 md:pl-4 col-span-1">
                  <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Controle Operacional</span>
                  <div className="text-xs text-gray-700 space-y-1">
                    <div>Interno: <span className="font-bold text-gray-800">{statusInterno}</span></div>
                    <div className="truncate max-w-[150px]">Público: <span className="font-bold text-indigo-700">{statusPublicoCliente}</span></div>
                  </div>
                </div>
                <div className="space-y-1 md:pl-4 col-span-1">
                  <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Ficha Técnica</span>
                  <div className="text-xs text-gray-750 space-y-1">
                    <div>Status: <span className="font-bold uppercase text-blue-600">{caseObj?.status || 'Rascunho'}</span></div>
                    <div>Prioridade: <span className="font-bold text-gray-800 capitalize">{priority}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* CNJ PERSISTENT ALERT IN COMPLIANCE WITH REGRA 9/10 */}
            {showCnjWarning && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm flex gap-3 items-start animate-fadeIn">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-black uppercase tracking-wider text-xs">Aviso Cadastral de Produção</h5>
                  <p className="font-medium leading-relaxed">
                    CNJ ainda não preenchido. O status público permanecerá como aguardando número do processo. 
                    O avanço das etapas subsequentes não será bloqueado por este quesito, salvo se o status interno for alterado para <span className="font-black font-mono">"Protocolado"</span>.
                  </p>
                </div>
              </div>
            )}

            {/* MAIN CARD FIELDS */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-6 shadow-xs">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono border-b border-gray-100 pb-3">Bases fáticas informativas</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Título do Caso *</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Ação Rescisória de Aluguel Habitacional" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Réu / Parte Adversária</label>
                  <input 
                    type="text" 
                    value={adverseParty} 
                    onChange={(e) => setAdverseParty(e.target.value)}
                    placeholder="Ex: Banco Imobiliário do Norte S/A" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Matéria / Ramo / Tipo de Ação *</label>
                  <input 
                    type="text" 
                    value={caseType} 
                    onChange={(e) => setCaseType(e.target.value)}
                    placeholder="Ex: Direito Civil / Cobrança" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Advogado Responsável / Assessor</label>
                  <input 
                    type="text" 
                    value={responsibleLawyer} 
                    onChange={(e) => setResponsibleLawyer(e.target.value)}
                    placeholder="Ex: Dr. Carlos Giffoni" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Prioridade no Atendimento</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none cursor-pointer"
                  >
                    <option value="baixa">Baixa prioridade operacional</option>
                    <option value="media">Média / Peticionamento ordinário</option>
                    <option value="alta">Alta / Plantão ou Urgência liminar</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Descrição Detalhada e Fatos de Abordagem</label>
                  <textarea 
                    rows={4} 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Qualifique faticamente os prejuízos do cliente, pontos chaves fáticos e as metas jurídicas..." 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* CONDITIONAL SUBFORM PER REGISTRATIONTYPEKEY */}

            {/* MODE: peticao_inicial */}
            {activeRegKey === 'peticao_inicial' && (
              <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-xs animate-fadeIn">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono border-b border-gray-100 pb-3 flex gap-2 items-center">
                  <Scale size={14} className="text-blue-500" />
                  <span>Campos Exclusivos: Petição Inicial</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Ação Pretendida</label>
                    <input 
                      type="text" 
                      value={pretendedActionName}
                      onChange={(e) => setPretendedActionName(e.target.value)}
                      placeholder="Ex: Declaratória de Inexistência" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Competência / Juízo Pretendido</label>
                    <input 
                      type="text" 
                      value={pretendedJurisdiction}
                      onChange={(e) => setPretendedJurisdiction(e.target.value)}
                      placeholder="Ex: Juizado Especial Cível" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Valor Estimado Causa</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-3.5 text-gray-400" size={14} />
                      <input 
                        type="text" 
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
                        placeholder="R$ 15.000,00" 
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODE: requerimento_administrativo */}
            {activeRegKey === 'requerimento_administrativo' && (
              <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-xs animate-fadeIn">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono border-b border-gray-100 pb-3 flex gap-2 items-center">
                  <Building size={14} className="text-amber-500" />
                  <span>Campos Exclusivos: Requerimento Administrativo</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Órgão Administrativo Alvo</label>
                    <input 
                      type="text" 
                      value={administrativeBody}
                      onChange={(e) => setAdministrativeBody(e.target.value)}
                      placeholder="Ex: INSS, Prefeitura, Receita Federal" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Tipo/Objeto de Requerimento</label>
                    <input 
                      type="text" 
                      value={requirementType}
                      onChange={(e) => setRequirementType(e.target.value)}
                      placeholder="Ex: Recurso Ordinário, Liberação de Alvará" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODE: extrajudicial */}
            {activeRegKey === 'extrajudicial' && (
              <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-xs animate-fadeIn">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono border-b border-gray-100 pb-3 flex gap-2 items-center">
                  <FileText size={14} className="text-indigo-500" />
                  <span>Campos Exclusivos: Trâmite Extrajudicial</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Tipo de Tratativa / Notificação</label>
                    <input 
                      type="text" 
                      value={negotiationType}
                      onChange={(e) => setNegotiationType(e.target.value)}
                      placeholder="Ex: Notificação Extrajudicial, Minuta de Acordo" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Destinatário da Tratativa</label>
                    <input 
                      type="text" 
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Ex: Condomínio Edifício Mirador (Representante)" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODE: processo_judicial_em_andamento & processo_judicial_ajuizado */}
            {isJudicial && (
              <div className="space-y-6">
                
                {/* CORE JUDICIAL IDENTIFIERS CARD */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-xs">
                  <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono border-b border-gray-100 pb-3">Jurisdição e Processo Judicial</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Número ÚNICO CNJ ({statusInterno === 'Protocolado' ? 'Obrigatório *' : 'Recomendado'})</label>
                      <input 
                        type="text" 
                        value={processNumber}
                        onChange={handleCnjChange}
                        placeholder="Ex: 0000000-00.0000.0.00.0000" 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-mono font-bold text-gray-850 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Tribunal Virtual / Competência</label>
                      <input 
                        type="text" 
                        value={tribunal}
                        onChange={(e) => setTribunal(e.target.value)}
                        placeholder="Ex: TJPE, TRT6, TRF5" 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Vara / Órgão Julgador (Court)</label>
                      <input 
                        type="text" 
                        value={court}
                        onChange={(e) => setCourt(e.target.value)}
                        placeholder="Ex: 2ª Vara Cível da Comarca de Recife" 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Comarca / Seção Judiciária (District)</label>
                      <input 
                        type="text" 
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="Ex: Recife - PE" 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* AUDIÊNCIA SCHEDULER BLOCK IN COMPLIANCE WITH REGRA 5 */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono flex gap-2 items-center">
                      <Calendar size={14} className="text-indigo-500" />
                      <span>Agendamento de Audiência</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Há Audiência agendada?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAudienciaAgendada(!audienciaAgendada);
                        }}
                        className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all outline-none duration-250 cursor-pointer ${
                          audienciaAgendada ? 'bg-indigo-600 justify-end' : 'bg-gray-200 justify-start'
                        }`}
                      >
                        <div className="w-5 h-5 bg-white rounded-full shadow-xs" />
                      </button>
                    </div>
                  </div>

                  {audienciaAgendada && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Data da Audiência</label>
                        <input 
                          type="date" 
                          value={audienciaData}
                          onChange={(e) => setAudienciaData(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Horário (HH:MM)</label>
                        <input 
                          type="time" 
                          value={audienciaHora}
                          onChange={(e) => setAudienciaHora(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Local físico ou Link da Videoconferência</label>
                        <input 
                          type="text" 
                          value={audienciaLocalOuLink}
                          onChange={(e) => setAudienciaLocalOuLink(e.target.value)}
                          placeholder="Ex: Sala de Audiências da 2ª Vara ou Link Teams" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Advogado / Responsável da Audiência</label>
                        <input 
                          type="text" 
                          value={audienciaResponsavel}
                          onChange={(e) => setAudienciaResponsavel(e.target.value)}
                          placeholder="Dr. Carlos Giffoni" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-sm font-bold uppercase text-gray-650 tracking-wide">Instruções / Observações fáticas da Audiência</label>
                        <textarea 
                          rows={2}
                          value={audienciaObservacoes}
                          onChange={(e) => setAudienciaObservacoes(e.target.value)}
                          placeholder="Ex: Cliente necessita portar documento original com foto e conectar-se 15 min antes." 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none resize-none"
                        />
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5">Os dados de audiência serão salvos temporariamente neste caso operacional e integrados futuramente.</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* STATUS & PORTAL CONTROLS CARD */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-6 shadow-xs">
              <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider font-mono border-b border-gray-100 pb-3">Controle e Visibilidade Operacional</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* STATUS INTERNO IN COMPLIANCE WITH REGRA 6 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                    <Activity size={12} className="text-gray-400" />
                    <span>Status Interno de Produção *</span>
                  </label>
                  <p className="text-xs text-gray-500 leading-relaxed">Status restrito ao BOSS e assessores internos.</p>
                  <select
                    value={statusInterno}
                    onChange={(e) => setStatusInterno(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none cursor-pointer"
                  >
                    {statusInternoOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* VISIBLE TO CLIENT TOGGLE */}
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                    <UserCheck size={12} className="text-gray-400" />
                    <span>Exibir no Portal do Cliente?</span>
                  </label>
                  <p className="text-xs text-gray-500 leading-relaxed">Controla a liberação ou opacidade jurídica do caso.</p>
                  <div className="flex items-center gap-3 py-1">
                    <button
                      type="button"
                      onClick={() => setVisibleToClient(!visibleToClient)}
                      className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all outline-none duration-250 cursor-pointer ${
                        visibleToClient ? 'bg-emerald-600 justify-end' : 'bg-gray-200 justify-start'
                      }`}
                    >
                      <div className="w-5 h-5 bg-white rounded-full shadow-xs" />
                    </button>
                    <span className="text-sm font-bold text-gray-700">
                      {visibleToClient ? 'Visível (Recomendado)' : 'Caso Ocultado (Opacidade técnica)'}
                    </span>
                  </div>
                </div>

                {/* STATUS PUBLICO CLIENTE IN COMPLIANCE WITH REGRA 6 */}
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                    <User size={12} className="text-indigo-500" />
                    <span>Status Público do Cliente (Visibilidade no Portal) *</span>
                  </label>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Mensagem limpa exibida em tempo real na timeline do cliente conectado.
                  </p>
                  <input
                    type="text"
                    value={statusPublicoCliente}
                    onChange={handlePublicStatusChange}
                    placeholder="Defina as palavras do status operacional..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-sm font-semibold text-gray-800 transition-all outline-none"
                  />

                  {/* QUICK SUGGESTIONS LIST FROM REGRA 6 */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Sugestões rápidas de preenchimento:</span>
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {statusPublicoSuggestions.map((sug) => {
                        const displaySug = sug === 'Processo nº [CNJ]' && processNumber.trim() 
                          ? `Processo nº ${processNumber}` 
                          : sug;
                        return (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => selectSuggestion(sug)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-750 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl transition-all cursor-pointer"
                          >
                            {displaySug}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ACTION FLOATING CORE NAV BAR */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
              
              <button
                type="button"
                onClick={() => {
                  if (caseId) {
                    navigate(flowRoutes.editarCadastroCliente(caseId));
                  } else {
                    navigate(flowRoutes.cadastro());
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-250 hover:bg-gray-50 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveOnly}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-blue-600 hover:bg-blue-50/50 text-blue-700 px-6 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Salvar rascunho</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAndExit}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 px-6 py-3 rounded-xl font-bold transition-all text-sm hover:bg-gray-50 cursor-pointer"
                >
                  <span>Salvar e Sair</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAndAdvance}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-950 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold transition-all text-sm cursor-pointer shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Processando etapas...</span>
                    </>
                  ) : (
                    <>
                      <span>Salvar e Avançar</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

              </div>
            </div>

          </div>
        )}
      </div>
    </FluxoStepLayout>
  );
}
