import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { ArrowLeft, ArrowRight, Save, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

export default function PrazosFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [caseObj, setCaseObj] = useState<any>(null);

  const [prazoMarked, setPrazoMarked] = useState(false);
  const [prazoQual, setPrazoQual] = useState('');
  const [prazoFatal, setPrazoFatal] = useState('');
  const [prazoResponsavel, setPrazoResponsavel] = useState('');
  const [prazoSeguranca, setPrazoSeguranca] = useState('');
  const [prazoDependeClienteInfo, setPrazoDependeClienteInfo] = useState(false);
  const [prazoQualInfo, setPrazoQualInfo] = useState('');
  const [prazoDependeClienteProva, setPrazoDependeClienteProva] = useState(false);
  const [prazoQualProva, setPrazoQualProva] = useState('');

  useEffect(() => {
    if (!caseId) return;

    async function fetchData() {
      try {
        setLoading(true);
        const caseRef = doc(db, 'cases', caseId!);
        const caseSnap = await getDoc(caseRef);

        if (caseSnap.exists()) {
          const cData = caseSnap.data();
          setCaseObj(cData);
          
          const rawProtocol = cData.protocol || {};
          setPrazoMarked(rawProtocol.prazoMarked ?? false);
          setPrazoQual(rawProtocol.prazoQual || '');
          setPrazoFatal(rawProtocol.prazoFatal || '');
          setPrazoResponsavel(rawProtocol.prazoResponsavel || '');
          setPrazoSeguranca(rawProtocol.prazoSeguranca || '');
          setPrazoDependeClienteInfo(rawProtocol.prazoDependeClienteInfo ?? false);
          setPrazoQualInfo(rawProtocol.prazoQualInfo || '');
          setPrazoDependeClienteProva(rawProtocol.prazoDependeClienteProva ?? false);
          setPrazoQualProva(rawProtocol.prazoQualProva || '');
        }
      } catch (err: any) {
        setError(`Erro ao carregar dados: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [caseId]);

  const handleSave = async (action: 'none' | 'advance' | 'exit' = 'none') => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const caseRef = doc(db, 'cases', caseId!);
      const protocolUpdates = {
        prazoMarked,
        prazoQual,
        prazoFatal,
        prazoResponsavel,
        prazoSeguranca,
        prazoDependeClienteInfo,
        prazoQualInfo,
        prazoDependeClienteProva,
        prazoQualProva
      };

      await updateDoc(caseRef, {
        'protocol.prazoMarked': protocolUpdates.prazoMarked,
        'protocol.prazoQual': protocolUpdates.prazoQual,
        'protocol.prazoFatal': protocolUpdates.prazoFatal,
        'protocol.prazoResponsavel': protocolUpdates.prazoResponsavel,
        'protocol.prazoSeguranca': protocolUpdates.prazoSeguranca,
        'protocol.prazoDependeClienteInfo': protocolUpdates.prazoDependeClienteInfo,
        'protocol.prazoQualInfo': protocolUpdates.prazoQualInfo,
        'protocol.prazoDependeClienteProva': protocolUpdates.prazoDependeClienteProva,
        'protocol.prazoQualProva': protocolUpdates.prazoQualProva,
      });

      setSuccess('Prazos salvos com sucesso!');

      if (action === 'exit') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      } else if (action === 'advance') {
        navigate(flowRoutes.agendarAudiencias(caseId!));
      }
    } catch (err: any) {
      setError(`Erro ao salvar prazos: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Prazos" caseId={caseId}>
        <div className="p-16 text-center text-gray-400">Carregando...</div>
      </FluxoStepLayout>
    );
  }

  return (
    <FluxoStepLayout
      stepName="Prazos"
      caseId={caseId}
      statusText={caseObj?.statusInterno || 'Em andamento'}
    >
      <div className="space-y-8 font-sans">
        {error && (
          <div className="p-5 bg-red-50 border border-red-150 rounded-2xl text-red-955 text-xs flex gap-3 items-center">
            <AlertCircle size={18} className="text-red-650 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-5 bg-emerald-50 border border-emerald-150 rounded-2xl text-emerald-950 text-xs flex gap-3 items-center">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        <div className="border border-gray-150 rounded-3xl p-6 bg-white shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} /> Prazos Processuais
              </h3>
              <p className="text-xs text-gray-400 mt-1">Tem prazo em andamento para este caso?</p>
            </div>
            <div className="flex gap-1.5 border border-gray-200 p-1.5 rounded-2xl bg-gray-50/50">
              <button
                type="button"
                onClick={() => setPrazoMarked(true)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  prazoMarked ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setPrazoMarked(false)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !prazoMarked ? 'bg-gray-250 text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Não
              </button>
            </div>
          </div>

          {prazoMarked && (
            <div className="space-y-5 animate-in slide-in-from-top-3 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Qual prazo está aberto?</label>
                  <input
                    type="text"
                    value={prazoQual}
                    onChange={(e) => setPrazoQual(e.target.value)}
                    placeholder="Ex: Réplica, manifestação sobre o laudo"
                    className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-red-500">PRAZO FATAL *</label>
                  <input
                    type="date"
                    value={prazoFatal}
                    onChange={(e) => setPrazoFatal(e.target.value)}
                    className="w-full bg-white border border-red-200 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Responsável</label>
                  <input
                    type="text"
                    value={prazoResponsavel}
                    onChange={(e) => setPrazoResponsavel(e.target.value)}
                    placeholder="Nome"
                    className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-600">PRAZO SEGURANÇA *</label>
                  <input
                    type="date"
                    value={prazoSeguranca}
                    onChange={(e) => setPrazoSeguranca(e.target.value)}
                    className="w-full bg-white border border-indigo-200 text-indigo-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                  />
                </div>
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 border border-indigo-100 rounded-2xl bg-indigo-50/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-indigo-950 uppercase">Depende de INFO do cliente?</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setPrazoDependeClienteInfo(true)} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${prazoDependeClienteInfo ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>Sim</button>
                        <button type="button" onClick={() => setPrazoDependeClienteInfo(false)} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${!prazoDependeClienteInfo ? 'bg-gray-600 text-white' : 'bg-white text-gray-500'}`}>Não</button>
                      </div>
                    </div>
                    {prazoDependeClienteInfo && (
                      <input type="text" value={prazoQualInfo} onChange={(e) => setPrazoQualInfo(e.target.value)} placeholder="Descreva a info" className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px]" />
                    )}
                  </div>
                  <div className="p-3.5 border border-purple-100 rounded-2xl bg-purple-50/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-purple-950 uppercase">Depende de PROVAS do cliente?</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setPrazoDependeClienteProva(true)} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${prazoDependeClienteProva ? 'bg-purple-600 text-white' : 'bg-white text-gray-500'}`}>Sim</button>
                        <button type="button" onClick={() => setPrazoDependeClienteProva(false)} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${!prazoDependeClienteProva ? 'bg-gray-600 text-white' : 'bg-white text-gray-500'}`}>Não</button>
                      </div>
                    </div>
                    {prazoDependeClienteProva && (
                      <input type="text" value={prazoQualProva} onChange={(e) => setPrazoQualProva(e.target.value)} placeholder="Descreva a prova" className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px]" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.controladoria(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            Voltar para Controladoria
          </button>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('none')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <Save size={13} />
              {saving ? 'Gravando...' : 'Salvar Prazos'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('exit')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 hover:bg-gray-50 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              Salvar e Sair
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('advance')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-7 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
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
