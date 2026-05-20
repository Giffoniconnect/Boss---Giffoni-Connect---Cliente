import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  HeartPulse
} from 'lucide-react';
import { flowSteps } from './utils/flowSteps';

export default function FluxoHome() {
  const navigate = useNavigate();

  // Three main call-to-actions
  const entryCards = [
    {
      title: 'Cadastrar Novo Cliente',
      description: 'Iniciar relacionamento fático com cliente estreante e parametrizar dados estruturais.',
      icon: UserPlus,
      color: 'blue',
      path: '/boss-giffoni-clientes/fluxo-producao/cadastro'
    },
    {
      title: 'Cadastrar Novo Caso',
      description: 'Lançar novas demandas corporativas para clientes já cadastrados na base ativa.',
      icon: Briefcase,
      color: 'purple',
      path: '/boss-giffoni-clientes/fluxo-producao/cadastro'
    },
    {
      title: 'Continuar Fluxo Existente',
      description: 'Pesquisar e carregar fluxos integrados em andamento via localizador integrado.',
      icon: Search,
      color: 'emerald',
      path: '/boss-giffoni-clientes/fluxo-producao/cadastro'
    }
  ];

  // Visual helper icons for each step to look fully complete and styled
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
      case 'controladoria': return Cpu;
      case 'relatorio-integridade': return HeartPulse;
      default: return Sparkles;
    }
  };

  const getRandomBg = (id: string) => {
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
      case 'controladoria': return 'bg-violet-50 text-violet-600';
      case 'relatorio-integridade': return 'bg-pink-50 text-pink-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <BossLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fluxo de Produção</h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-150 rounded-full text-gray-700 text-[10px] font-bold uppercase tracking-wider">
            Arquitetura Pré-Configurada
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Gerenciamento técnico unificado de cadastros, documentos, relatórios e protocolo de casos do escritório.
        </p>
      </div>

      {/* THREE CORE CALL TO ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {entryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(card.path)}
              className="group text-left bg-white border border-gray-150 hover:border-gray-300 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer flex flex-col justify-between min-h-[220px]"
            >
              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  card.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  <Icon size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-lg tracking-tight group-hover:text-black transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1.5">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold font-sans text-gray-400 group-hover:text-gray-900 transition-colors mt-4">
                Iniciar Etapa <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* FLOW OVERVIEW CARDS */}
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Etapas do Processo de Produção</h3>
          <p className="text-xs text-gray-500 mt-0.5">Visão geral linear para controle de integridade de informações.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {flowSteps.map((step) => {
            const Icon = getStepIcon(step.id);
            const colorClass = getRandomBg(step.id);

            return (
              <div
                key={step.id}
                className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400 block h-3">
                      ETAPA {String(step.order).padStart(2, '0')}
                    </span>
                    <h5 className="font-bold text-gray-900 text-sm mt-0.5 tracking-tight truncate max-w-[160px]">
                      {step.label}
                    </h5>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed mt-3">
                  {step.requiresCaseId 
                    ? 'Requer identificador ativo de caso existente na nuvem.' 
                    : 'Abertura de dados mestre e controle cadastral do cliente.'}
                </p>

                {/* Micro decorator */}
                <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest font-mono">
                    VIEW ONLY
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BossLayout>
  );
}
