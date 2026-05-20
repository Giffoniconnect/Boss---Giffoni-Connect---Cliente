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
  Settings,
  Database,
  CloudLightning,
  Sparkles,
  RefreshCw,
  FolderOpen,
  CalendarDays
} from 'lucide-react';

const DEFAULT_PORTAL_LINK = 'https://aistudio.google.com/apps/93c62126-a17f-4c18-8bc7-d327df1ca6b5?showPreview=true&showAssistant=true';

type ConfigSubTab = 'links' | 'conectores';

export default function Configuracoes() {
  const [activeSubTab, setActiveSubTab] = useState<ConfigSubTab>('links');
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

  // States for Conectores
  const [apiConectors, setApiConectors] = useState({
    stripeKey: '',
    stripeWebhookSecret: '',
    asaasToken: '',
    todoistToken: '',
    googleDriveFolderId: '',
    googleCalendarId: ''
  });

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

        // Fetch API Conectors
        const connectorsSnap = await getDoc(doc(db, 'settings', 'api_connectors'));
        if (connectorsSnap.exists()) {
          setApiConectors((prev) => ({
            ...prev,
            ...connectorsSnap.data()
          }));
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
      if (activeSubTab === 'links') {
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
        setPortalLink(sanitizedPortalLink);
        setSectorsLinks(cleanedSectors);
      } else {
        // Save Connectors to Firestore
        await setDoc(doc(db, 'settings', 'api_connectors'), {
          ...apiConectors,
          updatedAt: serverTimestamp()
        });
      }

      setFeedback({ type: 'success', message: 'Configurações atualizadas com sucesso na nuvem do sistema!' });
    } catch (err) {
      console.error('Error saving settings:', err);
      
      if (activeSubTab === 'links') {
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
      }

      setFeedback({ type: 'error', message: 'Erro ao salvar em nuvem. Configurações mantidas sob controle local.' });
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

  const handleConnectorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiConectors(prev => ({ ...prev, [name]: value }));
  };

  const handleRestoreDefaults = () => {
    if (activeSubTab === 'links') {
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
    } else {
      setApiConectors({
        stripeKey: '',
        stripeWebhookSecret: '',
        asaasToken: '',
        todoistToken: '',
        googleDriveFolderId: '',
        googleCalendarId: ''
      });
    }
  };

  return (
    <BossLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Painel de Configurações</h2>
          <p className="text-sm text-gray-500">Administração de links úteis, fluxos de canais e parametrização fática de conectores para APIs.</p>
        </div>

        {/* Dynamic sub-tab switcher */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-150 inline-flex">
          <button
            onClick={() => setActiveSubTab('links')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'links' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            Redirecionamentos
          </button>
          <button
            onClick={() => setActiveSubTab('conectores')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'conectores' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            Conectores de APIs
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {loading ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 p-12 shadow-sm text-center">
            <div className="flex flex-col items-center gap-4 text-gray-400 font-sans">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
              <span className="text-sm font-bold uppercase tracking-widest">Sincronizando configurações...</span>
            </div>
          </div>
        ) : (
          <>
            {activeSubTab === 'links' && (
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
              </>
            )}

            {activeSubTab === 'conectores' && (
              <>
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-3 text-amber-900">
                  <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wider font-sans">Aviso Geral de Conexões</p>
                    <p className="text-xs font-semibold leading-relaxed">
                      Chaves secretas, tokens de infraestrutura de webhook e credenciais operacionais requerem a ativação de barramento server-side proxy seguro. Se desconectado de suas respectivas instâncias, os fluxos fáticos operam em ambiente isolado (sandbox local) de livre digitação para os operadores.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Módulos de Pagamento (Validador)</h3>
                      <p className="text-xs text-gray-500">Credenciais para Stripe e Asaas S.A.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">Stripe Secret API Key</label>
                      <input
                        type="password"
                        name="stripeKey"
                        value={apiConectors.stripeKey}
                        onChange={handleConnectorChange}
                        placeholder="sk_live_..."
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">Stripe Webhook Secret Signature</label>
                      <input
                        type="password"
                        name="stripeWebhookSecret"
                        value={apiConectors.stripeWebhookSecret}
                        onChange={handleConnectorChange}
                        placeholder="whsec_..."
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">Asaas Access Token (Sandbox/Produção)</label>
                      <input
                        type="password"
                        name="asaasToken"
                        value={apiConectors.asaasToken}
                        onChange={handleConnectorChange}
                        placeholder="$asaas_token_hash_value..."
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <CloudLightning size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Operacionais & Drive Cloud</h3>
                      <p className="text-xs text-gray-500">Mapeamento para Todoist, Calendário e Google Drive.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">Todoist API Authentication Token</label>
                      <input
                        type="password"
                        name="todoistToken"
                        value={apiConectors.todoistToken}
                        onChange={handleConnectorChange}
                        placeholder="Mapeamento de tarefas e projetos operacionais..."
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">ID da Pasta Raiz - Google Drive</label>
                      <input
                        type="text"
                        name="googleDriveFolderId"
                        value={apiConectors.googleDriveFolderId}
                        onChange={handleConnectorChange}
                        placeholder="ex: 182hw10_92A-sks..."
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">ID Google Calendar Corporativo</label>
                      <input
                        type="text"
                        name="googleCalendarId"
                        value={apiConectors.googleCalendarId}
                        onChange={handleConnectorChange}
                        placeholder="ex: primary ou c_xxxx@group.calendar.google.com"
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

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
                    {feedback.type === 'success' ? 'Sucesso' : 'Erro de Comunicação'}
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
                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest cursor-pointer"
              >
                Limpar Campos Atuais
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-gray-200 disabled:opacity-50 cursor-pointer"
              >
                <Save size={18} />
                {saving ? 'Gravando dados...' : 'Salvar Configurações'}
              </button>
            </div>
          </>
        )}
      </form>
    </BossLayout>
  );
}
