import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BossLayout } from '../../../components/Layout';
import { db } from '../../../lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  User, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  HelpCircle, 
  ArrowLeft, 
  ChevronRight,
  CreditCard,
  FileBadge,
  Save,
  Building2,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function EditarPortalCliente() {
  const navigate = useNavigate();
  const { slug } = useParams();

  // Selected client & loading states
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientCases, setClientCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingCaseDetails, setLoadingCaseDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // States for Ficha de Identificação Cadastral Navigation & Visibility
  const [fichaActiveTab, setFichaActiveTab] = useState<'contratante' | 'endereco' | 'socios' | 'bancarios' | 'acesso'>('contratante');
  const [showFichaPassword, setShowFichaPassword] = useState(false);

  // Linked Entities
  const [activeSubTab, setActiveSubTab] = useState<'entrevista' | 'tipo_servico' | 'provas' | 'informacoes' | 'financeiro'>('entrevista');
  const [evidenceRequests, setEvidenceRequests] = useState<any[]>([]);
  const [informationRequests, setInformationRequests] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);

  // Local Edit States
  const [editingNarrative, setEditingNarrative] = useState('');
  const [savingNarrative, setSavingNarrative] = useState(false);
  const [serviceTypeKey, setServiceTypeKey] = useState('');
  const [serviceTypeName, setServiceTypeName] = useState('');
  const [savingService, setSavingService] = useState(false);

  // Form states for adding Provas
  const [newProofTitle, setNewProofTitle] = useState('');
  const [newProofDesc, setNewProofDesc] = useState('');
  const [newProofVisible, setNewProofVisible] = useState(true);
  const [newProofUpload, setNewProofUpload] = useState(true);
  const [addingProof, setAddingProof] = useState(false);

  // Form states for adding Informacoes
  const [newQuestionText, setNewQuestionText] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);

  // Form states for adding Financial
  const [newChargeType, setNewChargeType] = useState('honorarios_iniciais');
  const [newAmount, setNewAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('boleto');
  const [newInstallments, setNewInstallments] = useState(1);
  const [newDueDate, setNewDueDate] = useState('');
  const [newFinancialStatus, setNewFinancialStatus] = useState('pendente');
  const [newPublicMessage, setNewPublicMessage] = useState('');
  const [addingFinancial, setAddingFinancial] = useState(false);

  // Fetch client by slug or fallback to ID
  const fetchClientData = async () => {
    if (!slug) {
      setError('Slug do cliente não especificado.');
      setLoadingClient(false);
      return;
    }

    setLoadingClient(true);
    setError(null);
    try {
      let clientDoc: any = null;

      // 1. Query by slug
      const clientsRef = collection(db, 'clients');
      const qSlug = query(clientsRef, where('slug', '==', slug));
      const snapSlug = await getDocs(qSlug);

      if (!snapSlug.empty) {
        clientDoc = { id: snapSlug.docs[0].id, ...snapSlug.docs[0].data() };
      } else {
        // Try fallback to ID
        const directDoc = await getDoc(doc(db, 'clients', slug));
        if (directDoc.exists()) {
          clientDoc = { id: directDoc.id, ...directDoc.data() };
        }
      }

      if (!clientDoc) {
        setError(`Cliente com identificador "${slug}" não foi encontrado no sistema.`);
        return;
      }

      setSelectedClient(clientDoc);

      // Fetch client cases
      const qCases = query(collection(db, 'cases'), where('clientId', '==', clientDoc.id));
      const snapCases = await getDocs(qCases);
      const listCases: any[] = [];
      snapCases.forEach((d) => {
        listCases.push({ id: d.id, ...d.data() });
      });
      setClientCases(listCases);

      // Auto-select first case if exists to facilitate editing immediately
      if (listCases.length > 0) {
        handleSelectCase(listCases[0], clientDoc.id);
      }

    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar dados do cliente: ' + (err.message || err));
    } finally {
      setLoadingClient(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [slug]);

  // Load selected case's related data
  const handleSelectCase = async (caseObj: any, clientIdPassed?: string) => {
    setSelectedCase(caseObj);
    setLoadingCaseDetails(true);
    setActiveSubTab('entrevista');
    
    setEditingNarrative(caseObj.entrevistaPadrao || caseObj.description || '');
    setServiceTypeKey(caseObj.registrationTypeKey || '');
    setServiceTypeName(caseObj.registrationType || '');

    const targetClientId = clientIdPassed || selectedClient?.id;
    if (!targetClientId) return;

    try {
      // 1. Fetch caseEvidenceRequests
      const proofQuery = query(collection(db, 'caseEvidenceRequests'), where('caseId', '==', caseObj.id));
      const proofSnap = await getDocs(proofQuery);
      const proofList: any[] = [];
      proofSnap.forEach((d) => {
        proofList.push({ id: d.id, ...d.data() });
      });
      setEvidenceRequests(proofList);

      // 2. Fetch caseInformationRequests
      const infoQuery = query(collection(db, 'caseInformationRequests'), where('caseId', '==', caseObj.id));
      const infoSnap = await getDocs(infoQuery);
      const infoList: any[] = [];
      infoSnap.forEach((d) => {
        infoList.push({ id: d.id, ...d.data() });
      });
      setInformationRequests(infoList);

      // 3. Fetch caseFinancials
      const finQuery = query(collection(db, 'caseFinancials'), where('caseId', '==', caseObj.id));
      const finSnap = await getDocs(finQuery);
      const finList: any[] = [];
      finSnap.forEach((d) => {
        finList.push({ id: d.id, ...d.data() });
      });
      setFinancials(finList);

    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar vinculações do caso: ' + (err.message || err));
    } finally {
      setLoadingCaseDetails(false);
    }
  };

  const showToastSuccess = (text: string) => {
    setSuccess(text);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Action: Save Entrevista Narrative
  const handleSaveNarrative = async () => {
    if (!selectedCase) return;
    setSavingNarrative(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'cases', selectedCase.id), {
        entrevistaPadrao: editingNarrative.trim(),
        description: editingNarrative.trim(),
        updatedAt: new Date().toISOString()
      });
      setSelectedCase((prev: any) => ({ 
          ...prev, 
          entrevistaPadrao: editingNarrative.trim(),
          description: editingNarrative.trim()
      }));
      // Update in local cases list as well
      setClientCases((prev) => 
        prev.map((c) => c.id === selectedCase.id ? { ...c, entrevistaPadrao: editingNarrative.trim(), description: editingNarrative.trim() } : c)
      );
      showToastSuccess('Narrativa da Entrevista foi atualizada com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao atualizar narrativa: ' + (err.message || err));
    } finally {
      setSavingNarrative(false);
    }
  };

  // Action: Save Tipo de Serviço
  const handleSaveServiceType = async () => {
    if (!selectedCase) return;
    setSavingService(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'cases', selectedCase.id), {
        registrationTypeKey: serviceTypeKey,
        registrationType: serviceTypeName,
        updatedAt: new Date().toISOString()
      });
      setSelectedCase((prev: any) => ({
        ...prev,
        registrationTypeKey: serviceTypeKey,
        registrationType: serviceTypeName
      }));
      setClientCases((prev) => 
        prev.map((c) => c.id === selectedCase.id ? { ...c, registrationTypeKey: serviceTypeKey, registrationType: serviceTypeName } : c)
      );
      showToastSuccess('Tipo de Serviço atualizado com êxito!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao atualizar tipo de serviço: ' + (err.message || err));
    } finally {
      setSavingService(false);
    }
  };

  // Action: Create dynamic Case Evidence Request (Prova)
  const handleCreateProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !selectedClient || !newProofTitle.trim()) return;
    setAddingProof(true);
    setError(null);

    const payload = {
      caseId: selectedCase.id,
      clientId: selectedClient.id,
      clientSlug: selectedClient.slug || '',
      title: newProofTitle.trim(),
      description: newProofDesc.trim(),
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      status: 'pendente',
      visibleToClient: newProofVisible,
      allowUpload: newProofUpload,
      expectedFileTypes: ['.pdf', '.png', '.jpg', '.jpeg'],
      maxFiles: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'caseEvidenceRequests'), payload);
      setEvidenceRequests((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setNewProofTitle('');
      setNewProofDesc('');
      showToastSuccess('Nova solicitação de prova cadastrada com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao criar solicitação de prova: ' + (err.message || err));
    } finally {
      setAddingProof(false);
    }
  };

  const handleToggleProofStatus = async (proof: any) => {
    const nextStatus = proof.status === 'aprovado' ? 'pendente' : 'aprovado';
    setError(null);
    try {
      await updateDoc(doc(db, 'caseEvidenceRequests', proof.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      setEvidenceRequests((prev) =>
        prev.map((p) => (p.id === proof.id ? { ...p, status: nextStatus } : p))
      );
      showToastSuccess('Status da prova atualizado!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao alterar status da prova: ' + (err.message || err));
    }
  };

  const handleDeleteProof = async (proofId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta solicitação de prova?')) return;
    setError(null);
    try {
      await deleteDoc(doc(db, 'caseEvidenceRequests', proofId));
      setEvidenceRequests((prev) => prev.filter((p) => p.id !== proofId));
      showToastSuccess('Documento removido da coleta!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao apagar solicitação de prova: ' + (err.message || err));
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !selectedClient || !newQuestionText.trim()) return;
    setAddingQuestion(true);
    setError(null);

    const payload = {
      caseId: selectedCase.id,
      clientId: selectedClient.id,
      question: newQuestionText.trim(),
      answer: '',
      status: 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'caseInformationRequests'), payload);
      setInformationRequests((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setNewQuestionText('');
      showToastSuccess('Pergunta de informação complementar adicionada!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao adicionar pergunta complementar: ' + (err.message || err));
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleUpdateQuestionAnswer = async (id: string, ans: string, status: string) => {
    setError(null);
    try {
      await updateDoc(doc(db, 'caseInformationRequests', id), {
        answer: ans.trim(),
        status: status,
        updatedAt: new Date().toISOString()
      });
      setInformationRequests((prev) =>
        prev.map((q) => (q.id === id ? { ...q, answer: ans, status: status } : q))
      );
      showToastSuccess('Informação salva no histórico!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar resposta: ' + (err.message || err));
    }
  };

  const handleCreateFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newAmount);
    if (!selectedCase || !selectedClient || isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Insira um valor numérico válido.');
      return;
    }
    setAddingFinancial(true);
    setError(null);

    const payload = {
      caseId: selectedCase.id,
      clientId: selectedClient.id,
      clientSlug: selectedClient.slug || '',
      chargeType: newChargeType,
      totalAmount: parsedAmount,
      paymentMethod: newPaymentMethod,
      installments: Number(newInstallments) || 1,
      firstDueDate: newDueDate || new Date().toISOString().split('T')[0],
      financialStatus: newFinancialStatus,
      visibleToClient: true,
      publicFinancialMessage: newPublicMessage.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'caseFinancials'), payload);
      setFinancials((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setNewAmount('');
      setNewPublicMessage('');
      showToastSuccess('Relatório financeiro do caso atualizado!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao cadastrar faturamento: ' + (err.message || err));
    } finally {
      setAddingFinancial(false);
    }
  };

  const handleDeleteFinancial = async (finId: string) => {
    if (!window.confirm('Excluir este lançamento financeiro permanentemente?')) return;
    setError(null);
    try {
      await deleteDoc(doc(db, 'caseFinancials', finId));
      setFinancials((prev) => prev.filter((f) => f.id !== finId));
      showToastSuccess('Faturamento excluído!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao excluir financeiro: ' + (err.message || err));
    }
  };

  const getClientName = (c: any) => {
    if (!c) return '';
    return c.type === 'PF'
      ? (c.pfDadosPessoais?.pf_nomeCompleto || c.pfData?.pf_nomeCompleto || 'Sem Nome')
      : (c.pjDadosEmpresa?.pj_razaoSocial || c.pjData?.pj_razaoSocial || 'Sem Razão Social');
  };

  const getClientDoc = (c: any) => {
    if (!c) return '';
    return c.type === 'PF'
      ? (c.pfDadosPessoais?.pf_cpf || c.pfData?.pf_cpf || 'CPF não informado')
      : (c.pjDadosEmpresa?.pj_cnpj || c.pjData?.pj_cnpj || 'CNPJ não informado');
  };

  return (
    <BossLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-0 space-y-8 animate-fade-in pb-12">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-150 pb-6 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao/portal-cliente')}
                className="p-1 px-2.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider border border-gray-150 shadow-xs cursor-pointer"
              >
                <ArrowLeft size={14} /> Voltar à Busca
              </button>
              <h1 className="text-3xl font-black text-gray-950 tracking-tight">Editar o Portal do Cliente</h1>
            </div>
            <p className="text-xs text-gray-400 font-semibold mt-1">Configuração individual das seções e fichas integradas fáticas para o portal do cliente.</p>
          </div>
          <button
            onClick={fetchClientData}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-955 rounded-2xl text-xs font-extrabold transition uppercase tracking-wider font-mono self-start cursor-pointer"
          >
            <RefreshCw size={14} className={loadingClient ? 'animate-spin' : ''} />
            Recarregar Cliente
          </button>
        </div>

        {/* FEEDBACK LABELS */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100/80 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100/80 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            {success}
          </div>
        )}

        {loadingClient ? (
          <div className="bg-white border border-gray-150 rounded-3xl p-12 text-center text-gray-400 min-h-[400px] flex flex-col items-center justify-center space-y-4">
            <RefreshCw size={36} className="animate-spin text-purple-600" />
            <p className="text-xs font-extrabold uppercase font-mono tracking-wider">Carregando painel do cliente...</p>
          </div>
        ) : selectedClient ? (
          <div className="space-y-8 animate-fade-in">
            {/* 1. SECTOR: CADASTRO COMPLETO DO CLIENTE */}
            {(() => {
              const isPf = selectedClient.type === 'PF';
              const pf = selectedClient.pfData || selectedClient.pfDadosPessoais || {};
              const pj = selectedClient.pjData || selectedClient.pjDadosEmpresa || {};
              const socio = selectedClient.socioData || selectedClient.socioDadosPessoais || {};
              const acesso = selectedClient.acessoSistema || {};
              const bancario = selectedClient.bancarioData || selectedClient.bancarioDadosBancarios || {};

              return (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden text-left space-y-6">
                  {/* TOP BRANDING & META */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-2xl flex items-center justify-center shadow-3xs shrink-0">
                        {isPf ? <User size={22} className="stroke-[2px]" /> : <Building2 size={22} className="stroke-[2px]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest block">FICHA DE IDENTIFICAÇÃO CADASTRAL</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg font-mono border ${
                            isPf 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {selectedClient.type}
                          </span>
                        </div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">{getClientName(selectedClient)}</h2>
                      </div>
                    </div>

                    {/* BOTÃO DE ATALHO DE EDIÇÃO DA FICHA */}
                    <button
                      type="button"
                      onClick={() => {
                        const targetCaseId = selectedCase?.id || clientCases[0]?.id || 'f60jptoSi8Z9xat45yIb';
                        navigate(`/boss-giffoni-clientes/fluxo-producao/${targetCaseId}/editar-cadastro-cliente`);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs shrink-0 cursor-pointer text-center"
                    >
                      <ExternalLink size={13} />
                      <span>Editar Ficha Completa</span>
                    </button>
                  </div>

                  {/* TABS INTERNAS DA FICHA DE CADASTRO */}
                  <div className="flex flex-wrap gap-1.5 bg-gray-50/70 p-1.5 rounded-2xl border border-gray-150">
                    <button
                      type="button"
                      onClick={() => setFichaActiveTab('contratante')}
                      className={`flex-1 min-w-[124px] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-150 ${
                        fichaActiveTab === 'contratante'
                          ? 'bg-white text-gray-950 shadow-2xs font-black'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/55'
                      }`}
                    >
                      1. {isPf ? 'Dados Pessoais' : 'Dados Societários'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFichaActiveTab('endereco')}
                      className={`flex-1 min-w-[124px] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-150 ${
                        fichaActiveTab === 'endereco'
                          ? 'bg-white text-gray-950 shadow-2xs font-black'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/55'
                      }`}
                    >
                      2. Endereço Registrado
                    </button>
                    {!isPf && (
                      <button
                        type="button"
                        onClick={() => setFichaActiveTab('socios')}
                        className={`flex-1 min-w-[124px] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-150 ${
                          fichaActiveTab === 'socios'
                            ? 'bg-white text-gray-950 shadow-2xs font-black'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/55'
                        }`}
                      >
                        3. Quadro de Sócios
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFichaActiveTab('bancarios')}
                      className={`flex-1 min-w-[124px] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-150 ${
                        fichaActiveTab === 'bancarios'
                          ? 'bg-white text-gray-950 shadow-2xs font-black'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/55'
                      }`}
                    >
                      {isPf ? '3.' : '4.'} Dados Bancários
                    </button>
                    <button
                      type="button"
                      onClick={() => setFichaActiveTab('acesso')}
                      className={`flex-1 min-w-[124px] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-150 ${
                        fichaActiveTab === 'acesso'
                          ? 'bg-white text-gray-950 shadow-2xs font-black'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/55'
                      }`}
                    >
                      {isPf ? '4.' : '5.'} Credenciais & Acesso
                    </button>
                  </div>

                  {/* CONTEÚDO DA TAB ATIVA */}
                  <div className="bg-gray-50/30 border border-gray-150 rounded-2xl p-5 md:p-6 min-h-[220px]">
                    {/* 1. TAB CONTRATANTE (PF OU PJ) */}
                    {fichaActiveTab === 'contratante' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono flex items-center gap-1.5 border-b border-gray-100 pb-2">
                          <User size={14} className="text-gray-50/50 fill-gray-450 shrink-0 text-indigo-550" />
                          {isPf ? 'Informações de Registro (Pessoa Física)' : 'Informações de Registro (Pessoa Jurídica)'}
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          {isPf ? (
                            <>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Nome Completo</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{pf.pf_nomeCompleto || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">CPF</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_cpf || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">RG</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_rg || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Órgão Emissor</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{pf.pf_orgaoEmissor || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Data de Emissão</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_dataEmissao || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Data de Nascimento</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_dataNascimento || pf.pf_nascimento || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Nacionalidade</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block">{pf.pf_nacionalidade || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Estado Civil</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block">{pf.pf_estadoCivil || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Profissão</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block">{pf.pf_profissao || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">E-mail de Contato</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block truncate">{pf.pf_email || selectedClient.email || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Telefone</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_telefone || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">WhatsApp</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_whatsapp || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Instagram</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_instagram || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Facebook</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_facebook || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">TikTok</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pf.pf_tiktok || '—'}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Razão Social</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{pj.pj_razaoSocial || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Nome Fantasia</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{pj.pj_nomeFantasia || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">CNPJ</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pj.pj_cnpj || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Inscrição Estadual</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pj.pj_inscricaoEstadual || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Inscrição Municipal</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pj.pj_inscricaoMunicipal || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">E-mail da Empresa</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block truncate">{pj.pj_emailEmpresa || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Telefone Comercial</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pj.pj_telefoneEmpresa || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">WhatsApp Comercial</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pj.pj_whatsappEmpresa || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Instagram</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pj.pj_instagramEmpresa || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Facebook</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pj.pj_facebookEmpresa || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">TikTok</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{pj.pj_tiktokEmpresa || '—'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 2. TAB ENDEREÇO */}
                    {fichaActiveTab === 'endereco' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono flex items-center gap-1.5 border-b border-gray-100 pb-2">
                          <Briefcase size={14} className="text-indigo-505 shrink-0" />
                          Sede / Endereço Fiscal Registrado No Contrato
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">CEP</span>
                            <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{isPf ? pf.pf_cep || '—' : pj.pj_cepEmpresa || '—'}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Logradouro / Endereço</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{isPf ? pf.pf_endereco || '—' : pj.pj_enderecoEmpresa || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Número</span>
                            <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{isPf ? pf.pf_numero || '—' : pj.pj_numeroEmpresa || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Complemento</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{isPf ? pf.pf_complemento || '—' : pj.pj_complementoEmpresa || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Bairro</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{isPf ? pf.pf_bairro || '—' : pj.pj_bairroEmpresa || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Cidade</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{isPf ? pf.pf_cidade || '—' : pj.pj_cidadeEmpresa || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Estado (UF)</span>
                            <span className="text-xs font-mono font-bold text-gray-900 mt-1 block uppercase">{isPf ? pf.pf_estado || '—' : pj.pj_estadoEmpresa || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. QUADRO DE SÓCIOS (PJ ONLY) */}
                    {!isPf && fichaActiveTab === 'socios' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono flex items-center gap-1.5 border-b border-gray-100 pb-2">
                          <ShieldCheck size={14} className="text-teal-600 shrink-0" />
                          Quadro de Sócios / Representante Legal da Empresa
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Nome Completo</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{socio.socio_nomeCompleto || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">CPF</span>
                            <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{socio.socio_cpf || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Cargo</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{socio.socio_cargo || 'Representante'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">RG</span>
                            <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{socio.socio_rg || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Órgão Emissor</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{socio.socio_orgaoEmissor || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Data de Emissão</span>
                            <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{socio.socio_dataEmissao || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Nacionalidade</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{socio.socio_nacionalidade || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Estado Civil</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{socio.socio_estadoCivil || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Profissão</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{socio.socio_profissao || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">E-mail</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block truncate">{socio.socio_email || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Telefone</span>
                            <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{socio.socio_telefone || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">WhatsApp</span>
                            <span className="text-xs font-mono font-bold text-gray-900 mt-1 block">{socio.socio_whatsapp || '—'}</span>
                          </div>

                          <div className="sm:col-span-3 border-t border-gray-150/50 pt-4 mt-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block font-mono mb-2">Endereço de Residência do Sócio</span>
                            <p className="text-xs text-gray-800 font-bold uppercase leading-normal">
                              {socio.socio_endereco ? (
                                `${socio.socio_endereco}, n. ${socio.socio_numero || 'S/N'} ${socio.socio_complemento ? `- ${socio.socio_complemento}` : ''} - ${socio.socio_bairro || ''}, CEP ${socio.socio_cep || ''} — ${socio.socio_cidade || ''}/${socio.socio_estado || ''}`
                              ) : (
                                'Nenhum endereço registrado para o sócio.'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. TAB DADOS BANCÁRIOS */}
                    {fichaActiveTab === 'bancarios' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono flex items-center gap-1.5 border-b border-gray-100 pb-2">
                          <CreditCard size={14} className="text-emerald-600 shrink-0" />
                          Informações Financeiras & Dados Bancários de Repasse
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Possui Dados Bancários Registrados?</span>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1 px-2.5 py-0.5 rounded-lg ${
                              bancario.bancario_possuiDadosBancarios 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                              {bancario.bancario_possuiDadosBancarios ? 'Sim, Ativo' : 'Não'}
                            </span>
                          </div>

                          {bancario.bancario_possuiDadosBancarios && (
                            <>
                              <div className="border-l border-gray-150 pl-4 sm:border-l-0 sm:pl-0">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Tipo de Chave Pix</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block">{bancario.bancario_tipoChavePix || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Chave Pix</span>
                                <span className="text-xs font-mono font-bold text-gray-900 mt-1 block select-all">{bancario.bancario_chavePix || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Banco do Pix</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{bancario.bancario_bancoPix || '—'}</span>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Titular do Pix</span>
                                <span className="text-xs font-bold text-gray-900 mt-1 block uppercase">{bancario.bancario_titularPix || '—'}</span>
                              </div>

                              <div className="sm:col-span-3 border-t border-gray-150/50 pt-4 mt-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block font-mono mb-2">Dados da Conta Bancária Convencional</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <span className="text-[9.5px] font-extrabold text-gray-400 uppercase tracking-wider block font-mono">Nome do Banco</span>
                                    <span className="text-xs font-bold text-gray-900 block uppercase mt-0.5">{bancario.bancario_banco || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9.5px] font-extrabold text-gray-400 uppercase tracking-wider block font-mono">Agência</span>
                                    <span className="text-xs font-mono font-bold text-gray-900 block mt-0.5">{bancario.bancario_agencia || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9.5px] font-extrabold text-gray-400 uppercase tracking-wider block font-mono">Número da Conta</span>
                                    <span className="text-xs font-mono font-bold text-gray-900 block mt-0.5">{bancario.bancario_conta || bancario.bancario_numeroConta || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9.5px] font-extrabold text-gray-400 uppercase tracking-wider block font-mono">Tipo de Conta</span>
                                    <span className="text-xs font-bold text-gray-900 block uppercase mt-0.5">{bancario.bancario_tipoConta || bancario.bancario_operacao || '—'}</span>
                                  </div>
                                  <div className="sm:col-span-2 md:col-span-4">
                                    <span className="text-[9.5px] font-extrabold text-gray-400 uppercase tracking-wider block font-mono">Titular da Conta</span>
                                    <span className="text-xs font-bold text-gray-900 block uppercase mt-0.5">{bancario.bancario_titularConta || '—'}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 5. TAB CREDENCIAIS & ACESSO */}
                    {fichaActiveTab === 'acesso' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono flex items-center gap-1.5 border-b border-gray-100 pb-2">
                          <Lock size={14} className="text-indigo-605 shrink-0" />
                          Painel de Controle de Acesso ao Portal do Cliente
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">E-mail de Login</span>
                            <span className="text-xs font-bold text-gray-900 mt-1 block truncate select-all">{acesso.acesso_emailLogin || selectedClient.email || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Status do Acesso</span>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1 px-2.5 py-0.5 rounded-lg ${
                              (acesso.acesso_statusAcesso === 'ativo' || selectedClient.portalStatus === 'criado' || selectedClient.portalAtivo)
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {acesso.acesso_statusAcesso || selectedClient.status || selectedClient.portalStatus || 'Pendente'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">Senha de Acesso</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono font-black text-gray-900 tracking-wider">
                                {showFichaPassword ? (acesso.acesso_senha || selectedClient.senhaVisivelPreview || '—') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowFichaPassword(!showFichaPassword)}
                                className="p-1 hover:bg-gray-200/65 rounded-md text-gray-500 transition cursor-pointer"
                              >
                                {showFichaPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 2. SECTOR: TODOS OS CASOS DO CLIENTE */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs text-left">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-purple-50 border border-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-xs">
                  <Briefcase size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest block">CASOS VINCULADOS</span>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Estudos de Caso e Processos</h3>
                </div>
              </div>

              {clientCases.length === 0 ? (
                <div className="mt-6 border border-dashed rounded-2xl p-8 text-center text-xs text-gray-400 leading-normal">
                  Este cliente não possui nenhum caso registrado no fluxo de produção.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {clientCases.map((c) => {
                    const isSelectedCase = selectedCase?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCase(c)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[140px] relative ${
                          isSelectedCase 
                            ? 'bg-purple-50/70 border-purple-500 shadow-xs' 
                            : 'bg-white border-gray-150 hover:bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[8.5px] font-mono font-black text-gray-400 uppercase tracking-wider block">ID: {c.id}</span>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                              c.status === 'arquivado' ? 'bg-gray-150 text-gray-650' : 
                              c.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {c.status || 'Pendente'}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-xs text-gray-900 tracking-tight leading-snug">
                            {c.registrationType || 'Tipo de serviço não definido'}
                          </h4>
                          <p className="text-[11px] text-gray-450 line-clamp-2">
                            {c.entrevistaPadrao || c.description || 'Nenhuma descrição fática cadastrada.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-150/40 pt-4 mt-3">
                          <span className="text-[10px] text-gray-400 font-mono">
                            Etapa: <strong className="text-gray-700 font-bold uppercase">{c.productionStage || 'Início'}</strong>
                          </span>
                          <span className="text-[9.5px] font-mono font-black text-purple-600 uppercase tracking-wider flex items-center gap-1">
                            {isSelectedCase ? 'Ativo na Visão ✨' : 'Selecionar Caso'} <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. CASE DETAILS COMPILATION ENGINE */}
            {selectedCase && (
              <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs space-y-6 text-left animate-fade-in">
                {/* CASE META SUBHEADER */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-[9px] font-mono font-black text-gray-400 block h-3.5">DOCK COMPILADO ATRELADO AO CASO</span>
                    <h4 className="font-black text-sm text-purple-650 font-mono tracking-tight">{selectedCase.id}</h4>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Última alteração: <strong>{selectedCase.updatedAt ? new Date(selectedCase.updatedAt).toLocaleDateString() : 'Não informada'}</strong>
                  </span>
                </div>

                {/* VINCULADOS INTERACTIVE NAV TABS */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'entrevista', label: '1. Entrevista', icon: FileText },
                    { id: 'tipo_servico', label: '2. Serviço', icon: Save },
                    { id: 'provas', label: '3. Provas', icon: FileBadge },
                    { id: 'informacoes', label: '4. Info. Complementares', icon: HelpCircle },
                    { id: 'financeiro', label: '5. Financeiro', icon: CreditCard }
                  ].map((subTab) => {
                    const tabIcon = subTab.icon;
                    const isTabActive = activeSubTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => setActiveSubTab(subTab.id as any)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition ${
                          isTabActive 
                            ? 'bg-gray-900 text-white shadow-xs' 
                            : 'bg-gray-50 border border-gray-150 text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                        }`}
                      >
                        <tabIcon size={13} className={isTabActive ? 'text-white' : 'text-gray-450'} />
                        {subTab.label}
                      </button>
                    );
                  })}
                </div>

                {/* TAB CENTRAL PANEL */}
                <div className="pt-2">
                  {loadingCaseDetails ? (
                    <div className="h-56 flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-purple-600" />
                      <span className="text-[10.5px] font-mono font-black text-gray-400 uppercase tracking-widest">Sincronizando entidade...</span>
                    </div>
                  ) : (
                    <>
                      {/* TAB A: ENTREVISTA */}
                      {activeSubTab === 'entrevista' && (
                        <div className="space-y-6">
                          <div className="p-4 bg-blue-50/75 border border-blue-100/50 rounded-2xl">
                            <h5 className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
                              <FileText size={14} className="text-blue-600" />
                              Narrativa Fática do Atendimento (Entrevista Padrão)
                            </h5>
                            <p className="text-[11px] text-blue-900 mt-1 leading-relaxed">
                              Esta narrativa é o alicerce fático mapeado na entrevista com o cliente. Ela alimenta os checklists fáticos e a estruturação de petições.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Editor da Narrativa Ativa</label>
                            <textarea
                              value={editingNarrative}
                              onChange={(e) => setEditingNarrative(e.target.value)}
                              rows={8}
                              placeholder="Nenhuma narrativa registrada ainda. Digite os fatos colhidos durante o atendimento..."
                              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-medium text-gray-800 leading-relaxed focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:outline-none transition-all placeholder-gray-400"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleSaveNarrative}
                              disabled={savingNarrative}
                              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer"
                            >
                              {savingNarrative ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                              Salvar Narrativa
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB B: TIPO DE SERVIÇO */}
                      {activeSubTab === 'tipo_servico' && (
                        <div className="space-y-6">
                          <div className="p-4 bg-purple-50/75 border border-purple-100/50 rounded-2xl">
                            <h5 className="font-extrabold text-xs text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                              <Briefcase size={14} className="text-purple-600" />
                              Tipo de Serviço & Produção do Caso
                            </h5>
                            <p className="text-[11px] text-purple-900 mt-1 leading-relaxed">
                              Defina se este caso correrá em rito fático Judicial ou Extrajudicial e determine o padrão de enquadramento técnico.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <label className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider block">ID Chave do Serviço</label>
                              <input
                                type="text"
                                value={serviceTypeKey}
                                onChange={(e) => setServiceTypeKey(e.target.value)}
                                placeholder="Ex: peticao_inicial, processo_judicial_ajuizado, etc."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-purple-100 focus:outline-none transition"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider block">Nome do Tipo do Serviço</label>
                              <input
                                type="text"
                                value={serviceTypeName}
                                onChange={(e) => setServiceTypeName(e.target.value)}
                                placeholder="Ex: Petição Inicial a Ajuizar"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-purple-100 focus:outline-none transition"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleSaveServiceType}
                              disabled={savingService}
                              className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer"
                            >
                              {savingService ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                              Atualizar Serviço
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB C: COLETA DE PROVAS */}
                      {activeSubTab === 'provas' && (
                        <div className="space-y-6">
                          <div className="p-4 bg-emerald-50/75 border border-emerald-100/50 rounded-2xl">
                            <h5 className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                              <FileBadge size={14} className="text-emerald-600" />
                              Checklist de Coleta de Provas
                            </h5>
                            <p className="text-[11px] text-emerald-900 mt-1 leading-relaxed">
                              Adicione solicitações de documentos e provas para o cliente. O cliente poderá anexar os documentos diretamente pelo portal de coletas.
                            </p>
                          </div>

                          {/* LIST OF PROOFS */}
                          <div className="space-y-3">
                            <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Histórico de Provas Solicitadas</h6>
                            {evidenceRequests.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Nenhuma prova complementar solicitada até o momento.</p>
                            ) : (
                              <div className="space-y-2.5">
                                {evidenceRequests.map((req) => (
                                  <div key={req.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap text-left">
                                        <span className={`text-[8.5px] font-black font-mono uppercase px-1.5 py-0.5 rounded-md ${
                                          req.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                          {req.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                                        </span>
                                        <h5 className="font-extrabold text-xs text-gray-950">{req.title}</h5>
                                      </div>
                                      {req.description && (
                                        <p className="text-[11px] text-gray-400 mt-1 leading-normal text-left">{req.description}</p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <button
                                        onClick={() => handleToggleProofStatus(req)}
                                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                          req.status === 'aprovado'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                            : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
                                        }`}
                                      >
                                        <CheckCircle2 size={13} />
                                        {req.status === 'aprovado' ? 'Aprovada' : 'Aprovar'}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteProof(req.id)}
                                        className="p-2.5 text-rose-600 hover:text-rose-750 hover:bg-rose-50 border border-transparent hover:border-rose-150 rounded-xl transition cursor-pointer"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ADD NEW PROOF FORM */}
                          <form onSubmit={handleCreateProof} className="border-t border-gray-100 pt-6 space-y-4">
                            <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Nova Solicitação de Documento/Prova</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Título do Documento *</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Comprovante de Residência Atualizado"
                                  value={newProofTitle}
                                  onChange={(e) => setNewProofTitle(e.target.value)}
                                  required
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Orientações Fáticas da Prova</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Deve estar em formato PDF legível e com data recente"
                                  value={newProofDesc}
                                  onChange={(e) => setNewProofDesc(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newProofVisible}
                                  onChange={(e) => setNewProofVisible(e.target.checked)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                Visível no Portal do Cliente
                              </label>
                              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newProofUpload}
                                  onChange={(e) => setNewProofUpload(e.target.checked)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                Permitir Upload do Cliente
                              </label>
                            </div>

                            <button
                              type="submit"
                              disabled={addingProof}
                              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition font-mono cursor-pointer"
                            >
                              {addingProof ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                              Adicionar Prova
                            </button>
                          </form>
                        </div>
                      )}

                      {/* TAB D: COLETA DE INFORMAÇÕES */}
                      {activeSubTab === 'informacoes' && (
                        <div className="space-y-6">
                          <div className="p-4 bg-amber-50/75 border border-amber-100/50 rounded-2xl">
                            <h5 className="font-extrabold text-xs text-amber-955 flex items-center gap-1.5 uppercase tracking-wide">
                              <HelpCircle size={14} className="text-amber-600" />
                              Informações Complementares do Caso
                            </h5>
                            <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                              Formule perguntas fáticas complementares específicas que o cliente deve responder para viabilizar o andamento técnico da causa.
                            </p>
                          </div>

                          {/* HISTÓRICO DE PERGUNTAS */}
                          <div className="space-y-4">
                            <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Histórico de Respostas e Perguntas</h6>
                            {informationRequests.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Nenhuma pergunta complementar registrada ainda.</p>
                            ) : (
                              <div className="space-y-4">
                                {informationRequests.map((q) => (
                                  <div key={q.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3.5">
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-start gap-2">
                                        <span className={`text-[8px] font-black font-mono uppercase px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${
                                          q.status === 'revisado' ? 'bg-emerald-100 text-emerald-800' :
                                          q.status === 'respondido' ? 'bg-blue-100 text-blue-800' : 'bg-gray-150 text-gray-600'
                                        }`}>
                                          {q.status || 'Pendente'}
                                        </span>
                                        <h5 className="font-extrabold text-xs text-gray-905 leading-normal">{q.question}</h5>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5">
                                      <label className="text-[9.5px] uppercase font-black text-gray-400 tracking-widest font-mono">Resposta do Cliente (Editável)</label>
                                      <textarea
                                        value={q.answer || ''}
                                        onChange={(e) => {
                                          const updatedVal = e.target.value;
                                          setInformationRequests((prev) =>
                                            prev.map((item) => (item.id === q.id ? { ...item, answer: updatedVal } : item))
                                          );
                                        }}
                                        placeholder="Aguardando narrativa técnica ou resposta fática..."
                                        rows={2}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                      />
                                    </div>

                                    <div className="flex items-center justify-end gap-2.5">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQuestionAnswer(q.id, q.answer || '', 'respondido')}
                                        className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-650 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                      >
                                        Salvar Como Respondido
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQuestionAnswer(q.id, q.answer || '', 'revisado')}
                                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                      >
                                        Confirmar e Validar
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* PERGUNTA COMPLEMENTAR FORM */}
                          <form onSubmit={handleCreateQuestion} className="border-t border-gray-100 pt-6 space-y-3">
                            <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Nova Pergunta Complementar</h6>
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold text-gray-400">Texto da Pergunta *</label>
                              <input
                                type="text"
                                placeholder="Ex: Em qual data exata ocorreu a interrupção do fornecimento do serviço?"
                                value={newQuestionText}
                                onChange={(e) => setNewQuestionText(e.target.value)}
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={addingQuestion}
                              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition font-mono cursor-pointer"
                            >
                              {addingQuestion ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                              Adicionar Pergunta
                            </button>
                          </form>
                        </div>
                      )}

                      {/* TAB E: FINANCEIRO */}
                      {activeSubTab === 'financeiro' && (
                        <div className="space-y-6">
                          <div className="p-4 bg-rose-50/75 border border-rose-100/50 rounded-2xl">
                            <h5 className="font-extrabold text-xs text-rose-955 flex items-center gap-1.5 uppercase tracking-wide">
                              <CreditCard size={14} className="text-rose-600" />
                              Relatório Financeiro do Caso
                            </h5>
                            <p className="text-[11px] text-rose-900 mt-1 leading-relaxed">
                              Acompanhe faturamentos e lançamentos para este caso. Cadastre ad êxito ou faturamentos contratuais unificados.
                            </p>
                          </div>

                          {/* HISTÓRICO DE COBRANÇAS */}
                          <div className="space-y-4">
                            <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Histórico de Cobranças Contratuais</h6>
                            {financials.length === 0 ? (
                              <p className="text-xs text-gray-400 italic font-medium">Nenhum faturamento registrado para este caso.</p>
                            ) : (
                              <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-xs">
                                <table className="w-full text-left text-xs text-gray-500 font-sans">
                                  <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-black font-mono tracking-widest border-b border-gray-150">
                                    <tr>
                                      <th className="px-4 py-3">Tipo de Cobrança</th>
                                      <th className="px-4 py-3">Valor (BRL)</th>
                                      <th className="px-4 py-3">Rito / Parc.</th>
                                      <th className="px-4 py-3">Vencimento</th>
                                      <th className="px-4 py-3">Status</th>
                                      <th className="px-4 py-3 text-right">Ação</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-105 font-medium">
                                    {financials.map((fin) => (
                                      <tr key={fin.id} className="hover:bg-gray-50 text-gray-800">
                                        <td className="px-4 py-3.5">
                                          <span className="font-black tracking-tight text-gray-900 block text-left">
                                            {fin.chargeType === 'honorarios_iniciais' ? 'Honorários Iniciais' :
                                             fin.chargeType === 'honorarios_mensais' ? 'Honorários Mensais' :
                                             fin.chargeType === 'taxa_retencao' ? 'Taxa de Retenção' :
                                             fin.chargeType === 'sucesso' ? 'Premiação de Sucesso' : 'Outra Cobrança'}
                                          </span>
                                          {fin.publicFinancialMessage && (
                                            <p className="text-[10px] text-gray-405 truncate max-w-[150px] mt-0.5 text-left">{fin.publicFinancialMessage}</p>
                                          )}
                                        </td>
                                        <td className="px-4 py-3.5 font-mono text-gray-950 font-bold block-inline text-left">
                                          {parseFloat(fin.totalAmount || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-4 py-3.5 text-left">
                                          {fin.paymentMethod} ({fin.installments || 1}x)
                                        </td>
                                        <td className="px-4 py-3.5 font-mono text-left">
                                          {fin.firstDueDate ? new Date(fin.firstDueDate).toLocaleDateString('pt-BR') : '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-left">
                                          <span className={`text-[8.5px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-md ${
                                            fin.financialStatus === 'pago' ? 'bg-emerald-100 text-emerald-800' :
                                            fin.financialStatus === 'vencido' ? 'bg-rose-100 text-rose-800' : 'bg-gray-150 text-gray-700'
                                          }`}>
                                            {fin.financialStatus || 'Pendente'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                          <button
                                            onClick={() => handleDeleteFinancial(fin.id)}
                                            className="text-rose-600 hover:text-rose-850 p-1.5 hover:bg-rose-50 rounded-lg transition"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* NOVO FATURAMENTO FORM */}
                          <form onSubmit={handleCreateFinancial} className="border-t border-gray-100 pt-6 space-y-4">
                            <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Novo Faturamento Técnico de Processo</h6>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Tipo de Faturamento</label>
                                <select
                                  value={newChargeType}
                                  onChange={(e) => setNewChargeType(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500 font-sans"
                                >
                                  <option value="honorarios_iniciais">Honorários Iniciais</option>
                                  <option value="honorarios_mensais">Honorários Mensais</option>
                                  <option value="taxa_retencao">Taxa de Retenção</option>
                                  <option value="sucesso">Premiação de Sucesso (Ad Êxito)</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Valor Total (BRL) *</label>
                                <input
                                  type="number"
                                  placeholder="Ex: 3500.00"
                                  step="0.01"
                                  value={newAmount}
                                  onChange={(e) => setNewAmount(e.target.value)}
                                  required
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-rose-500"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Método de Lançamento</label>
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500 font-sans"
                                >
                                  <option value="boleto">Boleto Bancário</option>
                                  <option value="pix">PIX Instantâneo</option>
                                  <option value="cartao">Cartão de Crédito</option>
                                  <option value="transferência">TED / DOC</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Número de Parcelas</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newInstallments}
                                  onChange={(e) => setNewInstallments(Number(e.target.value))}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-rose-500"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Primeiro Vencimento</label>
                                <input
                                  type="date"
                                  value={newDueDate}
                                  onChange={(e) => setNewDueDate(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-rose-500 font-sans"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Status Inicial</label>
                                <select
                                  value={newFinancialStatus}
                                  onChange={(e) => setNewFinancialStatus(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500 font-sans"
                                >
                                  <option value="pendente">Pendente de Liquidação</option>
                                  <option value="pago">Pago / Liquidado</option>
                                  <option value="vencido">Vencido</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold text-gray-400">Detalhamento ou Nota Pública p/ Cliente</label>
                              <input
                                type="text"
                                placeholder="Ex: Primeira parcela referente à confecção fática da petição inicial"
                                value={newPublicMessage}
                                onChange={(e) => setNewPublicMessage(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={addingFinancial}
                              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition font-mono cursor-pointer"
                            >
                              {addingFinancial ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                              Lançar Cobrança
                            </button>
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-150 rounded-[2rem] p-12 text-center text-gray-400 min-h-[400px] flex flex-col items-center justify-center space-y-4">
            <User size={36} className="text-gray-300" />
            <p className="text-xs font-black uppercase tracking-wider text-gray-900">Cliente não localizado</p>
            <p className="text-xs text-gray-400">Não foi possível recuperar os dados de {slug}. Verifique o link e tente novamente.</p>
          </div>
        )}
      </div>
    </BossLayout>
  );
}
