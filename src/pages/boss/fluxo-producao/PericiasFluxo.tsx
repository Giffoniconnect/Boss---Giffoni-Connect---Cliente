import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { ArrowLeft, ArrowRight, Save, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

export default function PericiasFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [caseObj, setCaseObj] = useState<any>(null);

  const [periciaMarked, setPericiaMarked] = useState(false);
  const [periciaDate, setPericiaDate] = useState('');
  const [periciaTime, setPericiaTime] = useState('');
  const [periciaLocal, setPericiaLocal] = useState('');
  const [periciaPerito, setPericiaPerito] = useState('');
  const [periciaType, setPericiaType] = useState('presencial');
  const [periciaEscritorioComparecer, setPericiaEscritorioComparecer] = useState(false);

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
          setPericiaMarked(rawProtocol.periciaMarked ?? false);
          setPericiaDate(rawProtocol.periciaDate || '');
          setPericiaTime(rawProtocol.periciaTime || '');
          setPericiaLocal(rawProtocol.periciaLocal || '');
          setPericiaPerito(rawProtocol.periciaPerito || '');
          setPericiaType(rawProtocol.periciaType || 'presencial');
          setPericiaEscritorioComparecer(rawProtocol.periciaEscritorioComparecer ?? false);
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

      await updateDoc(caseRef, {
        'protocol.periciaMarked': periciaMarked,
        'protocol.periciaDate': periciaDate,
        'protocol.periciaTime': periciaTime,
        'protocol.periciaLocal': periciaLocal,
        'protocol.periciaPerito': periciaPerito,
        'protocol.periciaType': periciaType,
        'protocol.periciaEscritorioComparecer': periciaEscritorioComparecer,
      });

      setSuccess('Perícia salva com sucesso!');

      if (action === 'exit') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      } else if (action === 'advance') {
        navigate(flowRoutes.relatorioIntegridade(caseId!));
      }
    } catch (err: any) {
      setError(`Erro ao salvar perícia: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Perícias" caseId={caseId}>
        <div className="p-16 text-center text-gray-400">Carregando...</div>
      </FluxoStepLayout>
    );
  }

  return (
    <FluxoStepLayout
      stepName="Perícias"
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
                <Activity size={16} /> Perícias Judiciais
              </h3>
              <p className="text-xs text-gray-400 mt-1">Tem perícia agendada para este caso?</p>
            </div>
            <div className="flex gap-1.5 border border-gray-200 p-1.5 rounded-2xl bg-gray-50/50">
              <button
                type="button"
                onClick={() => setPericiaMarked(true)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  periciaMarked ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setPericiaMarked(false)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !periciaMarked ? 'bg-gray-250 text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Não
              </button>
            </div>
          </div>

          {periciaMarked && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in slide-in-from-top-3 duration-200">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Dia da Perícia</label>
                <input
                  type="date"
                  value={periciaDate}
                  onChange={(e) => setPericiaDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Horário</label>
                <input
                  type="time"
                  value={periciaTime}
                  onChange={(e) => setPericiaTime(e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Perito Responsável</label>
                <input
                  type="text"
                  value={periciaPerito}
                  onChange={(e) => setPericiaPerito(e.target.value)}
                  placeholder="Expert designado pelo juiz"
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-semibold placeholder-gray-300"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Local da Perícia</label>
                <input
                  type="text"
                  value={periciaLocal}
                  onChange={(e) => setPericiaLocal(e.target.value)}
                  placeholder="Clínica, IML, ou endereço de vistoria"
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder-gray-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Modalidade de Perícia</label>
                <div className="flex gap-2 border border-gray-150 p-1 rounded-xl bg-gray-50/55 h-[38px] items-center">
                  <button type="button" onClick={() => setPericiaType('presencial')} className={`flex-1 text-center text-[11px] font-bold py-1 rounded-lg ${periciaType === 'presencial' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>Presencial</button>
                  <button type="button" onClick={() => setPericiaType('online')} className={`flex-1 text-center text-[11px] font-bold py-1 rounded-lg ${periciaType === 'online' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>Online</button>
                </div>
              </div>
              <div className="md:col-span-3 flex items-center gap-3 bg-indigo-50/50 p-3.5 border border-indigo-100 rounded-2xl">
                <input
                  type="checkbox"
                  id="periciaEscritorioComparecer"
                  checked={periciaEscritorioComparecer}
                  onChange={(e) => setPericiaEscritorioComparecer(e.target.checked)}
                  className="w-4.5 h-4.5 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer text-indigo-600"
                />
                <label htmlFor="periciaEscritorioComparecer" className="text-xs text-indigo-900 font-bold select-none cursor-pointer">
                  O escritório precisa comparecer faticamente para assistir judicialmente o cliente?
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.agendarAudiencias(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            Voltar para Audiências
          </button>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('none')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <Save size={13} />
              {saving ? 'Gravando...' : 'Salvar Perícia'}
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
