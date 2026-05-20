import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Scale, Milestone, HelpCircle, ChevronRight } from 'lucide-react';

interface EstruturacaoStepProps {
  caseId: string;
  onNext: () => void;
  onSetLoading: (loading: boolean) => void;
  onAlert: (msg: string) => void;
}

export default function EstruturacaoStep({ caseId, onNext, onSetLoading, onAlert }: EstruturacaoStepProps) {
  const [strategy, setStrategy] = useState({
    fatosFundamentos: '',
    estrategiaJuridica: '',
    competenciaJurisdicional: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadStrategy() {
      onSetLoading(true);
      try {
        const caseDoc = await getDoc(doc(db, 'cases', caseId));
        if (caseDoc.exists()) {
          const data = caseDoc.data();
          setStrategy({
            fatosFundamentos: data.fatosFundamentos || '',
            estrategiaJuridica: data.estrategiaJuridica || '',
            competenciaJurisdicional: data.competenciaJurisdicional || ''
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        onSetLoading(false);
      }
    }
    loadStrategy();
  }, [caseId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStrategy(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'cases', caseId), {
        ...strategy,
        updatedStage: 'estruturacao',
        productionStage: 'delegacao',
        updatedAt: serverTimestamp()
      });
      onAlert('Estrutura de tese e estratégia jurídica gravadas com êxito!');
      onNext();
    } catch (err) {
      console.error(err);
      onAlert('Não foi possível gravar a estruturação técnica.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleNext} className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
          <Scale size={18} className="text-blue-600" /> EDRP: Estruturação Jurídica da Tese e Fatos
        </h4>
        <p className="text-xs text-gray-500 font-semibold leading-relaxed">
          Defina as diretrizes fundamentais que os operadores operacionais devem observar durante a elaboração das peças.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Fatos Narrados e Fundamentos Legais</label>
            <textarea
              name="fatosFundamentos"
              rows={4}
              value={strategy.fatosFundamentos}
              onChange={handleChange}
              placeholder="Descreva a narrativa fática relevante e as premissas essenciais..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Estratégia Processual Definida</label>
            <textarea
              name="estrategiaJuridica"
              rows={4}
              value={strategy.estrategiaJuridica}
              onChange={handleChange}
              placeholder="Descreva os teses de preclusão, teses defensivas e pedidos secundários..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Jurisdição e Competência Territorial</label>
            <textarea
              name="competenciaJurisdicional"
              rows={3}
              value={strategy.competenciaJurisdicional}
              onChange={handleChange}
              placeholder="Súmulas aplicáveis, teses de foro competente e prevenção..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-8 py-3 rounded-xl flex items-center gap-2 transition-all"
        >
          {isSaving ? 'Salvando...' : 'Confirmar e Prosseguir'}
          <ChevronRight size={18} />
        </button>
      </div>
    </form>
  );
}
