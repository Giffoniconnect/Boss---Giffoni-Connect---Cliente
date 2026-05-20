import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { flowSteps } from '../utils/flowSteps';
import { flowRoutes } from '../utils/flowRoutes';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface FluxoSidebarProps {
  caseId?: string;
}

export default function FluxoSidebar({ caseId }: FluxoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="w-full lg:w-80 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm shrink-0">
      <div className="mb-6 pb-4 border-b border-gray-100">
        <button
          type="button"
          onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest cursor-pointer"
        >
          <ArrowLeft size={14} />
          Voltar ao Início
        </button>
        <h3 className="text-lg font-black text-gray-900 mt-3 tracking-tight">Etapas do Fluxo</h3>
        <p className="text-xs text-gray-500 mt-1">Navegação estruturada de produção.</p>
        {caseId ? (
          <div className="mt-3 p-2 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-mono text-gray-600 break-all">
            <span className="font-sans font-bold text-gray-400 uppercase mr-1">Caso:</span>
            {caseId}
          </div>
        ) : (
          <div className="mt-3 px-2 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-[10px] font-bold uppercase tracking-wider">
            Aguardando Cadastro do Caso
          </div>
        )}
      </div>

      <nav className="space-y-1.5">
        {flowSteps.map((step) => {
          const isCadastro = step.id === 'cadastro';
          let stepUrl = '';
          let isLocked = false;

          if (isCadastro) {
            stepUrl = flowRoutes.cadastro();
          } else if (caseId) {
            // we have a caseId, resolve the route helper dynamically!
            const routeHelper = flowRoutes[step.routeKey];
            if (typeof routeHelper === 'function') {
              stepUrl = (routeHelper as (id: string) => string)(caseId);
            }
          } else {
            isLocked = true;
          }

          // Determine current step match
          const isCurrent = location.pathname === stepUrl || 
                            (!caseId && isCadastro && location.pathname.endsWith('/cadastro'));

          // Styling based on state: atual, disponivel, bloqueado, futuro
          let stateStyle = '';
          let isClickable = !isLocked;

          if (isLocked) {
            stateStyle = 'border-transparent text-gray-300 pointer-events-none';
          } else if (isCurrent) {
            stateStyle = 'bg-gray-950 text-white border-transparent shadow-sm';
          } else {
            stateStyle = 'border-gray-50 text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer';
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
              className={`w-full flex items-center justify-between px-4 py-3 border text-left rounded-2xl text-xs font-bold transition-all ${stateStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono font-black shrink-0 ${
                  isCurrent ? 'text-blue-400' : isLocked ? 'text-gray-300' : 'text-gray-400'
                }`}>
                  {String(step.order).padStart(2, '0')}
                </span>
                <span className="font-sans truncate tracking-tight">{step.label}</span>
              </div>

              {isLocked ? (
                <Lock size={12} className="text-gray-300 shrink-0" />
              ) : isCurrent ? (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
              ) : (
                <CheckCircle2 size={12} className="text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
