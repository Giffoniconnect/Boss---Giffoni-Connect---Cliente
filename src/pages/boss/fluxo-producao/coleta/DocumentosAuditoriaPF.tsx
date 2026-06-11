import React, { useState } from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import { 
  ArrowRight, FileText, ArrowLeft, Check, AlertCircle, 
  AlertTriangle, CheckCircle, FileSearch, Save, Loader2 
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export default function DocumentosAuditoriaPF() {
  const {
    caseId,
    fetching,
    saving,
    setSaving,
    error,
    setError,
    success,
    setSuccess,
    clientName,
    caseObj,
    requests,
    wizardState,
    saveWizardStateUpdate,
    navigate
  } = useColetaState();

  // Metrics calculation
  let totalExpected = 5; // procuracao-generated, procuracao-signed, contrato-generated, contrato-signed, rg/cpf/residencia (counts as 1)
  let received = 0;

  if (wizardState.q1_1 === 'sim') received++;
  if (wizardState.q1_3 === 'sim') received++;
  
  if (wizardState.q2_1 === 'sim') {
    totalExpected += 2; // declaracao-generated, declaracao-signed
    if (wizardState.q2_2 === 'sim') received++;
    if (wizardState.q2_4 === 'sim') received++;
  }

  if (wizardState.q3_1 === 'sim') received++;
  if (wizardState.q3_4 === 'sim') received++;

  // Minimum core documents count
  const minDocsChecked = (wizardState.q4_rg === 'sim' ? 1 : 0) + 
                         (wizardState.q4_cpf === 'sim' ? 1 : 0) + 
                         (wizardState.q4_residencia === 'sim' ? 1 : 0);
  received += (minDocsChecked / 3); // normalized contribution

  // Custom requests
  if (wizardState.q5_1 === 'sim' && requests.length > 0) {
    totalExpected += requests.length;
    requests.forEach(r => {
      const isOk = wizardState.q5_provas?.[r.id]?.received === 'sim';
      if (isOk) received++;
    });
  }

  const roundedReceived = Math.min(Math.round(received), totalExpected);
  const integrityPercent = totalExpected > 0 ? Math.round((roundedReceived / totalExpected) * 105) : 100;
  const integrityCapped = Math.min(integrityPercent, 100);

  const handleFinalizeAll = async () => {
    setError(null);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'cases', caseId), {
        'solicitacoesProvasWizardState.step6_completed': true,
        'solicitacoesProvasWizardState.finalizedAt': new Date().toISOString(),
        coletaStatus: 'concluida',
        statusProvas: 'concluido'
      });
      setSuccess('Parabéns! Coleta de documentos física finalizada e auditada com sucesso!');
      setTimeout(() => {
        navigate(`/boss-giffoni-clientes/fluxo-producao`);
      }, 2000);
    } catch (err: any) {
      setError(`Erro ao finalizar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FluxoStepLayout 
      stepName="Coleta de Documentos" 
      caseId={caseId}
      coletaSubetapasStep="documentos-auditoria"
      tipoPessoa="PF"
      wizardState={wizardState}
    >
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Subetapa 06 — Auditoria da Coleta de Provas — Pessoa Física (PF)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{clientName}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Subetapa 06 — Auditoria da Coleta de Provas
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-necessidade-PF`)}
            className="p-2 bg-gray-50 border border-gray-150 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
          >
            <ArrowLeft size={13} className="mr-1" /> Voltar às Provas
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
                <AlertCircle size={14} className="text-red-00 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-950 text-xs font-bold flex gap-2 items-center">
                <Check className="text-emerald-500 shrink-0" size={14} />
                <span>{success}</span>
              </div>
            )}

            {/* METRICS OVERVIEW */}
            <div className="bg-white border rounded-3xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-black uppercase text-gray-900 font-mono border-b pb-1.5">Resumo de Auditoria Documental</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-750">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-bold">Inscrição</span>
                  <span className="text-gray-900 block mt-0.5 font-extrabold">PESSOA FÍSICA</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-bold">Caso de Produção</span>
                  <span className="text-gray-900 block mt-0.5">#{caseId?.slice(0, 8)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-bold">Total Esperado</span>
                  <span className="text-gray-900 block mt-0.5 font-bold font-mono">{totalExpected} itens</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-indigo-500 block font-bold">Integridade Coletas</span>
                  <span className="text-indigo-700 block mt-0.5 font-black font-mono text-sm">{integrityCapped}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${integrityCapped}%` }} />
              </div>
            </div>

            {/* FLOW ACCORDION COMPILATIONS */}
            <div className="space-y-4">
              
              {/* Procuracao PF Summary */}
              <div className="bg-white border border-gray-150 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-indigo-950 uppercase font-mono border-b pb-1">6.1 — Procuração Jurídica (Compilado)</h4>
                <div className="text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span>{wizardState.q1_1 === 'sim' ? '✅' : '❌'}</span>
                    <span>Procuração gerada {wizardState.q1_1 === 'sim' ? '(Docx Ativo)' : 'pendente'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{wizardState.q1_3 === 'sim' ? '✅' : '❌'}</span>
                    <span>Assinatura coletada do cliente PF</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{(wizardState.procuracaoFiles || []).length > 0 ? '✅' : '❌'}</span>
                    <span>Anexo persistido na pasta</span>
                  </div>
                </div>
              </div>

              {/* Declaracao PF Summary */}
              <div className="bg-white border border-gray-150 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-indigo-950 uppercase font-mono border-b pb-1 font-semibold">6.2 — Declaração de Hipossuficiência</h4>
                {wizardState.q2_1 === 'nao' ? (
                  <div className="text-xs font-semibold text-gray-500 italic">Cliente isento de declaração (taxa ordinária paga)</div>
                ) : (
                  <div className="text-xs font-semibold space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span>{wizardState.q2_2 === 'sim' ? '✅' : '❌'}</span>
                      <span>Declaração gerada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{wizardState.q2_4 === 'sim' ? '✅' : '❌'}</span>
                      <span>Assinatura coletada</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contrato honorários Summary */}
              <div className="bg-white border border-gray-150 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-indigo-950 uppercase font-mono border-b pb-1 font-semibold">6.3 — Contrato de Honorários</h4>
                <div className="text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span>{wizardState.q3_1 === 'sim' ? '✅' : '❌'}</span>
                    <span>Contrato gerado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{wizardState.q3_4 === 'sim' ? '✅' : '❌'}</span>
                    <span>Contrato assinado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{wizardState.q3_7 === 'sim' ? '✅' : '⚠️'}</span>
                    <span>Notificação transmitida à Controladoria Financeira</span>
                  </div>
                </div>
              </div>

              {/* Minimum required documents PF */}
              <div className="bg-white border border-gray-150 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-indigo-950 uppercase font-mono border-b pb-1 font-semibold">6.4 — Documentos Mínimos PF</h4>
                <div className="text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-1.5"><span>{wizardState.q4_rg === 'sim' ? '✅' : '❌'}</span> <span>RG recebido</span></div>
                  <div className="flex items-center gap-1.5 ml-4 text-[11px] text-gray-500">
                    <span>{wizardState.q4_solicitar_digitalizacao_rg === 'sim' ? '📲 Solicitar digitalização do RG: SIM' : '📲 Solicitar digitalização do RG: NÃO'}</span>
                  </div>
                  <div className="flex items-center gap-1.5"><span>{wizardState.q4_cpf === 'sim' ? '✅' : '❌'}</span> <span>CPF recebido</span></div>
                  <div className="flex items-center gap-1.5"><span>{wizardState.q4_residencia === 'sim' ? '✅' : '❌'}</span> <span>Residência recebido</span></div>
                  <div className="flex items-center gap-1.5 ml-4 text-[11px] text-gray-500">
                    <span>{wizardState.q4_solicitar_digitalizacao_residencia === 'sim' ? '📲 Solicitar digitalização do Comprovante de Residência: SIM' : '📲 Solicitar digitalização do Comprovante de Residência: NÃO'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* INTEGRITY AND DISPATCH REMINDERS */}
            {roundedReceived < totalExpected && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                  <span className="text-[10px] font-black uppercase text-amber-850 tracking-wider font-mono">6.5 — Cobrança de Dependências Ativas</span>
                </div>
                
                <div className="bg-white border rounded-lg p-2.5 font-mono text-[10px] text-gray-700 block select-all whitespace-pre-wrap">
                  {"Prezado cliente, identificamos documentos pendentes em nosso controle cadastral. Favor providenciar o envio:\n" +
                    (wizardState.q1_3 !== 'sim' ? "* Procuração Ad Judicia assinada\n" : "") +
                    (wizardState.q2_1 === 'sim' && wizardState.q2_4 !== 'sim' ? "* Declaração de Hipossuficiência assinada\n" : "") +
                    (wizardState.q3_4 !== 'sim' ? "* Contrato de Honorários assinado\n" : "") +
                    requests.filter(req => wizardState.q5_provas?.[req.id]?.received !== 'sim').map(r => `* ${r.title}\n`).join('')
                  }
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setSuccess('Chamado de pendência disparado com sucesso ao cliente PF!'); setTimeout(() => setSuccess(null), 2500); }} 
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Enviar Notificação de Cobrança
                  </button>
                </div>
              </div>
            )}

            {/* FINAL VALIDATION FIELD */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-950 space-y-3">
              <span className="text-[10px] uppercase font-mono font-black text-emerald-800 tracking-wider block">Validação de Coleta Integral</span>
              <p className="text-xs leading-relaxed font-semibold">Os arquivos físicos e digitais do cliente Pessoa Física encontram-se plenamente auditados na controladoria de provas do escritório Priscilla Giffoni.</p>
              
              <button
                type="button"
                disabled={saving}
                onClick={handleFinalizeAll}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-[0.99] cursor-pointer"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <><span>Finalizar Auditoria & Avançar Fluxo</span><ArrowRight size={14} /></>}
              </button>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex flex-col sm:flex-row justify-between pt-4 border-t border-gray-150 gap-3">
              <button
                type="button"
                onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
                className="px-5 py-3 border border-gray-250 hover:bg-gray-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Save size={13} /> Fechar e Sair sem Finalizar
              </button>
            </div>

          </div>
        )}

      </div>
    </FluxoStepLayout>
  );
}
