import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import {
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Save,
  Check,
  AlertTriangle,
  FileCheck,
  Loader2,
  Lock,
  Compass,
  FileText,
  Copy,
  BrainCircuit,
  Wand2,
  RefreshCw
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

export default function PrePeticionamentoIaFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  // IA Generation Inputs
  const [documentType, setDocumentType] = useState('peticao_inicial');
  const [tone, setTone] = useState('persuasivo');
  const [fatosAdicionais, setFatosAdicionais] = useState('');
  const [aiResult, setAiResult] = useState('');

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

        // Retrieve previously saved draft
        if (caseData.prePeticionamentoText) {
          setAiResult(caseData.prePeticionamentoText);
        }
        if (caseData.prePeticionamentoFatosAdicionais) {
          setFatosAdicionais(caseData.prePeticionamentoFatosAdicionais);
        }
        if (caseData.prePeticionamentoDocumentType) {
          setDocumentType(caseData.prePeticionamentoDocumentType);
        }
        if (caseData.prePeticionamentoTone) {
          setTone(caseData.prePeticionamentoTone);
        }

        if (caseData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', caseData.clientId));
          if (clientSnap.exists()) {
            setClient({ id: clientSnap.id, ...clientSnap.data() });
          }
        }
      } catch (err: any) {
        console.error("Error loading case info for pre-petitioning:", err);
        setError(`Erro ao carregar dados do caso: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseAndClient();
  }, [caseId]);

  const handleGenerateDraft = async () => {
    if (!caseId) return;
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Package payload to send to proxy
      const fatosFundamentos = [
        caseObj?.basesFaticas || '',
        caseObj?.entrevistaPadrao || '',
        caseObj?.description || '',
        fatosAdicionais
      ].filter(Boolean).join('\n\n');

      const estrategiaJuridica = [
        caseObj?.edrp?.structuring?.strategy || '',
        caseObj?.edrp?.structuring?.relevantFacts || '',
         "Tom do Documento: " + tone
      ].filter(Boolean).join('\n\n');

      const competenciaJurisdicional = caseObj?.edrp?.structuring?.competence || 'Não selecionado';

      const response = await fetch('/api/gemini-format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fatosFundamentos,
          estrategiaJuridica: `Tipo de Peça: ${documentType}\nTom processual: ${tone}\n${estrategiaJuridica}`,
          competenciaJurisdicional
        })
      });

      if (!response.ok) {
        throw new Error('Falha técnica na geração de conteúdo com o Gemini.');
      }

      const data = await response.json();
      if (data && data.text) {
        setAiResult(data.text);
        setSuccess('Rascunho de Pré-Peticionamento estruturado pela IA com sucesso!');
      } else {
        throw new Error('Retorno vazio do motor cognitivo.');
      }
    } catch (err: any) {
      console.error(err);
      setError(`Erro na geração automatizada: ${err.message || err}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, {
        prePeticionamentoText: aiResult,
        prePeticionamentoFatosAdicionais: fatosAdicionais,
        prePeticionamentoDocumentType: documentType,
        prePeticionamentoTone: tone,
        prePeticionamentoStatus: aiResult ? 'complete' : 'pending',
        updatedAt: new Date().toISOString()
      });

      setSuccess('Draft de pré-peticionamento salvo no prontuário com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar documento: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Erro ao copiar rascunho:", err);
    });
  };

  const clientName = client
    ? (client.nome || client.nomeCompleto || client.razaoSocial || 'Cliente')
    : 'Cliente';

  return (
    <FluxoStepLayout
      stepName="Pré-Peticionamento com IA"
      caseId={caseId}
      statusText={aiResult ? 'Documento Pronto' : 'Aguardando Geração'}
    >
      <div className="space-y-8 font-sans max-w-5xl">
        {/* Error & Success Toasts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-3xl text-red-900 text-xs flex gap-3 items-center">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl text-emerald-900 text-xs flex gap-3 items-center">
            <Sparkles size={18} className="text-emerald-500 shrink-0 animate-pulse" />
            <span className="font-semibold leading-relaxed">{success}</span>
          </div>
        )}

        {/* HERO TITLE CONTAINER */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-[2rem] p-8 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
              <BrainCircuit size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 font-mono">Cognição Assistida</span>
              <h2 className="text-lg font-black tracking-tight mt-0.5">Etapa 08 — Pré-Peticionamento Legal de Alto Desempenho</h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-semibold">
            Gere a redação preliminar da peça jurídica a partir do cruzamento fático das declarações, roteiros e dados contextuais do cliente <strong className="text-white">{clientName}</strong>, estruturados sob as melhores diretrizes processuais do escritório.
          </p>
        </div>

        {/* SETUP PARAMS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-gray-150 rounded-3xl p-6 space-y-5 shadow-xs h-fit">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2.5 border-b border-gray-100">
              <Wand2 size={14} className="text-indigo-600" />
              <span>Configurar Prompt</span>
            </h3>

            {/* Document Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Tipo de Peça Jurídica</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-gray-250 focus:border-indigo-500 rounded-xl p-3 text-xs font-semibold outline-none cursor-pointer transition-colors"
              >
                <option value="peticao_inicial">Petição Inicial (PF/PJ)</option>
                <option value="recurso_incidental">Recurso Incidental / Apelação</option>
                <option value="contestacao">Contestação / Memória de Defesa</option>
                <option value="notificacao_extrajudicial">Notificação Extrajudicial</option>
              </select>
            </div>

            {/* Tone Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Tom de Escrita</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-gray-250 focus:border-indigo-500 rounded-xl p-3 text-xs font-semibold outline-none cursor-pointer transition-colors"
              >
                <option value="persuasivo">Altamente Persuasivo & Doutrinário</option>
                <option value="objetivo">Objetivo & Concreto (Juizados Especiais)</option>
                <option value="pericial">Rigoroso / Pericial Técnico</option>
                <option value="didatico">Didático & Narrativo</option>
              </select>
            </div>

            {/* Fatos Adicionais */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider block">Dados Fáticos Complementares</label>
              <textarea
                placeholder="Insira detalhes fáticos extras, nomes, jurisprudências ou datas importantes para enriquecer o prontuário..."
                rows={5}
                value={fatosAdicionais}
                onChange={(e) => setFatosAdicionais(e.target.value)}
                className="w-full bg-white border border-gray-250 focus:border-indigo-500 rounded-xl p-3 text-xs font-medium outline-none transition-colors leading-relaxed resize-none"
              />
            </div>

            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateDraft}
              className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer font-bold"
            >
              {generating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processando Tese...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Analisar e Gerar</span>
                </>
              )}
            </button>
          </div>

          {/* AI OUTPUT VIEWER */}
          <div className="lg:col-span-2 bg-white border border-gray-150 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText size={15} className="text-indigo-600" />
                <span>Rascunho Jurídico do Pré-Peticionamento</span>
              </h3>

              {aiResult && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className={`inline-flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all border ${
                    copied 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  <Copy size={12} />
                  <span>{copied ? 'Copiado!' : 'Copiar Rascunho'}</span>
                </button>
              )}
            </div>

            {aiResult ? (
              <div className="p-5.5 bg-slate-50 border border-gray-150 rounded-2xl max-h-[500px] overflow-y-auto font-mono text-[11.5px] leading-relaxed text-slate-800 select-text whitespace-pre-wrap">
                {aiResult}
              </div>
            ) : (
              <div className="py-24 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <BrainCircuit size={32} className="text-slate-300 stroke-[1.5px] animate-pulse" />
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-800">Pronto para Concepção Cognitiva</p>
                  <p className="text-[11px] text-gray-550 max-w-sm">
                    Configure os parâmetros à esquerda e clique em "Analisar e Gerar" para invocar a inteligência no preenchimento estrutural do prontuário técnico.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM NAV BAR */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.edrp(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            Voltar para EDRP
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraft}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-700 text-indigo-600 border border-indigo-200 hover:border-indigo-300 bg-indigo-50 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
              <span>{saving ? 'Gravando...' : 'Gravar no Prontuário'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(flowRoutes.delegacao(caseId!))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-7 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              <span>Avançar para Delegação</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </FluxoStepLayout>
  );
}
