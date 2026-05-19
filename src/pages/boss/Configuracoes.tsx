import React, { useEffect, useState } from 'react';
import { BossLayout } from '../../components/Layout';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  Save, 
  Link, 
  Check, 
  AlertCircle, 
  Megaphone, 
  Handshake, 
  PiggyBank, 
  Scale, 
  Heart, 
  Cpu, 
  Target,
  Settings
} from 'lucide-react';

const DEFAULT_PORTAL_LINK = 'https://aistudio.google.com/apps/93c62126-a17f-4c18-8bc7-d327df1ca6b5?showPreview=true&showAssistant=true';

export default function Configuracoes() {
  const [portalLink, setPortalLink] = useState(DEFAULT_PORTAL_LINK);
  const [sectorsLinks, setSectorsLinks] = useState({
    marketing: '',
    comercial: '',
    financeiro: '',
    juridico: '',
    rh: '',
    operacional: '',
    estrategico: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        // Fetch Portal Link
        const portalSnap = await getDoc(doc(db, 'settings', 'portal'));
        if (portalSnap.exists()) {
          const data = portalSnap.data();
          if (data.link) {
            setPortalLink(data.link);
          }
        }

        // Fetch Sectors Links
        const sectorsSnap = await getDoc(doc(db, 'settings', 'sectors'));
        if (sectorsSnap.exists()) {
          const data = sectorsSnap.data();
          setSectorsLinks((prev) => ({
            ...prev,
            ...data
          }));
        } else {
          // LocalStorage fallback
          const localSectors = localStorage.getItem('giffoni_sectors_links');
          if (localSectors) {
            setSectorsLinks(JSON.parse(localSectors));
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        // Resilient fallback for both
        const localSectors = localStorage.getItem('giffoni_sectors_links');
        if (localSectors) {
          setSectorsLinks(JSON.parse(localSectors));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    let sanitizedPortalLink = portalLink.trim();
    if (!sanitizedPortalLink) {
      sanitizedPortalLink = DEFAULT_PORTAL_LINK;
    }

    try {
      // 1. Save Portal Link to Firestore
      await setDoc(doc(db, 'settings', 'portal'), {
        link: sanitizedPortalLink,
        updatedAt: serverTimestamp(),
      });

      // 2. Save Sectors Links to Firestore
      const cleanedSectors = {
        marketing: sectorsLinks.marketing.trim(),
        comercial: sectorsLinks.comercial.trim(),
        financeiro: sectorsLinks.financeiro.trim(),
        juridico: sectorsLinks.juridico.trim(),
        rh: sectorsLinks.rh.trim(),
        operacional: sectorsLinks.operacional.trim(),
        estrategico: sectorsLinks.estrategico.trim(),
      };

      await setDoc(doc(db, 'settings', 'sectors'), {
        ...cleanedSectors,
        updatedAt: serverTimestamp(),
      });

      // 3. Backup in LocalStorage
      localStorage.setItem('giffoni_sectors_links', JSON.stringify(cleanedSectors));

      setFeedback({ type: 'success', message: 'Configurações de rede e setores salvas com sucesso!' });
      setPortalLink(sanitizedPortalLink);
      setSectorsLinks(cleanedSectors);
    } catch (err) {
      console.error('Error saving settings:', err);
      
      // Attempt LocalStorage write on db error to guarantee client persistence
      try {
        const cleanedSectors = {
          marketing: sectorsLinks.marketing.trim(),
          comercial: sectorsLinks.comercial.trim(),
          financeiro: sectorsLinks.financeiro.trim(),
          juridico: sectorsLinks.juridico.trim(),
          rh: sectorsLinks.rh.trim(),
          operacional: sectorsLinks.operacional.trim(),
          estrategico: sectorsLinks.estrategico.trim(),
        };
        localStorage.setItem('giffoni_sectors_links', JSON.stringify(cleanedSectors));
      } catch (backupErr) {}

      try {
        handleFirestoreError(err, OperationType.WRITE, 'settings');
      } catch (e) {}

      setFeedback({ type: 'error', message: 'Erro ao salvar em nuvem. Configurações salvas localmente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSectorChange = (sectorId: keyof typeof sectorsLinks, value: string) => {
    setSectorsLinks(prev => ({
      ...prev,
      [sectorId]: value
    }));
  };

  const handleRestoreDefaults = () => {
    setPortalLink(DEFAULT_PORTAL_LINK);
    setSectorsLinks({
      marketing: '',
      comercial: '',
      financeiro: '',
      juridico: '',
      rh: '',
      operacional: '',
      estrategico: ''
    });
  };

  return (
    <BossLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Configurações do Sistema</h2>
        <p className="text-gray-500">Ajuste os links de redirecionamento, portal do cliente e setores do escritório.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {loading ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 p-12 shadow-sm text-center">
            <div className="flex flex-col items-center gap-4 text-gray-400 font-sans">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
              <span className="text-sm font-bold uppercase tracking-widest">Carregando configurações...</span>
            </div>
          </div>
        ) : (
          <>
            {/* PORTAL DO CLIENTE */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Link size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Portal do Cliente</h3>
                  <p className="text-xs text-gray-500">Link público do card inicial.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Link do Card "Portal do Cliente" (Home)
                  </label>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    Cole o link para onde o cliente deve ser direcionado ao clicar no card correspondente na página principal.
                  </p>
                  <input
                    type="url"
                    value={portalLink}
                    onChange={(e) => setPortalLink(e.target.value)}
                    placeholder="https://exemplo.com/portal..."
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO SETORES DO ESCRITÓRIO */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Configuração de Links dos Setores</h3>
                  <p className="text-xs text-gray-500">Defina os links dos painéis e as builds de cada setor.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Marketing */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Megaphone size={16} className="text-purple-500" />
                    Marketing
                  </label>
                  <input
                    type="url"
                    value={sectorsLinks.marketing}
                    onChange={(e) => handleSectorChange('marketing', e.target.value)}
                    placeholder="Sem link configurado (vazio)"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                  />
                </div>

                {/* Comercial */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Handshake size={16} className="text-blue-500" />
                    Comercial
                  </label>
                  <input
                    type="url"
                    value={sectorsLinks.comercial}
                    onChange={(e) => handleSectorChange('comercial', e.target.value)}
                    placeholder="Sem link configurado (vazio)"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                  />
                </div>

                {/* Financeiro */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <PiggyBank size={16} className="text-emerald-500" />
                    Financeiro
                  </label>
                  <input
                    type="url"
                    value={sectorsLinks.financeiro}
                    onChange={(e) => handleSectorChange('financeiro', e.target.value)}
                    placeholder="Sem link configurado (vazio)"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                  />
                </div>

                {/* Jurídico Interno */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Scale size={16} className="text-amber-500" />
                    Jurídico Interno
                  </label>
                  <input
                    type="url"
                    value={sectorsLinks.juridico}
                    onChange={(e) => handleSectorChange('juridico', e.target.value)}
                    placeholder="Sem link configurado (vazio)"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                  />
                </div>

                {/* RH */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Heart size={16} className="text-rose-500" />
                    RH
                  </label>
                  <input
                    type="url"
                    value={sectorsLinks.rh}
                    onChange={(e) => handleSectorChange('rh', e.target.value)}
                    placeholder="Sem link configurado (vazio)"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                  />
                </div>

                {/* Operacional */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Cpu size={16} className="text-indigo-500" />
                    Operacional
                  </label>
                  <input
                    type="url"
                    value={sectorsLinks.operacional}
                    onChange={(e) => handleSectorChange('operacional', e.target.value)}
                    placeholder="Sem link configurado (vazio)"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                  />
                </div>

                {/* Estratégico */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Target size={16} className="text-cyan-500" />
                    Estratégico
                  </label>
                  <input
                    type="url"
                    value={sectorsLinks.estrategico}
                    onChange={(e) => handleSectorChange('estrategico', e.target.value)}
                    placeholder="Sem link configurado (vazio)"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* FEEDBACK STATUS */}
            {feedback && (
              <div
                className={`flex items-start gap-3 p-5 rounded-[1.5rem] border transition-all ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <Check className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                )}
                <div>
                  <h4 className="text-sm font-extrabold uppercase tracking-wide mb-1">
                    {feedback.type === 'success' ? 'Sucesso' : 'Operação Limitada'}
                  </h4>
                  <p className="text-xs font-medium leading-relaxed">{feedback.message}</p>
                </div>
              </div>
            )}

            {/* FOOTER CONTROLS */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
              >
                Limpar Todos os Links
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-gray-200 disabled:opacity-50 cursor-pointer"
              >
                <Save size={18} />
                {saving ? 'Gravando Alterações...' : 'Salvar Configurações'}
              </button>
            </div>
          </>
        )}
      </form>
    </BossLayout>
  );
}
