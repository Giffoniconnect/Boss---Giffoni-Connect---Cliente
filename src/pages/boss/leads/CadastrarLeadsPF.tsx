import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BossLayout } from '../../../components/Layout';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { 
  UserPlus, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

export default function CadastrarLeadsPF() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  // Form Fields State for PF
  const initialFormData = {
    origemLead: 'WhatsApp',
    areaJuridica: 'Trabalhista',
    assunto: '',
    dorPrincipal: '',
    urgencia: 'Média',
    existePrazo: false,
    dataPrazo: '',
    possuiProcesso: false,
    numeroProcesso: '',
    parteContraria: '',
    documentosRecebidos: false,
    responsavelInterno: '',
    valorPotencial: '',
    statusFunil: 'Novo Lead',
    classificacao: 'Geral',
    proximoPasso: '',
    observacoes: '',

    pessoaFisica: {
      nomeCompleto: '',
      cpf: '',
      rg: '',
      dataNascimento: '',
      estadoCivil: 'Solteiro(a)',
      profissao: '',
      telefone: '',
      whatsapp: '',
      email: '',
      endereco: '',
      cidade: '',
      uf: ''
    }
  };

  const [leadFormData, setLeadFormData] = useState<any>(initialFormData);

  // Handle Submission (Create Lead)
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const name = leadFormData.pessoaFisica.nomeCompleto || 'Lead PF sem Identificação';

    try {
      const newId = 'lead_' + Math.random().toString(36).substring(2, 11);
      const now = new Date().toISOString();

      const payload = {
        ...leadFormData,
        id: newId,
        tipoPessoa: 'PF',
        convertidoEmCliente: false,
        createdAt: now,
        updatedAt: now,
        pessoaFisica: {
          ...leadFormData.pessoaFisica,
          nomeCompleto: name
        }
      };

      const docRef = doc(db, 'marketingLeads', newId);
      await setDoc(docRef, payload);

      // Local storage backup
      try {
        const local = localStorage.getItem('local_marketing_leads');
        const list = local ? JSON.parse(local) : [];
        localStorage.setItem('local_marketing_leads', JSON.stringify([payload, ...list]));
      } catch (e) {
        console.warn('Could not sync lead to local backup', e);
      }

      setSuccess(`Lead Pessoa Física cadastrado com sucesso!`);
      setCreatedLeadId(newId);
      navigate(`/boss/cadastrar.leads/private/etapa02/${newId}`);
    } catch (e: any) {
      console.error(e);
      setError('Erro ao salvar o LEAD no banco de dados. Por favor tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BossLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-8 animate-fade-in pb-16">
        
        {/* HEADER */}
        <div className="border-b border-gray-150 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-[#2563ea] font-mono">Etapa 01 — Identificação do Cliente em Potencial</span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-snug">
              Funil de Vendas de Serviços Jurídicos da Giffoni Advogados Associados - Identificação do Cliente em Potencial - Ficha LEAD PF
            </h1>
          </div>
          
          <button
            type="button"
            onClick={() => navigate('/boss/cadastrar.leads/private')}
            className="text-xs font-bold text-gray-650 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-4xs transition hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Voltar à Seleção</span>
          </button>
        </div>

        {/* FEEDBACK */}
        {error && (
          <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4.5 flex items-start gap-3">
            <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-rose-800 font-bold">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4 justify-between shadow-2xs">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={24} />
              <div>
                <strong className="text-emerald-950 text-sm block font-black">Lead Cadastrado com Sucesso! (Conclusão da Etapa 01)</strong>
                <span className="text-xs text-emerald-850 font-bold">O lead de Pessoa Física foi criado e identificado no sistema. Seus dados já estão consolidados.</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  setSuccess(null);
                  setCreatedLeadId(null);
                  setLeadFormData(initialFormData);
                }}
                className="px-3.5 py-2 bg-white border border-emerald-250 text-emerald-800 hover:bg-emerald-100/50 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
              >
                Cadastrar Outro
              </button>
              {createdLeadId && (
                <button
                  type="button"
                  onClick={() => navigate(`/boss/cadastrar.leads/private/etapa02/${createdLeadId}`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shadow-sm animate-pulse"
                >
                  <span>Ir para Etapa 02 (Relacionamento)</span>
                  <Sparkles size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* COMPREHENSIVE PF FORM */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs"
        >
          <div className="p-5 text-white flex items-center justify-between bg-blue-600">
            <div className="flex items-center gap-2.5">
              <UserPlus size={20} />
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  Dados Cadastrais de LEAD da Pessoa Física
                </h3>
                <p className="text-[10px] text-white/90">Insira as informações cadastrais e comerciais para formalizar a ficha.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitLead} className="p-6 space-y-8">
            
            {/* SECTION 1: CADASTRO BASICO */}
            <div className="space-y-4">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-450 border-b border-gray-100 pb-1.5">
                1. Informações Cadastrais Básicas (Pessoa Física)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.nomeCompleto}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, nomeCompleto: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Nome Completo do interessado"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">CPF</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.cpf}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, cpf: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">RG</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.rg}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, rg: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="0000000-0"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data Nascimento</label>
                  <input 
                    type="date" 
                    value={leadFormData.pessoaFisica.dataNascimento}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, dataNascimento: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estado Civil</label>
                  <select 
                    value={leadFormData.pessoaFisica.estadoCivil}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, estadoCivil: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-4 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition cursor-pointer"
                  >
                    <option>Solteiro(a)</option>
                    <option>Casado(a)</option>
                    <option>Divorciado(a)</option>
                    <option>Viúvo(a)</option>
                    <option>União Estável</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Profissão</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.profissao}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, profissao: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Ex: Engenheiro"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefone Particular</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.telefone}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, telefone: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-sans"
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">WhatsApp de Contato</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.whatsapp}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, whatsapp: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-sans"
                    placeholder="(00) 90000-0000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={leadFormData.pessoaFisica.email}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, email: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="contato@exemplo.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço Residencial</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.endereco}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, endereco: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Rua, Número, Bairro, Complemento"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cidade / UF</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.cidade}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, cidade: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Ex: Curitiba / PR"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: NEGOCIO E SOLUCAO */}
            <div className="space-y-4">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-450 border-b border-gray-100 pb-1.5">
                2. Informações de Negócio & Qualificação da Demanda
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Origem do Lead</label>
                  <select 
                    value={leadFormData.origemLead}
                    onChange={(e) => setLeadFormData({ ...leadFormData, origemLead: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition cursor-pointer"
                  >
                    <option>WhatsApp</option>
                    <option>Indicação Direta</option>
                    <option>Instagram</option>
                    <option>Facebook</option>
                    <option>TikTok</option>
                    <option>Google Ads / Prospecção Tráfego</option>
                    <option>Instagram / Facebook Ads</option>
                    <option>Redes Sociais</option>
                    <option>Atendimento Balcão / Físico</option>
                    <option>Eventos / Palestras</option>
                    <option>Parceria Externa</option>
                    <option>Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Área Jurídica de Interesse</label>
                  <select 
                    value={leadFormData.areaJuridica}
                    onChange={(e) => setLeadFormData({ ...leadFormData, areaJuridica: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition cursor-pointer"
                  >
                    <option>Trabalhista</option>
                    <option>Previdenciário (INSS)</option>
                    <option>Cível / Família</option>
                    <option>Tributário</option>
                    <option>Empresarial / Societário</option>
                    <option>Administrativo / Servidor Público</option>
                    <option>Imobiliário</option>
                    <option>Direito Agrário</option>
                    <option>Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Classificação Comercial</label>
                  <select 
                    value={leadFormData.classificacao}
                    onChange={(e) => setLeadFormData({ ...leadFormData, classificacao: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition cursor-pointer"
                  >
                    <option>Geral</option>
                    <option>Grandes Contas</option>
                    <option>Pro-Bono / Amigo</option>
                    <option>Recorrência (Retainer)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assunto / Do que se trata?</label>
                  <input 
                    type="text" 
                    value={leadFormData.assunto}
                    onChange={(e) => setLeadFormData({ ...leadFormData, assunto: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Ex: Cobrança de Horas Extras de FGTS acumulado"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor Potencial Estimado (R$)</label>
                  <input 
                    type="number" 
                    value={leadFormData.valorPotencial}
                    onChange={(e) => setLeadFormData({ ...leadFormData, valorPotencial: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-sans"
                    placeholder="Ex: 15000"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dor Principal Relatada pelo Lead</label>
                  <textarea 
                    rows={2}
                    value={leadFormData.dorPrincipal}
                    onChange={(e) => setLeadFormData({ ...leadFormData, dorPrincipal: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="O que motivou o contato? Qual o problema central dele?"
                  />
                </div>
              </div>

              {/* ADVANCED CRITERIA GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                <div className="bg-slate-50/70 p-4 border border-gray-200/50 rounded-2xl space-y-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-950 font-sans">Fatores Temporais (Prazos)</span>
                  
                  <div className="flex gap-4">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="existePrazo" 
                          checked={leadFormData.existePrazo === (o === 'sim')} 
                          onChange={() => setLeadFormData({ ...leadFormData, existePrazo: o === 'sim' })}
                          className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>{o === 'sim' ? 'Existe Prazo Imcorrente' : 'Sem prazo fatal urgente'}</span>
                      </label>
                    ))}
                  </div>

                  {leadFormData.existePrazo && (
                    <div className="animate-fade-in">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data Limite do Prazo</label>
                      <input 
                        type="date" 
                        value={leadFormData.dataPrazo}
                        onChange={(e) => setLeadFormData({ ...leadFormData, dataPrazo: e.target.value })}
                        className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 rounded-xl"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-slate-50/70 p-4 border border-gray-200/50 rounded-2xl space-y-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-950 font-sans">Processos Prévios</span>
                  
                  <div className="flex gap-4">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="possuiProcesso" 
                          checked={leadFormData.possuiProcesso === (o === 'sim')} 
                          onChange={() => setLeadFormData({ ...leadFormData, possuiProcesso: o === 'sim' })}
                          className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>{o === 'sim' ? 'Sim, já possui processo ativo' : 'Não, é caso inédito'}</span>
                      </label>
                    ))}
                  </div>

                  {leadFormData.possuiProcesso && (
                    <div className="grid grid-cols-2 gap-2 animate-fade-in">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Número do Processo</label>
                        <input 
                          type="text" 
                          value={leadFormData.numeroProcesso}
                          onChange={(e) => setLeadFormData({ ...leadFormData, numeroProcesso: e.target.value })}
                          className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-sans"
                          placeholder="0000000-00.0000.0.00.0000"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Parte Contrária</label>
                        <input 
                          type="text" 
                          value={leadFormData.parteContraria}
                          onChange={(e) => setLeadFormData({ ...leadFormData, parteContraria: e.target.value })}
                          className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 rounded-xl"
                          placeholder="Ex: Banco S.A."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: RESPONSABILIDADE E FUNIL */}
            <div className="space-y-4">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-450 border-b border-gray-100 pb-1.5">
                3. Distribuição de Responsáveis e Próximos Passos
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Urgência Comercial</label>
                  <select 
                    value={leadFormData.urgencia}
                    onChange={(e) => setLeadFormData({ ...leadFormData, urgencia: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition cursor-pointer"
                  >
                    <option>Baixa</option>
                    <option>Média</option>
                    <option>Alta / Iminente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Responsável Comercial Interno</label>
                  <input 
                    type="text" 
                    value={leadFormData.responsavelInterno}
                    onChange={(e) => setLeadFormData({ ...leadFormData, responsavelInterno: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition"
                    placeholder="Nome do Atendente comercial"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status no Funil Comercial</label>
                  <select 
                    value={leadFormData.statusFunil}
                    onChange={(e) => setLeadFormData({ ...leadFormData, statusFunil: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition cursor-pointer"
                  >
                    <option>Novo Lead</option>
                    <option>Primeiro Contato</option>
                    <option>Aguardando Documentos</option>
                    <option>Aguardando Reunião</option>
                    <option>Em Análise Jurídica</option>
                    <option>Proposta Enviada</option>
                    <option>Follow-up</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ações recomendadas / Próximo Passo do Lead</label>
                  <input 
                    type="text" 
                    value={leadFormData.proximoPasso}
                    onChange={(e) => setLeadFormData({ ...leadFormData, proximoPasso: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white"
                    placeholder="Ex: Ligar amanhã para propor nova proposta de honorários"
                  />
                </div>

                <div className="flex items-center pt-3 sm:pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={leadFormData.documentosRecebidos}
                      onChange={(e) => setLeadFormData({ ...leadFormData, documentosRecebidos: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Documentos Prévios Recebidos?</span>
                  </label>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observações Gerais</label>
                  <textarea 
                    rows={3}
                    value={leadFormData.observacoes}
                    onChange={(e) => setLeadFormData({ ...leadFormData, observacoes: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white"
                    placeholder="Adicione quaisquer anotações adicionais..."
                  />
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3.5">
              <button
                type="button"
                onClick={() => navigate('/boss/cadastrar.leads/private')}
                className="px-5 py-3 border border-gray-250 text-gray-600 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer animate-fade-in"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-7 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
              >
                <Save size={14} />
                <span>{submitting ? 'Cadastrando...' : 'Concluir Cadastro de Lead'}</span>
              </button>
            </div>

          </form>
        </motion.div>

      </div>
    </BossLayout>
  );
}
