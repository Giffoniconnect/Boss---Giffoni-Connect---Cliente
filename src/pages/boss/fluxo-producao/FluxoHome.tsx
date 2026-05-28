import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { BossLayout } from '../../../components/Layout';
import { 
  UserPlus, 
  Briefcase, 
  ArrowRight, 
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
import { flowSteps } from './utils/flowSteps';
import { motion } from 'motion/react';

export default function FluxoHome() {
  const navigate = useNavigate();

  // Load cases and incomplete clients from firebase to populate the "Continuar Fluxo" dashboard
  const [casesList, setCasesList] = useState<any[]>([]);
  const [incompleteClients, setIncompleteClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Search filter inside the pendency panel
  const [resumeSearchQuery, setResumeSearchQuery] = useState('');

  // Selected pendency category
  const [selectedCategory, setSelectedCategory] = useState<string>('cadastro');

  // Load pending/active flows for the continuation report
  useEffect(() => {
    async function fetchProductionFlows() {
      setLoading(true);
      try {
        // Query cases
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

  // Smooth scrolling directly to the "Painel de Pendências"
  const handleScrollToPendencies = () => {
    const element = document.getElementById('painel-pendencias');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Define the 4 Main Entry Cards (Requested by User)
  const entryCards = [
    {
      title: '1. Novo Cliente',
      description: 'Para pessoa que nunca foi cliente do escritório, não possui cadastro e não possui caso no sistema.',
      icon: UserPlus,
      color: 'blue',
      action: () => navigate('/boss-giffoni-clientes/fluxo-producao/cadastro?path=novo-cliente'),
      actionLabel: 'Preencher Ficha Inicial'
    },
    {
      title: '2. Já Sou Cliente',
      description: 'Para cliente já cadastrado no novo sistema que deseja cadastrar novo caso, processo em andamento ou novo serviço.',
      icon: Briefcase,
      color: 'purple',
      action: () => navigate('/boss-giffoni-clientes/fluxo-producao/cadastro?path=novo-caso'),
      actionLabel: 'Criar Novo Caso'
    },
    {
      title: '3. Continuar Fluxo',
      description: 'Relatório de pendências unificadas para resolver, atualizar ou retomar etapas pendentes.',
      icon: ClipboardList,
      color: 'orange',
      action: handleScrollToPendencies,
      actionLabel: 'Exibir Pendências'
    },
    {
      title: '4. Recadastramento',
      description: 'Para cliente antigo do escritório, anterior à data de corte, que existe no Google Drive/Docs, mas precisa de adequação.',
      icon: Cloud,
      color: 'cyan',
      action: () => navigate('/boss-giffoni-clientes/fluxo-producao/recadastramento'),
      actionLabel: 'Cadastrar Legado'
    }
  ];

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

  // Populate actual items from Firestore dynamically across these 11 categories
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

    // 1. Cadastro is filled with incomplete clients
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

    // 2. Map existing active cases cleanly into corresponding categories
    casesList.forEach(c => {
      const s = (c.productionStage || '').toLowerCase();
      const clientName = c.clientName || 'Contratante';

      // General case layout
      const caseItem = {
        ...c,
        type: 'case',
        subtitle: `Cliente: ${clientName}`,
        stageLabel: `Atual: ${c.productionStage || 'Dados Inicial'}`,
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

      // Informações Complementares pendentes
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

    // Fallback: distribute cases that had no direct matches so user can locate them
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

  // Search input query inside categories map
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

  // Fallback to select first category with items if currently selected has zero
  useEffect(() => {
    const itemsInSelected = filteredCategoriesMap[selectedCategory]?.length || 0;
    if (itemsInSelected === 0) {
      // Find another active category
      const found = Object.keys(filteredCategoriesMap).find(k => filteredCategoriesMap[k].length > 0);
      if (found) {
        setSelectedCategory(found);
      }
    }
  }, [filteredCategoriesMap, selectedCategory]);

  // Icon selector helper
  const getStepIcon = (id: string) => {
    switch(id) {
      case 'cadastro': return ClipboardList;
      case 'tipo-producao': return Layers;
      case 'dados-caso': return FileText;
      case 'solicitacoes-informacoes': return FileQuestion;
      case 'solicitacoes-provas': return CheckSquare;
      case 'financeiro': return CreditCard;
      case 'edrp': return Lock;
      case 'revisao': return Eye;
      case 'protocolo': return ShieldCheck;
      case 'novo-caso': return ShieldCheck;
      case 'controladoria': return Cpu;
      case 'relatorio-integridade': return HeartPulse;
      case 'recadastramento': return Cloud;
      default: return Sparkles;
    }
  };

  const getStepColorBg = (id: string) => {
    switch(id) {
      case 'cadastro': return 'bg-blue-50 text-blue-600';
      case 'tipo-producao': return 'bg-purple-50 text-purple-600';
      case 'dados-caso': return 'bg-amber-50 text-amber-600';
      case 'solicitacoes-informacoes': return 'bg-teal-50 text-teal-600';
      case 'solicitacoes-provas': return 'bg-emerald-50 text-emerald-600';
      case 'financeiro': return 'bg-rose-50 text-rose-600';
      case 'edrp': return 'bg-red-50 text-red-600';
      case 'revisao': return 'bg-cyan-50 text-cyan-600';
      case 'protocolo': return 'bg-indigo-50 text-indigo-600';
      case 'novo-caso': return 'bg-indigo-50 text-indigo-600';
      case 'controladoria': return 'bg-violet-50 text-violet-600';
      case 'relatorio-integridade': return 'bg-pink-50 text-pink-600';
      case 'recadastramento': return 'bg-sky-50 text-sky-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <BossLayout>
      <div id="fluxo-producao-home" className="space-y-12 animate-fade-in max-w-7xl mx-auto px-4 md:px-0">
        
        {/* PAGE INTRO */}
        <div className="border-b border-gray-100 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Centro de Produção</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-gray-600 text-[10px] font-black uppercase tracking-wider">
                  MÓDULO ATIVO
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
                Central de diretrizes judiciais, faturamentos, análises de integridade e auditoria estrutural do escritório Priscilla Giffoni.
              </p>
            </div>
            
            <button
              onClick={() => setRetryCount(prev => prev + 1)}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-all self-start cursor-pointer shadow-sm hover:shadow-md"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Minerar Firebase
            </button>
          </div>
        </div>

        {/* FOUR MAIN ENTRY PATHWAY CARDS */}
        <div>
          <div className="mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Opções de Início Operacional</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {entryCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="group bg-white border border-gray-150 rounded-[2.25rem] p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all active:scale-[0.99] flex flex-col justify-between min-h-[225px]"
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      card.color === 'blue' ? 'bg-blue-50 text-blue-600 border border-blue-100/50' :
                      card.color === 'purple' ? 'bg-purple-50 text-purple-600 border border-purple-100/50' :
                      card.color === 'cyan' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100/50' :
                      'bg-orange-50 text-orange-600 border border-orange-100/50'
                    }`}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-sm tracking-tight">
                        {card.title}
                      </h4>
                      <p className="text-[11.5px] leading-relaxed text-gray-500 mt-2">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={card.action}
                    className={`mt-5 py-2 px-3 rounded-xl text-center text-[10.5px] tracking-wide font-black uppercase text-white transition-all flex items-center justify-center gap-1 ${
                      card.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                      card.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                      card.color === 'cyan' ? 'bg-cyan-600 hover:bg-cyan-700' :
                      'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {card.actionLabel}
                    <ArrowRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* CONTINUAR FLUXO: PAINEL DE PENDÊNCIAS INTEGRADO */}
        <div id="painel-pendencias" className="bg-white border border-gray-150 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileDigit className="text-orange-500" size={22} />
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Painel de Pendências (Continuar Fluxo)
                </h3>
              </div>
              <p className="text-xs text-gray-400">
                Acompanhamento unificado das 11 divisões prioritárias para a retomada instantânea de fluxos ativos de produção.
              </p>
            </div>

            {/* SEARCH AND REFRESH */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative min-w-[240px]">
                <input
                  type="text"
                  placeholder="Pesquisar pendência..."
                  value={resumeSearchQuery}
                  onChange={(e) => setResumeSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-150 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-400 focus:bg-white"
                />
                <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-orange-500" size={26} />
              <p className="text-xs font-mono text-gray-400">Varrendo estruturas de casos no Firestore Giffoni...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT SIDE: GRID OF THE 11 CATEGORIES */}
              <div className="lg:col-span-6 space-y-3">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Categorias de Cobrança & Acompanhamento ({categoriesMetadata.length})
                </div>
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
                        className={`text-left border rounded-2xl p-3.5 transition-all text-xs flex items-center justify-between gap-3 cursor-pointer group hover:shadow-xs ${
                          isSelected ? cat.activeColor : 'bg-gray-50/40 hover:bg-white border-gray-150 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white shadow-xs text-orange-600' : 'bg-gray-100 text-gray-500 group-hover:text-gray-900 group-hover:bg-gray-200'
                          }`}>
                            <CatIcon size={16} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold truncate max-w-[140px]">{cat.label}</h5>
                            <p className="text-[9.5px] text-gray-400 truncate mt-0.5">{cat.description}</p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            hasItems 
                              ? (isSelected ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 font-extrabold')
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

              {/* RIGHT SIDE: DETAILED VIEW OF SELECTED PENDENCY LIST */}
              <div className="lg:col-span-6 bg-gray-50/50 border border-gray-150 rounded-2xl p-5 flex flex-col justify-between min-h-[380px]">
                <div>
                  
                  {/* Category Header */}
                  {(() => {
                    const currentMeta = categoriesMetadata.find(m => m.key === selectedCategory);
                    if (!currentMeta) return null;
                    const MetaIcon = currentMeta.icon;
                    const activeList = filteredCategoriesMap[selectedCategory] || [];

                    return (
                      <div className="border-b border-gray-200 pb-3.5 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-800">
                            <MetaIcon size={14} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-gray-900 text-sm uppercase tracking-tight">
                              {currentMeta.label}
                            </h4>
                            <p className="text-[10px] text-gray-400">{currentMeta.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* List of items */}
                  {(() => {
                    const activeList = filteredCategoriesMap[selectedCategory] || [];
                    if (activeList.length === 0) {
                      return (
                        <div className="py-16 text-center space-y-2">
                          <AlertTriangle className="mx-auto text-gray-300" size={24} />
                          <p className="text-xs font-bold text-gray-500">Sem Pendências Ativas.</p>
                          <p className="text-[10px] text-gray-400">Não há registros listados de acordo com os filtros fáticos de busca.</p>
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
                              className="shrink-0 bg-gray-905 hover:bg-black text-white hover:scale-103 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
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

                {/* Footnote instruction */}
                <div className="pt-4 border-t border-gray-200 text-[10px] text-gray-400 flex items-center gap-1.5 font-sans justify-end">
                  <span>Selecione uma categoria para auditar outros eixos</span>
                </div>

              </div>

            </div>
          )}
        </div>

        {/* LINEAR PROCESS DIRECTORY (FLOW STEPS) */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Eixos Funcionais do Fluxo</h3>
              <p className="text-xs text-gray-500 mt-1">Visão holística de conformidade e integridade dos 12 eixos operacionais.</p>
            </div>
            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-500 font-mono">
              COMPILADO TÉCNICO
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {flowSteps.map((step) => {
              const Icon = getStepIcon(step.id);
              const colorClass = getStepColorBg(step.id);

              return (
                <div
                  key={step.id}
                  className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-gray-300 transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-black text-gray-400 block h-3 uppercase">
                        ETAPA {String(step.order).padStart(2, '0')}
                      </span>
                      <h5 className="font-extrabold text-gray-900 text-xs mt-0.5 tracking-tight truncate max-w-[140px]">
                        {step.label}
                      </h5>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed mt-4">
                    {step.requiresCaseId 
                      ? 'Requer identificador técnico ativo cadastrado.' 
                      : 'Executável sem dependência direta de caso ativo.'}
                  </p>

                  <div className="absolute right-3.5 bottom-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest font-mono">
                      BOSS active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </BossLayout>
  );
}
