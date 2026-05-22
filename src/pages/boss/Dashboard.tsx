import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Plus, 
  Sliders, 
  Building2, 
  Settings, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle,
  Users,
  Activity,
  DollarSign,
  HelpCircle,
  FolderClosed,
  Clock,
  CheckCircle2,
  FileCheck2,
  CalendarCheck,
  Check
} from 'lucide-react';

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  neutral: "bg-gray-50 text-gray-700 border-gray-200"
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw fetched lists
  const [metrics, setMetrics] = useState({
    potentialClients: 0,
    activeClients: 0,
    casesInProduction: 0,
    casesOngoing: 0,
    casesWithPending: 0,
    casesCompleted: 0,
    receivedRevenue: 0,
    revenueToReceive: 0,
    pendingRequests: 0,
    futureEvents: 0
  });

  // Settings
  const [sectors, setSectors] = useState<any>(null);
  const [connectors, setConnectors] = useState<any>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Firestore datasets parallelized with safe individual error handlers
      const [
        clientsSnap,
        casesSnap,
        financialsSnap,
        infoSnap,
        evidenceSnap,
        eventsSnap,
        sectorsSnap,
        connectorsSnap
      ] = await Promise.all([
        getDocs(collection(db, 'clients')).catch(err => {
          console.warn("Aviso ao buscar 'clients' do Firestore:", err);
          return { docs: [] } as any;
        }),
        getDocs(collection(db, 'cases')).catch(err => {
          console.warn("Aviso ao buscar 'cases' do Firestore:", err);
          return { docs: [] } as any;
        }),
        getDocs(collection(db, 'caseFinancials')).catch(err => {
          console.warn("Aviso ao buscar 'caseFinancials' do Firestore:", err);
          return { docs: [] } as any;
        }),
        getDocs(collection(db, 'caseInformationRequests')).catch(err => {
          console.warn("Aviso ao buscar 'caseInformationRequests' do Firestore:", err);
          return { docs: [] } as any;
        }),
        getDocs(collection(db, 'caseEvidenceRequests')).catch(err => {
          console.warn("Aviso ao buscar 'caseEvidenceRequests' do Firestore:", err);
          return { docs: [] } as any;
        }),
        getDocs(collection(db, 'caseEvents')).catch(err => {
          console.warn("Aviso ao buscar 'caseEvents' do Firestore:", err);
          return { docs: [] } as any;
        }),
        getDoc(doc(db, 'settings', 'sectors')).catch(err => {
          console.warn("Aviso ao buscar 'settings/sectors' do Firestore:", err);
          return { exists: () => false, data: () => null } as any;
        }),
        getDoc(doc(db, 'settings', 'connectors')).catch(err => {
          console.warn("Aviso ao buscar 'settings/connectors' do Firestore:", err);
          return { exists: () => false, data: () => null } as any;
        })
      ]);

      const clients = clientsSnap.docs ? clientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)) : [];
      const cases = casesSnap.docs ? casesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)) : [];
      const caseFinancials = financialsSnap.docs ? financialsSnap.docs.map(d => d.data() as any) : [];
      const infoReqs = infoSnap.docs ? infoSnap.docs.map(d => d.data() as any) : [];
      const evidenceReqs = evidenceSnap.docs ? evidenceSnap.docs.map(d => d.data() as any) : [];
      const caseEvents = eventsSnap.docs ? eventsSnap.docs.map(d => d.data() as any) : [];

      if (sectorsSnap.exists()) {
        setSectors(sectorsSnap.data());
      } else {
        setSectors(null);
      }

      if (connectorsSnap.exists()) {
        setConnectors(connectorsSnap.data());
      } else {
        setConnectors(null);
      }

      // Compute Metric 1 — Clientes em potencial
      const potentialClients = clients.filter(c => {
        const portalStatus = c.portalStatus || 'nao_criado';
        const hasNoPortal = portalStatus === "nao_criado";
        const hasNoSlug = !c.slug || c.slug.trim() === '';
        const hasNoClientPortals = !c.clientPortals || (Array.isArray(c.clientPortals) && c.clientPortals.length === 0);
        const linkedCases = cases.filter(caseObj => caseObj.clientId === c.clientId || caseObj.clientId === c.id);
        const hasNoLinkedCase = linkedCases.length === 0;
        const isIncomplete = c.cadastroIncompleto === true;

        return hasNoPortal || hasNoSlug || hasNoClientPortals || hasNoLinkedCase || isIncomplete;
      }).length;

      // Compute Metric 2 — Clientes ativos
      const activeClients = clients.filter(c => c.active === true).length;

      // Compute Metric 3 — Casos em produção
      const casesInProduction = cases.filter(c => c.productionStatus === 'em_producao').length;

      // Compute Metric 4 — Casos em andamento
      const casesOngoing = cases.filter(c => {
        const status = c.status || '';
        const prodStatus = c.productionStatus || '';
        return status !== 'arquivado' && prodStatus !== 'concluido' && prodStatus !== 'concluido_com_ressalvas';
      }).length;

      // Compute Metric 5 — Casos com pendência
      const casesWithPending = cases.filter(c => {
        const prodStatus = c.productionStatus || '';
        const statusInt = c.statusInterno || '';
        const integrityS = c.integrityStatus || '';
        return (
          prodStatus === 'com_pendencias' ||
          statusInt === 'Com pendência' ||
          statusInt === 'Com pendências' ||
          integrityS === 'com_pendencias' ||
          integrityS === 'critico'
        );
      }).length;

      // Compute Metric 6 — Casos concluídos
      const casesCompleted = cases.filter(c => {
        const p = c.productionStatus || '';
        return p === 'concluido' || p === 'concluido_com_ressalvas';
      }).length;

      // Compute Metric 7 — Faturamento recebido
      const receivedRevenue = caseFinancials.filter(f => {
        const fs = f.financialStatus || '';
        const ps = f.paymentStatus || '';
        const status = f.status || '';
        return fs === 'pago' || ps === 'pago' || status === 'pago';
      }).reduce((sum, f) => {
        const val = parseFloat(f.value || f.amount || f.valorTotal || 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      // Compute Metric 8 — Faturamento a receber
      const revenueToReceive = caseFinancials.filter(f => {
        const statusLower = (f.status || f.financialStatus || f.paymentStatus || '').toLowerCase();
        const validStatusList = [
          'pendente', 'aberto',
          'aguardando_pagamento', 'aguardando', 'aguardando pagamento',
          'parcialmente_pago', 'parcial', 'parcialmente pago',
          'em_atraso', 'atrasado', 'em atraso',
          'aguardando_webhook'
        ];
        return validStatusList.includes(statusLower);
      }).reduce((sum, f) => {
        const val = parseFloat(f.value || f.amount || f.valorTotal || 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      // Compute Metric 9 — Solicitações pendentes
      const pendingRequests = 
        infoReqs.filter(r => ['pendente', 'complemento_solicitado', 'em_analise'].includes(r.status || '')).length +
        evidenceReqs.filter(r => ['pendente', 'complemento_solicitado', 'em_analise'].includes(r.status || '')).length;

      // Compute Metric 10 — Audiências/perícias futuras
      const futureEvents = caseEvents.filter(e => {
        const typeLower = (e.type || '').toLowerCase();
        const isTargetType = typeLower.includes('audiência') || typeLower.includes('audiencia') || typeLower.includes('perícia') || typeLower.includes('pericia');
        const isNotCancelled = (e.status || '').toLowerCase() !== 'cancelado';
        
        const todayStr = new Date().toISOString().split('T')[0];
        const eventDate = e.date || e.dateTime || '';
        const isFutureOrToday = eventDate ? eventDate >= todayStr : false;

        return isTargetType && isNotCancelled && isFutureOrToday;
      }).length;

      setMetrics({
        potentialClients,
        activeClients,
        casesInProduction,
        casesOngoing,
        casesWithPending,
        casesCompleted,
        receivedRevenue,
        revenueToReceive,
        pendingRequests,
        futureEvents
      });

    } catch (err: any) {
      console.error('Erro ao ler métricas do painel:', err);
      setError('Incapaz de ler as coleções estruturadas no Firestore. Verifique as coleções criadas no painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="boss-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Painel de Métricas Corporativas</h1>
          <p className="text-gray-500 mt-1 text-sm">Informações consolidadas em tempo real das operações e faturamento.</p>
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white border border-gray-250 hover:bg-gray-50 text-gray-850 text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-3xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-150 rounded-2xl text-red-950 text-sm flex gap-3 items-center">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="font-semibold leading-relaxed">{error}</p>
        </div>
      )}

      {/* 10 CORE METRICS GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl gap-2 font-mono">
          <div className="w-8 h-8 border-4 border-gray-100 border-t-gray-950 rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 uppercase font-bold tracking-wider">Calculando indicadores...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Clientes Potenciais</span>
            <div className="text-2xl font-black text-gray-900 mt-1">{metrics.potentialClients}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Cadastros s/ portal ou sem caso</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Clientes Ativos</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{metrics.activeClients}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Status regular de acesso</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Casos em Produção</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{metrics.casesInProduction}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Fase ativa do fluxo</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Casos em Andamento</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">{metrics.casesOngoing}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Não arquivados nem finalizados</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Casos c/ Pendência</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{metrics.casesWithPending}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Erros ou pendente de auditoria</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Casos Concluídos</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.casesCompleted}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Sincronizados com ressalva ou aptos</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Faturamento Recebido</span>
            <div className="text-xl font-black text-emerald-650 mt-1 tracking-tight">{formatBRL(metrics.receivedRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Honorários pagos consolidados</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Faturamento a Receber</span>
            <div className="text-xl font-black text-amber-600 mt-1 tracking-tight">{formatBRL(metrics.revenueToReceive)}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Em aberto / Ativos sandbox</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Solicitações Ativas</span>
            <div className="text-2xl font-black text-purple-650 mt-1">{metrics.pendingRequests}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Provas e dados aguardando cliente</p>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider font-sans">Audiências/Perícias</span>
            <div className="text-2xl font-black text-neutral-900 mt-1">{metrics.futureEvents}</div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Agendamentos futuros ativos</p>
          </div>

        </div>
      )}

      {/* QUICK ACTIONS / SHORTCUTS GRID */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider">Atalhos Operacionais Rápidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <button 
            onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao/cadastro')}
            className="flex items-center justify-between p-5 rounded-2xl border border-gray-150 bg-white text-left hover:border-gray-300 transition-all group shadow-3xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 leading-tight">Novo Fluxo de Produção</h4>
                <p className="text-xs text-gray-500 mt-0.5">Iniciar cadastro e tese</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-gray-400 transform group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => navigate('/boss-giffoni-clientes/central-controle')}
            className="flex items-center justify-between p-5 rounded-2xl border border-gray-150 bg-white text-left hover:border-gray-300 transition-all group shadow-3xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                <Sliders size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 leading-tight">Central de Controle</h4>
                <p className="text-xs text-gray-500 mt-0.5">Controladoria e logins</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-gray-400 transform group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => navigate('/boss-giffoni-clientes/setores')}
            className="flex items-center justify-between p-5 rounded-2xl border border-gray-150 bg-white text-left hover:border-gray-300 transition-all group shadow-3xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 leading-tight">Setores do Escritório</h4>
                <p className="text-xs text-gray-500 mt-0.5">Departamentos e painéis</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-gray-400 transform group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => navigate('/boss-giffoni-clientes/configuracoes')}
            className="flex items-center justify-between p-5 rounded-2xl border border-gray-150 bg-white text-left hover:border-gray-300 transition-all group shadow-3xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                <Settings size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 leading-tight">Configurações</h4>
                <p className="text-xs text-gray-500 mt-0.5">Parâmetros de sistema</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-gray-400 transform group-hover:translate-x-1 transition-transform" />
          </button>

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECTORS BLOCK */}
        <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider">Setores Externos Mapeados</h3>
              <span className="text-xs font-mono px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500">settings/sectors</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Status resumido dos links dos departamentos integrados.</p>
 
            <div className="mt-4 space-y-2">
              {sectors && Object.keys(sectors).filter(k => sectors[k] && sectors[k].trim() !== '').length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.keys(sectors).map((k) => {
                    const l = sectors[k];
                    if (!l || l.trim() === '') return null;
                    return (
                      <div key={k} className="flex items-center justify-between p-2.5 bg-gray-50/50 rounded-xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-700 capitalize">{k}</span>
                        <a 
                          href={l}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 hover:bg-emerald-100 transition-all"
                        >
                          <span>Ativo</span>
                          <ArrowRight size={10} />
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center text-gray-550">
                  <p className="text-xs font-bold font-mono">Setores ainda não configurados.</p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/boss-giffoni-clientes/setores')}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-800 text-sm font-bold py-2.5 rounded-xl border border-gray-150 transition-all"
          >
            <span>Gerenciar Setores</span>
            <ArrowRight size={12} />
          </button>
        </div>
 
        {/* CONNECTORS BLOCK */}
        <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider">Módulos & Conectores Digitais</h3>
              <span className="text-xs font-mono px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500">settings/connectors</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-normal">Verificação de integridade das integrações para o Portal.</p>
 
            <div className="mt-4">
              {connectors ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'stripe', label: 'Stripe' },
                    { key: 'asaas', label: 'Asaas' },
                    { key: 'drive', label: 'Google Drive' },
                    { key: 'todoist', label: 'Todoist' },
                    { key: 'calendar', label: 'Google Agenda' },
                    { key: 'gmail', label: 'Gmail' }
                  ].map((item) => {
                    const isConfigured = connectors[item.key] && (connectors[item.key].active === true || connectors[item.key].configured === true || connectors[item.key].value || Object.keys(connectors[item.key]).length > 0);
                    return (
                      <div key={item.key} className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-100 flex flex-col justify-between gap-1.5">
                        <span className="text-sm font-bold text-gray-700 truncate">{item.label}</span>
                        <div>
                          {isConfigured ? (
                            <span className="inline-flex text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">Ativo</span>
                          ) : (
                            <span className="inline-flex text-xs font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Pendente</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center text-gray-550">
                  <p className="text-xs font-bold font-mono">Conectores ainda não configurados.</p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/boss-giffoni-clientes/configuracoes')}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-800 text-sm font-bold py-2.5 rounded-xl border border-gray-150 transition-all font-sans"
          >
            <span>Configurar Conectores</span>
            <ArrowRight size={12} />
          </button>
        </div>
 
      </div>

    </div>
  );
}
