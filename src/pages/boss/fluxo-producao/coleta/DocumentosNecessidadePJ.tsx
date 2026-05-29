import React, { useState } from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Check, AlertCircle, PlusCircle 
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export default function DocumentosNecessidadePJ() {
  const {
    caseId,
    fetching,
    saving,
    setSaving,
    error,
    setError,
    success,
    setSuccess,
    client,
    requests,
    setRequests,
    wizardState,
    saveWizardStateUpdate,
    addWizardFile,
    removeWizardFile,
    handleCheckboxToggle,
    navigate
  } = useColetaState();

  // New Evidence Request fields
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDocNum, setNewDocNum] = useState('');

  const handleNextPhase = () => {
    saveWizardStateUpdate({ step5_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-auditoria-PJ`);
    });
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Informe pelo menos o título do documento solicitado.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const docData = {
        caseId,
        clientId: client?.id || '',
        clientSlug: client?.slug || '',
        title: newTitle.trim(),
        description: newDesc.trim(),
        documentNumber: newDocNum.trim(),
        status: 'pendente',
        visibleToClient: true,
        allowUpload: true,
        expectedFileTypes: ['pdf', 'png'],
        maxFiles: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'caseEvidenceRequests'), docData);
      setRequests((prev: any) => [{ id: docRef.id, ...docData }, ...prev]);
      setSuccess('Solicitação de prova complementar corporativa incluída!');
      setTimeout(() => setSuccess(null), 2500);

      setNewTitle('');
      setNewDesc('');
      setNewDocNum('');
    } catch (err: any) {
      setError(`Erro ao criar solicitação: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const FileUploadBox = ({ field }: { field: string }) => {
    const files = wizardState[field] || [];
    return (
      <div className="space-y-1.5 mt-1">
        <label className="group flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-2.5 bg-gray-50/50 hover:bg-gray-55 transition-all cursor-pointer">
          <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-0.5" size={16} />
          <span className="text-[10px] font-bold text-gray-700">Anexar Documento de Prova PJ (PDF)</span>
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
              <div key={idx} className="flex items-center justify-between p-1.5 px-2 bg-indigo-50 border border-indigo-150 rounded-xl text-xs">
                <span className="truncate font-semibold text-indigo-900 flex items-center gap-1">
                  <FileText size={12} /> {f.name}
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
                Etapa 5 — Pessoa Jurídica (PJ)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{client?.pjDadosEmpresa?.pj_razaoSocial || 'PJ'}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Documentos Específicos Corporativos
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-minimos-PJ`)}
            className="p-2 bg-gray-50 border border-gray-150 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
          >
            <ArrowLeft size={13} className="mr-1" /> Voltar aos Mínimos
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
                <AlertCircle size={14} className="text-red-900 shrink-0" />
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
                <p className="text-xs font-extrabold text-gray-800">5.1 Existem outros documentos PJ específicos a serem solicitados conforme a necessidade?</p>
                <div className="flex gap-4 mt-2">
                  {['sim', 'nao'].map(o => (
                    <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase text-gray-700">
                      <input 
                        type="radio" 
                        name="q5_1" 
                        checked={wizardState.q5_1 === o} 
                        onChange={() => saveWizardStateUpdate({ q5_1: o })} 
                        className="text-indigo-600"
                      />
                      <span>{o === 'sim' ? 'Sim (Exige Provas Financeiras/Contábeis)' : 'Não'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {wizardState.q5_1 === 'sim' && (
                <div className="space-y-6 border-l-2 border-indigo-200 pl-4 animate-in fade-in duration-200">
                  
                  {/* FORM TO ADD NEW CUSTOM REQUEST */}
                  <form onSubmit={handleAddEvidence} className="bg-gray-50 border rounded-2xl p-4 space-y-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-indigo-700 block">Cadastrar Solicitação Empresarial</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Título do Documento</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Balanço DRE, Extrato FGTS" 
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Identificador / Número do Documento</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Doc. PJ-05, Doc. Recorrente" 
                          value={newDocNum}
                          onChange={(e) => setNewDocNum(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Descrição / Instruções p/ obtenção corporativa</label>
                      <textarea 
                        placeholder="Descreva detalhes específicos de obtenção junto ao dpto contábil ou fiscal." 
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 min-h-[60px]"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={saving}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle size={14} />
                      <span>Adicionar Solicitação</span>
                    </button>
                  </form>

                  {/* RENDER CUSTOM REQUESTS CHECKBOXES */}
                  {requests.length > 0 && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-black uppercase text-indigo-950 font-mono tracking-widest block border-b pb-1 font-semibold">Checklist de Provas Custodiadas</span>
                      <div className="space-y-4">
                        {requests.map((req) => {
                          const valState = wizardState.q5_provas?.[req.id] || { received: 'nao' };
                          const setVal = (updatesSub: any) => {
                            const nextProvas = {
                              ...wizardState.q5_provas,
                              [req.id]: { ...valState, ...updatesSub }
                            };
                            saveWizardStateUpdate({ q5_provas: nextProvas });
                          };

                          return (
                            <div key={req.id} className="p-4 bg-white border border-gray-150 rounded-xl space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <span className="text-[9px] bg-indigo-105 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold block w-max uppercase mb-1">{req.documentNumber || 'Doc. Adicional'}</span>
                                  <h4 className="text-xs font-black text-gray-900">{req.title}</h4>
                                  <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">{req.description}</p>
                                </div>
                              </div>

                              <div className="space-y-2 border-t pt-2.5">
                                <div className="space-y-1">
                                  <p className="text-[11px] font-black text-gray-850">Você já recebeu esse documento?</p>
                                  <div className="flex gap-4">
                                    {['sim', 'nao'].map(o => (
                                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-semibold text-gray-700">
                                        <input type="radio" checked={valState.received === o} onChange={() => setVal({ received: o })} />
                                        <span>{o}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {valState.received === 'sim' && (
                                  <div className="space-y-2 pl-3 border-l-2 border-indigo-200">
                                    <p className="text-[11px] font-bold text-gray-805">Deseja anexar esse documento agora?</p>
                                    <div className="flex gap-4">
                                      {['sim', 'nao'].map(o => (
                                        <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-semibold text-gray-700">
                                          <input type="radio" checked={valState.anexar === o} onChange={() => setVal({ anexar: o })} />
                                          <span>{o}</span>
                                        </label>
                                      ))}
                                    </div>
                                    {valState.anexar === 'sim' && <FileUploadBox field={`custom_${req.id}`} />}
                                  </div>
                                )}

                                {valState.received === 'nao' && (
                                  <div className="p-3 bg-red-50/50 rounded-xl space-y-2 animate-in fade-in">
                                    <p className="text-[10px] font-bold text-red-800 uppercase font-mono">Solicitar Diligência de Pendência</p>
                                    <div className="flex flex-wrap gap-2">
                                      {['portal_cliente', 'whatsapp', 'email', 'outro'].map(ch => (
                                        <label key={ch} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer">
                                          <input 
                                            type="checkbox"
                                            checked={valState.channels?.includes(ch)}
                                            onChange={() => {
                                              const currentList = valState.channels || [];
                                              const nextList = currentList.includes(ch)
                                                ? currentList.filter((x: string) => x !== ch)
                                                : [...currentList, ch];
                                              setVal({ channels: nextList });
                                            }}
                                            className="rounded text-red-500 focus:ring-0"
                                          />
                                          <span>{ch === 'portal_cliente' ? 'Portal do Cliente' : ch.toUpperCase()}</span>
                                        </label>
                                      ))}
                                    </div>
                                    {valState.channels?.includes('outro') && (
                                      <input 
                                        type="text" 
                                        placeholder="Falar outro canal" 
                                        value={valState.outro || ''}
                                        onChange={(e) => setVal({ outro: e.target.value })}
                                        className="w-full px-2 py-1 bg-white border rounded text-xs font-semibold outline-none"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ACTIVE PENDENCIES PANEL */}
                  <div className="space-y-1 border-t pt-3">
                    <p className="text-xs font-extrabold text-gray-800 font-mono">Existem provas pendentes no caso empresarial?</p>
                    <div className="flex gap-4">
                      {['sim', 'nao'].map(o => (
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-semibold text-gray-700">
                          <input type="radio" checked={wizardState.q5_y_pendentes === o} onChange={() => saveWizardStateUpdate({ q5_y_pendentes: o })} />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                    {wizardState.q5_y_pendentes === 'sim' && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-950 text-xs font-semibold space-y-1 animate-in fade-in">
                        <span className="font-extrabold text-[10px] uppercase text-red-800 tracking-tight font-mono block">Painel Resumido de Pendências Ativas</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-red-900 font-medium">
                          {wizardState.q1_3 === 'nao' && <li>Falta assinatura Procuração PJ (Doc. 01)</li>}
                          {(wizardState.q2_1 === 'sim' && wizardState.q2_4 === 'nao') && <li>Falta assinatura Balancete/Declaração PJ (Doc. 02)</li>}
                          {wizardState.q3_4 === 'nao' && <li>Falta assinatura Contrato de Honorários Corporativo</li>}
                          {requests.filter(req => wizardState.q5_provas?.[req.id]?.received === 'nao').map(req => (
                            <li key={req.id}>Pendente receber: {req.title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* TRIGGER NOTIFICATION */}
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-gray-850">Deseja abrir cobrança automática à diretoria?</p>
                    <div className="flex gap-4">
                      {['sim', 'nao'].map(o => (
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-semibold text-gray-700">
                          <input type="radio" checked={wizardState.q5_z_solicitacao_automatica === o} onChange={() => saveWizardStateUpdate({ q5_z_solicitacao_automatica: o })} />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                    {wizardState.q5_z_solicitacao_automatica === 'sim' && (
                      <div className="bg-indigo-50/50 rounded-xl p-3 border space-y-2 animate-in fade-in text-xs font-semibold">
                        <span className="text-[9px] font-mono uppercase text-indigo-700 block">Escolher Canais de Contato Jurídico/PJ</span>
                        <div className="flex gap-3">
                          {['portal_cliente', 'whatsapp', 'email'].map(c => (
                            <label key={c} className="flex items-center gap-1">
                              <input 
                                type="checkbox"
                                checked={wizardState.q5_z_channels?.includes(c)}
                                onChange={() => handleCheckboxToggle('q5_z_channels', c)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-0"
                              />
                              <span className="capitalize">{c === 'portal_cliente' ? 'Portal PJ' : c}</span>
                            </label>
                          ))}
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { 
                            setSuccess('Cobrança de pendência automática corporativa emitida!'); 
                            setTimeout(() => setSuccess(null), 2000); 
                          }} 
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg font-mono text-[10px] uppercase font-black tracking-wider"
                        >
                          Gerar Notificação Corporativa
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* FLOW ACTIONS FOOTER */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  disabled={!wizardState.q5_1 || (wizardState.q5_1 === 'sim' && requests.length === 0)}
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
