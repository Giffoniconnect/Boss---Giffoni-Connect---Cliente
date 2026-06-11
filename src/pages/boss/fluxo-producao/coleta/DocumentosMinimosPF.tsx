import React from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Check, AlertCircle 
} from 'lucide-react';

export default function DocumentosMinimosPF() {
  const {
    caseId,
    fetching,
    error,
    success,
    clientName,
    wizardState,
    saveWizardStateUpdate,
    addWizardFile,
    removeWizardFile,
    navigate
  } = useColetaState();

  const handleNextPhase = () => {
    saveWizardStateUpdate({ step4_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-necessidade-PF`);
    });
  };

  const FileUploadBox = ({ field, labelText }: { field: string, labelText: string }) => {
    const files = wizardState[field] || [];
    return (
      <div className="space-y-2 mt-1">
        <label className="group flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer">
          <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-1" size={20} />
          <span className="text-[11px] font-bold text-gray-750">{labelText}</span>
          <input 
            type="file" 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const name = e.target.files[0].name;
                const size = (e.target.files[0].size / 1024 / 1024).toFixed(2) + ' MB';
                addWizardFile(field, name, size);
              }
            }}
          />
        </label>
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-150 rounded-xl text-xs">
                <span className="truncate font-semibold text-indigo-900 flex items-center gap-1">
                  <FileText size={12} /> {f.name} <span className="text-[10px] text-indigo-400 font-normal">({f.size})</span>
                </span>
                <button type="button" onClick={() => removeWizardFile(field, idx)} className="text-rose-600 hover:bg-rose-100 p-1 rounded-lg">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <FluxoStepLayout stepName="Coleta de Documentos" caseId={caseId}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Etapa 4 — Pessoa Física (PF)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{clientName}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Documentos Mínimos Obrigatórios (PF)
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-contrato-PF`)}
            className="p-2 bg-gray-50 border border-gray-150 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
          >
            <ArrowLeft size={13} className="mr-1" /> Voltar ao Contrato
          </button>
        </div>

        {fetching ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 font-mono">Carregando dados da etapa...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* NOTIFICATION TOASTS */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs font-semibold flex gap-2 items-center">
                <AlertCircle size={14} className="text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 text-xs font-bold flex gap-2 items-center">
                <Check className="text-emerald-500 shrink-0" size={14} />
                <span>{success}</span>
              </div>
            )}

            {/* FLOW QUESTIONNAIRE CARD */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-5">
              
              <div className="space-y-4">
                
                {/* RG */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-1">
                  <p className="text-xs font-extrabold text-gray-800">4.1 RG do cliente recebido?</p>
                  <div className="flex gap-4 mt-1">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="q4_rg" 
                          checked={wizardState.q4_rg === o} 
                          onChange={() => saveWizardStateUpdate({ q4_rg: o })} 
                          className="text-indigo-600"
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Solicitar Digitalização do RG */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-1">
                  <p className="text-xs font-extrabold text-gray-800">4.2 Solicitar Digitalização do RG?</p>
                  <div className="flex gap-4 mt-1">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="q4_solicitar_digitalizacao_rg" 
                          checked={wizardState.q4_solicitar_digitalizacao_rg === o} 
                          onChange={() => saveWizardStateUpdate({ q4_solicitar_digitalizacao_rg: o })} 
                          className="text-indigo-600"
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* CPF */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-1">
                  <p className="text-xs font-extrabold text-gray-800">4.3 CPF / CNH do cliente recebido?</p>
                  <div className="flex gap-4 mt-1">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="q4_cpf" 
                          checked={wizardState.q4_cpf === o} 
                          onChange={() => saveWizardStateUpdate({ q4_cpf: o })} 
                          className="text-indigo-600"
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Solicitar Digitalização do Comprovante de Residência */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-1">
                   <p className="text-xs font-extrabold text-gray-800">4.4 Solicitar digitalização do comprovante de residência?</p>
                   <div className="flex gap-4 mt-1">
                     {['sim', 'nao'].map(o => (
                       <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                         <input 
                           type="radio" 
                           name="q4_solicitar_digitalizacao_residencia" 
                           checked={wizardState.q4_solicitar_digitalizacao_residencia === o} 
                           onChange={() => saveWizardStateUpdate({ q4_solicitar_digitalizacao_residencia: o })} 
                           className="text-indigo-600"
                         />
                         <span>{o}</span>
                       </label>
                     ))}
                   </div>
                </div>

                {/* COMPROVANTE RESIDENCIA */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-1">
                  <p className="text-xs font-extrabold text-gray-800">4.5 Comprovante de residência atualizado do cliente recebido?</p>
                  <div className="flex gap-4 mt-1">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="q4_residencia" 
                          checked={wizardState.q4_residencia === o} 
                          onChange={() => saveWizardStateUpdate({ q4_residencia: o })} 
                          className="text-indigo-600"
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ANEXAR OBJETOS */}
                <div className="p-4 bg-indigo-50/20 border border-indigo-100/70 rounded-2xl space-y-3">
                  <p className="text-xs font-extrabold text-gray-900">4.6 Deseja anexar os documentos físicos escaneados agora?</p>
                  <div className="flex gap-4">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-750">
                        <input 
                          type="radio" 
                          name="q4_anexar_pf" 
                          checked={wizardState.q4_anexar_pf === o} 
                          onChange={() => saveWizardStateUpdate({ q4_anexar_pf: o })} 
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>

                  {wizardState.q4_anexar_pf === 'sim' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 animate-in fade-in duration-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500">Cópia RG</span>
                        <FileUploadBox field="rgFiles" labelText="Anexar RG" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500">Cópia CPF</span>
                        <FileUploadBox field="cpfFiles" labelText="Anexar CPF/CNH" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500">Cópia Residência</span>
                        <FileUploadBox field="residenciaFiles" labelText="Anexar Residência" />
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* FLOW ACTIONS FOOTER */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  disabled={!wizardState.q4_rg || !wizardState.q4_solicitar_digitalizacao_rg || !wizardState.q4_cpf || !wizardState.q4_solicitar_digitalizacao_residencia || !wizardState.q4_residencia}
                  onClick={handleNextPhase}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Próxima Fase</span>
                  <ArrowRight size={13} />
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </FluxoStepLayout>
  );
}
