/**
 * Unified place for computing Google Docs Placeholders for all documented templates.
 * Implements architectural requirements: Section 10.
 */

export const PROCURACAO_PF_REQUIRED_PLACEHOLDERS = [
  "{{OUTORGANTE_NOME}}",
  "{{OUTORGANTE_NACIONALIDADE}}",
  "{{OUTORGANTE_ESTADO_CIVIL}}",
  "{{OUTORGANTE_PROFISSAO}}",
  "{{OUTORGANTE_RG}}",
  "{{OUTORGANTE_CPF}}",
  "{{OUTORGANTE_ENDERECO}}",
  "{{OUTORGANTE_NUMERO}}",
  "{{OUTORGANTE_COMPLEMENTO}}",
  "{{OUTORGANTE_BAIRRO}}",
  "{{OUTORGANTE_CIDADE}}",
  "{{OUTORGANTE_ESTADO}}",
  "{{OUTORGANTE_CEP}}",
  "{{OUTORGANTE_TELEFONE}}",
  "{{OUTORGANTE_WHATSAPP}}",
  "{{OUTORGANTE_EMAIL}}",
  "{{DATA_ASSINATURA}}"
];

export function buildGlobalPlaceholders(): Record<string, string> {
  const now = new Date();
  const day = now.getDate();
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const dateStr = `${day} de ${month.toLowerCase()} de ${year}`;
  
  return {
    "{{DATA_ATUAL}}": dateStr,
    "{{DATA_ASSINATURA}}": "data da assinatura eletrônica",
    "{{CIDADE_ASSINATURA}}": "Viçosa, MG",
    "{{ADVOGADO_NOME}}": "RODRIGO GIFFONI RODRIGUES",
    "{{ADVOGADO_OAB}}": "OAB/MG 157.320",
    "{{ESCRITORIO_NOME}}": "Giffoni Connect",
    "{{ESCRITORIO_EMAIL}}": "contato@giffoniconnect.com.br",
    "{{ESCRITORIO_TELEFONE}}": "(31) 99999-9999",
    "{{ESCRITORIO_ENDERECO}}": "Avenida Principal, Viçosa, MG",
  };
}

export function buildClientCommonPlaceholders(clientData: any): Record<string, string> {
  if (!clientData) return {};
  
  const getField = (keys: string[]): string => {
    for (const key of keys) {
      const val = clientData?.[key] ?? clientData?.pfDadosPessoais?.[key] ?? clientData?.pfData?.[key] ?? clientData?.pjDadosEmpresa?.[key] ?? clientData?.pjData?.[key];
      if (val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
    return "";
  };

  // Support PF
  const nomeCompleto = getField(["pf_nomeCompleto"]) || clientData?.nomeCompleto || clientData?.nome || "";
  const cpf = getField(["pf_cpf"]) || clientData?.cpf || "";
  const rg = getField(["pf_rg"]) || clientData?.rg || "";
  const nacionalidade = getField(["pf_nacionalidade"]) || "Brasileiro(a)";
  const estadoCivil = getField(["pf_estadoCivil"]) || "Solteiro(a)";
  const profissao = getField(["pf_profissao"]) || "";
  const email = getField(["pf_email"]) || clientData?.email || "";
  const telefone = getField(["pf_telefone"]) || clientData?.telefone || "";
  const whatsapp = getField(["pf_whatsapp"]) || clientData?.whatsapp || "";
  
  // Address builder
  const rua = getField(["pf_endereco", "endereco", "rua"]);
  const num = getField(["pf_numero", "numero"]);
  const comp = getField(["pf_complemento", "complemento"]);
  const bairro = getField(["pf_bairro", "bairro"]);
  const cidade = getField(["pf_cidade", "cidade", "pf_localidade"]);
  const estado = getField(["pf_estado", "estado", "pf_uf"]);
  const cep = getField(["pf_cep", "cep"]);
  
  let enderecoCompleto = "";
  if (rua) {
    enderecoCompleto += rua;
    if (num) enderecoCompleto += `, nº ${num}`;
    if (comp) enderecoCompleto += `, ${comp}`;
    if (bairro) enderecoCompleto += `, Bairro ${bairro}`;
    if (cidade) enderecoCompleto += `, ${cidade}`;
    if (estado) enderecoCompleto += ` - ${estado}`;
    if (cep) enderecoCompleto += `, CEP ${cep}`;
  } else {
    enderecoCompleto = getField(["pf_enderecoCompleto", "pf_endereco", "enderecoCompleto", "endereco"]) || "";
  }

  // Support PJ
  const razaoSocial = getField(["pj_razaoSocial", "razaoSocial", "nomeEmpresa"]) || clientData?.razaoSocial || "";
  const nomeFantasia = getField(["pj_nomeFantasia", "nomeFantasia"]) || clientData?.nomeFantasia || "";
  const cnpj = getField(["pj_cnpj", "cnpj"]) || clientData?.cnpj || "";
  const emailEmpresa = getField(["pj_email", "emailEmpresa", "pj_emailEmpresa"]) || "";
  const telefoneEmpresa = getField(["pj_telefone", "telefoneEmpresa", "pj_telefoneEmpresa"]) || "";
  
  const ruaEmp = getField(["pj_endereco", "pj_rua"]);
  const numEmp = getField(["pj_numero", "pj_num"]);
  const compEmp = getField(["pj_complemento", "pj_comp"]);
  const bairroEmp = getField(["pj_bairro", "pj_bairro"]);
  const cidadeEmp = getField(["pj_cidade", "pj_cidade"]);
  const estadoEmp = getField(["pj_estado", "pj_estado"]);
  const cepEmp = getField(["pj_cep", "pj_cep"]);
  
  let enderecoEmpresaCompleto = "";
  if (ruaEmp) {
    enderecoEmpresaCompleto += ruaEmp;
    if (numEmp) enderecoEmpresaCompleto += `, nº ${numEmp}`;
    if (compEmp) enderecoEmpresaCompleto += `, ${compEmp}`;
    if (bairroEmp) enderecoEmpresaCompleto += `, Bairro ${bairroEmp}`;
    if (cidadeEmp) enderecoEmpresaCompleto += `, ${cidadeEmp}`;
    if (estadoEmp) enderecoEmpresaCompleto += ` - ${estadoEmp}`;
    if (cepEmp) enderecoEmpresaCompleto += `, CEP ${cepEmp}`;
  } else {
    enderecoEmpresaCompleto = getField(["pj_enderecoCompleto", "pj_endereco"]) || "";
  }

  // Representative (PJ)
  const repNome = getField(["pj_nomeSocioAdministrador", "pj_socioNome", "socioNome"]) || clientData?.pjDadosRepresentante?.pj_representanteNomeCompleto || "";
  const repNacionalidade = getField(["pj_nacionalidadeSocio", "pj_socioNacionalidade"]) || "Brasileiro(a)";
  const repEstadoCivil = getField(["pj_estadoCivilSocio", "pj_socioEstadoCivil"]) || "Solteiro(a)";
  const repProfissao = getField(["pj_profissaoSocio", "pj_socioProfissao"]) || "";
  const repCpf = getField(["pj_cpfSocio", "pj_socioCpf"]) || clientData?.pjDadosRepresentante?.pj_representanteCpf || "";
  const repRg = getField(["pj_rgSocio", "pj_socioRg"]) || "";
  const repCargo = getField(["pj_cargoSocio", "pj_socioCargo"]) || "Sócio Administrador";
  const repEndCompleto = getField(["pj_enderecoSocioCompleto", "pj_socioEnderecoCompleto"]) || "";

  return {
    "{{NOME_CLIENTE}}": nomeCompleto || razaoSocial,
    "{{TIPO_CLIENTE}}": clientData?.tipoCliente || clientData?.clientType || (cnpj ? "PJ" : "PF"),
    "{{CPF_CNPJ}}": cpf || cnpj,
    "{{RG}}": rg,
    "{{EMAIL}}": email,
    "{{TELEFONE}}": telefone,
    "{{WHATSAPP}}": whatsapp,
    "{{ENDERECO_COMPLETO}}": enderecoCompleto,
    
    // PF Specific
    "{{NOME_COMPLETO}}": nomeCompleto,
    "{{CPF}}": cpf,
    "{{NACIONALIDADE}}": nacionalidade,
    "{{ESTADO_CIVIL}}": estadoCivil,
    "{{PROFISSAO}}": profissao,
    
    // PJ Specific
    "{{RAZAO_SOCIAL}}": razaoSocial,
    "{{NOME_FANTASIA}}": nomeFantasia,
    "{{CNPJ}}": cnpj,
    "{{ENDERECO_EMPRESA_COMPLETO}}": enderecoEmpresaCompleto,
    "{{EMAIL_EMPRESA}}": emailEmpresa,
    "{{TELEFONE_EMPRESA}}": telefoneEmpresa,
    "{{NOME_SOCIO_ADMINISTRADOR}}": repNome,
    "{{NACIONALIDADE_SOCIO}}": repNacionalidade,
    "{{ESTADO_CIVIL_SOCIO}}": repEstadoCivil,
    "{{PROFISSAO_SOCIO}}": repProfissao,
    "{{CPF_SOCIO}}": repCpf,
    "{{RG_SOCIO}}": repRg,
    "{{CARGO_SOCIO}}": repCargo,
    "{{ENDERECO_SOCIO_COMPLETO}}": repEndCompleto || enderecoCompleto,
  };
}

export function buildCaseCommonPlaceholders(caseData: any): Record<string, string> {
  if (!caseData) return {};
  
  return {
    "{{ASSUNTO}}": caseData?.assunto || caseData?.subject || "",
    "{{COMARCA}}": caseData?.comarca || caseData?.courtCity || "",
    "{{VARA}}": caseData?.vara || caseData?.courtBranch || "",
    "{{NOME_PARTE_ADVERSA}}": caseData?.nomeParteAdversa || caseData?.adversaryName || caseData?.reu || "",
    "{{RELATO_INICIAL}}": caseData?.relatoInicial || caseData?.initialRelate || "",
    "{{ENTREVISTA_5W2H}}": typeof caseData?.entrevista5w2h === 'object' ? JSON.stringify(caseData.entrevista5w2h) : (caseData?.entrevista5w2h || ""),
    "{{RESPONSAVEL_ATENDIMENTO}}": caseData?.responsavelAtendimento || caseData?.assignedUser || "",
  };
}

export function resolvePfClientData(clientData: any) {
  if (!clientData) return {};
  
  const getVal = (vals: any[]) => {
    for (const v of vals) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  const nomeCompleto = getVal([
    clientData?.pfData?.pf_nomeCompleto,
    clientData?.pfDadosPessoais?.pf_nomeCompleto,
    clientData?.portalMirror?.pfDadosPessoais?.nomeCompleto,
    clientData?.nomeCompleto,
    clientData?.nome,
    clientData?.name
  ]);

  const cpf = getVal([
    clientData?.pfData?.pf_cpf,
    clientData?.pfDadosPessoais?.pf_cpf,
    clientData?.portalMirror?.pfDadosPessoais?.cpf,
    clientData?.cpf
  ]);

  const rg = getVal([
    clientData?.pfData?.pf_rg,
    clientData?.pfDadosPessoais?.pf_rg,
    clientData?.portalMirror?.pfDadosPessoais?.rg,
    clientData?.rg
  ]);

  const nacionalidade = getVal([
    clientData?.pfData?.pf_nacionalidade,
    clientData?.pfDadosPessoais?.pf_nacionalidade,
    clientData?.portalMirror?.pfDadosPessoais?.nacionalidade
  ]) || "Brasileiro(a)";

  const estadoCivil = getVal([
    clientData?.pfData?.pf_estadoCivil,
    clientData?.pfDadosPessoais?.pf_estadoCivil,
    clientData?.portalMirror?.pfDadosPessoais?.estadoCivil
  ]) || "Solteiro(a)";

  const profissao = getVal([
    clientData?.pfData?.pf_profissao,
    clientData?.pfDadosPessoais?.pf_profissao,
    clientData?.portalMirror?.pfDadosPessoais?.profissao
  ]);

  const telefone = getVal([
    clientData?.pfData?.pf_telefone,
    clientData?.pfDadosPessoais?.pf_telefone,
    clientData?.portalMirror?.pfContato?.telefone,
    clientData?.telefone
  ]);

  const whatsapp = getVal([
    clientData?.pfData?.pf_whatsapp,
    clientData?.pfDadosPessoais?.pf_whatsapp,
    clientData?.portalMirror?.pfContato?.whatsapp,
    clientData?.whatsapp
  ]);

  const email = getVal([
    clientData?.pfData?.pf_email,
    clientData?.pfDadosPessoais?.pf_email,
    clientData?.portalMirror?.pfContato?.email,
    clientData?.email
  ]);

  const endereco = getVal([
    clientData?.pfData?.pf_endereco,
    clientData?.pfDadosPessoais?.pf_endereco,
    clientData?.portalMirror?.pfEndereco?.logradouro,
    clientData?.endereco
  ]);

  const numero = getVal([
    clientData?.pfData?.pf_numero,
    clientData?.pfDadosPessoais?.pf_numero,
    clientData?.portalMirror?.pfEndereco?.numero
  ]);

  const complemento = getVal([
    clientData?.pfData?.pf_complemento,
    clientData?.pfDadosPessoais?.pf_complemento
  ]);

  const bairro = getVal([
    clientData?.pfData?.pf_bairro,
    clientData?.pfDadosPessoais?.pf_bairro,
    clientData?.portalMirror?.pfEndereco?.bairro
  ]);

  const cidade = getVal([
    clientData?.pfData?.pf_cidade,
    clientData?.pfDadosPessoais?.pf_cidade,
    clientData?.portalMirror?.pfEndereco?.cidade
  ]);

  const estado = getVal([
    clientData?.pfData?.pf_estado,
    clientData?.pfDadosPessoais?.pf_estado,
    clientData?.portalMirror?.pfEndereco?.uf
  ]);

  const cep = getVal([
    clientData?.pfData?.pf_cep,
    clientData?.pfDadosPessoais?.pf_cep,
    clientData?.portalMirror?.pfEndereco?.cep
  ]);

  return {
    nomeCompleto,
    cpf,
    rg,
    nacionalidade,
    estadoCivil,
    profissao,
    telefone,
    whatsapp,
    email,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep
  };
}

export function buildPrimeiroAtendimentoPlaceholders(clientData: any, caseData: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  const solved = resolvePfClientData(clientData);
  
  return {
    ...global,
    ...client,
    ...casePls,
    "{{DATA_ATENDIMENTO}}": global["{{DATA_ATUAL}}"],

    "{{OUTORGANTE_NOME}}": solved.nomeCompleto || client["{{NOME_COMPLETO}}"] || "",
    "{{OUTORGANTE_NACIONALIDADE}}": solved.nacionalidade || client["{{NACIONALIDADE}}"] || "Brasileira",
    "{{OUTORGANTE_ESTADO_CIVIL}}": solved.estadoCivil || client["{{ESTADO_CIVIL}}"] || "Solteiro(a)",
    "{{OUTORGANTE_PROFISSAO}}": solved.profissao || client["{{PROFISSAO}}"] || "",
    "{{OUTORGANTE_RG}}": solved.rg || client["{{RG}}"] || "",
    "{{OUTORGANTE_CPF}}": solved.cpf || client["{{CPF}}"] || "",
    "{{OUTORGANTE_ENDERECO}}": solved.endereco || client["{{ENDERECO_COMPLETO}}"] || "",
    "{{OUTORGANTE_NUMERO}}": solved.numero || "",
    "{{OUTORGANTE_COMPLEMENTO}}": solved.complemento || "",
    "{{OUTORGANTE_BAIRRO}}": solved.bairro || "",
    "{{OUTORGANTE_CIDADE}}": solved.cidade || "",
    "{{OUTORGANTE_ESTADO}}": solved.estado || "",
    "{{OUTORGANTE_CEP}}": solved.cep || "",
    "{{OUTORGANTE_TELEFONE}}": solved.telefone || client["{{TELEFONE}}"] || "",
    "{{OUTORGANTE_WHATSAPP}}": solved.whatsapp || client["{{WHATSAPP}}"] || "",
    "{{OUTORGANTE_EMAIL}}": solved.email || client["{{EMAIL}}"] || ""
  };
}

export function buildProcuracaoPfPlaceholders(clientData: any, caseData?: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  
  const getField = (keys: string[]): string => {
    for (const key of keys) {
      const val = clientData?.[key] ?? clientData?.pfDadosPessoais?.[key] ?? clientData?.pfData?.[key];
      if (val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
    return "";
  };

  // Extract separate street address
  const rua = getField(["pf_endereco", "endereco", "rua"]);
  const numOrig = getField(["pf_numero", "numero"]);
  const compOrig = getField(["pf_complemento", "complemento"]);
  const bairroOrig = getField(["pf_bairro", "bairro"]);
  const cidadeOrig = getField(["pf_cidade", "cidade", "pf_localidade"]);
  const estadoOrig = getField(["pf_estado", "estado", "pf_uf"]);
  const cepOrig = getField(["pf_cep", "cep"]);

  // Legacy keys mapped for older document templates
  const oldPfPls: Record<string, string> = {
    "{{OUTORGANTE_NOME}}": client["{{NOME_COMPLETO}}"] || getField(["pf_nomeCompleto"]) || "",
    "{{OUTORGANTE_NACIONALIDADE}}": client["{{NACIONALIDADE}}"] || getField(["pf_nacionalidade"]) || "Brasileira",
    "{{OUTORGANTE_ESTADO_CIVIL}}": client["{{ESTADO_CIVIL}}"] || getField(["pf_estadoCivil"]) || "Solteiro(a)",
    "{{OUTORGANTE_PROFISSAO}}": client["{{PROFISSAO}}"] || getField(["pf_profissao"]) || "",
    "{{OUTORGANTE_CPF}}": client["{{CPF}}"] || getField(["pf_cpf"]) || "",
    "{{OUTORGANTE_RG}}": client["{{RG}}"] || getField(["pf_rg"]) || "",
    "{{OUTORGANTE_ORGAO_EMISSOR}}": getField(["pf_orgaoEmissor"]) || "",
    "{{OUTORGANTE_DATA_EMISSAO}}": getField(["pf_dataEmissao"]) || "",
    "{{OUTORGANTE_DATA_NASCIMENTO}}": getField(["pf_dataNascimento", "pf_nascimento"]) || "",
    "{{OUTORGANTE_ENDERECO}}": rua || client["{{ENDERECO_COMPLETO}}"] || "",
    "{{OUTORGANTE_NUMERO}}": numOrig || "",
    "{{OUTORGANTE_COMPLEMENTO}}": compOrig || "",
    "{{OUTORGANTE_BAIRRO}}": bairroOrig || "",
    "{{OUTORGANTE_CIDADE}}": cidadeOrig || "",
    "{{OUTORGANTE_ESTADO}}": estadoOrig || "",
    "{{OUTORGANTE_CEP}}": cepOrig || "",
    "{{OUTORGANTE_EMAIL}}": client["{{EMAIL}}"] || getField(["pf_email"]) || "",
    "{{OUTORGANTE_TELEFONE}}": client["{{TELEFONE}}"] || getField(["pf_telefone"]) || "",
    "{{OUTORGANTE_WHATSAPP}}": client["{{WHATSAPP}}"] || getField(["pf_whatsapp"]) || "",
    "{{OUTORGANTE_INSTAGRAM}}": getField(["pf_instagram"]) || "",
    "{{OUTORGANTE_FACEBOOK}}": getField(["pf_facebook"]) || "",
    "{{OUTORGANTE_TIKTOK}}": getField(["pf_tiktok"]) || "",
    "{{LOCAL_ASSINATURA}}": global["{{CIDADE_ASSINATURA}}"] || "Viçosa, MG",
    "{{DATA_ASSINATURA}}": global["{{DATA_ATUAL}}"] || "",
  };

  return {
    ...global,
    ...client,
    ...casePls,
    ...oldPfPls
  };
}

export function buildProcuracaoPjPlaceholders(clientData: any, caseData: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  
  return {
    ...global,
    ...client,
    ...casePls
  };
}

export function buildDeclaracaoPobrezaPfPlaceholders(clientData: any, caseData: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  
  return {
    ...global,
    ...client,
    ...casePls,
    "{{DECLARACAO_HIPOSSUFICIENCIA}}": "declaro, sob as penas da lei, que não possuo condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo do próprio sustento e de minha família."
  };
}

export function buildDeclaracaoPobrezaPjPlaceholders(clientData: any, caseData: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  
  return {
    ...global,
    ...client,
    ...casePls,
    "{{DECLARACAO_HIPOSSUFICIENCIA}}": "declaro, sob as penas da lei, que a pessoa jurídica requerente não possui condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo de suas atividades operacionais."
  };
}

export function buildContratoHonorariosPfPlaceholders(clientData: any, caseData: any, financialData?: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  
  const fin = financialData || caseData?.financeiro || {};
  
  return {
    ...global,
    ...client,
    ...casePls,
    "{{TIPO_SERVICO}}": fin?.tipoServico || caseData?.tipoServico || "Serviço de Assessoria Jurídica",
    "{{FORMA_COBRANCA}}": fin?.formaCobranca || "Parcelado",
    "{{VALOR_HONORARIOS}}": fin?.valorTotal || fin?.valorHonorarios || "A combinar",
    "{{ENTRADA}}": fin?.entrada || "Não aplicável",
    "{{PARCELAS}}": fin?.parcelas || "1",
    "{{VENCIMENTO}}": fin?.vencimento || fin?.vencimentoPrimeiraParcela || "A vencer",
    "{{CLAUSULAS_ESPECIFICAS}}": fin?.clausulas || "Nenhuma cláusula especial cadastrada."
  };
}

export function buildContratoHonorariosPjPlaceholders(clientData: any, caseData: any, financialData?: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  
  const fin = financialData || caseData?.financeiro || {};
  
  return {
    ...global,
    ...client,
    ...casePls,
    "{{TIPO_SERVICO}}": fin?.tipoServico || caseData?.tipoServico || "Serviço de Assessoria Jurídica Empresarial",
    "{{FORMA_COBRANCA}}": fin?.formaCobranca || "Parcelado",
    "{{VALOR_HONORARIOS}}": fin?.valorTotal || fin?.valorHonorarios || "A combinar",
    "{{ENTRADA}}": fin?.entrada || "Não aplicável",
    "{{PARCELAS}}": fin?.parcelas || "1",
    "{{VENCIMENTO}}": fin?.vencimento || fin?.vencimentoPrimeiraParcela || "A vencer",
    "{{CLAUSULAS_ESPECIFICAS}}": fin?.clausulas || "Nenhuma cláusula especial cadastrada."
  };
}

export function buildPrePeticaoPlaceholders(clientData: any, caseData: any, judicialData?: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  
  const jud = judicialData || caseData?.judicial || {};
  
  return {
    ...global,
    ...client,
    ...casePls,
    "{{JUIZO_COMPETENTE}}": jud?.juizoCompetente || "Juízo de Direito",
    "{{NOME_ACAO}}": jud?.nomeAcao || "Ação de Cobrança",
    "{{QUALIFICACAO_AUTOR}}": jud?.qualificacaoAutor || "Qualificação completa do Autor",
    "{{QUALIFICACAO_REU}}": jud?.qualificacaoReu || "Qualificação completa do Réu",
    "{{DOS_FATOS}}": jud?.dosFatos || "Descrição detalhada dos fatos ocorridos.",
    "{{DOS_FUNDAMENTOS}}": jud?.dosFundamentos || "Fundamentação jurídica embasando o pleito.",
    "{{TUTELA_URGENCIA}}": jud?.tutelaUrgencia || "Demonstração do perigo de dano e probabilidade do direito.",
    "{{PEDIDOS}}": jud?.pedidos || "Relação formal dos pedidos requeridos.",
    "{{PROVAS}}": jud?.provas || "Indicação das provas documentais anexadas.",
    "{{VALOR_CAUSA}}": jud?.valorCausa || "Valor por extenso estimativo.",
    "{{TERMO_FINAL}}": jud?.termoFinal || "Termos em que pede deferimento.",
    "{{ASSINATURA_ADVOGADO}}": `${global["{{ADVOGADO_NOME}}"]} - ${global["{{ADVOGADO_OAB}}"]}`
  };
}
