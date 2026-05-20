import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FluxoStepLayout from './components/FluxoStepLayout';
import { ArrowLeft, Check, Save, Info, Sparkles, HeartPulse } from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

export default function RelatorioIntegridadeFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const safeCaseId = caseId || 'case_demo_123';

  return (
    <FluxoStepLayout stepName="Relatório de Integridade" caseId={safeCaseId}>
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Relatório Geral de Integridade</h3>
          <p className="text-xs text-gray-500 mt-1">
            Auditoria global das informações declaradas e integridade cibernética de todos os anexos fáticos.
          </p>
        </div>

        {/* Visual blocks */}
        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-6 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
            <HeartPulse size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900 tracking-tight">Selo de Integridade</h4>
            <p className="text-xs text-gray-400 leading-relaxed mt-1">
              Avaliação de riscos jurídicos, conformidade contratual, conciliação de faturamento e auditoria de registros governamentais automatizada antes da abertura.
            </p>
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
            onClick={() => navigate(flowRoutes.controladoria(safeCaseId))}
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
              onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-md"
            >
              <Check size={14} />
              Concluir Fluxo
            </button>
          </div>
        </div>
      </div>
    </FluxoStepLayout>
  );
}
