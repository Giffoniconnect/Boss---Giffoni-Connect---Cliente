import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { BossLayout } from '../../../components/Layout';
import { 
  FolderOpen, 
  ArrowLeft, 
  Save, 
  ExternalLink,
  Workflow,
  ArrowRight,
  Database,
  CloudLightning,
  AlertCircle,
  Check,
  X,
  Info
} from 'lucide-react';

export default function GoogleDriveIntegration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buildUrl, setBuildUrl] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const docSnap = await getDoc(doc(db, 'settings', 'connectors'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.googleDrive && data.googleDrive.buildUrl) {
            setBuildUrl(data.googleDrive.buildUrl);
          }
        }
      } catch (err) {
        console.error('Erro ao ler Google Drive de settings/connectors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const urlValue = buildUrl.trim();
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDrive: {
          buildUrl: urlValue,
          status: urlValue ? 'ativo' : 'não_configurado'
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setFeedback({ type: 'success', message: 'URL do Build Google Drive salva com sucesso!' });
    } catch (err: any) {
      console.error('Erro ao salvar Google Drive:', err);
      setFeedback({ type: 'error', message: `Erro ao salvar configurações: ${err.message || err}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BossLayout>
        <div className="flex-1 p-6 md:p-10 flex items-center justify-center bg-gray-50 text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-amber-600 rounded-full animate-spin"></div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Sincronizando Google Drive...</span>
          </div>
        </div>
      </BossLayout>
    );
  }

  const isConfigured = buildUrl.trim().length > 0;

  return (
    <BossLayout>
      <div className="flex-1 p-6 md:p-10 space-y-6 max-w-4xl mx-auto">
        {/* Navigation Breadcrumb & Back button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button 
              onClick={() => navigate('/boss-giffoni-clientes/configuracoes')}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Voltar para Configurações
            </button>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <FolderOpen size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Google Drive</h2>
                <p className="text-xs text-gray-500 font-medium">Atalho Operacional e Configuração do Build Externo</p>
              </div>
            </div>
          </div>

          <div>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase border tracking-wider rounded-lg ${
              isConfigured 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
              {isConfigured ? 'Ponte Ativa' : 'Não Configurado'}
            </span>
          </div>
        </div>

        {/* Informational Panel: The Decision Explanation */}
        <div className="bg-slate-900 border border-slate-950 p-6 rounded-[2rem] flex gap-4 text-slate-100 shadow-xl">
          <Info size={24} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2 col-span-11">
            <p className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">Ponte de Integração Ativa • Modelo Desacoplado</p>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              O Portal BOSS não armazena credenciais confidenciais ou se conecta diretamente ao Google Drive por questões de segurança. A operação é delegada a um build externo e seguro.
            </p>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              “As credenciais, pasta destino, autenticação e testes reais do Google Drive são configurados exclusivamente no build Google Drive.”
            </p>
          </div>
        </div>

        {/* Visual Architecture Diagram */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Como funciona o fluxo de integração:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center pt-2">
            
            {/* Step 1 */}
            <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 text-center space-y-1">
              <Database className="w-5 h-5 mx-auto text-blue-600" />
              <p className="text-[11px] font-black uppercase tracking-tight text-gray-800">Portal BOSS</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Gera os dados e envia payload do cliente</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center text-gray-400">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Step 2 */}
            <div className="bg-amber-50/55 border border-amber-150 rounded-2xl p-4 text-center space-y-1">
              <CloudLightning className="w-5 h-5 mx-auto text-amber-600 animate-pulse" />
              <p className="text-[11px] font-black uppercase tracking-tight text-amber-900">Build Google Drive</p>
              <p className="text-[10px] text-amber-800 font-medium leading-tight">Recebe, processa e cria/localiza pasta no Drive</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center text-gray-400">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Step 3 */}
            <div className="bg-emerald-50/40 border border-emerald-150 rounded-2xl p-4 text-center space-y-1">
              <FolderOpen className="w-5 h-5 mx-auto text-emerald-600" />
              <p className="text-[11px] font-black uppercase tracking-tight text-emerald-950">Retorno & Sincronia</p>
              <p className="text-[10px] text-emerald-800 font-medium leading-tight">Devolve o UID/link e o BOSS salva no cadastro</p>
            </div>

          </div>
        </div>

        {/* Core Quick Form Card */}
        <form onSubmit={handleSave} className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">URL do Build Google Drive / API URL *</label>
              <input
                type="url"
                required
                value={buildUrl}
                onChange={(e) => setBuildUrl(e.target.value)}
                placeholder="https://aistudio.google.com/apps/e39f8816-ffed-4965-babb-f904b4e36102"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
              />
              <p className="text-[10px] text-gray-500 leading-relaxed font-semibold">
                Utilize o endpoint ou URL do Applet secundário para onde o Portal BOSS enviará as solicitações de criação de pasta.
              </p>
            </div>
          </div>

          {feedback && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-950 border border-emerald-250 animate-fadeIn' : 'bg-rose-50 text-rose-950 border border-rose-250 animate-fadeIn'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{feedback.message}</span>
              </div>
              <button type="button" onClick={() => setFeedback(null)}>
                <X size={14} className="opacity-60 hover:opacity-100" />
              </button>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-5 border-t border-gray-150 flex flex-wrap items-center justify-between gap-4">
            <a
              href="https://aistudio.google.com/apps/e39f8816-ffed-4965-babb-f904b4e36102?showPreview=true&showAssistant=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-xl transition flex items-center gap-2 border border-slate-200 shadow-xs cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>Abrir Build Google Drive</span>
            </a>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Save size={14} />
              <span>{saving ? 'Gravando...' : 'Salvar URL do Build'}</span>
            </button>
          </div>
        </form>
      </div>
    </BossLayout>
  );
}
