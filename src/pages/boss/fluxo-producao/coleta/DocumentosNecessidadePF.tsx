import React, { useState } from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Check, AlertCircle, PlusCircle, AlertTriangle, Send 
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export default function DocumentosNecessidadePF() {
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

  const filteredRequests = (requests || []).filter(req => {
    const t = (req.title || '').toLowerCase();
    return !t.includes('procuração') && !t.includes('declaração') && !t.includes('contrato');
  });

  // New Evidence Request fields
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDocNum, setNewDocNum] = useState('');
  const [newJustification, setNewJustification] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [evidenceType, setEvidenceType] = useState('Prova documental');
  const [periciaType, setPericiaType] = useState('Trabalhista');
  const [hireTechnicalAssistant, setHireTechnicalAssistant] = useState('nao');

  const updatePrefilledValues = (type: string, pType: string, assistant: string) => {
    setEvidenceType(type);
    setPericiaType(pType);
    setHireTechnicalAssistant(assistant);

    if (type === 'Prova documental') {
      setNewTitle('Prova Documental');
      setNewDocNum('DOC-01');
      setNewDesc('Favor apresentar cópia legível dos documentos correlatos.');
      setNewJustification('');
    } else if (type === 'Prova Testemunhal') {
      setNewTitle('Prova Testemunhal');
      setNewDocNum('TESTEMUNHA-01');
      setNewDesc('Favor indicar o rol de testemunhas com nome completo, CPF, RG, endereço e telefone.');
      setNewJustification('Necessário comprovar os fatos alegados por meio de oitiva de testemunhas.');
    } else if (type === 'Prova Depoimento Pessoal') {
      setNewTitle('Prova Depoimento Pessoal');
      setNewDocNum('DEP-PESSOAL-01');
      setNewDesc('Favor se preparar para o depoimento pessoal em juízo. Para a intimação da parte adversa ou realização do ato, deve-se recolher custas caso não tenha gratuidade deferida.');
      setNewJustification('Recolher custas caso não tenha gratuidade deferida.');
    } else if (type === 'Prova de audio') {
      setNewTitle('Prova de Áudio');
      setNewDocNum('AUDIO-01');
      setNewDesc('Favor encaminhar arquivos de áudio relevantes (ex: conversas ou gravações).');
      setNewJustification('Comprovação de conversas e tratativas mantidas pelas partes.');
    } else if (type === 'Prova de vídeo') {
      setNewTitle('Prova de Vídeo');
      setNewDocNum('VIDEO-01');
      setNewDesc('Favor encaminhar arquivos de vídeo relevantes para comprovação dos fatos.');
      setNewJustification('Demonstração visual de fatos narrados na petição inicial.');
    } else if (type === 'Prova audiovisual') {
      setNewTitle('Prova Audiovisual');
      setNewDocNum('AV-01');
      setNewDesc('Favor encaminhar gravações audiovisuais completas para fins de instrução processual.');
      setNewJustification('Produção de prova conjunta de áudio e imagem para elucidação do juízo.');
    } else if (type === 'Prova Pericial') {
      setNewTitle(`Prova Pericial - ${pType}`);
      setNewDocNum('PERICIA-01');
      setNewDesc(`Diligência de perícia técnica do tipo ${pType}. Contratação de assistente técnico: ${assistant === 'sim' ? 'Sim' : 'Não'}.`);
      setNewJustification(`Elaboração de laudo pericial para análise técnica especializada (${pType}).`);
    }
  };

  const handleNextPhase = () => {
    saveWizardStateUpdate({ step5_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-auditoria-PF`);
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
        justification: newJustification.trim(),
        evidenceType: evidenceType,
        periciaType: evidenceType === 'Prova Pericial' ? periciaType : null,
        hireTechnicalAssistant: evidenceType === 'Prova Pericial' ? hireTechnicalAssistant : null,
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
      setSuccess('Solicitação de prova complementar incluída!');
      setTimeout(() => setSuccess(null), 2500);

      setNewTitle('');
      setNewDesc('');
      setNewDocNum('');
      setNewJustification('');
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
        <label className="group flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-2.5 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer">
          <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-0.5" size={16} />
          <span className="text-[10px] font-bold text-gray-700">Anexar Documento de Prova (PDF)</span>
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
    <FluxoStepLayout 
      stepName="Coleta de Documentos" 
      caseId={caseId}
      coletaSubetapasStep="documentos-necessidade"
      tipoPessoa="PF"
      wizardState={wizardState}
    >
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Subetapa 05 — Outras Provas do Cliente — Pessoa Física (PF)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{client?.pfDadosPessoais?.pf_nomeCompleto || 'PF'}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Subetapa 05 — Outras Provas do Cliente
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-minimos-PF`)}
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
                <p className="text-xs font-extrabold text-gray-800">5.1 Existem outros documentos ou provas específicas a serem solicitadas?</p>
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
                      <span>{o === 'sim' ? 'Sim (Exige Provas de Mérito)' : 'Não'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {wizardState.q5_1 === 'sim' && (
                <div className="space-y-6 border-l-2 border-indigo-200 pl-4 animate-in fade-in duration-200">
                    {/* FORM TO ADD NEW CUSTOM REQUEST IN MODAL */}
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center space-y-2">
                      <p className="text-xs font-bold text-indigo-950">Selecione o tipo de prova e os detalhes correspondentes</p>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsModalOpen(true);
                          updatePrefilledValues('Prova documental', 'Trabalhista', 'nao');
                        }}
                        disabled={saving}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <PlusCircle size={14} />
                        <span>Adicionar Solicitação de Prova</span>
                      </button>
                    </div>

                  {/* CHECK LIST DE OUTRAS PROVAS SOLICITADAS */}
                  <div className="space-y-5">
                    <div className="border-b border-gray-150 pb-2 flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-indigo-950 font-mono tracking-wider block">
                        Check List de outras provas solicitadas
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">
                        Controle de Integridade e Custódia
                      </span>
                    </div>

                    <div className="space-y-6">
                      
                      {/* Card - Outras Provas do cliente */}
                      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                          <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">
                            Card - Outras Provas do cliente
                          </h4>
                        </div>

                        {filteredRequests.length > 0 ? (
                          <div className="space-y-4">
                            {filteredRequests.map((req) => {
                              const valState = wizardState.q5_provas?.[req.id] || { received: 'nao' };
                              const setVal = (updatesSub: any) => {
                                const nextProvas = {
                                  ...wizardState.q5_provas,
                                  [req.id]: { ...valState, ...updatesSub }
                                };
                                saveWizardStateUpdate({ q5_provas: nextProvas });
                              };

                              return (
                                <div key={req.id} className="p-4 bg-white border border-gray-150 rounded-xl space-y-3 shadow-4xs text-left">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <span className="text-[9px] bg-indigo-100 text-indigo-805 px-1.5 py-0.5 rounded font-mono font-bold block w-max uppercase mb-1">
                                        {req.documentNumber || 'Doc. Adicional'}
                                      </span>
                                      <h4 className="text-xs font-black text-gray-900">{req.title}</h4>
                                      <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">{req.description}</p>
                                      
                                      {req.evidenceType && (
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                                            {req.evidenceType}
                                          </span>
                                          {req.evidenceType === 'Prova Pericial' && req.periciaType && (
                                            <span className="text-[9px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                                              Perícia: {req.periciaType}
                                            </span>
                                          )}
                                          {req.evidenceType === 'Prova Pericial' && req.hireTechnicalAssistant && (
                                            <span className="text-[9px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                                              Assistente Técnico: {req.hireTechnicalAssistant === 'sim' ? 'Sim' : 'Não'}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {req.evidenceType === 'Prova Depoimento Pessoal' && (
                                        <div className="mt-1.5 p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-900 text-[10px] font-semibold flex gap-1 items-center">
                                          <AlertTriangle size={12} className="text-amber-600" />
                                          <span>Recolher custas caso não tenha gratuidade deferida</span>
                                        </div>
                                      )}

                                      {req.justification && (
                                        <p className="text-[11px] text-gray-400 font-semibold italic mt-1.5 leading-relaxed bg-gray-50/55 p-2 rounded-lg border border-gray-100/55">
                                          <strong>Justificativa para exigir a prova:</strong> {req.justification}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2 border-t border-gray-100 pt-2.5">
                                    <div className="space-y-1">
                                      <p className="text-[11px] font-black text-gray-855">Você já recebeu esse documento?</p>
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
                                        <p className="text-[11px] font-bold text-gray-800">Deseja anexar esse documento agora?</p>
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
                        ) : (
                          <div className="p-4 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400 font-semibold leading-relaxed font-sans">
                            Nenhum pedido de prova complementar elaborado nesta etapa.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* ACTIVE PENDENCIES PANEL */}
                  <div className="space-y-1 border-t pt-3">
                    <p className="text-xs font-extrabold text-gray-800 font-mono">Existem provas pendentes no caso?</p>
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
                          {wizardState.q1_3 === 'nao' && <li>Falta assinatura Procuração (Doc. 01)</li>}
                          {(wizardState.q2_1 === 'sim' && wizardState.q2_4 === 'nao') && <li>Falta assinatura Declaração (Doc. 02)</li>}
                          {wizardState.q3_4 === 'nao' && <li>Falta assinatura Contrato de Honorários</li>}
                          {filteredRequests.filter(req => wizardState.q5_provas?.[req.id]?.received === 'nao').map(req => (
                            <li key={req.id}>Pendente receber: {req.title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* TRIGGER NOTIFICATION */}
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-gray-800">Deseja abrir solicitação automática ao cliente?</p>
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
                        <span className="text-[9px] font-mono uppercase text-indigo-700 block">Escolher Canais Disponíveis</span>
                        <div className="flex gap-3">
                          {['portal_cliente', 'whatsapp', 'email'].map(c => (
                            <label key={c} className="flex items-center gap-1">
                              <input 
                                type="checkbox"
                                checked={wizardState.q5_z_channels?.includes(c)}
                                onChange={() => handleCheckboxToggle('q5_z_channels', c)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-0"
                              />
                              <span className="capitalize">{c === 'portal_cliente' ? 'Portal' : c}</span>
                            </label>
                          ))}
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { 
                            setSuccess('Diligência de cobrança automática disparada!'); 
                            setTimeout(() => setSuccess(null), 2000); 
                          }} 
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg font-mono text-[10px] uppercase font-black tracking-wider"
                        >
                          Gerar Notificação para Cliente
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-200 block font-bold">Portal BOSS</span>
                <h2 className="text-sm font-black uppercase tracking-tight">Adicionar Solicitação de Prova</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-indigo-200 hover:text-white bg-indigo-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body - SCROLLABLE */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Type selection - OBRIGATÓRIA VERTICAL */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Tipo de Prova</label>
                <select
                  value={evidenceType}
                  onChange={(e) => {
                    const selectedType = e.target.value;
                    updatePrefilledValues(selectedType, periciaType, hireTechnicalAssistant);
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Prova documental">Prova documental</option>
                  <option value="Prova Testemunhal">Prova Testemunhal</option>
                  <option value="Prova Depoimento Pessoal">Prova Depoimento Pessoal</option>
                  <option value="Prova de audio">Prova de áudio</option>
                  <option value="Prova de vídeo">Prova de vídeo</option>
                  <option value="Prova audiovisual">Prova audiovisual</option>
                  <option value="Prova Pericial">Prova Pericial</option>
                </select>
              </div>

              {/* Warning note for Prova Depoimento Pessoal */}
              {evidenceType === 'Prova Depoimento Pessoal' && (
                <div className="p-3 bg-amber-50 border border-amber-250 rounded-xl text-amber-900 text-[11px] font-semibold flex gap-2 items-start text-left">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>Atenção: É necessário recolher as custas da intimação/ato de depoimento pessoal caso a gratuidade não tenha sido deferida no processo.</span>
                </div>
              )}

              {/* Prova Pericial fields - MUST be vertical following guidelines */}
              {evidenceType === 'Prova Pericial' && (
                <div className="space-y-3 p-4 bg-gray-50 border border-gray-150 rounded-2xl animate-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-gray-500 block">Tipo de Perícia</label>
                    <select
                      value={periciaType}
                      onChange={(e) => {
                        const pt = e.target.value;
                        setPericiaType(pt);
                        updatePrefilledValues('Prova Pericial', pt, hireTechnicalAssistant);
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Trabalhista">Trabalhista</option>
                      <option value="Bancária">Bancária</option>
                      <option value="Consumerista">Consumerista</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-gray-500 block">Se irá contratar assistente técnico</label>
                    <div className="flex gap-4 mt-1">
                      {['sim', 'nao'].map((val) => (
                        <label key={val} className="flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase text-gray-700">
                          <input
                            type="radio"
                            name="hireTechnicalAssistant"
                            value={val}
                            checked={hireTechnicalAssistant === val}
                            onChange={() => {
                              setHireTechnicalAssistant(val);
                              updatePrefilledValues('Prova Pericial', periciaType, val);
                            }}
                            className="text-indigo-600 focus:ring-0"
                          />
                          <span>{val === 'sim' ? 'Sim' : 'Não'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Identificador / Número do Documento */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Identificador / Número do Documento / Prova</label>
                <input 
                  type="text" 
                  placeholder="Ex: Doc. 05, Doc. Complementar, TESTEMUNHA-01" 
                  value={newDocNum}
                  onChange={(e) => setNewDocNum(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Título do Documento */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Título do Documento / Prova</label>
                <input 
                  type="text" 
                  placeholder="Ex: Prontuário Médico, Extrato Bancário" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Descrição / Instruções p/ obtenção */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Descrição e Instruções para Obtenção</label>
                <textarea 
                  placeholder="Descreva detalhes ou caminhos para obtenção ou preparação destas provas." 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 min-h-[70px]"
                />
              </div>

              {/* Justificativa para exigir a prova */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-gray-500 block">Justificativa para exigir a prova</label>
                <textarea 
                  placeholder="Informe a fundamentação técnica ou justificativa jurídica para exigir esta prova." 
                  value={newJustification}
                  onChange={(e) => setNewJustification(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 min-h-[70px]"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 flex gap-3 justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-250 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-750 transition-colors cursor-pointer"
                type="button"
              >
                Cancelar
              </button>
              <button 
                onClick={async (e) => {
                  await handleAddEvidence(e);
                  setIsModalOpen(false);
                }}
                type="button"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>Confirmar e Adicionar</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </FluxoStepLayout>
  );
}
