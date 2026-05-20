import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FluxoStepLayout from './components/FluxoStepLayout';
import { ArrowLeft, ArrowRight, Save, Info, Sparkles, Scale, Heart, Cpu } from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

export default function TipoServico() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const safeCaseId = caseId || 'case_demo_123';

  const serviceTypes = [
    { id: 'marketing', label: 'Marketing de Tráfego', icon: Sparkles, desc: 'Gestão de mídia paga, criativos e canais de escala.' },
    { id: 'comercial', label: 'Comercial Estruturado', icon: Cpu, desc: 'Instâncias comerciais, fechamento fático e CRM.' },
    { id: 'juridico', label: 'Jurídico Interno', icon: Scale, desc: 'Compliance, assessoria jurídica, pareceres de integridade.' },
    { id: 'rh', label: 'Recursos Humanos', icon: Heart, desc: 'Gestão de talentos, contratação ativa e treinamento.' }
  ];

  return (
    <FluxoStepLayout stepName="Tipo de Serviço" caseId={safeCaseId}>
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Categorização do Tipo de Serviço</h3>
          <p className="text-xs text-gray-500 mt-1">
            Indique a natureza técnica da demanda para acionar os conectores apropriados na controladoria.
          </p>
        </div>

        {/* Dynamic Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {serviceTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div 
                key={type.id} 
                className="p-5 border border-gray-150 rounded-2xl hover:border-gray-300 transition-all bg-gray-50/50 flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-700 flex items-center justify-center shrink-0 shadow-sm">
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 tracking-tight">{type.label}</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{type.desc}</p>
                </div>
              </div>
            );
          })}
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
            onClick={() => navigate(flowRoutes.cadastro())}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 px-6 rounded-xl font-bold transition-all text-xs cursor-pointer"
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
              onClick={() => navigate(flowRoutes.dadosCaso(safeCaseId))}
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
