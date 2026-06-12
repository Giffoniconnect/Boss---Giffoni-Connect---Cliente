import React from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import EntregaDocumento from '../components/EntregaDocumento';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Check, AlertCircle, Sparkles 
} from 'lucide-react';

export default function ProcuracaoPJ() {
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
    saveWizardStateUpdate({ step1_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-declaracao-PJ`);
    });
  };

  const FileUploadBox = ({ field }: { field: string }) => {
    const files = wizardState[field] || [];
    return (
      <div className="space-y-2 mt-1">
        <label className="group flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer">
          <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-1" size={20} />
          <span className="text-[11px] font-bold text-gray-700">Anexar Procuração PJ Assinada (PDF)</span>
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
    <FluxoStepLayout 
      stepName="Coleta de Documentos" 
      caseId={caseId}
      coletaSubetapasStep="procuracao"
      tipoPessoa="PJ"
      wizardState={wizardState}
    >
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Etapa 1 — Pessoa Jurídica (PJ)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{clientName}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Solicitação da Procuração Ad Judicia PJ
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/card-iniciar-coleta-obrigatoria`)}
            className="p-2 bg-gray-50 border border-gray-150 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
          >
            <ArrowLeft size={13} className="mr-1" /> Voltar ao Card
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
            {/* AUDITORIA DA GERAÇÃO DA PROCURAÇÃO CARD */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-5 shadow-3xs">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Sparkles className="text-indigo-600 animate-[spin_10s_linear_infinite]" size={18} />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">Auditoria da Geração da Procuração</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Controle automatizado e verificação da pauta de integração via Google Docs para PJ.</p>
                </div>
              </div>

              {/* CARD DE ESPAÇO RESERVADO PARA AUTOMAÇÕES FUTURAS */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/60 to-blue-50/20 border border-indigo-150 rounded-2xl flex flex-col gap-4">
                <div className="flex items-start gap-3 text-slate-800 text-xs">
                  <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <span className="block font-extrabold uppercase tracking-widest text-[9px] text-indigo-750 font-mono">Automação Inteligente Ativa</span>
                    <p className="text-xs text-slate-600 leading-normal">
                      Esta ferramenta envia os dados consolidados do cadastro de pessoa jurídica diretamente ao build receptor do Google Docs para preenchimento de placeholders, indexação e arquivamento automatizado na pasta empresarial.
                    </p>
                  </div>
                </div>

                {/* STATUS DA AUTOMAÇÃO */}
                <div className="border border-gray-150 rounded-xl p-3.5 bg-white space-y-2 select-none">
                  <p className="font-bold text-gray-400 text-[9px] uppercase tracking-wider font-mono">Status da Automação</p>
                  {caseObj?.procuracaoStatus === 'criada' || caseObj?.procuracaoGoogleDocsUrl ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-900 text-xs font-bold leading-normal">
                      Procuração criada com sucesso ✅
                    </div>
                  ) : caseObj?.procuracaoStatus === 'falha' ? (
                    <div className="p-2.5 bg-red-50 border border-red-150 rounded-lg text-red-900 text-xs font-bold leading-normal">
                      Falha na criação da Procuração, consulte “ver fluxo de logs” para mais informações ❌
                    </div>
                  ) : (
                    <div className="p-2.5 bg-gray-50 border border-gray-150 rounded-lg text-gray-500 text-xs font-bold leading-normal">
                      Aguardando comando de geração eletrônica.
                    </div>
                  )}
                </div>

                {/* CONTROL BUTTONS FOR SIMULATOR */}
                <div className="pt-2 border-t border-indigo-100 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => triggerSimulation('Procuração', 'criada')} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-[9px] font-black uppercase cursor-pointer shadow-3xs transition-all"
                    >
                      Gerar via Google Workspace (PJ)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => triggerSimulation('Procuração', 'falha')} 
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-[9px] font-black uppercase cursor-pointer shadow-3xs transition-all"
                    >
                      Simular Falha (PJ)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FLOW QUESTIONNAIRE CARD */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-5">

              <div className="space-y-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <p className="text-xs font-extrabold text-gray-800">1.1 Você gerou a procuração do cliente empresarial?</p>
                <div className="flex gap-4 mt-2">
                  {['sim', 'nao'].map(o => (
                    <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase text-gray-700">
                      <input 
                        type="radio" 
                        name="q1_1" 
                        checked={wizardState.q1_1 === o} 
                        onChange={() => saveWizardStateUpdate({ q1_1: o })} 
                        className="text-indigo-600"
                      />
                      <span>{o === 'sim' ? 'sim ✅' : 'não ❌'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(wizardState.q1_1 === 'sim' || wizardState.q1_1 === 'nao') && (
                <div className="space-y-4 border-l-2 border-indigo-200 pl-4 animate-in fade-in duration-200">
                  
                  <EntregaDocumento
                    tipoDocumento="procuracao"
                    tipoPessoa="PJ"
                    googleDocsUrl={caseObj?.procuracaoGoogleDocsUrl || ''}
                    whatsappCliente={client?.pjDadosResponsavel?.pj_whatsappResponsavel || client?.pjDadosEmpresa?.pj_whatsappEmpresa || client?.pjData?.pj_whatsappEmpresa || client?.pjData?.pj_whatsappResponsavel || ''}
                    emailCliente={client?.pjDadosEmpresa?.pj_emailEmpresa || client?.pjDadosEmpresa?.pj_emailCorporativo || client?.pjData?.pj_emailEmpresa || client?.pjData?.pj_emailCorporativo || ''}
                    nomeCliente={clientName}
                    selectedMethods={wizardState.q1_2 || []}
                    onMethodsChange={(newMethods: string[]) => saveWizardStateUpdate({ q1_2: newMethods })}
                    outroValue={wizardState.q1_2_outro || ''}
                    onOutroChange={(val: string) => saveWizardStateUpdate({ q1_2_outro: val })}
                    questionNumber="1.2"
                  />

                  {wizardState.q1_2 && wizardState.q1_2.length > 0 && (
                    <div className="space-y-1 animate-in fade-in duration-300">
                      <p className="text-xs font-extrabold text-gray-800">1.3 O representante da PJ assinou a procuração?</p>
                      <div className="flex gap-4 mt-1.5">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q1_3" 
                              checked={wizardState.q1_3 === o} 
                              onChange={() => saveWizardStateUpdate({ q1_3: o })} 
                            />
                            <span>{o === 'sim' ? 'sim ✅' : 'não ❌'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {wizardState.q1_2 && wizardState.q1_2.length > 0 && (wizardState.q1_3 === 'sim' || wizardState.q1_3 === 'nao') && (
                    <div className="space-y-1 animate-in fade-in duration-300">
                      <p className="text-xs font-extrabold text-gray-800">1.4 Solicitou digitalização do ato arquivístico/procuração assinado?</p>
                      <div className="flex gap-4 mt-1.5">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q1_4" 
                              checked={wizardState.q1_4 === o} 
                              onChange={() => saveWizardStateUpdate({ q1_4: o })} 
                            />
                            <span>{o === 'sim' ? 'sim ✅' : 'não ❌'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {wizardState.q1_2 && wizardState.q1_2.length > 0 && (wizardState.q1_3 === 'sim' || wizardState.q1_3 === 'nao') && (wizardState.q1_4 === 'sim' || wizardState.q1_4 === 'nao') && (
                    <div className="space-y-1 animate-in fade-in duration-300">
                      <p className="text-xs font-extrabold text-gray-800">1.5 Procuração PJ digitalizada recebida?</p>
                      <div className="flex gap-4 mt-1.5">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q1_5" 
                              checked={wizardState.q1_5 === o} 
                              onChange={() => saveWizardStateUpdate({ q1_5: o })} 
                            />
                            <span>{o === 'sim' ? 'sim ✅' : 'não ❌'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {wizardState.q1_2 && wizardState.q1_2.length > 0 && (wizardState.q1_3 === 'sim' || wizardState.q1_3 === 'nao') && (wizardState.q1_4 === 'sim' || wizardState.q1_4 === 'nao') && (wizardState.q1_5 === 'sim' || wizardState.q1_5 === 'nao') && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <p className="text-xs font-extrabold text-gray-800">1.6 Anexar arquivo no diretório empresarial?</p>
                      <div className="flex gap-4 mt-1.5">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q1_6" 
                              checked={wizardState.q1_6 === o} 
                              onChange={() => saveWizardStateUpdate({ q1_6: o })} 
                            />
                            <span>{o === 'sim' ? 'sim ✅' : 'não ❌'}</span>
                          </label>
                        ))}
                      </div>
                      {wizardState.q1_6 === 'sim' && <FileUploadBox field="procuracaoFiles" />}
                    </div>
                  )}

                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={!wizardState.q1_1 || saving}
                  onClick={handleNextPhase}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer font-bold"
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
