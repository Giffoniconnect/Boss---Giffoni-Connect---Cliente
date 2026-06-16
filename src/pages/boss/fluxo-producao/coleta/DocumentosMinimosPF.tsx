import React from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import { useAuth } from '../../../../contexts/AuthContext';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Check, AlertCircle 
} from 'lucide-react';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

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
    navigate,
    driveFolderId,
    driveFolderUrl,
    hasDriveFolder
  } = useColetaState();

  const [dateError, setDateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const dateStr = wizardState.q4_residencia_data;
    if (!dateStr) {
      setDateError(null);
      return;
    }
    try {
      const date = new Date(dateStr + 'T00:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 90) {
        setDateError("O comprovante de residência inserido tem mais de 90 dias de emissão. Documentos antigos não são aceitos pelo sistema. Por favor, forneça um comprovante recente.");
      } else if (diffDays < 0) {
        setDateError("A data do comprovante de residência não pode ser no futuro.");
      } else {
        setDateError(null);
      }
    } catch (e) {
      setDateError(null);
    }
  }, [wizardState.q4_residencia_data]);

  const handleNextPhase = () => {
    if (wizardState.q4_residencia === 'sim') {
      if (!wizardState.q4_residencia_data) {
        alert("Por favor, preencha a data do comprovante de residência.");
        return;
      }
      if (dateError) {
        alert("O comprovante de residência é inválido ou está vencido (mais de 90 dias). Por favor, corrija a data para continuar.");
        return;
      }
    }
    saveWizardStateUpdate({ step4_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-necessidade-PF`);
    });
  };

  const FileUploadBox = ({ field, labelText }: { field: string, labelText: string }) => {
    const files = wizardState[field] || [];
    const [uploading, setUploading] = React.useState(false);
    const [uploadError, setUploadError] = React.useState<string | null>(null);
    const [uploadSuccessMsg, setUploadSuccessMsg] = React.useState<string | null>(null);

    const { googleAccessToken, loginWithGoogle } = useAuth();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const name = file.name;
      const sizeBytes = file.size;
      const sizeStr = (sizeBytes / 1024 / 1024).toFixed(2) + ' MB';

      setUploading(true);
      setUploadError(null);
      setUploadSuccessMsg(null);

      try {
        const base64 = await fileToBase64(file);
        
        // Determine Google Drive folder ID
        const targetFolder = (driveFolderId || '1YUl0Z3hbptBaXfdp0vSnvGTQv0ChsPMs').trim();

        const response = await fetch('/api/google-docs/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            folderId: targetFolder,
            fileName: name,
            fileBase64: base64,
            mimeType: file.type,
            googleAccessToken: googleAccessToken || localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken')
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.errorMessage || 'Falha ao enviar arquivo para o Google Drive');
        }

        // Successfully uploaded! Add it to Local Wizard State
        await addWizardFile(field, name, sizeStr);
        setUploadSuccessMsg(`Arquivo enviado com sucesso para a pasta do Google Drive!`);
      } catch (err: any) {
        console.error("[FileUpload] Error detail:", err);
        setUploadError(err.message || 'Erro desconhecido ao enviar arquivo.');
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="space-y-2 mt-1">
        <label className={`group flex flex-col items-center justify-center border border-dashed rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer ${uploading ? 'border-indigo-400 pointer-events-none' : 'border-gray-300 hover:border-indigo-500'}`}>
          {uploading ? (
            <div className="flex flex-col items-center py-1">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-1"></div>
              <span className="text-[10px] text-indigo-600 font-bold">Enviando automaticamente para a pasta do G-Drive...</span>
            </div>
          ) : (
            <>
              <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-1" size={20} />
              <span className="text-[11px] font-bold text-gray-750">{labelText}</span>
            </>
          )}
          <input 
            type="file" 
            className="hidden" 
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>

        {uploadError && (
          <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1 bg-red-50 border border-red-150 p-2 rounded-xl">
            <AlertCircle size={12} className="shrink-0" />
            <div className="flex-1">
              <span>{uploadError}</span>
              {(uploadError.includes("expirou") || uploadError.includes("autorização") || uploadError.includes("sessão")) ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await loginWithGoogle('boss_admin');
                      setUploadError(null);
                    } catch (loginErr: any) {
                      setUploadError(`Falha na autenticação: ${loginErr.message}`);
                    }
                  }}
                  className="block text-indigo-700 underline font-black uppercase tracking-wider text-[10px] mt-1 hover:text-indigo-900 cursor-pointer"
                >
                  Conectar / Renovar Sessão Google
                </button>
              ) : null}
            </div>
          </div>
        )}

        {uploadSuccessMsg && (
          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-150 p-2 rounded-xl animate-fade-in animate-duration-150">
            <Check size={12} className="text-emerald-600 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

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
      coletaSubetapasStep="documentos-minimos"
      tipoPessoa="PF"
      wizardState={wizardState}
    >
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Subetapa 04 — Pessoa Física (PF)
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
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-6">
              
              <div className="space-y-6">
                
                {/* RG SECTION */}
                <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-xs font-extrabold text-gray-800">4.1.1 - RG do cliente recebido?</p>
                  <div className="flex gap-4">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="q4_rg" 
                          checked={wizardState.q4_rg === o} 
                          onChange={() => saveWizardStateUpdate({ q4_rg: o })} 
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                      </label>
                    ))}
                  </div>

                  {wizardState.q4_rg === 'sim' && (
                    <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs font-extrabold text-gray-850">4.1.2 - Como o RG do cliente foi recebido?</p>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { key: 'fisico', label: 'Físico' },
                          { key: 'whatsapp', label: 'What’s App' },
                          { key: 'email', label: 'Email' },
                          { key: 'outro', label: 'Outro' }
                        ].map(opt => (
                          <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-700">
                            <input 
                              type="radio" 
                              name="q4_rg_como_recebido" 
                              checked={wizardState.q4_rg_como_recebido === opt.key} 
                              onChange={() => saveWizardStateUpdate({ q4_rg_como_recebido: opt.key })} 
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      {wizardState.q4_rg_como_recebido === 'fisico' && (
                        <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                          <p className="text-xs font-extrabold text-gray-855">4.1.3 - Deseja digitalizar o RG agora?</p>
                          <div className="flex gap-4">
                            {['sim', 'nao'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                                <input 
                                  type="radio" 
                                  name="q4_rg_digitalizar_agora" 
                                  checked={wizardState.q4_rg_digitalizar_agora === o} 
                                  onChange={() => {
                                    const updates: any = { q4_rg_digitalizar_agora: o };
                                    if (o === 'sim') {
                                      updates.q4_anexar_pf = 'sim';
                                    }
                                    saveWizardStateUpdate(updates);
                                  }} 
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                              </label>
                            ))}
                          </div>

                          {wizardState.q4_rg_digitalizar_agora === 'sim' && (
                            <div className="bg-white border border-dashed border-gray-200 p-4 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                              <span className="text-[10px] uppercase font-bold text-indigo-600">4.1.4 - Anexar RG</span>
                              <FileUploadBox field="rgFiles" labelText="Anexar RG" />
                            </div>
                          )}

                          {wizardState.q4_rg_digitalizar_agora === 'nao' && (
                            <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                              <p className="text-xs font-extrabold text-gray-855">4.1.5 - Solicitar Digitalização do RG?</p>
                              <div className="flex gap-4">
                                {['sim', 'nao'].map(o => (
                                  <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                                    <input 
                                      type="radio" 
                                      name="q4_solicitar_digitalizacao_rg" 
                                      checked={wizardState.q4_solicitar_digitalizacao_rg === o} 
                                      onChange={() => saveWizardStateUpdate({ q4_solicitar_digitalizacao_rg: o })} 
                                      className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CPF SECTION */}
                <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-xs font-extrabold text-gray-800">4.2.1 - CNH do cliente recebido?</p>
                  <div className="flex gap-4">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="q4_cpf" 
                          checked={wizardState.q4_cpf === o} 
                          onChange={() => saveWizardStateUpdate({ q4_cpf: o })} 
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                      </label>
                    ))}
                  </div>

                  {wizardState.q4_cpf === 'sim' && (
                    <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs font-extrabold text-gray-855">4.2.2 - Como a CNH do cliente foi recebida?</p>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { key: 'fisico', label: 'Físico' },
                          { key: 'whatsapp', label: 'What’s App' },
                          { key: 'email', label: 'Email' },
                          { key: 'outro', label: 'Outro' }
                        ].map(opt => (
                          <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-700">
                            <input 
                              type="radio" 
                              name="q4_cpf_como_recebido" 
                              checked={wizardState.q4_cpf_como_recebido === opt.key} 
                              onChange={() => saveWizardStateUpdate({ q4_cpf_como_recebido: opt.key })} 
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      {wizardState.q4_cpf_como_recebido === 'fisico' && (
                        <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                          <p className="text-xs font-extrabold text-gray-855">4.2.3 - Deseja digitalizar a CNH agora?</p>
                          <div className="flex gap-4">
                            {['sim', 'nao'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                                <input 
                                  type="radio" 
                                  name="q4_cpf_digitalizar_agora" 
                                  checked={wizardState.q4_cpf_digitalizar_agora === o} 
                                  onChange={() => {
                                    const updates: any = { q4_cpf_digitalizar_agora: o };
                                    if (o === 'sim') {
                                      updates.q4_anexar_pf = 'sim';
                                    }
                                    saveWizardStateUpdate(updates);
                                  }} 
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                              </label>
                            ))}
                          </div>

                          {wizardState.q4_cpf_digitalizar_agora === 'sim' && (
                            <div className="bg-white border border-dashed border-gray-200 p-4 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                              <span className="text-[10px] uppercase font-bold text-indigo-600">4.2.4 - Anexar CNH</span>
                              <FileUploadBox field="cpfFiles" labelText="Anexar CNH" />
                            </div>
                          )}

                          {wizardState.q4_cpf_digitalizar_agora === 'nao' && (
                            <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                              <p className="text-xs font-extrabold text-gray-855">4.2.5 - Solicitar Digitalização da CNH?</p>
                              <div className="flex gap-4">
                                {['sim', 'nao'].map(o => (
                                  <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                                    <input 
                                      type="radio" 
                                      name="q4_solicitar_digitalizacao_cpf" 
                                      checked={wizardState.q4_solicitar_digitalizacao_cpf === o} 
                                      onChange={() => saveWizardStateUpdate({ q4_solicitar_digitalizacao_cpf: o })} 
                                      className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* COMPROVANTE DE RESIDÊNCIA SECTION */}
                <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-xs font-extrabold text-gray-800">4.3.1 - Comprovante de residência do cliente recebido?</p>
                  <div className="flex gap-4">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="q4_residencia" 
                          checked={wizardState.q4_residencia === o} 
                          onChange={() => saveWizardStateUpdate({ q4_residencia: o })} 
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                      </label>
                    ))}
                  </div>

                  {wizardState.q4_residencia === 'sim' && (
                    <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs font-extrabold text-gray-850">4.3.2 - Como o Comprovante de residência do cliente foi recebido?</p>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { key: 'fisico', label: 'Físico' },
                          { key: 'whatsapp', label: 'What’s App' },
                          { key: 'email', label: 'Email' },
                          { key: 'outro', label: 'Outro' }
                        ].map(opt => (
                          <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-700">
                            <input 
                              type="radio" 
                              name="q4_residencia_como_recebido" 
                              checked={wizardState.q4_residencia_como_recebido === opt.key} 
                              onChange={() => saveWizardStateUpdate({ q4_residencia_como_recebido: opt.key })} 
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      {wizardState.q4_residencia_como_recebido === 'fisico' && (
                        <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                          <p className="text-xs font-extrabold text-gray-855">4.3.3 - Deseja digitalizar o Comprovante de residência agora?</p>
                          <div className="flex gap-4">
                            {['sim', 'nao'].map(o => (
                              <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                                <input 
                                  type="radio" 
                                  name="q4_residencia_digitalizar_agora" 
                                  checked={wizardState.q4_residencia_digitalizar_agora === o} 
                                  onChange={() => {
                                    const updates: any = { q4_residencia_digitalizar_agora: o };
                                    if (o === 'sim') {
                                      updates.q4_anexar_pf = 'sim';
                                    }
                                    saveWizardStateUpdate(updates);
                                  }} 
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                              </label>
                            ))}
                          </div>

                          {wizardState.q4_residencia_digitalizar_agora === 'sim' && (
                            <div className="bg-white border border-dashed border-gray-200 p-4 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                              <span className="text-[10px] uppercase font-bold text-indigo-600">4.3.4 - Anexar Comprovante de residência</span>
                              <FileUploadBox field="residenciaFiles" labelText="Anexar Comprovante de residência" />
                            </div>
                          )}

                          {wizardState.q4_residencia_digitalizar_agora === 'nao' && (
                            <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-in fade-in duration-200">
                              <p className="text-xs font-extrabold text-gray-855">4.3.5 - Solicitar Digitalização do Comprovante de residência?</p>
                              <div className="flex gap-4">
                                {['sim', 'nao'].map(o => (
                                  <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                                    <input 
                                      type="radio" 
                                      name="q4_solicitar_digitalizacao_residencia" 
                                      checked={wizardState.q4_solicitar_digitalizacao_residencia === o} 
                                      onChange={() => saveWizardStateUpdate({ q4_solicitar_digitalizacao_residencia: o })} 
                                      className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* RESIDENCE DATE PICKER */}
                      <div className="pt-4 border-t border-gray-200 space-y-2 animate-in fade-in duration-200">
                        <p className="text-xs font-extrabold text-gray-800">4.3.4 - Qual a data do comprovante de residência?</p>
                        <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                          Aviso: O comprovante de residência deve ser de prazo inferior a 90 dias. Comprovantes de residência antigos não são aceitos pelo sistema.
                        </span>
                        <div className="flex flex-col gap-2 max-w-xs">
                          <input 
                            type="date" 
                            value={wizardState.q4_residencia_data || ''} 
                            onChange={(e) => saveWizardStateUpdate({ q4_residencia_data: e.target.value })} 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-gray-950 focus:bg-white focus:ring-1 focus:ring-gray-900 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                          />
                        </div>

                        {dateError && (
                          <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-medium flex gap-2 items-center animate-in slide-in-from-top-1 duration-150">
                            <AlertCircle size={14} className="text-rose-600 shrink-0" />
                            <span>{dateError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>

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
    </FluxoStepLayout>
  );
}
