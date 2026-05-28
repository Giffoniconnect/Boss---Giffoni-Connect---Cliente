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
    if (!title.trim()) {
      setError('Por favor, informe pelo menos o Título Operacional do Caso.');
      return false;
    }
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
    if (currentStatusValue === 'rascunho' && title.trim()) {
      currentStatusValue = 'ativo';
    }

    const computedProductionStatus = is5W2HComplete ? 'em_producao' : 'com_pendencias';
    const timestamp = new Date().toISOString();

    const payload: any = {
      title: title.trim(),
      caseType: combinedCaseType,
      materia: materia.trim(),
      ramo: ramo.trim(),
      tipoAcao: tipoAcao.trim(),
      
      // Store consolidated fields
      entrevistaPadrao: entrevistaPadrao.trim(),
      checklist5w2h: {
        oQue: checklist.oQue,
        oQueObs: checklist.oQueObs,
        quem: checklist.quem,
        quemObs: checklist.quemObs,
        onde: checklist.onde,
        ondeObs: checklist.ondeObs,
        quando: checklist.quando,
        quandoObs: checklist.quandoObs,
        como: checklist.como,
        comoObs: checklist.comoObs,
        porque: checklist.porque,
        porqueObs: checklist.porqueObs,
        comoResolver: checklist.comoResolver,
        comoResolverObs: checklist.comoResolverObs
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
      updatedAt: timestamp
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
              <p className="text-[11px] text-indigo-650 font-bold font-mono tracking-wide mt-1 uppercase">
                Cliente Associado: {clientName} ({clientSlug})
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Registre a narrativa consolidada da entrevista e confira os fatos obrigatórios no checklist de auditoria 5W2H.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
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
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-5 shadow-xs">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <ClipboardList size={16} className="text-indigo-600" />
                  <span>Módulo de Auditoria de Faticidade • Checklist 5W2H</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Fatores mínimos de verificação para controle de qualidade da petição inicial ou requerimento administrativo.</p>
              </div>

              <div className="space-y-4">
                
                {/* CHECKLIST ITEMS LIST */}
                {[
                  { key: 'oQue', label: 'O Quê?', question: 'Foi colhido e esclarecido tudo o que de fato aconteceu no caso?', placeholder: 'Descreva observações curtas sobre o fato ocorrido (ex: Danos morais após negativa de atendimento no hospital).' },
                  { key: 'quem', label: 'Quem?', question: 'Foram identificadas e qualificadas todas as pessoas envolvidas ou testemunhas?', placeholder: 'Obs (ex: Informações completas do preposto e uma testemunha ocular).' },
                  { key: 'onde', label: 'Onde?', question: 'O local exato dos fatos (físico ou eletrônico) foi devidamente mapeado?', placeholder: 'Obs (ex: Contrato via app corporativo, IP logado informado).' },
                  { key: 'quando', label: 'Quando?', question: 'As datas, prazos contratuais e marcos temporais estão esclarecidos?', placeholder: 'Obs (ex: Fato ocorrido em 12/03/2026, prazo final reclamação 11/04).' },
                  { key: 'como', label: 'Como?', question: 'A mecânica fática ou a forma como se sucederam os fatos foi compreendida?', placeholder: 'Obs (ex: Bloqueio súbito de conta após mudança unilateral de diretriz).' },
                  { key: 'porque', label: 'Por Quê?', question: 'A causa motriz ou a motivação/origem técnica da lide foi investigada?', placeholder: 'Obs (ex: Desconhecimento do termo de uso, cobrança e restrição indevida).' },
                  { key: 'comoResolver', label: 'Como pretende resolver?', question: 'O proveito financeiro ou encaminhamento esperado pelo cliente está nítido?', placeholder: 'Obs (ex: Restituição do saldo retido e indenização por cerceamento).' },
                ].map((item) => {
                  const booleanVal = (checklist as any)[item.key] === true;
                  const obsVal = (checklist as any)[`${item.key}Obs`] || '';

                  return (
                    <div 
                      key={item.key} 
                      className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row gap-4 items-start ${
                        booleanVal 
                          ? 'border-emerald-150 bg-emerald-55/15' 
                          : 'border-red-150 bg-red-50/15'
                      }`}
                    >
                      {/* Check interaction column */}
                      <div className="flex items-center gap-2 shrink-0 select-none">
                        <button
                          type="button"
                          onClick={() => handleChecklistToggle(item.key as keyof Checklist5W2HState)}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                            booleanVal
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                              : 'bg-white border-red-200 text-red-500 hover:bg-red-50'
                          }`}
                        >
                          {booleanVal ? <Check size={18} className="stroke-[3.5px]" /> : <X size={18} className="stroke-[3.5px]" />}
                        </button>
                        
                        <div className="text-center sm:hidden text-lg">
                          {booleanVal ? '✅' : '❌'}
                        </div>
                      </div>

                      {/* Content column */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            booleanVal ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.label}
                          </span>
                          <span className="hidden sm:inline text-xs">
                            {booleanVal 
                              ? <span className="text-emerald-700 font-bold flex items-center gap-0.5">✅ Conferido</span>
                              : <span className="text-red-700 font-bold flex items-center gap-0.5">❌ Conferir pendência</span>
                            }
                          </span>
                        </div>
                        
                        <p className="text-xs font-bold text-gray-800 leading-relaxed font-sans">
                          {item.question}
                        </p>

                        <input 
                          type="text"
                          value={obsVal}
                          onChange={(e) => handleChecklistObsChange(item.key as keyof Checklist5W2HState, e.target.value)}
                          placeholder={item.placeholder}
                          className="w-full bg-white/70 border border-gray-200 focus:bg-white focus:border-gray-950 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                        />
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* PART 4: OPERATIONAL CASE TITLE */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-4 shadow-xs">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">Título Operacional do Caso</h4>
                <p className="text-[11px] text-gray-400 mt-0.5 font-sans">Identificação curta usada na gestão interna de pautas processuais.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-650 tracking-wide block">Título do Caso *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Ação Rescisória de Aluguel Habitacional" 
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:ring-1 transition-all outline-none ${
                    !title.trim() ? 'border-red-200 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-gray-950'
                  }`}
                />
              </div>
            </div>

            {/* PART 5 & 6: CONTROLE, VISIBILIDADE & STATUS INTERNO INTEGRADO (Solution 5) */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">Controle de Status e Transparência do Cliente</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Gestão técnica de status de produção e publicação correspondente na timeline do cliente.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Embedded Internal Status Column with Concept & Suggestions */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                      <Activity size={12} className="text-indigo-600" />
                      <span>Status Interno de Produção *</span>
                    </label>
                    <p className="text-[11px] text-gray-400 leading-relaxed">Status restrito à equipe técnica interna.</p>
                    <select
                      value={statusInterno}
                      onChange={(e) => handleStatusInternoChange(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none cursor-pointer"
                    >
                      {statusInternoOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* CONCEPT BOX PLACED IMMEDIATELY UNDER THE SELECTION DROPDOWN (Solution 5) */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
                      <Info size={12} className="text-indigo-600" />
                      <span>Conceito & Prática Corporativa</span>
                    </div>

                    <p className="text-xs text-gray-700 leading-relaxed font-sans">
                      Conceito do status <strong className="text-gray-900 font-bold">"{statusInterno}"</strong>: <br/>
                      <span className="text-gray-650 font-medium italic">"{statusConcepts[statusInterno] || 'Fase de análise interna.'}"</span>
                    </p>

                    <p className="text-xs text-gray-750 font-medium leading-none font-mono border-t border-gray-100 pt-2 flex items-center gap-1">
                      <span>Sugestão à timeline:</span>
                      <strong className="text-indigo-700">"{statusMapping[statusInterno] || ''}"</strong>
                    </p>

                    {isPublicStatusManuallyEdited && (
                      <button
                        type="button"
                        onClick={handleRestoreStatusSuggestion}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-100 hover:bg-indigo-150 text-indigo-700 font-extrabold rounded-lg text-[10px] transition-all cursor-pointer w-full justify-center border border-indigo-200"
                      >
                        <RefreshCw size={10} className="animate-spin-once" />
                        Restaturar sugestão automática
                      </button>
                    )}
                  </div>
                </div>

                {/* Visible to client and manual public status */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                      <User size={12} className="text-indigo-600" />
                      <span>Exibir no Portal do Cliente?</span>
                    </label>
                    <p className="text-[11px] text-gray-400 leading-relaxed">Define se o caso fica visível ou opaco no portal do cliente.</p>
                    <div className="flex items-center gap-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => setVisibleToClient(!visibleToClient)}
                        className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all outline-none duration-250 cursor-pointer ${
                          visibleToClient ? 'bg-emerald-600 justify-end' : 'bg-gray-200 justify-start'
                        }`}
                      >
                        <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                      </button>
                      <span className="text-xs font-bold text-gray-700">
                        {visibleToClient ? 'Visível (Indicado)' : 'Ocultado ao cliente'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                      <span>Status Público do Cliente (Timeline do Portal) *</span>
                    </label>
                    
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Texto exibido para o cliente logado no portal.
                    </p>
                    
                    <input
                      type="text"
                      value={statusPublicoCliente}
                      onChange={handlePublicStatusChange}
                      placeholder="Defina as palavras do status público..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* Extra hidden parameters for completeness and alignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-gray-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-650 tracking-wide">Prioridade da Demanda</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none cursor-pointer"
                  >
                    <option value="baixa">Baixa prioridade operacional</option>
                    <option value="media">Média / Peticionamento ordinário</option>
                    <option value="alta">Alta / Plantão ou Urgência liminar</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-650 tracking-wide">Assessor / Especialista Responsável</label>
                  <input 
                    type="text" 
                    value={responsibleLawyer} 
                    onChange={(e) => setResponsibleLawyer(e.target.value)}
                    placeholder="Ex: Dr. Carlos Giffoni" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                  />
                </div>
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
    </FluxoStepLayout>
  );
}
