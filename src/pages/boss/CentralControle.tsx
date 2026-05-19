import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BossLayout } from '../../components/Layout';
import { 
  Sliders, 
  Search, 
  User, 
  Users, 
  Briefcase, 
  DollarSign, 
  Compass, 
  Activity, 
  ShieldAlert, 
  Trash2, 
  Edit, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Unlock, 
  Lock, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  FolderMinus,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CentralControle() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clientes' | 'usuarios' | 'slugs' | 'casos' | 'financeiro' | 'producao' | 'integridade'>('clientes');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Loaded database elements
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [portals, setPortals] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);

  // Modals / Editors state
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingCase, setEditingCase] = useState<any | null>(null);
  const [editingFinancial, setEditingFinancial] = useState<any | null>(null);
  const [isAddingFinancial, setIsAddingFinancial] = useState(false);

  // Safety deletion dialog state
  const [deletingClient, setDeletingClient] = useState<any | null>(null);
  const [deletionStats, setDeletionStats] = useState<any | null>(null);

  // Integrity Checks counts
  const [integrityState, setIntegrityState] = useState<{
    okCount: number;
    attenCount: number;
    pendCount: number;
    errorCount: number;
    items: any[];
    recommendation: string;
  }>({ okCount: 0, attenCount: 0, pendCount: 0, errorCount: 0, items: [], recommendation: 'Não calculado' });

  // Load everything
  const loadAllCollections = async () => {
    setLoading(true);
    try {
      // Clients
      const clientsSnap = await getDocs(collection(db, 'clients'));
      const clientsList = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientsList);

      // Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersList);

      // Portals
      const portalsSnap = await getDocs(collection(db, 'clientPortals'));
      const portalsList = portalsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPortals(portalsList);

      // Cases
      const casesSnap = await getDocs(collection(db, 'cases'));
      const casesList = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCases(casesList);

      // Financials
      const financialsSnap = await getDocs(collection(db, 'caseFinancials'));
      const financialsList = financialsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFinancials(financialsList);

    } catch (err) {
      console.error('Error fetching backend collections in controller room:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCollections();
  }, []);

  // Compute stats for client deletion
  const prepareClientDeletion = async (client: any) => {
    setDeletingClient(client);
    setLoading(true);
    try {
      const clientId = client.id;
      const slug = client.slug || '';

      // Linked cases
      const linkedCases = cases.filter(c => c.clientId === clientId).length;
      // Financials
      const linkedFin = financials.filter(f => f.clientId === clientId).length;

      // Event counts
      const evSnap = await getDocs(query(collection(db, 'caseEvents'), where('clientId', '==', clientId)));
      const taskSnap = await getDocs(query(collection(db, 'casePendingTasks'), where('clientId', '==', clientId)));

      const portalSnap = await getDoc(doc(db, 'clientPortals', slug));
      const userSnap = await getDoc(doc(db, 'users', clientId));
      const inviteSnap = await getDoc(doc(db, 'users_invites', clientId));

      setDeletionStats({
        casesCount: linkedCases,
        financialCount: linkedFin,
        eventsCount: evSnap.size,
        tasksCount: taskSnap.size,
        hasPortal: portalSnap.exists(),
        hasUser: userSnap.exists(),
        hasInvite: inviteSnap.exists()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Perform safe deletion of client
  const executeClientDeletion = async (archiveOnly: boolean = false) => {
    if (!deletingClient) return;
    try {
      const clientId = deletingClient.id;
      const slug = deletingClient.slug || '';

      if (archiveOnly) {
        await updateDoc(doc(db, 'clients', clientId), {
          active: false,
          archived: true,
          archivedAt: serverTimestamp(),
          archiveReason: 'Arquivado via Central de Controle BOSS.'
        });
        alert('Cliente arquivado com sucesso!');
      } else {
        // Exclude definitely
        await deleteDoc(doc(db, 'clients', clientId));
        if (slug) {
          await deleteDoc(doc(db, 'clientPortals', slug));
        }
        await deleteDoc(doc(db, 'users', clientId));
        await deleteDoc(doc(db, 'users_invites', clientId));
        alert('Cliente excluído definitivamente das coleções de cadastro e acesso.');
      }
      setDeletingClient(null);
      setDeletionStats(null);
      loadAllCollections();
    } catch (err) {
      console.error(err);
      alert('Falha interna ao processar remoção.');
    }
  };

  // Suspend/Reactivate portal
  const togglePortalSuspension = async (client: any, activeState: boolean) => {
    try {
      await updateDoc(doc(db, 'clients', client.id), { active: activeState });
      if (client.slug) {
        await updateDoc(doc(db, 'clientPortals', client.slug), { active: activeState });
      }
      alert(`Portal de ${client.slug} marcado como ${activeState ? 'ATIVO' : 'SUSPENSO'}.`);
      loadAllCollections();
    } catch (err) {
      console.error(err);
    }
  };

  // High safety slug migration
  const handleMigrateSlug = async (client: any, newSlugInput: string) => {
    const rawSlug = newSlugInput.trim().toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (!rawSlug) {
      alert('Caractere inválido para o slug.');
      return;
    }

    const oldSlug = client.slug;
    if (oldSlug === rawSlug) return;

    // Confirm choice
    if (!window.confirm(`Alterar o slug de "${oldSlug}" para "${rawSlug}" impactará o acesso ao Portal do Cliente. Deseja continuar?`)) {
      return;
    }

    setLoading(true);
    try {
      // Check if newSlug is already in use
      const checkSnap = await getDoc(doc(db, 'clientPortals', rawSlug));
      if (checkSnap.exists()) {
        alert('Este identificador slug já está ocupado por outro cliente. Operação abortada.');
        setLoading(false);
        return;
      }

      const clientId = client.id;

      // 1. Update client
      await updateDoc(doc(db, 'clients', clientId), { slug: rawSlug });

      // 2. Add new clientPortals
      const oldPortalSnap = await getDoc(doc(db, 'clientPortals', oldSlug));
      const oldPortalData = oldPortalSnap.exists() ? oldPortalSnap.data() : {};
      await setDoc(doc(db, 'clientPortals', rawSlug), {
        ...oldPortalData,
        clientId,
        slug: rawSlug,
        updatedAt: serverTimestamp()
      });

      // 3. Delete old clientPortals entry
      await deleteDoc(doc(db, 'clientPortals', oldSlug));

      // 4. Update user
      const userRef = doc(db, 'users', clientId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { clientSlug: rawSlug });
      }

      // 5. Update linked cases
      const linkedCasesList = cases.filter(c => c.clientId === clientId);
      for (const item of linkedCasesList) {
        await updateDoc(doc(db, 'cases', item.id), { clientSlug: rawSlug });
      }

      alert(`Slug modificado de "${oldSlug}" para "${rawSlug}"! \nNovo link login gerado: /portal-cliente-giffoni/${rawSlug}/login`);
      loadAllCollections();
    } catch (err) {
      console.error(err);
      alert('Erro na migração do slug.');
    } finally {
      setLoading(false);
    }
  };

  // Create financial records inside controllers
  const handleCreateFinancial = async (payload: any) => {
    if (!payload.clientId || !payload.caseId) {
      alert('Dados obrigatórios faltando.');
      return;
    }
    try {
      await addDoc(collection(db, 'caseFinancials'), {
        clientId: payload.clientId,
        caseId: payload.caseId,
        totalAmount: Number(payload.totalAmount) || 0,
        status: payload.status || 'Em andamento',
        installments: Number(payload.installments) || 1,
        installmentsPaid: Number(payload.installmentsPaid) || 0,
        nextDueDate: payload.nextDueDate || '',
        visibleToClient: payload.visibleToClient ?? true,
        updatedAt: serverTimestamp()
      });
      alert('Registro financeiro acoplado com sucesso!');
      setIsAddingFinancial(false);
      loadAllCollections();
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger fast User Correction tool
  const handleCorrectUser = async (u: any) => {
    try {
      // Attempt to ensure client and clientPortals exist
      if (!u.clientId) {
        alert('Não é possível corrigir: Este registro de login não possui clientId associado.');
        return;
      }
      const clientSnap = await getDoc(doc(db, 'clients', u.clientId));
      if (!clientSnap.exists()) {
        alert('Não é possível sincronizar: O clientId indicado não corresponde a nenhum cliente ativo.');
        return;
      }
      const clientData = clientSnap.data();
      const clientSlug = clientData.slug || '';

      if (clientSlug) {
        // Sincronizar clientPortal
        await setDoc(doc(db, 'clientPortals', clientSlug), {
          clientId: u.clientId,
          slug: clientSlug,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        // Sincronizar user
        await updateDoc(doc(db, 'users', u.id), {
          clientSlug: clientSlug,
          name: clientData.type === 'PF' ? clientData.pfDadosPessoais?.pf_nomeCompleto : clientData.pjDadosEmpresa?.pj_razaoSocial
        });
        alert('Sincronização de segurança concluída com sucesso!');
        loadAllCollections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run audit engine calculations
  const runAuditorEngine = () => {
    const checkList: any[] = [];
    let ok = 0;
    let att = 0;
    let pend = 0;
    let err = 0;

    const addAudit = (cat: 'CLIENTE' | 'PORTAL' | 'USUÁRIO' | 'CASOS' | 'FINANCEIRO' | 'PRODUÇÃO', key: string, status: 'OK' | 'Atenção' | 'Pendente' | 'Erro Crítico', desc: string) => {
      if (status === 'OK') ok++;
      if (status === 'Atenção') att++;
      if (status === 'Pendente') pend++;
      if (status === 'Erro Crítico') err++;
      checkList.push({ cat, key, status, desc });
    };

    // 1. Clients check
    clients.forEach(c => {
      const name = c.type === 'PF' ? c.pfDadosPessoais?.pf_nomeCompleto : c.pjDadosEmpresa?.pj_razaoSocial;
      if (!name) {
        addAudit('CLIENTE', `ID: ${c.id}`, 'Erro Crítico', 'Cadastro de cliente sem nome ou razão social.');
      } else {
        addAudit('CLIENTE', `${name}`, 'OK', `Cadastro registrado correspondendo ao slug: ${c.slug}`);
      }
      const docSymbol = c.type === 'PF' ? c.pfDadosPessoais?.pf_cpf : c.pjDadosEmpresa?.pj_cnpj;
      if (!docSymbol) {
        addAudit('CLIENTE', `${name || c.id}`, 'Atenção', 'Cadastro sem CPF/CNPJ.');
      }
    });

    // 2. Portals check
    portals.forEach(p => {
      const linkedClient = clients.find(c => c.id === p.clientId);
      if (!linkedClient) {
        addAudit('PORTAL', `Slug: ${p.id}`, 'Erro Crítico', `Órfão: O portal com slug "${p.id}" aponta para clientId inexistente.`);
      } else if (linkedClient.slug !== p.id) {
        addAudit('PORTAL', `Slug: ${p.id}`, 'Erro Crítico', `Inconsistência: Slug em clients (${linkedClient.slug}) difere do portal (${p.id}).`);
      } else {
        addAudit('PORTAL', `Slug: ${p.id}`, 'OK', `Consistente: Vinculo com ${linkedClient.slug} ativo.`);
      }
    });

    // 3. User checks
    users.forEach(u => {
      if (u.role === 'client') {
        if (!u.clientId || !u.clientSlug) {
          addAudit('USUÁRIO', `${u.email}`, 'Erro Crítico', 'Falta clientId ou clientSlug no usuário.');
        } else {
          const clientExists = clients.some(c => c.id === u.clientId);
          const portalExists = portals.some(p => p.id === u.clientSlug);
          if (!clientExists || !portalExists) {
            addAudit('USUÁRIO', `${u.email}`, 'Erro Crítico', `Usuário linkado a cliente ou portal deletado.`);
          } else {
            addAudit('USUÁRIO', `${u.email}`, 'OK', `Validação OK para o perfil client.`);
          }
        }
      }
    });

    // 4. Cases inspect
    cases.forEach(ca => {
      if (!ca.clientId || !ca.clientSlug) {
        addAudit('CASOS', `${ca.title || ca.id}`, 'Erro Crítico', 'Caso órfão de vinculação clientId / clientSlug.');
      } else {
        const clientExists = clients.some(c => c.id === ca.clientId);
        if (!clientExists) {
          addAudit('CASOS', `${ca.title || ca.id}`, 'Erro Crítico', `Caso aponta para cliente ID inexistente (${ca.clientId}).`);
        } else {
          addAudit('CASOS', `${ca.title}`, 'OK', `Caso vinculado a ${ca.clientSlug}.`);
        }
      }
    });

    // 5. Finance inspect
    financials.forEach(f => {
      const caseExists = cases.some(ca => ca.id === f.caseId);
      const clientExists = clients.some(c => c.id === f.clientId);
      if (!caseExists || !clientExists) {
        addAudit('FINANCEIRO', `ID Financeiro: ${f.id}`, 'Erro Crítico', 'Registro financeiro órfão (caseId ou clientId excluídos).');
      } else {
        addAudit('FINANCEIRO', `ID Financeiro: ${f.id}`, 'OK', 'Vínculo financeiro legítimo.');
      }
    });

    // 6. Recommendation
    let rec = 'NÃO RECOMENDADO PARA DEPLOY';
    if (err === 0) {
      rec = att === 0 ? 'PRONTO PARA DEPLOY' : 'PRONTO COM RESSALVAS';
    }

    setIntegrityState({
      okCount: ok,
      attenCount: att,
      pendCount: pend,
      errorCount: err,
      items: checkList,
      recommendation: rec
    });
  };

  useEffect(() => {
    if (activeTab === 'integridade') {
      runAuditorEngine();
    }
  }, [activeTab, clients, users, portals, cases, financials]);

  // Global search filtering
  const filteredClients = clients.filter(c => {
    const search = searchTerm.toLowerCase();
    const name = (c.type === 'PF' ? c.pfDadosPessoais?.pf_nomeCompleto : c.pjDadosEmpresa?.pj_razaoSocial) || '';
    const email = (c.acessoSistema?.acesso_emailLogin) || '';
    const doc = (c.type === 'PF' ? c.pfDadosPessoais?.pf_cpf : c.pjDadosEmpresa?.pj_cnpj) || '';
    return name.toLowerCase().includes(search) || email.toLowerCase().includes(search) || doc.includes(search) || c.slug?.includes(search);
  });

  const filteredCases = cases.filter(ca => {
    const search = searchTerm.toLowerCase();
    return (ca.title || '').toLowerCase().includes(search) || 
           (ca.processNumber || '').includes(search) || 
           (ca.clientSlug || '').toLowerCase().includes(search);
  });

  const filteredFinancials = financials.filter(f => {
    const search = searchTerm.toLowerCase();
    return (f.clientId || '').toLowerCase().includes(search) || (f.status || '').toLowerCase().includes(search);
  });

  return (
    <BossLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Sliders size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">Central de Controle BOSS</h1>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Controles mestre e Auditorias da Estrutura</p>
          </div>
        </div>
      </div>

      {/* Global Search Tool Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar cliente, caso, slug, processo, e-mail..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-sm font-medium"
          />
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
        </div>
        <button
          onClick={loadAllCollections}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-xs font-black uppercase text-gray-600 cursor-pointer"
        >
          <RefreshCw size={14} /> Sincronizar Banco
        </button>
      </div>

      {/* Primary Navigation Hub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 mb-8">
        {[
          { id: 'clientes', label: '1. Clientes', icon: Users },
          { id: 'usuarios', label: '2. Usuários / Acessos', icon: User },
          { id: 'slugs', label: '3. Portais / Slugs', icon: Compass },
          { id: 'casos', label: '4. Casos', icon: Briefcase },
          { id: 'financeiro', label: '5. Financeiro', icon: DollarSign },
          { id: 'producao', label: '6. Produção', icon: Activity },
          { id: 'integridade', label: '7. Integridade', icon: ShieldAlert }
        ].map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* MAIN CONTAINER TABS BODY */}
      <div className="space-y-6">
        {loading && (
          <div className="p-8 text-center text-gray-400 font-bold uppercase text-xs tracking-widest bg-white rounded-3xl border border-dashed border-gray-200">
            Aguarde. Carregando bancos de dados...
          </div>
        )}

        {!loading && (
          <div>
            {/* TAB 1: CLIENTES */}
            {activeTab === 'clientes' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-150 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                      <th className="py-3 px-4">Nome Cliente</th>
                      <th className="py-3">Portal / Slug</th>
                      <th className="py-3">Documento</th>
                      <th className="py-3">E-mail</th>
                      <th className="py-3">Estado Portal</th>
                      <th className="py-3 text-right">Ações Operacionais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {filteredClients.map(c => {
                      const name = c.type === 'PF' ? c.pfDadosPessoais?.pf_nomeCompleto : c.pjDadosEmpresa?.pj_razaoSocial;
                      const docCode = c.type === 'PF' ? c.pfDadosPessoais?.pf_cpf : c.pjDadosEmpresa?.pj_cnpj;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50">
                          <td className="py-4 px-4 font-bold text-gray-900">{name || 'Indefinido'}</td>
                          <td className="py-4 font-mono font-bold text-blue-600">{c.slug || 'Sem portal'}</td>
                          <td className="py-4 font-medium text-gray-500">{docCode || 'Falta'}</td>
                          <td className="py-4 text-gray-500">{c.acessoSistema?.acesso_emailLogin || 'Sem acesso'}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {c.active ? 'Ativo' : 'Suspenso'}
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => togglePortalSuspension(c, !c.active)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-[10px] font-black rounded uppercase text-gray-600"
                            >
                              {c.active ? 'Suspender' : 'Ativar'}
                            </button>
                            <button
                              onClick={() => setEditingClient(c)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[10px] font-black rounded uppercase text-blue-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => prepareClientDeletion(c)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-[10px] font-black rounded uppercase text-red-600"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: USUÁRIOS */}
            {activeTab === 'usuarios' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-150 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                      <th className="py-3 px-4">E-mail Login</th>
                      <th className="py-3">Tipo / Cargo</th>
                      <th className="py-3">Vínculo clientId</th>
                      <th className="py-3">Vínculo Slug</th>
                      <th className="py-3">Status Autenticador</th>
                      <th className="py-3 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="py-4 px-4 font-bold text-gray-900">{u.email}</td>
                        <td className="py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">{u.role}</td>
                        <td className="py-4 font-mono text-[10px] text-gray-500">{u.clientId || 'Nulo'}</td>
                        <td className="py-4 font-mono font-bold text-blue-600">{u.clientSlug || 'Sem portal'}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${u.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {u.status || 'Pendente'}
                          </span>
                        </td>
                        <td className="py-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleCorrectUser(u)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-black rounded uppercase text-emerald-700"
                          >
                            Corrigir Vínculo
                          </button>
                          <button
                            onClick={() => setEditingUser(u)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[10px] font-black rounded uppercase text-blue-700"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: SLUGS */}
            {activeTab === 'slugs' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-x-auto">
                <p className="text-xs text-gray-500 font-medium mb-4">Gerencie as rotas de acesso final aos portais. Mudar o slug redistribui recursivamente o indicador em clientes, logins de usuários e seus processos judiciais.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clients.map(cl => (
                    <div key={cl.id} className="p-5 bg-gray-50/40 border border-gray-150 rounded-2xl flex flex-col justify-between space-y-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900 text-xs">{(cl.type === 'PF' ? cl.pfDadosPessoais?.pf_nomeCompleto : cl.pjDadosEmpresa?.pj_razaoSocial) || 'Nulo'}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                          <span>Instância:</span>
                          <span className="font-bold bg-gray-100 px-1 rounded">{cl.id}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 shadow-sm p-4 bg-white rounded-xl border border-gray-100">
                        <label className="text-[10px] font-black uppercase text-gray-400">Slug Atual</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            defaultValue={cl.slug}
                            id={`slug-input-${cl.id}`}
                            className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-150 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const v = (document.getElementById(`slug-input-${cl.id}`) as HTMLInputElement)?.value;
                              handleMigrateSlug(cl, v);
                            }}
                            className="px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] rounded uppercase"
                          >
                            Migrar
                          </button>
                        </div>
                        <p className="text-[9px] text-gray-400 font-medium italic">Url: /portal-cliente-giffoni/{cl.slug}/login</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CASOS */}
            {activeTab === 'casos' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{filteredCases.length} Processos Cadastrados</span>
                  <button
                    onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
                    className="flex items-center gap-1 bg-gray-950 hover:bg-black text-white font-black text-[10px] rounded-lg px-3.5 py-2 uppercase"
                  >
                    <Plus size={14} /> Novo Caso no Fluxo
                  </button>
                </div>

                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-150 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                      <th className="py-3 px-4">Caso / Pasta</th>
                      <th className="py-3">Fliado a (Slug)</th>
                      <th className="py-3">Nº Operacional CNJ</th>
                      <th className="py-3">Responsável</th>
                      <th className="py-3">Etapa Fluxo</th>
                      <th className="py-3">Instância Estado</th>
                      <th className="py-3 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {filteredCases.map(ca => (
                      <tr key={ca.id} className="hover:bg-gray-50/50">
                        <td className="py-4 px-4 font-bold text-gray-900 flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                          {ca.title}
                        </td>
                        <td className="py-4 font-mono font-bold text-gray-500">{ca.clientSlug || 'Sem vínculo'}</td>
                        <td className="py-4 font-mono font-medium text-gray-400">{ca.processNumber || 'Extrajudicial / Administrativo'}</td>
                        <td className="py-4 text-gray-500">{ca.responsibleLawyer || 'Não escalado'}</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase tracking-wide">
                            {ca.productionStage || 'Iniciado'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${ca.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {ca.status}
                          </span>
                        </td>
                        <td className="py-4 text-right space-x-2">
                          <button
                            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao?caseId=${ca.id}`)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-black rounded uppercase text-emerald-700"
                          >
                            Retomar Fluxo
                          </button>
                          <button
                            onClick={() => setEditingCase(ca)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[10px] font-black rounded uppercase text-blue-700"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: FINANCEIRO */}
            {activeTab === 'financeiro' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{filteredFinancials.length} Relatórios de Faturamento</span>
                  <button
                    onClick={() => {
                      if (cases.length === 0) {
                        alert('Nenhum caso cadastrado para vincular faturamento.');
                        return;
                      }
                      setIsAddingFinancial(true);
                    }}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg px-3.5 py-2 uppercase cursor-pointer"
                  >
                    <Plus size={14} /> Novo Lancamento
                  </button>
                </div>

                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-150 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                      <th className="py-3 px-4">Link Caso ID</th>
                      <th className="py-3">Vínculo Cliente ID</th>
                      <th className="py-3">Valor Total</th>
                      <th className="py-3 font-semibold">Mensalidades</th>
                      <th className="py-3">Status Cobrança</th>
                      <th className="py-3 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {filteredFinancials.map(f => {
                      const caseExists = cases.some(ca => ca.id === f.caseId);
                      const clientExists = clients.some(cl => cl.id === f.clientId);
                      const isOrphan = !caseExists || !clientExists;

                      return (
                        <tr key={f.id} className="hover:bg-gray-50/50">
                          <td className="py-4 px-4 font-mono font-bold text-gray-900">
                            {f.caseId} {isOrphan && <span className="text-[10px] text-red-600 font-bold uppercase bg-red-50 p-1 rounded ml-1">Órfão!</span>}
                          </td>
                          <td className="py-4 font-mono text-gray-500">{f.clientId}</td>
                          <td className="py-4 font-bold text-emerald-700">R$ {f.totalAmount || 0}</td>
                          <td className="py-4 font-medium">{f.installmentsPaid} de {f.installments}</td>
                          <td className="py-4">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-black uppercase">
                              {f.status || 'Pendente'}
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                // Toggle client visibility
                                updateDoc(doc(db, 'caseFinancials', f.id), {
                                  visibleToClient: !f.visibleToClient,
                                  updatedAt: serverTimestamp()
                                }).then(() => {
                                  alert(`Visibidade de faturamento alterada para: ${!f.visibleToClient ? 'Visível ao cliente' : 'Oculto'}`);
                                  loadAllCollections();
                                });
                              }}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-[10px] font-black rounded uppercase text-gray-600"
                            >
                              {f.visibleToClient ? 'Ocultar Portal' : 'Exibir Portal'}
                            </button>
                            <button
                              onClick={() => setEditingFinancial(f)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[10px] font-black rounded uppercase text-blue-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Remover este lançamento financeiro definitivo?')) {
                                  await deleteDoc(doc(db, 'caseFinancials', f.id));
                                  alert('Registro financeiro removido.');
                                  loadAllCollections();
                                }
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-[10px] font-black rounded uppercase text-red-600"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 6: PRODUÇÃO */}
            {activeTab === 'producao' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-x-auto space-y-4">
                <p className="text-xs text-gray-500">Listagem integrada de todos os fluxos produtivos cadastrados. Retome um fluxo pendente ou finalizado.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cases.map(ca => {
                    const client = clients.find(cl => cl.id === ca.clientId);
                    return (
                      <div key={ca.id} className="p-5 bg-gray-50/50 border border-gray-150 rounded-2xl flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase text-blue-600">{ca.registrationType || 'Não definido'}</span>
                            <h3 className="font-bold text-gray-900 text-sm mt-0.5">{ca.title}</h3>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Cliente: {client?.name || ca.clientSlug} ({ca.clientSlug})</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                            ca.productionStatus === 'concluido' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : ca.productionStatus === 'com_pendencias'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                          }`}>
                            {ca.productionStatus || 'Em andamento'}
                          </span>
                        </div>

                        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                          <div className="text-[10px] font-bold text-gray-400">
                            Etapa: <span className="text-gray-700 uppercase">{ca.productionStage || 'Iniciado'}</span>
                          </div>
                          <button
                            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao?caseId=${ca.id}`)}
                            className="flex items-center gap-1 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 text-[9px] font-black uppercase text-gray-700 rounded-lg cursor-pointer"
                          >
                            Retomar Fluxo de Produção
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: INTEGRIDADE */}
            {activeTab === 'integridade' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gray-50 rounded-2xl border border-gray-150 gap-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-950 leading-tight">Painel de Auditoria de Deploy</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Diagnose automatizada de consistência fática da plataforma.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Diagnóstico</span>
                    <h4 className={`text-xl font-black mt-0.5 leading-none ${integrityState.recommendation.includes('PRONTO') ? 'text-emerald-600' : 'text-red-600'}`}>
                      {integrityState.recommendation}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Checagens OK</span>
                    <h5 className="text-2xl font-black text-emerald-700 mt-1">{integrityState.okCount}</h5>
                  </div>
                  <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">Atenções</span>
                    <h5 className="text-2xl font-black text-amber-600 mt-1">{integrityState.attenCount}</h5>
                  </div>
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Pendentes</span>
                    <h5 className="text-2xl font-black text-indigo-600 mt-1">{integrityState.pendCount}</h5>
                  </div>
                  <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-wider text-red-500">Erros Críticos</span>
                    <h5 className="text-2xl font-black text-red-600 mt-1">{integrityState.errorCount}</h5>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {integrityState.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm gap-2">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-[12px] text-gray-900">{it.key}</span>
                        <p className="text-[10px] text-gray-400 font-semibold">{it.desc} • Categoria: {it.cat}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border rounded ${
                        it.status === 'OK' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : it.status === 'Atenção'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {it.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION EDIT MODALS */}
      {/* 1. Client Inline Modal Editor */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-xl border border-gray-100 shadow-xl space-y-4">
            <h3 className="font-black text-base text-gray-950 border-b border-gray-50 pb-2.5">Editar Dados Principais do Cliente</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome / Razão Social</label>
                <input
                  type="text"
                  id="client-edit-name"
                  defaultValue={editingClient.type === 'PF' ? editingClient.pfDadosPessoais?.pf_nomeCompleto : editingClient.pjDadosEmpresa?.pj_razaoSocial}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CPF ou CNPJ</label>
                <input
                  type="text"
                  id="client-edit-doc"
                  defaultValue={editingClient.type === 'PF' ? editingClient.pfDadosPessoais?.pf_cpf : editingClient.pjDadosEmpresa?.pj_cnpj}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail de Login</label>
                <input
                  type="text"
                  id="client-edit-email"
                  defaultValue={editingClient.acessoSistema?.acesso_emailLogin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const name = (document.getElementById('client-edit-name') as HTMLInputElement).value;
                  const docCode = (document.getElementById('client-edit-doc') as HTMLInputElement).value;
                  const email = (document.getElementById('client-edit-email') as HTMLInputElement).value;

                  const payload: any = {};
                  if (editingClient.type === 'PF') {
                    payload.pfDadosPessoais = {
                      ...editingClient.pfDadosPessoais,
                      pf_nomeCompleto: name,
                      pf_cpf: docCode
                    };
                  } else {
                    payload.pjDadosEmpresa = {
                      ...editingClient.pjDadosEmpresa,
                      pj_razaoSocial: name,
                      pj_cnpj: docCode
                    };
                  }
                  payload.acessoSistema = {
                    ...editingClient.acessoSistema,
                    acesso_emailLogin: email
                  };

                  await updateDoc(doc(db, 'clients', editingClient.id), payload);
                  alert('Cliente atualizado!');
                  setEditingClient(null);
                  loadAllCollections();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. User credentials modular inline editor */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md border border-gray-100 shadow-xl space-y-4">
            <h3 className="font-black text-base text-gray-950 border-b border-gray-50 pb-2.5">Editar Credenciais de Acesso</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail</label>
                <input
                  type="text"
                  id="user-edit-email"
                  defaultValue={editingUser.email}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Role/Perfil</label>
                <select
                  id="user-edit-role"
                  defaultValue={editingUser.role}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold"
                >
                  <option value="client">Client (Cliente do Escritório)</option>
                  <option value="boss_admin">Boss Admin (Sócio do Escritório)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vínculo Slug</label>
                <input
                  type="text"
                  id="user-edit-slug"
                  defaultValue={editingUser.clientSlug}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const email = (document.getElementById('user-edit-email') as HTMLInputElement).value;
                  const role = (document.getElementById('user-edit-role') as HTMLSelectElement).value;
                  const clientSlug = (document.getElementById('user-edit-slug') as HTMLInputElement).value;

                  await updateDoc(doc(db, 'users', editingUser.id), {
                    email, role, clientSlug
                  });
                  alert('Usuário atualizado!');
                  setEditingUser(null);
                  loadAllCollections();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Safe Deletion stats alerts modal */}
      {deletingClient && deletionStats && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-lg border border-red-100 shadow-2xl space-y-4">
            <h3 className="font-black text-base text-red-700 uppercase tracking-wide flex items-center gap-2">
              <ShieldAlert size={20} /> Exclusão Segura Cadastral
            </h3>
            
            <p className="text-xs text-gray-600 font-medium">
              A exclusão mestre do cliente "<strong>{deletingClient.slug}</strong>" foi interceptada para prevenção de quebra de integridade de tabelas no banco de dados. Veja os elementos dependentes encontrados:
            </p>

            <div className="p-4 bg-gray-50 rounded-2xl grid grid-cols-2 gap-3 text-xs border border-gray-150">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span>Casos vinculados: <strong>{deletionStats.casesCount}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span>Faturamentos: <strong>{deletionStats.financialCount}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                <span>Eventos agenda: <strong>{deletionStats.eventsCount}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                <span>Restrições pendentes: <strong>{deletionStats.tasksCount}</strong></span>
              </div>
              <div className="col-span-2 border-t border-gray-200 pt-2.5 mt-1 space-y-1 text-[10px] uppercase font-black text-gray-400">
                <div className={deletionStats.hasPortal ? 'text-red-600' : 'text-gray-400'}>
                  • Vínculo clientPortals: {deletionStats.hasPortal ? 'ENCONTRADO' : 'Inativo'}
                </div>
                <div className={deletionStats.hasUser ? 'text-red-600' : 'text-gray-400'}>
                  • Usuário users: {deletionStats.hasUser ? 'ENCONTRADO' : 'Inativo'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-red-50 text-[10px] text-red-600 border border-red-100 font-semibold rounded-xl leading-relaxed">
              ❗ AVISO: A exclusão permanente removerá os logins e portal do cliente de forma irrecuperável. Considere fazer o arquivamento preventivo seguro do cliente.
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDeletingClient(null);
                  setDeletionStats(null);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl"
              >
                Voltar / Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeClientDeletion(true)}
                className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-150 rounded-xl"
              >
                Somente Arquivar Cliente
              </button>
              <button
                type="button"
                onClick={() => executeClientDeletion(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Case Editor Modal */}
      {editingCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-xl border border-gray-100 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-base text-gray-950 border-b border-gray-50 pb-2.5">Editar Caso</h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título do Caso</label>
                <input
                  type="text"
                  id="case-edit-title"
                  defaultValue={editingCase.title}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Parte Adversa</label>
                <input
                  type="text"
                  id="case-edit-adverse"
                  defaultValue={editingCase.adverseParty}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Comarca</label>
                <input
                  type="text"
                  id="case-edit-district"
                  defaultValue={editingCase.district}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Número do Processo</label>
                <input
                  type="text"
                  id="case-edit-process"
                  defaultValue={editingCase.processNumber}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Responsável</label>
                <input
                  type="text"
                  id="case-edit-lawyer"
                  defaultValue={editingCase.responsibleLawyer}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado Execução (Preposto)</label>
                <select
                  id="case-edit-status"
                  defaultValue={editingCase.status}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                >
                  <option value="ativo">Ativo</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Etapa Produtiva</label>
                <input
                  type="text"
                  id="case-edit-stage"
                  defaultValue={editingCase.productionStage}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setEditingCase(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const title = (document.getElementById('case-edit-title') as HTMLInputElement).value;
                  const adverseParty = (document.getElementById('case-edit-adverse') as HTMLInputElement).value;
                  const district = (document.getElementById('case-edit-district') as HTMLInputElement).value;
                  const processNumber = (document.getElementById('case-edit-process') as HTMLInputElement).value;
                  const responsibleLawyer = (document.getElementById('case-edit-lawyer') as HTMLInputElement).value;
                  const status = (document.getElementById('case-edit-status') as HTMLSelectElement).value;
                  const productionStage = (document.getElementById('case-edit-stage') as HTMLInputElement).value;

                  await updateDoc(doc(db, 'cases', editingCase.id), {
                    title: title.toUpperCase(),
                    adverseParty,
                    district,
                    processNumber,
                    responsibleLawyer,
                    status,
                    productionStage
                  });
                  alert('Caso editado com sucesso na base!');
                  setEditingCase(null);
                  loadAllCollections();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Salvar Caso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add / Create Financial form dialog popup */}
      {isAddingFinancial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const payload = {
                clientId: (document.getElementById('add-fin-client') as HTMLSelectElement).value,
                caseId: (document.getElementById('add-fin-case') as HTMLSelectElement).value,
                totalAmount: (document.getElementById('add-fin-amount') as HTMLInputElement).value,
                status: (document.getElementById('add-fin-status') as HTMLSelectElement).value,
                installments: (document.getElementById('add-fin-install') as HTMLInputElement).value,
                installmentsPaid: (document.getElementById('add-fin-paid') as HTMLInputElement).value,
                nextDueDate: (document.getElementById('add-fin-due') as HTMLInputElement).value,
                visibleToClient: (document.getElementById('add-fin-visible') as HTMLInputElement).checked,
              };
              handleCreateFinancial(payload);
            }} 
            className="bg-white p-6 rounded-3xl w-full max-w-lg border border-gray-100 shadow-2xl space-y-4"
          >
            <h3 className="font-black text-base text-gray-950 border-b border-gray-50 pb-2.5 flex items-center gap-1.5 text-emerald-700">
              <DollarSign size={20} /> Incluir Lançamento Financeiro
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vincular Caso</label>
                <select id="add-fin-case" required className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl">
                  {cases.map(ca => (
                    <option key={ca.id} value={ca.id}>{ca.title} ({ca.clientSlug})</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vincular Cliente</label>
                <select id="add-fin-client" required className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl">
                  {clients.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.name} ({cl.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Total (R$)</label>
                <input type="number" id="add-fin-amount" required placeholder="1500" className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status do Honorário</label>
                <select id="add-fin-status" className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl">
                  <option value="Em andamento">Em Andamento</option>
                  <option value="Pago">Totalmente Pago</option>
                  <option value="Atrasado">Pendente / Atrasado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-semibold">Mensalidades Acordadas</label>
                <input type="number" id="add-fin-install" defaultValue={1} className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-semibold">Mensalidades Quitadas</label>
                <input type="number" id="add-fin-paid" defaultValue={0} className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Próximo Vencimento</label>
                <input type="date" id="add-fin-due" className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="add-fin-visible" defaultChecked className="w-4 h-4 text-emerald-600 rounded border-gray-300" />
                <label htmlFor="add-fin-visible" className="font-bold text-gray-750">Visível no Portal</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setIsAddingFinancial(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Enviar Lançamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Edit Financial modal dialog */}
      {editingFinancial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md border border-gray-100 shadow-xl space-y-4">
            <h3 className="font-black text-base text-gray-950 border-b border-gray-50 pb-2.5 flex items-center gap-1.5 text-emerald-700">
              Editar Lançamento Financeiro
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Total (R$)</label>
                <input
                  type="number"
                  id="fin-edit-amount"
                  defaultValue={editingFinancial.totalAmount}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label>
                <select
                  id="fin-edit-status"
                  defaultValue={editingFinancial.status}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                >
                  <option value="Em andamento">Em Andamento</option>
                  <option value="Pago">Totalmente Pago</option>
                  <option value="Atrasado">Atrasado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mensalidades</label>
                <input
                  type="number"
                  id="fin-edit-install"
                  defaultValue={editingFinancial.installments}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-semibold">Quitadas</label>
                <input
                  type="number"
                  id="fin-edit-paid"
                  defaultValue={editingFinancial.installmentsPaid}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setEditingFinancial(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const totalAmount = (document.getElementById('fin-edit-amount') as HTMLInputElement).value;
                  const status = (document.getElementById('fin-edit-status') as HTMLSelectElement).value;
                  const installments = (document.getElementById('fin-edit-install') as HTMLInputElement).value;
                  const installmentsPaid = (document.getElementById('fin-edit-paid') as HTMLInputElement).value;

                  await updateDoc(doc(db, 'caseFinancials', editingFinancial.id), {
                    totalAmount: Number(totalAmount) || 0,
                    status,
                    installments: Number(installments) || 1,
                    installmentsPaid: Number(installmentsPaid) || 0,
                    updatedAt: serverTimestamp()
                  });
                  alert('Lançamento atualizado!');
                  setEditingFinancial(null);
                  loadAllCollections();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </BossLayout>
  );
}
