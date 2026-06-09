import React from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import EntregaDocumento from '../components/EntregaDocumento';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Check, AlertCircle, Sparkles 
} from 'lucide-react';

export default function DeclaracaoPJ() {
  const {
    caseId,
    fetching,
    saving,
    error,
    success,
    clientName,
    client,
    caseObj,
    wizardState,
    saveWizardStateUpdate,
    triggerSimulation,
    addWizardFile,
    removeWizardFile,
    handleCheckboxToggle,
    navigate
  } = useColetaState();

  const handleNextPhase = () => {
    saveWizardStateUpdate({ step2_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-contrato-PJ`);
    });
  };

  const FileUploadBox = ({ field }: { field: string }) => {
    const files = wizardState[field] || [];
    return (
      <div className="space-y-2 mt-1">
        <label className="group flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer">
          <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-1" size={20} />
          <span className="text-[11px] font-bold text-gray-750">Anexar Requerimento Gratuidade PJ (PDF)</span>
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
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Etapa 2 — Pessoa Jurídica (PJ)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{clientName}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Gratuidade Judiciária de Pessoa Jurídica
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-procuracao-PJ`)}
            className="p-2 bg-gray-50 border border-gray-150 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
          >
            <ArrowLeft size={13} className="mr-1" /> Voltar à Procuração
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
              
              <div className="space-y-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <p className="text-xs font-extrabold text-gray-800">2.1 A empresa precisará de assistência judiciária gratuita?</p>
                <div className="flex gap-4 mt-2">
                  {['sim', 'nao'].map(o => (
                    <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase text-gray-700">
                      <input 
                        type="radio" 
                        name="q2_1" 
                        checked={wizardState.q2_1 === o} 
                        onChange={() => saveWizardStateUpdate({ q2_1: o })} 
                        className="text-indigo-600"
                      />
                      <span>{o === 'sim' ? 'Sim (Exige Declaração/Balanço PJ)' : 'Não (Custas Pagas)'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {wizardState.q2_1 === 'nao' && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs font-semibold animate-in fade-in">
                  A sociedade arcará com o recolhimento das custas. O caso corporativo está dispensado de declaração/atestado de hipossuficiência PJ. Podemos seguir ao Contrato de Honorários.
                </div>
              )}

              {wizardState.q2_1 === 'sim' && (
                <div className="space-y-4 border-l-2 border-indigo-200 pl-4 animate-in fade-in duration-200">
                  
                  {/* CARD DE ESPAÇO RESERVADO PARA AUTOMAÇÕES FUTURAS */}
                  <div className="p-4 bg-blue-50/75 border border-blue-100 rounded-2xl flex items-start gap-3 text-blue-950 text-xs font-semibold leading-relaxed shadow-3xs">
                    <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="block font-extrabold uppercase tracking-widest text-[9px] text-blue-600 mb-0.5 font-mono">Automação Inteligente</span>
                      Espaço reservado para automação futura da declaração de hipossuficiência
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-gray-800">2.2 Você gerou o requerimento de gratuidade da empresa?</p>
                    <div className="flex gap-4 mt-1.5">
                      {['sim', 'nao'].map(o => (
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                          <input 
                            type="radio" 
                            name="q2_2" 
                            checked={wizardState.q2_2 === o} 
                            onChange={() => saveWizardStateUpdate({ q2_2: o })} 
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {(wizardState.q2_2 === 'sim' || wizardState.q2_2 === 'nao') && (
                    <>
                      <EntregaDocumento
                        tipoDocumento="declaracao"
                        tipoPessoa="PJ"
                        googleDocsUrl={caseObj?.declaracaoPobrezaGoogleDocsUrl || ''}
                        whatsappCliente={client?.pjDadosResponsavel?.pj_whatsappResponsavel || client?.pjDadosEmpresa?.pj_whatsappEmpresa || client?.pjData?.pj_whatsappEmpresa || client?.pjData?.pj_whatsappResponsavel || ''}
                        emailCliente={client?.pjDadosEmpresa?.pj_emailEmpresa || client?.pjDadosEmpresa?.pj_emailCorporativo || client?.pjData?.pj_emailEmpresa || client?.pjData?.pj_emailCorporativo || ''}
                        nomeCliente={clientName}
                        selectedMethods={wizardState.q2_3 || []}
                        onMethodsChange={(newMethods: string[]) => saveWizardStateUpdate({ q2_3: newMethods })}
                        outroValue={wizardState.q2_3_outro || ''}
                        onOutroChange={(val: string) => saveWizardStateUpdate({ q2_3_outro: val })}
                        questionNumber="2.3"
                      />

                      {wizardState.q2_3 && wizardState.q2_3.length > 0 && (
                        <div className="space-y-1 animate-in fade-in duration-300">
                          <p className="text-xs font-extrabold text-gray-805">2.4 O balancete/declaração foi assinado pelos sócios?</p>
                          <div className="flex gap-4 mt-1.5">
                            {['sim', 'nao'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                                <input 
                                  type="radio" 
                                  name="q2_4" 
                                  checked={wizardState.q2_4 === o} 
                                  onChange={() => saveWizardStateUpdate({ q2_4: o })} 
                                />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {wizardState.q2_3 && wizardState.q2_3.length > 0 && (wizardState.q2_4 === 'sim' || wizardState.q2_4 === 'nao') && (
                        <div className="space-y-1 animate-in fade-in duration-300">
                          <p className="text-xs font-extrabold text-gray-805">2.5 Requisitou digitalização do balanço patrimonial?</p>
                          <div className="flex gap-4 mt-1.5">
                            {['sim', 'nao'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                                <input 
                                  type="radio" 
                                  name="q2_5" 
                                  checked={wizardState.q2_5 === o} 
                                  onChange={() => saveWizardStateUpdate({ q2_5: o })} 
                                />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {wizardState.q2_3 && wizardState.q2_3.length > 0 && (wizardState.q2_4 === 'sim' || wizardState.q2_4 === 'nao') && (wizardState.q2_5 === 'sim' || wizardState.q2_5 === 'nao') && (
                        <div className="space-y-1 animate-in fade-in duration-300">
                          <p className="text-xs font-extrabold text-gray-850">2.6 Recebeu o balanço assinado e digitalizado?</p>
                          <div className="flex gap-4 mt-1.5">
                            {['sim', 'nao'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                                <input 
                                  type="radio" 
                                  name="q2_6" 
                                  checked={wizardState.q2_6 === o} 
                                  onChange={() => saveWizardStateUpdate({ q2_6: o })} 
                                />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {wizardState.q2_3 && wizardState.q2_3.length > 0 && (wizardState.q2_4 === 'sim' || wizardState.q2_4 === 'nao') && (wizardState.q2_5 === 'sim' || wizardState.q2_5 === 'nao') && (wizardState.q2_6 === 'sim' || wizardState.q2_6 === 'nao') && (
                        <div className="space-y-2 animate-in fade-in duration-300">
                          <p className="text-xs font-extrabold text-gray-850">2.7 Anexar declaração e balanços de hipossuficiência PJ?</p>
                          <div className="flex gap-4 mt-1.5">
                            {['sim', 'nao'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                                <input 
                                  type="radio" 
                                  name="q2_7" 
                                  checked={wizardState.q2_7 === o} 
                                  onChange={() => saveWizardStateUpdate({ q2_7: o })} 
                                />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                          {wizardState.q2_7 === 'sim' && <FileUploadBox field="declaracaoFiles" />}
                        </div>
                      )}
                    </>
                  )}

                </div>
              )}

              {/* AUTOMAÇÃO GOOGLE DOCS MOCK SIMULATOR */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    disabled={wizardState.q2_1 !== 'sim'}
                    onClick={() => triggerSimulation('Declaração de Pobreza', 'criada')} 
                    className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase cursor-pointer disabled:opacity-50"
                  >
                    Gerar via Google Workspace (PJ)
                  </button>
                  <button 
                    type="button" 
                    disabled={wizardState.q2_1 !== 'sim'}
                    onClick={() => triggerSimulation('Declaração de Pobreza', 'falha')} 
                    className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase cursor-pointer disabled:opacity-50"
                  >
                    Simular Falha (PJ)
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!wizardState.q2_1 || (wizardState.q2_1 === 'sim' && !wizardState.q2_2) || saving}
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
