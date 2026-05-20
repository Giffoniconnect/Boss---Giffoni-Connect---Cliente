import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FluxoStepLayout from './components/FluxoStepLayout';
import { ArrowLeft, ArrowRight, Save, Info, FileText, Calendar, HelpCircle } from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

export default function DadosCaso() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const safeCaseId = caseId || 'case_demo_123';

  return (
    <FluxoStepLayout stepName="Dados do Caso" caseId={safeCaseId}>
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Dados Gerais da Demanda</h3>
          <p className="text-xs text-gray-500 mt-1">
            Insira as descrições fáticas primárias do caso e observe as chaves de controle operacional.
          </p>
        </div>

        {/* Mock/Visual Form fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-600 tracking-wider">Título Operacional do Caso</label>
              <input 
                type="text" 
                placeholder="Exemplo: Assessoria de Escala Imobiliária" 
                disabled 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-600 tracking-wider">Número do Processo Relacionado</label>
              <input 
                type="text" 
                placeholder="Ainda não gerado (protocolado na etapa 9)" 
                disabled 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-600 tracking-wider">Descritivos Técnicos e Fatos Primários</label>
            <textarea 
              rows={4} 
              placeholder="Descreva as bases contratuais e os termos acordados..." 
              disabled 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-400 resize-none"
            />
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
            onClick={() => navigate(flowRoutes.tipoServico(safeCaseId))}
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
              onClick={() => navigate(flowRoutes.solicitacoesInformacoes(safeCaseId))}
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
