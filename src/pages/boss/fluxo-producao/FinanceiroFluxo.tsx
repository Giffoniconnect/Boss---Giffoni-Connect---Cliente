import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FluxoStepLayout from './components/FluxoStepLayout';
import { ArrowLeft, ArrowRight, Save, Info, CreditCard, Landmark } from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

export default function FinanceiroFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const safeCaseId = caseId || 'case_demo_123';

  return (
    <FluxoStepLayout stepName="Financeiro" caseId={safeCaseId}>
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Parametrização de Cobranças e Meios de Pagamento</h3>
          <p className="text-xs text-gray-500 mt-1">
            Geração de faturas fáticas via Stripe S.A. ou boleto direto via Asaas Brasil.
          </p>
        </div>

        {/* Visual blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 border border-dashed border-gray-200 rounded-2xl flex flex-col justify-between h-[140px] opacity-75 bg-gray-50/20">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-gray-400" />
              <span className="text-xs font-black uppercase text-gray-500 tracking-wide">Recorrência Stripe</span>
            </div>
            <span className="text-[10px] text-gray-400 leading-relaxed">Integração para faturamento recorrente do contrato no cartão de crédito corporativo.</span>
          </div>

          <div className="p-5 border border-dashed border-gray-200 rounded-2xl flex flex-col justify-between h-[140px] opacity-75 bg-gray-50/20">
            <div className="flex items-center gap-2">
              <Landmark size={18} className="text-gray-400" />
              <span className="text-xs font-black uppercase text-gray-500 tracking-wide">Asaas S.A. Boletos</span>
            </div>
            <span className="text-[10px] text-gray-400 leading-relaxed">Emissão imediata de boletos e faturas integradas de auditoria.</span>
          </div>
        </div>

        {/* Build 1 Notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-3 text-amber-900">
          <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-xs font-black uppercase tracking-wider font-sans">Etapa Preparada</h5>
            <p className="text-xs font-semibold leading-relaxed">
              Implementação funcional será adicionada no build correspondente.
            </p>
          </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.solicitacoesProvas(safeCaseId))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 px-6 py-3 rounded-xl font-bold transition-all text-xs hover:bg-gray-50 cursor-pointer"
            >
              <Save size={14} />
              Salvar e Sair
            </button>
            <button
              type="button"
              onClick={() => navigate(flowRoutes.edrp(safeCaseId))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-md"
            >
              <span>Salvar e Avançar</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </FluxoStepLayout>
  );
}
