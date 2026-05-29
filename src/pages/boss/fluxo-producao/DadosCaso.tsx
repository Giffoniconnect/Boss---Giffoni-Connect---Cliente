import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Info, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Activity,
  User,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  Check,
  X,
  HelpCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';
import { useUnsavedChangesGuard } from './hooks/useUnsavedChangesGuard';

interface MiniRichEditorProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  isMissing: boolean;
}

// Mini Rich Text Editor in compliance with legal writing standards
function MiniRichEditor({ id, value, onChange, placeholder, isMissing }: MiniRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const applyCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div id={`editor-container-${id}`} className={`border rounded-2xl overflow-hidden shadow-xs bg-white transition-all duration-200 ${
      isMissing ? 'border-red-300 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500' : 'border-gray-200 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900'
    }`}>
      {/* Editorial Toolbar Buttons */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-150 select-none">
        <button
          type="button"
          onClick={() => applyCommand('bold')}
          className="px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-200 border border-gray-200 hover:border-gray-300 rounded-lg transition-all font-serif font-black flex items-center justify-center min-w-[28px] cursor-pointer"
          title="Negrito"
        >
          N
        </button>
        <button
          type="button"
          onClick={() => applyCommand('backColor', 'yellow')}
          className="px-2.5 py-1.5 text-[11px] text-gray-800 hover:bg-yellow-105 border border-yellow-250 rounded-lg transition-all bg-yellow-50 flex items-center gap-1.5 cursor-pointer font-bold animate-pulse"
          title="Marca-texto amarelo"
        >
          <span className="w-3.5 h-3.5 bg-yellow-400 border border-yellow-500 rounded-md shrink-0 block" />
          <span>Marca-texto</span>
        </button>
        <button
          type="button"
          onClick={() => {
            applyCommand('removeFormat');
            try {
              applyCommand('backColor', 'transparent');
            } catch (e) {}
          }}
          className="px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50 border border-red-105 hover:border-red-200 rounded-lg transition-all font-bold ml-auto cursor-pointer"
          title="Limpar marcação"
        >
          Limpar formatação
        </button>
      </div>

      {/* Editor Canvas Styled with Classical Times New Roman and Left Margin Recess */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onPaste={handlePaste}
        className="outline-none min-h-[220px] p-6 text-gray-900 bg-white"
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '12pt',
          lineHeight: '1.5',
          textAlign: 'justify',
          paddingLeft: '1.5rem',
        }}
        placeholder={placeholder}
      />
    </div>
  );
}

const statusMapping: Record<string, string> = {
  'Rascunho': 'Cadastro interno em andamento.',
  'Entrevista pendente': 'Aguardando complementação de informações.',
  'Em produção': 'Seu caso está em análise e preparação.',
  'Com pendência': 'Há pendências necessárias para avanço do caso.',
  'Em estruturação': 'Seu caso está em estruturação técnica.',
  'Aguardando revisão': 'Seu caso está em revisão interna.',
  'Em revisão': 'Seu caso está em revisão jurídica.',
  'Aprovado para protocolo': 'Seu caso está pronto para o próximo protocolo.',
  'Aguardando protocolo': 'Seu caso aguarda protocolo.',
  'Protocolado': 'Seu caso foi protocolado.',
  'Em controladoria': 'Seu caso está em acompanhamento processual.',
  'Arquivado': 'Atendimento encerrado/arquivado.'
};

const statusConcepts: Record<string, string> = {
  'Rascunho': 'Cadastro inicial e estruturação fática em andamento interno.',
  'Entrevista pendente': 'Dados fáticos/5W2H ainda incompletos. Aguardando entrevista.',
  'Em produção': 'A equipe de assessores está trabalhando ativamente no caso.',
  'Com pendência': 'Necessário intervir para sanar incongruência ou falta de dados.',
  'Em estruturação': 'Análise técnica de viabilidade jurídica do caso.',
  'Aguardando revisão': 'O rascunho da peça/projeto de requerimento foi finalizado.',
  'Em revisão': 'Os defensores seniores analisam a viabilidade jurídica fina.',
  'Aprovado para protocolo': 'Tudo validado! O caso está apto a ser protocolado.',
  'Aguardando protocolo': 'Enviado para o rito final de protocolo processual.',
  'Protocolado': 'Ação distribuída ou requerimento protocolado oficialmente.',
  'Em controladoria': 'O caso está sob monitoramento ativo de prazos e trâmite.',
  'Arquivado': 'Trâmite encerrado definitivamente no escritório.'
};

interface Checklist5W2HState {
  oQue: boolean;
  oQueObs: string;
  quem: boolean;
  quemObs: string;
  onde: boolean;
  ondeObs: string;
  quando: boolean;
  quandoObs: string;
  como: boolean;
  comoObs: string;
  porque: boolean;
  porqueObs: string;
  comoResolver: boolean;
  comoResolverObs: string;
}

export default function DadosCaso() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  // Screen states
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tab State (Solution 2)
  const [selectedTab, setSelectedTab] = useState<'padrao' | 'estruturada'>('padrao');

  // Loaded assets
  const [client, setClient] = useState<any>(null);
  const [caseObj, setCaseObj] = useState<any>(null);

  // Core input mapping
  const [entrevistaPadrao, setEntrevistaPadrao] = useState('');

  // Google Docs 1st Attendance automation states
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [primeiroAtendimentoStatus, setPrimeiroAtendimentoStatus] = useState<'aguardando' | 'criado' | 'falha'>('aguardando');
  const [primeiroAtendimentoGoogleDocsUrl, setPrimeiroAtendimentoGoogleDocsUrl] = useState('');
  const [primeiroAtendimentoLogFalha, setPrimeiroAtendimentoLogFalha] = useState('');
  
  // Backward preservation memory
  const [basesFaticas, setBasesFaticas] = useState('');
  const [description, setDescription] = useState(''); 
  const [fatosAbordagem, setFatosAbordagem] = useState('');

  // 5W2H Checklist boolean states
  const [checklist, setChecklist] = useState<Checklist5W2HState>({
    oQue: false,
    oQueObs: '',
    quem: false,
    quemObs: '',
    onde: false,
    ondeObs: '',
    quando: false,
    quandoObs: '',
    como: false,
    comoObs: '',
    porque: false,
    porqueObs: '',
    comoResolver: false,
    comoResolverObs: ''
  });

  // Administrative classification (Retained silently to avoid data loss)
  const [materia, setMateria] = useState('');
  const [ramo, setRamo] = useState('');
  const [tipoAcao, setTipoAcao] = useState('');

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('media');
  const [responsibleLawyer, setResponsibleLawyer] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [statusInterno, setStatusInterno] = useState('Em produção');
  const [statusPublicoCliente, setStatusPublicoCliente] = useState('');
  const [isPublicStatusManuallyEdited, setIsPublicStatusManuallyEdited] = useState(false);

  // Safeguard Baseline state
  const [initialCaseData, setInitialCaseData] = useState<any>(null);

  const hasUnsavedChanges = initialCaseData
    ? (
        title !== initialCaseData.title ||
        priority !== initialCaseData.priority ||
        responsibleLawyer !== initialCaseData.responsibleLawyer ||
        visibleToClient !== initialCaseData.visibleToClient ||
        statusInterno !== initialCaseData.statusInterno ||
        statusPublicoCliente !== initialCaseData.statusPublicoCliente ||
        entrevistaPadrao !== initialCaseData.entrevistaPadrao ||
        materia !== initialCaseData.materia ||
        ramo !== initialCaseData.ramo ||
        tipoAcao !== initialCaseData.tipoAcao ||
        JSON.stringify(checklist) !== JSON.stringify(initialCaseData.checklist)
      )
    : false;

  const handleGuardSave = async (): Promise<boolean> => {
    try {
      const successSaved = await saveCasePayload();
      return successSaved;
    } catch (err) {
      console.error("Guard save failed in DadosCaso screen:", err);
      return false;
    }
  };

  const { UnsavedChangesModal, SaveStatusIndicator } = useUnsavedChangesGuard({
    hasUnsavedChanges,
    onSave: handleGuardSave,
    isSaving: saving,
    saveError: error
  });

  const statusInternoOptions = [
    'Rascunho',
    'Entrevista pendente',
    'Em produção',
    'Com pendência',
    'Em estruturação',
    'Aguardando revisão',
    'Em revisão',
    'Aprovado para protocolo',
    'Aguardando protocolo',
    'Protocolado',
    'Em controladoria',
    'Arquivado'
  ];

  // Load documentation on mount
  useEffect(() => {
    if (!caseId) {
      setError('Identificador do caso ausente na URL.');
      setFetching(false);
      return;
    }

    async function loadCaseData() {
      try {
        const caseSnap = await getDoc(doc(db, 'cases', caseId!));
        if (!caseSnap.exists()) {
          setError(`Caso referenciado por ID [${caseId}] não existe no banco de dados.`);
          setFetching(false);
          return;
        }

        const data = caseSnap.data();
        setCaseObj(data);

        // Core fields
        setTitle(data.title || '');
        setPriority(data.priority || 'media');
        setResponsibleLawyer(data.responsibleLawyer || '');
        setVisibleToClient(data.visibleToClient !== false);
        setStatusInterno(data.statusInterno || 'Em produção');
        setStatusPublicoCliente(data.statusPublicoCliente || '');
        setIsPublicStatusManuallyEdited(data.isPublicStatusManuallyEdited === true);

        // Google Docs automation fields
        setPrimeiroAtendimentoStatus(data.primeiroAtendimentoStatus || 'aguardando');
        setPrimeiroAtendimentoGoogleDocsUrl(data.primeiroAtendimentoGoogleDocsUrl || '');
        setPrimeiroAtendimentoLogFalha(data.primeiroAtendimentoLogFalha || '');

        // Reconcile and migrate narrative blocks safely (Solution 1)
        const loadedEntrevista = data.entrevistaPadrao || '';
        if (loadedEntrevista) {
          setEntrevistaPadrao(loadedEntrevista);
        } else {
          // Perform silent, clear migration concatenation of old blocks
          const tempParts: string[] = [];
          
          if (data.description?.trim()) {
            tempParts.push(`<p><strong>Histórico / Descrição Inicial:</strong><br/>${data.description}</p>`);
          } else if (data.descricaoDet?.trim()) {
            tempParts.push(`<p><strong>Histórico / Descrição Inicial:</strong><br/>${data.descricaoDet}</p>`);
          }

          if (data.basesFaticas?.trim()) {
            tempParts.push(`<p><strong>Bases Fáticas:</strong><br/>${data.basesFaticas}</p>`);
          }

          if (data.fatosAbordagem?.trim()) {
            tempParts.push(`<p><strong>Fatos de Abordagem:</strong><br/>${data.fatosAbordagem}</p>`);
          }

          setEntrevistaPadrao(tempParts.join('<br/>'));
        }

        // Keep local backups of legacy fields
        setBasesFaticas(data.basesFaticas || '');
        setDescription(data.description || '');
        setFatosAbordagem(data.fatosAbordagem || '');

        // Load 5W2H Checklist safely (Solution 3)
        const checkSrc = data.checklist5w2h || {};
        setChecklist({
          oQue: checkSrc.oQue === true,
          oQueObs: checkSrc.oQueObs || '',
          quem: checkSrc.quem === true,
          quemObs: checkSrc.quemObs || '',
          onde: checkSrc.onde === true,
          ondeObs: checkSrc.ondeObs || '',
          quando: checkSrc.quando === true,
          quandoObs: checkSrc.quandoObs || '',
          como: checkSrc.como === true,
          comoObs: checkSrc.comoObs || '',
          porque: checkSrc.porque === true,
          porqueObs: checkSrc.porqueObs || '',
          comoResolver: checkSrc.comoResolver === true,
          comoResolverObs: checkSrc.comoResolverObs || ''
        });

        // Retain classifications silently so we do not break any other screens
        setMateria(data.materia || (data.caseType ? data.caseType.split('/')[0]?.trim() : ''));
        setRamo(data.ramo || (data.caseType ? data.caseType.split('/')[1]?.trim() : ''));
        setTipoAcao(data.tipoAcao || (data.caseType ? data.caseType.split('/')[2]?.trim() : ''));

        // Client info lookup
        if (data.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', data.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        // Store safeguard baseline comparison
        const checkSrcResolved = data.checklist5w2h || {};
        const loadedState = {
          title: data.title || '',
          priority: data.priority || 'media',
          responsibleLawyer: data.responsibleLawyer || '',
          visibleToClient: data.visibleToClient !== false,
          statusInterno: data.statusInterno || 'Em produção',
          statusPublicoCliente: data.statusPublicoCliente || '',
          entrevistaPadrao: loadedEntrevista,
          checklist: {
            oQue: checkSrcResolved.oQue === true,
            oQueObs: checkSrcResolved.oQueObs || '',
            quem: checkSrcResolved.quem === true,
            quemObs: checkSrcResolved.quemObs || '',
            onde: checkSrcResolved.onde === true,
            ondeObs: checkSrcResolved.ondeObs || '',
            quando: checkSrcResolved.quando === true,
            quandoObs: checkSrcResolved.quandoObs || '',
            como: checkSrcResolved.como === true,
            comoObs: checkSrcResolved.comoObs || '',
            porque: checkSrcResolved.porque === true,
            porqueObs: checkSrcResolved.porqueObs || '',
            comoResolver: checkSrcResolved.comoResolver === true,
            comoResolverObs: checkSrcResolved.comoResolverObs || ''
          },
          materia: data.materia || (data.caseType ? data.caseType.split('/')[0]?.trim() : ''),
          ramo: data.ramo || (data.caseType ? data.caseType.split('/')[1]?.trim() : ''),
          tipoAcao: data.tipoAcao || (data.caseType ? data.caseType.split('/')[2]?.trim() : '')
        };
        setInitialCaseData(loadedState);
      } catch (err: any) {
        console.error(err);
        setError(`Erro crítico ao carregar fasticidade do caso: ${err.message || err}`);
      } finally {
        setFetching(false);
      }
    }

    loadCaseData();
  }, [caseId]);

  // Suggested Public Status triggers on status altering
  const handleStatusInternoChange = (newVal: string) => {
    setStatusInterno(newVal);
    if (!isPublicStatusManuallyEdited) {
      const suggest = statusMapping[newVal] || '';
      setStatusPublicoCliente(suggest);
    }
  };

  const handlePublicStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusPublicoCliente(e.target.value);
    setIsPublicStatusManuallyEdited(true);
  };

  const handleRestoreStatusSuggestion = () => {
    setError(null);
    const suggest = statusMapping[statusInterno] || '';
    setStatusPublicoCliente(suggest);
    setIsPublicStatusManuallyEdited(false);
  };

  // Check 5W2H Completeness Criteria: (Solution 3 / Checklist + Entrevista)
  const is5W2HComplete = !!(
    entrevistaPadrao.trim() &&
    checklist.oQue &&
    checklist.quem &&
    checklist.onde &&
    checklist.quando &&
    checklist.como &&
    checklist.porque &&
    checklist.comoResolver
  );

  const is5W2HStarted = !!(
    entrevistaPadrao.trim() ||
    checklist.oQue ||
    checklist.quem ||
    checklist.onde ||
    checklist.quando ||
    checklist.como ||
    checklist.porque ||
    checklist.comoResolver
  );

  const handleChecklistToggle = (field: keyof Checklist5W2HState) => {
    setChecklist(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChecklistObsChange = (field: keyof Checklist5W2HState, value: string) => {
    setChecklist(prev => ({
      ...prev,
      [`${field}Obs`]: value
    }));
  };

  const validateDraft = (): boolean => {
    setError(null);
    return true;
  };

  const saveCasePayload = async (nextStage?: string): Promise<boolean> => {
    if (!validateDraft()) return false;
 
    setSaving(true);
    setError(null);
    setSuccess(null);
 
    // Keep combined structure
    const combinedCaseType = [materia.trim(), ramo.trim(), tipoAcao.trim()].filter(Boolean).join(' / ');
    let currentStatusValue = caseObj?.status || 'active';
    const resolvedTitle = title.trim() || caseObj?.title || 'Rascunho de Produção';
    if (currentStatusValue === 'rascunho' && resolvedTitle) {
      currentStatusValue = 'ativo';
    }
 
    const computedProductionStatus = is5W2HComplete ? 'em_producao' : 'com_pendencias';
    const timestamp = new Date().toISOString();
 
    const payload: any = {
      title: resolvedTitle,
      caseType: combinedCaseType,
      materia: materia.trim(),
      ramo: ramo.trim(),
      tipoAcao: tipoAcao.trim(),
      
      // Store consolidated fields
      entrevistaPadrao: entrevistaPadrao.trim(),
      checklist5w2h: {
        oQue: checklist.oQue,
        oQueObs: checklist.oQueObs || '',
        quem: checklist.quem,
        quemObs: checklist.quemObs || '',
        onde: checklist.onde,
        ondeObs: checklist.ondeObs || '',
        quando: checklist.quando,
        quandoObs: checklist.quandoObs || '',
        como: checklist.como,
        comoObs: checklist.comoObs || '',
        porque: checklist.porque,
        porqueObs: checklist.porqueObs || '',
        comoResolver: checklist.comoResolver,
        comoResolverObs: checklist.comoResolverObs || ''
      },
 
      // Mirror / Fallback backup storage (Solution 1 and 3)
      description: entrevistaPadrao.trim(), // espelhamento
      basesFaticas: basesFaticas,
      fatosAbordagem: fatosAbordagem,
 
      // UI variables
      priority,
      responsibleLawyer: responsibleLawyer.trim(),
      visibleToClient,
      statusInterno,
      statusPublicoCliente: statusPublicoCliente.trim(),
      isPublicStatusManuallyEdited,
      productionStatus: computedProductionStatus,
      status: currentStatusValue,
      updatedAt: timestamp,

      // Google Docs automation status
      primeiroAtendimentoStatus,
      primeiroAtendimentoGoogleDocsUrl,
      primeiroAtendimentoLogFalha
    };

    if (nextStage) {
      payload.productionStage = nextStage;
    } else {
      payload.productionStage = 'dados-caso';
    }

    try {
      // 1. Primary updates
      await updateDoc(doc(db, 'cases', caseId!), payload);
      
      // 2. Mirrored legacy lists update
      await setDoc(doc(db, 'casos', caseId!), {
        id: caseId,
        caseId: caseId,
        clienteId: caseObj.clientId,
        clientId: caseObj.clientId,
        title: payload.title,
        titulo: payload.title,
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
        productionStatus: payload.productionStatus,
        productionStage: payload.productionStage,
        updatedAt: payload.updatedAt,
        atualizadoEm: payload.updatedAt,
        createdAt: caseObj.createdAt || new Date().toISOString(),
        criadoEm: caseObj.createdAt || new Date().toISOString()
      }, { merge: true });

      setSuccess('Entrevista Padrão e Checklist 5W2H salvos com primor operacional!');
      setCaseObj({ ...caseObj, ...payload });
      setInitialCaseData({
        title: payload.title,
        priority: payload.priority,
        responsibleLawyer: payload.responsibleLawyer,
        visibleToClient: payload.visibleToClient,
        statusInterno: payload.statusInterno,
        statusPublicoCliente: payload.statusPublicoCliente,
        entrevistaPadrao: payload.entrevistaPadrao,
        checklist: { ...payload.checklist5w2h },
        materia: payload.materia,
        ramo: payload.ramo,
        tipoAcao: payload.tipoAcao
      });
      return true;
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao gravar dados da entrevista: ${err.message || err}`);
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

  const handleGeneratePrimeiroAtendimento = () => {
    setGeneratingDoc(true);
    setTimeout(() => {
      setGeneratingDoc(false);
      setPrimeiroAtendimentoStatus('criado');
      setPrimeiroAtendimentoGoogleDocsUrl('https://docs.google.com/document/d/1g6z8Pkt-mock-google-docs-id-1st-attendance/edit?usp=sharing');
      setPrimeiroAtendimentoLogFalha('');
      setSuccess('Comando de automação disparado com sucesso! Link gerado abaixo.');
    }, 1500);
  };

  const handleSimulateStatus = (status: 'aguardando' | 'criado' | 'falha', url: string, log: string) => {
    setPrimeiroAtendimentoStatus(status);
    setPrimeiroAtendimentoGoogleDocsUrl(url);
    setPrimeiroAtendimentoLogFalha(log);
  };

  if (!caseId) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-20 bg-white border border-red-200 rounded-3xl shadow-sm text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-black text-gray-900 uppercase">Acesso Bloqueado</h3>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Nenhum identificador fático (caseId) foi fornecido na URL de requisição técnica.
        </p>
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
        
        {/* HEADER AREA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Entrevista Inicial / Questionário 5W2H</h3>
            {clientName && (
              <p className="text-[11px] text-indigo-650 font-bold tracking-wide mt-1 uppercase">
                Cliente: {clientName}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Registre a narrativa consolidada da entrevista e confira os fatos obrigatórios no checklist de auditoria 5W2H.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <SaveStatusIndicator />
            {!is5W2HComplete && is5W2HStarted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 text-[10px] font-black uppercase tracking-wider font-sans animate-pulse">
                <AlertTriangle size={11} className="text-amber-500" />
                Incompetência / Pendências
              </span>
            ) : is5W2HComplete ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-[10px] font-black uppercase tracking-wider font-sans">
                <CheckCircle2 size={11} className="text-emerald-500" />
                Entrevista Pronta
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-500 text-[10px] font-bold uppercase tracking-wider font-sans">
                Aguardando Cadastro
              </span>
            )}
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-150 rounded-2xl text-red-900 text-xs flex gap-3 items-center animate-fadeIn">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl text-emerald-900 text-xs flex gap-3 items-center animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {fetching ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-500 font-bold" size={28} />
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-500">Sincronizando Histórico Fático...</span>
          </div>
        ) : (
          <div className="space-y-8">

            {/* IF INCOMPLETE WARNING CARD */}
            {!is5W2HComplete && is5W2HStarted && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm flex gap-3 items-start animate-fadeIn">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-bold text-xs uppercase tracking-wider">Aviso de Integralidade Fática</h5>
                  <p className="leading-relaxed text-xs">
                    Entrevista ou checklist pendente. Você pode navegar livremente pelo fluxo, mas esta etapa constará como pendente no painel de controle e na lateral até que a narrativa principal seja redigida e todas as 7 perguntas do checklist de auditoria abaixo sejam conferidas.
                  </p>
                </div>
              </div>
            )}

            {/* PART 1: CARDS DE SELEÇÃO DE TIPO (Solution 2) */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-gray-650 tracking-wide block">
                Modalidade de Entrevista
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Entrevista Padrão Card */}
                <button
                  type="button"
                  onClick={() => setSelectedTab('padrao')}
                  className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    selectedTab === 'padrao'
                      ? 'border-gray-950 bg-white shadow-xs'
                      : 'border-gray-150 bg-gray-50/50 opacity-80 hover:bg-gray-50 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider font-mono text-gray-900 flex items-center gap-1.5">
                      <FileText size={14} className="text-gray-950" />
                      Entrevista Padrão
                    </span>
                    <span className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-800 text-[9px] font-black rounded-sm tracking-wider uppercase">
                      Ativo
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                    Escrita livre do histórico fático consolidado do cliente, unificando dados, contextualização e fatos da abordagem.
                  </p>
                </button>

                {/* Entrevistas Estruturadas Card */}
                <button
                  type="button"
                  onClick={() => setSelectedTab('estruturada')}
                  className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden ${
                    selectedTab === 'estruturada'
                      ? 'border-indigo-600 bg-indigo-50/10 shadow-xs ring-1 ring-indigo-600'
                      : 'border-gray-150 bg-gray-50/50 opacity-80 hover:bg-gray-50 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider font-mono text-gray-600 flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-gray-400" />
                      Roteiros Estruturados
                    </span>
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-black rounded-sm tracking-wider uppercase">
                      Em breve
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    Formulários e questionários guiados inteligentes baseados nas teses mais recorrentes do escritório (trabalhista, previdenciário, consumidor).
                  </p>
                </button>
              </div>

              {selectedTab === 'estruturada' && (
                <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-2xl text-indigo-950 text-xs flex gap-3 items-center animate-fadeIn">
                  <Sparkles size={16} className="text-indigo-600 shrink-0" />
                  <span>
                    <strong>Integração futura:</strong> As entrevistas estruturadas serão disponibilizadas em módulos subsequentes do giga app. Por favor, utilize o editor da <strong>Entrevista Padrão</strong> para registrar o caso atual.
                  </span>
                </div>
              )}
            </div>

            {/* PART 2: UNIFIED NARRATIVE EDITOR (Solution 1 & 6) */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-4 shadow-xs">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                    <BookOpen size={16} className="text-gray-700" />
                    <span>Registro da Entrevista Padrão</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Laudo descritivo do atendimento de fasticidade principal da lide.</p>
                </div>
                {!entrevistaPadrao.trim() && (
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-red-50 rounded-md">Pendente *</span>
                )}
              </div>
              
              <MiniRichEditor 
                id="entrevistaPadrao"
                value={entrevistaPadrao}
                onChange={setEntrevistaPadrao}
                placeholder="Insira a narrativa fática do atendimento, transcrição da entrevista e documentos correspondentes apresentados..." 
                isMissing={!entrevistaPadrao.trim()}
              />
            </div>

            {/* PART 3: AUDIT 5W2H CHECKLISTS (Solution 3) */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-6 shadow-xs">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-[18px] font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-600" />
                  <span>Módulo de Auditoria de Faticidade • Checklist 5W2H</span>
                </h3>
                <p className="text-[15px] text-gray-500 mt-1">
                  Fatores mínimos de verificação para controle de qualidade da petição inicial ou requerimento administrativo.
                </p>
              </div>

              <div className="space-y-4">
                
                {/* CHECKLIST ITEMS LIST */}
                {[
                  { key: 'oQue', label: '1. O Quê', question: 'Foi colhido tudo o que aconteceu?' },
                  { key: 'quem', label: '2. Quem', question: 'Foram identificadas todas as pessoas envolvidas?' },
                  { key: 'onde', label: '3. Onde', question: 'O local dos fatos foi esclarecido?' },
                  { key: 'quando', label: '4. Quando', question: 'As datas, períodos ou marcos temporais foram esclarecidos?' },
                  { key: 'como', label: '5. Como', question: 'A forma como os fatos ocorreram foi compreendida?' },
                  { key: 'porque', label: '6. Por quê', question: 'A causa, motivação ou origem do problema foi investigada?' },
                  { key: 'comoResolver', label: '7. Como resolver', question: 'O encaminhamento esperado pelo cliente foi compreendido?' },
                ].map((item) => {
                  const val = (checklist as any)[item.key];
                  const isSim = val === true;
                  const isNao = val === false;

                  return (
                    <div 
                      key={item.key} 
                      className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isSim 
                          ? 'border-emerald-150 bg-emerald-50/20' 
                          : isNao 
                          ? 'border-red-150 bg-red-50/20'
                          : 'border-gray-150 bg-gray-50/40'
                      }`}
                    >
                      {/* Left: Indicator label & Clean descriptive question */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isSim 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isNao 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.label}
                          </span>
                          
                          {isSim && (
                            <span className="text-xs text-emerald-700 font-extrabold flex items-center gap-0.5 select-none">
                              ✅ Sim
                            </span>
                          )}
                          {isNao && (
                            <span className="text-xs text-red-700 font-extrabold flex items-center gap-0.5 select-none">
                              ❌ Não
                            </span>
                          )}
                        </div>
                        <p className="text-[15px] font-bold text-gray-800 leading-normal font-sans">
                          {item.question}
                        </p>
                      </div>

                      {/* Right: Objective SIM / NÃO Selector Buttons with visual emoji */}
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setChecklist(prev => ({ ...prev, [item.key]: true }))}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                            isSim
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-400'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                          }`}
                        >
                          <span>✅</span>
                          <span>Sim</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setChecklist(prev => ({ ...prev, [item.key]: false }))}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                            isNao
                              ? 'bg-red-600 border-red-500 text-white shadow-sm ring-1 ring-red-400'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                          }`}
                        >
                          <span>❌</span>
                          <span>Não</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* AUTOMAÇÃO GOOGLE DOCS — 1º ATENDIMENTO */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-6 shadow-xs">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-[18px] font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <FileText className="text-blue-600" size={18} />
                  <span>Automação Google Docs — 1º Atendimento</span>
                </h3>
                <p className="text-[15px] text-gray-500 mt-1">
                  Gere o roteiro do primeiro atendimento de forma estruturada e automatizada diretamente no ecossistema Google Docs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Ações de Automação
                    </span>
                    <button
                      type="button"
                      onClick={handleGeneratePrimeiroAtendimento}
                      disabled={generatingDoc}
                      className="w-full inline-flex items-center justify-center gap-2 bg-blue-650 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl transition-all text-xs cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {generatingDoc ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Gerando Roteiro...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Gerar 1º Atendimento</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status Visual com opções para simulação fática */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Status da Automação
                    </span>
                    {primeiroAtendimentoStatus === 'criado' && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 animate-fadeIn">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-extrabold">1º Atendimento criado com sucesso</span>
                      </div>
                    )}
                    {primeiroAtendimentoStatus === 'falha' && (
                      <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center gap-2 animate-fadeIn">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="font-extrabold">Falha na criação do 1º Atendimento</span>
                      </div>
                    )}
                    {primeiroAtendimentoStatus === 'aguardando' && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="font-extrabold">Aguardando geração</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Google Docs link output blanket */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Link do Documento no Google Docs
                    </span>
                    {primeiroAtendimentoStatus === 'criado' && primeiroAtendimentoGoogleDocsUrl ? (
                      <div className="space-y-2">
                        <a
                          href={primeiroAtendimentoGoogleDocsUrl}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                        >
                          <FileText size={14} />
                          <span>Abrir 1º Atendimento</span>
                        </a>
                        <p className="text-xs text-gray-400 font-mono select-all overflow-hidden text-ellipsis whitespace-nowrap bg-gray-50 p-2 rounded-lg border border-gray-100">
                          {primeiroAtendimentoGoogleDocsUrl}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        Link ainda não recebido pela automação.
                      </p>
                    )}
                  </div>

                  {/* QA/Manual status simulation control widget seamlessly integrated */}
                  <div className="p-3 border border-gray-100 bg-gray-50/50 rounded-xl space-y-1">
                    <span className="text-[12px] uppercase font-bold text-gray-400 block tracking-wide">
                      ⚡ Simular Retorno da Automação (Fase de Testes)
                    </span>
                    <div className="flex gap-2 pt-1 flex-wrap font-sans">
                      <button
                        type="button"
                        onClick={() => handleSimulateStatus('aguardando', '', '')}
                        className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer select-none ${
                          primeiroAtendimentoStatus === 'aguardando' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        Aguardando
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateStatus('criado', 'https://docs.google.com/document/d/1g6z8Pkt-mock-google-docs-id-1st-attendance/edit?usp=sharing', '')}
                        className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer select-none ${
                          primeiroAtendimentoStatus === 'criado' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        Sucesso
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateStatus('falha', '', 'Erro 403: Permissão negada no Google Drive do assessor (carlos@giffoni.com.br). Por favor, configure as credenciais da conta.')}
                        className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer select-none ${
                          primeiroAtendimentoStatus === 'falha' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        Falha
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blanket preparado para o log técnico de falha */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Log Técnico da Automação (Recebido por Mirror Build)
                </span>
                {primeiroAtendimentoStatus === 'falha' && primeiroAtendimentoLogFalha ? (
                  <div className="p-4 bg-red-950 text-red-100 rounded-xl border border-red-900 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-all shadow-inner animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-red-400 uppercase leading-none pb-2 border-b border-red-900 mb-2">
                      <AlertCircle size={12} />
                      <span>LOG DE FALHA PROCESSUAL RECENTE</span>
                    </div>
                    {primeiroAtendimentoLogFalha}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 text-gray-400 rounded-xl border border-gray-150 font-mono text-xs italic text-center">
                    Área técnica reservada para saída de logs. Atualmente limpa e pronta para receber o espelhamento do build.
                  </div>
                )}
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
              
              <button
                type="button"
                onClick={() => navigate(flowRoutes.editarCadastroCliente(caseId))}
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-250 text-gray-700 px-6 py-3 rounded-xl font-bold transition-all text-sm hover:bg-gray-50 cursor-pointer"
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
                      <span>Salvando dados fáticos...</span>
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
      <UnsavedChangesModal />
    </FluxoStepLayout>
  );
}
