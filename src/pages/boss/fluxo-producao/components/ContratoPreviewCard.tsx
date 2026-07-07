import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Maximize2, X, Pencil, Sparkles, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface ContratoPreviewCardProps {
  client: any;
  caseObj: any;
  clientName: string;
  isPf: boolean;
  
  // Form states to update preview in real time
  modeloHonorariosForm: string;
  tipoHonorarioForm: string;
  honorarioExitoPercentualForm: string;
  honorarioFixoValorForm: string;
  formaPagamentoForm: string;
  tipoRecebimentoForm: string;
  pixBancoForm: string;
  pixChaveForm: string;
  quantidadeParcelasForm: number;
  valorParcelaForm: string;
  diaVencimentoForm: string;
  valorEntradaForm: string;
  dataPrimeiroVencimentoForm: string;
  clausulasForm: string;
  
  // For Previdenciário / Trabalhista specific fields
  percentualExitoForm: string;
  percentualExitoSobreRetroativoForm: string;
  quantidadeParcelasExitoPrevidenciarioForm: number;
  financeiroApuracaoTrabalhistaState: any;
  financeiroApuracaoPrevidenciariaState: any;
  
  // Action to scroll to form
  onEditConditions: () => void;
}

export default function ContratoPreviewCard({
  client,
  caseObj,
  clientName,
  isPf,
  modeloHonorariosForm,
  tipoHonorarioForm,
  honorarioExitoPercentualForm,
  honorarioFixoValorForm,
  formaPagamentoForm,
  tipoRecebimentoForm,
  pixBancoForm,
  pixChaveForm,
  quantidadeParcelasForm,
  valorParcelaForm,
  diaVencimentoForm,
  valorEntradaForm,
  dataPrimeiroVencimentoForm,
  clausulasForm,
  percentualExitoForm,
  percentualExitoSobreRetroativoForm,
  quantidadeParcelasExitoPrevidenciarioForm,
  financeiroApuracaoTrabalhistaState,
  financeiroApuracaoPrevidenciariaState,
  onEditConditions
}: ContratoPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Re-build contract preview content using same canonical placeholder mappings
  const contractPreviewData = useMemo(() => {
    // 1. Resolve Contractee Name
    const rawNomeCompleto = (
      client?.pfData?.pf_nomeCompleto ||
      client?.pfDadosPessoais?.pf_nomeCompleto ||
      client?.razaoSocial ||
      client?.pjDadosEmpresa?.pj_razaoSocial ||
      client?.nomeCompleto ||
      client?.nome ||
      clientName ||
      ""
    ).trim();

    const nomeCompleto = rawNomeCompleto || null; // Null means pending

    // 2. Resolve Object / Service type
    const rawObjeto = (
      caseObj?.assunto ||
      caseObj?.tipoServicoContratado ||
      ""
    ).trim();
    const objeto = rawObjeto || null;

    // 3. Resolve Valor dos Honorários based on model
    const isFixoModel = ["fixo", "fixo_mais_exito_simples", "fixo_mais_exito_completo_trabalhista", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm);
    const hasFixoValue = honorarioFixoValorForm && honorarioFixoValorForm !== "0,00" && honorarioFixoValorForm !== "0";
    
    const isExitoModel = ["exito_simples", "exito_completo_trabalhista", "exito_completo_previdenciario", "fixo_mais_exito_simples", "fixo_mais_exito_completo_trabalhista", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm);
    const hasExitoPercent = percentualExitoForm && percentualExitoForm !== "0%" && percentualExitoForm !== "0";

    let valorHonorarios = null;
    if (isFixoModel && isExitoModel) {
      if (hasFixoValue && hasExitoPercent) {
        valorHonorarios = `R$ ${honorarioFixoValorForm} + ${percentualExitoForm} de Êxito`;
      }
    } else if (isFixoModel) {
      if (hasFixoValue) {
        valorHonorarios = `R$ ${honorarioFixoValorForm}`;
      }
    } else if (isExitoModel) {
      if (hasExitoPercent) {
        valorHonorarios = `${percentualExitoForm} de Êxito`;
      }
    }

    // 4. Resolve Forma de Pagamento
    const formaPagamento = (formaPagamentoForm && tipoRecebimentoForm) ? `${formaPagamentoForm} via ${tipoRecebimentoForm}` : null;

    // 5. Build Clausula Segunda Text (replicating buildClausulaSegunda logic)
    let descricaoFormaPagamento = "";
    switch (tipoRecebimentoForm) {
      case "Dinheiro":
        descricaoFormaPagamento = "pago em dinheiro, mediante recibo.";
        break;
      case "PIX":
        descricaoFormaPagamento = `pago mediante PIX para a conta de titularidade da PARTE CONTRATADA junto ao ${pixBancoForm || "[BANCO NÃO DEFINIDO]"}, chave PIX ${pixChaveForm || "[CHAVE PIX NÃO DEFINIDA]"}.`;
        break;
      case "Transferência Bancária":
        descricaoFormaPagamento = "pago mediante transferência bancária para conta indicada pela PARTE CONTRATADA.";
        break;
      case "PagSeguro":
        descricaoFormaPagamento = "pago mediante link de pagamento emitido pela plataforma PagSeguro.";
        break;
      case "InfinitePay":
        descricaoFormaPagamento = "pago mediante link de pagamento emitido pela plataforma InfinitePay.";
        break;
      case "ASAAS":
        descricaoFormaPagamento = "pago mediante boleto, PIX ou link de pagamento emitido pela plataforma ASAAS.";
        break;
      case "Stripe":
        descricaoFormaPagamento = "pago mediante link de pagamento emitido pela plataforma Stripe.";
        break;
      case "Cartão de Crédito - Maquininha PagSeguro":
        descricaoFormaPagamento = "pago mediante cartão de crédito na maquininha da PagSeguro.";
        break;
      default:
        descricaoFormaPagamento = "pago conforme condições acordadas.";
    }

    let fixedDetailStr = "";
    if (formaPagamentoForm === "À vista") {
      fixedDetailStr = `mencionado valor de R$ ${honorarioFixoValorForm} pago à vista, mediante ${descricaoFormaPagamento}`;
    } else if (formaPagamentoForm === "Parcelado") {
      fixedDetailStr = `mencionado valor de R$ ${honorarioFixoValorForm} parcelado em ${quantidadeParcelasForm} vezes mensais e sucessivas de R$ ${valorParcelaForm}, vencendo-se a primeira em ${dataPrimeiroVencimentoForm || "[DATA DE VENCIMENTO PENDENTE]"} e as demais todo dia ${diaVencimentoForm} dos meses subsequentes, mediante ${descricaoFormaPagamento}`;
    } else if (formaPagamentoForm === "Entrada + Parcelado") {
      fixedDetailStr = `mencionado valor de R$ ${honorarioFixoValorForm}, com sinal de R$ ${valorEntradaForm} a título de entrada e saldo em ${quantidadeParcelasForm} parcelas mensais e sucessivas de R$ ${valorParcelaForm}, vencendo-se a primeira em ${dataPrimeiroVencimentoForm || "[DATA DE VENCIMENTO PENDENTE]"} e as demais todo dia ${diaVencimentoForm} dos meses subsequentes, mediante ${descricaoFormaPagamento}`;
    } else {
      fixedDetailStr = `mencionado valor de R$ ${honorarioFixoValorForm} pago conforme condições da forma ${formaPagamentoForm}`;
    }

    let clausulaSegundaText = "";
    if (modeloHonorariosForm === "fixo") {
      clausulaSegundaText = `A título de honorários advocatícios contratuais, fica estabelecido o valor fixo de R$ ${honorarioFixoValorForm}, que será ${fixedDetailStr}.`;
    } else if (modeloHonorariosForm === "exito_simples") {
      clausulaSegundaText = `A título de honorários advocatícios em caso de êxito na demanda, fica estabelecido o percentual de ${percentualExitoForm} sobre o proveito econômico efetivo obtido pela PARTE CONTRATANTE, devido apenas em caso de desfecho favorável.`;
    } else if (modeloHonorariosForm === "exito_completo_trabalhista") {
      clausulaSegundaText = `A título de honorários advocatícios em caso de êxito na demanda, fica estabelecido o percentual de ${percentualExitoForm} incidentes sobre todos os valores efetivamente recebidos pela PARTE CONTRATANTE ou apurados em liquidação, acordo, alvará ou depósitos judiciais, apurados minuciosamente conforme tabela analítica de rateio.`;
    } else if (modeloHonorariosForm === "exito_completo_previdenciario") {
      const parcelasStr = quantidadeParcelasExitoPrevidenciarioForm > 0 ? `, bem como o valor equivalente a ${quantidadeParcelasExitoPrevidenciarioForm} parcelas mensais do benefício previdenciário concedido após sua implantação` : "";
      clausulaSegundaText = `A título de honorários advocatícios em caso de êxito na correspondente demanda previdenciária, fica estabelecido o percentual de ${percentualExitoSobreRetroativoForm} incidentes sobre o montante total de valores atrasados (retroativos) recebidos pela PARTE CONTRATANTE${parcelasStr}, em conformidade com as regras de proveito previdenciário.`;
    } else if (modeloHonorariosForm === "fixo_mais_exito_simples") {
      clausulaSegundaText = `A título de honorários advocatícios, pactua-se de forma cumulada: (a) o valor fixo de R$ ${honorarioFixoValorForm}, sendo ${fixedDetailStr}; e (b) o percentual de ${percentualExitoForm} sobre o proveito econômico final obtido pela PARTE CONTRATANTE como honorários de êxito.`;
    } else if (modeloHonorariosForm === "fixo_mais_exito_completo_trabalhista") {
      clausulaSegundaText = `A título de honorários advocatícios, pactua-se de forma cumulada: (a) o valor fixo de R$ ${honorarioFixoValorForm}, sendo ${fixedDetailStr}; e (b) o percentual de ${percentualExitoForm} incidentes sobre todos os valores recebidos ou apurados em liquidação, acordo, alvará ou depósitos judiciais vinculados ao processo trabalhista, apurados em tabela analítica.`;
    } else if (modeloHonorariosForm === "fixo_mais_exito_completo_previdenciario") {
      const parcelasStr = quantidadeParcelasExitoPrevidenciarioForm > 0 ? `, cumulado ainda com o valor de ${quantidadeParcelasExitoPrevidenciarioForm} parcelas do benefício previdenciário implantado` : "";
      clausulaSegundaText = `A título de honorários advocatícios, pactua-se de forma cumulada: (a) o valor fixo de R$ ${honorarioFixoValorForm}, sendo ${fixedDetailStr}; e (b) o percentual de ${percentualExitoSobreRetroativoForm} incidentes sobre os montante de parcelas atrasadas (retroativos)${parcelasStr}.`;
    } else {
      // Legacy fallback
      if (tipoHonorarioForm === "Êxito") {
        clausulaSegundaText = `A título de honorários advocatícios, fica estabelecido o percentual de ${honorarioExitoPercentualForm} sobre o proveito econômico obtido pela PARTE CONTRATANTE, percentual este devido apenas em caso de êxito na demanda.`;
      } else if (tipoHonorarioForm === "Honorários Fixos" && formaPagamentoForm === "À vista") {
        clausulaSegundaText = `A título de honorários advocatícios, fica estabelecido o valor total de R$ ${honorarioFixoValorForm}, a ser pago à vista, mediante ${descricaoFormaPagamento}`;
      } else if (tipoHonorarioForm === "Honorários Fixos" && formaPagamentoForm === "Parcelado") {
        clausulaSegundaText = `A título de honorários advocatícios, fica estabelecido o valor total de R$ ${honorarioFixoValorForm}, que será pago em ${quantidadeParcelasForm} parcelas mensais e sucessivas de R$ ${valorParcelaForm}, vencendo-se a primeira em ${dataPrimeiroVencimentoForm || "[DATA DE VENCIMENTO PENDENTE]"} e as demais todo dia ${diaVencimentoForm} dos meses subsequentes, mediante ${descricaoFormaPagamento}`;
      } else if (tipoHonorarioForm === "Honorários Fixos" && formaPagamentoForm === "Entrada + Parcelado") {
        clausulaSegundaText = `A título de honorários advocatícios, fica estabelecido o valor total de R$ ${honorarioFixoValorForm}, sendo R$ ${valorEntradaForm} pagos a título de entrada e o saldo remanescente dividido em ${quantidadeParcelasForm} parcelas mensais e sucessivas de R$ ${valorParcelaForm}, vencendo-se a primeira em ${dataPrimeiroVencimentoForm || "[DATA DE VENCIMENTO PENDENTE]"} e as demais todo dia ${diaVencimentoForm} dos meses subsequentes, mediante ${descricaoFormaPagamento}`;
      } else if (tipoHonorarioForm === "Misto (Fixo + Êxito)") {
        clausulaSegundaText = `A título de honorários advocatícios, fica estabelecido o valor fixo de R$ ${honorarioFixoValorForm}, pago mediante ${descricaoFormaPagamento}, bem como o percentual de ${honorarioExitoPercentualForm} sobre o proveito econômico obtido pela PARTE CONTRATANTE in caso de êxito na demanda.`;
      }
    }

    // 6. Check for missing fields to compute pendency warnings
    const pendencies: string[] = [];
    if (!nomeCompleto) pendencies.push("nome da parte contratante");
    if (!objeto) pendencies.push("objeto do contrato");
    if (!valorHonorarios) pendencies.push("valor dos honorários");
    if (!formaPagamento) pendencies.push("forma de pagamento");

    const resolvedClient = {
      nome: nomeCompleto || <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">[PENDENTE: nome da parte contratante]</span>,
      nacionalidade: client?.pfData?.pf_nacionalidade || client?.pfDadosPessoais?.pf_nacionalidade || "Brasileiro(a)",
      estadoCivil: client?.pfData?.pf_estadoCivil || client?.pfDadosPessoais?.pf_estadoCivil || "Solteiro(a)",
      profissao: client?.pfData?.pf_profissao || client?.pfDadosPessoais?.pf_profissao || "Autônomo(a)",
      rg: client?.pfData?.pf_rg || client?.pfDadosPessoais?.pf_rg || "Não cadastrado",
      cpf: client?.pfData?.pf_cpf || client?.pfDadosPessoais?.pf_cpf || client?.cpf || "Não cadastrado",
      endereco: client?.pfData?.pf_enderecoCompleto || client?.pfDadosPessoais?.pf_enderecoCompleto || "Não informado",
      telefone: client?.pfData?.pf_telefone || client?.pfDadosPessoais?.pf_telefone || "Não informado",
      email: client?.pfData?.pf_email || client?.pfDadosPessoais?.pf_email || "Não informado",
    };

    const resolvedPj = {
      razaoSocial: nomeCompleto || <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">[PENDENTE: nome da parte contratante]</span>,
      cnpj: client?.pjDadosEmpresa?.pj_cnpj || client?.cnpj || "Não cadastrado",
      endereco: client?.pjDadosEmpresa?.pj_enderecoCompleto || "Não informado",
      repNome: client?.pjDadosRepresentante?.pj_representanteNomeCompleto || "[REPRESENTANTE PENDENTE]",
      repCpf: client?.pjDadosRepresentante?.pj_representanteCpf || "[CPF REPRESENTANTE PENDENTE]",
    };

    return {
      nomeCompleto,
      objeto,
      valorHonorarios,
      formaPagamento,
      clausulaSegundaText,
      pendencies,
      resolvedClient,
      resolvedPj,
    };
  }, [
    client,
    caseObj,
    clientName,
    modeloHonorariosForm,
    tipoHonorarioForm,
    honorarioExitoPercentualForm,
    honorarioFixoValorForm,
    formaPagamentoForm,
    tipoRecebimentoForm,
    pixBancoForm,
    pixChaveForm,
    quantidadeParcelasForm,
    valorParcelaForm,
    diaVencimentoForm,
    valorEntradaForm,
    dataPrimeiroVencimentoForm,
    percentualExitoForm,
    percentualExitoSobreRetroativoForm,
    quantidadeParcelasExitoPrevidenciarioForm,
    financeiroApuracaoTrabalhistaState,
    financeiroApuracaoPrevidenciariaState
  ]);

  const { pendencies, resolvedClient, resolvedPj, objeto: resolvedObjeto, clausulaSegundaText, nomeCompleto } = contractPreviewData;

  const renderContractText = () => {
    return (
      <div className="font-serif text-slate-800 text-[13px] leading-relaxed p-8 bg-white border border-slate-200 rounded-lg shadow-sm space-y-6 text-justify">
        {/* CABEÇALHO */}
        <div className="text-center font-bold space-y-1 border-b border-slate-300 pb-4 mb-6">
          <p className="text-sm font-sans tracking-wide text-slate-900 font-black">GIFFONI ADVOGADOS ASSOCIADOS</p>
          <p className="text-[14px]">CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS PROFISSIONAIS</p>
        </div>

        {/* PARTES */}
        <div>
          <p className="font-bold uppercase text-[11px] font-sans text-slate-400 tracking-wider mb-2">I. DAS PARTES CONTRATANTES</p>
          {isPf ? (
            <p>
              <strong>CONTRATANTE:</strong> {resolvedClient.nome}, nacionalidade {resolvedClient.nacionalidade.toLowerCase()}, {resolvedClient.estadoCivil.toLowerCase()}, {resolvedClient.profissao.toLowerCase()}, portador(a) do RG nº {resolvedClient.rg} e CPF nº {resolvedClient.cpf}, residente e domiciliado(a) em {resolvedClient.endereco}, telefone {resolvedClient.telefone}, e-mail {resolvedClient.email}.
            </p>
          ) : (
            <p>
              <strong>CONTRATANTE:</strong> {resolvedPj.razaoSocial}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {resolvedPj.cnpj}, com sede em {resolvedPj.endereco}, neste ato representada por seu Sócio Administrador, Sr(a). {resolvedPj.repNome}, inscrito no CPF sob o nº {resolvedPj.repCpf}.
            </p>
          )}
          <p className="mt-3">
            <strong>CONTRATADA:</strong> <strong>GIFFONI ADVOGADOS ASSOCIADOS</strong>, sob a responsabilidade técnica do Dr. Rodrigo Giffoni Rodrigues, OAB/MG 157.320, com endereço profissional na Avenida Principal, Viçosa, MG, e-mail contato@giffoniconnect.com.br.
          </p>
        </div>

        {/* OBJETO */}
        <div>
          <p className="font-bold uppercase text-[11px] font-sans text-slate-400 tracking-wider mb-2">II. DO OBJETO DO CONTRATO</p>
          <p>
            <strong>CLÁUSULA PRIMEIRA:</strong> O objeto deste contrato é a prestação de serviços jurídicos e patrocínio da demanda judicial ou administrativa referente a:{" "}
            {resolvedObjeto ? (
              <strong className="text-slate-900 underline underline-offset-2">{resolvedObjeto}</strong>
            ) : (
              <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">[PENDENTE: objeto do contrato]</span>
            )}
            , compreendendo o ajuizamento, acompanhamento processual e manifestações em todas as fases necessárias.
          </p>
        </div>

        {/* HONORÁRIOS */}
        <div>
          <p className="font-bold uppercase text-[11px] font-sans text-slate-400 tracking-wider mb-2">III. DOS HONORÁRIOS ADVOCATÍCIOS</p>
          <p>
            <strong>CLÁUSULA SEGUNDA:</strong> {clausulaSegundaText || <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">[PENDENTE: valor dos honorários]</span>}
          </p>
          <p className="mt-3">
            <strong>PARÁGRAFO ÚNICO:</strong> Os pagamentos pactuados serão devidos pontualmente nas datas de seus vencimentos, independentemente de intimação, servindo o presente contrato como título executivo extrajudicial em caso de inadimplemento.
          </p>
        </div>

        {/* OBRIGAÇÕES */}
        <div>
          <p className="font-bold uppercase text-[11px] font-sans text-slate-400 tracking-wider mb-2">IV. DAS OBRIGAÇÕES E RESPONSABILIDADES</p>
          <p>
            <strong>CLÁUSULA TERCEIRA:</strong> A PARTE CONTRATANTE obriga-se a fornecer todos os documentos, informações fidedignas e meios necessários para o bom andamento da ação, bem como arcar com custas judiciais e despesas de locomoção, caso estas ocorram.
          </p>
          <p className="mt-3">
            <strong>CLÁUSULA QUARTA:</strong> A PARTE CONTRATADA compromete-se a atuar de forma diligente e técnica na defesa dos interesses da CONTRATANTE, mantendo-a informada periodicamente acerca do andamento do feito.
          </p>
        </div>

        {/* CLÁUSULAS ADICIONAIS */}
        <div>
          <p className="font-bold uppercase text-[11px] font-sans text-slate-400 tracking-wider mb-2">V. DAS CONDIÇÕES COMPLEMENTARES</p>
          <p>
            <strong>CLÁUSULA QUINTA:</strong> {clausulasForm || "Nenhuma cláusula adicional ou condição especial foi cadastrada para este contrato."}
          </p>
        </div>

        {/* FORO E ASSINATURA */}
        <div className="pt-4 border-t border-slate-200 text-center">
          <p className="italic">Viçosa, MG, {new Date().toLocaleDateString("pt-BR")}.</p>
          
          <div className="grid grid-cols-2 gap-8 pt-10 text-center font-sans">
            <div className="border-t border-slate-350 pt-2 text-[11px]">
              <p className="font-bold uppercase text-slate-800">{nomeCompleto || "PARTE CONTRATANTE"}</p>
              <p className="text-slate-500 font-semibold">CONTRATANTE</p>
            </div>
            <div className="border-t border-slate-350 pt-2 text-[11px]">
              <p className="font-bold text-slate-800">GIFFONI ADVOGADOS ASSOCIADOS</p>
              <p className="text-slate-500 font-semibold">CONTRATADA</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-150 rounded-3xl shadow-3xs overflow-hidden animate-in fade-in">
      {/* HEADER CARD */}
      <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-50 text-indigo-700 rounded-full font-black text-[9px] uppercase tracking-wider font-mono">
              Visualização Prévia
            </span>
            <Sparkles size={14} className="text-indigo-500" />
          </div>
          <h3 className="text-sm font-black text-slate-900">
            Prévia do Contrato de Honorários
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xl font-medium">
            Confira o documento antes de gerar a versão oficial no Google Docs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEditConditions}
            className="p-2 text-slate-550 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
            title="Editar condições operacionais"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-2 text-slate-550 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Abrir em tela ampliada"
          >
            <Maximize2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-550 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            {isExpanded ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-4 animate-in slide-in-from-top-1 duration-200">
          {/* BANNER DE STATUS DE INFORMAÇÕES PENDENTES */}
          {pendencies.length > 0 ? (
            <div className="p-3.5 bg-rose-50 border border-rose-120 text-rose-750 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-pulse">
              <AlertTriangle size={15} className="text-rose-500 shrink-0" />
              <span>Há informações pendentes. Revise os campos destacados antes de gerar o contrato oficial. (Falta: {pendencies.join(", ")})</span>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 border border-emerald-120 text-emerald-850 rounded-xl text-xs font-semibold flex items-center gap-2.5">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>Prévia atualizada. O contrato está pronto para conferência antes da geração.</span>
            </div>
          )}

          {/* ÁREA DE VISUALIZAÇÃO COM SCROLL */}
          <div className="max-h-[480px] overflow-y-auto bg-slate-100/60 p-4 rounded-2xl border border-slate-200 shadow-inner scrollbar-thin">
            {renderContractText()}
          </div>

          <div className="pt-2 flex items-center justify-between gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Atualização automática ativa (debounce de digitação)
            </span>
            <button
              type="button"
              onClick={onEditConditions}
              className="text-indigo-600 hover:text-indigo-800 hover:underline uppercase text-[10px] font-bold tracking-wider"
            >
              Editar Condições Operacionais ↑
            </button>
          </div>
        </div>
      )}

      {/* FULL-SCREEN MODAL PREVIEW */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
          <div className="bg-slate-100 w-full max-w-4xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Visualização Ampliada — Contrato de Honorários</h3>
                <p className="text-xs text-slate-500">Confira a minuta jurídica na íntegra com tipografia de alta fidelidade</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-thin">
              <div className="max-w-2xl mx-auto shadow-md">
                {renderContractText()}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-400">Pressione ESC ou clique no X para fechar</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-3xs cursor-pointer"
              >
                Fechar Prévia Ampliada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
