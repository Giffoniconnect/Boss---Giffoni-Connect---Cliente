import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { BossLayout } from '../../../components/Layout';
import { 
  UserPlus, 
  ArrowLeft, 
  Search,
  Sparkles,
  ClipboardList,
  Layers,
  FileText,
  FileQuestion,
  ShieldCheck,
  CreditCard,
  Lock,
  Eye,
  CheckSquare,
  Cpu,
  HeartPulse,
  Cloud,
  FileDigit,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function PendenciasFluxo() {
  const navigate = useNavigate();

  // Load cases and incomplete clients from firebase
  const [casesList, setCasesList] = useState<any[]>([]);
  const [incompleteClients, setIncompleteClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Search filter
  const [resumeSearchQuery, setResumeSearchQuery] = useState('');

  // Selected category state
  const [selectedCategory, setSelectedCategory] = useState<string>('cadastro');

  // Load pending/active flows
  useEffect(() => {
    async function fetchProductionFlows() {
      setLoading(true);
      try {
        const snapshots = await getDocs(collection(db, 'cases'));
        const clSnap = await getDocs(collection(db, 'clients'));
        
        const allClients: any[] = clSnap.docs.map(d => ({
          clientId: d.id,
          ...d.data()
        }));

        const list: any[] = [];
        snapshots.forEach((docSnap) => {
          const data = docSnap.data();
          const matchedCli = allClients.find(cl => cl.clientId === data.clientId);
          
          let clientName = 'Cliente não identificado';
          if (matchedCli) {
            clientName = matchedCli.type === 'PF'
              ? (matchedCli.pfDadosPessoais?.pf_nomeCompleto || matchedCli.pfData?.pf_nomeCompleto || 'Cliente PF')
              : (matchedCli.pjDadosEmpresa?.pj_razaoSocial || matchedCli.pjData?.pj_razaoSocial || 'Cliente PJ');
          }

          list.push({
            id: docSnap.id,
            clientName,
            ...data
          });
        });

        // Filter for active/incomplete cases in production
        const activeCases = list.filter((c: any) => {
          return c.status === 'rascunho' || ['em_producao', 'com_pendencias', 'pausado', 'devolvido'].includes(c.productionStatus) || !c.productionStatus;
        });

        // Filter for incomplete clients
        const incomplete: any[] = [];
        allClients.forEach((cli) => {
          const missingFields = cli.missingFields || [];
          const isIncomplete = 
            cli.cadastroIncompleto === true ||
            cli.portalStatus === 'nao_criado' ||
            (cli.active === false && missingFields.length > 0);

          if (isIncomplete) {
            incomplete.push({
              id: cli.clientId,
              name: cli.type === 'PF'
                ? (cli.pfDadosPessoais?.pf_nomeCompleto || cli.pfData?.pf_nomeCompleto || 'Cliente PF')
                : (cli.pjDadosEmpresa?.pj_razaoSocial || cli.pjData?.pj_razaoSocial || 'Cliente PJ'),
              ...cli
            });
          }
        });

        setCasesList(activeCases);
        setIncompleteClients(incomplete);
      } catch (err) {
        console.error('Error fetching production state:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProductionFlows();
  }, [retryCount]);

  const handleContinueCase = (c: any) => {
    const routeStage = c.productionStage || 'dados-caso';
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

  const handleEditIncompleteClient = (clientId: string) => {
    navigate(`/boss-giffoni-clientes/fluxo-producao/cadastro?editClientId=${clientId}`);
  };

  // Map 11 specific categories of pendencies
  const categoriesMetadata = [
    {
      key: 'cadastro',
      label: 'Pendências de Cadastro',
      description: 'Qualificação fática e cadastro do contratante pendente de preenchimento ou aprovação.',
      icon: UserPlus,
      color: 'border-blue-100 hover:border-blue-400',
      activeColor: 'bg-blue-50/70 border-blue-500 text-blue-900',
      tagColor: 'bg-blue-100 text-blue-800'
    },
    {
      key: 'documentos',
      label: 'Pendências de Documentos',
      description: 'Envio de contratos, procurações ou comprovantes pessoais pendentes na pasta.',
      icon: FileDigit,
      color: 'border-amber-100 hover:border-amber-400',
      activeColor: 'bg-amber-50/70 border-amber-500 text-amber-900',
      tagColor: 'bg-amber-100 text-amber-800'
    },
    {
      key: 'provas',
      label: 'Pendências de Provas',
      description: 'Anexação de relatórios fáticos, certidões públicas ou histórico probatório exigido.',
      icon: CheckSquare,
      color: 'border-emerald-100 hover:border-emerald-400',
      activeColor: 'bg-emerald-50/70 border-emerald-500 text-emerald-900',
      tagColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      key: 'informacoes',
      label: 'Pendências de Informações Complementares',
      description: 'Esclarecimento adicional, datas chaves ou respostas a questionamentos (5W2H).',
      icon: FileQuestion,
      color: 'border-indigo-100 hover:border-indigo-400',
      activeColor: 'bg-indigo-50/70 border-indigo-500 text-indigo-900',
      tagColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      key: 'prazo',
      label: 'Pendências de Prazo',
      description: 'Vencimentos contratuais, prazos peremptórios legais ou urgência de distribuição.',
      icon: Clock,
      color: 'border-red-100 hover:border-red-400',
      activeColor: 'bg-red-50/70 border-red-500 text-red-900',
      tagColor: 'bg-red-100 text-red-800'
    },
    {
      key: 'pericia',
      label: 'Pendências de Perícia',
      description: 'Laudos de assistência, relatórios de controle de tempo, peritos ou cálculos específicos.',
      icon: Layers,
      color: 'border-teal-100 hover:border-teal-400',
      activeColor: 'bg-teal-50/70 border-teal-500 text-teal-900',
      tagColor: 'bg-teal-100 text-teal-800'
    },
    {
      key: 'audiencia',
      label: 'Pendências de Audiência',
      description: 'Sincronização de conciliações, instruções agendadas pelo setor de controladoria.',
      icon: Calendar,
      color: 'border-pink-100 hover:border-pink-400',
      activeColor: 'bg-pink-50/70 border-pink-500 text-pink-900',
      tagColor: 'bg-pink-100 text-pink-800'
    },
    {
      key: 'financeiro',
      label: 'Pendências Financeiras',
      description: 'Faturamento de custas, aprovação de guias, parcelamentos ou honorários.',
      icon: CreditCard,
      color: 'border-rose-100 hover:border-rose-400',
      activeColor: 'bg-rose-50/70 border-rose-500 text-rose-900',
      tagColor: 'bg-rose-100 text-rose-800'
    },
    {
      key: 'revisao',
      label: 'Pendências de Revisão',
      description: 'Revisão técnica de petição inicial, dados mestre e formatação por mentor.',
      icon: Eye,
      color: 'border-cyan-100 hover:border-cyan-400',
      activeColor: 'bg-cyan-50/70 border-cyan-500 text-cyan-900',
      tagColor: 'bg-cyan-100 text-cyan-800'
    },
    {
      key: 'protocolo',
      label: 'Pendências de Protocolo',
      description: 'Distribuição final da peça, protocolo judicial e fornecimento do número de processo.',
      icon: ShieldCheck,
      color: 'border-sky-100 hover:border-sky-400',
      activeColor: 'bg-sky-50/70 border-sky-500 text-sky-900',
      tagColor: 'bg-sky-100 text-sky-800'
    },
    {
      key: 'controladoria',
      label: 'Pendências de Controladoria',
      description: 'Vínculos sistêmicos finais, integrações no Todoist e transição para o Tribunal.',
      icon: Cpu,
      color: 'border-purple-100 hover:border-purple-400',
      activeColor: 'bg-purple-50/70 border-purple-500 text-purple-900',
      tagColor: 'bg-purple-100 text-purple-800'
    }
  ];

  // Populate dynamic items grouped by the 11 categories
  const categoriesMap = useMemo(() => {
    const map: Record<string, any[]> = {
      cadastro: [],
      documentos: [],
      provas: [],
      informacoes: [],
      prazo: [],
      pericia: [],
      audiencia: [],
      financeiro: [],
      revisao: [],
      protocolo: [],
      controladoria: []
    };

    // 1. Incomplete clients map to cadastro
    map.cadastro = incompleteClients.map(cli => ({
      ...cli,
      type: 'client',
      title: cli.name,
      subtitle: `Slug: /${cli.slug}`,
      stageLabel: 'Cadastro do Cliente',
      badge: 'Incompleto',
      badgeStyle: 'bg-red-50 text-red-700 border-red-150',
      go: () => handleEditIncompleteClient(cli.id)
    }));

    // 2. Map active cases into respective categories
    casesList.forEach(c => {
      const s = (c.productionStage || '').toLowerCase();
      const clientName = c.clientName || 'Contratante';

      const caseItem = {
        ...c,
        type: 'case',
        subtitle: `Cliente: ${clientName}`,
        stageLabel: `Etapa: ${c.productionStage || 'Dados Inicial'}`,
        badge: c.status === 'rascunho' ? 'Rascunho' : 'Ativo',
        badgeStyle: c.status === 'rascunho' ? 'bg-amber-50 text-amber-700 border-amber-150' : 'bg-emerald-50 text-emerald-700 border-emerald-150',
        go: () => handleContinueCase(c)
      };

      // Documentos pendentes
      if (!s || s === 'dados-caso' || s === 'dadoscaso' || c.pendingDocs || c.missingDocs) {
        map.documentos.push({ ...caseItem, sectionLabel: 'Documentos Pendentes' });
      }
      
      // Provas pendentes
      if (s === 'solicitacoes-provas' || s === 'solicitacoesprovas' || s === 'coleta_provas') {
        map.provas.push({ ...caseItem, sectionLabel: 'Coleta de Provas' });
      }

      // Informações complementary pendentes
      if (s === 'solicitacoes-informacoes' || s === 'solicitacoessextra' || s === 'solicitacoesinformacoes' || s === 'coleta_informacoes') {
        map.informacoes.push({ ...caseItem, sectionLabel: 'Informações pendentes' });
      }

      // Prazo pendências
      if (c.priority === 'urgente' || c.deadline || s === 'protocolo' || c.urgent || c.pendingDeadline) {
        map.prazo.push({ ...caseItem, sectionLabel: 'Prazo Limite' });
      }

      // Perícia pendências
      if (s === 'edrp' || c.pericia || c.periciaStatus || s === 'relatorio-integridade') {
        map.pericia.push({ ...caseItem, sectionLabel: 'Cálculo/Perito' });
      }

      // Audiência pendências
      if (s === 'controladoria' || c.audiencia || c.audienciaStatus) {
        map.audiencia.push({ ...caseItem, sectionLabel: 'Sincronização de Data' });
      }

      // Financeiro pendências
      if (s === 'financeiro' || c.financialPending || c.financeiro) {
        map.financeiro.push({ ...caseItem, sectionLabel: 'Validação Faturamento' });
      }

      // Revisão pendências
      if (s === 'revisao' || s === 'revisaoteconica' || s === 'revisao-tecnica') {
        map.revisao.push({ ...caseItem, sectionLabel: 'Revisão Técnica' });
      }

      // Protocolo pendências
      if (s === 'protocolo') {
        map.protocolo.push({ ...caseItem, sectionLabel: 'Distribuição Mapeada' });
      }

      // Controladoria pendências
      if (s === 'controladoria') {
        map.controladoria.push({ ...caseItem, sectionLabel: 'Integrações Ativas' });
      }
    });

    // Fallback unmapped cases
    casesList.forEach(c => {
      const hasDirectCategory = Object.keys(map).some(key => {
        if (key === 'cadastro') return false;
        return map[key].some(item => item.id === c.id);
      });

      if (!hasDirectCategory) {
        const clientName = c.clientName || 'Contratante';
        map.documentos.push({
          ...c,
          type: 'case',
          subtitle: `Cliente: ${clientName}`,
          stageLabel: `Atual: ${c.productionStage || 'Início'}`,
          badge: 'Automático',
          badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200',
          go: () => handleContinueCase(c),
          sectionLabel: 'Triagem Inicial'
        });
      }
    });

    return map;
  }, [casesList, incompleteClients]);

  // Apply search query filters
  const filteredCategoriesMap = useMemo(() => {
    const query = resumeSearchQuery.toLowerCase().trim();
    if (!query) return categoriesMap;

    const filtered: Record<string, any[]> = {};
    Object.keys(categoriesMap).forEach(key => {
      filtered[key] = categoriesMap[key].filter(item => {
        const title = (item.title || item.name || '').toLowerCase();
        const subtitle = (item.subtitle || '').toLowerCase();
        const stage = (item.stageLabel || '').toLowerCase();
        return title.includes(query) || subtitle.includes(query) || stage.includes(query);
      });
    });

    return filtered;
  }, [categoriesMap, resumeSearchQuery]);

  // Handle select fallback
  useEffect(() => {
    const itemsInSelected = (filteredCategoriesMap[selectedCategory] as any[])?.length || 0;
    if (itemsInSelected === 0) {
      const found = Object.keys(filteredCategoriesMap).find(k => (filteredCategoriesMap[k] as any[]).length > 0);
      if (found) {
        setSelectedCategory(found);
      }
    }
  }, [filteredCategoriesMap, selectedCategory]);

  // Total pendencies across categories
  const totalPendenciesCount = useMemo(() => {
    return Object.values(categoriesMap).reduce((acc: number, list: any) => acc + (list?.length || 0), 0);
  }, [categoriesMap]);

  return (
    <BossLayout>
      <div id="fluxo-producao-pendencias-v2" className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 md:px-0">
        
        {/* TOP HEADER CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
              className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-600 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              title="Voltar para Centro de Produção"
              id="back-to-production-center"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Painel de Pendências</h1>
                <span className="px-2 py-0.5 bg-orange-100 border border-orange-200 text-orange-900 rounded-md text-[10px] font-black uppercase tracking-wider">
                  {totalPendenciesCount} Pendente(s)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Retomada estratégica de fluxos com relatórios unificados para as 11 divisões produtivas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRetryCount(prev => prev + 1)}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-205 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Minerar Firebase
            </button>
          </div>
        </div>

        {/* DETAILED PENDENCIES REPORT STRUCTURE */}
        <div className="bg-white border border-gray-150 rounded-[2.5rem] p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                Instruções de Conformidade & Retomada
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Clique nas categorias abaixo para filtrar e usar a ação de retomada fática por caso.
              </p>
            </div>

            {/* SEARCH */}
            <div className="relative min-w-[260px]">
              <input
                type="text"
                placeholder="Pesquisar pendência..."
                value={resumeSearchQuery}
                onChange={(e) => setResumeSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-150 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-400 focus:bg-white transition-all text-gray-800"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-orange-500" size={28} />
              <p className="text-xs font-mono text-gray-400">Varrendo estruturas de casos e clientes no Firestore...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COLUMN: THE 11 PRIORITIZED DIVISIONS */}
              <div className="lg:col-span-6 space-y-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Divisões do Fluxo Produtivo
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoriesMetadata.map((cat) => {
                    const CatIcon = cat.icon;
                    const itemsList = filteredCategoriesMap[cat.key] || [];
                    const hasItems = itemsList.length > 0;
                    const isSelected = selectedCategory === cat.key;

                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`text-left border rounded-2xl p-3.5 transition-all text-xs flex items-center justify-between gap-3 cursor-pointer group hover:shadow-xs outline-none ${
                          isSelected ? cat.activeColor : 'bg-gray-50/40 hover:bg-white border-gray-150 text-gray-700'
                        }`}
                        id={`category-btn-${cat.key}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white shadow-xs text-orange-600' : 'bg-gray-100 text-gray-500 group-hover:text-gray-900 group-hover:bg-gray-200'
                          }`}>
                            <CatIcon size={15} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold truncate max-w-[130px] text-gray-900">{cat.label}</h5>
                            <p className="text-[9.5px] text-gray-400 truncate mt-0.5">{cat.description}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            hasItems 
                              ? (isSelected ? 'bg-orange-600 text-white font-extrabold' : 'bg-gray-200 text-gray-700 font-extrabold')
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {itemsList.length}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: PENDECIES DATA CONTAINER */}
              <div className="lg:col-span-6 bg-gray-50/50 border border-gray-150 rounded-2xl p-5 flex flex-col justify-between min-h-[420px]">
                <div>
                  
                  {/* Selected Category Metadata */}
                  {(() => {
                    const currentMeta = categoriesMetadata.find(m => m.key === selectedCategory);
                    if (!currentMeta) return null;
                    const MetaIcon = currentMeta.icon;

                    return (
                      <div className="border-b border-gray-200 pb-3.5 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-800 shrink-0">
                            <MetaIcon size={13} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-gray-905 text-xs uppercase tracking-tight">
                              {currentMeta.label}
                            </h4>
                            <p className="text-[10px] text-gray-400 leading-tight">
                              {currentMeta.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* List of active items */}
                  {(() => {
                    const activeList = filteredCategoriesMap[selectedCategory] || [];
                    if (activeList.length === 0) {
                      return (
                        <div className="py-20 text-center space-y-2">
                          <AlertTriangle className="mx-auto text-gray-300" size={24} />
                          <p className="text-xs font-bold text-gray-500">Nenhuma pendência ativa para esta divisão.</p>
                          <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                            Tudo regularizado de acordo com o filtro. Selecione outra divisão produtiva para inspecionar.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {activeList.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-4 hover:border-gray-200 transition-all hover:shadow-xs"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold border rounded px-1.5 py-0.2 ${item.badgeStyle}`}>
                                  {item.badge}
                                </span>
                                {item.sectionLabel && (
                                  <span className="text-[9px] font-semibold text-gray-400 uppercase font-mono">
                                    • {item.sectionLabel}
                                  </span>
                                )}
                              </div>
                              <h5 className="font-extrabold text-xs text-gray-900 truncate uppercase mt-1">
                                {item.title || 'Incompleto'}
                              </h5>
                              <p className="text-[10px] text-gray-500 truncate">{item.subtitle}</p>
                            </div>

                            <button
                              type="button"
                              onClick={item.go}
                              className="shrink-0 bg-gray-905 hover:bg-black text-white hover:scale-103 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-3xs"
                              id={`resume-action-${item.id}`}
                            >
                              Retomar
                              <ChevronRight size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                </div>

                <div className="pt-4 border-t border-gray-200 text-[10px] text-gray-400 flex items-center gap-1.5 font-mono justify-end">
                  <span>Módulo BOSS de Coerência Processual</span>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </BossLayout>
  );
}
