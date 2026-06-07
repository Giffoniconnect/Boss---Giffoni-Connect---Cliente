import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BossLayout } from '../../../components/Layout';
import { 
  UserPlus, 
  Briefcase, 
  ArrowRight, 
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
  Sparkles
} from 'lucide-react';
import { flowSteps } from './utils/flowSteps';

export default function FluxoHome() {
  const navigate = useNavigate();

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
      action: () => navigate('/boss-giffoni-clientes/fluxo-producao-exibir-pendencias'),
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
      <div id="fluxo-producao-home-v2" className="space-y-12 animate-fade-in max-w-7xl mx-auto px-4 md:px-0">
        
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
                Central de diretrizes judiciais, faturamentos, análises de integridade e auditoria estrutural do escritório ⚖️Giffoni Advogados Associados ⚖️.
              </p>
            </div>
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
                    className={`mt-5 py-2 px-3 rounded-xl text-center text-[10.5px] tracking-wide font-black uppercase text-white transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
