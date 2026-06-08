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
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCheck,
  User,
  Loader2,
  Calendar,
  ExternalLink,
  Clock,
  Terminal,
  Search,
  Users,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface ReviewFormalData {
  reviewerName: string;
  reviewDate: string;
  reviewDeadline: string;
  reviewStatus: 'aguardando_revisao' | 'em_revisao' | 'ajustes_solicitados' | 'aprovado' | 'reprovado' | 'aprovada_sem_ressalvas' | 'aprovada_com_ressalvas' | 'nao_aprovada';
  approvedForProtocol: boolean;
  requestedAdjustments: string;
  finalNotes: string;
  forcedAdvance: boolean;
  forcedAdvanceReason: string;
  completedAt: string;
  updatedAt: string;
}

interface AgendaSecretariaData {
  schedulerResponsible: string;
  scheduleType: 'estruturacao' | 'revisao' | 'estruturacao_revisao';
  suggestedDate: string;
  suggestedTime: string;
  estimatedDuration: string;
  priority: 'baixa' | 'media' | 'alta';
  secretariaNotes: string;
  scheduleStatus: 'pendente' | 'solicitado' | 'agendado' | 'reagendado' | 'concluido' | 'cancelado';
  
  // delegation and Todoist preparation fields
  responsibleUser: string;
  protocolUser: string;
  protocolDate: string;
  reviewerUser: string;
  projectId: string;
  projectName: string;
  todoistParentTaskId: string;
  isProtocolDateCustomized: boolean;
  todoistPayload: any;
  todoistLogs: string[];
}

const DEFAULT_REVIEW: ReviewFormalData = {
  reviewerName: '',
  reviewDate: '',
  reviewDeadline: '',
  reviewStatus: 'aguardando_revisao',
  approvedForProtocol: false,
  requestedAdjustments: '',
  finalNotes: '',
  forcedAdvance: false,
  forcedAdvanceReason: '',
  completedAt: '',
  updatedAt: ''
};

const TEAM_MEMBERS = [
  'Dr. Arthur Giffoni',
  'Dra. Mariana Vasconcelos',
  'Dr. Ricardo Rodrigues',
  'Dra. Beatriz Ramos',
  'Dr. Carlos Eduardo'
];

const CASCADE_REVISORS: { [key: string]: string } = {
  'Dr. Arthur Giffoni': 'Dra. Mariana Vasconcelos',
  'Dra. Mariana Vasconcelos': 'Dr. Arthur Giffoni',
  'Dr. Ricardo Rodrigues': 'Dra. Beatriz Ramos',
  'Dra. Beatriz Ramos': 'Dr. Arthur Giffoni',
  'Dr. Carlos Eduardo': 'Dra. Beatriz Ramos'
};

const PROJECT_SUGGESTIONS: { [key: string]: { id: string; name: string } } = {
  'Dr. Arthur Giffoni': { id: 'p_101', name: '@Giffoni - Contencioso Geral' },
  'Dra. Mariana Vasconcelos': { id: 'p_103', name: '@Giffoni - Direito de Família' },
  'Dr. Ricardo Rodrigues': { id: 'p_102', name: '@Giffoni - Planejamento Previdenciário' },
  'Dra. Beatriz Ramos': { id: 'p_104', name: '@Giffoni - Trabalhista e Previdenciário' },
  'Dr. Carlos Eduardo': { id: 'p_105', name: '@Giffoni - Administrativo e Contratos' }
};

const ALL_MOCK_PROJECTS = [
  { id: 'p_101', name: '@Giffoni - Contencioso Geral' },
  { id: 'p_102', name: '@Giffoni - Planejamento Previdenciário' },
  { id: 'p_103', name: '@Giffoni - Direito de Família' },
  { id: 'p_104', name: '@Giffoni - Trabalhista e Previdenciário' },
  { id: 'p_105', name: '@Giffoni - Administrativo e Contratos' },
  { id: 'p_106', name: '@Giffoni - Tributário' },
  { id: 'p_107', name: '@Giffoni - Penal e Defesa' }
];

const SECRETARIA_USERS = [
  'Secretaria Executiva RGR',
  'Ana Carolina (Gestora Comercial)',
  'Felipe Santos (Atendimento)',
  'Mariana Vasconcelos'
];

const calculateSuggestedDate = (priority: 'baixa' | 'media' | 'alta'): string => {
  const today = new Date();
  let daysToAdd = 30;
  if (priority === 'media') daysToAdd = 15;
  if (priority === 'alta') daysToAdd = 5;
  
  today.setDate(today.getDate() + daysToAdd);
  return today.toISOString().split('T')[0];
};

const DEFAULT_AGENDA: AgendaSecretariaData = {
  schedulerResponsible: SECRETARIA_USERS[0],
  scheduleType: 'estruturacao',
  suggestedDate: calculateSuggestedDate('baixa'),
  suggestedTime: '09:00',
  estimatedDuration: '02:00',
  priority: 'baixa',
  secretariaNotes: '',
  scheduleStatus: 'pendente',
  responsibleUser: TEAM_MEMBERS[0],
  protocolUser: TEAM_MEMBERS[0],
  protocolDate: calculateSuggestedDate('baixa'),
  reviewerUser: CASCADE_REVISORS[TEAM_MEMBERS[0]],
  projectId: PROJECT_SUGGESTIONS[TEAM_MEMBERS[0]].id,
  projectName: PROJECT_SUGGESTIONS[TEAM_MEMBERS[0]].name,
  todoistParentTaskId: '',
  isProtocolDateCustomized: false,
  todoistPayload: null,
  todoistLogs: []
};

export default function RevisaoFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [review, setReview] = useState<ReviewFormalData>(DEFAULT_REVIEW);
  const [agenda, setAgenda] = useState<AgendaSecretariaData>(DEFAULT_AGENDA);
  const [showForcedDialog, setShowForcedDialog] = useState(false);

  // Load from DB
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

        if (cData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', cData.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        const rawReview = cData.reviewFormal || {};
        const edrpReview = cData.edrp?.reviewPreparation || {};
        
        let initialStatus = rawReview.reviewStatus || 'aguardando_revisao';
        let initialAdjustments = rawReview.requestedAdjustments || '';
        let initialApproved = rawReview.approvedForProtocol || false;

        // Prevent duplication: if EDRP already has reviews, we inherit them
        const hasEdrpAuditCompleted = edrpReview.completed || edrpReview.reviewStatus === 'aprovado' || edrpReview.reviewStatus === 'reprovado' || edrpReview.reviewStatus === 'ajustes_solicitados';
        if (hasEdrpAuditCompleted) {
          if (!rawReview.reviewStatus || rawReview.reviewStatus === 'aguardando_revisao') {
            if (edrpReview.reviewStatus === 'aprovado') {
              initialStatus = 'aprovada_sem_ressalvas';
              initialApproved = true;
            } else if (edrpReview.reviewStatus === 'reprovado') {
              initialStatus = 'nao_aprovada';
              initialApproved = false;
            } else if (edrpReview.reviewStatus === 'ajustes_solicitados') {
              initialStatus = 'aprovada_com_ressalvas';
              initialApproved = false;
            }
            initialAdjustments = edrpReview.adjustmentsRequested || edrpReview.reviewInstructions || '';
          }
        }

        const merged: ReviewFormalData = {
          reviewerName: rawReview.reviewerName || edrpReview.reviewResponsible || '',
          reviewDate: rawReview.reviewDate || edrpReview.reviewDate || '',
          reviewDeadline: rawReview.reviewDeadline || edrpReview.reviewDeadline || '',
          reviewStatus: initialStatus,
          approvedForProtocol: initialApproved,
          requestedAdjustments: initialAdjustments,
          finalNotes: rawReview.finalNotes || edrpReview.notes || '',
          forcedAdvance: rawReview.forcedAdvance || false,
          forcedAdvanceReason: rawReview.forcedAdvanceReason || '',
          completedAt: rawReview.completedAt || edrpReview.completedAt || '',
          updatedAt: rawReview.updatedAt ?? ''
        };

        setReview(merged);

        const rawAgenda = cData.agendaSecretaria || {};
        const mergedAgenda: AgendaSecretariaData = {
          ...DEFAULT_AGENDA,
          ...rawAgenda,
          todoistParentTaskId: rawAgenda.todoistParentTaskId || cData.todoistTaskId || cData.todoistParentTaskId || ''
        };
        if (!mergedAgenda.suggestedDate) {
          mergedAgenda.suggestedDate = calculateSuggestedDate(mergedAgenda.priority);
        }
        if (!mergedAgenda.protocolDate && mergedAgenda.suggestedDate) {
          mergedAgenda.protocolDate = mergedAgenda.suggestedDate;
        }
        setAgenda(mergedAgenda);

      } catch (err: any) {
        console.error(err);
        setError(`Erro ao carregar dados de revisão: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  // Status mapping
  const resolveStatusInterno = (status: string) => {
    switch (status) {
      case 'aprovada_sem_ressalvas':
      case 'aprovado':
        return 'Aprovado para protocolo';
      case 'aprovada_com_ressalvas':
      case 'ajustes_solicitados':
        return 'Com ressalva';
      case 'nao_aprovada':
      case 'reprovado':
        return 'Com pendência';
      case 'aguardando_revisao':
        return 'Aguardando revisão';
      case 'em_revisao':
        return 'Em revisão';
      default:
        return 'Em revisão';
    }
  };

  const handleChange = (field: keyof ReviewFormalData, value: any) => {
    setReview((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === 'reviewStatus') {
        if (value === 'aprovada_sem_ressalvas' || value === 'aprovado') {
          updated.approvedForProtocol = true;
          updated.forcedAdvance = false;
        } else {
          updated.approvedForProtocol = false;
        }
      }

      if (field === 'approvedForProtocol') {
        if (value === true) {
          updated.reviewStatus = 'aprovada_sem_ressalvas';
          updated.forcedAdvance = false;
        } else if (updated.reviewStatus === 'aprovada_sem_ressalvas' || updated.reviewStatus === 'aprovado') {
          updated.reviewStatus = 'aguardando_revisao';
        }
      }

      return updated;
    });
  };

  // Master Save Function
  const handleSave = async (silent = false, action: 'none' | 'exit' | 'advance' = 'none') => {
    if (!caseId) return false;
    setSaving(true);
    setError(null);
    if (!silent) setSuccess(null);

    try {
      const now = new Date().toISOString();
      const statusInt = resolveStatusInterno(review.reviewStatus);

      // Validate mandatory fields if forced advance is on
      if (review.forcedAdvance && !review.forcedAdvanceReason.trim()) {
        throw new Error('O motivo da liberação forçada de aprovação é obrigatório.');
      }

      const payload: any = {
        reviewFormal: {
          ...review,
          completedAt: (review.reviewStatus === 'aprovada_sem_ressalvas' || review.reviewStatus === 'aprovado') ? (review.completedAt || now) : '',
          updatedAt: now
        },
        agendaSecretaria: {
          ...agenda,
          todoistParentTaskId: agenda.todoistParentTaskId || caseObj?.todoistTaskId || caseObj?.todoistParentTaskId || ''
        },
        statusInterno: statusInt,
        updatedAt: now
      };

      if (action === 'advance') {
        payload.productionStage = 'protocolo';
      }

      await updateDoc(doc(db, 'cases', caseId!), payload);

      setCaseObj((prev: any) => ({
        ...prev,
        reviewFormal: payload.reviewFormal,
        agendaSecretaria: payload.agendaSecretaria,
        statusInterno: statusInt,
        productionStage: action === 'advance' ? 'protocolo' : prev.productionStage
      }));

      if (!silent) {
        setSuccess('Dados de Revisão e Agenda da Secretaria atualizados com sucesso!');
      }

      if (action === 'exit') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      } else if (action === 'advance') {
        navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/protocolo`);
      }

      return true;
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar revisão e agenda técnica: ${err.message || err}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const handleAgendaFieldChange = (field: keyof AgendaSecretariaData, value: any) => {
    setAgenda((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Delegation rules:
      // "Quem recebe a delegação executa. Quem executa também fica designado para protocolo."
      if (field === 'responsibleUser') {
        updated.protocolUser = value;
        // "Revisor deve ser selecionado por tarefa em cascata."
        if (CASCADE_REVISORS[value]) {
          updated.reviewerUser = CASCADE_REVISORS[value];
        } else {
          updated.reviewerUser = TEAM_MEMBERS[0];
        }
        // "Projeto Todoist deve ser selecionado por buscador inteligente sincronizado com a pessoa selecionada."
        if (PROJECT_SUGGESTIONS[value]) {
          updated.projectId = PROJECT_SUGGESTIONS[value].id;
          updated.projectName = PROJECT_SUGGESTIONS[value].name;
        }
      }

      // "A data prevista do protocolo é igual à data prevista da revisão, salvo alteração manual."
      if (field === 'suggestedDate') {
        if (!prev.isProtocolDateCustomized) {
          updated.protocolDate = value;
        }
      }

      if (field === 'protocolDate') {
        updated.isProtocolDateCustomized = true;
      }

      return updated;
    });
  };

  const handleAgendaPriorityChange = (priority: 'baixa' | 'media' | 'alta') => {
    const updatedDate = calculateSuggestedDate(priority);
    setAgenda((prev) => {
      const updated = {
        ...prev,
        priority,
        suggestedDate: updatedDate
      };
      if (!prev.isProtocolDateCustomized) {
        updated.protocolDate = updatedDate;
      }
      return updated;
    });
  };

  const handlePrepareTodoist = () => {
    const createdBy = localStorage.getItem('boss_user_email') || 'direito.rgr@gmail.com';
    const commentsEsc = `Estruturar o caso vinculado ao case_id: ${caseId}. Conferir dados do cliente, modalidade da demanda, documentos solicitados, riscos, pedidos, competência e estratégia processual. Após finalizar, atualizar o BOSS e sinalizar para revisão.`;
    const commentsRev = `Revisar a estruturação vinculada ao case_id: ${caseId}. Conferir coerência jurídica, documentos, dados cadastrais, pedidos, competência, riscos e aptidão para protocolo. Em caso de ressalvas, preencher instruções objetivas no BOSS.`;

    let commentsTemplate = '';
    if (agenda.scheduleType === 'estruturacao') {
      commentsTemplate = commentsEsc;
    } else if (agenda.scheduleType === 'revisao') {
      commentsTemplate = commentsRev;
    } else {
      commentsTemplate = `ESTRUTURAÇÃO: ${commentsEsc}\n\nREVISÃO: ${commentsRev}`;
    }

    const payload = {
      caseId: caseId || '',
      todoistParentTaskId: agenda.todoistParentTaskId || caseObj?.todoistTaskId || caseObj?.todoistParentTaskId || 'task_main_id_placeholder',
      taskType: agenda.scheduleType,
      title: `[Secretaria] ${agenda.scheduleType === 'estruturacao_revisao' ? 'Estruturação e Revisão' : agenda.scheduleType === 'estruturacao' ? 'Estruturação' : 'Revisão'} - Caso #${caseId}`,
      responsibleUser: agenda.responsibleUser,
      reviewerUser: agenda.reviewerUser,
      dueDate: agenda.suggestedDate,
      priority: agenda.priority,
      projectId: agenda.projectId,
      commentsTemplate,
      createdBy,
      createdAt: new Date().toISOString()
    };

    const logs = [
      `[${new Date().toLocaleTimeString()}] ✔ Tarefa principal vinculada ao case_id [${caseId}] localizada com sucesso no Todoist corporativo.`,
      `[${new Date().toLocaleTimeString()}] ✔ Subtarefa do tipo "${agenda.scheduleType === 'estruturacao_revisao' ? 'Estruturação & Revisão' : agenda.scheduleType}" estruturada e preparada na fila do microsserviço.`,
      `[${new Date().toLocaleTimeString()}] ✔ Projeto Todoist "${agenda.projectName || 'Não informado'}" (ID: ${agenda.projectId || 'N/A'}) selecionado de forma inteligente pelo BOSS.`,
      `[${new Date().toLocaleTimeString()}] ✔ Operador responsável designado: "${agenda.responsibleUser || 'Não informado'}".`,
      `[${new Date().toLocaleTimeString()}] ✔ Revisor designado via cascata: "${agenda.reviewerUser || 'Não informado'}".`,
      `[${new Date().toLocaleTimeString()}] ✔ Status do microsserviço Todoist: Preparado / Aguardando Sincronização Automática ("todoist_service_idle").`
    ];

    setAgenda(prev => ({
      ...prev,
      todoistPayload: payload,
      todoistLogs: logs
    }));
  };

  const handleAdvanceValidation = async () => {
    // Check if approved for protocol
    const isApproved = review.approvedForProtocol || review.reviewStatus === 'aprovado' || review.reviewStatus === 'aprovada_sem_ressalvas';

    if (isApproved) {
      await handleSave(true, 'advance');
    } else {
      // If forced advance is already checked and reason filled, proceed
      if (review.forcedAdvance && review.forcedAdvanceReason.trim()) {
        await handleSave(true, 'advance');
      } else {
        // Trigger forced advance warning
        setShowForcedDialog(true);
      }
    }
  };

  const handleConfirmForcedAdvance = async (reason: string) => {
    if (!reason.trim()) {
      setError('Por favor, informe um motivo legível para a liberação sem revisão aprovada.');
      return;
    }

    setReview((prev) => ({
      ...prev,
      forcedAdvance: true,
      forcedAdvanceReason: reason
    }));

    // Trigger save with forced advance set
    setReview((prev) => {
      const upd = { ...prev, forcedAdvance: true, forcedAdvanceReason: reason };
      // Save it immediately and transition
      setTimeout(async () => {
        try {
          const now = new Date().toISOString();
          const statusInt = resolveStatusInterno(upd.reviewStatus);

          const payload: any = {
            reviewFormal: {
              ...upd,
              updatedAt: now
            },
            agendaSecretaria: {
              ...agenda,
              todoistParentTaskId: agenda.todoistParentTaskId || caseObj?.todoistTaskId || caseObj?.todoistParentTaskId || ''
            },
            statusInterno: statusInt,
            productionStage: 'protocolo',
            updatedAt: now
          };

          await updateDoc(doc(db, 'cases', caseId!), payload);
          setShowForcedDialog(false);
          navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/protocolo`);
        } catch (err: any) {
          setError(`Erro ao registrar liberação forçada: ${err.message}`);
        }
      }, 50);
      return prev;
    });
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Revisão" caseId={caseId}>
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="text-xs font-bold font-mono text-gray-500 tracking-wide uppercase">
            Carregando Revisão do Caso...
          </span>
        </div>
      </FluxoStepLayout>
    );
  }

  const resolvedClientName = client
    ? (client.type === 'PF'
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cadastro Sem Nome')
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Razão Social Ausente'))
    : 'Buscando Cliente...';

  const resolvedClientSlug = client?.slug || 'sem-slug';

  return (
    <FluxoStepLayout
      stepName="Revisão"
      caseId={caseId}
      statusText={caseObj?.statusInterno || 'Aguardando revisão'}
    >
      <div className="space-y-8 font-sans">
        
        {/* Error and Success Banners */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs flex gap-3 items-center">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{success}</span>
          </div>
        )}

        {/* TOP META CARD */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-[1.5rem] p-6">
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
                <span>• ID: <strong className="font-mono text-gray-600">{caseId}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl border border-gray-150 bg-white text-gray-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Estágio: {caseObj?.productionStage || 'Início'}
              </span>
            </div>
          </div>
        </div>

        {/* DUPLICATION PREVENTION NOTICE CARD */}
        {caseObj?.edrp?.reviewPreparation?.completed && (
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs flex gap-3.5 items-start">
            <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold uppercase tracking-wide text-indigo-950 block text-[10px]">Parecer Importado de EDRP (Etapa de Estruturação)</span>
              <p className="text-indigo-900 leading-relaxed font-semibold">
                Conforme as regras de conformidade do BOSS, identificamos que um parecer técnico de auditoria já foi realizado na <strong>Etapa 07 (EDRP)</strong> para este caso. Para evitar duplicação ou divergência de formulários, esses dados foram sincronizados automaticamente. Você pode alterar as datas ou emitir novas ressalvas abaixo se necessário.
              </p>
            </div>
          </div>
        )}

        {/* FORCED ADVANCE ALERT WARNING */}
        {showForcedDialog && (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl space-y-4 shadow-sm animate-fade-in">
            <div className="flex gap-3">
              <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-xs text-amber-950 uppercase tracking-tight">Confirmação de Liberação sem Aprovação</h4>
                <p className="text-xs text-amber-900/85 mt-1 leading-relaxed">
                  Avançar sem revisão aprovada gerará um <strong>alerta crítico</strong> no relatório de integridade que bloqueará o faturamento seguro do processo. Para forçar a etapa de protocolo, você deve justificar esta conduta operacional.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">Motivo da liberação forçada *</label>
              <textarea
                value={review.forcedAdvanceReason}
                onChange={(e) => handleChange('forcedAdvanceReason', e.target.value)}
                placeholder="Exemplo: Autorização especial da diretoria operacional devido ao prazo decadencial..."
                className="w-full bg-white border border-amber-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs text-amber-950 min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowForcedDialog(false)}
                className="text-xs text-gray-500 font-bold hover:text-gray-900 bg-white border border-gray-200 py-2 px-4 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmForcedAdvance(review.forcedAdvanceReason)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar mesmo assim
              </button>
            </div>
          </div>
        )}

        {/* MAJOR BLOCK: AGENDA ADMINISTRATIVA DA SECRETARIA */}
        <div className="border border-gray-150 rounded-3xl p-6 bg-slate-50/50 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Agenda Administrativa da Secretaria</h3>
                <p className="text-[10.5px] text-gray-500 mt-0.5">Planejamento, agendamento de estruturação, revisão e integração com o Todoist.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-center font-mono text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-150">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              <span>ESTRUTURAÇÃO VINCULADA AO CASE ID</span>
            </div>
          </div>

          {/* BASIC SCHEDULING FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-ash-500">Responsável pelo Agendamento</label>
              <select
                value={agenda.schedulerResponsible}
                onChange={(e) => handleAgendaFieldChange('schedulerResponsible', e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-gray-800 transition-all font-semibold cursor-pointer h-[40px]"
              >
                {SECRETARIA_USERS.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-ash-500">Tipo de Agendamento</label>
              <select
                value={agenda.scheduleType}
                onChange={(e) => handleAgendaFieldChange('scheduleType', e.target.value as any)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-gray-800 transition-all font-semibold cursor-pointer h-[40px]"
              >
                <option value="estruturacao">Estruturação</option>
                <option value="revisao">Revisão</option>
                <option value="estruturacao_revisao">Estruturação e Revisão</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-ash-500">Status do Agendamento</label>
              <select
                value={agenda.scheduleStatus}
                onChange={(e) => handleAgendaFieldChange('scheduleStatus', e.target.value as any)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-gray-800 transition-all font-bold cursor-pointer h-[40px]"
              >
                <option value="pendente">Pendente</option>
                <option value="solicitado">Solicitado</option>
                <option value="agendado">Agendado</option>
                <option value="reagendado">Reagendado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* DATES & TIMES & PRIORITY */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-gray-150">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Data Sugerida</label>
              <input
                type="date"
                value={agenda.suggestedDate}
                onChange={(e) => handleAgendaFieldChange('suggestedDate', e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium h-[38px] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Horário Sugerido</label>
              <input
                type="time"
                value={agenda.suggestedTime}
                onChange={(e) => handleAgendaFieldChange('suggestedTime', e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium h-[38px] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Duração Estimada</label>
              <select
                value={agenda.estimatedDuration}
                onChange={(e) => handleAgendaFieldChange('estimatedDuration', e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium h-[38px] transition-all cursor-pointer"
              >
                <option value="00:30">30 minutos</option>
                <option value="01:00">1 hora</option>
                <option value="01:30">1 hora e 30 min</option>
                <option value="02:00">2 horas</option>
                <option value="03:00">3 horas</option>
                <option value="04:00">4 horas</option>
              </select>
            </div>

            <div className="space-y-1.2 col-span-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Prioridade e Prazo Limite</label>
              <div className="grid grid-cols-3 gap-1 h-[38px] items-center">
                {(['baixa', 'media', 'alta'] as const).map((level) => {
                  const active = agenda.priority === level;
                  let colorClass = 'border-gray-200 text-gray-600 hover:bg-gray-50';
                  if (active) {
                    if (level === 'baixa') colorClass = 'bg-green-500 text-white border-green-500';
                    if (level === 'media') colorClass = 'bg-amber-500 text-white border-amber-500';
                    if (level === 'alta') colorClass = 'bg-rose-500 text-white border-rose-500';
                  }
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleAgendaPriorityChange(level)}
                      className={`text-[9.5px] font-extrabold uppercase tracking-wider py-2 rounded-lg border text-center transition-all cursor-pointer ${colorClass}`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DELEGATION ENGINE & ADVANCED INTEGRATIONS BLOCK */}
          <div className="bg-slate-100/60 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Users size={14} className="text-slate-500" />
              Regras Jurídicas de Delegação e Busca de Projetos
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* DECOY AND ACTIONS */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Destinatário da Delegação (Executa & Protocola) *</label>
                  <select
                    value={agenda.responsibleUser}
                    onChange={(e) => handleAgendaFieldChange('responsibleUser', e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-gray-800 transition-all font-semibold cursor-pointer h-[40px]"
                  >
                    {TEAM_MEMBERS.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </select>
                  <p className="text-[9.5px] text-gray-400 italic">"Quem recebe executa e também fica responsável pelo protocolo final."</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Designado para Protocolo</label>
                    <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-500 font-bold">
                      {agenda.protocolUser}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Data Unificada do Protocolo</label>
                    <input
                      type="date"
                      value={agenda.protocolDate}
                      onChange={(e) => handleAgendaFieldChange('protocolDate', e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs text-gray-800 font-semibold h-[38px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Auditor Revisor Designado (Cascata) 👑</label>
                  <div className="bg-indigo-50 border border-indigo-150 rounded-xl px-3.5 py-3 text-xs text-indigo-900 font-extrabold flex items-center justify-between">
                    <span>{agenda.reviewerUser}</span>
                    <span className="text-[9px] uppercase tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded font-mono">CASCATA ATIVADA</span>
                  </div>
                  <p className="text-[9.5px] text-indigo-600">Revisor escolhido de acordo com a regra de submissão do responsável executivo.</p>
                </div>
              </div>

              {/* SEARCH PROJECTS & TODOIST LINK */}
              <div className="space-y-3.5">
                <div className="space-y-1.5 relative">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Buscador Inteligente de Projetos Todoist 🔍</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Digite para pesquisar projetos (ex: Trabalhista, Família...)"
                      value={projectSearch}
                      onChange={(e) => {
                        setProjectSearch(e.target.value);
                        setShowProjectDropdown(true);
                      }}
                      onFocus={() => setShowProjectDropdown(true)}
                      className="w-full bg-white border border-indigo-200/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-indigo-950 transition-all font-semibold"
                    />
                    <Search size={14} className="absolute left-3.5 top-3.5 text-indigo-400" />
                  </div>

                  {showProjectDropdown && (
                    <div className="absolute z-30 left-0 right-0 max-h-48 overflow-y-auto bg-white border border-gray-150 rounded-xl shadow-lg mt-1 p-1 sm:text-xs">
                      {ALL_MOCK_PROJECTS.filter(p => !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(prj => (
                        <button
                          key={prj.id}
                          type="button"
                          onClick={() => {
                            handleAgendaFieldChange('projectId', prj.id);
                            handleAgendaFieldChange('projectName', prj.name);
                            setProjectSearch('');
                            setShowProjectDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-xs font-medium text-gray-700 flex items-center justify-between"
                        >
                          <span>{prj.name}</span>
                          <span className="font-mono text-[9px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{prj.id}</span>
                        </button>
                      ))}
                      <div className="p-2 border-t border-gray-100 text-center text-[10px] text-gray-400 font-mono">
                        Selecione um projeto para vincular as subtarefas no Todoist.
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100/70 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-black uppercase tracking-wider text-indigo-500">PROJETO VINCULADO</span>
                      <span className="text-xs font-bold text-gray-800">{agenda.projectName}</span>
                    </div>
                    <span className="font-mono text-[10px] bg-white border border-indigo-250 text-indigo-700 px-2 py-1 rounded">ID: {agenda.projectId}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">ID da Tarefa Principal (Todoist case_id)</label>
                  <input
                    type="text"
                    value={agenda.todoistParentTaskId}
                    onChange={(e) => handleAgendaFieldChange('todoistParentTaskId', e.target.value)}
                    placeholder="Vazio (Será resolvido no microsserviço)"
                    className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-gray-800"
                  />
                  <p className="text-[9.5px] text-gray-400">Subtarefas criadas no Todoist serão filhas desta tarefa principal.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handlePrepareTodoist}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-5 rounded-xl shadow-xs cursor-pointer transition-all uppercase tracking-wide"
              >
                <Sparkles size={14} className="animate-spin" />
                Sincronizar e Preparar Subtarefas no Todoist
              </button>
            </div>
          </div>

          {/* MOCK LOGS DISPLAY */}
          {agenda.todoistPayload && (
            <div className="space-y-2 p-4 bg-slate-900 rounded-2xl border border-slate-950 font-mono text-xs text-teal-400 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] uppercase text-slate-500 tracking-wider">
                <span className="flex items-center gap-2">
                  <Terminal size={12} />
                  Fila do Microsserviço de Integração (Todoist)
                </span>
                <span className="text-emerald-500 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900">PREPARADO</span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] leading-relaxed">
                {agenda.todoistLogs.map((log, i) => (
                  <p key={i} className="text-gray-300">{log}</p>
                ))}
              </div>
              <div className="border-t border-slate-800/80 pt-2.5 mt-2">
                <span className="block text-[9px] text-rose-400 uppercase font-bold tracking-widest mb-1">Payload Completo Preparado para Envio Futuro:</span>
                <pre className="text-[10.5px] leading-tight text-teal-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(agenda.todoistPayload, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Observações Gerais para a Secretaria</label>
            <textarea
              value={agenda.secretariaNotes || ''}
              onChange={(e) => handleAgendaFieldChange('secretariaNotes', e.target.value)}
              placeholder="Descreva instruções de agendamento de pautas, ausências ou avisos adicionais para a secretaria..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[75px]"
            />
          </div>
        </div>

        {/* FEEDBACK DE REVISÃO DO CASO */}
        <div className="border border-indigo-150 rounded-3xl p-6 bg-white space-y-6 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileCheck size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight">Decisão e Status de Auditoria do Caso</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Defina se a estruturação está apta para protocolo definitivo em juízo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-gray-500">Escolha o Parecer do Auditor Técnico *</label>
              <select
                value={review.reviewStatus}
                onChange={(e) => handleChange('reviewStatus', e.target.value as any)}
                className="w-full bg-white border border-gray-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 transition-all font-bold cursor-pointer h-[40px]"
              >
                <option value="aprovada_sem_ressalvas">Aprovada sem ressalvas — liberar protocolo</option>
                <option value="aprovada_com_ressalvas">Aprovada com ressalvas — ver instruções abaixo</option>
                <option value="nao_aprovada">Não aprovada — ajustes obrigatórios</option>
                <option value="aguardando_revisao">Aguardando Auditoria</option>
                <option value="em_revisao">Em Auditoria Crítica</option>
                {/* Legacy states tolerated in selection fallback */}
                <option value="aprovado" className="hidden">❇️ Aprovado para Distribuição</option>
                <option value="ajustes_solicitados" className="hidden">🚨 Ajustes Solicitados pelo Revisor</option>
                <option value="reprovado" className="hidden">❌ Reprovado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Liberação de Protocolo</label>
              <div className="flex items-center h-[38px]">
                <label className="inline-flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={review.approvedForProtocol}
                    onChange={(e) => handleChange('approvedForProtocol', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 transition-all"
                  />
                  <span>Confirmar liberação definitiva para protocolo</span>
                </label>
              </div>
            </div>
          </div>

          {/* INSTRUCTIONS AREA - KEEP EVERYTHING IN HERE */}
          <div className="space-y-2 p-4.5 bg-slate-50 border border-slate-200 rounded-2xl animate-fade-in">
            <label className="block text-[10px] font-black uppercase text-slate-800 tracking-wide">Instruções Objetivas de Ajustes e Observações Jurídicas</label>
            <p className="text-[9px] text-gray-400 mb-2">Descreva todos os pontos de melhoria, ressalvas ou observações essenciais levantadas na auditoria.</p>
            <textarea
              value={review.requestedAdjustments}
              onChange={(e) => handleChange('requestedAdjustments', e.target.value)}
              placeholder="Exemplo: Ajustar o valor da pretensão indenizatória com base na planilha de cálculo anexada e juntar comprovante de rendimentos atualizado."
              className="w-full bg-white border border-gray-250 rounded-xl p-3.5 text-xs text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[110px]"
            />
          </div>

          {/* FORCED ADVANCE DETAILS PERMANENT STATUS */}
          {review.forcedAdvance && (
            <div className="p-4 bg-red-50 border border-red-150 rounded-2xl space-y-1">
              <h5 className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={14} />
                Caso em Avanço Forçado sem Aprovação Técnica
              </h5>
              <p className="text-xs text-red-900 leading-relaxed font-semibold">
                Motivo registrado: <span className="font-normal italic">"{review.forcedAdvanceReason}"</span>
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM CONTROLS & NAVIGATION BUTTONS */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.delegacao(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white shadow-xs"
          >
            <ArrowLeft size={14} />
            Voltar para Delegação
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'none')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <Save size={13} />
              {saving ? 'Gravando...' : 'Salvar Revisão & Agenda'}
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
              onClick={handleAdvanceValidation}
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
