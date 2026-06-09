import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Save,
  Check,
  AlertTriangle,
  FileCheck,
  User,
  Loader2,
  Lock,
  ClipboardCheck,
  Users
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface ComplianceForm {
  conflitoInteresseVerificado: 'pendente' | 'sim' | 'nao';
  documentacaoCompleta: boolean;
  origemRecursosValida: 'pendente' | 'sim' | 'nao';
  parecerCompliance: string;
  responsavelCompliance: string;
  complianceApproved: boolean;
  updatedAt: string;
}

export default function ComplianceFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  // Compliance state fields
  const [form, setForm] = useState<ComplianceForm>({
    conflitoInteresseVerificado: 'pendente',
    documentacaoCompleta: false,
    origemRecursosValida: 'pendente',
    parecerCompliance: '',
    responsavelCompliance: '',
    complianceApproved: false,
    updatedAt: new Date().toISOString()
  });

  useEffect(() => {
    if (!caseId) return;

    const fetchCaseAndClient = async () => {
      try {
        setLoading(true);
        const caseRef = doc(db, 'cases', caseId);
        const caseSnap = await getDoc(caseRef);

        if (!caseSnap.exists()) {
          setError(`Caso de ID [${caseId}] não existente.`);
          setLoading(false);
          return;
        }

        const caseData = caseSnap.data();
        setCaseObj({ id: caseSnap.id, ...caseData });

        // Load compliance fields if already existing
        if (caseData.complianceData) {
          setForm({
            conflitoInteresseVerificado: caseData.complianceData.conflitoInteresseVerificado || 'pendente',
            documentacaoCompleta: caseData.complianceData.documentacaoCompleta || false,
            origemRecursosValida: caseData.complianceData.origemRecursosValida || 'pendente',
            parecerCompliance: caseData.complianceData.parecerCompliance || '',
            responsavelCompliance: caseData.complianceData.responsavelCompliance || '',
            complianceApproved: caseData.complianceApproved || caseData.complianceData.complianceApproved || false,
            updatedAt: caseData.complianceData.updatedAt || new Date().toISOString()
          });
        } else {
          // Backward compatibility fallbacks
          setForm(prev => ({
            ...prev,
            complianceApproved: caseData.complianceApproved || false
          }));
        }

        if (caseData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', caseData.clientId));
          if (clientSnap.exists()) {
            setClient({ id: clientSnap.id, ...clientSnap.data() });
          }
        }
      } catch (err: any) {
        console.error("Error loading compliance data:", err);
        setError(`Erro ao carregar dados de conformidade: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseAndClient();
  }, [caseId]);

  const handleSaveCompliance = async () => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date().toISOString();
      const updatedForm = {
        ...form,
        updatedAt: now
      };

      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, {
        complianceData: updatedForm,
        complianceApproved: form.complianceApproved,
        complianceStatus: form.complianceApproved ? 'aprovado' : 'pendente',
        updatedAt: now
      });

      setSuccess('Módulo de compliance e auditoria interna salvo com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar dados de compliance: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Compliance & Auditoria" caseId={caseId}>
        <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="text-xs font-bold font-mono tracking-wide uppercase">
            Consultando regras de compliance e segurança...
          </span>
        </div>
      </FluxoStepLayout>
    );
  }

  const clientName = client
    ? (client.nome || client.nomeCompleto || client.razaoSocial || 'Cliente cadastrado')
    : 'Cliente não identificado';

  return (
    <FluxoStepLayout
      stepName="Compliance e Auditoria Interna"
      caseId={caseId}
      statusText={form.complianceApproved ? 'Aprovado pelo Compliance' : 'Análise Pendente'}
    >
      <div className="space-y-8 font-sans max-w-5xl">
        {/* Error & Success Toasts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-3xl text-red-900 text-xs flex gap-3 items-center">
            <ShieldAlert size={18} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl text-emerald-900 text-xs flex gap-3 items-center">
            <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{success}</span>
          </div>
        )}

        {/* HERO HEADER */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-[2rem] p-8 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 font-mono">Central de Risco Giffoni</span>
              <h2 className="text-lg font-black tracking-tight mt-0.5">Etapa 12 — Compliance Corporativo & Diligência</h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-semibold">
            Análise de conflito de interesses, conformidade cadastral e regras de prevenção em cooperação com as normas gerais do Giffoni Advocacia. Essencial para liberação prévia à finalização final do prontuário do cliente <strong className="text-white">{clientName}</strong>.
          </p>
        </div>

        {/* CHECKLIST FORM */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6.5 space-y-6 shadow-xs">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2 pb-3 border-b border-gray-100">
            <ClipboardCheck size={16} className="text-indigo-600" />
            <span>Métricas e Requisitos Obrigatórios</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rule 1: Conflict of interest */}
            <div className="p-4.5 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600" />
                    Ausência de Conflito de Interesses
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Pesquisa nos bancos de dados unificados do escritório para garantir que nenhuma parte adversa ou colateral possui vínculo de assessoria ativa com nossos profissionais.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {[
                  { val: 'pendente', label: 'Pendente', color: 'bg-amber-100 border-amber-300 text-amber-800' },
                  { val: 'sim', label: 'Verificado e Limpo', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
                  { val: 'nao', label: 'Conflito Encontrado', color: 'bg-red-100 border-red-300 text-red-800' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, conflitoInteresseVerificado: opt.val as any }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer select-none ${
                      form.conflitoInteresseVerificado === opt.val
                        ? opt.color
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rule 2: Origin of funds */}
            <div className="p-4.5 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <FileCheck size={14} className="text-indigo-600" />
                    Origem de Recursos e ID de Pagamento
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Confirmação de que os recebimentos financeiros honorários observam os limites de compliance de PLD/FTP sob as regulações federais brasileiras vigentes.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {[
                  { val: 'pendente', label: 'Pendente', color: 'bg-amber-100 border-amber-300 text-amber-800' },
                  { val: 'sim', label: 'Aprovado / Isento', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
                  { val: 'nao', label: 'Suspeito/Inconsistente', color: 'bg-red-100 border-red-300 text-red-800' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, origemRecursosValida: opt.val as any }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer select-none ${
                      form.origemRecursosValida === opt.val
                        ? opt.color
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Complete Toggle */}
          <div className="p-4.5 bg-gray-50/20 border border-gray-100 rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800">Assinaturas e Procurações Coletadas Regularmente</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Confirmado que as vias contratuais físicas e digitais foram arquivadas em definitivo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, documentacaoCompleta: !f.documentacaoCompleta }))}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                form.documentacaoCompleta
                  ? 'bg-emerald-500 border-transparent text-white shadow-xs'
                  : 'bg-white border-gray-250 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {form.documentacaoCompleta ? 'Ficha Confirmada ✔' : 'Confirmar integridade cadastral'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Responsável */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] uppercase font-black tracking-wider text-gray-500 font-mono block">Responsável pelo Parecer</label>
              <input
                type="text"
                placeholder="Ex: Arthur Giffoni"
                value={form.responsavelCompliance}
                onChange={(e) => setForm(f => ({ ...f, responsavelCompliance: e.target.value }))}
                className="w-full bg-white border border-gray-250 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs md:text-sm font-semibold outline-none transition-colors"
              />
            </div>

            {/* Parecer do Compliance */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] uppercase font-black tracking-wider text-gray-500 font-mono block">Observações e Parecer Final</label>
              <textarea
                placeholder="Insira as observações sobre a auditoria de riscos operacionais..."
                rows={2}
                value={form.parecerCompliance}
                onChange={(e) => setForm(f => ({ ...f, parecerCompliance: e.target.value }))}
                className="w-full bg-white border border-gray-250 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs outline-none transition-colors font-medium leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Master Approved Button */}
          <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">Selo de Liberação de Compliance</h4>
              <p className="text-[11.5px] text-gray-500 font-semibold leading-relaxed">
                Ao aprovar, você atesta a idoneidade geral do cadastro para distribuição segura de tese em juízo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, complianceApproved: !f.complianceApproved }))}
              className={`w-full md:w-auto px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
                form.complianceApproved
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold'
                  : 'bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold'
              }`}
            >
              {form.complianceApproved ? (
                <>
                  <ShieldCheck size={15} />
                  <span>APROVADA E AUDITADA</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={15} />
                  <span>MARCAR COMO CONFORME</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* BOTTOM NAV BAR */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.protocolo(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            Voltar para Protocolo
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveCompliance}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-700 text-indigo-600 border border-indigo-200 hover:border-indigo-300 bg-indigo-50 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
              <span>{saving ? 'Gravando...' : 'Gravar Parecer'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(flowRoutes.relatorioIntegridade(caseId!))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-7 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              <span>Relatório de Integridade</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </FluxoStepLayout>
  );
}
