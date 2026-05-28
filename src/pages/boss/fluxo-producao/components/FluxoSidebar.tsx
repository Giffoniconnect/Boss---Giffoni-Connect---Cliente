import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { flowSteps } from '../utils/flowSteps';
import { flowRoutes } from '../utils/flowRoutes';
import { Lock, ArrowLeft, Check, Compass, FolderKanban } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

interface FluxoSidebarProps {
  caseId?: string;
}

export default function FluxoSidebar({ caseId }: FluxoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isNovoCaso, setIsNovoCaso] = useState(false);

  useEffect(() => {
    if (location.pathname.includes('/novo-caso')) {
      setIsNovoCaso(true);
      return;
    }
    if (!caseId) return;

    const fetchCaseStatus = async () => {
      try {
        const caseSnap = await getDoc(doc(db, 'cases', caseId));
        if (caseSnap.exists()) {
          const data = caseSnap.data();
          if (data.isNovoCaso || data.productionStage === 'novo-caso' || data.caseLifecycle === 'novo-caso') {
            setIsNovoCaso(true);
          }
        }
      } catch (err) {
        console.error("Error reading case in sidebar:", err);
      }
    };

    fetchCaseStatus();
  }, [caseId, location.pathname]);

  const activeSteps = useMemo(() => {
    return isNovoCaso 
      ? [
          { id: 'cadastro', label: 'Cadastro (PF/PJ)', routeKey: 'cadastro' as any, requiresCaseId: false, order: 1 },
          { id: 'tipo-producao', label: 'Tipo de Serviço', routeKey: 'tipoServico' as any, requiresCaseId: true, order: 2 },
          { id: 'novo-caso', label: 'Cadastro de Novo Caso', routeKey: 'novoCaso' as any, requiresCaseId: true, order: 3 },
          { id: 'controladoria', label: 'Controladoria', routeKey: 'controladoria' as any, requiresCaseId: true, order: 4 },
          { id: 'relatorio-integridade', label: 'Arquivamento', routeKey: 'relatorioIntegridade' as any, requiresCaseId: true, order: 5 },
        ]
      : flowSteps.map(s => {
          // Simplify labels for a horizontal visual strip
          let shortLabel = s.label;
          if (s.id === 'cadastro') shortLabel = 'Cadastro (PF/PJ)';
          else if (s.id === 'dados-caso') shortLabel = 'Entrevista (5W2H)';
          else if (s.id === 'tipo-producao') shortLabel = 'Tipo de Serviço';
          else if (s.id === 'solicitacoes-provas') shortLabel = 'Coleta de Provas';
          else if (s.id === 'solicitacoes-informacoes') shortLabel = 'Info. Complementares';
          else if (s.id === 'financeiro') shortLabel = 'Financeiro';
          else if (s.id === 'edrp') shortLabel = 'Estruturação (EDRP)';
          else if (s.id === 'revisao') shortLabel = 'Delegação e Revisão';
          else if (s.id === 'protocolo') shortLabel = 'Protocolo';
          else if (s.id === 'controladoria') shortLabel = 'Controladoria';
          else if (s.id === 'relatorio-integridade') shortLabel = 'Arquivamento';
          else if (s.id === 'recadastramento') shortLabel = 'Recadastramento';

          return { ...s, label: shortLabel };
        });
  }, [isNovoCaso]);

  // Find active step index based on current URL path
  const currentIndex = useMemo(() => {
    return activeSteps.findIndex((step) => {
      const isCadastro = step.id === 'cadastro';
      let stepUrl = '';

      if (isCadastro) {
        stepUrl = isNovoCaso ? '' : flowRoutes.cadastro();
      } else if (caseId) {
        const routeHelper = flowRoutes[step.routeKey];
        if (typeof routeHelper === 'function') {
          stepUrl = (routeHelper as (id: string) => string)(caseId);
        }
      }
      
      return location.pathname === stepUrl || 
             (!caseId && isCadastro && location.pathname.endsWith('/cadastro'));
    });
  }, [activeSteps, caseId, isNovoCaso, location.pathname]);

  // Percentage calculation: 0 = start, 100% = finish
  const progressPercent = useMemo(() => {
    if (activeSteps.length <= 1) return 0;
    const activeIdx = currentIndex !== -1 ? currentIndex : 0;
    return Math.round((activeIdx / (activeSteps.length - 1)) * 100);
  }, [activeSteps, currentIndex]);

  const currentStep = currentIndex !== -1 ? activeSteps[currentIndex] : activeSteps[0];

  return (
    <div className="w-full bg-white border border-gray-150 rounded-[2.5rem] p-6 shadow-sm space-y-5">
      
      {/* ROW 1: CONTROLS & PROGRESS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        
        {/* Back and title info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
            className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Voltar ao Início"
          >
            <ArrowLeft size={14} />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">Acompanhamento Produtivo</h4>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[9px] font-bold uppercase tracking-wider">
                {isNovoCaso ? 'Fluxo Simplificado' : 'Fluxo Padrão'}
              </span>
            </div>
            
            <p className="text-[10px] text-gray-400 mt-0.5 truncate flex items-center gap-1">
              <FolderKanban size={10} />
              {caseId ? `Caso Ativo: ${caseId}` : 'Rascunho de Cadastro Inicial (Sem Caso)'}
            </p>
          </div>
        </div>

        {/* Dynamic percentage display */}
        <div className="flex items-center gap-4 bg-gray-50/55 border border-gray-100 px-4 py-2 rounded-2xl shrink-0 self-start md:self-auto">
          <div className="text-left">
            <span className="text-[9px] font-black uppercase text-gray-400 block tracking-widest leading-none">
              Avanço Administrativo
            </span>
            <span className="text-xs font-black text-gray-900 block mt-1">
              Etapa {currentIndex !== -1 ? currentIndex + 1 : 1} de {activeSteps.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-orange-600 font-mono">
              {progressPercent}%
            </span>
            <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-orange-600 h-full rounded-full transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ROW 2: HORIZONTAL TIMELINE PILLS (SWIPE/SCROLLABLE) */}
      <div className="relative">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none select-none scroll-smooth">
          {activeSteps.map((step, idx) => {
            const isCadastro = step.id === 'cadastro';
            let stepUrl = '';
            let isLocked = false;

            if (isCadastro) {
              stepUrl = isNovoCaso ? '' : flowRoutes.cadastro();
              if (isNovoCaso) {
                isLocked = true;
              }
            } else if (caseId) {
              const routeHelper = flowRoutes[step.routeKey];
              if (typeof routeHelper === 'function') {
                stepUrl = (routeHelper as (id: string) => string)(caseId);
              }
            } else {
              isLocked = true;
            }

            const isCurrent = idx === currentIndex || (!caseId && isCadastro && location.pathname.endsWith('/cadastro'));
            const isCompleted = currentIndex !== -1 && idx < currentIndex;
            const isClickable = !isLocked && stepUrl !== '';

            // Styling based on state: current, completed, future/locked
            let pillClass = '';
            if (isCurrent) {
              pillClass = 'bg-gray-950 text-white border-transparent shadow-xs';
            } else if (isCompleted) {
              pillClass = 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:bg-emerald-100/50 hover:border-emerald-200';
            } else if (isLocked) {
              pillClass = 'border-transparent bg-gray-50 text-gray-300 pointer-events-none';
            } else {
              pillClass = 'border-gray-150 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900';
            }

            return (
              <button
                key={step.id}
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (isClickable && stepUrl) {
                    navigate(stepUrl);
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer outline-none ${pillClass}`}
                id={`timeline-step-${step.id}`}
              >
                {isCompleted ? (
                  <Check size={11} className="text-emerald-600 shrink-0 stroke-[3px]" />
                ) : isCurrent ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
                ) : isLocked ? (
                  <Lock size={9} className="text-gray-300 shrink-0" />
                ) : null}

                <span className="font-mono text-[9px] opacity-60">
                  {String(step.order).padStart(2, '0')}
                </span>
                
                <span className="tracking-tight max-w-[155px] truncate text-left">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
