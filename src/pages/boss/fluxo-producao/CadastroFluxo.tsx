import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { 
  UserPlus, 
  Briefcase, 
  Search, 
  ArrowRight, 
  Info, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Building2,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { normalizeCpfCnpj, isValidCpf, isValidCnpj, detectDocumentType } from './utils/documentUtils';
import { generateSafeClientSlug } from './utils/slugUtils';
import { unifiedSearch, ClientData, getAllClients } from './utils/clientSearch';

type CadastroPath = 'novo-cliente' | 'novo-caso' | 'continuar';

export default function CadastroFluxo() {
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState<CadastroPath>('novo-cliente');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Path 1 — Novo Cliente states
  const [clientType, setClientType] = useState<'PF' | 'PJ'>('PF');
  const [pfNome, setPfNome] = useState('');
  const [pfCpf, setPfCpf] = useState('');
  const [pfEmail, setPfEmail] = useState('');
  const [pfTelefone, setPfTelefone] = useState('');
  const [pfPortalStatus, setPfPortalStatus] = useState<'ativo' | 'inativo'>('ativo');

  const [pjRazao, setPjRazao] = useState('');
  const [pjCnpj, setPjCnpj] = useState('');
  const [pjEmail, setPjEmail] = useState('');
  const [pjTelefone, setPjTelefone] = useState('');
  const [pjPortalStatus, setPjPortalStatus] = useState<'ativo' | 'inativo'>('ativo');

  // Duplication management
  const [checkingDuplicity, setCheckingDuplicity] = useState(false);
  const [foundDuplicateClient, setFoundDuplicateClient] = useState<ClientData | null>(null);
  const [docValidationError, setDocValidationError] = useState<string | null>(null);

  // Path 2 — Novo Caso states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientData[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClientForCase, setSelectedClientForCase] = useState<ClientData | null>(null);

  // Path 3 — Continuar Fluxo states
  const [casesList, setCasesList] = useState<any[]>([]);
  const [filteredCases, setFilteredCases] = useState<any[]>([]);
  const [casesQuery, setCasesQuery] = useState('');
  const [loadingCases, setLoadingCases] = useState(false);

  // Paths descriptions
  const paths = [
    {
      id: 'novo-cliente' as CadastroPath,
      label: 'Novo Cliente',
      desc: 'Primeiro cadastro do cliente.',
      icon: UserPlus
    },
    {
      id: 'novo-caso' as CadastroPath,
      label: 'Novo Caso',
      desc: 'Caso para cliente existente.',
      icon: Briefcase
    },
    {
      id: 'continuar' as CadastroPath,
      label: 'Continuar Fluxo',
      desc: 'Retomar de onde parou.',
      icon: Search
    }
  ];

  // Auto search duplicity for PF CPF or PJ CNPJ
  const checkDuplicity = async (docValue: string, type: 'PF' | 'PJ') => {
    const cleanDoc = normalizeCpfCnpj(docValue);
    setFoundDuplicateClient(null);
    setDocValidationError(null);

    if (type === 'PF') {
      if (cleanDoc.length === 11) {
        if (!isValidCpf(cleanDoc)) {
          setDocValidationError('CPF inválido.');
          return;
        }
        await performDuplicitySearch(cleanDoc, 'PF');
      }
    } else {
      if (cleanDoc.length === 14) {
        if (!isValidCnpj(cleanDoc)) {
          setDocValidationError('CNPJ inválido.');
          return;
        }
        await performDuplicitySearch(cleanDoc, 'PJ');
      }
    }
  };

  const performDuplicitySearch = async (cleanDoc: string, type: 'PF' | 'PJ') => {
    setCheckingDuplicity(true);
    try {
      const all = await getAllClients();
      const match = all.find(c => {
        if (type === 'PF' && c.type === 'PF') {
          const docCpf = normalizeCpfCnpj(c.pfDadosPessoais?.pf_cpf || c.pfData?.pf_cpf || '');
          return docCpf === cleanDoc;
        }
        if (type === 'PJ' && c.type === 'PJ') {
          const docCnpj = normalizeCpfCnpj(c.pjDadosEmpresa?.pj_cnpj || c.pjData?.pj_cnpj || '');
          return docCnpj === cleanDoc;
        }
        return false;
      });

      if (match) {
        setFoundDuplicateClient(match);
      }
    } catch (err) {
      console.error('Erro ao buscar duplicidade:', err);
    } finally {
      setCheckingDuplicity(false);
    }
  };

  // PF doc change
  const handlePfCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPfCpf(val);
    checkDuplicity(val, 'PF');
  };

  // PJ doc change
  const handlePjCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPjCnpj(val);
    checkDuplicity(val, 'PJ');
  };

  // Path 2 searches
  const handleClientSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const results = await unifiedSearch(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setError('Nenhum cliente cadastrado correspondendo aos termos fornecidos.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao pesquisar clientes na base.');
    } finally {
      setSearching(false);
    }
  };

  // Path 3 loads
  useEffect(() => {
    if (selectedPath === 'continuar') {
      loadDraftAndActiveCases();
    }
  }, [selectedPath]);

  const loadDraftAndActiveCases = async () => {
    setLoadingCases(true);
    setError(null);
    try {
      const snapshots = await getDocs(collection(db, 'cases'));
      const list: any[] = [];
      const allCli = await getAllClients();

      snapshots.forEach((docSnap) => {
        const data = docSnap.data();
        const client = allCli.find(cl => cl.clientId === data.clientId);
        
        list.push({
          id: docSnap.id,
          ...data,
          clientName: client 
            ? (client.type === 'PF' 
                ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cliente PF')
                : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Cliente PJ'))
            : 'Cliente não identificado'
        });
      });

      // Filter: status == rascunho OR productionStatus belongs to ['em_producao', 'com_pendencias', 'pausado']
      const filtered = list.filter((c: any) => {
        return c.status === 'rascunho' || ['em_producao', 'com_pendencias', 'pausado'].includes(c.productionStatus);
      });

      setCasesList(filtered);
      setFilteredCases(filtered);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar lista de fluxos ativos.');
    } finally {
      setLoadingCases(false);
    }
  };

  const handleCasesFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCasesQuery(val);
    if (!val.trim()) {
      setFilteredCases(casesList);
      return;
    }
    const lower = val.toLowerCase();
    const filtered = casesList.filter(c => {
      return (
        c.clientName.toLowerCase().includes(lower) ||
        (c.title || '').toLowerCase().includes(lower) ||
        (c.processNumber || '').toLowerCase().includes(lower) ||
        c.id.toLowerCase().includes(lower)
      );
    });
    setFilteredCases(filtered);
  };

  // Path 1 — Novo Cliente Save
  const handleSaveNovoCliente = async () => {
    setError(null);
    setSuccess(null);

    const isPf = clientType === 'PF';
    const name = isPf ? pfNome.trim() : pjRazao.trim();
    const email = isPf ? pfEmail.trim() : pjEmail.trim();
    const docCode = isPf ? normalizeCpfCnpj(pfCpf) : normalizeCpfCnpj(pjCnpj);
    const phone = isPf ? pfTelefone.trim() : pjTelefone.trim();
    const portalStatus = isPf ? pfPortalStatus : pjPortalStatus;

    if (!name) {
      setError(isPf ? 'Por favor, informe o Nome Completo.' : 'Por favor, informe a Razão Social.');
      return;
    }
    if (!docCode) {
      setError(isPf ? 'Por favor, informe o CPF.' : 'Por favor, informe o CNPJ.');
      return;
    }
    if (isPf && !isValidCpf(docCode)) {
      setError('O CPF informado é inválido.');
      return;
    }
    if (!isPf && !isValidCnpj(docCode)) {
      setError('O CNPJ informado é inválido.');
      return;
    }
    if (!email) {
      setError('Por favor, informe o e-mail de contato cadastral.');
      return;
    }
    if (!phone) {
      setError('Por favor, informe o telefone/WhatsApp.');
      return;
    }

    if (foundDuplicateClient) {
      setError('O CPF/CNPJ digitado já encontra-se vinculado a outro cliente existente. Operação bloqueada.');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate safe slug
      const clientSlug = generateSafeClientSlug(name, clientType, docCode);

      // Verify if clientPortals/{slug} document already exists
      const portalDocSnap = await getDoc(doc(db, 'clientPortals', clientSlug));
      if (portalDocSnap.exists()) {
        setError('Slug já existente. Revise o cadastro antes de prosseguir.');
        setLoading(false);
        return;
      }

      // 2. Generate new absolute clientId
      const clientsCollect = collection(db, 'clients');
      const newClientDocRef = doc(clientsCollect);
      const generatedClientId = newClientDocRef.id;

      const rightNow = new Date().toISOString();

      // Structure of clients document
      const clientPayload: any = {
        clientId: generatedClientId,
        type: clientType,
        active: true,
        slug: clientSlug,
        createdAt: rightNow,
        updatedAt: rightNow,
        acessoSistema: {
          acesso_statusAcesso: portalStatus,
          acesso_emailLogin: email
        }
      };

      if (isPf) {
        const pfBlock = {
          pf_nomeCompleto: name,
          pf_cpf: docCode,
          pf_email: email,
          pf_telefone: phone,
          pf_whatsapp: phone
        };
        clientPayload.pfData = pfBlock;
        clientPayload.pfDadosPessoais = pfBlock;
      } else {
        const pjBlock = {
          pj_razaoSocial: name,
          pj_cnpj: docCode,
          pj_emailEmpresa: email,
          pj_telefoneEmpresa: phone,
          pj_whatsappEmpresa: phone
        };
        clientPayload.pjData = pjBlock;
        clientPayload.pjDadosEmpresa = pjBlock;
      }

      // Write to FB (clients)
      await setDoc(newClientDocRef, clientPayload);

      // Write clientPortals mapping
      await setDoc(doc(db, 'clientPortals', clientSlug), {
        clientId: generatedClientId,
        slug: clientSlug,
        active: portalStatus === "ativo",
        createdAt: rightNow,
        updatedAt: rightNow
      });

      // Write users registry
      await setDoc(doc(db, 'users', generatedClientId), {
        email: email,
        role: "client",
        clientId: generatedClientId,
        clientSlug: clientSlug,
        name: name,
        status: portalStatus,
        createdAt: rightNow
      });

      // Write users invites registry
      await setDoc(doc(db, 'users_invites', generatedClientId), {
        email: email,
        role: "client",
        clientId: generatedClientId,
        clientSlug: clientSlug,
        status: "pending",
        invitedAt: rightNow
      });

      setSuccess('Cadastro cadastral prévio concluído com sucesso total!');
      
      // Redirect to /boss-giffoni-clientes/fluxo-producao/tipo-producao?clientId={generatedClientId}
      navigate(`/boss-giffoni-clientes/fluxo-producao/tipo-producao?clientId=${generatedClientId}`);

    } catch (err: any) {
      console.error(err);
      setError(`Erro ao tentar salvar novo cliente: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Path 2 — Novo Caso Save / Advance
  const handleSaveNovoCaso = () => {
    if (!selectedClientForCase) {
      setError('Por favor, selecione um cliente existente na lista.');
      return;
    }
    const cId = selectedClientForCase.clientId;
    navigate(`/boss-giffoni-clientes/fluxo-producao/tipo-producao?clientId=${cId}`);
  };

  // Stage routing redirect for Path 3
  const handleContinueCase = (c: any) => {
    const routeStage = c.productionStage || 'dados-caso';
    
    // Clean stage mapping
    let pagePath = 'dados-caso';
    const s = routeStage.toLowerCase();
    if (s === 'dados-caso' || s === 'dadoscaso') pagePath = 'dados-caso';
    else if (s === 'solicitacoes-informacoes' || s === 'solicitacoessextra' || s === 'solicitacoesinformacoes') pagePath = 'solicitacoes-informacoes';
    else if (s === 'solicitacoes-provas' || s === 'solicitacoesprovas') pagePath = 'solicitacoes-provas';
    else if (s === 'financeiro') pagePath = 'financeiro';
    else if (s === 'edrp') pagePath = 'edrp';
    else if (s === 'revisao' || s === 'revisaoteconica' || s === 'revisao-tecnica') pagePath = 'revisao';
    else if (s === 'protocolo') pagePath = 'protocolo';
    else if (s === 'controladoria') pagePath = 'controladoria';
    else if (s === 'relatorio-integridade' || s === 'relatoriointegridade') pagePath = 'relatorio-integridade';

    navigate(`/boss-giffoni-clientes/fluxo-producao/${c.id}/${pagePath}`);
  };

  return (
    <FluxoStepLayout stepName="Cadastro Geral" statusText="Fase Ativa">
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Qual é o caminho desejado?</h3>
          <p className="text-xs text-gray-500 mt-1">
            Selecione a modalidade correta para prosseguir com o fluxo de produção de casos.
          </p>
        </div>

        {/* Path Grid Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paths.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPath === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPath(p.id);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all ${
                  isSelected 
                    ? 'bg-gray-950 text-white border-transparent shadow-md font-sans' 
                    : 'bg-white text-gray-700 border-gray-150 hover:border-gray-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-50 text-gray-400'
                }`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs tracking-tight uppercase font-sans">{p.label}</h4>
                  <p className={`text-[10px] leading-relaxed mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                    {p.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ERRORS & SUCCESS MESSAGES */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 text-xs flex gap-3 items-center">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* PATH VIEWS */}
        
        {/* PATH 1 — NOVO CLIENTE */}
        {selectedPath === 'novo-cliente' && (
          <div className="space-y-6">
            <div className="border border-gray-150 rounded-2xl bg-white p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono">Ficha de Identificação Cadastral</h4>
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setClientType('PF');
                      setFoundDuplicateClient(null);
                      setDocValidationError(null);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md ${
                      clientType === 'PF' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Pessoa Física (PF)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientType('PJ');
                      setFoundDuplicateClient(null);
                      setDocValidationError(null);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md ${
                      clientType === 'PJ' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Pessoa Jurídica (PJ)
                  </button>
                </div>
              </div>

              {clientType === 'PF' ? (
                /* PF FORM FIELDS */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={pfNome}
                      onChange={(e) => setPfNome(e.target.value)}
                      placeholder="Nome completo sem abreviações"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-medium text-xs text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">CPF *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={pfCpf}
                        onChange={handlePfCpfChange}
                        placeholder="Ex: 12345678900 (apenas números)"
                        className={`w-full px-4 py-3 bg-gray-50 border focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-medium text-xs text-gray-800 transition-all outline-none ${
                          docValidationError ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      {checkingDuplicity && (
                        <div className="absolute right-3 top-3.5">
                          <Loader2 size={14} className="text-gray-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    {docValidationError && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">{docValidationError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">E-mail *</label>
                    <input
                      type="email"
                      value={pfEmail}
                      onChange={(e) => setPfEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-medium text-xs text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      value={pfTelefone}
                      onChange={(e) => setPfTelefone(e.target.value)}
                      placeholder="81999998888"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-medium text-xs text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Status de Acesso ao Portal *</label>
                    <select
                      value={pfPortalStatus}
                      onChange={(e) => setPfPortalStatus(e.target.value as 'ativo' | 'inativo')}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-semibold text-xs text-gray-800 transition-all outline-none cursor-pointer"
                    >
                      <option value="ativo">Ativo (Permitir convite de login)</option>
                      <option value="inativo">Inativo (Bloquear portal temporariamente)</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* PJ FORM FIELDS */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Razão Social *</label>
                    <input
                      type="text"
                      value={pjRazao}
                      onChange={(e) => setPjRazao(e.target.value)}
                      placeholder="Razão social completa"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-medium text-xs text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">CNPJ *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={pjCnpj}
                        onChange={handlePjCnpjChange}
                        placeholder="Ex: 12345678000100 (apenas números)"
                        className={`w-full px-4 py-3 bg-gray-50 border focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-medium text-xs text-gray-800 transition-all outline-none ${
                          docValidationError ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      {checkingDuplicity && (
                        <div className="absolute right-3 top-3.5">
                          <Loader2 size={14} className="text-gray-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    {docValidationError && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">{docValidationError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">E-mail *</label>
                    <input
                      type="email"
                      value={pjEmail}
                      onChange={(e) => setPjEmail(e.target.value)}
                      placeholder="financeiro@empresa.com"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-medium text-xs text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      value={pjTelefone}
                      onChange={(e) => setPjTelefone(e.target.value)}
                      placeholder="8133334444"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-medium text-xs text-gray-800 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Status de Acesso ao Portal *</label>
                    <select
                      value={pjPortalStatus}
                      onChange={(e) => setPjPortalStatus(e.target.value as 'ativo' | 'inativo')}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl font-semibold text-xs text-gray-800 transition-all outline-none cursor-pointer"
                    >
                      <option value="ativo">Ativo (Permitir convite de login)</option>
                      <option value="inativo">Inativo (Bloquear portal temporariamente)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* DUPLICITY MATCH ALREADY EXISTS WARNING */}
            {foundDuplicateClient && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4 text-amber-900 animate-fadeIn">
                <div className="flex gap-3 items-start">
                  <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black uppercase tracking-wider font-sans">Atenção: Duplicidade Encontrada!</h5>
                    <p className="text-xs leading-relaxed font-semibold">
                      O CPF/CNPJ digitado já existe na base corporativa. O processo de criação de um novo cadastro foi bloqueado para manter integridade dos dados.
                    </p>
                    <div className="pt-3 font-mono text-[10px] space-y-0.5 text-amber-800">
                      <div><span className="font-bold">Cliente:</span> {
                        foundDuplicateClient.type === 'PF' 
                          ? (foundDuplicateClient.pfDadosPessoais?.pf_nomeCompleto || foundDuplicateClient.pfData?.pf_nomeCompleto)
                          : (foundDuplicateClient.pjDadosEmpresa?.pj_razaoSocial || foundDuplicateClient.pjData?.pj_razaoSocial)
                      }</div>
                      <div><span className="font-bold">ID do Sistema:</span> {foundDuplicateClient.clientId}</div>
                      <div><span className="font-bold">E-mail:</span> {
                        foundDuplicateClient.type === 'PF'
                          ? (foundDuplicateClient.pfDadosPessoais?.pf_email || foundDuplicateClient.pfData?.pf_email)
                          : (foundDuplicateClient.pjDadosEmpresa?.pj_emailEmpresa || foundDuplicateClient.pjData?.pj_emailEmpresa)
                      }</div>
                      <div><span className="font-bold">Slug Seguro:</span> {foundDuplicateClient.slug}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/tipo-producao?clientId=${foundDuplicateClient.clientId}`)}
                    className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    <span>Criar novo caso para este cliente</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ACTION FOOTER */}
            <div className="flex sm:justify-end border-t border-gray-100 pt-6">
              <button
                type="button"
                disabled={loading || foundDuplicateClient !== null}
                onClick={handleSaveNovoCliente}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Salvando Cliente...</span>
                  </>
                ) : (
                  <>
                    <span>Adicionar Cliente e Prosseguir</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PATH 2 — NOVO CASO (CLIENTE EXISTENTE) */}
        {selectedPath === 'novo-caso' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider font-sans">Pesquisa na Base de Clientes</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                  Encontre um cliente já integrado ao Giffoni Connect para criar uma nova ordem processual sob a mesma titularidade.
                </p>
              </div>

              <form onSubmit={handleClientSearch} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por CPF, CNPJ, nome completo, e-mail, telefone, slug..."
                  className="w-full px-4 py-3 bg-white border border-gray-250 rounded-xl focus:ring-1 focus:ring-gray-950 placeholder:text-gray-450 transition-all font-medium text-xs text-gray-800 outline-none"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex items-center justify-center gap-2 bg-gray-950 hover:bg-black text-white px-6 py-3 rounded-xl transition-all font-bold text-xs shrink-0 cursor-pointer"
                >
                  {searching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Search size={14} />
                      <span>Buscar</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* RESULTS LIST */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-gray-50 border-b border-gray-150 text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                  Resultados da Busca Correspondendo a Termos fáticos
                </div>
                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {searchResults.map((client) => {
                    const isSelected = selectedClientForCase?.clientId === client.clientId;
                    const cName = client.type === 'PF' 
                      ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Sem nome')
                      : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Sem razão social');

                    const cDoc = client.type === 'PF'
                      ? (client.pfDadosPessoais?.pf_cpf || client.pfData?.pf_cpf || '')
                      : (client.pjDadosEmpresa?.pj_cnpj || client.pjData?.pj_cnpj || '');

                    const cEmail = client.type === 'PF'
                      ? (client.pfDadosPessoais?.pf_email || client.pfData?.pf_email || '')
                      : (client.pjDadosEmpresa?.pj_emailEmpresa || client.pjData?.pj_emailEmpresa || '');

                    return (
                      <button
                        key={client.clientId}
                        type="button"
                        onClick={() => setSelectedClientForCase(client)}
                        className={`w-full p-4 flex justify-between items-center text-left transition-all hover:bg-gray-50/50 ${
                          isSelected ? 'bg-blue-50/70 hover:bg-blue-50/70 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-gray-900 tracking-tight font-sans">{cName}</h5>
                          <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-600 mr-2 uppercase tracking-wide">
                              {client.type}
                            </span>
                            Documento: {cDoc} • E-mail: {cEmail}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-bold">{client.slug}</span>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACTION FOOTER */}
            <div className="flex sm:justify-end border-t border-gray-100 pt-6">
              <button
                type="button"
                disabled={!selectedClientForCase}
                onClick={handleSaveNovoCaso}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-xs cursor-pointer"
              >
                <span>Vincular e Prosseguir</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* PATH 3 — CONTINUAR FLUXO */}
        {selectedPath === 'continuar' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-4 pb-5">
              <div>
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider font-sans">Retomar Fluxos Incompletos / Ativos</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                  Encontre rascunhos de produção ou procedimentos em andamento para continuar seu preenchimento e homologação fática na controladoria.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-3 text-gray-450" size={16} />
                <input
                  type="text"
                  value={casesQuery}
                  onChange={handleCasesFilterChange}
                  placeholder="Pesquisar por nome do cliente, título do caso, código fático..."
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-250 rounded-xl focus:ring-1 focus:ring-gray-950 placeholder:text-gray-450 transition-all font-medium text-xs text-gray-800 outline-none"
                />
              </div>
            </div>

            {/* ACTIVE CASES LIST */}
            {loadingCases ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-gray-500" size={24} />
                <span className="text-xs font-bold font-mono">Indexando casos ativos...</span>
              </div>
            ) : filteredCases.length > 0 ? (
              <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white divide-y divide-gray-100 shadow-sm">
                {filteredCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50/50 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-blue-50 border border-blue-100 text-blue-700">
                          {c.status || 'Rascunho'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">[{c.id}]</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 tracking-tight font-sans">{c.clientName}</h4>
                      <div className="text-[10.5px] text-gray-400 leading-relaxed">
                        Procedimento: <span className="font-bold text-gray-600">{c.actionCategory || c.actionType || 'Geral'}</span> • Etapa atual: <span className="font-bold text-indigo-600 uppercase tracking-wide font-mono text-[9px]">{c.productionStage || 'Início'}</span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleContinueCase(c)}
                      className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer self-start sm:self-center"
                    >
                      <span>Retomar de Onde Parou</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 border border-dashed border-gray-200 rounded-2xl text-center text-gray-400 bg-gray-50/20">
                <Info size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-bold text-gray-500">Nenhum fluxo em rascunho correspondente.</p>
                <p className="text-[10px] text-gray-400 leading-relaxed max-w-sm mx-auto mt-1">Todos os processos encontram-se concluídos na auditoria ou não há casos registrados sob esta consulta fática.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </FluxoStepLayout>
  );
}
