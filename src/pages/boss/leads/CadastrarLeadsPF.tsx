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
  Sparkles,
  Phone,
  Instagram,
  Facebook
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
    jaCliente: 'Caso Novo', // Já é Cliente do Escritório ou caso é novo?
    solicitarReuniao: false, // Permitindo Solicitar Agendamento de Reunião
    documentosRecebidos: false,
    responsavelInterno: 'Comercial Interno',
    valorPotencial: '',
    statusFunil: 'Novo Lead',
    classificacao: 'Geral',
    proximoPasso: '',
    observacoes: '',

    pessoaFisica: {
      nomeCompleto: '',
      email: '',
      telefone: '',
      possuiWhatsapp: false,
      instagram: '',
      tiktok: '',
      facebook: ''
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
        // Compatibilidade com os campos antigos do banco
        possuiProcesso: leadFormData.jaCliente === 'Já é Cliente',
        pessoaFisica: {
          ...leadFormData.pessoaFisica,
          nomeCompleto: name,
          // Preencher campos vazios obrigatórios estruturais antigos para evitar nulos
          cpf: '',
          rg: '',
          dataNascimento: '',
          estadoCivil: 'Não fornecido',
          profissao: '',
          endereco: '',
          cidade: '',
          uf: ''
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
      <div className="max-w-xl mx-auto px-4 md:px-0 space-y-8 animate-fade-in pb-16">
        
        {/* HEADER */}
        <div className="border-b border-gray-150 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-[#2563ea] font-mono">Etapa 01 — Identificação do Cliente em Potencial</span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-snug">
              Ficha LEAD PF - Identificação do Cliente em Potencial
            </h1>
          </div>
          
          <button
            type="button"
            onClick={() => navigate('/boss/cadastrar.leads/private')}
            className="text-xs font-bold text-gray-650 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-4xs transition hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Voltar</span>
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
                <p className="text-[10px] text-white/90">Insira as informações cadastrais essenciais e de qualificação comercial.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitLead} className="p-6 space-y-6">
            
            {/* SECTION 1: CADASTRO BASICO */}
            <div className="space-y-4">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-450 border-b border-gray-100 pb-1.5">
                1. Informações Cadastrais Básicas (Pessoa Física)
              </span>

              <div className="flex flex-col gap-4">
                {/* 1. Nome Completo */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={leadFormData.pessoaFisica.nomeCompleto}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, nomeCompleto: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Nome Completo do interessado"
                  />
                </div>

                {/* 2. Email */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
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

                {/* 3. Telefone (botão se possui WhatsApp) */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefone</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      value={leadFormData.pessoaFisica.telefone}
                      onChange={(e) => setLeadFormData({
                        ...leadFormData,
                        pessoaFisica: { ...leadFormData.pessoaFisica, telefone: e.target.value }
                      })}
                      className="flex-1 text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="(00) 90000-0000"
                    />
                    <button
                      type="button"
                      onClick={() => setLeadFormData({
                        ...leadFormData,
                        pessoaFisica: { ...leadFormData.pessoaFisica, possuiWhatsapp: !leadFormData.pessoaFisica.possuiWhatsapp }
                      })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 border cursor-pointer ${
                        leadFormData.pessoaFisica.possuiWhatsapp 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold shadow-sm'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className={leadFormData.pessoaFisica.possuiWhatsapp ? 'text-emerald-600 font-black' : 'text-gray-400'}>
                        💬
                      </span>
                      <span>Possui WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* 4. Instagram */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Instagram</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 text-xs font-bold">@</span>
                    <input 
                      type="text" 
                      value={leadFormData.pessoaFisica.instagram}
                      onChange={(e) => setLeadFormData({
                        ...leadFormData,
                        pessoaFisica: { ...leadFormData.pessoaFisica, instagram: e.target.value }
                      })}
                      className="w-full text-xs font-semibold pl-8 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
                      placeholder="usuario"
                    />
                  </div>
                </div>

                {/* 5. Tik Tok */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tik Tok</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 text-xs font-bold">@</span>
                    <input 
                      type="text" 
                      value={leadFormData.pessoaFisica.tiktok}
                      onChange={(e) => setLeadFormData({
                        ...leadFormData,
                        pessoaFisica: { ...leadFormData.pessoaFisica, tiktok: e.target.value }
                      })}
                      className="w-full text-xs font-semibold pl-8 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
                      placeholder="usuario.tiktok"
                    />
                  </div>
                </div>

                {/* 6. Facebook */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Facebook</label>
                  <input 
                    type="text" 
                    value={leadFormData.pessoaFisica.facebook}
                    onChange={(e) => setLeadFormData({
                      ...leadFormData,
                      pessoaFisica: { ...leadFormData.pessoaFisica, facebook: e.target.value }
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
                    placeholder="Link ou nome do perfil"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: QUALIFICACAO */}
            <div className="space-y-4 pt-2">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-450 border-b border-gray-100 pb-1.5">
                2. Informações de Negócio & Qualificação da Demanda
              </span>

              <div className="flex flex-col gap-4">
                {/* 1. Origem do LEAD */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Origem do LEAD</label>
                  <select 
                    value={leadFormData.origemLead}
                    onChange={(e) => setLeadFormData({ ...leadFormData, origemLead: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition cursor-pointer"
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

                {/* 2. Área Jurídica de Interesse */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Área Jurídica de Interesse</label>
                  <select 
                    value={leadFormData.areaJuridica}
                    onChange={(e) => setLeadFormData({ ...leadFormData, areaJuridica: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition cursor-pointer"
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

                {/* 3. Classificação Comercial */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Classificação Comercial</label>
                  <select 
                    value={leadFormData.classificacao}
                    onChange={(e) => setLeadFormData({ ...leadFormData, classificacao: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition cursor-pointer"
                  >
                    <option>Geral</option>
                    <option>Grandes Contas</option>
                    <option>Pro-Bono / Amigo</option>
                    <option>Recorrência (Retainer)</option>
                  </select>
                </div>

                {/* 4. Assunto */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assunto</label>
                  <input 
                    type="text" 
                    value={leadFormData.assunto}
                    onChange={(e) => setLeadFormData({ ...leadFormData, assunto: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition"
                    placeholder="Ex: Cobrança de Horas Extras de FGTS acumulado"
                  />
                </div>

                {/* 5. Valor em Potencial estimado */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor em Potencial estimado (R$)</label>
                  <input 
                    type="number" 
                    value={leadFormData.valorPotencial}
                    onChange={(e) => setLeadFormData({ ...leadFormData, valorPotencial: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none font-sans"
                    placeholder="Ex: 15000"
                  />
                </div>

                {/* 6. Resumo da Dor Relatada pelo cliente */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Resumo da Dor Relatada pelo cliente</label>
                  <textarea 
                    rows={3}
                    value={leadFormData.dorPrincipal}
                    onChange={(e) => setLeadFormData({ ...leadFormData, dorPrincipal: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition"
                    placeholder="O que motivou o contato? Qual o problema central dele?"
                  />
                </div>

                {/* 7. Já é Cliente do Escritório ou caso é novo? */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Já é Cliente do Escritório ou caso é novo?
                  </label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: 'Já é Cliente', label: 'Já é Cliente da Giffoni Advogados' },
                      { value: 'Caso Novo', label: 'Não, é um Caso Novo (Inédito)' }
                    ].map(opt => (
                      <label 
                        key={opt.value} 
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          leadFormData.jaCliente === opt.value
                            ? 'bg-blue-50/50 border-blue-500 text-blue-950 font-bold'
                            : 'bg-slate-50/50 border-gray-200 text-gray-650 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio"
                          name="jaCliente"
                          value={opt.value}
                          checked={leadFormData.jaCliente === opt.value}
                          onChange={() => setLeadFormData({ ...leadFormData, jaCliente: opt.value })}
                          className="text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4 shrink-0"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 8. Existe Prazo em andamento? */}
                <div className="bg-slate-50/50 p-4 border border-gray-200 rounded-2xl space-y-3">
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Existe Prazo em andamento?
                  </label>
                  <div className="flex gap-4">
                    {[
                      { value: true, label: 'Sim' },
                      { value: false, label: 'Não' }
                    ].map(o => (
                      <label key={o.value.toString()} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-700">
                        <input 
                          type="radio" 
                          name="existePrazo" 
                          checked={leadFormData.existePrazo === o.value} 
                          onChange={() => setLeadFormData({ ...leadFormData, existePrazo: o.value })}
                          className="text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                        />
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>

                  {leadFormData.existePrazo && (
                    <div className="animate-fade-in pt-1">
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

                {/* 9. Ações Recomendadas terá a interface com a Gestão de LEADS (Permitindo Solicitar Agendamento de Reunião) */}
                <div className="bg-indigo-50/50 p-4 border border-indigo-150 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-950">
                      Ações Recomendadas (Interface Gestão de LEADS)
                    </span>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-white border border-indigo-100 rounded-xl hover:bg-white/85 transition shadow-4xs">
                    <input 
                      type="checkbox" 
                      checked={leadFormData.solicitarReuniao}
                      onChange={(e) => setLeadFormData({ ...leadFormData, solicitarReuniao: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-550 w-4.5 h-4.5 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <strong className="block text-xs text-indigo-950 font-extrabold">Solicitar Agendamento de Reunião</strong>
                      <span className="block text-[10px] text-indigo-650 leading-relaxed font-semibold">
                        Sinaliza no Painel que este lead precisa de uma chamada de alinhamento imediata.
                      </span>
                    </div>
                  </label>

                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => alert("As opções para agendar Reuniões Comerciais estarão disponíveis no Painel de Ações de cada Lead cadastrado!")}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <span>Permitir Solicitar Agendamento de Reunião 📅</span>
                    </button>
                  </div>
                </div>

                {/* 10. Documentos Prévios Recebidos? */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-black text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={leadFormData.documentosRecebidos}
                      onChange={(e) => setLeadFormData({ ...leadFormData, documentosRecebidos: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 cursor-pointer"
                    />
                    <span>Documentos Prévios Recebidos?</span>
                  </label>
                </div>

                {/* 11. Observações Gerais */}
                <div>
                  <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observações Gerais</label>
                  <textarea 
                    rows={3}
                    value={leadFormData.observacoes}
                    onChange={(e) => setLeadFormData({ ...leadFormData, observacoes: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white outline-none transition"
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
