import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { BossLayout } from '../../../components/Layout';
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Play, 
  Terminal, 
  AlertCircle, 
  Check, 
  X,
  Info,
  Layers,
  Scale,
  Briefcase,
  FileCheck,
  DollarSign,
  Fingerprint,
  Archive
} from 'lucide-react';

interface GoogleDocsConfig {
  status: 'não_configurado' | 'preparado' | 'em_teste' | 'ativo' | 'erro';
  templatesStrategy: string;
  notes: string;
}

export default function GoogleDocsIntegration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Connection fields
  const [config, setConfig] = useState<GoogleDocsConfig>({
    status: 'não_configurado',
    templatesStrategy: 'standard_procuracao',
    notes: ''
  });

  // Simulated logs
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const docSnap = await getDoc(doc(db, 'settings', 'connectors'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.googleDocs) {
            setConfig({
              status: data.googleDocs.status || 'não_configurado',
              templatesStrategy: data.googleDocs.templatesStrategy || '',
              notes: data.googleDocs.notes || ''
            });
          }
        }
      } catch (err) {
        console.error('Erro ao ler Google Docs de settings/connectors:', err);
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
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDocs: {
          status: config.status,
          templatesStrategy: config.templatesStrategy.trim(),
          notes: config.notes.trim()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setFeedback({ type: 'success', message: 'Configurações de integração com Google Docs salvas na nuvem com sucesso!' });
      
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [
        ...prev,
        `[${timestamp}] Configurações atualizadas e gravadas com sucesso no Firestore.`
      ]);
    } catch (err: any) {
      console.error('Erro ao salvar Google Docs:', err);
      setFeedback({ type: 'error', message: `Erro ao salvar configurações: ${err.message || err}` });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = () => {
    setTesting(true);
    const timestamp = new Date().toLocaleTimeString();
    
    const newLogs = [
      `[${timestamp}] Inicializando aperto de mão lógico com Google Docs API...`,
      `[${timestamp}] Verificando token de serviço e credenciais OAuth...`,
      `[${timestamp}] Carregando modelo base ID: [${config.templatesStrategy || 'Não fornecido'}]...`,
      `[${timestamp}] Teste fático de substituição nos campos coringa de simulação de preenchimento...`,
      `[${timestamp}] Aviso: Teste real será ativado em build futuro com backend seguro.`,
      `[${timestamp}] Canal retornado com status isolado: Simulador de Sucesso.`
    ];

    setTimeout(() => {
      setLogs(prev => [...prev, ...newLogs]);
      setTesting(false);
      setShowLogs(true);
    }, 1000);
  };

  const handleDisable = async () => {
    const timestamp = new Date().toLocaleTimeString();
    const updated = { ...config, status: 'não_configurado' as const };
    setConfig(updated);
    
    try {
      await setDoc(doc(db, 'settings', 'connectors'), {
        googleDocs: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setLogs(prev => [
        ...prev,
        `[${timestamp}] Provedor desativado voluntariamente pelo operador.`
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  // Shortcut items of future automation builds
  const shortcutCards = [
    { name: "Procuração", desc: "Minuta de procuração judicial preenchida no fluxo de produção.", icon: Briefcase, color: "text-blue-600 bg-blue-50" },
    { name: "Declaração de Hipossuficiência", desc: "Atestado fático de isenção de custas preenchido automaticamente.", icon: FileCheck, color: "text-purple-600 bg-purple-50" },
    { name: "Contrato de Honorários", desc: "Contrato assinado em subetapa com as faturas vinculadas.", icon: Layers, color: "text-amber-600 bg-amber-50" },
    { name: "Recibo de Dinheiro Físico", desc: "Provimento de recibo instantâneo quando pago via dinheiro físico.", icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { name: "Relatório de Auditoria Documental", desc: "Integridade das provas e documentos mínimos do caso.", icon: Fingerprint, color: "text-cyan-600 bg-cyan-50" },
    { name: "Pré-Petição", desc: "Rascunho de fundamentação inicial sob os fatos e documentos.", icon: Scale, color: "text-indigo-600 bg-indigo-50" },
    { name: "Outros Modelos", desc: "Integração dinâmica para fluxos adicionais futuramente.", icon: Archive, color: "text-slate-600 bg-slate-50" }
  ];

  if (loading) {
    return (
      <BossLayout>
        <div className="flex-1 p-6 md:p-10 flex items-center justify-center bg-gray-50 text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-cyan-600 rounded-full animate-spin"></div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Sincronizando Google Docs...</span>
          </div>
        </div>
      </BossLayout>
    );
  }

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
              <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Google Docs Automation</h2>
                <p className="text-xs text-gray-500 font-medium">Geração Inteligente de Peças e Minutas Contratuais</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-[9px] font-black uppercase border tracking-wider rounded-lg ${
              config.status === 'ativo' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              config.status === 'preparado' ? 'bg-blue-50 text-blue-800 border-blue-200' :
              config.status === 'em_teste' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              config.status === 'erro' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              'bg-gray-100 text-gray-500 border-gray-205'
            }`}>
              {config.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-slate-900 border border-slate-950 p-6 rounded-[2rem] flex gap-3.5 text-slate-100 shadow-xl">
          <Info size={24} className="text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">Conector Google Docs Ativo • BOSS v5</p>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              Módulo fático e documental. Cria e preenche automaticamente minutas de contratos, petições e procurações com dados reais inseridos no andamento da produção do caso do cliente.
            </p>
          </div>
        </div>

        {/* Warn card */}
        <div className="bg-amber-50 border border-amber-150 p-4 rounded-2xl flex gap-2.5 text-amber-950">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed font-semibold">
            <strong className="uppercase">Segurança Técnica:</strong> Esta chave secreta não deve ser armazenada diretamente no frontend legado. Em ambiente de produção, certifique-se de mover para variáveis de ambiente seguras no backend (Cloud Run / Functions).
          </p>
        </div>

        {/* MAIN CONFIGURATION FORM */}
        <form onSubmit={handleSave} className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Estratégia de Modelos (Templates Google Docs Folder/ID) *</label>
              <input
                type="text"
                required
                value={config.templatesStrategy}
                onChange={(e) => setConfig({ ...config, templatesStrategy: e.target.value })}
                placeholder="ex: standard_procuracao ou ID do documento do google drive"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Status Conexão *</label>
              <select
                value={config.status}
                onChange={(e) => setConfig({ ...config, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
              >
                <option value="não_configurado">Não Configurado</option>
                <option value="preparado">Preparado</option>
                <option value="em_teste">Em Testes</option>
                <option value="ativo">Ativo</option>
                <option value="erro">Erro</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Notas Internas de Integração</label>
              <textarea
                value={config.notes}
                onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                rows={3}
                placeholder="Observações complementares fáticas sobre este barramento..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {feedback && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-rose-50 text-rose-900 border border-rose-100'
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
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={testing}
                onClick={handleTestConnection}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-50 text-xs font-bold uppercase rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={12} />
                <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold uppercase rounded-xl transition flex items-center gap-2"
              >
                <Terminal size={12} />
                <span>Logs</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {config.status !== 'não_configurado' && (
                <button
                  type="button"
                  onClick={handleDisable}
                  className="px-4 py-2 hover:bg-red-50 text-red-500 rounded-xl text-xs font-bold uppercase transition"
                >
                  Desativar
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                <span>{saving ? 'Gravando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* LOG PANEL */}
        {showLogs && (
          <div className="bg-slate-900 border border-slate-950 p-5 rounded-3xl text-slate-100 font-mono text-xs space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-2">
                <Terminal size={14} className="text-indigo-400" />
                <span>Terminal Simulator Logs — Google Docs</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLogs(false)}
                className="text-slate-400 hover:text-white font-sans text-xs font-semibold"
              >
                Ocultar
              </button>
            </div>

            <div className="max-h-[180px] overflow-y-auto space-y-1.5 bg-slate-950 p-4 rounded-2xl shadow-inner scrollbar-thin">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">Nenhum log gravado neste ciclo de visualização. Clique em "Testar Conexão" para obter dados fáticos.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="leading-relaxed hover:bg-slate-900/60 p-0.5 rounded transition">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SHORTCUTS / AUTOMAÇÕES FUTURAS SECTION */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Atalhos de Automação de Documentos</h3>
            <p className="text-xs text-gray-500 font-medium">Modelos preparados que serão futuramente vinculados ao Google Docs real</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcutCards.map((card, idx) => (
              <div key={idx} className="bg-white border border-gray-150 rounded-2xl p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-tight">{card.name}</h4>
                  <p className="text-[11px] text-gray-500 leading-normal font-semibold">
                    {card.desc}
                  </p>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Placeholder Futuro</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BossLayout>
  );
}
