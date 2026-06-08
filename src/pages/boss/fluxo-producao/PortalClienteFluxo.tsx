import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Search, 
  User, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit2, 
  DollarSign, 
  HelpCircle, 
  ArrowLeft, 
  Eye, 
  Info, 
  Layers,
  ChevronRight,
  UserCheck,
  Calendar,
  Layers3,
  CreditCard,
  FileBadge,
  Save
} from 'lucide-react';

export default function PortalClienteFluxo() {
  const navigate = useNavigate();

  // Search & Navigation States
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active Selections
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientCases, setClientCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [loadingCaseDetails, setLoadingCaseDetails] = useState(false);

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

  // Fetch all clients on load
  const fetchClientsAndIndex = async () => {
    setLoadingClients(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, 'clients'));
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setClients(list);
      setFilteredClients(list);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar lista de clientes: ' + (err.message || err));
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClientsAndIndex();
  }, []);

  // Filter clients based on query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = clients.filter((c) => {
      const name = c.type === 'PF' 
        ? (c.pfDadosPessoais?.pf_nomeCompleto || c.pfData?.pf_nomeCompleto || '').toLowerCase()
        : (c.pjDadosEmpresa?.pj_razaoSocial || c.pjData?.pj_razaoSocial || '').toLowerCase();
      const document = c.type === 'PF'
        ? (c.pfDadosPessoais?.pf_cpf || c.pfData?.pf_cpf || '').toLowerCase()
        : (c.pjDadosEmpresa?.pj_cnpj || c.pjData?.pj_cnpj || '').toLowerCase();
      return name.includes(q) || document.includes(q) || (c.slug || '').toLowerCase().includes(q);
    });
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  // Load selected client's cases & clear details
  const handleSelectClient = async (client: any) => {
    setSelectedClient(client);
    setSelectedCase(null);
    setClientCases([]);
    setEvidenceRequests([]);
    setInformationRequests([]);
    setFinancials([]);
    setEditingNarrative('');
    setServiceTypeKey('');
    setServiceTypeName('');
    setLoadingCaseDetails(true);

    try {
      const q = query(collection(db, 'cases'), where('clientId', '==', client.id));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setClientCases(list);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar casos do cliente: ' + (err.message || err));
    } finally {
      setLoadingCaseDetails(false);
    }
  };

  // Load selected case's atrelados
  const handleSelectCase = async (caseObj: any) => {
    setSelectedCase(caseObj);
    setLoadingCaseDetails(true);
    setActiveSubTab('entrevista');
    
    // Set local editor states
    setEditingNarrative(caseObj.entrevistaPadrao || caseObj.description || '');
    setServiceTypeKey(caseObj.registrationTypeKey || '');
    setServiceTypeName(caseObj.registrationType || '');

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

  // Saved updates helpers
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
        description: editingNarrative.trim(), // mirrored field compatibility
        updatedAt: new Date().toISOString()
      });
      // Update local case ref
      setSelectedCase((prev: any) => ({ 
        ...prev, 
        entrevistaPadrao: editingNarrative.trim(),
        description: editingNarrative.trim()
      }));
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
    if (!selectedCase || !newProofTitle.trim()) return;
    setAddingProof(true);
    setError(null);

    const payload = {
      caseId: selectedCase.id,
      clientId: selectedClient.id,
      clientSlug: selectedClient.slug || '',
      title: newProofTitle.trim(),
      description: newProofDesc.trim(),
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], // default 7 days
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
      
      // Clear inputs
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

  // Action: Toggle Proof request selection status
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

  // Action: Delete custom Proof Request
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

  // Action: Create complementary question
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newQuestionText.trim()) return;
    setAddingQuestion(true);
    setError(null);

    const payload = {
      caseId: selectedCase.id,
      clientId: selectedClient.id,
      question: newQuestionText.trim(),
      answer: '',
      status: 'pendente', // pendente, respondido, revisado
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

  // Action: Save info complement answer and status
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

  // Action: Create Case Financial record
  const handleCreateFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newAmount);
    if (!selectedCase || isNaN(parsedAmount) || parsedAmount < 0) {
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
      
      // Reset inputs
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

  // Action: Remove Finance
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

  // Helper values formatting
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
                onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
                className="p-1 px-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
              <h1 className="text-3xl font-black text-gray-950 tracking-tight">Portal do Cliente</h1>
            </div>
            <p className="text-xs text-gray-500">Módulo Administrativo unificado para acompanhamento de cadastro, casos e rotinas operacionais.</p>
          </div>
          <button
            onClick={fetchClientsAndIndex}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-950 rounded-2xl text-xs font-extrabold transition uppercase tracking-wider font-mono self-start"
          >
            <RefreshCw size={14} className={loadingClients ? 'animate-spin' : ''} />
            Atualizar Dados
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

        {/* SEARCH AND MAIN DOCKET SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT: CLIENT SELECTOR GRID */}
          <div className="lg:col-span-1 bg-white border border-gray-150 rounded-3xl p-5 shadow-xs space-y-4 h-[680px] flex flex-col">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Busca de Clientes</h3>
              <p className="text-[10.5px] text-gray-400">Selecione para ver a ficha integrada.</p>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Nome, CPF/CNPJ ou Slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-sans placeholder-gray-400 pl-9"
              />
              <Search size={14} className="text-gray-400 absolute left-3 top-3" />
            </div>

            {loadingClients ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-1 font-mono text-xs text-gray-450 h-full">
                <RefreshCw size={18} className="animate-spin text-gray-400" />
                <span>Carregando clientes...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-gray-400 border border-dashed rounded-2xl min-h-[300px]">
                <User size={24} className="text-gray-300 mb-2" />
                <p className="font-extrabold uppercase text-[10px] tracking-wider text-gray-450">Nenhum cliente</p>
                <p className="text-[10px] mt-1 text-gray-400 leading-snug">Nenhum cadastro de cliente confere com a busca.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                {filteredClients.map((c) => {
                  const isSelected = selectedClient?.id === c.id;
                  const name = getClientName(c);
                  const isPF = c.type === 'PF';
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between min-h-[72px] cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                          : 'bg-white border-gray-150 hover:bg-gray-50 text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="min-w-0 pr-1 select-none">
                        <span className={`text-[8.5px] font-black uppercase font-mono tracking-wider block ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                          {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'} ({c.slug || 's/slug'})
                        </span>
                        <h4 className="font-extrabold text-xs tracking-tight truncate mt-0.5 max-w-[145px]">
                          {name}
                        </h4>
                        <p className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-blue-200' : 'text-gray-450'}`}>
                          {getClientDoc(c)}
                        </p>
                      </div>
                      <ChevronRight size={14} className={isSelected ? 'text-blue-100' : 'text-gray-300'} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: PORTAL CORE CONTENT */}
          <div className="lg:col-span-3 space-y-8">
            {selectedClient ? (
              <>
                {/* 1. SECTOR: CADASTRO COMPLETO DO CLIENTE */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs relative overflow-hidden">
                  <div className="absolute right-6 top-6">
                    <span className="text-[10px] bg-gray-50 border border-gray-150 p-2.5 rounded-xl font-mono text-gray-500 font-extrabold">
                      TIPO: <span className="text-gray-950 font-black">{selectedClient.type}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-xs">
                      <User size={18} />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest block">FICHA DO CADASTRO</span>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">{getClientName(selectedClient)}</h2>
                    </div>
                  </div>

                  {/* FIELD GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
                    <div>
                      <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">Documento Identificador</span>
                      <span className="text-xs font-mono font-bold text-gray-800 mt-1 block">{getClientDoc(selectedClient)}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">E-mail para Notificações</span>
                      <span className="text-xs font-bold text-gray-800 mt-1 block truncate">
                        {selectedClient.type === 'PF' 
                          ? selectedClient.pfDadosPessoais?.pf_email || selectedClient.pfData?.pf_email || '—'
                          : selectedClient.pjDadosEmpresa?.pj_email || selectedClient.pjData?.pj_email || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">Telefone de Contato</span>
                      <span className="text-xs font-mono font-bold text-gray-800 mt-1 block">
                        {selectedClient.type === 'PF' 
                          ? selectedClient.pfDadosPessoais?.pf_phone || selectedClient.pfDadosPessoais?.pf_telefone || selectedClient.phone || '—'
                          : selectedClient.pjDadosEmpresa?.pj_telefone || selectedClient.phone || '—'}
                      </span>
                    </div>

                    {selectedClient.type === 'PF' ? (
                      <>
                        <div>
                          <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">Profissão</span>
                          <span className="text-xs font-bold text-gray-800 mt-1 block">{selectedClient.pfDadosPessoais?.pf_profissao || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">Estado Civil</span>
                          <span className="text-xs font-bold text-gray-800 mt-1 block">{selectedClient.pfDadosPessoais?.pf_estadoCivil || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">Nacionalidade</span>
                          <span className="text-xs font-bold text-gray-800 mt-1 block">{selectedClient.pfDadosPessoais?.pf_nacionalidade || '—'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">Nome Fantasia</span>
                          <span className="text-xs font-bold text-gray-800 mt-1 block">{selectedClient.pjDadosEmpresa?.pj_nomeFantasia || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">Representante Legal</span>
                          <span className="text-xs font-bold text-gray-800 mt-1 block">{selectedClient.pjDadosEmpresa?.pj_representanteNome || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">CPF do Representante</span>
                          <span className="text-xs font-mono font-bold text-gray-800 mt-1 block">{selectedClient.pjDadosEmpresa?.pj_representanteCpf || '—'}</span>
                        </div>
                      </>
                    )}

                    <div className="md:col-span-3">
                      <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono block">Endereço Registrado</span>
                      <p className="text-xs text-gray-800 font-bold mt-1 leading-normal">
                        {selectedClient.type === 'PF' ? (
                          `${selectedClient.pfDadosPessoais?.pf_enderecoLogradouro || ''}, n. ${selectedClient.pfDadosPessoais?.pf_enderecoNumero || ''} - ${selectedClient.pfDadosPessoais?.pf_enderecoBairro || ''}, CEP ${selectedClient.pfDadosPessoais?.pf_enderecoCep || ''} ${selectedClient.pfDadosPessoais?.pf_enderecoCidade || ''}/${selectedClient.pfDadosPessoais?.pf_enderecoEstado || ''}`
                        ) : (
                          `${selectedClient.pjDadosEmpresa?.pj_enderecoLogradouro || ''}, n. ${selectedClient.pjDadosEmpresa?.pj_enderecoNumero || ''} - ${selectedClient.pjDadosEmpresa?.pj_enderecoBairro || ''}, CEP ${selectedClient.pjDadosEmpresa?.pj_enderecoCep || ''} ${selectedClient.pjDadosEmpresa?.pj_enderecoCidade || ''}/${selectedClient.pjDadosEmpresa?.pj_enderecoEstado || ''}`
                        )}
                        {(!selectedClient.pfDadosPessoais?.pf_enderecoLogradouro && !selectedClient.pjDadosEmpresa?.pj_enderecoLogradouro) && 'Sem endereço cadastrado.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. SECTOR: TODOS OS CASOS DO CLIENTRE */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs">
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
                      Este cliente não possui nenhum caso registrado no fluxo de produção giga app.
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
                              <p className="text-[11px] text-gray-400 line-clamp-2">
                                {c.entrevistaPadrao || c.description || 'Nenhuma descrição fática cadastrada.'}
                              </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-150/40 pt-4 mt-3">
                              <span className="text-[10px] text-gray-400 font-mono">
                                Etapa: <strong className="text-gray-700 font-bold uppercase">{c.productionStage || 'Início'}</strong>
                              </span>
                              <span className="text-[9.5px] font-mono font-black text-purple-600 uppercase tracking-wider flex items-center gap-1">
                                {isSelectedCase ? 'Ativo na Visão' : 'Selecionar Caso'} <ChevronRight size={10} />
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
                  <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs space-y-6 animate-fade-in">
                    
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
                        { id: 'entrevista', label: '1. Entrevista', icon: FileText, color: 'blue' },
                        { id: 'tipo_servico', label: '2. Serviço', icon: Layers, color: 'purple' },
                        { id: 'provas', label: '3. Provas', icon: FileBadge, color: 'emerald' },
                        { id: 'informacoes', label: '4. Info. Complementares', icon: HelpCircle, color: 'amber' },
                        { id: 'financeiro', label: '5. Financeiro', icon: CreditCard, color: 'rose' }
                      ].map((subTab) => {
                        const tabIcon = subTab.icon;
                        const isTabActive = activeSubTab === subTab.id;
                        return (
                          <button
                            key={subTab.id}
                            onClick={() => setActiveSubTab(subTab.id as any)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition ${
                              isTabActive 
                                ? 'bg-gray-900 text-white' 
                                : 'bg-gray-50 border border-gray-150 text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                            }`}
                          >
                            <tabIcon size={13} className={isTabActive ? 'text-white' : 'text-gray-400'} />
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
                              <div className="p-4 bg-blue-50/70 border border-blue-100/50 rounded-2xl">
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
                              <div className="p-4 bg-purple-50/70 border border-purple-100/50 rounded-2xl">
                                <h5 className="font-extrabold text-xs text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                                  <Layers size={14} className="text-purple-600" />
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
                              <div className="p-4 bg-emerald-50/70 border border-emerald-100/50 rounded-2xl">
                                <h5 className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                                  <FileBadge size={14} className="text-emerald-600" />
                                  Checklist de Coleta de Provas
                                </h5>
                                <p className="text-[11px] text-emerald-900 mt-1 leading-relaxed">
                                  Adicione solicitações de documentos e provas para o cliente. O cliente poderá anexar os documentos diretamente pelo portal de coletas.
                                </p>
                              </div>

                              {/* LIST OF PROURACAO/DECLARACAO & EVIDENCE REQUESTS */}
                              <div className="space-y-3">
                                <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Histórico de Provas Solicitadas</h6>
                                {evidenceRequests.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">Nenhuma prova complementar solicitada até o momento.</p>
                                ) : (
                                  <div className="space-y-2.5">
                                    {evidenceRequests.map((req) => (
                                      <div key={req.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[8.5px] font-black font-mono uppercase px-1.5 py-0.5 rounded-md ${
                                              req.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                              {req.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                                            </span>
                                            <h5 className="font-extrabold text-xs text-gray-950">{req.title}</h5>
                                          </div>
                                          {req.description && (
                                            <p className="text-[11px] text-gray-500 mt-1 leading-normal">{req.description}</p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                          <button
                                            onClick={() => handleToggleProofStatus(req)}
                                            className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                              req.status === 'aprovado'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100'
                                                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
                                            }`}
                                          >
                                            <CheckCircle2 size={13} />
                                            {req.status === 'aprovado' ? 'Aprovada' : 'Aprovar'}
                                          </button>
                                          <button
                                            onClick={() => handleDeleteProof(req.id)}
                                            className="p-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-150 rounded-xl transition cursor-pointer"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* ADD NEW EVIDENCE REQUEST FORM */}
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
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Orientações Fáticas da Prova</label>
                                    <input
                                      type="text"
                                      placeholder="Ex: Deve estar em formato PDF legível e com data recente"
                                      value={newProofDesc}
                                      onChange={(e) => setNewProofDesc(e.target.value)}
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                              <div className="p-4 bg-amber-50/70 border border-amber-100/50 rounded-2xl">
                                <h5 className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                                  <HelpCircle size={14} className="text-amber-600" />
                                  Informações Complementares do Caso
                                </h5>
                                <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                                  Aqui você pode formular perguntas fáticas complementares específicas que o cliente deve responder para viabilizar andamento técnico da causa.
                                </p>
                              </div>

                              {/* LIST OF QUESTION AND RESPONSES */}
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
                                            <h5 className="font-extrabold text-xs text-gray-900 leading-normal">{q.question}</h5>
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

                              {/* FORMS TO ADD COMPLEMENT QUESTION */}
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
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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

                          {/* TAB E: RELATÓRIO FINANCEIRO (Subetapa 6.3) */}
                          {activeSubTab === 'financeiro' && (
                            <div className="space-y-6 animate-fade-in">
                              <div className="p-4 bg-rose-50/70 border border-rose-100/50 rounded-2xl">
                                <h5 className="font-extrabold text-xs text-rose-950 flex items-center gap-1.5 uppercase tracking-wide">
                                  <CreditCard size={14} className="text-rose-600" />
                                  Relatório Financeiro do Caso
                                </h5>
                                <p className="text-[11px] text-rose-900 mt-1 leading-relaxed">
                                  Gestor contratual de faturamento do caso corporativo. Cadastre e acompanhe taxas de entrada, honorários iniciais, ad êxito ou cobranças judiciais unificadas.
                                </p>
                              </div>

                              {/* LIST TABLE OF BILLS */}
                              <div className="space-y-4">
                                <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Histórico de Cobranças Contratuais</h6>
                                {financials.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">Nenhum faturamento registrado para este caso.</p>
                                ) : (
                                  <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-xs">
                                    <table className="w-full text-left text-xs text-gray-500 font-sans">
                                      <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-black uppercase font-mono tracking-widest border-b border-gray-150">
                                        <tr>
                                          <th className="px-4 py-3">Tipo de Cobrança</th>
                                          <th className="px-4 py-3">Valor (BRL)</th>
                                          <th className="px-4 py-3">Rito / Parc.</th>
                                          <th className="px-4 py-3">Vencimento</th>
                                          <th className="px-4 py-3">Status</th>
                                          <th className="px-4 py-3 text-right">Ação</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 font-medium">
                                        {financials.map((fin) => (
                                          <tr key={fin.id} className="hover:bg-gray-50 text-gray-800">
                                            <td className="px-4 py-3.5">
                                              <span className="font-black tracking-tight text-gray-900">
                                                {fin.chargeType === 'honorarios_iniciais' ? 'Honorários Iniciais' :
                                                 fin.chargeType === 'honorarios_mensais' ? 'Honorários Mensais' :
                                                 fin.chargeType === 'taxa_retencao' ? 'Taxa de Retenção' :
                                                 fin.chargeType === 'sucesso' ? 'Premiação de Sucesso' : 'Outra Cobrança'}
                                              </span>
                                              {fin.publicFinancialMessage && (
                                                <p className="text-[10px] text-gray-400 truncate max-w-[150px] mt-0.5">{fin.publicFinancialMessage}</p>
                                              )}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-gray-950 font-bold">
                                              {parseFloat(fin.totalAmount || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-4 py-3.5">
                                              {fin.paymentMethod} ({fin.installments || 1}x)
                                            </td>
                                            <td className="px-4 py-3.5 font-mono">
                                              {fin.firstDueDate ? new Date(fin.firstDueDate).toLocaleDateString('pt-BR') : '—'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                              <span className={`text-[8.5px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-md ${
                                                fin.financialStatus === 'pago' ? 'bg-emerald-100 text-emerald-800' :
                                                fin.financialStatus === 'vencido' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'
                                              }`}>
                                                {fin.financialStatus || 'Pendente'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                              <button
                                                onClick={() => handleDeleteFinancial(fin.id)}
                                                className="text-rose-600 hover:text-rose-800 p-1.5 hover:bg-rose-50 rounded-lg transition"
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

                              {/* FORMS TO ADD FINANCIAL */}
                              <form onSubmit={handleCreateFinancial} className="border-t border-gray-100 pt-6 space-y-4">
                                <h6 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">Novo Faturamento Técnico de Processo</h6>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Tipo de Faturamento</label>
                                    <select
                                      value={newChargeType}
                                      onChange={(e) => setNewChargeType(e.target.value)}
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500"
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
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500"
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
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-rose-500"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Status Inicial</label>
                                    <select
                                      value={newFinancialStatus}
                                      onChange={(e) => setNewFinancialStatus(e.target.value)}
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500"
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
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
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
              </>
            ) : (
              <div className="bg-white border border-gray-150 rounded-[2.5rem] p-12 text-center text-gray-400 min-h-[480px] flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 border border-gray-200/50 shadow-xs">
                  <User size={30} />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-black text-gray-950 uppercase text-xs tracking-widest leading-none">Nenhum Cliente Ativo Selecionado</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Selecione um cliente na busca à esquerda para gerenciar seu cadastro, analisar casos em andamento e atualizar faturamentos, provas e entrevistas correspondentes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BossLayout>
  );
}
