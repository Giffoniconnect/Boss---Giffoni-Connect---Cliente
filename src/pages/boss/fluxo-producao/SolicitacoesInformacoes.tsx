import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FluxoStepLayout from './components/FluxoStepLayout';
import { ArrowLeft, ArrowRight, Save, Info, FileQuestion, Plus } from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

export default function SolicitacoesInformacoes() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const safeCaseId = caseId || 'case_demo_123';

  return (
    <FluxoStepLayout stepName="Solicitações de Informações" caseId={safeCaseId}>
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Solicitações de Informações</h3>
          <p className="text-xs text-gray-500 mt-1">
            Indique as informações necessárias para que o cliente envie pelo Portal do Cliente.
          </p>
        </div>

        {/* Visual placeholders for information checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-150 rounded-xl">
            <div className="flex items-center gap-3">
              <FileQuestion size={18} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-700">Comprovante de Faturamento Trimestral</span>
            </div>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded text-[9px] font-mono">STANDBY</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-150 rounded-xl">
            <div className="flex items-center gap-3">
              <FileQuestion size={18} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-700">Contrato Social e Alterações</span>
            </div>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded text-[9px] font-mono">STANDBY</span>
          </div>

          <button 
            type="button"
            disabled
            className="w-full py-3.5 border border-dashed border-gray-300 hover:border-gray-500 rounded-xl text-xs font-bold text-gray-450 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 cursor-pointer opacity-60"
          >
            <Plus size={14} />
            Nova Solicitação de Documento (Integrará com Portal do Cliente)
          </button>
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
            onClick={() => navigate(flowRoutes.dadosCaso(safeCaseId))}
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
              onClick={() => navigate(flowRoutes.solicitacoesProvas(safeCaseId))}
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
