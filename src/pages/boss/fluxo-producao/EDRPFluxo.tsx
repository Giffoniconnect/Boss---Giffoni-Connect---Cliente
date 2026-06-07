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
  Lock,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckSquare,
  User,
  Briefcase,
  Layers,
  FileCheck,
  Compass,
  Check,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

// EDRP complete interface matching Regra 2
interface EDRPData {
  structuring: {
    competence: string;
    comarca?: string;
    defendant?: {
      type: 'PF' | 'PJ';
      pf_nomeCompleto?: string;
      pf_cpf?: string;
      pf_rg?: string;
      pf_estadoCivil?: string;
      pf_profissao?: string;
      pf_email?: string;
      pf_telefone?: string;
      pf_endereco?: string;
      pj_razaoSocial?: string;
      pj_cnpj?: string;
      pj_inscricaoEstadual?: string;
      pj_socioAdministrador?: string;
      pj_email?: string;
      pj_telefone?: string;
      pj_endereco?: string;
    };
    parties: string;
    relevantFacts: string;
    legalGrounds: string;
    claims: string;
    evidenceSummary: string;
    risks: string;
    strategy: string;
    notes: string;
    completed: boolean;
    completedAt: string;
  };
  delegation: {
    responsiblePerson: string;
    responsibleSector: string;
    delegatedTask: string;
    internalDeadline: string;
    priority: string;
    status: 'nao_delegado' | 'pendente' | 'em_andamento' | 'concluido' | 'devolvido_com_pendencia';
    todoistPrepared: boolean;
    todoistTaskId: string;
    todoistProject: string;
    todoistStatus: string;
    collaboratorPanelPrepared: boolean;
    collaboratorAssignedUser: string;
    collaboratorAssignmentStatus: string;
    notes: string;
    completed: boolean;
    completedAt: string;
  };
  reviewPreparation: {
    reviewResponsible: string;
    reviewDate: string;
    reviewDeadline: string;
    reviewInstructions: string;
    reviewStatus: 'aguardando_revisao' | 'em_revisao' | 'ajustes_solicitados' | 'aprovado' | 'reprovado';
    adjustmentsRequested: string;
    approvedForProtocol: boolean;
    todoistPrepared: boolean;
    todoistTaskId: string;
    collaboratorPanelPrepared: boolean;
    collaboratorAssignedUser: string;
    notes: string;
    completed: boolean;
    completedAt: string;
  };
  protocolPreparation: {
    protocolResponsible: string;
    expectedProtocolDate: string;
    protocolSystem: string;
    protocolStatus: 'nao_preparado' | 'aguardando_revisao' | 'pronto_para_protocolar' | 'agendado' | 'protocolado' | 'devolvido' | 'cancelado';
    protocolInstructions: string;
    requiresCNJ: boolean;
    processNumber: string;
    proofOfProtocolPrepared: boolean;
    googleDrivePrepared: boolean;
    notes: string;
    completed: boolean;
    completedAt: string;
  };
  edrpStatus: string;
  updatedAt: string;
}

// Initial/default pristine values inside EDRPData definition
const DEFAULT_EDRP: EDRPData = {
  structuring: {
    competence: '',
    comarca: '',
    defendant: {
      type: 'PF',
      pf_nomeCompleto: '',
      pf_cpf: '',
      pf_rg: '',
      pf_estadoCivil: '',
      pf_profissao: '',
      pf_email: '',
      pf_telefone: '',
      pf_endereco: '',
      pj_razaoSocial: '',
      pj_cnpj: '',
      pj_inscricaoEstadual: '',
      pj_socioAdministrador: '',
      pj_email: '',
      pj_telefone: '',
      pj_endereco: '',
    },
    parties: '',
    relevantFacts: '',
    legalGrounds: '',
    claims: '',
    evidenceSummary: '',
    risks: '',
    strategy: '',
    notes: '',
    completed: false,
    completedAt: ''
  },
  delegation: {
    responsiblePerson: '',
    responsibleSector: 'Jurídico Interno',
    delegatedTask: '',
    internalDeadline: '',
    priority: 'media',
    status: 'nao_delegado',
    todoistPrepared: false,
    todoistTaskId: '',
    todoistProject: '',
    todoistStatus: '',
    collaboratorPanelPrepared: false,
    collaboratorAssignedUser: '',
    collaboratorAssignmentStatus: '',
    notes: '',
    completed: false,
    completedAt: ''
  },
  reviewPreparation: {
    reviewResponsible: '',
    reviewDate: '',
    reviewDeadline: '',
    reviewInstructions: '',
    reviewStatus: 'aguardando_revisao',
    adjustmentsRequested: '',
    approvedForProtocol: false,
    todoistPrepared: false,
    todoistTaskId: '',
    collaboratorPanelPrepared: false,
    collaboratorAssignedUser: '',
    notes: '',
    completed: false,
    completedAt: ''
  },
  protocolPreparation: {
    protocolResponsible: '',
    expectedProtocolDate: '',
    protocolSystem: '',
    protocolStatus: 'nao_preparado',
    protocolInstructions: '',
    requiresCNJ: false,
    processNumber: '',
    proofOfProtocolPrepared: false,
    googleDrivePrepared: false,
    notes: '',
    completed: false,
    completedAt: ''
  },
  edrpStatus: 'Rascunho',
  updatedAt: ''
};

// Sectors defined by Regra 4
const SECTORS = [
  'Jurídico Interno',
  'Controladoria',
  'Financeiro',
  'Comercial',
  'Operacional',
  'Estratégico',
  'RH',
  'Marketing'
];

export default function EDRPFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  // State managers
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [edrp, setEdrp] = useState<EDRPData>(DEFAULT_EDRP);

  // Load context from Firestore
  useEffect(() => {
    if (!caseId) {
      setError('Identificador de caso não informado nos parâmetros da URL.');
      setFetching(false);
      return;
    }

    async function loadEDRPData() {
      try {
        setFetching(true);
        setError(null);

        // Fetch case
        const caseRef = doc(db, 'cases', caseId!);
        const caseSnap = await getDoc(caseRef);

        if (!caseSnap.exists()) {
          setError(`Caso referenciado pelo ID [${caseId}] não pôde ser localizado.`);
          setFetching(false);
          return;
        }

        const caseData = caseSnap.data();
        setCaseObj(caseData);

        // Fetch client
        if (caseData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', caseData.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        // Merge EDRP data defensively with standard schema types
        const rawEdrp = caseData.edrp || {};
        const merged: EDRPData = {
          structuring: { ...DEFAULT_EDRP.structuring, ...(rawEdrp.structuring || {}) },
          delegation: { ...DEFAULT_EDRP.delegation, ...(rawEdrp.delegation || {}) },
          reviewPreparation: { ...DEFAULT_EDRP.reviewPreparation, ...(rawEdrp.reviewPreparation || {}) },
          protocolPreparation: { ...DEFAULT_EDRP.protocolPreparation, ...(rawEdrp.protocolPreparation || {}) },
          edrpStatus: rawEdrp.edrpStatus || DEFAULT_EDRP.edrpStatus,
          updatedAt: rawEdrp.updatedAt || DEFAULT_EDRP.updatedAt
        };

        setEdrp(merged);
      } catch (err: any) {
        console.error(err);
        setError(`Falha ao obter os registros de produção do EDRP: ${err.message || err}`);
      } finally {
        setFetching(false);
      }
    }

    loadEDRPData();
  }, [caseId]);

  // Nested form updates helper
  const handleFieldChange = (section: keyof EDRPData, field: string, value: any) => {
    setEdrp((prev) => {
      const updatedSection = { ...prev[section] as any, [field]: value };

      // Automations defined in Regra 5:
      if (section === 'reviewPreparation') {
        if (field === 'approvedForProtocol' && value === true) {
          updatedSection.reviewStatus = 'aprovado';
        }
        if (field === 'reviewStatus' && (value === 'reprovado' || value === 'ajustes_solicitados')) {
          updatedSection.approvedForProtocol = false;
        }
        if (field === 'reviewStatus' && value === 'aprovado') {
          updatedSection.approvedForProtocol = true;
        }
      }

      // Automations defined in Regra 6:
      // If service is "Petição Inicial", requiresCNJ is true ONLY when status is "protocolado".
      if (section === 'protocolPreparation' && field === 'protocolStatus') {
        const isPeticaoInicial = caseObj?.registrationTypeKey === 'peticao_inicial';
        if (isPeticaoInicial) {
          updatedSection.requiresCNJ = (value === 'protocolado');
        }
      }

      return {
        ...prev,
        [section]: updatedSection
      };
    });
  };

  // Computes the recommended standard statusInterno dynamically based on data state
  const getRecommendedStatusInterno = (edrpData: EDRPData) => {
    const pStatus = edrpData.protocolPreparation.protocolStatus;
    const rStatus = edrpData.reviewPreparation.reviewStatus;
    const isApproved = edrpData.reviewPreparation.approvedForProtocol;
    const dStatus = edrpData.delegation.status;

    // Protocol status ready/scheduled OR protocolled
    if (pStatus === 'protocolado') {
      return 'Protocolado';
    }
    if (pStatus === 'pronto_para_protocolar' || pStatus === 'agendado') {
      return 'Aguardando protocolo';
    }

    // Review status checks
    if (isApproved || rStatus === 'aprovado') {
      return 'Aprovado para protocolo';
    }
    if (rStatus === 'em_revisao') {
      return 'Em revisão';
    }
    if (rStatus === 'aguardando_revisao') {
      return 'Aguardando revisão';
    }
    if (rStatus === 'ajustes_solicitados') {
      return 'Ajustes solicitados';
    }

    // Delegation checks
    if (dStatus === 'pendente' || dStatus === 'em_andamento') {
      return 'Delegado';
    }

    // Structuring content presence checks
    const hasStructuring = !!(
      edrpData.structuring.competence?.trim() ||
      edrpData.structuring.parties?.trim() ||
      edrpData.structuring.relevantFacts?.trim() ||
      edrpData.structuring.legalGrounds?.trim() ||
      edrpData.structuring.claims?.trim() ||
      edrpData.structuring.evidenceSummary?.trim() ||
      edrpData.structuring.risks?.trim() ||
      edrpData.structuring.strategy?.trim()
    );

    if (hasStructuring) {
      return 'Em estruturação';
    }

    return 'Em produção'; // standard baseline status
  };

  // Warning Alerts Evaluator following Regra 9 and Regra 6
  const getValidationWarnings = () => {
    const list: { type: 'warning' | 'info' | 'error'; msg: string }[] = [];

    if (!edrp) return list;

    // 1. Estruturação vazia
    const struct = edrp.structuring;
    const isStructuringEmpty = !(
      struct.competence?.trim() ||
      struct.parties?.trim() ||
      struct.relevantFacts?.trim() ||
      struct.legalGrounds?.trim() ||
      struct.claims?.trim() ||
      struct.evidenceSummary?.trim() ||
      struct.risks?.trim() ||
      struct.strategy?.trim()
    );
    if (isStructuringEmpty) {
      list.push({
        type: 'warning',
        msg: 'A estruturação fática e jurídica do EDRP está totalmente vazia.'
      });
    }

    // 2. Delegação sem responsável
    if (!edrp.delegation.responsiblePerson?.trim()) {
      list.push({
        type: 'warning',
        msg: 'Nenhum profissional responsável principal foi designado para a delegação.'
      });
    }

    // 3. Revisão sem revisor
    if (!edrp.reviewPreparation.reviewResponsible?.trim()) {
      list.push({
        type: 'warning',
        msg: 'Nenhum revisor interno foi definido na etapa de Revisão.'
      });
    }

    // 4. Protocolo sem responsável
    if (!edrp.protocolPreparation.protocolResponsible?.trim()) {
      list.push({
        type: 'warning',
        msg: 'Nenhum responsável foi designado para a preparação de protocolo.'
      });
    }

    // 5. Protocolo sem sistema
    if (!edrp.protocolPreparation.protocolSystem?.trim()) {
      list.push({
        type: 'warning',
        msg: 'Nenhum sistema de protocolo eletrônico (ex: PJe, Projudi, e-SAJ) foi preenchido.'
      });
    }

    // 6. Revisão não aprovada
    const isApproved = edrp.reviewPreparation.approvedForProtocol || edrp.reviewPreparation.reviewStatus === 'aprovado';
    if (!isApproved) {
      list.push({
        type: 'warning',
        msg: 'A análise de revisão interna do EDRP não está aprovada para a liberação de protocolo.'
      });
    }

    // 7. Protocolo pronto sem revisão aprovada
    if (edrp.protocolPreparation.protocolStatus === 'pronto_para_protocolar' && !isApproved) {
      list.push({
        type: 'error',
        msg: 'Inconsistência Grave: O protocolo está marcado como "Pronto para protocolar", mas a revisão da estruturação ainda não foi aprovada formalmente.'
      });
    }

    // 8. Service recommendations check (Regra 6)
    const serviceKey = caseObj?.registrationTypeKey;
    const isOngoingJudicial = serviceKey === 'processo_judicial_em_andamento' || serviceKey === 'processo_judicial_ajuizado';
    if (isOngoingJudicial && !edrp.protocolPreparation.processNumber?.trim()) {
      list.push({
        type: 'info',
        msg: 'CNJ Recomendado: O tipo de serviço selecionado exige a identificação do número de processo judicial anterior.'
      });
    }

    return list;
  };

  // Master Save Handler
  const handleSave = async (showNotification = true, transitionTo: 'home' | 'revisao' | '' = '') => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    if (showNotification) setSuccess(null);

    try {
      const now = new Date().toISOString();
      const recommendedStatus = getRecommendedStatusInterno(edrp);

      // Deep copy to prevent mutating reference
      const updatedEdrp = {
        ...edrp,
        updatedAt: now
      };

      const payload: any = {
        edrp: updatedEdrp,
        statusInterno: recommendedStatus,
        updatedAt: now
      };

      if (transitionTo === 'revisao') {
        payload.productionStage = 'revisao';
      }

      await updateDoc(doc(db, 'cases', caseId!), payload);

      setEdrp(updatedEdrp);
      setCaseObj((prev: any) => ({
        ...prev,
        statusInterno: recommendedStatus,
        productionStage: transitionTo === 'revisao' ? 'revisao' : prev.productionStage
      }));

      if (showNotification) {
        setSuccess(`EDRP atualizado com sucesso no sistema. O status interno sugerido foi associado como: "${recommendedStatus}"`);
      }

      if (transitionTo === 'revisao') {
        navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/revisao`);
      } else if (transitionTo === 'home') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      }
    } catch (err: any) {
      console.error(err);
      setError(`Erro crítico ao gravar persistência fática do EDRP: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <FluxoStepLayout stepName="EDRP" caseId={caseId}>
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="text-xs font-bold font-mono text-gray-500 tracking-wide uppercase">
            Carregando Estudo Dirigido (EDRP) do Caso...
          </span>
        </div>
      </FluxoStepLayout>
    );
  }

  // Resolve client layout labels
  const resolvedClientName = client
    ? (client.type === 'PF'
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cadastro Sem Nome')
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Razão Social Ausente'))
    : 'Buscando Cliente...';

  const resolvedClientSlug = client?.slug || 'sem-slug';

  const validationAlerts = getValidationWarnings();

  return (
    <FluxoStepLayout stepName="EDRP" caseId={caseId} statusText={caseObj?.statusInterno || 'Em estruturação'}>
      <div className="space-y-8">
        
        {/* TOP LEVEL ERROR/SUCCESS TOAST LINES */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs flex gap-3 items-center">
            <CheckSquare size={18} className="text-emerald-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{success}</span>
          </div>
        )}

        {/* 1. CABEÇALHO DO CASO - Regra 1 */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-[1.5rem] p-6">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-gray-400 tracking-widest mb-2 font-mono">
            <span>Metadados do Processo</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-base font-black text-gray-900 leading-tight">
                {resolvedClientName}
              </h4>
              <p className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 items-center font-medium">
                <span className="font-mono text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded text-[10px] font-bold">
                  {resolvedClientSlug}
                </span>
                <span>• Serviço: <strong className="text-gray-700">{caseObj?.registrationType || 'Não Definido'}</strong></span>
                <span>• Estágio: <strong className="text-gray-700 uppercase font-mono">{caseObj?.productionStage || 'Início'}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="px-3.5 py-2 bg-white border border-gray-150 rounded-xl text-center min-w-[100px]">
                <span className="block text-[8px] font-sans font-extrabold uppercase tracking-wider text-gray-400">Status Interno</span>
                <span className="text-xs font-bold text-gray-800 mt-0.5 inline-block">
                  {caseObj?.statusInterno || 'N/A'}
                </span>
              </div>
              <div className="px-3.5 py-2 bg-white border border-gray-150 rounded-xl text-center min-w-[100px]">
                <span className="block text-[8px] font-sans font-extrabold uppercase tracking-wider text-gray-400">Status Público</span>
                <span className="text-xs font-bold text-gray-400 mt-0.5 inline-block">
                  {caseObj?.statusPublicoCliente || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-gray-200/50">
            {caseObj?.clientId && (
              <button
                type="button"
                onClick={() => window.open(`/boss-giffoni-clientes/clientes/${caseObj.clientId}`, '_blank')}
                className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-tight text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <User size={13} />
                Abrir Cliente
                <ExternalLink size={11} className="opacity-60" />
              </button>
            )}
            <button
              type="button"
              onClick={() => window.open(`/boss-giffoni-clientes/casos/${caseId}`, '_blank')}
              className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-tight text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Briefcase size={13} />
              Abrir Caso
              <ExternalLink size={11} className="opacity-60" />
            </button>
          </div>
        </div>

        {/* SECURE SIGILO STATEMENT */}
        <div className="bg-slate-900 text-white rounded-[1.5rem] p-5 flex gap-4 items-start shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white tracking-tight uppercase">Conformidade e Sigilo Interno</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
              O estudo fático-jurídico e contingenciamento securitário representam segredo profissional. Todos os rascunhos inseridos nessa etapa estão salvos sob barramento criptografado e não são expostos na interface visual do Painel do Cliente.
            </p>
          </div>
        </div>

        {/* 2. ESTRUTURAÇÃO - Regra 3 */}
        <div className="border border-gray-200 rounded-[1.5rem] p-6 space-y-6 bg-gray-50/20">
          <div className="flex items-start gap-3 border-b border-gray-150 pb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-950 tracking-tight uppercase">Etapa 07: Estruturação Jurídica e Fática do Caso (11 Cards Virtuais)</h3>
              <p className="text-[10.5px] text-gray-400 mt-0.5">Preencha cada um dos cards listados abaixo de forma sequencial ou paralela.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Card 1 - Competência */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 1
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Competência / Juízo Competente
                </span>
              </div>
              <textarea
                value={edrp.structuring.competence}
                onChange={(e) => handleFieldChange('structuring', 'competence', e.target.value)}
                placeholder="Ex: Vara Cível da Comarca da Capital - TJ/RJ..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[50px] outline-none"
              />
            </div>

            {/* Card 2 - Comarca */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 2
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Comarca
                </span>
              </div>
              <input
                type="text"
                value={edrp.structuring.comarca || ''}
                onChange={(e) => handleFieldChange('structuring', 'comarca', e.target.value)}
                placeholder="Ex: Rio de Janeiro - RJ"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 outline-none"
              />
            </div>

            {/* Card 3 - Parte(s) autora */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-4 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 3
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Parte(s) autora
                </span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex gap-2 items-center text-amber-900 text-[10px] font-black uppercase tracking-wide">
                  <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                  <span>Dados extraídos automaticamente</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-normal font-semibold">
                  Estes dados estão sendo puxados automaticamente da etapa 1 do cadastro.
                </p>
              </div>

              {client ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/50 p-3.5 rounded-xl border border-gray-100 text-[11px] leading-tight">
                  <div>
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Cliente</span>
                    <span className="font-extrabold text-gray-800">
                      {client.type === 'PF' 
                        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || client.name || 'Nome Completo Ausente')
                        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || client.name || 'Razão Social Ausente')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tipo / Documento</span>
                    <span className="font-bold text-gray-750 font-mono">
                      {client.type || 'PF'} - {client.type === 'PF' 
                        ? (client.pfDadosPessoais?.pf_cpf || client.pfData?.pf_cpf || '—') 
                        : (client.pjDadosEmpresa?.pj_cnpj || client.pjData?.pj_cnpj || '—')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">E-mail</span>
                    <span className="font-semibold text-gray-700">{client.email || '—'}</span>
                  </div>
                  {client.type === 'PF' ? (
                    <div>
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Profissão / Telefone</span>
                      <span className="font-semibold text-gray-700">
                        {client.pfDadosPessoais?.pf_profissao || '—'} | {client.pfDadosPessoais?.pf_telefone || client.phone || '—'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sócio Adm.</span>
                      <span className="font-semibold text-gray-700">{client.pjDadosEmpresa?.pj_socioAdministrador || '—'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-center text-gray-400 text-[11px] font-medium italic">
                  Aguardando faturamento de dados do cliente...
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[9.5px] font-bold text-gray-400 uppercase">Qualificação Detalhada Autora</label>
                <textarea
                  value={edrp.structuring.parties}
                  onChange={(e) => handleFieldChange('structuring', 'parties', e.target.value)}
                  placeholder="Incorpore co-autores, herdeiros ou especificações acessórias..."
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[50px] outline-none"
                />
              </div>
            </div>

            {/* Card 4 - Adicionar Réu */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-4 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex flex-wrap gap-3 items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                    Card 4
                  </span>
                  <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                    Adicionar Réu (Coletas Originais)
                  </span>
                </div>
                <div className="flex bg-gray-100 p-0.5 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const currentDef = edrp.structuring.defendant || { type: 'PF' };
                      handleFieldChange('structuring', 'defendant', { ...currentDef, type: 'PF' });
                    }}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition cursor-pointer ${
                      (edrp.structuring.defendant?.type || 'PF') === 'PF'
                        ? 'bg-white text-gray-900 shadow-3xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Réu PF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentDef = edrp.structuring.defendant || { type: 'PF' };
                      handleFieldChange('structuring', 'defendant', { ...currentDef, type: 'PJ' });
                    }}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition cursor-pointer ${
                      (edrp.structuring.defendant?.type || 'PF') === 'PJ'
                        ? 'bg-white text-gray-900 shadow-3xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Réu PJ
                  </button>
                </div>
              </div>

              {(edrp.structuring.defendant?.type || 'PF') === 'PF' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-xs">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Nome Completo do Réu</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pf_nomeCompleto || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pf_nomeCompleto: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 font-semibold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">CPF</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pf_cpf || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pf_cpf: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 font-mono outline-none"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">RG</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pf_rg || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pf_rg: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Estado Civil</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pf_estadoCivil || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pf_estadoCivil: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Profissão</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pf_profissao || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pf_profissao: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                    <input
                      type="email"
                      value={edrp.structuring.defendant?.pf_email || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pf_email: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pf_telefone || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pf_telefone: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-855 outline-none"
                      placeholder="(21) 99999-9999"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Endereço do Réu</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pf_endereco || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pf_endereco: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-xs">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Razão Social / Fantasia do Réu</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pj_razaoSocial || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pj_razaoSocial: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 font-semibold outline-none"
                    />
                  </div>
                  <div className="space-y-1 font-mono">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-sans">CNPJ</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pj_cnpj || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pj_cnpj: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                      placeholder="00.000.000/0001-00"
                    />
                  </div>
                  <div className="space-y-1 font-mono">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-sans">Inscrição Estadual</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pj_inscricaoEstadual || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pj_inscricaoEstadual: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Sócio Administrador</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pj_socioAdministrador || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pj_socioAdministrador: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">E-mail corporativo</label>
                    <input
                      type="email"
                      value={edrp.structuring.defendant?.pj_email || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pj_email: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Telefone Comercial</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pj_telefone || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pj_telefone: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Endereço da Sede</label>
                    <input
                      type="text"
                      value={edrp.structuring.defendant?.pj_endereco || ''}
                      onChange={(e) => handleFieldChange('structuring', 'defendant', { ...edrp.structuring.defendant, pj_endereco: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Card 5 - Fatos relevantes */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 5
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Fatos relevantes
                </span>
              </div>
              <textarea
                value={edrp.structuring.relevantFacts}
                onChange={(e) => handleFieldChange('structuring', 'relevantFacts', e.target.value)}
                placeholder="Narrativa cronológica dos fatos determinantes..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 6 - Principais fundamentos */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-4 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 6
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Principais fundamentos
                </span>
              </div>

              {/* Checkbox inteligente para selecionar fundamentos comuns */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono block">⚖️ Fundamentos Mais Comuns (Clique para inserir)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-gray-150">
                  {[
                    { title: 'Dano Moral por Falha na Prestação de Serviço', text: 'Tese sob escopo do Art. 14 do CDC: responsabilidade objetiva da fornecedora por vícios fáticos.' },
                    { title: 'Inadimplemento Contratual com Perdas e Danos', text: 'Tese pelo Art. 389 do Código Civil: descumprimento de obrigações gerando dever indenizatório.' },
                    { title: 'Enriquecimento Sem Causa do Credor', text: 'Tese pelo Art. 884 do Código Civil: vedação ao proveito econômico injustificado à custa alheia.' },
                    { title: 'Responsabilidade Civil por Abuso de Direito', text: 'Tese pelo Art. 187 do Código Civil: ato ilícito por exceder limites impostos pelo fim socioeconômico.' }
                  ].map((fund) => {
                    const active = edrp.structuring.legalGrounds?.includes(fund.title);
                    return (
                      <button
                        key={fund.title}
                        type="button"
                        onClick={() => {
                          let current = edrp.structuring.legalGrounds || '';
                          if (active) {
                            current = current.replace(`${fund.title}: ${fund.text}\n\n`, '');
                          } else {
                            current += `${fund.title}: ${fund.text}\n\n`;
                          }
                          handleFieldChange('structuring', 'legalGrounds', current);
                        }}
                        className={`text-left p-2.5 rounded-lg border text-[11px] leading-tight transition cursor-pointer ${
                          active 
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold'
                        }`}
                      >
                        <div>{fund.title}</div>
                        <span className="text-[9px] text-gray-400 font-normal block mt-0.5">{fund.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                value={edrp.structuring.legalGrounds}
                onChange={(e) => handleFieldChange('structuring', 'legalGrounds', e.target.value)}
                placeholder="Doutrina, Legislação, Jurisprudência consolidada..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[80px] outline-none"
              />
            </div>

            {/* Card 7 - pedidos correlacionados */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-4 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 7
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Pedidos correlacionados
                </span>
              </div>

              {/* Dynamic prompt indicators based on selected foundations */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[10.5px] leading-relaxed text-indigo-900 font-semibold">
                <span className="font-extrabold uppercase text-[9px] tracking-wide block text-indigo-705">Pedidos recomendados para este caso:</span>
                {edrp.structuring.legalGrounds?.includes('Dano Moral') && <div className="mt-1">✅ Condenação em danos morais quantificados.</div>}
                {edrp.structuring.legalGrounds?.includes('Inadimplemento') && <div className="mt-1">✅ Rescisão contratual + Multas acumuladas de mora.</div>}
                {edrp.structuring.legalGrounds?.includes('Enriquecimento') && <div className="mt-1">✅ Repetição do indébito e cobrança em dobro.</div>}
                {edrp.structuring.legalGrounds?.includes('Abuso') && <div className="mt-1">✅ Cessação imediata das cobranças sob tutela.</div>}
                {(!edrp.structuring.legalGrounds) && <div>Nenhum fundamento pré-selecionado. Digite livremente abaixo.</div>}
              </div>

              <textarea
                value={edrp.structuring.claims}
                onChange={(e) => handleFieldChange('structuring', 'claims', e.target.value)}
                placeholder="Pedidos liminares de urgência e indenizações finais meritológicas..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 8 - Resumo das provas */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 8
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Resumo das provas
                </span>
              </div>
              <textarea
                value={edrp.structuring.evidenceSummary}
                onChange={(e) => handleFieldChange('structuring', 'evidenceSummary', e.target.value)}
                placeholder="Documentação anexada, testemunhas chaves, prints, áudios..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 9 - Análise de riscos */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 9
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Análise de riscos
                </span>
              </div>
              <textarea
                value={edrp.structuring.risks}
                onChange={(e) => handleFieldChange('structuring', 'risks', e.target.value)}
                placeholder="Riscos de sucumbência, revelia, custos recursais..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 10 - Estratégia definida */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 10
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Estratégia definida
                </span>
              </div>
              <textarea
                value={edrp.structuring.strategy}
                onChange={(e) => handleFieldChange('structuring', 'strategy', e.target.value)}
                placeholder="Plano tático de distribuição processual, ritos e andamentos preliminares..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 11 - Observações Estruturantes gerais */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 11
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Observações Estruturantes gerais
                </span>
              </div>
              <textarea
                value={edrp.structuring.notes}
                onChange={(e) => handleFieldChange('structuring', 'notes', e.target.value)}
                placeholder="Especificações secundárias livres ou links de pesquisa de andamentos BOSS..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-150">
            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700">
              <input
                type="checkbox"
                checked={edrp.structuring.completed}
                onChange={(e) => {
                  const checkVal = e.target.checked;
                  handleFieldChange('structuring', 'completed', checkVal);
                  handleFieldChange('structuring', 'completedAt', checkVal ? new Date().toISOString() : '');
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span>Marcar Estruturação Técnica (Etapa 07) como Concluída</span>
            </label>
          </div>
        </div>

        {/* 3. DELEGAÇÃO - Regra 4 */}
        <div className="border border-gray-200 rounded-[1.5rem] p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Compass size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-950 tracking-tight uppercase">2. Delegação e Divisão de Tarefas</h3>
              <p className="text-[10.5px] text-gray-400 mt-0.5">Designação de responsabilidades corporativas de execução interna.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Responsável Principal</label>
              <input
                type="text"
                value={edrp.delegation.responsiblePerson}
                onChange={(e) => handleFieldChange('delegation', 'responsiblePerson', e.target.value)}
                placeholder="Ex Name of Collaborator"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Setor Responsável</label>
              <select
                value={edrp.delegation.responsibleSector}
                onChange={(e) => handleFieldChange('delegation', 'responsibleSector', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium cursor-pointer h-[38px]"
              >
                {SECTORS.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Prioridade</label>
              <select
                value={edrp.delegation.priority}
                onChange={(e) => handleFieldChange('delegation', 'priority', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium cursor-pointer h-[38px]"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Prazo Interno de Entrega</label>
              <input
                type="date"
                value={edrp.delegation.internalDeadline}
                onChange={(e) => handleFieldChange('delegation', 'internalDeadline', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium h-[38px]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Status da Delegação</label>
              <select
                value={edrp.delegation.status}
                onChange={(e) => handleFieldChange('delegation', 'status', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium cursor-pointer h-[38px]"
              >
                <option value="nao_delegado">Não Delegado</option>
                <option value="pendente">Pendente de Aceite</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
                <option value="devolvido_com_pendencia">Devolvido com Pendência</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Tarefa Delegada (Descrição detalhada da exigência)</label>
            <textarea
              value={edrp.delegation.delegatedTask}
              onChange={(e) => handleFieldChange('delegation', 'delegatedTask', e.target.value)}
              placeholder="Descreva minuciosamente a instrução e parâmetros para o especialista..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[75px]"
            />
          </div>

          <div className="space-y-1.5 font-sans">
            <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Observações de Acompanhamento</label>
            <textarea
              value={edrp.delegation.notes}
              onChange={(e) => handleFieldChange('delegation', 'notes', e.target.value)}
              placeholder="Escreva notas e histórico sobre esta delegação..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px]"
            />
          </div>

          {/* INTEGRATIONS PREPARATION (Delegation Context) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-150">
            
            {/* TODOIST AREA */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <h5 className="text-[11px] font-bold text-gray-700 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Sincronizador Todoist (Preparação)
              </h5>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={edrp.delegation.todoistPrepared}
                  onChange={(e) => handleFieldChange('delegation', 'todoistPrepared', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Preparar Task no Todoist</span>
              </label>

              {edrp.delegation.todoistPrepared && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div className="space-y-1">
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Projeto Todoist</span>
                    <input
                      type="text"
                      value={edrp.delegation.todoistProject}
                      onChange={(e) => handleFieldChange('delegation', 'todoistProject', e.target.value)}
                      placeholder="Ex: Contencioso"
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">ID Tarefa Todoist</span>
                    <input
                      type="text"
                      value={edrp.delegation.todoistTaskId}
                      onChange={(e) => handleFieldChange('delegation', 'todoistTaskId', e.target.value)}
                      placeholder="Autogerado no sync"
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[11px]"
                    />
                  </div>
                </div>
              )}

              <div className="bg-blue-50 text-blue-800 rounded-xl p-3 border border-blue-100/60 flex gap-2 items-start text-[10px] font-medium leading-relaxed">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso:</strong> Integração Todoist preparada. Criação real de tarefa será implementada em build futuro com conector seguro.
                </span>
              </div>
            </div>

            {/* COLLABORATOR PANEL AREA */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <h5 className="text-[11px] font-bold text-gray-700 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Painel de Colaboradores (Preparação)
              </h5>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={edrp.delegation.collaboratorPanelPrepared}
                  onChange={(e) => handleFieldChange('delegation', 'collaboratorPanelPrepared', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Habilitar Atribuição Externa</span>
              </label>

              {edrp.delegation.collaboratorPanelPrepared && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div className="space-y-1">
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Usuário Designado</span>
                    <input
                      type="text"
                      value={edrp.delegation.collaboratorAssignedUser}
                      onChange={(e) => handleFieldChange('delegation', 'collaboratorAssignedUser', e.target.value)}
                      placeholder="E-mail ou ID do Advogado"
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Status da Atribuição</span>
                    <input
                      type="text"
                      value={edrp.delegation.collaboratorAssignmentStatus}
                      onChange={(e) => handleFieldChange('delegation', 'collaboratorAssignmentStatus', e.target.value)}
                      placeholder="Não Enviado"
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[11px]"
                    />
                  </div>
                </div>
              )}

              <div className="bg-amber-50 text-amber-900 rounded-xl p-3 border border-amber-100/60 flex gap-2 items-start text-[10px] font-medium leading-relaxed">
                <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso:</strong> Integração com Painel de Colaboradores será implementada em build futuro.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. REVISÃO - Regra 5 */}
        <div className="border border-gray-200 rounded-[1.5rem] p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <FileCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-950 tracking-tight uppercase">3. Preparação e Validação Técnica (Revisão)</h3>
              <p className="text-[10.5px] text-gray-400 mt-0.5">Controle de qualidade interdepartamental e dupla checagem.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Revisor Responsável</label>
              <input
                type="text"
                value={edrp.reviewPreparation.reviewResponsible}
                onChange={(e) => handleFieldChange('reviewPreparation', 'reviewResponsible', e.target.value)}
                placeholder="Ex: Auditor Senior"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Data Prevista de Revisão</label>
              <input
                type="date"
                value={edrp.reviewPreparation.reviewDate}
                onChange={(e) => handleFieldChange('reviewPreparation', 'reviewDate', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium h-[38px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Prazo Limite da Auditoria</label>
              <input
                type="date"
                value={edrp.reviewPreparation.reviewDeadline}
                onChange={(e) => handleFieldChange('reviewPreparation', 'reviewDeadline', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium h-[38px]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Status da Revisão</label>
              <select
                value={edrp.reviewPreparation.reviewStatus}
                onChange={(e) => handleFieldChange('reviewPreparation', 'reviewStatus', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium cursor-pointer h-[38px]"
              >
                <option value="aguardando_revisao">Aguardando Revisão</option>
                <option value="em_revisao">Em Revisão</option>
                <option value="ajustes_solicitados">Ajustes Solicitados</option>
                <option value="aprovado">Aprovado</option>
                <option value="reprovado">Reprovado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Exigência Formal</label>
              <div className="flex items-center h-[38px]">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={edrp.reviewPreparation.approvedForProtocol}
                    onChange={(e) => handleFieldChange('reviewPreparation', 'approvedForProtocol', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Aprovado para Protocolo</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Instruções de Revisão</label>
            <textarea
              value={edrp.reviewPreparation.reviewInstructions}
              onChange={(e) => handleFieldChange('reviewPreparation', 'reviewInstructions', e.target.value)}
              placeholder="Descreva observações focais sobre a revisão fática requisitada..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[75px]"
            />
          </div>

          {edrp.reviewPreparation.reviewStatus === 'ajustes_solicitados' && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-amber-600 font-bold">Ajustes Solicitados pelo Revisor</label>
              <textarea
                value={edrp.reviewPreparation.adjustmentsRequested}
                onChange={(e) => handleFieldChange('reviewPreparation', 'adjustmentsRequested', e.target.value)}
                placeholder="Liste os pontos específicos que necessitam de correção imediata antes da aprovação..."
                className="w-full bg-white border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[75px] bg-amber-50/25"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Observações Gerais de Revisão</label>
            <textarea
              value={edrp.reviewPreparation.notes}
              onChange={(e) => handleFieldChange('reviewPreparation', 'notes', e.target.value)}
              placeholder="Escreva anotações livres do departamento auditor..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px]"
            />
          </div>

          {/* INTEGRATIONS PREPARATION (Review Context) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-150 font-sans">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <h5 className="text-[11px] font-bold text-gray-700 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Auditoria no Todoist (Preparação)
              </h5>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={edrp.reviewPreparation.todoistPrepared}
                  onChange={(e) => handleFieldChange('reviewPreparation', 'todoistPrepared', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Preparar Task de Revisão no Todoist</span>
              </label>

              {edrp.reviewPreparation.todoistPrepared && (
                <div className="space-y-1 mt-2">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">ID Task Todoist de Revisão</span>
                  <input
                    type="text"
                    value={edrp.reviewPreparation.todoistTaskId}
                    onChange={(e) => handleFieldChange('reviewPreparation', 'todoistTaskId', e.target.value)}
                    placeholder="Auto ID no sync de auditoria"
                    className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[11px]"
                  />
                </div>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <h5 className="text-[11px] font-bold text-gray-700 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Auditor Externo (Preparação Colaboradores)
              </h5>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={edrp.reviewPreparation.collaboratorPanelPrepared}
                  onChange={(e) => handleFieldChange('reviewPreparation', 'collaboratorPanelPrepared', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Atribuir Revisor Externo</span>
              </label>

              {edrp.reviewPreparation.collaboratorPanelPrepared && (
                <div className="space-y-1 mt-2">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Advogado Revisor Externo</span>
                  <input
                    type="text"
                    value={edrp.reviewPreparation.collaboratorAssignedUser}
                    onChange={(e) => handleFieldChange('reviewPreparation', 'collaboratorAssignedUser', e.target.value)}
                    placeholder="Selecione ou insira o e-mail externo"
                    className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[11px]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. PREPARAÇÃO DE PROTOCOLO - Regra 6 */}
        <div className="border border-gray-200 rounded-[1.5rem] p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-950 tracking-tight uppercase">4. Planejamento de Protocolo</h3>
              <p className="text-[10.5px] text-gray-400 mt-0.5">Definições estratégicas preliminares para protocolo e ajuizamento tribunal.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Responsável pelo Protocolo</label>
              <input
                type="text"
                value={edrp.protocolPreparation.protocolResponsible}
                onChange={(e) => handleFieldChange('protocolPreparation', 'protocolResponsible', e.target.value)}
                placeholder="Ex Nome do Protocolador"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 animate-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Data Prevista de Protocolo</label>
              <input
                type="date"
                value={edrp.protocolPreparation.expectedProtocolDate}
                onChange={(e) => handleFieldChange('protocolPreparation', 'expectedProtocolDate', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium h-[38px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Sistema Governamental de Protocolo</label>
              <input
                type="text"
                value={edrp.protocolPreparation.protocolSystem}
                onChange={(e) => handleFieldChange('protocolPreparation', 'protocolSystem', e.target.value)}
                placeholder="Ex: PJe, e-SAJ, Projudi, Creta"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium h-[38px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Nº do Processo (CNJ)</label>
              <input
                type="text"
                value={edrp.protocolPreparation.processNumber}
                onChange={(e) => handleFieldChange('protocolPreparation', 'processNumber', e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Status de Protocolo</label>
              <select
                value={edrp.protocolPreparation.protocolStatus}
                onChange={(e) => handleFieldChange('protocolPreparation', 'protocolStatus', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium cursor-pointer h-[38px]"
              >
                <option value="nao_preparado">Não Preparado</option>
                <option value="aguardando_revisao">Aguardando Auditoria/Revisão</option>
                <option value="pronto_para_protocolar">Pronto para Protocolizar</option>
                <option value="agendado">Protocolo Agendado</option>
                <option value="protocolado">Original Protocolado</option>
                <option value="devolvido">Devolvido com Exigência</option>
                <option value="cancelado">Cancelado Departamental</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Instruções Práticas de Protocolo</label>
            <textarea
              value={edrp.protocolPreparation.protocolInstructions}
              onChange={(e) => handleFieldChange('protocolPreparation', 'protocolInstructions', e.target.value)}
              placeholder="Descreva particularidades do tribunal, segredo de justiça, tutela de urgência..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[75px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-400">Observações adicionais de Protocolo</label>
            <textarea
              value={edrp.protocolPreparation.notes}
              onChange={(e) => handleFieldChange('protocolPreparation', 'notes', e.target.value)}
              placeholder="Indique notas complementares técnicas aqui..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px]"
            />
          </div>

          {/* CHECKBOX REVEALING CHECKS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-150">
            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700">
              <input
                type="checkbox"
                checked={edrp.protocolPreparation.requiresCNJ}
                onChange={(e) => handleFieldChange('protocolPreparation', 'requiresCNJ', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Requer Número CNJ Ativo</span>
            </label>

            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700">
              <input
                type="checkbox"
                checked={edrp.protocolPreparation.proofOfProtocolPrepared}
                onChange={(e) => handleFieldChange('protocolPreparation', 'proofOfProtocolPrepared', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Comprovante Preparado</span>
            </label>

            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700">
              <input
                type="checkbox"
                checked={edrp.protocolPreparation.googleDrivePrepared}
                onChange={(e) => handleFieldChange('protocolPreparation', 'googleDrivePrepared', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Pasta no Google Drive Pronta</span>
            </label>
          </div>
        </div>

        {/* 6. ALERTAS DO EDRP - Regra 9 & Regra 10 */}
        <div className="border border-gray-200 rounded-[1.5rem] p-6 space-y-4 bg-gray-50/45">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans font-extrabold text-gray-950 uppercase tracking-widest flex items-center gap-1.5">
              Diagnóstico Preventivo de Integridade do EDRP
            </span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Abaixo estão sinalizados os alertas fáticos e procedimentais do caso que alimentarão o Relatório Final de Integridade do BOSS. O salvamento não é interrompido por estes alertas fáticos.
          </p>

          {validationAlerts.length === 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs flex gap-3 items-center font-semibold leading-relaxed">
              <Check className="text-emerald-500 shrink-0" size={16} />
              <span>Excelente! Nenhum aviso ou inconsistência detectados para este rascunho de EDRP.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {validationAlerts.map((alert, idx) => {
                const isError = alert.type === 'error';
                const isWarning = alert.type === 'warning';
                
                let boxClass = 'bg-blue-50/60 border-blue-105 text-blue-900';
                let Icon = Info;
                let textStyle = 'text-blue-500';

                if (isError) {
                  boxClass = 'bg-red-50/60 border-red-105 text-red-900';
                  Icon = AlertCircle;
                  textStyle = 'text-red-500';
                } else if (isWarning) {
                  boxClass = 'bg-amber-50/60 border-amber-105 text-amber-900';
                  Icon = AlertTriangle;
                  textStyle = 'text-amber-500';
                }

                return (
                  <div key={idx} className={`p-3 border rounded-xl flex gap-x-3 items-start text-xs ${boxClass}`}>
                    <Icon size={15} className={`${textStyle} shrink-0 mt-0.5`} />
                    <div className="font-semibold leading-normal">{alert.msg}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 7. BOTÕES FINAIS - Regra 8 */}
        <div className="flex flex-col xl:flex-row xl:justify-between gap-4 pt-6 mt-8 border-t border-gray-150">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => navigate(flowRoutes.financeiro(caseId!))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <ArrowLeft size={14} />
              Voltar ao Financeiro
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-indigo-200 hover:border-indigo-300 text-indigo-700 bg-indigo-50/50 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Salvar EDRP
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'home')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 bg-white hover:bg-gray-50 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
            >
              Salvar e Sair
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'revisao')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-md"
            >
              <span>Salvar e Avançar para Revisão</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
