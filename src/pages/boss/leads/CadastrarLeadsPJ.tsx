import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BossLayout } from '../../../components/Layout';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { 
  Building2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Save
} from 'lucide-react';
import { motion } from 'motion/react';

export default function CadastrarLeadsPJ() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields State for PJ
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

    pessoaJuridica: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      representanteLegal: '',
      cpfRepresentante: '',
      cargoRepresentante: '',
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

    const name = leadFormData.pessoaJuridica.razaoSocial;

    if (!name || name.trim() === '') {
      setError('Preencha a Razão Social da Empresa.');
      setSubmitting(false);
      return;
    }

    try {
      const newId = 'lead_' + Math.random().toString(36).substring(2, 11);
      const now = new Date().toISOString();

      const payload = {
        ...leadFormData,
        id: newId,
        tipoPessoa: 'PJ',
        convertidoEmCliente: false,
        createdAt: now,
        updatedAt: now
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

      setSuccess(`Lead Pessoa Jurídica cadastrado com sucesso!`);
      setLeadFormData(initialFormData);
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
            <span className="text-[10px] uppercase font-black tracking-widest text-purple-600 font-mono">Cadastrar Leads Especializados</span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Ficha de Inscrição: LEAD PJ</h1>
          </div>
          
          <button
            type="button"
            onClick={() => navigate('/boss/cadastrar.leads/private')}
            className="text-xs font-bold text-gray-650 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-4xs transition hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
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
          <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <div>
                <strong className="text-emerald-950 text-sm block">Sucesso!</strong>
                <span className="text-xs text-emerald-850 font-medium">{success}</span>
              </div>
            </div>
            <div className="flex gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Cadastrar Outro
              </button>
              <button
                type="button"
                onClick={() => navigate('/boss/leads/private/dashboard')}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-emerald-250 text-emerald-800 hover:bg-emerald-100/50 rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        )}

        {/* COMPREHENSIVE PJ FORM */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs"
        >
          <div className="p-5 text-white flex items-center justify-between bg-purple-600">
            <div className="flex items-center gap-2.5">
              <Building2 size={20} />
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  Dados Cadastrais de LEAD da Pessoa Jurídica
                </h3>
                <p className="text-[10px] text-white/90">Insira as informações cadastrais corporativas e comerciais para formalizar a ficha.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitLead} className="p-6 space-y-8">
            
            {/* SECTION 1: CADASTRO BASICO */}
            <div className="space-y-4">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-450 border-b border-gray-100 pb-1.5">
                1. Informações Cadastrais Básicas (Pessoa Jurídica)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Razão Social *</label>
                  <input 
                    type="text" 
                    required
                    value={leadFormData.pessoaJuridica.razaoSocial}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, razaoSocial: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Razão Social completa da empresa"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">CNPJ</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.cnpj}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, cnpj: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition font-sans"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Fantasia</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.nomeFantasia}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, nomeFantasia: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Nome Comercial"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Inscrição Estadual</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.inscricaoEstadual}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, inscricaoEstadual: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="IE ou Isento"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Representante Legal</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.representanteLegal}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, representanteLegal: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Nome do Sócio Outorgante"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">CPF Representante</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.cpfRepresentante}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, cpfRepresentante: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition font-sans"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cargo Representante</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.cargoRepresentante}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, cargoRepresentante: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Ex: Diretor Administrativo"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefone Comercial</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.telefone}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, telefone: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition font-sans"
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">WhatsApp Comercial</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.whatsapp}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, whatsapp: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition font-sans"
                    placeholder="(00) 90000-0000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail Comercial</label>
                  <input 
                    type="email" 
                    value={leadFormData.pessoaJuridica.email}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, email: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="financeiro@empresa.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço da Sede</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.endereco}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, endereco: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Rua, Número, Conjunto, Bairro"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cidade / UF</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaJuridica.cidade}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaJuridica: { ...leadFormData.pessoaJuridica, cidade: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Ex: São Paulo / SP"
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
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition cursor-pointer"
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
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition cursor-pointer"
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
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition cursor-pointer"
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
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Ex: Consultoria Contratual Internacional ou Reestruturação de Passivo"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor Potencial Estimado (R$)</label>
                  <input 
                    type="number" 
                    value={leadFormData.valorPotencial}
                    onChange={(e) => setLeadFormData({ ...leadFormData, valorPotencial: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition font-sans"
                    placeholder="Ex: 50000"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dor Principal Relatada pelo Lead</label>
                  <textarea 
                    rows={2}
                    value={leadFormData.dorPrincipal}
                    onChange={(e) => setLeadFormData({ ...leadFormData, dorPrincipal: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="O que motivou a empresa a buscar apoio jurídico? Qual o risco/problema principal?"
                  />
                </div>
              </div>

              {/* ADVANCED CRITERIA GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                <div className="bg-slate-50/70 p-4 border border-gray-200/50 rounded-2xl space-y-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-800 font-sans">Fatores Temporais (Prazos)</span>
                  
                  <div className="flex gap-4">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="existePrazo" 
                          checked={leadFormData.existePrazo === (o === 'sim')} 
                          onChange={() => setLeadFormData({ ...leadFormData, existePrazo: o === 'sim' })}
                          className="text-purple-600 focus:ring-purple-500 cursor-pointer"
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
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-800 font-sans">Processos Prévios</span>
                  
                  <div className="flex gap-4">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="possuiProcesso" 
                          checked={leadFormData.possuiProcesso === (o === 'sim')} 
                          onChange={() => setLeadFormData({ ...leadFormData, possuiProcesso: o === 'sim' })}
                          className="text-purple-600 focus:ring-purple-500 cursor-pointer"
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
                          placeholder="Ex: União Federal"
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
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white outline-none transition cursor-pointer"
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
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white outline-none transition"
                    placeholder="Nome do Atendente comercial"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status no Funil Comercial</label>
                  <select 
                    value={leadFormData.statusFunil}
                    onChange={(e) => setLeadFormData({ ...leadFormData, statusFunil: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white outline-none transition cursor-pointer"
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
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white"
                    placeholder="Ex: Realizar call diagnóstica e envio de pitch comercial"
                  />
                </div>

                <div className="flex items-center pt-3 sm:pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={leadFormData.documentosRecebidos}
                      onChange={(e) => setLeadFormData({ ...leadFormData, documentosRecebidos: e.target.checked })}
                      className="rounded border-gray-300 text-purple-650 focus:ring-purple-550 w-4 h-4 cursor-pointer"
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
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-250 rounded-xl focus:bg-white"
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
                className="px-5 py-3 border border-gray-250 text-gray-600 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-7 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-md bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
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
