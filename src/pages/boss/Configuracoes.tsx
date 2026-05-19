import React, { useEffect, useState } from 'react';
import { BossLayout } from '../../components/Layout';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Save, Link, Check, AlertCircle } from 'lucide-react';

const DEFAULT_PORTAL_LINK = 'https://aistudio.google.com/apps/93c62126-a17f-4c18-8bc7-d327df1ca6b5?showPreview=true&showAssistant=true';

export default function Configuracoes() {
  const [portalLink, setPortalLink] = useState(DEFAULT_PORTAL_LINK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'portal'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.link) {
            setPortalLink(data.link);
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
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

    // Dynamic URL validation to ensure it looks like a valid URL or fallback
    let sanitizedLink = portalLink.trim();
    if (!sanitizedLink) {
      sanitizedLink = DEFAULT_PORTAL_LINK;
    }

    try {
      await setDoc(doc(db, 'settings', 'portal'), {
        link: sanitizedLink,
        updatedAt: serverTimestamp(),
      });
      setFeedback({ type: 'success', message: 'Configurações salvas com sucesso!' });
      setPortalLink(sanitizedLink);
    } catch (err) {
      console.error('Error saving settings:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'settings/portal');
      } catch (e) {}
      setFeedback({ type: 'error', message: 'Erro ao salvar. Verifique as permissões do banco de dados.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BossLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Configurações do Sistema</h2>
        <p className="text-gray-500">Ajuste os links de redirecionamento e parametrizações globais do portal.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-8 max-w-2xl">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12 text-gray-400 font-sans">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
            <span className="text-sm font-bold uppercase tracking-widest">Carregando configurações...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Link size={16} className="text-gray-400" />
                Link do Card "Portal do Cliente" (Home)
              </label>
              <p className="text-xs text-gray-500 mb-4/5 leading-relaxed mb-3">
                Cole o link para onde o cliente deve ser direcionado ao clicar no card correspondente na página principal.
              </p>
              <input
                type="url"
                required
                value={portalLink}
                onChange={(e) => setPortalLink(e.target.value)}
                placeholder="https://exemplo.com/portal..."
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-sm text-gray-800"
              />
            </div>

            {feedback && (
              <div
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <Check className="text-emerald-500 shrink-0" size={20} />
                ) : (
                  <AlertCircle className="text-red-500 shrink-0" size={20} />
                )}
                <div className="text-sm font-medium">{feedback.message}</div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setPortalLink(DEFAULT_PORTAL_LINK)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
              >
                Restaurar Padrão
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-gray-200 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Salvando...' : 'Salvar Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </BossLayout>
  );
}
