import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BossLayout } from '../../components/Layout';
import { 
  Sliders, Search, User, Users, Briefcase, DollarSign, Compass, 
  Activity, ShieldAlert, AlertTriangle, CheckCircle, Copy, ExternalLink, 
  RefreshCw, Plus, Calendar, MessageSquare, Clock, FileText, Check, XCircle
} from 'lucide-react';

type TabId = 'clientes' | 'casos' | 'slugs' | 'usuarios' | 'financeiro' | 'solicitacoes' | 'agenda' | 'edrp' | 'integridade';

export default function CentralControle() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('clientes');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data State
  const [clients, setClients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [usersInvites, setUsersInvites] = useState<any[]>([]);
  const [clientPortals, setClientPortals] = useState<any[]>([]);
  const [infoRequests, setInfoRequests] = useState<any[]>([]);
  const [evidenceRequests, setEvidenceRequests] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [portalSettings, setPortalSettings] = useState<any>(null);

  // Filter States
  const [casesFilter, setCasesFilter] = useState<'all' | 'em_producao' | 'com_pendencias' | 'pronto_relatorio' | 'concluido' | 'concluido_ressalvas' | 'arquivado'>('all');
  const [finFilter, setFinFilter] = useState<'all' | 'pendente' | 'aguardando' | 'pago' | 'parcial' | 'atrasado' | 'erro_webhook' | 'stripe' | 'asaas' | 'manual'>('all');
  const [edrpFilter, setEdrpFilter] = useState<'all' | 'sem_estruturacao' | 'sem_delegacao' | 'aguardando_revisao' | 'pronto_protocolo' | 'com_pendencia' | 'protocolado' | 'controladoria'>('all');

  // Modals state
  const [safeDeleteWarning, setSafeDeleteWarning] = useState<string | null>(null);

  const loadAllCollections = async () => {
    setLoading(true);
    try {
      const [
        clientsSnap, casesSnap, usersSnap, invitesSnap, portalsSnap,
        infoSnap, evidenceSnap, financialsSnap, eventsSnap, portalSettingsSnap
      ] = await Promise.all([
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'cases')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'users_invites')),
        getDocs(collection(db, 'clientPortals')),
        getDocs(collection(db, 'caseInformationRequests')),
        getDocs(collection(db, 'caseEvidenceRequests')),
        getDocs(collection(db, 'caseFinancials')),
        getDocs(collection(db, 'caseEvents')),
        getDoc(doc(db, 'settings', 'portal'))
      ]);

      setClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCases(casesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUsersInvites(invitesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClientPortals(portalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setInfoRequests(infoSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEvidenceRequests(evidenceSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFinancials(financialsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (portalSettingsSnap.exists()) {
        setPortalSettings(portalSettingsSnap.data());
      }
    } catch (err) {
      console.error("Erro ao carregar coleções:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCollections();
  }, []);

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
    } catch {
      alert(`Conteúdo copiado de forma segura: ${text}`);
    }
  };

  // Helper resolvers
  const getClientDisplayName = (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    if (!c) return 'Não Encontrado';
    return c.type === 'PF' 
      ? (c.pfDadosPessoais?.pf_nomeCompleto || c.pfData?.pf_nomeCompleto || 'Sem Nome')
      : (c.pjDadosEmpresa?.pj_razaoSocial || c.pjData?.pj_razaoSocial || 'Sem Razão Social');
  };

  const getClientEmail = (c: any) => {
    return c?.acessoSistema?.acesso_emailLogin || c?.email || 'Sem E-mail';
  };

  const getClientPhone = (c: any) => {
    if (c?.type === 'PF') {
      return c.pfContato?.pf_telefone || c.pfContato?.pf_whatsapp || c.pfData?.pf_telefone || 'Sem número';
    }
    return c?.pjContatoEmpresa?.pj_telefoneEmpresa || c?.pjData?.pj_telefoneEmpresa || 'Sem número';
  };

  const getClientDocument = (c: any) => {
    if (c?.type === 'PF') return c.pfDadosPessoais?.pf_cpf || 'Não Informado';
    return c?.pjDadosEmpresa?.pj_cnpj || 'Não Informado';
  };

  // Search filter logic matching ANY of the targets recursively
  const searchLower = searchTerm.trim().toLowerCase();
  const matchingClientIds = new Set<string>();
  const matchingCaseIds = new Set<string>();

  clients.forEach(c => {
    const name = getClientDisplayName(c.id);
    const docNum = getClientDocument(c);
    const email = getClientEmail(c);
    const phone = getClientPhone(c);
    const slug = c.slug || '';

    const match = !searchLower ||
      name.toLowerCase().includes(searchLower) ||
      docNum.includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      phone.includes(searchLower) ||
      slug.toLowerCase().includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower);

    if (match) matchingClientIds.add(c.id);
  });

  cases.forEach(ca => {
    const title = ca.title || '';
    const cnj = ca.processNumber || '';
    const service = ca.registrationType || '';
    const statusInt = ca.statusInterno || ca.status || '';
    const statusPub = ca.statusPublicoCliente || '';
    const lawyer = ca.responsibleLawyer || '';
    const slug = ca.clientSlug || '';

    const match = !searchLower ||
      title.toLowerCase().includes(searchLower) ||
      ca.id.toLowerCase().includes(searchLower) ||
      cnj.toLowerCase().includes(searchLower) ||
      service.toLowerCase().includes(searchLower) ||
      statusInt.toLowerCase().includes(searchLower) ||
      statusPub.toLowerCase().includes(searchLower) ||
      lawyer.toLowerCase().includes(searchLower) ||
      slug.toLowerCase().includes(searchLower) ||
      matchingClientIds.has(ca.clientId);

    if (match) {
      matchingCaseIds.add(ca.id);
      if (ca.clientId) matchingClientIds.add(ca.clientId);
    }
  });

  // Displays corresponding to current filters and search
  const displayedClients = clients.filter(c => matchingClientIds.has(c.id));
  
  const displayedCases = cases.filter(ca => {
    if (!matchingCaseIds.has(ca.id)) return false;
    if (casesFilter === 'all') return true;
    if (casesFilter === 'arquivado') return ca.status === 'arquivado';
    return ca.productionStatus === casesFilter;
  });

  const displayedSlugs = clientPortals.filter(p => {
    const client = clients.find(c => c.slug === p.slug);
    const matchesSearch = !searchLower || 
      p.slug?.toLowerCase().includes(searchLower) || 
      (p.clientId && matchingClientIds.has(p.clientId));
    return matchesSearch;
  });

  const displayedUsers = users.filter(u => {
    const matchesSearch = !searchLower ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.clientSlug?.toLowerCase().includes(searchLower) ||
      (u.clientId && matchingClientIds.has(u.clientId));
    return matchesSearch;
  });

  const displayedFinancials = financials.filter(f => {
    const matchesSearch = !searchLower ||
      f.caseId?.toLowerCase().includes(searchLower) ||
      f.clientId?.toLowerCase().includes(searchLower) ||
      (f.status || f.paymentStatus || '').toLowerCase().includes(searchLower) ||
      (f.clientId && matchingClientIds.has(f.clientId)) ||
      (f.caseId && matchingCaseIds.has(f.caseId));
    if (!matchesSearch) return false;

    if (finFilter === 'all') return true;
    const status = (f.status || f.paymentStatus || '').toLowerCase();
    const provider = (f.provider || '').toLowerCase();
    const webhook = (f.webhookStatus || '').toLowerCase();

    if (finFilter === 'pendente') return status === 'pendente' || status === 'aberto';
    if (finFilter === 'aguardando') return status === 'aguardando' || status === 'aguardando pagamento' || status === 'aguardando_pagamento';
    if (finFilter === 'pago') return status === 'pago';
    if (finFilter === 'parcial') return status === 'parcial' || status === 'parcialmente pago';
    if (finFilter === 'atrasado') return status === 'atrasado' || status === 'em atraso' || status === 'em_atraso';
    if (finFilter === 'erro_webhook') return webhook === 'erro' || webhook.includes('erro');
    if (finFilter === 'stripe') return provider === 'stripe';
    if (finFilter === 'asaas') return provider === 'asaas';
    if (finFilter === 'manual') return provider === 'manual' || !provider;
    return true;
  });

  const combinedRequests = [
    ...infoRequests.map(r => ({ ...r, reqType: 'Informação', parsedTitle: r.title || r.question || 'Sem título' })),
    ...evidenceRequests.map(r => ({ ...r, reqType: 'Prova', parsedTitle: r.title || 'Sem título' }))
  ].filter(r => !searchLower || r.caseId?.toLowerCase().includes(searchLower) || r.parsedTitle?.toLowerCase().includes(searchLower) || matchingCaseIds.has(r.caseId));

  const displayedEvents = events.filter(e => !searchLower || e.title?.toLowerCase().includes(searchLower) || e.type?.toLowerCase().includes(searchLower) || matchingCaseIds.has(e.caseId) || (e.clientId && matchingClientIds.has(e.clientId)));

  const displayedEdrpCases = cases.filter(ca => {
    if (!matchingCaseIds.has(ca.id)) return false;
    if (edrpFilter === 'all') return true;
    if (edrpFilter === 'sem_estruturacao') return !ca.structuring && !ca.edrp?.structuring;
    if (edrpFilter === 'sem_delegacao') return !ca.responsibleLawyer && !ca.delegation?.responsible;
    if (edrpFilter === 'aguardando_revisao') return ca.productionStage === 'revisao';
    if (edrpFilter === 'pronto_protocolo') return ca.productionStage === 'protocolo';
    if (edrpFilter === 'com_pendencia') return ca.productionStatus === 'com_pendencias';
    if (edrpFilter === 'protocolado') return ca.statusInterno === 'protocolado' || ca.status === 'protocolado';
    if (edrpFilter === 'controladoria') return ca.productionStage === 'controladoria';
    return true;
  });

  // DB INTEGRITY AUDIT ENGINE (Aba 9 & Diagnostic computation)
  const runDiagnostic = () => {
    const criticalErrorsList: string[] = [];
    const warningList: string[] = [];

    clients.forEach(c => {
      const name = getClientDisplayName(c.id);
      if (!c.slug) {
        criticalErrorsList.push(`Cliente [${name}] está sem slug cadastrado.`);
      } else {
        const portal = clientPortals.find(p => p.slug === c.slug);
        if (!portal) {
          criticalErrorsList.push(`Tabela clientPortals ausente para o slug "/${c.slug}" do cliente.`);
        } else if (portal.clientId !== c.id) {
          criticalErrorsList.push(`Tabela clientPortals aponta para clientId incorreto para o slug "/${c.slug}".`);
        }
      }
    });

    cases.forEach(ca => {
      if (!ca.clientId) {
        criticalErrorsList.push(`Caso [${ca.title || ca.id}] está sem clientId.`);
      } else if (!clients.some(cl => cl.id === ca.clientId)) {
        criticalErrorsList.push(`Caso [${ca.title}] aponta para clientId inexistente: "${ca.clientId}".`);
      }
      if (!ca.clientSlug) {
        criticalErrorsList.push(`Caso [${ca.title}] está sem clientSlug.`);
      }
      if (!ca.statusInterno && !ca.status) {
        criticalErrorsList.push(`Caso [${ca.title}] está sem statusInterno.`);
      }
      if (!ca.statusPublicoCliente) {
        criticalErrorsList.push(`Caso [${ca.title}] está sem statusPublicoCliente.`);
      }

      // EDRP check warnings
      const hasStructuring = !!(ca.structuring || ca.edrp?.structuring);
      const hasDelegation = !!(ca.responsibleLawyer || ca.delegation?.responsible);
      if (!hasStructuring) warningList.push(`Processo [${ca.title}]: Estágio estruturação EDRP não está preenchido.`);
      if (!hasDelegation) warningList.push(`Processo [${ca.title}]: Estágio delegação EDRP sem responsável.`);
    });

    users.forEach(u => {
      if (u.role === 'client') {
        if (!u.clientId) criticalErrorsList.push(`Usuário client [${u.email}] está sem clientId.`);
        if (!u.clientSlug) criticalErrorsList.push(`Usuário client [${u.email}] está sem clientSlug.`);
      }
    });

    financials.forEach(f => {
      if (!f.caseId) {
        criticalErrorsList.push(`Faturamento [${f.id}] sem caseId.`);
      } else if (!cases.some(ca => ca.id === f.caseId)) {
        criticalErrorsList.push(`Faturamento [${f.id}] aponta para caseId inexistente: "${f.caseId}".`);
      }
    });

    // Connector Checklist warnings
    const hasStripe = portalSettings?.stripeActive || process.env.VITE_STRIPE_PUBLIC_KEY || false;
    const hasAsaas = portalSettings?.asaasActive || false;
    const hasDrive = portalSettings?.googleDriveConnected || false;

    if (!hasStripe && !hasAsaas) warningList.push("Provedor de finanças (Stripe / Asaas) não configurado ou inativo.");
    if (!hasDrive) warningList.push("Provedor Google Drive não está ativo na central de mídias.");

    let statusGeral: 'Pronto para deploy' | 'Pronto com ressalvas' | 'Não recomendado para deploy' = 'Pronto para deploy';
    if (criticalErrorsList.length > 0) {
      statusGeral = 'Não recomendado para deploy';
    } else if (warningList.length > 0) {
      statusGeral = 'Pronto com ressalvas';
    }

    return {
      criticalErrorsList,
      warningList,
      statusGeral
    };
  };

  const handleCopyResumo = () => {
    const { criticalErrorsList, statusGeral } = runDiagnostic();
    const totalP = cases.filter(c => c.productionStatus === 'com_pendencias').length;

    const summaryText = `Central de Controle BOSS — Diagnóstico
Clientes: ${clients.length}
Casos: ${cases.length}
Pendências: ${totalP}
Erros críticos: ${criticalErrorsList.length}
Status geral: ${statusGeral}
Recomendação: ${statusGeral === 'Não recomendado para deploy' ? 'Ajustar erros estruturais cadastrais do portal' : 'Sincronizações homologadas para produção'}`;

    copyToClipboard(summaryText, 'Resumo do diagnóstico administrativo copiado!');
  };

  const togglePortalSuspension = async (client: any, activeState: boolean) => {
    try {
      await updateDoc(doc(db, 'clients', client.id), { active: activeState });
      if (client.slug) {
        await updateDoc(doc(db, 'clientPortals', client.slug), { active: activeState });
      }
      alert(`Acesso ao portal de ${client.slug} definido como: ${activeState ? 'ATIVO' : 'SUSPENSO'}`);
      loadAllCollections();
    } catch (err) {
      console.error(err);
      alert('Incapaz de atualizar estado de ativação do portal de clientes.');
    }
  };

  const handleMarkRequestStatus = async (req: any, newStatus: string) => {
    try {
      const colName = req.reqType === 'Informação' ? 'caseInformationRequests' : 'caseEvidenceRequests';
      await updateDoc(doc(db, colName, req.id), {
        status: newStatus,
        bossFeedback: `Avaliado pelo BOSS - ${newStatus.toUpperCase()}`,
        updatedAt: new Date()
      });
      alert(`Solicitação marcada como: ${newStatus.toUpperCase()}`);
      loadAllCollections();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkFinancialAttention = async (f: any) => {
    try {
      await updateDoc(doc(db, 'caseFinancials', f.id), {
        status: 'Atrasado',
        webhookStatus: 'Cobrança manual e auditoria solicitada pelo BOSS',
        attentionFlagged: true
      });
      alert('Alerta de atenção administrativa anexado ao lançamento de faturamento.');
      loadAllCollections();
    } catch (err) {
      console.error(err);
    }
  };

  const diag = runDiagnostic();

  return (
    <BossLayout>
      <div className="space-y-6 font-sans select-none max-w-7xl mx-auto">
        
        {/* Dynamic Admin Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-150 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-650 rounded-xl flex items-center justify-center text-white shadow-md">
              <Sliders size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">Central de Controle BOSS</h1>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider font-mono">Consola Mestre de Auditoria e Integridade</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                loadAllCollections();
                alert('Banco de dados sincronizado!');
              }}
              className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-indigo-500" : ""} />
              <span>Sincronizar Banco</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('integridade');
                alert('Diagnóstico estrutural recalculado abaixo.');
              }}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold font-mono border border-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert size={14} />
              <span>Gerar Diagnose</span>
            </button>
            <button
              onClick={handleCopyResumo}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy size={13} />
              <span>Copiar Resumo</span>
            </button>
            <button
              onClick={() => navigate('/boss-giffoni-clientes/configurações')}
              className="px-3.5 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-150 rounded-xl text-xs font-bold text-gray-650 cursor-pointer text-center"
            >
              Ir para Conectores
            </button>
            <button
              onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer text-center"
            >
              Painel de Produção
            </button>
          </div>
        </div>

        {/* Global Multi-symmetric Search Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-3xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisa global: Nome, CPF, CNPJ, e-mail, telefone, slug, clientId, caseId, número CNJ, serviço, status faturamento, etc..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-150 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold placeholder:text-gray-400"
            />
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-2 bg-gray-100 text-gray-500 font-bold rounded-lg text-xs"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Tab Navigation Tray (9 items requested) */}
        <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto pb-1.5 scrollbar-none">
          {[
            { id: 'clientes', label: 'Clientes', count: displayedClients.length },
            { id: 'casos', label: 'Casos / Processos', count: displayedCases.length },
            { id: 'slugs', label: 'Slugs & Rotas', count: displayedSlugs.length },
            { id: 'usuarios', label: 'Acessos & Contas', count: displayedUsers.length },
            { id: 'financeiro', label: 'Financeiro', count: displayedFinancials.length },
            { id: 'solicitacoes', label: 'Solicitações (Info/Provas)', count: combinedRequests.length },
            { id: 'agenda', label: 'Agenda & Atos', count: displayedEvents.length },
            { id: 'edrp', label: 'Esteira EDRP', count: displayedEdrpCases.length },
            { id: 'integridade', label: 'Auditoria de Deploy', count: diag.criticalErrorsList.length, warning: true },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as TabId)}
                className={`px-3.5 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{t.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  isActive 
                    ? 'bg-indigo-800 text-indigo-100' 
                    : t.warning && t.count > 0 
                      ? 'bg-rose-100 text-rose-700' 
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* LOADING BOX CONTAINER */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-3xl gap-2 font-mono">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Aguarde. Carregando bancos...</span>
          </div>
        )}

        {/* CURRENT ACTIVE TAB BODY */}
        {!loading && (
          <div className="min-h-[300px]">
            
            {/* ABA 1: CLIENTES */}
            {activeTab === 'clientes' && (
              <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nome / Empresa</th>
                      <th className="py-3">CPF/CNPJ</th>
                      <th className="py-3">Acesso E-mail</th>
                      <th className="py-3">Contato Telefone</th>
                      <th className="py-3">Slug</th>
                      <th className="py-3">Instância ID</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 text-right pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {displayedClients.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400 italic">Nenhum cliente cadastrado atende aos critérios descritos.</td>
                      </tr>
                    ) : (
                      displayedClients.map(c => {
                        const clientName = getClientDisplayName(c.id);
                        const numCasos = cases.filter(ca => ca.clientId === c.id).length;
                        return (
                          <tr key={c.id} className="hover:bg-gray-50/40">
                            <td className="py-4 px-4">
                              <span className="font-extrabold text-gray-900 block">{clientName}</span>
                              <span className="text-[10px] text-indigo-500 font-bold block mt-0.5 font-mono">{numCasos} processo(s) vinculado(s)</span>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {c.portalStatus === 'criado' ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold">Portal criado</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded text-[9px] font-bold">Portal não criado</span>
                                )}
                                {c.cadastroIncompleto === true ? (
                                  <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[9px] font-bold" title={c.missingFields && c.missingFields.length > 0 ? `Campos faltantes: ${c.missingFields.join(', ')}` : 'Cadastro incompleto'}>
                                    Cadastro incompleto
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-150 rounded text-[9px] font-bold">Cadastro completo</span>
                                )}
                              </div>
                              {c.cadastroIncompleto === true && c.missingFields && c.missingFields.length > 0 && (
                                <span className="text-[9px] text-gray-400 block mt-1 leading-normal font-sans">Falta: {c.missingFields.join(', ')}</span>
                              )}
                            </td>
                            <td className="py-4 font-mono font-semibold">{getClientDocument(c)}</td>
                            <td className="py-4 text-gray-500">{getClientEmail(c)}</td>
                            <td className="py-4 text-gray-500">{getClientPhone(c)}</td>
                            <td className="py-4 font-mono font-bold text-indigo-650">/{c.slug || 'sem-slug'}</td>
                            <td className="py-4 font-mono text-[10px] text-gray-400">{c.id}</td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                c.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {c.active !== false ? 'Ativo' : 'Suspenso'}
                              </span>
                            </td>
                            <td className="py-4 text-right pr-4 space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => navigate(`/boss-giffoni-clientes/clientes/${c.id}`)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-250 text-[10px] font-bold text-gray-750 rounded-lg cursor-pointer"
                              >
                                Abrir
                              </button>
                              <button
                                onClick={() => navigate(`/boss-giffoni-clientes/portal-cliente-preview/${c.id}`)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-[10px] font-bold text-purple-700 rounded-lg cursor-pointer"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => {
                                  const link = portalSettings?.link || 'https://aistudio.google.com/apps/93c62126-a17f-4c18-8bc7-d327df1ca6b5?showPreview=true&showAssistant=true';
                                  window.open(link, '_blank');
                                }}
                                className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-[10px] font-bold text-gray-700 rounded-lg cursor-pointer"
                              >
                                App Externo
                              </button>
                              <button
                                onClick={() => togglePortalSuspension(c, c.active === false)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer ${
                                  c.active !== false ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-750'
                                }`}
                              >
                                {c.active !== false ? 'Suspender' : 'Reativar'}
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('integridade');
                                  setSearchTerm(c.slug || '');
                                }}
                                className="px-2 py-1 bg-slate-55/40 hover:bg-slate-100 text-[10px] text-slate-700 rounded-lg cursor-pointer font-bold"
                              >
                                Integridade
                              </button>
                              <button
                                onClick={() => setSafeDeleteWarning("A exclusão definitiva será tratada em build próprio de segurança.")}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-[10px] text-red-600 rounded-lg font-bold cursor-pointer"
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA 2: CASOS */}
            {activeTab === 'casos' && (
              <div className="space-y-4">
                {/* Cases Filter Tabs Row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'Todos os Casos' },
                    { id: 'em_producao', label: 'Em Produção' },
                    { id: 'com_pendencias', label: 'Com Pendências' },
                    { id: 'pronto_relatorio', label: 'Pronto p/ Relatório' },
                    { id: 'concluido', label: 'Concluídos' },
                    { id: 'concluido_ressalvas', label: 'Concluído com Ressalvas' },
                    { id: 'arquivado', label: 'Arquivados' }
                  ].map((f) => {
                    const isSel = casesFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setCasesFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                          isSel ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">ID / Pasta</th>
                        <th className="py-3">Título / Serviço</th>
                        <th className="py-3">Cliente (Slug)</th>
                        <th className="py-3">Processo Nº CNJ</th>
                        <th className="py-3">Responsável</th>
                        <th className="py-3 text-center">Status Interno</th>
                        <th className="py-3 text-center">Status Público</th>
                        <th className="py-3 text-right pr-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {displayedCases.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400 italic">Nenhum caso encontrado para este filtro de busca.</td>
                        </tr>
                      ) : (
                        displayedCases.map(ca => {
                          const clientName = getClientDisplayName(ca.clientId);
                          return (
                            <tr key={ca.id} className="hover:bg-gray-50/40">
                              <td className="py-4 px-4 font-mono text-[10px] text-gray-400 font-bold block mt-1">{ca.id}</td>
                              <td className="py-4">
                                <span className="font-extrabold text-gray-900 block">{ca.title}</span>
                                <span className="text-[10px] text-gray-400 font-semibold block uppercase mt-0.5">{ca.registrationType || 'Tese judicial'}</span>
                              </td>
                              <td className="py-4">
                                <span className="font-semibold block">{clientName}</span>
                                <span className="text-[10px] text-indigo-500 font-mono font-bold block mt-0.5">/{ca.clientSlug}</span>
                              </td>
                              <td className="py-4 font-mono text-gray-400 font-semibold">{ca.processNumber || 'Extrajudicial / Administrativo'}</td>
                              <td className="py-4 text-gray-500 font-bold">{ca.responsibleLawyer || 'Não Designado'}</td>
                              <td className="py-4 text-center">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-black uppercase">
                                  {ca.statusInterno || ca.status || 'Pendente'}
                                </span>
                              </td>
                              <td className="py-4 text-center">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase">
                                  {ca.statusPublicoCliente || 'Aguardando'}
                                </span>
                              </td>
                              <td className="py-4 text-right pr-4 space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao?caseId=${ca.id}`)}
                                  className="px-2.5 py-1 bg-emerald-600 font-bold text-white hover:bg-emerald-700 rounded-lg cursor-pointer text-[10px]"
                                >
                                  Continuar Fluxo
                                </button>
                                <button
                                  onClick={() => navigate(`/boss-giffoni-clientes/portal-cliente-preview/${ca.clientId}`)}
                                  className="px-2.5 py-1 bg-indigo-50 text-indigo-750 hover:bg-indigo-100 rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Espelho Público
                                </button>
                                <button
                                  onClick={() => copyToClipboard(ca.id, 'ID do Caso Copiado!')}
                                  className="px-2 py-1 bg-white border border-gray-200 text-[10px] font-medium text-gray-650 hover:bg-gray-50 rounded"
                                >
                                  ID
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 3: SLUGS */}
            {activeTab === 'slugs' && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-950 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs font-semibold">
                    <p className="font-extrabold text-amber-900">Segurança de Rota: Slug Travado</p>
                    <p className="text-amber-800 font-medium">O slug de sincronização é estabelecido no momento do cadastro do portal e travado em produção. Para resolver inconsistências, uma correção técnica controlada do BOSS é necessária.</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Identificador Slug</th>
                        <th className="py-3">Vínculo Cliente</th>
                        <th className="py-3">Coleção clients</th>
                        <th className="py-3 font-semibold">Coleção clientPortals</th>
                        <th className="py-3">Vínculo Consistente</th>
                        <th className="py-3">Estado de Ativação</th>
                        <th className="py-3">Rota Interna de Login</th>
                        <th className="py-3 text-right pr-4">Ações de Segurança</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {displayedSlugs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400 italic font-mono">Nenhum portal cadastrado no clientPortals correspondente ao filtro.</td>
                        </tr>
                      ) : (
                        displayedSlugs.map(p => {
                          const cl = clients.find(c => c.slug === p.slug);
                          const existsInClients = !!cl;
                          const existsInPortals = clientPortals.some(port => port.slug === p.slug);
                          const isConsistent = cl && p.clientId === cl.id;

                          return (
                            <tr key={p.id} className="hover:bg-gray-50/40 font-mono">
                              <td className="py-4 px-4 font-extrabold text-indigo-600">/{p.slug}</td>
                              <td className="py-4 font-sans font-bold text-gray-900">{cl ? getClientDisplayName(cl.id) : 'Órfão'}</td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${existsInClients ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  {existsInClients ? 'Cadastrado' : 'Ausente'}
                                </span>
                              </td>
                              <td className="py-4 font-semibold">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${existsInPortals ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  {existsInPortals ? 'Registrado' : 'Incompleto'}
                                </span>
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isConsistent ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                                  {isConsistent ? 'Sim' : 'Correção Técnica Necessária'}
                                </span>
                              </td>
                              <td className="py-4 font-sans font-bold">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${p.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {p.active !== false ? 'Ativo' : 'Suspenso'}
                                </span>
                              </td>
                              <td className="py-4 text-gray-400">/portal-cliente-giffoni/{p.slug}/login</td>
                              <td className="py-4 text-right pr-4 font-sans space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => copyToClipboard(p.slug, 'Slug Copiado!')}
                                  className="px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Copiar Slug
                                </button>
                                <button
                                  onClick={() => copyToClipboard(`/portal-cliente-giffoni/${p.slug}/login`, 'Rota interna copiada!')}
                                  className="px-2 py-1 bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Copiar Rota
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 4: USUÁRIOS/ACESSOS */}
            {activeTab === 'usuarios' && (
              <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">E-mail Credencial</th>
                      <th className="py-3">Role / Perfil</th>
                      <th className="py-3 font-semibold">Vínculo clientId</th>
                      <th className="py-3">Vínculo clientSlug</th>
                      <th className="py-3 text-center">Status</th>
                      <th className="py-3 text-center">Cadastro Existe?</th>
                      <th className="py-3 text-center">Portal Ativo?</th>
                      <th className="py-3 text-right pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {displayedUsers.map(u => {
                      const clientExists = clients.some(c => c.id === u.clientId);
                      const portalExists = clientPortals.some(p => p.slug === u.clientSlug);
                      return (
                        <tr key={u.id} className="hover:bg-gray-50/40">
                          <td className="py-4 px-4 text-xs">
                            <span className="font-extrabold text-gray-900 block">{u.email}</span>
                            {(() => {
                              const relatedClient = clients.find(cl => cl.id === u.clientId);
                              const password = u.senhaVisivelPreview || relatedClient?.senhaVisivelPreview || relatedClient?.acessoSistema?.acesso_senha;
                              if (!password) return null;
                              return (
                                <div className="mt-1.5 p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-850 text-[10px] font-sans">
                                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Preview</span>
                                    <span>Senha: <span className="font-mono text-gray-900 select-all font-bold">{password}</span></span>
                                  </div>
                                  <span className="text-[9px] text-amber-600 block leading-normal mt-0.5">🔒 Senha visível apenas em modo preview.</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              u.role === 'boss_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {u.role || 'client'}
                            </span>
                          </td>
                          <td className="py-4 font-mono font-semibold text-gray-500">{u.clientId || 'Nulo'}</td>
                          <td className="py-4 font-mono font-bold text-indigo-600">{u.clientSlug || 'Sem portal'}</td>
                          <td className="py-4 text-center">
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-[10px] font-black uppercase">
                              {u.status || 'Ativo'}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                              clientExists ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {clientExists ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                              portalExists ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {portalExists ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-4 space-x-1.5 whitespace-nowrap font-sans">
                            <button
                              onClick={() => u.clientId && navigate(`/boss-giffoni-clientes/clientes/${u.clientId}`)}
                              className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded text-[10px]"
                            >
                              Abrir Cliente
                            </button>
                            <button
                              onClick={() => copyToClipboard(u.email, 'E-mail Copiado!')}
                              className="px-2 py-1 bg-white border border-gray-200 font-bold rounded text-[10px]"
                            >
                              Copiar E-mail
                            </button>
                            <button
                              onClick={() => {
                                updateDoc(doc(db, 'users', u.id), { status: 'pendente' });
                                alert('Marcado pendente.');
                                loadAllCollections();
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-[10px] text-amber-700 rounded font-bold"
                            >
                              Pendência
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA 5: FINANCEIRO */}
            {activeTab === 'financeiro' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'Todos os Faturamentos' },
                    { id: 'pendente', label: 'Aberto / Sem pagamento' },
                    { id: 'aguardando', label: 'Aguardando Compensação' },
                    { id: 'pago', label: 'Compensado' },
                    { id: 'parcial', label: 'Parcialmente Pago' },
                    { id: 'atrasado', label: 'Em atraso' },
                    { id: 'erro_webhook', label: 'Erro Webhook' },
                    { id: 'stripe', label: 'Gateway: Stripe' },
                    { id: 'asaas', label: 'Gateway: Asaas' },
                    { id: 'manual', label: 'Controle Manual/Temporário' }
                  ].map((f) => {
                    const isSel = finFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFinFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                          isSel ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Caso de Origem ID</th>
                        <th className="py-3">Cliente Assinado</th>
                        <th className="py-3">Valor Honorário</th>
                        <th className="py-3">Metodologia</th>
                        <th className="py-3">Status Cobrança</th>
                        <th className="py-3">Provedor</th>
                        <th className="py-3">Webhook Automação</th>
                        <th className="py-3">Contrato / Matriz</th>
                        <th className="py-3 text-right pr-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {displayedFinancials.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-gray-400 italic">Nenhum lançamento fático financeiro catalogado para este filtro.</td>
                        </tr>
                      ) : (
                        displayedFinancials.map(f => {
                          const clientName = getClientDisplayName(f.clientId);
                          const total = Number(f.totalAmount || f.amount || 0);
                          const hasWebhookError = (f.webhookStatus || '').toLowerCase().includes('erro');
                          return (
                            <tr key={f.id} className="hover:bg-gray-50/40">
                              <td className="py-4 px-4 font-mono text-[10px] font-bold block mt-1">{f.caseId || 'Indeterminado'}</td>
                              <td className="py-4">
                                <span className="font-semibold block">{clientName}</span>
                                <span className="text-[10px] text-gray-400 block font-mono">{f.clientId}</span>
                              </td>
                              <td className="py-4 font-mono font-extrabold text-emerald-700">
                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 text-gray-400 uppercase font-semibold text-[10px]">
                                {f.installments ? `${f.installmentsPaid || 0} de ${f.installments} Parcela(s)` : 'Contrato Fixo'}
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  (f.status || f.paymentStatus || '').toLowerCase() === 'pago' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {f.status || f.paymentStatus || 'Aberto'}
                                </span>
                              </td>
                              <td className="py-4 uppercase font-bold text-[9px] text-indigo-650">{f.provider || 'Manual'}</td>
                              <td className="py-4 font-semibold text-gray-500">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${hasWebhookError ? 'bg-rose-50 text-rose-700' : 'bg-gray-150 text-gray-600'}`}>
                                  {f.webhookStatus || 'Sem Notificações'}
                                </span>
                              </td>
                              <td className="py-4 text-gray-400">
                                {f.contractLinked ? 'Contrato Vinculado' : 'Aguardando formalização'}
                              </td>
                              <td className="py-4 text-right pr-4 space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao?caseId=${f.caseId}`)}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px] cursor-pointer"
                                >
                                  Fluxo
                                </button>
                                <button
                                  onClick={() => f.paymentLink && copyToClipboard(f.paymentLink, 'Link de pagamento copiado!')}
                                  className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] disabled:opacity-50"
                                  disabled={!f.paymentLink}
                                >
                                  Link
                                </button>
                                <button
                                  onClick={() => handleMarkFinancialAttention(f)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold rounded cursor-pointer"
                                >
                                  Atenção
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 6: SOLICITAÇÕES */}
            {activeTab === 'solicitacoes' && (
              <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3">Caso ID</th>
                      <th className="py-3 text-semibold">Título Solicitado / Pergunta</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Data Prazo</th>
                      <th className="py-3 text-center">Visível Portal</th>
                      <th className="py-3">Análise de Qualidade BOSS</th>
                      <th className="py-3 text-right pr-4">Ações Operacionais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {combinedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400 italic font-mono">Nenhuma solicitação de esclarecimento ou provas cadastrada no banco.</td>
                      </tr>
                    ) : (
                      combinedRequests.map((r, index) => {
                        const status = r.status || 'pendente';
                        return (
                          <tr key={r.id || index} className="hover:bg-gray-50/40">
                            <td className="py-4 px-4 font-mono font-bold">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                r.reqType === 'Informação' ? 'bg-cyan-50 text-cyan-700' : 'bg-indigo-50 text-indigo-750'
                              }`}>
                                {r.reqType}
                              </span>
                            </td>
                            <td className="py-4 font-mono font-semibold text-gray-400 text-[10px]">{r.caseId}</td>
                            <td className="py-4">
                              <p className="font-extrabold text-gray-900 leading-tight">{r.parsedTitle}</p>
                              {r.description && <p className="text-[10px] text-gray-450 mt-1 font-medium">{r.description}</p>}
                            </td>
                            <td className="py-4 uppercase text-[10px] font-black tracking-wider">
                              <span className={`px-1.5 py-0.5 rounded ${
                                status === 'respondido' || status === 'enviado' || status === 'entregue' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td className="py-4 font-mono text-gray-400">{r.dueDate || 'Sem Prazo'}</td>
                            <td className="py-4 text-center">
                              <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold ${
                                r.visibleToClient !== false ? 'bg-indigo-50 text-indigo-650' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {r.visibleToClient !== false ? 'Sim' : 'Oculto'}
                              </span>
                            </td>
                            <td className="py-4 font-semibold text-indigo-600 italic">
                              {r.bossFeedback || 'Aguardando Envio/Avaliação'}
                            </td>
                            <td className="py-4 text-right pr-4 space-x-1.5 whitespace-nowrap font-sans">
                              <button
                                onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao?caseId=${r.caseId}`)}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px] cursor-pointer"
                              >
                                Ver Fluxo
                              </button>
                              <button
                                onClick={() => handleMarkRequestStatus(r, 'aprovado')}
                                className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-750 cursor-pointer"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleMarkRequestStatus(r, 'rejeitado')}
                                className="px-2 py-1 bg-red-50 text-red-700 rounded text-[10px] font-bold hover:bg-red-100 cursor-pointer"
                              >
                                Rejeitar
                              </button>
                              <button
                                onClick={() => handleMarkRequestStatus(r, 'complemento_solicitado')}
                                className="px-1.5 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold hover:bg-amber-100 cursor-pointer"
                              >
                                Complemento
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA 7: AGENDA */}
            {activeTab === 'agenda' && (
              <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3">Vínculo Cliente</th>
                      <th className="py-3">Título Evento</th>
                      <th className="py-3">Data</th>
                      <th className="py-3 font-semibold">Hora</th>
                      <th className="py-3">Local físico / Link video</th>
                      <th className="py-3">Agenda Responsável</th>
                      <th className="py-3 text-center">Visivel Portal</th>
                      <th className="py-3 text-right pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {displayedEvents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-400 font-semibold italic">Nenhum evento cadastrado para os filtros da Central de Controle.</td>
                      </tr>
                    ) : (
                      displayedEvents.map((e, index) => {
                        const clDisplay = getClientDisplayName(e.clientId);
                        return (
                          <tr key={e.id || index} className="hover:bg-gray-50/40">
                            <td className="py-4 px-4 font-mono font-bold">
                              <span className="px-2 py-0.5 bg-indigo-50/75 text-indigo-700 rounded text-[10px] font-black uppercase tracking-wider">
                                {e.type || 'Ato judicial'}
                              </span>
                            </td>
                            <td className="py-4">
                              <span className="font-bold text-gray-800 block">{clDisplay}</span>
                              <span className="text-[10px] text-gray-400 block font-mono">Case: {e.caseId}</span>
                            </td>
                            <td className="py-4">
                              <span className="font-extrabold text-gray-900 block">{e.title}</span>
                              {e.description && <span className="text-[10px] text-gray-400 block mt-0.5 leading-tight">{e.description}</span>}
                            </td>
                            <td className="py-4 font-mono">{e.date || 'À definir'}</td>
                            <td className="py-4 font-mono text-gray-500 font-bold">{e.time || '--:--'}</td>
                            <td className="py-4 text-indigo-600 font-mono truncate max-w-[150px]">{e.location || 'Sem link cadastrado'}</td>
                            <td className="py-4 font-semibold text-gray-500">{e.responsible || 'Coletivo escritório'}</td>
                            <td className="py-4 text-center">
                              <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold ${
                                e.visibleToClient !== false ? 'bg-indigo-50 text-indigo-650' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {e.visibleToClient !== false ? 'Sim' : 'Oculto'}
                              </span>
                            </td>
                            <td className="py-4 text-right pr-4 space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao?caseId=${e.caseId}`)}
                                className="px-2 py-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 font-bold rounded text-[10px]"
                              >
                                Ver Fluxo
                              </button>
                              <button
                                onClick={() => e.location && copyToClipboard(e.location, 'Link/Local copiado!')}
                                className="px-2 py-1 bg-white border border-gray-200 font-bold rounded text-[10px] disabled:opacity-50"
                                disabled={!e.location}
                              >
                                Copiar Link
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA 8: EDRP */}
            {activeTab === 'edrp' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'Todos os Casos do EDRP' },
                    { id: 'sem_estruturacao', label: 'Falta Tese/Fatos' },
                    { id: 'sem_delegacao', label: 'Falta Delegar Responsável' },
                    { id: 'aguardando_revisao', label: 'Estágio Revisão Ativo' },
                    { id: 'pronto_protocolo', label: 'Estágio Protocolo Ativo' },
                    { id: 'com_pendencia', label: 'Com Pendência Operacional' },
                    { id: 'protocolado', label: 'Protocolo Concluído' },
                    { id: 'controladoria', label: 'Estágio Controladoria Ativo' }
                  ].map((f) => {
                    const isSel = edrpFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setEdrpFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                          isSel ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Caso / Processo</th>
                        <th className="py-3">Cliente fiduciário</th>
                        <th className="py-3 text-center">Estruturação Tese</th>
                        <th className="py-3 text-center">Delegação Ativa</th>
                        <th className="py-3 text-center">Revisado?</th>
                        <th className="py-3 text-center">Protocolado?</th>
                        <th className="py-3 text-center">Todoist Integrado</th>
                        <th className="py-3 text-center">Painel Colaborador</th>
                        <th className="py-3 text-right pr-4">Ações Operacionais</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-mono">
                      {displayedEdrpCases.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-gray-400 italic font-sans">Nenhum caso elegível para este checklist de EDRP.</td>
                        </tr>
                      ) : (
                        displayedEdrpCases.map(ca => {
                          const clName = getClientDisplayName(ca.clientId);
                          const hasStructuring = !!(ca.structuring || ca.edrp?.structuring);
                          const hasDelegation = !!(ca.responsibleLawyer || ca.delegation?.responsible);
                          const isReviewed = ca.productionStage === 'protocolo' || ca.productionStage === 'controladoria' || ca.reviewApproved === true;
                          const isProtocoled = ca.statusInterno === 'protocolado' || ca.status === 'protocolado' || !!ca.protocolNumber;
                          const todoistIntegrity = ca.todoistConnected || ca.todoistActive ? 'Sim' : 'Não';
                          const staffCheck = ca.responsibleLawyer ? 'Ativo' : 'Vazio';

                          return (
                            <tr key={ca.id} className="hover:bg-gray-50/40">
                              <td className="py-4 px-4 font-sans font-extrabold text-gray-900 block mt-1">{ca.title}</td>
                              <td className="py-4 font-sans font-bold text-gray-500">{clName}</td>
                              <td className="py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hasStructuring ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {hasStructuring ? 'Preenchido' : 'Pendente'}
                                </span>
                              </td>
                              <td className="py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hasDelegation ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {hasDelegation ? 'Designado' : 'Pendente'}
                                </span>
                              </td>
                              <td className="py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isReviewed ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {isReviewed ? 'Aprovado' : 'Em revisão'}
                                </span>
                              </td>
                              <td className="py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isProtocoled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {isProtocoled ? 'Sim' : 'Aguardando'}
                                </span>
                              </td>
                              <td className="py-4 text-center font-bold text-[10px] text-gray-500">{todoistIntegrity}</td>
                              <td className="py-4 text-center font-bold text-[10px] text-gray-650 font-sans">{staffCheck}</td>
                              <td className="py-4 text-right pr-4 font-sans space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao?caseId=${ca.id}`)}
                                  className="px-2 py-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded text-[9px] font-bold text-gray-700 cursor-pointer"
                                >
                                  Retomar EDRP
                                </button>
                                <button
                                  onClick={() => navigate(`/boss-giffoni-clientes/portal-cliente-preview/${ca.clientId}`)}
                                  className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[9px] font-black cursor-pointer"
                                >
                                  Integridade
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 9: INTEGRIDADE */}
            {activeTab === 'integridade' && (
              <div className="space-y-6">
                
                {/* Deployment Recommendation Flag Banner */}
                <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
                  diag.statusGeral.includes('PRONTO') 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                    : 'bg-rose-50 border-rose-100 text-rose-900'
                }`}>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono opacity-80">Avaliação do Módulo</span>
                    <h3 className="text-xl font-black tracking-tight leading-none mb-1">{diag.statusGeral}</h3>
                    <p className="text-xs font-semibold leading-relaxed">
                      {diag.statusGeral === 'Não recomendado para deploy' 
                        ? 'Foram identificados um ou mais erros críticos de vinculação nas tabelas relacionais do sistema. Resolva os erros abaixo antes de publicar.'
                        : 'Sua infraestrutura de dados fáticos está completamente limpa de erros órfãos relacionais. Recomendado para deploy!'
                      }
                    </p>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      onClick={loadAllCollections}
                      className="px-4 py-2.5 bg-white font-bold rounded-xl text-xs text-gray-700 border border-gray-200 hover:bg-gray-50"
                    >
                      Auditar Novamente
                    </button>
                    <button
                      onClick={handleCopyResumo}
                      className="px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-xl text-xs"
                    >
                      Copiar Resumo
                    </button>
                  </div>
                </div>

                {/* Dashboard Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total de Clientes', val: clients.length, color: 'text-gray-900' },
                    { label: 'Total de Casos', val: cases.length, color: 'text-gray-900' },
                    { label: 'Casos em Produção', val: cases.filter(ca => ca.productionStatus === 'em_producao').length, color: 'text-indigo-600' },
                    { label: 'Casos com Pendências', val: cases.filter(ca => ca.productionStatus === 'com_pendencias').length, color: 'text-amber-600' },
                    { label: 'Casos Concluídos', val: cases.filter(ca => ca.productionStatus === 'concluido').length, color: 'text-emerald-700' },
                    { label: 'Casos Sem Slug', val: cases.filter(ca => !ca.clientSlug).length, color: 'text-rose-600' },
                    { label: 'Casos Sem clientId', val: cases.filter(ca => !ca.clientId).length, color: 'text-rose-600' },
                    { label: 'Finanças Órfãs', val: financials.filter(f => !f.caseId || !cases.some(ca => ca.id === f.caseId)).length, color: 'text-rose-600' }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 bg-white border border-gray-150 rounded-2xl text-center shadow-3xs">
                      <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">{stat.label}</span>
                      <h4 className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.val}</h4>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Critical Errors List */}
                  <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-3xs space-y-4">
                    <h4 className="font-extrabold text-sm tracking-tight text-gray-900 border-b border-gray-100 pb-2.5 flex items-center gap-2">
                      <XCircle size={16} className="text-red-500" />
                      <span>Erros Críticos Estruturais ({diag.criticalErrorsList.length})</span>
                    </h4>
                    
                    {diag.criticalErrorsList.length === 0 ? (
                      <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl text-center">
                        Nenhum erro estrutural crítico fático detectado! Tudo pronto.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                        {diag.criticalErrorsList.map((err, i) => (
                          <div key={i} className="p-3 bg-red-50 text-red-800 text-xs border border-red-100 rounded-xl leading-relaxed font-mono flex items-start gap-2">
                            <span>•</span>
                            <p className="flex-1">{err}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Warning Advisories List */}
                  <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-3xs space-y-4">
                    <h4 className="font-extrabold text-sm tracking-tight text-gray-900 border-b border-gray-100 pb-2.5 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      <span>Alertas de Pendências / Conectores ({diag.warningList.length})</span>
                    </h4>
                    
                    {diag.warningList.length === 0 ? (
                      <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl text-center">
                        Excelente! Sem alertas ou avisos de preenchimento.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                        {diag.warningList.map((war, i) => (
                          <div key={i} className="p-3 bg-amber-50/50 text-amber-900 text-xs border border-amber-100 rounded-xl leading-relaxed font-mono flex items-start gap-2">
                            <span>⚠</span>
                            <p className="flex-1">{war}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* Safety Warning dialog modal */}
      {safeDeleteWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-3xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md border border-gray-100 shadow-xl space-y-4 text-center">
            <ShieldAlert size={44} className="text-indigo-650 mx-auto" />
            <h3 className="font-black text-gray-950 text-base">Operação Bloqueada</h3>
            <p className="text-xs text-gray-650 font-bold leading-relaxed">
              {safeDeleteWarning}
            </p>
            <button
              onClick={() => setSafeDeleteWarning(null)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow"
            >
              Ciente da Operação
            </button>
          </div>
        </div>
      )}
    </BossLayout>
  );
}
