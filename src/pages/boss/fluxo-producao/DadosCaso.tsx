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
  RefreshCw
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

// Multi-functional map of internal status -> suggested public status for client
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

interface MiniRichEditorProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  isMissing: boolean;
}

// Mini Rich Text Editor in compliance with Solution 3
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
          className="px-2.5 py-1.5 text-[11px] text-gray-800 hover:bg-yellow-100 border border-yellow-200 rounded-lg transition-all bg-yellow-50 flex items-center gap-1.5 cursor-pointer font-bold"
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
          className="px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 rounded-lg transition-all font-bold ml-auto cursor-pointer"
          title="Limpar marcação"
        >
          Limpar formatação
        </button>
      </div>

      {/* Editor Main Canvas - Styled like clean judicial pages in compliance with Solution 3 */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onPaste={handlePaste}
        className="outline-none min-h-[160px] p-6 text-gray-900 bg-white"
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

export default function DadosCaso() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  // Screen states
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Loaded assets
  const [client, setClient] = useState<any>(null);
  const [caseObj, setCaseObj] = useState<any>(null);

  // Narrative inputs (mini word editor)
  const [basesFaticas, setBasesFaticas] = useState('');
  const [description, setDescription] = useState(''); // detail narrative
  const [fatosAbordagem, setFatosAbordagem] = useState('');

  // 5W2H input states
  const [oQueAconteceu, setOQueAconteceu] = useState('');
  const [quemParticipou, setQuemParticipou] = useState('');
  const [ondeAconteceu, setOndeAconteceu] = useState('');
  const [quandoAconteceu, setQuandoAconteceu] = useState('');
  const [comoAconteceu, setComoAconteceu] = useState('');
  const [porQueAconteceu, setPorQueAconteceu] = useState('');
  const [comoPretendeResolver, setComoPretendeResolver] = useState('');

  // Core administrative inputs
  const [title, setTitle] = useState('');
  
  // Separated classification inputs
  const [materia, setMateria] = useState('');
  const [ramo, setRamo] = useState('');
  const [tipoAcao, setTipoAcao] = useState('');

  const [priority, setPriority] = useState('media');
  const [responsibleLawyer, setResponsibleLawyer] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [statusInterno, setStatusInterno] = useState('Em produção');
  const [statusPublicoCliente, setStatusPublicoCliente] = useState('');
  const [isPublicStatusManuallyEdited, setIsPublicStatusManuallyEdited] = useState(false);

  // Options
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

        // Core inputs
        setTitle(data.title || '');
        setPriority(data.priority || 'media');
        setResponsibleLawyer(data.responsibleLawyer || '');
        setVisibleToClient(data.visibleToClient !== false);
        setStatusInterno(data.statusInterno || 'Em produção');
        setStatusPublicoCliente(data.statusPublicoCliente || '');
        setIsPublicStatusManuallyEdited(data.isPublicStatusManuallyEdited === true);

        // Separated classification fields
        setMateria(data.materia || (data.caseType ? data.caseType.split('/')[0]?.trim() : ''));
        setRamo(data.ramo || (data.caseType ? data.caseType.split('/')[1]?.trim() : ''));
        setTipoAcao(data.tipoAcao || (data.caseType ? data.caseType.split('/')[2]?.trim() : ''));

        // Load 5W2H & main narrative paragraphs safely
        setBasesFaticas(data.basesFaticas || '');
        setDescription(data.description || '');
        setFatosAbordagem(data.fatosAbordagem || '');
        setOQueAconteceu(data.oQueAconteceu || '');
        setQuemParticipou(data.quemParticipou || '');
        setOndeAconteceu(data.ondeAconteceu || '');
        setQuandoAconteceu(data.quandoAconteceu || '');
        setComoAconteceu(data.comoAconteceu || '');
        setPorQueAconteceu(data.porQueAconteceu || '');
        setComoPretendeResolver(data.comoPretendeResolver || data.encaminhamentoEsperado || '');

        // Client lookup
        if (data.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', data.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erro crítico ao carregar registros do caso: ${err.message || err}`);
      } finally {
        setFetching(false);
      }
    }

    loadCaseData();
  }, [caseId]);

  // Handle automatic Suggested Public Status mapping on Internal Status alteration
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

  // Check 5W2H completeness status
  const is5W2HComplete = !!(
    basesFaticas.trim() &&
    description.trim() &&
    fatosAbordagem.trim() &&
    oQueAconteceu.trim() &&
    quemParticipou.trim() &&
    ondeAconteceu.trim() &&
    quandoAconteceu.trim() &&
    comoAconteceu.trim() &&
    porQueAconteceu.trim() &&
    comoPretendeResolver.trim()
  );

  const is5W2HStarted = !!(
    basesFaticas.trim() ||
    description.trim() ||
    fatosAbordagem.trim() ||
    oQueAconteceu.trim() ||
    quemParticipou.trim() ||
    ondeAconteceu.trim() ||
    quandoAconteceu.trim() ||
    comoAconteceu.trim() ||
    porQueAconteceu.trim() ||
    comoPretendeResolver.trim()
  );

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
    setSuccess(null);

    // Calculate backward-compatible multi-classification fields
    const combinedCaseType = [materia.trim(), ramo.trim(), tipoAcao.trim()].filter(Boolean).join(' / ');

    // status resolution
    let currentStatusValue = caseObj?.status || 'active';
    if (currentStatusValue === 'rascunho' && title.trim()) {
      currentStatusValue = 'ativo';
    }

    // productionStatus: complete -> em_producao, incomplete -> com_pendencias
    const computedProductionStatus = is5W2HComplete ? 'em_producao' : 'com_pendencias';

    const timestamp = new Date().toISOString();
    const payload: any = {
      title: title.trim(),
      caseType: combinedCaseType,
      materia: materia.trim(),
      ramo: ramo.trim(),
      tipoAcao: tipoAcao.trim(),
      
      // Store all 5W2H narrative blocks
      basesFaticas: basesFaticas.trim(),
      description: description.trim(),
      fatosAbordagem: fatosAbordagem.trim(),
      oQueAconteceu: oQueAconteceu.trim(),
      quemParticipou: quemParticipou.trim(),
      ondeAconteceu: ondeAconteceu.trim(),
      quandoAconteceu: quandoAconteceu.trim(),
      comoAconteceu: comoAconteceu.trim(),
      porQueAconteceu: porQueAconteceu.trim(),
      comoPretendeResolver: comoPretendeResolver.trim(),

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
      // 1. Maintain primary cases collection persistence
      await updateDoc(doc(db, 'cases', caseId!), payload);
      
      // 2. Maintain mirrored list cases collection persistence
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

      setSuccess('Dados salvos na faticidade operacional com primor técnico!');
      setCaseObj({ ...caseObj, ...payload });
      return true;
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao gravar dados fáticos mestre: ${err.message || err}`);
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

  // Return blocked UI if caseId is empty
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
              Esboce a base de fatos reais do caso jurídicamente relevante e preencha o questionário metodológico.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!is5W2HComplete && is5W2HStarted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 text-[10px] font-black uppercase tracking-wider font-sans">
                <AlertTriangle size={11} className="text-amber-500" />
                Entrevista Incompleta
              </span>
            ) : is5W2HComplete ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-[10px] font-black uppercase tracking-wider font-sans">
                <CheckCircle2 size={11} className="text-emerald-500" />
                Fatos Consolidados
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-500 text-[10px] font-bold uppercase tracking-wider font-sans">
                Aguardando Preenchimento
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
          <div className="space-y-6">

            {/* IF INCOMPLETE WARNING CARD (Solution 6) */}
            {!is5W2HComplete && is5W2HStarted && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm flex gap-3 items-start animate-fadeIn">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-bold text-xs uppercase tracking-wider">Aviso de Integralidade Fática</h5>
                  <p className="leading-relaxed text-xs">
                    Entrevista 5W2H incompleta. Você pode navegar livremente pelas próximas etapas, mas esta pendência continuará registrada no painel administrativo até o preenchimento de todos os 10 fatores mínimos destacados abaixo com borda vermelha.
                  </p>
                </div>
              </div>
            )}

            {/* ORDEM REORGANIZADA DA TELA (Solution 2 & Series) */}

            {/* PART 1: BASES FÁTICAS */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-4">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">1. Bases Fáticas Informativas da Estruturação Inicial do Caso</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Visão mestre sobre a lide e os pressupostos de atuação.</p>
                </div>
                {!basesFaticas.trim() && (
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-red-50 rounded-md">Pendente *</span>
                )}
              </div>
              <MiniRichEditor 
                id="basesFaticas"
                value={basesFaticas}
                onChange={setBasesFaticas}
                placeholder="Insira as bases fáticas resumidas de inicialização fática da lide..." 
                isMissing={!basesFaticas.trim()}
              />
            </div>

            {/* PART 2: DESCRIÇÃO DETALHADA */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-4">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">2. Descrição Detalhada</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Narrativa minuciosa dos acontecimentos ocorridos cronologicamente.</p>
                </div>
                {!description.trim() && (
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-red-50 rounded-md">Pendente *</span>
                )}
              </div>
              <MiniRichEditor 
                id="description"
                value={description}
                onChange={setDescription}
                placeholder="Insira a descrição detalhada e técnica da lide..." 
                isMissing={!description.trim()}
              />
            </div>

            {/* PART 3: FATOS DE ABORDAGEM */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-4">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">3. Fatos de Abordagem</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Elementos de destaque e conexões de argumentação inicial.</p>
                </div>
                {!fatosAbordagem.trim() && (
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-red-50 rounded-md">Pendente *</span>
                )}
              </div>
              <MiniRichEditor 
                id="fatosAbordagem"
                value={fatosAbordagem}
                onChange={setFatosAbordagem}
                placeholder="Esclareça os fatos de abordagem e as nuances para a petição jurídica secundária..." 
                isMissing={!fatosAbordagem.trim()}
              />
            </div>

            {/* PART 4: ENTREVISTA 5W2H */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">4. Questionário Fático Operacional (5W2H)</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Indispensáveis para a tese mestre da inicial ou do rito administrativo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* 5W1H - O que aconteceu */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase text-gray-600 tracking-wide">O que aconteceu? (What) *</label>
                    {!oQueAconteceu.trim() && <span className="text-[9px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">Faltando</span>}
                  </div>
                  <textarea 
                    rows={3}
                    value={oQueAconteceu}
                    onChange={(e) => setOQueAconteceu(e.target.value)}
                    placeholder="Especifique o objeto ou fato ocorrido sob lide."
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none resize-none focus:bg-white focus:ring-1 ${
                      !oQueAconteceu.trim() ? 'border-red-200 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
                    }`}
                  />
                </div>

                {/* 5W2H - Quem participou */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase text-gray-600 tracking-wide">Quem participou? (Who) *</label>
                    {!quemParticipou.trim() && <span className="text-[9px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">Faltando</span>}
                  </div>
                  <textarea 
                    rows={2}
                    value={quemParticipou}
                    onChange={(e) => setQuemParticipou(e.target.value)}
                    placeholder="Identifique sujeitos, testemunhas e agentes ativos/passivos."
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none resize-none focus:bg-white focus:ring-1 ${
                      !quemParticipou.trim() ? 'border-red-200 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
                    }`}
                  />
                </div>

                {/* 5W3H - Onde aconteceu */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase text-gray-600 tracking-wide">Onde aconteceu? (Where) *</label>
                    {!ondeAconteceu.trim() && <span className="text-[9px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">Faltando</span>}
                  </div>
                  <textarea 
                    rows={2}
                    value={ondeAconteceu}
                    onChange={(e) => setOndeAconteceu(e.target.value)}
                    placeholder="Local físico, meios digitais ou fáticos de materialização."
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none resize-none focus:bg-white focus:ring-1 ${
                      !ondeAconteceu.trim() ? 'border-red-200 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
                    }`}
                  />
                </div>

                {/* 5W4H - Quando aconteceu */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase text-gray-600 tracking-wide">Quando aconteceu? (When) *</label>
                    {!quandoAconteceu.trim() && <span className="text-[9px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">Faltando</span>}
                  </div>
                  <textarea 
                    rows={2}
                    value={quandoAconteceu}
                    onChange={(e) => setQuandoAconteceu(e.target.value)}
                    placeholder="Data, prazos e momentos cronológicos de ocorrência."
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none resize-none focus:bg-white focus:ring-1 ${
                      !quandoAconteceu.trim() ? 'border-red-200 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
                    }`}
                  />
                </div>

                {/* 5W5H - Como aconteceu */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase text-gray-600 tracking-wide">Como aconteceu? (How) *</label>
                    {!comoAconteceu.trim() && <span className="text-[9px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">Faltando</span>}
                  </div>
                  <textarea 
                    rows={2}
                    value={comoAconteceu}
                    onChange={(e) => setComoAconteceu(e.target.value)}
                    placeholder="Forma ou modalidade técnica de ocorrência jurídica."
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none resize-none focus:bg-white focus:ring-1 ${
                      !comoAconteceu.trim() ? 'border-red-200 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
                    }`}
                  />
                </div>

                {/* 5W6H - Por que aconteceu */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase text-gray-600 tracking-wide">Por que aconteceu? (Why) *</label>
                    {!porQueAconteceu.trim() && <span className="text-[9px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">Faltando</span>}
                  </div>
                  <textarea 
                    rows={2}
                    value={porQueAconteceu}
                    onChange={(e) => setPorQueAconteceu(e.target.value)}
                    placeholder="Motivos motivadores, imperativos legais ou fáticos lesionados."
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none resize-none focus:bg-white focus:ring-1 ${
                      !porQueAconteceu.trim() ? 'border-red-200 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
                    }`}
                  />
                </div>

                {/* 5W7H - Como pretende resolver */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase text-gray-600 tracking-wide">Encaminhamento Esperado / Como pretende resolver? *</label>
                    {!comoPretendeResolver.trim() && <span className="text-[9px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">Faltando</span>}
                  </div>
                  <textarea 
                    rows={2}
                    value={comoPretendeResolver}
                    onChange={(e) => setComoPretendeResolver(e.target.value)}
                    placeholder="Objetivo pretendido pelo autor em face da lide."
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none resize-none focus:bg-white focus:ring-1 ${
                      !comoPretendeResolver.trim() ? 'border-red-200 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
                    }`}
                  />
                </div>

              </div>
            </div>

            {/* PART 5: TÍTULO DO CASO */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">5. Título Operacional do Caso</h4>
                <p className="text-[11px] text-gray-400 mt-0.5 font-sans">Título identificador para controle interno de pautas processuais.</p>
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

            {/* PART 6, 7 & 8: MATÉRIA, RAMO E TIPO DE AÇÃO (Solutions separated) */}
            <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">6 / 7 / 8. Enquadramento Jurídico e Classificação</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Campos separados para garantir robustez e consistência taxonômica.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* MATÉRIA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-650 tracking-wide block">Matéria (Ex: Direito do Consumidor, Civil) *</label>
                  <input 
                    type="text" 
                    value={materia} 
                    onChange={(e) => setMateria(e.target.value)}
                    placeholder="Direito do Consumidor" 
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:ring-1 transition-all outline-none ${
                      !materia.trim() ? 'border-red-100 focus:ring-red-450 focus:border-red-450' : 'border-gray-200 focus:ring-gray-950'
                    }`}
                  />
                </div>

                {/* RAMO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-650 tracking-wide block">Ramo (Ex: Contratos, Responsabilidade Civil) *</label>
                  <input 
                    type="text" 
                    value={ramo} 
                    onChange={(e) => setRamo(e.target.value)}
                    placeholder="Contratos Bancários" 
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:ring-1 transition-all outline-none ${
                      !ramo.trim() ? 'border-red-100 focus:ring-red-450 focus:border-red-450' : 'border-gray-200 focus:ring-gray-950'
                    }`}
                  />
                </div>

                {/* TIPO DE AÇÃO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-650 tracking-wide block">Tipo de Ação / Tipo de Caso *</label>
                  <input 
                    type="text" 
                    value={tipoAcao} 
                    onChange={(e) => setTipoAcao(e.target.value)}
                    placeholder="Declaratória de Inexistência" 
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:ring-1 transition-all outline-none ${
                      !tipoAcao.trim() ? 'border-red-100 focus:ring-red-450 focus:border-red-450' : 'border-gray-200 focus:ring-gray-950'
                    }`}
                  />
                </div>

              </div>

              {/* Extra technical parameters */}
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

            {/* PART 9: CONTROLE E VISIBILIDADE OPERACIONAL (Solution 5) */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">9. Controle e Visibilidade Operacional</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Sincronização de transparência entre a equipe mestre e a timeline do cliente.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Status Interno de Produção - Solution 5 */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                    <Activity size={12} className="text-indigo-600" />
                    <span>Status Interno de Produção *</span>
                  </label>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Status mestre restrito ao BOSS e assessores internos.</p>
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

                {/* Exibir no Portal do Cliente (Visible to client toggle) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                    <User size={12} className="text-indigo-600" />
                    <span>Exibir no Portal do Cliente?</span>
                  </label>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Garante ou opacifica a visibilidade geral do caso.</p>
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
                    <span className="text-xs font-bold text-gray-700">
                      {visibleToClient ? 'Visível (Indicado)' : 'Ocultado para o cliente'}
                    </span>
                  </div>
                </div>

                {/* Status Público do Cliente - Solution 5 */}
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <label className="text-xs font-bold uppercase text-gray-650 tracking-wide flex items-center gap-1.5">
                      <span>Status Público do Cliente (Timeline do Portal) *</span>
                    </label>
                    
                    {isPublicStatusManuallyEdited && (
                      <button
                        type="button"
                        onClick={handleRestoreStatusSuggestion}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-150 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <RefreshCw size={10} />
                        Restaurar sugestão automática
                      </button>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Anotação descritiva atualizada de transparência na timeline do cliente.
                  </p>
                  
                  <input
                    type="text"
                    value={statusPublicoCliente}
                    onChange={handlePublicStatusChange}
                    placeholder="Defina as palavras do status operacional..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                  />
                  
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-150 space-y-1.5 mt-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      <Info size={11} className="text-grey-400" />
                      <span>Conceito associado ao status interno atual:</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed font-sans">
                      Status Interno: <strong className="text-gray-900 font-bold">"{statusInterno}"</strong> • 
                      Sugestão automática da timeline pública: <strong className="text-indigo-700 font-bold">"{statusMapping[statusInterno] || ''}"</strong>
                    </p>
                  </div>
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
