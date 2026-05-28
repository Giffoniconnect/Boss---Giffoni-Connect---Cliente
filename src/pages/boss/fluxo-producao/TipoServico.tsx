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
  Check
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

            // Todoist metadata
            setTodoistTaskId(data.todoistTaskId || '');
            setTodoistTaskUrl(data.todoistTaskUrl || '');
            setTodoistTaskLogFalha(data.todoistTaskLogFalha || '');
            setTodoistAutomationStatus(data.todoistAutomationStatus || 'aguardando');

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

  const handleSimulateTodoistStatus = async (status: string, url: string, taskId: string, failLog: string) => {
    setTodoistAutomationStatus(status);
    setTodoistTaskUrl(url);
    setTodoistTaskId(taskId);
    setTodoistTaskLogFalha(failLog);
    if (!safeCaseId) return;
    try {
      await updateDoc(doc(db, 'cases', safeCaseId), {
        todoistAutomationStatus: status,
        todoistTaskUrl: url,
        todoistTaskId: taskId,
        todoistTaskLogFalha: failLog,
        updatedAt: new Date().toISOString()
      });
      try {
        await setDoc(doc(db, 'casos', safeCaseId), {
          todoistAutomationStatus: status,
          todoistTaskUrl: url,
          todoistTaskId: taskId,
          todoistTaskLogFalha: failLog,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn("Mirror warning:", e);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <FluxoStepLayout stepName="Tipo de Serviço" caseId={safeCaseId || undefined}>
      <div className="space-y-8 text-xs md:text-sm">
        
        {/* HEADER INFORMATION BLOCK */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <span className="text-xs font-black uppercase text-gray-400 tracking-wider block font-mono">
              Fase de Produção Operacional
            </span>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Categorização Técnica & Fórmula Todoist</h3>
            
            {clientName ? (
              <p className="text-xs text-indigo-600 font-bold font-mono tracking-wide mt-1 uppercase">
                Cliente Vinculado: {clientName} ({clientSlug})
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT FORM FIELD CONTAINER */}
              <div className="lg:col-span-2 space-y-6">
                
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
                <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-md">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <FileText className="text-cyan-400" size={18} />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Preview Operacional Todoist</h4>
                      <h5 className="text-xs text-slate-400 leading-relaxed font-semibold">Cópia idêntica da fórmula estruturada.</h5>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                    <p className="text-xs font-mono leading-relaxed select-all selection:bg-cyan-500 text-slate-100 break-words">
                      {getTodoistFormula()}
                    </p>
                  </div>

                  {/* BUTTON ACTION FOR COPY */}
                  <button
                    type="button"
                    onClick={handleCopyFormula}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-white hover:bg-slate-100 text-slate-900'
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

              </div>

            </div>

            {/* LOWER TO-DOIST AUTOMATION INTEGRATION STATUS PANEL (similar to the Docs panel in DadosCaso) */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-gray-50/40 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
                <CheckCircle className="text-indigo-600" size={18} />
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Automação Todoist — Criação da Tarefa</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Retorno e status operacional da fila de pautas de integração.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Status da Automação</span>
                  
                  {todoistAutomationStatus === 'criado' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center gap-2 animate-fadeIn font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Tarefa criada com sucesso</span>
                    </div>
                  )}
                  {todoistAutomationStatus === 'falha' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-950 text-xs flex flex-col gap-2 animate-fadeIn font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span>Falha na criação da tarefa</span>
                      </div>
                      {todoistTaskLogFalha && (
                        <div className="w-full bg-red-100/50 p-2.5 rounded-lg border border-red-250 text-red-900 font-mono text-xs max-h-32 overflow-y-auto">
                          {todoistTaskLogFalha}
                        </div>
                      )}
                    </div>
                  )}
                  {todoistAutomationStatus === 'aguardando' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-center gap-2 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>Aguardando criação</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSimulateTodoistStatus('criado', 'https://todoist.com/showcase-giffoni-task/12345', 'task_12345_demo', '')}
                    className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Criar tarefa no Todoist
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Identificador & Link do Todoist</span>
                    
                    {todoistTaskId ? (
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
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold rounded-xl text-xs transition-style cursor-pointer"
                          >
                            <ExternalLink size={14} />
                            <span>Abrir tarefa no Todoist</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">Aguardando retorno da automação.</p>
                    )}
                  </div>

                  {/* Manual QA Simulation widget integrated */}
                  <div className="p-3 border border-gray-150 bg-white rounded-xl space-y-2">
                    <span className="text-xs uppercase font-extrabold text-gray-400 block border-b border-gray-50 pb-1">
                      ⚡ Simular Retorno da Automação (Fase de Testes)
                    </span>
                    <div className="flex gap-2 flex-wrap text-xs">
                      <button
                        type="button"
                        onClick={() => handleSimulateTodoistStatus('aguardando', '', '', '')}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                          todoistAutomationStatus === 'aguardando' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        Aguardando
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateTodoistStatus('criado', 'https://todoist.com/showcase-giffoni-task/12345', 'task_12345_demo', '')}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                          todoistAutomationStatus === 'criado' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        Sucesso
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateTodoistStatus('falha', '', '', 'Falha fática: Token de integração expirado ou pauta indisponível.')}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                          todoistAutomationStatus === 'falha' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        Falha
                      </button>
                    </div>
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
