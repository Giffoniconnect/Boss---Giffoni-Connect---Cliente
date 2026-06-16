import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Info, 
  Scale, 
  FileText, 
  FileSignature, 
  FolderOpen, 
  AlertCircle,
  Loader2,
  CheckCircle,
  Briefcase,
  Copy,
  ExternalLink,
  Check,
  Search,
  RefreshCw,
  Folder,
  Calendar,
  Sliders,
  X,
  Tag,
  User,
  Flag,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';

function formatCNJ(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 20);
  let res = '';
  if (digits.length > 0) {
    res += digits.substring(0, 7);
  }
  if (digits.length > 7) {
    res += '-' + digits.substring(7, 9);
  }
  if (digits.length > 9) {
    res += '.' + digits.substring(9, 13);
  }
  if (digits.length > 13) {
    res += '.' + digits.substring(13, 14);
  }
  if (digits.length > 14) {
    res += '.' + digits.substring(14, 16);
  }
  if (digits.length > 16) {
    res += '.' + digits.substring(16, 20);
  }
  return res;
}

const TODOIST_INBOX_SENTINEL = "**TODOIST_INBOX**";
const TODOIST_INBOX_NAME = "Caixa de Entrada (Inbox)";

const isInvalidTodoistTaskIdentity = (taskId?: string, taskUrl?: string) => {
  const id = String(taskId || "").toLowerCase();
  const url = String(taskUrl || "").toLowerCase();

  return (
    !id ||
    !url ||
    id.includes("demo") ||
    id.includes("fake") ||
    id.includes("mock") ||
    url.includes("showcase") ||
    url.includes("demo") ||
    url.includes("fake") ||
    url.includes("mock") ||
    url.includes("undefined") ||
    url.includes("null")
  );
};

export default function TipoServico() {
  const { caseId } = useParams<{ caseId: string }>();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const clientId = searchParams.get('clientId');
  const safeCaseId = caseId || '';

  // Parsed subtype sub-page
  let subTypeRoute: 'peticao-inicial' | 'processo-judicial-em-andamento' | 'requerimento-administrativo' | 'outro-servico-administrativo' | null = null;
  if (pathname.endsWith('/peticao-inicial')) subTypeRoute = 'peticao-inicial';
  else if (pathname.endsWith('/processo-judicial-em-andamento')) subTypeRoute = 'processo-judicial-em-andamento';
  else if (pathname.endsWith('/requerimento-administrativo')) subTypeRoute = 'requerimento-administrativo';
  else if (pathname.endsWith('/outro-servico-administrativo')) subTypeRoute = 'outro-servico-administrativo';

  let currentStep: 'natureza' | 'judicial' | 'extrajudicial' | 'form' = 'natureza';
  if (pathname.endsWith('/judicial')) currentStep = 'judicial';
  else if (pathname.endsWith('/extrajudicial')) currentStep = 'extrajudicial';
  else if (subTypeRoute) currentStep = 'form';

  const getRouteTo = (step: 'natureza' | 'judicial' | 'extrajudicial') => {
    const query = clientId ? `?clientId=${clientId}` : '';
    if (safeCaseId) {
      if (step === 'natureza') return `/boss-giffoni-clientes/fluxo-producao/${safeCaseId}/tipo-producao${query}`;
      if (step === 'judicial') return `/boss-giffoni-clientes/fluxo-producao/${safeCaseId}/tipo-producao/judicial${query}`;
      if (step === 'extrajudicial') return `/boss-giffoni-clientes/fluxo-producao/${safeCaseId}/tipo-producao/extrajudicial${query}`;
    } else {
      if (step === 'natureza') return `/boss-giffoni-clientes/fluxo-producao/tipo-producao${query}`;
      if (step === 'judicial') return `/boss-giffoni-clientes/fluxo-producao/tipo-producao/judicial${query}`;
      if (step === 'extrajudicial') return `/boss-giffoni-clientes/fluxo-producao/tipo-producao/extrajudicial${query}`;
    }
    return '';
  };

  // Core Data States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Client context
  const [clientName, setClientName] = useState<string>('');
  const [clientSlug, setClientSlug] = useState<string>('');
  const [isEntrevistaIncomplete, setIsEntrevistaIncomplete] = useState(false);

  // Expanded tree states
  const [macroTypeSelection, setMacroTypeSelection] = useState<'judicial' | 'extrajudicial' | null>(null);

  // Specific Subtype Form States
  const [oppositeParty, setOppositeParty] = useState('');
  const [hasOppositeParty, setHasOppositeParty] = useState(false);
  const [assunto, setAssunto] = useState('');
  const [vara, setVara] = useState('');
  const [comarca, setComarca] = useState('');
  const [processNumber, setProcessNumber] = useState('');
  const [serviceSubtype, setServiceSubtype] = useState('');

  // Future Todoist status fields
  const [todoistTaskId, setTodoistTaskId] = useState('');
  const [todoistTaskUrl, setTodoistTaskUrl] = useState('');
  const [todoistTaskLogFalha, setTodoistTaskLogFalha] = useState('');
  const [todoistAutomationStatus, setTodoistAutomationStatus] = useState('aguardando');
  const [todoistLogs, setTodoistLogs] = useState<any[]>([]);

  const appendFrontendLogs = async (newLogs: any[]) => {
    if (!safeCaseId) return;
    const updatedNewLogs = newLogs.map(log => ({
      ...log,
      timestamp: log.timestamp || new Date().toISOString()
    }));

    setTodoistLogs(prev => {
      const merged = [...prev, ...updatedNewLogs];
      return merged
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-100);
    });

    try {
      const caseSnap = await getDoc(doc(db, 'cases', safeCaseId));
      let existingLogs: any[] = [];
      if (caseSnap.exists()) {
        const dataSnap = caseSnap.data();
        if (dataSnap && Array.isArray(dataSnap.todoistLogs)) {
          existingLogs = dataSnap.todoistLogs;
        }
      }
      let combined = [...existingLogs, ...updatedNewLogs];
      combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const limited = combined.slice(-100);

      await updateDoc(doc(db, 'cases', safeCaseId), { todoistLogs: limited });
      await setDoc(doc(db, 'casos', safeCaseId), { todoistLogs: limited }, { merge: true });
    } catch (err) {
      console.warn("Falha ao salvar logs do frontend no Firestore:", err);
    }
  };

  // Todoist Project and Search states
  const SHOW_TODOIST_QA_SIMULATION = false;
  const [todoistProjectId, setTodoistProjectId] = useState(TODOIST_INBOX_SENTINEL);
  const [todoistProjectName, setTodoistProjectName] = useState(TODOIST_INBOX_NAME);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [syncingProjects, setSyncingProjects] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [syncedProjectsList, setSyncedProjectsList] = useState([
    { id: TODOIST_INBOX_SENTINEL, name: TODOIST_INBOX_NAME },
    { id: 'contencioso_12048', name: 'Giffoni Advocacia - Contencioso' },
    { id: 'consultivo_39201', name: 'Giffoni Advocacia - Consultivo' },
    { id: 'triagem_peticao_88219', name: 'Petições Iniciais - Triagem' },
    { id: 'boss_especiais_11029', name: 'Projetos Especiais - Boss' },
    { id: 'familia_55029', name: 'Direito de Família' },
    { id: 'consumidor_44910', name: 'Direito do Consumidor' },
    { id: 'trabalho_33819', name: 'Direito do Trabalho' },
    { id: 'contratos_22102', name: 'Contratos fáticos' },
    { id: 'urgente_civil_99302', name: 'Processos Cíveis - Urgente' }
  ]);

  // Novas possibilidades: data, prazo, prioridade, etiqueta, responsável
  const [todoistDueDate, setTodoistDueDate] = useState('');
  const [todoistPriority, setTodoistPriority] = useState<number>(1);
  const [todoistLabels, setTodoistLabels] = useState('');
  const [todoistAssignee, setTodoistAssignee] = useState('');
  const [showTodoistLogs, setShowTodoistLogs] = useState(false);

  useEffect(() => {
    if (currentStep === 'judicial') {
      setMacroTypeSelection('judicial');
    } else if (currentStep === 'extrajudicial') {
      setMacroTypeSelection('extrajudicial');
    } else if (subTypeRoute) {
      const macro = (subTypeRoute === 'peticao-inicial' || subTypeRoute === 'processo-judicial-em-andamento') ? 'judicial' : 'extrajudicial';
      setMacroTypeSelection(macro);
    }
  }, [currentStep, subTypeRoute]);

  useEffect(() => {
    if (subTypeRoute === 'peticao-inicial') {
      setVara('A definir');
    }
  }, [subTypeRoute]);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadContext() {
      setError(null);
      setFetching(true);

      try {
        if (safeCaseId) {
          const caseSnap = await getDoc(doc(db, 'cases', safeCaseId));
          if (caseSnap.exists()) {
            const data = caseSnap.data();
            
            // Map legacy and new fields
            const regTypeKey = data.registrationTypeKey || '';
            const macro = data.serviceMacroType || (regTypeKey === 'peticao_inicial' || regTypeKey === 'peticao-inicial' || regTypeKey === 'processo_judicial_em-andamento' || regTypeKey === 'processo-judicial-em-andamento' || regTypeKey === 'processo_judicial_ajuizado' ? 'judicial' : 'extrajudicial');
            setMacroTypeSelection(macro);

            // Populate form values
            setOppositeParty(data.oppositeParty || '');
            setHasOppositeParty(!!data.hasOppositeParty);
            setAssunto(data.assunto || data.title || '');
            setVara(subTypeRoute === 'peticao-inicial' ? 'A definir' : (data.vara || ''));
            setComarca(data.comarca || '');
            setProcessNumber(data.processNumber || '');
            setServiceSubtype(data.serviceSubtype || '');

            // Todoist metadata with automatic simulator protection
            let loadedTaskId = data.todoistTaskId || '';
            let loadedTaskUrl = data.todoistTaskUrl || '';
            let loadedProjectId = data.todoistProjectId || '';
            let loadedProjectName = data.todoistProjectName || '';
            let loadedStatus = data.todoistAutomationStatus || 'aguardando';
            let loadedLogFalha = data.todoistTaskLogFalha || '';

            const isFakeOrMock = isInvalidTodoistTaskIdentity(loadedTaskId, loadedTaskUrl);

            if (isFakeOrMock && subTypeRoute === 'peticao-inicial') {
              loadedProjectId = TODOIST_INBOX_SENTINEL;
              loadedProjectName = TODOIST_INBOX_NAME;
              loadedStatus = "aguardando";
              loadedTaskId = "";
              loadedTaskUrl = "";
              loadedLogFalha = "";

              // Persist clean up in Firestore
              const cleanPayload = {
                todoistAutomationStatus: "aguardando",
                todoistTaskId: "",
                todoistTaskUrl: "",
                todoistTaskLogFalha: "",
                todoistProjectId: TODOIST_INBOX_SENTINEL,
                todoistProjectName: TODOIST_INBOX_NAME,
                updatedAt: new Date().toISOString()
              };
              updateDoc(doc(db, 'cases', safeCaseId), cleanPayload).catch((e) => console.error("Error cleaning cases:", e));
              updateDoc(doc(db, 'casos', safeCaseId), cleanPayload).catch((e) => console.error("Error cleaning casos:", e));
            }

            setTodoistTaskId(loadedTaskId);
            setTodoistTaskUrl(loadedTaskUrl);
            setTodoistTaskLogFalha(loadedLogFalha);
            setTodoistAutomationStatus(loadedStatus);
            setTodoistProjectId(loadedProjectId);
            setTodoistProjectName(loadedProjectName);
            setTodoistLogs(Array.isArray(data.todoistLogs) ? data.todoistLogs : []);

            // 5W2H interview check
            const isNewComplete = !!(
              data.entrevistaPadrao?.trim() &&
              data.checklist5w2h?.oQue === true &&
              data.checklist5w2h?.quem === true &&
              data.checklist5w2h?.onde === true &&
              data.checklist5w2h?.quando === true &&
              data.checklist5w2h?.como === true &&
              data.checklist5w2h?.porque === true &&
              data.checklist5w2h?.comoResolver === true
            );

            const isLegacyComplete = !!(
              data.basesFaticas?.trim() &&
              (data.description?.trim() || data.descricaoDet?.trim() || data.descricao?.trim()) &&
              data.fatosAbordagem?.trim() &&
              data.oQueAconteceu?.trim() &&
              data.quemParticipou?.trim() &&
              data.ondeAconteceu?.trim() &&
              data.quandoAconteceu?.trim() &&
              data.comoAconteceu?.trim() &&
              data.porQueAconteceu?.trim() &&
              (data.comoPretendeResolver?.trim() || data.encaminhamentoEsperado?.trim())
            );

            const is5W2HComplete = isNewComplete || isLegacyComplete;
            const isNewStarted = !!(
              data.entrevistaPadrao?.trim() ||
              data.checklist5w2h?.oQue === true ||
              data.checklist5w2h?.quem === true ||
              data.checklist5w2h?.onde === true ||
              data.checklist5w2h?.quando === true ||
              data.checklist5w2h?.como === true ||
              data.checklist5w2h?.porque === true ||
              data.checklist5w2h?.comoResolver === true
            );

            const isLegacyStarted = !!(
              data.basesFaticas?.trim() ||
              data.description?.trim() ||
              data.descricaoDet?.trim() ||
              data.fatosAbordagem?.trim() ||
              data.oQueAconteceu?.trim() ||
              data.quemParticipou?.trim() ||
              data.ondeAconteceu?.trim() ||
              data.quandoAconteceu?.trim() ||
              data.comoAconteceu?.trim() ||
              data.porQueAconteceu?.trim() ||
              data.comoPretendeResolver?.trim() ||
              data.encaminhamentoEsperado?.trim()
            );

            const isStarted = isNewStarted || isLegacyStarted;
            if (!is5W2HComplete && isStarted) {
              setIsEntrevistaIncomplete(true);
            }

            // Client linkage
            if (data.clientId) {
              const cliSnap = await getDoc(doc(db, 'clients', data.clientId));
              if (cliSnap.exists()) {
                const cData = cliSnap.data();
                setClientSlug(cData.slug || '');
                const name = cData.type === 'PF' 
                  ? (cData.pfDadosPessoais?.pf_nomeCompleto || cData.pfData?.pf_nomeCompleto || '')
                  : (cData.pjDadosEmpresa?.pj_razaoSocial || cData.pjData?.pj_razaoSocial || '');
                setClientName(name);
              }
            }
          } else {
            setError(`O caso ${safeCaseId} solicitado não foi encontrado no sistema.`);
          }
        } else if (clientId) {
          const cliSnap = await getDoc(doc(db, 'clients', clientId));
          if (cliSnap.exists()) {
            const cData = cliSnap.data();
            setClientSlug(cData.slug || '');
            const name = cData.type === 'PF' 
              ? (cData.pfDadosPessoais?.pf_nomeCompleto || cData.pfData?.pf_nomeCompleto || '')
              : (cData.pjDadosEmpresa?.pj_razaoSocial || cData.pjData?.pj_razaoSocial || '');
            setClientName(name);
          } else {
            setError(`O código de cliente [${clientId}] fornecido não pôde ser localizado.`);
          }
        } else {
          setError('Nenhum parâmetro identificador de caso ou de cliente foi fornecido.');
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erro de comunicação com o sistema de dados: ${err.message || err}`);
      } finally {
        setFetching(false);
      }
    }
    loadContext();
  }, [safeCaseId, clientId]);

  const getTodoistFormula = (): string => {
    const clientPart = clientName?.trim() || "DOCUMENTO SEM CLIENTE";
    const oppositePart = oppositeParty?.trim() || "[Parte Adversa]";
    const assuntoPart = assunto?.trim() || "[Assunto]";
    const varaPart = vara?.trim() || "[Vara]";
    const comarcaPart = comarca?.trim() || "[Comarca]";
    const processPart = processNumber?.trim() || "[Processo CNJ]";
    const subtypePart = serviceSubtype?.trim() || "[Tipo de Serviço]";

    if (subTypeRoute === 'peticao-inicial') {
      return `${clientPart} x ${oppositePart} - ${assuntoPart} - Tipo de serviço: Petição inicial a ajuizar - Vara: A definir - Comarca: ${comarcaPart}`;
    }
    if (subTypeRoute === 'processo-judicial-em-andamento') {
      return `${clientPart} x ${oppositePart} - ${assuntoPart} - Tipo de serviço: Processo ${processPart} - ${varaPart} - ${comarcaPart}`;
    }
    if (subTypeRoute === 'requerimento-administrativo') {
      return hasOppositeParty
        ? `${clientPart} x ${oppositePart} - ${assuntoPart} - Tipo de serviço Extrajudicial: Requerimento Administrativo`
        : `${clientPart} - ${assuntoPart} - Tipo de serviço Extrajudicial: Requerimento Administrativo`;
    }
    if (subTypeRoute === 'outro-servico-administrativo') {
      return hasOppositeParty
        ? `${clientPart} x ${oppositePart} - ${assuntoPart} - Tipo de serviço Extrajudicial: ${subtypePart}`
        : `${clientPart} - ${assuntoPart} - Tipo de serviço Extrajudicial: ${subtypePart}`;
    }
    return '';
  };

  const handleCopyFormula = () => {
    const text = getTodoistFormula();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigateToSubtype = async (subtypeKey: string) => {
    if (safeCaseId) {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${safeCaseId}/tipo-producao/${subtypeKey}`);
    } else if (clientId) {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        const baseRef = doc(collection(db, 'cases'));
        const autoCaseId = baseRef.id;

        const isNovoCaso = searchParams.get('source') === 'novo-caso';
        
        let subLabel = '';
        if (subtypeKey === 'peticao-inicial') subLabel = 'Petição Inicial';
        else if (subtypeKey === 'processo-judicial-em-andamento') subLabel = 'Processo Judicial em Andamento';
        else if (subtypeKey === 'requerimento-administrativo') subLabel = 'Requerimento Administrativo';
        else if (subtypeKey === 'outro-servico-administrativo') subLabel = 'Outro Serviço Administrativo';

        const payload = {
          clientId: clientId,
          clientSlug: clientSlug,
          registrationType: subLabel,
          registrationTypeKey: subtypeKey,
          serviceMacroType: (subtypeKey === 'peticao-inicial' || subtypeKey === 'processo-judicial-em-andamento') ? 'judicial' : 'extrajudicial',
          title: "RASCUNHO DE PRODUÇÃO",
          status: isNovoCaso ? "ativo" : "rascunho",
          statusInterno: "Em produção",
          statusPublicoCliente: "Em análise",
          visibleToClient: true,
          productionStatus: "em_producao",
          productionStage: "tipo-producao",
          caseLifecycle: isNovoCaso ? "novo-caso" : "edrp",
          isNovoCaso: isNovoCaso,
          createdAt: now,
          updatedAt: now
        };

        await setDoc(baseRef, payload);

        try {
          await setDoc(doc(db, 'casos', autoCaseId), {
            id: autoCaseId,
            caseId: autoCaseId,
            clienteId: clientId,
            clientId: clientId,
            title: payload.title,
            titulo: payload.title,
            tipo: subLabel,
            caseType: subLabel,
            status: payload.status,
            statusInterno: payload.statusInterno,
            visibleToClient: payload.visibleToClient,
            productionStatus: payload.productionStatus,
            productionStage: payload.productionStage,
            createdAt: now,
            updatedAt: now
          }, { merge: true });
        } catch (mirrorErr) {
          console.warn('Silent mirror save warning:', mirrorErr);
        }

        navigate(`/boss-giffoni-clientes/fluxo-producao/${autoCaseId}/tipo-producao/${subtypeKey}${isNovoCaso ? '?source=novo-caso' : ''}`);
      } catch (err: any) {
        console.error(err);
        setError("Erro ao inicializar o rascunho de caso: " + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError("Indentificador de caso ou cliente indisponível.");
    }
  };

  const handleSaveSubtypeForm = async (advanceAfter: boolean) => {
    if (!safeCaseId) {
      setError("Impossível salvar sem um Identificador de Caso ativo.");
      return;
    }
    
    if (!assunto.trim()) {
      setError('Por favor, defina o campo Assunto para prosseguir.');
      return;
    }

    if (subTypeRoute === 'peticao-inicial') {
      if (!clientName) {
        setError('Por favor, certifique-se de que o nome do cliente está carregado.');
        return;
      }
      if (!oppositeParty.trim()) {
        setError('Por favor, informe a Parte Adversa.');
        return;
      }
      if (!comarca.trim()) {
        setError('Por favor, informe a Comarca.');
        return;
      }
    }

    if (subTypeRoute === 'processo-judicial-em-andamento' && !processNumber.trim()) {
      setError('Por favor, defina o número do Processo CNJ para prosseguir.');
      return;
    }

    if (subTypeRoute === 'outro-servico-administrativo' && !serviceSubtype.trim()) {
      setError('Por favor, defina o tipo de serviço administrativo para prosseguir.');
      return;
    }

    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    const now = new Date().toISOString();
    
    let regType = '';
    let macro = 'judicial';
    if (subTypeRoute === 'peticao-inicial') {
      regType = 'Petição Inicial';
      macro = 'judicial';
    } else if (subTypeRoute === 'processo-judicial-em-andamento') {
      regType = 'Processo Judicial em Andamento';
      macro = 'judicial';
    } else if (subTypeRoute === 'requerimento-administrativo') {
      regType = 'Requerimento Administrativo';
      macro = 'extrajudicial';
    } else if (subTypeRoute === 'outro-servico-administrativo') {
      regType = 'Outro Serviço Administrativo';
      macro = 'extrajudicial';
    }

    const currentFormula = getTodoistFormula();

    let publicStatus = 'Aguardando distribuição';
    if (subTypeRoute === 'processo-judicial-em-andamento') {
      publicStatus = 'Processo em andamento';
    } else if (subTypeRoute === 'requerimento-administrativo') {
      publicStatus = 'Requerimento pendente';
    } else if (subTypeRoute === 'outro-servico-administrativo') {
      publicStatus = 'Serviço administrativo em andamento';
    }

    try {
      const isPeticaoInicial = subTypeRoute === 'peticao-inicial';
      const nextStage = advanceAfter ? "solicitacoes-provas" : "tipo-producao";

      const payload: any = {
        serviceMacroType: macro,
        registrationTypeKey: isPeticaoInicial ? "peticao_inicial" : subTypeRoute,
        registrationType: isPeticaoInicial ? "Petição Inicial a Ajuizar" : regType,
        serviceSubtype: isPeticaoInicial ? "peticao_inicial" : (subTypeRoute === 'outro-servico-administrativo' ? serviceSubtype : ''),
        clientDisplayName: clientName || '',
        oppositeParty: oppositeParty || '',
        hasOppositeParty: isPeticaoInicial ? true : !!hasOppositeParty,
        assunto: assunto.trim(),
        title: assunto.trim(), 
        todoistFormula: currentFormula,
        todoistProjectId: todoistProjectId,
        todoistProjectName: todoistProjectName,
        todoistTaskId: todoistTaskId || '',
        todoistTaskUrl: todoistTaskUrl || '',
        todoistAutomationStatus: todoistAutomationStatus || 'aguardando',
        todoistTaskLogFalha: todoistTaskLogFalha || '',
        updatedAt: now,
        productionStage: nextStage
      };

      if (isPeticaoInicial) {
        payload.tipoServicoCompleto = true;
        payload.tipoServicoPendente = false;
        payload.vara = "A definir";
        payload.comarca = comarca || '';
      } else if (macro === 'judicial') {
        payload.vara = vara || '';
        payload.comarca = comarca || '';
        if (subTypeRoute === 'processo-judicial-em-andamento') {
          payload.processNumber = processNumber || '';
        }
      } else {
        payload.serviceSubtype = serviceSubtype || '';
      }

      // Maintain legacy data updates
      await updateDoc(doc(db, 'cases', safeCaseId), payload);

      try {
        await setDoc(doc(db, 'casos', safeCaseId), {
          id: safeCaseId,
          caseId: safeCaseId,
          title: assunto.trim(),
          titulo: assunto.trim(),
          tipo: isPeticaoInicial ? "Petição Inicial a Ajuizar" : regType,
          caseType: isPeticaoInicial ? "Petição Inicial a Ajuizar" : regType,
          registrationTypeKey: isPeticaoInicial ? "peticao_inicial" : subTypeRoute,
          registrationType: isPeticaoInicial ? "Petição Inicial a Ajuizar" : regType,
          productionStage: nextStage,
          todoistProjectId: todoistProjectId,
          todoistProjectName: todoistProjectName,
          todoistTaskId: todoistTaskId || '',
          todoistTaskUrl: todoistTaskUrl || '',
          todoistAutomationStatus: todoistAutomationStatus || 'aguardando',
          todoistTaskLogFalha: todoistTaskLogFalha || '',
          updatedAt: now
        }, { merge: true });
      } catch (mirrorErr) {
        console.warn('Silent mirror save warning:', mirrorErr);
      }

      setSaveSuccess(true);

      if (advanceAfter) {
        setTimeout(() => {
          navigate(`/boss-giffoni-clientes/fluxo-producao/${safeCaseId}/solicitacoes-provas`);
        }, 800);
      }

    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar os dados técnicos: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTodoistProjects = async () => {
    setSyncingProjects(true);
    setError(null);
    try {
      const response = await fetch('/api/todoist/projects');
      const data = await response.json();
      if (data.success && Array.isArray(data.projects)) {
        setSyncedProjectsList(data.projects);
      } else {
        const errorMsg = data.errorMessage || "Não foi possível obter a lista de projetos do Todoist.";
        setError(`Erro ao sincronizar projetos: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error("[Todoist Projects Sync Failed]", err);
      setError(`Falha ao conectar com o backend do Todoist: ${err.message || err}`);
    } finally {
      setSyncingProjects(false);
    }
  };

  const handleCreateTodoistTask = async () => {
    if (!safeCaseId) {
      setError("Erro ao criar tarefa: O ID do caso (caseId) está ausente.");
      return;
    }

    const currentFormula = getTodoistFormula();

    // Specific validation for peticao-inicial according to rule 6
    if (subTypeRoute === "peticao-inicial") {
      const missingFields = [];
      if (!clientName || !clientName.trim()) missingFields.push("Cliente");
      if (!oppositeParty || !oppositeParty.trim()) missingFields.push("Parte Adversa");
      if (!assunto || !assunto.trim()) missingFields.push("Assunto");
      if (!comarca || !comarca.trim()) missingFields.push("Comarca");
      if (!todoistProjectId) missingFields.push("Projeto Destino");
      if (!currentFormula || !currentFormula.trim()) missingFields.push("Fórmula do Todoist");

      if (missingFields.length > 0) {
        setError(`Não é possível criar a tarefa no Todoist. Preencha os seguintes dados obrigatórios: ${missingFields.join(", ")}.`);
        return;
      }
    } else {
      if (!todoistProjectId) {
        setError("Selecione um projeto do Todoist para criar a tarefa.");
        return;
      }
      if (!currentFormula || !currentFormula.trim()) {
        setError("A fórmula do Todoist está vazia.");
        return;
      }
    }

    // detect and prepare duplicate creation factors
    const isDuplicateCreationAttempt = !!(
      todoistTaskId &&
      todoistAutomationStatus === "criado" &&
      !isInvalidTodoistTaskIdentity(todoistTaskId, todoistTaskUrl)
    );

    const previousTodoistTaskId = isDuplicateCreationAttempt ? (todoistTaskId || "") : "";
    const previousTodoistTaskUrl = isDuplicateCreationAttempt ? (todoistTaskUrl || "") : "";

    if (isDuplicateCreationAttempt) {
      await appendFrontendLogs([
        {
          timestamp: new Date().toISOString(),
          level: "warning",
          step: "DUPLICATE_CREATION_WARNING",
          message: "Sistema detectou que já existe tarefa Todoist criada para este caso.",
          details: {
            existingTodoistTaskId: todoistTaskId,
            existingTodoistTaskUrl: todoistTaskUrl
          }
        }
      ]);

      const confirmed = window.confirm(
        `Já existe uma tarefa criada no Todoist para este caso.\n\n` +
        `ID atual: ${todoistTaskId}\n\n` +
        `Deseja criar outra tarefa igual no Todoist?\n\n` +
        `A nova tarefa substituirá o ID e o link exibidos neste painel, mas o histórico ficará registrado nos logs.`
      );

      if (!confirmed) {
        await appendFrontendLogs([
          {
            timestamp: new Date().toISOString(),
            level: "warning",
            step: "DUPLICATE_CREATION_CANCELLED",
            message: "Operador cancelou a criação de tarefa duplicada no Todoist.",
            details: {
              existingTodoistTaskId: todoistTaskId,
              existingTodoistTaskUrl: todoistTaskUrl
            }
          }
        ]);
        return;
      }

      await appendFrontendLogs([
        {
          timestamp: new Date().toISOString(),
          level: "warning",
          step: "DUPLICATE_CREATION_CONFIRMED",
          message: "Operador confirmou criação de nova tarefa mesmo já existindo tarefa anterior.",
          details: {
            previousTodoistTaskId: todoistTaskId,
            previousTodoistTaskUrl: todoistTaskUrl
          }
        }
      ]);
    }

    setTodoistAutomationStatus("gerando");
    setTodoistTaskLogFalha("");
    setError(null);

    // Operational first steps logs
    const initialLogs = [
      {
        level: "info",
        step: "FRONTEND_BUTTON_CLICKED",
        message: "Operador clicou em Criar tarefa no Todoist."
      },
      {
        level: "info",
        step: "FRONTEND_PAYLOAD_PREPARED",
        message: "Payload preparado com o conteúdo do Preview Operacional Todoist.",
        details: {
          caseId: safeCaseId,
          projectId: todoistProjectId,
          projectName: todoistProjectName,
          content: currentFormula,
          route: pathname,
          dueDate: todoistDueDate,
          priority: todoistPriority,
          labelsCount: todoistLabels ? todoistLabels.split(',').length : 0,
          assignee: todoistAssignee,
          previousTodoistTaskId,
          previousTodoistTaskUrl,
          isDuplicateCreationAttempt
        }
      }
    ];
    await appendFrontendLogs(initialLogs);

    // Prepare body
    const bodyPayload = {
      caseId: safeCaseId,
      projectId: todoistProjectId,
      projectName: todoistProjectName,
      content: currentFormula,
      dueDate: todoistDueDate,
      priority: todoistPriority,
      labels: todoistLabels ? todoistLabels.split(',').map(l => l.trim()).filter(Boolean) : [],
      assignee: todoistAssignee,
      previousTodoistTaskId,
      previousTodoistTaskUrl,
      isDuplicateCreationAttempt
    };

    try {
      const response = await fetch('/api/todoist/create-case-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await response.json();

      if (data && Array.isArray(data.logs)) {
        setTodoistLogs(prev => {
          const merged = [...prev, ...data.logs];
          return merged
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-100);
        });
      }

      if (
        data.success === true &&
        data.verified === true &&
        data.todoistTaskId &&
        data.todoistTaskUrl &&
        !isInvalidTodoistTaskIdentity(data.todoistTaskId, data.todoistTaskUrl)
      ) {
        setTodoistAutomationStatus("criado");
        setTodoistTaskId(data.todoistTaskId);
        setTodoistTaskUrl(data.todoistTaskUrl);
        setTodoistTaskLogFalha("");

        await appendFrontendLogs([
          {
            level: "success",
            step: "FRONTEND_BACKEND_SUCCESS",
            message: "Backend confirmou criação real e verificada da tarefa no Todoist.",
            details: {
              todoistTaskId: data.todoistTaskId,
              todoistTaskUrl: data.todoistTaskUrl
            }
          }
        ]);
      } else {
        const errMsg = data.errorMessage || "A API não confirmou a criação real da tarefa no Todoist.";
        setTodoistAutomationStatus("falha");
        if (!previousTodoistTaskId) {
          setTodoistTaskId("");
          setTodoistTaskUrl("");
        }
        setTodoistTaskLogFalha(errMsg);
        setError(`Falha na criação da tarefa Todoist: ${errMsg}`);

        await appendFrontendLogs([
          {
            level: "error",
            step: "FRONTEND_BACKEND_FAILED",
            message: "Backend não confirmou a criação real da tarefa no Todoist.",
            details: {
              errorCode: data.errorCode || "UNKNOWN_ERROR",
              errorMessage: errMsg
            }
          }
        ]);
      }
    } catch (err: any) {
      console.error("[Todoist Create Task Failed]", err);
      const errStr = err.message || err;
      setTodoistAutomationStatus("falha");
      if (!previousTodoistTaskId) {
        setTodoistTaskId("");
        setTodoistTaskUrl("");
      }
      setTodoistTaskLogFalha(`Erro de rede / conexão: ${errStr}`);
      setError(`Erro ao criar tarefa no Todoist: ${errStr}`);

      await appendFrontendLogs([
        {
          level: "error",
          step: "FRONTEND_BACKEND_FAILED",
          message: "Backend não confirmou a criação real da tarefa no Todoist.",
          details: {
            errorCode: "NETWORK_CONECTION_ERROR",
            errorMessage: errStr
          }
        }
      ]);
    }
  };

  return (
    <FluxoStepLayout
      stepName="Tipo de Serviço"
      caseId={safeCaseId || undefined}
      tipoProducaoSubetapasStep={currentStep}
      serviceMacroType={macroTypeSelection}
      serviceSubtype={serviceSubtype}
      todoistAutomationStatus={todoistAutomationStatus}
      todoistTaskId={todoistTaskId}
    >
      <div className="space-y-8 text-xs md:text-sm">
        
        {/* HEADER INFORMATION BLOCK */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <span className="text-xs font-black uppercase text-gray-400 tracking-wider block font-mono">
              Fase de Produção Operacional
            </span>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Categorização Técnica & Fórmula Todoist</h3>
            
            {clientName ? (
              <p className="text-xs text-indigo-600 font-bold tracking-wide mt-1 uppercase">
                Cliente: {clientName}
              </p>
            ) : !fetching ? (
              <div className="mt-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs flex gap-3 items-start">
                <AlertCircle size={16} className="text-red-650 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <h5 className="font-extrabold text-red-900 uppercase tracking-wide">⚠️ Alerta Técnico — Cliente Não Vinculado</h5>
                  <p className="leading-relaxed font-semibold">
                    Não foi possível identificar o nome completo do cliente para este caso no Firestore. Por favor, verifique se o cadastro do cliente está completo ou se o vínculo foi realizado corretamente.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {isEntrevistaIncomplete && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs flex gap-3 items-start animate-fadeIn">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h5 className="font-extrabold text-amber-900">Entrevista 5W2H incompleta</h5>
              <p className="leading-relaxed">
                Você pode navegar livremente pelo fluxo, mas esta pendência de preenchimento fático continuará registrada.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex gap-3 items-center animate-fadeIn">
            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
            <span className="font-bold leading-relaxed">Dados e fórmula operacional atualizados com sucesso!</span>
          </div>
        )}

        {fetching ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-500" size={24} />
            <span className="text-xs font-bold font-mono uppercase tracking-widest">Pesquisando dados específicos do caso...</span>
          </div>
        ) : currentStep !== 'form' ? (
          
          /* VIEW 1: SELECTION TREE PROCESS (Step 1 -> cards, and Step 2 -> subtypes) */
          <div className="space-y-8 animate-fadeIn">
            
            {/* IF STEP IS naturaleza */}
            {currentStep === 'natureza' && (
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase text-gray-400 tracking-wider block font-mono">
                  Etapa 1 — Selecione o Segmento da Demanda
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* CARD judicial */}
                  <button
                    type="button"
                    onClick={() => navigate(getRouteTo('judicial'))}
                    className="p-6 rounded-3xl border bg-white border-gray-150 hover:border-indigo-400 hover:shadow-xs text-left flex gap-4 items-start transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl border bg-gray-50 text-gray-500 border-gray-100 flex items-center justify-center shrink-0 shadow-xs">
                      <Scale size={20} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-black text-xs tracking-wider uppercase text-gray-900 font-sans">
                        1. JUDICIAL
                      </h5>
                      <p className="text-xs text-gray-550 leading-relaxed font-semibold">
                        Adequado para demandas de rito contencioso em andamento ou peças preparatórias de ajuizamento estrutural perante órgãos judiciais.
                      </p>
                    </div>
                  </button>

                  {/* CARD extrajudicial */}
                  <button
                    type="button"
                    onClick={() => navigate(getRouteTo('extrajudicial'))}
                    className="p-6 rounded-3xl border bg-white border-gray-150 hover:border-indigo-400 hover:shadow-xs text-left flex gap-4 items-start transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl border bg-gray-50 text-gray-500 border-gray-100 flex items-center justify-center shrink-0 shadow-xs">
                      <Briefcase size={20} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-black text-xs tracking-wider uppercase text-gray-900 font-sans">
                        2. EXTRAJUDICIAL
                      </h5>
                      <p className="text-xs text-gray-550 leading-relaxed font-semibold">
                        Ideal para notificações preventivas, assessoria contratual pautada em resoluções administrativas e pleitos junto a autarquias.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* IF STEP IS judicial */}
            {currentStep === 'judicial' && (
              <div className="space-y-4">
                {/* Simple Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold font-sans mb-2">
                  <span className="hover:text-indigo-650 cursor-pointer text-gray-400" onClick={() => navigate(getRouteTo('natureza'))}>
                    Tipo de Serviço
                  </span>
                  <span className="text-gray-350">&gt;</span>
                  <span className="text-indigo-600 font-bold uppercase tracking-wider">
                    Judicial
                  </span>
                </div>

                <h4 className="text-sm font-black uppercase text-gray-400 tracking-wider block font-mono">
                  Etapa 2 — Serviço Judicial
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* BUTTON sub 1: Petição Inicial */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSubtype('peticao-inicial')}
                    className="p-5 bg-white border border-gray-150 hover:border-indigo-400 rounded-3xl text-left flex gap-4 items-start transition-all hover:bg-gray-50/30 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-xs text-gray-900 uppercase">Petição Inicial</h5>
                      <p className="text-xs text-gray-550 leading-relaxed">
                        Ajuizar peça inicial qualificada contendo pleitos liminares ou fáticos.
                      </p>
                    </div>
                  </button>

                  {/* BUTTON sub 2: Processo Judicial em Andamento */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSubtype('processo-judicial-em-andamento')}
                    className="p-5 bg-white border border-gray-150 hover:border-indigo-400 rounded-3xl text-left flex gap-4 items-start transition-all hover:bg-gray-50/30 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <FolderOpen size={18} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-xs text-gray-900 uppercase">Processo Judicial em Andamento</h5>
                      <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                        Habilitação ativa com número CNJ preexistente nas varas federais ou estaduais.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* IF STEP IS extrajudicial */}
            {currentStep === 'extrajudicial' && (
              <div className="space-y-4">
                {/* Simple Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold font-sans mb-2">
                  <span className="hover:text-indigo-650 cursor-pointer text-gray-400" onClick={() => navigate(getRouteTo('natureza'))}>
                    Tipo de Serviço
                  </span>
                  <span className="text-gray-350">&gt;</span>
                  <span className="text-indigo-600 font-bold uppercase tracking-wider">
                    Extrajudicial
                  </span>
                </div>

                <h4 className="text-sm font-black uppercase text-gray-400 tracking-wider block font-mono">
                  Etapa 2 — Serviço Extrajudicial
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* BUTTON sub 3: Requerimento Administrativo */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSubtype('requerimento-administrativo')}
                    className="p-5 bg-white border border-gray-150 hover:border-indigo-400 rounded-3xl text-left flex gap-4 items-start transition-all hover:bg-gray-50/30 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <FileSignature size={18} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-xs text-gray-900 uppercase">Requerimento Administrativo</h5>
                      <p className="text-xs text-gray-550 leading-relaxed">
                        Requerimento em trâmite na esfera de autarquias públicas ou órgãos governamentais.
                      </p>
                    </div>
                  </button>

                  {/* BUTTON sub 4: Outro Tipo de Serviço Administrativo */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSubtype('outro-servico-administrativo')}
                    className="p-5 bg-white border border-gray-150 hover:border-indigo-400 rounded-3xl text-left flex gap-4 items-start transition-all hover:bg-gray-50/30 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Briefcase size={18} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-xs text-gray-900 uppercase">Outro Serviço Administrativo</h5>
                      <p className="text-xs text-gray-550 leading-relaxed">
                        Atividades genéricas, pareceres, notificações ou serviços customizados extrajudiciais.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

          </div>

        ) : (
          
          /* VIEW 2: SUBTYPE FORM EDITING MODE */
          <div className="space-y-8 animate-fadeIn">
            
            {/* VOLTAR A ADESÃO DA ÁRVORE BAR */}
            <div>
              <button
                type="button"
                onClick={() => navigate(getRouteTo(macroTypeSelection || 'judicial'))}
                className="inline-flex items-center gap-1.5 text-indigo-650 hover:underline font-bold text-xs"
              >
                <ArrowLeft size={14} />
                Voltar para escolha de subtipo de serviço
              </button>
            </div>

            {/* TWO COLUMN GRID FOR FORM AND WORKFLOW PREVIEWS */}
            <div className={subTypeRoute === 'peticao-inicial' ? "flex flex-col gap-6" : "grid grid-cols-1 lg:grid-cols-3 gap-8"}>
              
              {/* LEFT FORM FIELD CONTAINER */}
              <div className={subTypeRoute === 'peticao-inicial' ? "space-y-6 w-full" : "lg:col-span-2 space-y-6"}>
                
                <div className="p-6 bg-white border border-gray-150 rounded-3xl space-y-5">
                  <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center">
                      <Scale size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 uppercase">
                        {subTypeRoute === 'peticao-inicial' && 'Formulário — Petição Inicial'}
                        {subTypeRoute === 'processo-judicial-em-andamento' && 'Formulário — Processo Judicial em Andamento'}
                        {subTypeRoute === 'requerimento-administrativo' && 'Formulário — Requerimento Administrativo'}
                        {subTypeRoute === 'outro-servico-administrativo' && 'Formulário — Outro Tipo de Serviço Administrativo'}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">Preencha e verifique os dados operacionais.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    
                    {/* CLIENT NAME FIELD (preenchido automaticamente e bloqueado) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block">
                        Nome Completo do Cliente *
                      </label>
                      <input 
                        type="text" 
                        value={clientName || "IDENTIFICANDO CLIENTE..."} 
                        disabled 
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    {/* ASSUNTO (Substitui o antigo título operacional do caso, não temos mais título operacional) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block mt-3">
                        Assunto *
                      </label>
                      <input 
                        type="text" 
                        value={assunto} 
                        onChange={(e) => setAssunto(e.target.value)}
                        placeholder="Ex: Empréstimo consignado indevido d/c juros abusivos" 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-gray-950 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                      />
                    </div>

                    {/* CONTEXT-BASED EXTRA FIELDS */}
                    
                    {/* TYPE BLOCK */}
                    {(subTypeRoute === 'peticao-inicial' || subTypeRoute === 'requerimento-administrativo') && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block mt-3">
                          Tipo de Serviço
                        </label>
                        <input 
                          type="text" 
                          value={subTypeRoute === 'peticao-inicial' ? 'Petição inicial a ajuizar' : 'Requerimento Administrativo'} 
                          disabled 
                          className="w-full px-4 py-3 bg-gray-100 border border-gray-150 rounded-xl text-xs font-black text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* SERVICE SUBTYPE TEXT INPUT FOR OTHER TYPE */}
                    {subTypeRoute === 'outro-servico-administrativo' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block mt-3">
                          Tipo de Serviço Administrativo *
                        </label>
                        <input 
                          type="text" 
                          value={serviceSubtype} 
                          onChange={(e) => setServiceSubtype(e.target.value)}
                          placeholder="Ex: Confecção de Notificação Extrajudicial" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-gray-950 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                        />
                      </div>
                    )}

                    {/* PARTE ADVERSA CONTROLS */}
                    {(subTypeRoute === 'requerimento-administrativo' || subTypeRoute === 'outro-servico-administrativo') ? (
                      <div className="space-y-4 pt-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={hasOppositeParty} 
                            onChange={(e) => {
                              setHasOppositeParty(e.target.checked);
                              if (!e.target.checked) setOppositeParty('');
                            }}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-gray-700">Possui parte adversa neste fluxo?</span>
                        </label>

                        {hasOppositeParty && (
                          <div className="space-y-1.5 animate-fadeIn">
                            <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block">
                              Nome da Parte Adversa *
                            </label>
                            <input 
                              type="text" 
                              value={oppositeParty} 
                              onChange={(e) => setOppositeParty(e.target.value)}
                              placeholder="Ex: Banco X S/A" 
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-gray-950 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      // Judicial always has oppositeParty
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block mt-3">
                          Nome da Parte Adversa *
                        </label>
                        <input 
                          type="text" 
                          value={oppositeParty} 
                          onChange={(e) => setOppositeParty(e.target.value)}
                          placeholder="Ex: Banco X S/A ou Seguradora Y" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-gray-950 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                        />
                      </div>
                    )}

                    {/* JUDICIAL SPECIFIC DETAILS */}
                    {(subTypeRoute === 'peticao-inicial' || subTypeRoute === 'processo-judicial-em-andamento') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        
                        {/* VARA */}
                        <div className="space-y-1.5 flex-1">
                          <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block">
                            Vara
                          </label>
                          {subTypeRoute === 'peticao-inicial' ? (
                            <input 
                              type="text" 
                              value="A definir" 
                              disabled 
                              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 cursor-not-allowed outline-none"
                            />
                          ) : (
                            <input 
                              type="text" 
                              value={vara} 
                              onChange={(e) => setVara(e.target.value)}
                              placeholder="Ex: 2ª Vara Cível / Juizado" 
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-gray-950 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                            />
                          )}
                        </div>

                        {/* COMARCA */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block">
                            Comarca
                          </label>
                          <input 
                            type="text" 
                            value={comarca} 
                            onChange={(e) => setComarca(e.target.value)}
                            placeholder="Ex: Viçosa/MG" 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-gray-950 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                          />
                        </div>

                      </div>
                    )}

                    {/* PROCESS NUMBER CNJ WITH MASK */}
                    {subTypeRoute === 'processo-judicial-em-andamento' && (
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-bold uppercase text-gray-500 tracking-wide block">
                          Número do Processo CNJ *
                        </label>
                        <input 
                          type="text" 
                          value={processNumber} 
                          onChange={(e) => {
                            const raw = e.target.value;
                            setProcessNumber(formatCNJ(raw));
                          }}
                          placeholder="Ex: 0000000-00.0000.0.00.0000" 
                          maxLength={25}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-gray-950 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-mono font-semibold text-gray-800 transition-all outline-none"
                        />
                        <p className="text-xs text-gray-400 font-medium">Formato automático: NNNNNNN-DD.AAAA.J.TR.OOOO</p>
                      </div>
                    )}

                  </div>
                </div>

              </div>

              {/* RIGHT LIVE FORMULA PREVIEW PANEL */}
              <div className="space-y-6">
                
                {/* PREVIEW CONTAINER */}
                <div className="p-6 bg-red-50/65 border-2 border-[#e44332]/30 rounded-3xl space-y-4 shadow-xs shadow-[#e44332]/5">
                  <div className="flex items-center gap-2 border-b border-[#e44332]/20 pb-3">
                    <FileText className="text-[#e44332]" size={18} />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 font-mono">Preview Operacional Todoist</h4>
                      <h5 className="text-[11px] text-[#e44332] font-extrabold leading-normal mt-0.5">Fórmula de pauta técnica para o Todoist.</h5>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-[#e44332]/15 shadow-3xs space-y-3">
                    <p className="text-xs font-mono leading-relaxed select-all selection:bg-rose-100 text-stone-850 break-words">
                      {getTodoistFormula()}
                    </p>
                  </div>

                  {/* BUTTON ACTION FOR COPY */}
                  <button
                    type="button"
                    onClick={handleCopyFormula}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-3xs ${
                      copied 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'bg-white hover:bg-rose-50 text-[#e44332] border border-[#e44332]/25 hover:border-[#e44332]/50'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="stroke-[3px]" />
                        <span>Fórmula Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copiar Fórmula Todoist</span>
                      </>
                    )}
                  </button>
                </div>

                {/* LOWER TO-DOIST AUTOMATION INTEGRATION STATUS PANEL ("Cadastro Automático de Caso no Todoist") */}
                <div className="border-2 border-[#e44332] rounded-3xl p-6 bg-white space-y-5 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <CheckCircle className="text-[#e44332]" size={18} />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">Cadastro Automático de Caso no Todoist</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Retorno e status operacional da fila de pautas de integração.</p>
                    </div>
                  </div>

                  {/* SMART TODOIST PROJECT SELECTOR ("Projeto X") */}
                  <div className="space-y-2.5 bg-gray-50/50 p-3.5 border border-gray-150 rounded-2xl relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider block font-mono flex items-center gap-1">
                        <Folder size={11} className="text-[#e44332]" />
                        Criar no Projeto X *
                      </label>
                      <button
                        type="button"
                        disabled={syncingProjects}
                        onClick={handleSyncTodoistProjects}
                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#e44332] hover:text-[#c53222] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={`shrink-0 ${syncingProjects ? 'animate-spin' : ''}`} />
                        Sincronizar API
                      </button>
                    </div>

                    {syncingProjects ? (
                      <div className="p-3.5 bg-white border border-gray-100 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 font-mono">
                        <Loader2 size={13} className="animate-spin text-[#e44332]" />
                        <span>Sincronizando via REST API v1...</span>
                      </div>
                    ) : todoistProjectId ? (
                      /* Active selection card */
                      <div className="p-3.5 bg-rose-50/20 border border-[#e44332]/30 rounded-xl flex items-center justify-between gap-3 text-xs shadow-3xs animate-fadeIn">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#e44332]/10 flex items-center justify-center text-[#e44332] shrink-0">
                            <Folder size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-stone-900 truncate">{todoistProjectName}</p>
                            <p className="font-mono text-[9px] text-[#e44332] mt-0.5">Ativo • ID: {todoistProjectId}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTodoistProjectId('');
                            setTodoistProjectName('');
                          }}
                          className="p-1 hover:bg-[#e44332]/10 rounded text-stone-400 hover:text-[#e44332] transition-colors cursor-pointer"
                          title="Trocar Projeto"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      /* Dynamic input selector */
                      <div className="relative">
                        <div className="flex items-center bg-white border border-gray-200 focus-within:border-[#e44332] rounded-xl px-3 transition-all">
                          <Search size={14} className="text-gray-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Buscar projeto do Todoist..."
                            value={projectSearchQuery}
                            onChange={(e) => {
                              setProjectSearchQuery(e.target.value);
                              setShowProjectDropdown(true);
                            }}
                            onFocus={() => setShowProjectDropdown(true)}
                            className="w-full pl-2 pr-1 py-2 bg-transparent text-xs font-semibold text-gray-700 outline-none placeholder-gray-400"
                          />
                          {projectSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setProjectSearchQuery('')}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {showProjectDropdown && (
                          <div className="absolute top-10 left-0 right-0 max-h-56 overflow-y-auto bg-white border border-gray-150 rounded-xl shadow-lg z-20 p-1 divide-y divide-gray-50">
                            {syncedProjectsList.filter(p => 
                              p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              p.id.toLowerCase().includes(projectSearchQuery.toLowerCase())
                            ).length > 0 ? (
                              syncedProjectsList
                                .filter(p => 
                                  p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                  p.id.toLowerCase().includes(projectSearchQuery.toLowerCase())
                                )
                                .map((proj) => (
                                  <button
                                    type="button"
                                    key={proj.id}
                                    onClick={() => {
                                      setTodoistProjectId(proj.id);
                                      setTodoistProjectName(proj.name);
                                      setProjectSearchQuery('');
                                      setShowProjectDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#e44332]/5 rounded-lg text-xs font-semibold text-gray-700 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                                  >
                                    <span className="truncate">{proj.name}</span>
                                    <span className="text-[10px] text-gray-400 font-mono font-normal">ID: {proj.id}</span>
                                  </button>
                                ))
                            ) : (
                              <div className="p-3 text-center text-xs text-gray-400 font-mono">
                                Nenhum projeto fático correspondente.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {!todoistProjectId && (
                      <p className="text-[10px] text-[#e44332] font-black flex items-center gap-1 animate-pulse leading-normal font-mono uppercase tracking-wide">
                        ⚠️ Escolha o Projeto X para evitar erros no processamento de pauta.
                      </p>
                    )}
                  </div>

                  {/* OPÇÕES ADICIONAIS DO TODOIST (DATA, PRAZO, PRIORIDADE, ETIQUETA, RESPONSÁVEL) */}
                  <div className="bg-gray-50/50 p-3.5 border border-gray-150 rounded-2xl space-y-3.5">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest block font-mono flex items-center gap-1.5">
                      <Sliders size={12} className="text-stone-500" />
                      Campos Opcionais da Tarefa
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* PRAZO / DATA DE VENCIMENTO */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 font-mono flex items-center gap-1">
                          <Calendar size={11} className="text-gray-400" />
                          Prazo / Data
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: amanhã, 15/06/2026, monday"
                          value={todoistDueDate}
                          onChange={(e) => setTodoistDueDate(e.target.value)}
                          className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 focus:border-[#e44332] outline-none rounded-xl px-3 py-2 transition-all placeholder-gray-400"
                        />
                      </div>

                      {/* PRIORIDADE DO TODOIST */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 font-mono flex items-center gap-1">
                          <Flag size={11} className="text-gray-400" />
                          Prioridade
                        </label>
                        <div className="relative">
                          <select
                            value={todoistPriority}
                            onChange={(e) => setTodoistPriority(Number(e.target.value))}
                            className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 focus:border-[#e44332] outline-none rounded-xl px-3 py-2 transition-all appearance-none pr-8"
                          >
                            <option value={1}>Prioridade 1 (Normal)</option>
                            <option value={2}>Prioridade 2</option>
                            <option value={3}>Prioridade 3</option>
                            <option value={4}>Prioridade 4 (Urgente)</option>
                          </select>
                          <ChevronDown size={14} className="text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* ETIQUETAS DO TODOIST */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 font-mono flex items-center gap-1">
                          <Tag size={11} className="text-gray-400" />
                          Etiquetas (tags)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: urgente, civil"
                          value={todoistLabels}
                          onChange={(e) => setTodoistLabels(e.target.value)}
                          className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 focus:border-[#e44332] outline-none rounded-xl px-3 py-2 transition-all placeholder-gray-400"
                        />
                      </div>

                      {/* RESPONSÁVEL DO TODOIST */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 font-mono flex items-center gap-1">
                          <User size={11} className="text-gray-400" />
                          ID do Responsável
                        </label>
                        <input
                          type="text"
                          placeholder="ID de usuário do Todoist"
                          value={todoistAssignee}
                          onChange={(e) => setTodoistAssignee(e.target.value)}
                          className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 focus:border-[#e44332] outline-none rounded-xl px-3 py-2 transition-all placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block font-mono">Status da Automação</span>
                    
                    {todoistAutomationStatus === 'criado' &&
                    todoistTaskId &&
                    todoistTaskUrl &&
                    !String(todoistTaskId).includes("demo") &&
                    !String(todoistTaskUrl).includes("showcase") ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center gap-2 animate-fadeIn font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Tarefa criada com sucesso</span>
                      </div>
                    ) : todoistAutomationStatus === 'gerando' ? (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs flex items-center gap-2 animate-fadeIn font-semibold">
                        <span className="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Criando tarefa real no Todoist...</span>
                      </div>
                    ) : todoistAutomationStatus === 'falha' ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-950 text-xs flex flex-col gap-2 animate-fadeIn font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span>Falha na criação da tarefa</span>
                        </div>
                        {todoistTaskLogFalha && (
                          <div className="w-full bg-red-100/50 p-2.5 rounded-lg border border-red-250 text-red-900 font-mono text-[11px] max-h-32 overflow-y-auto">
                            {todoistTaskLogFalha}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-center gap-2 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Aguardando criação</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={todoistAutomationStatus === "gerando"}
                      onClick={handleCreateTodoistTask}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#e44332] hover:bg-[#c53222] text-white font-extrabold px-4 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {todoistAutomationStatus === 'gerando' && "Criando tarefa real..."}
                      {todoistAutomationStatus === 'criado' && "Criar outra tarefa no Todoist"}
                      {todoistAutomationStatus === 'falha' && "Tentar criar novamente"}
                      {todoistAutomationStatus === 'aguardando' && "Criar Tarefa no Todoist"}
                      {todoistAutomationStatus !== 'gerando' && todoistAutomationStatus !== 'criado' && todoistAutomationStatus !== 'falha' && todoistAutomationStatus !== 'aguardando' && "Criar Tarefa no Todoist"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block font-mono">Identificador & Link do Todoist</span>
                      
                      {todoistTaskId && todoistTaskUrl && !String(todoistTaskId).includes("demo") && !String(todoistTaskId).includes("fake") && !String(todoistTaskUrl).includes("showcase") ? (
                        <div className="space-y-2">
                          <div className="p-2.5 bg-gray-50 border border-gray-150 rounded-xl text-xs flex justify-between items-center font-mono">
                            <span className="text-gray-400 uppercase font-bold">ID da Tarefa:</span>
                            <span className="font-bold text-gray-800 select-all">{todoistTaskId}</span>
                          </div>

                          {todoistTaskUrl && (
                            <a
                              href={todoistTaskUrl}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer"
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-[#e44332]/25 text-[#e44332] font-black rounded-xl text-xs transition-style cursor-pointer"
                            >
                              <ExternalLink size={14} />
                              <span>Abrir tarefa no Todoist</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-550 italic font-bold">Aguardando retorno real da automação.</p>
                      )}
                    </div>
                  </div>

                  {/* Logs da Integração Todoist */}
                  <div className="space-y-3 pt-3 border-t border-gray-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block font-mono">
                        Logs da Integração Todoist
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTodoistLogs(!showTodoistLogs)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-150 hover:bg-gray-200 text-gray-600 font-extrabold rounded-lg text-[10px] uppercase font-mono transition-colors cursor-pointer"
                      >
                        {showTodoistLogs ? <EyeOff size={11} /> : <Eye size={11} />}
                        <span>{showTodoistLogs ? "Ocultar LOGS" : "Ver LOGS"}</span>
                      </button>
                    </div>

                    {showTodoistLogs && (
                      <>
                        {todoistLogs.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">
                            Nenhum log registrado ainda. Clique em "Criar tarefa no Todoist" para iniciar a automação.
                          </p>
                        ) : (
                          <div className="max-h-72 overflow-y-auto border border-gray-150 rounded-xl bg-gray-50 p-3 space-y-2">
                            {todoistLogs.map((log, index) => (
                              <div key={`${log.timestamp}-${index}`} className="bg-white border border-gray-100 rounded-lg p-2.5 text-xs shadow-inner">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={
                                      log.level === "success" ? "w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" :
                                      log.level === "error" ? "w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" :
                                      log.level === "warning" ? "w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" :
                                      "w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"
                                    } />
                                    <span className="font-mono font-black text-gray-700 truncate text-[10px]">
                                      {log.step}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-450 font-mono shrink-0">
                                    {new Date(log.timestamp).toLocaleString("pt-BR")}
                                  </span>
                                </div>

                                <p className="mt-1 text-gray-700 font-semibold leading-relaxed">
                                  {log.message}
                                </p>

                                {log.details && Object.keys(log.details).length > 0 && (
                                  <pre className="mt-2 bg-gray-50 border border-gray-100 rounded-md p-2 text-[10px] text-gray-500 overflow-x-auto font-mono">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* BOTTOM STEP NAV ACTIONS BAR */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          
          {/* VOLTAR ACTION BUTTON */}
          <button
            type="button"
            onClick={() => {
              if (currentStep === 'form') {
                navigate(getRouteTo(macroTypeSelection || 'judicial'));
              } else if (currentStep === 'judicial' || currentStep === 'extrajudicial') {
                navigate(getRouteTo('natureza'));
              } else {
                navigate(safeCaseId ? `/boss-giffoni-clientes/fluxo-producao/${safeCaseId}/dados-caso` : '/boss-giffoni-clientes/fluxo-producao/cadastro');
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            {currentStep === 'form' ? 'Voltar para Subtipos' : (currentStep === 'judicial' || currentStep === 'extrajudicial') ? 'Voltar para Etapa 1' : 'Voltar'}
          </button>

          {/* RIGHT CTA SAVE ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            
            {/* SAIR SEM SALVAR BAR */}
            <button
              type="button"
              onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 px-6 py-3 rounded-xl font-bold transition-all text-xs hover:bg-gray-50 cursor-pointer bg-white"
            >
              <Save size={14} />
              Sair
            </button>

            {/* ACTION TRIGGERS ONLY VISIBLE IF EDITING A SPECIFIC SUBTYPE FORM */}
            {subTypeRoute ? (
              <>
                <button
                  type="button"
                  disabled={loading || fetching}
                  onClick={() => handleSaveSubtypeForm(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-950 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Salvar Dados</span>
                </button>

                <button
                  type="button"
                  disabled={loading || fetching}
                  onClick={() => handleSaveSubtypeForm(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <span>Salvar e Avançar</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </>
            ) : null}

          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
