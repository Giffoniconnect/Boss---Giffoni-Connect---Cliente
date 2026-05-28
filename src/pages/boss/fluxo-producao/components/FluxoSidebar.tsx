import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { flowSteps } from '../utils/flowSteps';
import { flowRoutes } from '../utils/flowRoutes';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
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

  const activeSteps = isNovoCaso 
    ? [
        { id: 'cadastro', label: '1.1/1.2 Cliente Vinculado', routeKey: 'cadastro' as any, requiresCaseId: false, order: 1 },
        { id: 'tipo-producao', label: '1.3.2 Tipo de Serviço', routeKey: 'tipoServico' as any, requiresCaseId: true, order: 2 },
        { id: 'novo-caso', label: '1.10.1 Cadastro de Novo Caso', routeKey: 'novoCaso' as any, requiresCaseId: true, order: 3 },
        { id: 'controladoria', label: '1.11.1 Controladoria', routeKey: 'controladoria' as any, requiresCaseId: true, order: 4 },
        { id: 'relatorio-integridade', label: '1.11.2 Arquivamento (Fechamento)', routeKey: 'relatorioIntegridade' as any, requiresCaseId: true, order: 5 },
      ]
    : flowSteps;

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
          <div className="mt-3 p-2 bg-gray-50 rounded-xl border border-gray-100 text-xs font-mono text-gray-600 break-all">
            <span className="font-sans font-bold text-gray-400 uppercase mr-1">Caso:</span>
            {caseId}
          </div>
        ) : (
          <div className="mt-3 px-2 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-xs font-bold uppercase tracking-wider">
            Aguardando Cadastro do Caso
          </div>
        )}
      </div>

      <nav className="space-y-1.5">
        {activeSteps.map((step) => {
          const isCadastro = step.id === 'cadastro';
          let stepUrl = '';
          let isLocked = false;

          if (isCadastro) {
            stepUrl = isNovoCaso ? '' : flowRoutes.cadastro();
            if (isNovoCaso) {
              isLocked = true; // For Novo Caso, the client is pre-linked so they cannot click back to 1.1/1.2 registration screen
            }
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
          let isClickable = !isLocked && stepUrl !== '';

          if (isLocked) {
            stateStyle = 'border-transparent text-gray-300 pointer-events-none bg-gray-50/50';
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
              className={`w-full flex items-center justify-between px-4 py-3 border text-left rounded-2xl text-sm font-bold transition-all ${stateStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-black shrink-0 ${
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
