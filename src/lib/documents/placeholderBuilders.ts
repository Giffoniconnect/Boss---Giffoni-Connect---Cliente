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

function cleanHtmlToPlainText(html: string): string {
  if (!html) return "";
  let text = html;
  
  // Replace custom styling tags
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<p[^>]*>/gi, "");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<div[^>]*>/gi, "");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  
  // Strip any remaining html tags
  text = text.replace(/<[^>]*>/g, "");
  
  // HTML entity decode basics
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
    
  return text.trim();
}

export function buildPrimeiroAtendimentoPlaceholders(clientData: any, caseData: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  const solved = resolvePfClientData(clientData);
  
  const rawEntrevista = caseData?.entrevistaPadrao || caseData?.entrevista_padrao || "";
  const cleanEntrevista = cleanHtmlToPlainText(rawEntrevista);

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
    "{{OUTORGANTE_ENDERECO}}": solved.endereco || client["{{ENTERECO_COMPLETO}}"] || "",
    "{{OUTORGANTE_NUMERO}}": solved.numero || "",
    "{{OUTORGANTE_COMPLEMENTO}}": solved.complemento || "",
    "{{OUTORGANTE_BAIRRO}}": solved.bairro || "",
    "{{OUTORGANTE_CIDADE}}": solved.cidade || "",
    "{{OUTORGANTE_ESTADO}}": solved.estado || "",
    "{{OUTORGANTE_CEP}}": solved.cep || "",
    "{{OUTORGANTE_TELEFONE}}": solved.telefone || client["{{TELEFONE}}"] || "",
    "{{OUTORGANTE_WHATSAPP}}": solved.whatsapp || client["{{WHATSAPP}}"] || "",
    "{{OUTORGANTE_EMAIL}}": solved.email || client["{{EMAIL}}"] || "",

    // Interview placeholders
    "<< Registro_da_Entrevista_Padrão>>": cleanEntrevista,
    "<<Registro_da_Entrevista_Padrão>>": cleanEntrevista,
    "<< Registro_da_Entrevista_Padrao>>": cleanEntrevista,
    "<<Registro_da_Entrevista_Padrao>>": cleanEntrevista,
    "{{REGISTRO_DA_ENTREVISTA_PADRAO}}": cleanEntrevista,
    "{{Registro_da_Entrevista_Padrão}}": cleanEntrevista
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
    "{{DATA_ASSINATURA}}": `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
    "<<data da assinatura>>": `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
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
  const solved = resolvePfClientData(clientData);
  
  return {
    ...global,
    ...client,
    ...casePls,
    "{{DECLARACAO_HIPOSSUFICIENCIA}}": "declaro, sob as penas da lei, que não possuo condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo do próprio sustento e de minha família.",

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
    "{{OUTORGANTE_EMAIL}}": solved.email || client["{{EMAIL}}"] || "",
    "{{LOCAL_ASSINATURA}}": global["{{CIDADE_ASSINATURA}}"] || "Viçosa, MG",
    "{{DATA_ASSINATURA}}": `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
    "<<data da assinatura>>": `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
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

export function buildClausulaSegunda(fin: any, caseData: any): string {
  const modeloHonorarios = fin?.modeloHonorarios || caseData?.modeloHonorarios || '';
  const tipoHonorario = fin?.tipoHonorario || caseData?.tipoHonorario || 'Honorários Fixos';
  const honorarioExitoPercentual = fin?.honorarioExitoPercentual || caseData?.honorarioExitoPercentual || '30%';
  const honorarioFixoValor = fin?.honorarioFixoValor || caseData?.honorarioFixoValor || '0,00';
  const formaPagamento = fin?.formaPagamento || caseData?.formaPagamento || 'À vista';
  const tipoRecebimento = fin?.tipoRecebimento || caseData?.tipoRecebimento || 'PIX';
  const pixBanco = fin?.pixBanco || caseData?.pixBanco || 'Nubank';
  const pixChave = fin?.pixChave || caseData?.pixChave || '';
  const quantidadeParcelas = fin?.quantidadeParcelas || caseData?.quantidadeParcelas || '1';
  const valorParcela = fin?.valorParcela || caseData?.valorParcela || '0,00';
  const diaVencimento = fin?.diaVencimento || caseData?.diaVencimento || '10';
  const valorEntrada = fin?.valorEntrada || caseData?.valorEntrada || '0,00';
  const dataPrimeiroVencimento = fin?.dataPrimeiroVencimento || caseData?.dataPrimeiroVencimento || 'A combinar';

  // New specific properties from fields list
  const percentualExito = fin?.percentualExito || caseData?.percentualExito || honorarioExitoPercentual;
  const percentualExitoRetroativo = fin?.percentualExitoSobreRetroativo || caseData?.percentualExitoSobreRetroativo || percentualExito;
  const qtdParcelasFuturas = Number(fin?.quantidadeParcelasExitoPrevidenciario || caseData?.quantidadeParcelasExitoPrevidenciario) || 0;

  let descricaoFormaPagamento = '';
  switch (tipoRecebimento) {
    case 'Dinheiro':
      descricaoFormaPagamento = 'pago em dinheiro, mediante recibo.';
      break;
    case 'PIX':
      descricaoFormaPagamento = `pago mediante PIX para a conta de titularidade da PARTE CONTRATADA junto ao ${pixBanco}, chave PIX ${pixChave}.`;
      break;
    case 'Transferência Bancária':
      descricaoFormaPagamento = 'pago mediante transferência bancária para conta indicada pela PARTE CONTRATADA.';
      break;
    case 'PagSeguro':
      descricaoFormaPagamento = 'pago mediante link de pagamento emitido pela plataforma PagSeguro.';
      break;
    case 'InfinitePay':
      descricaoFormaPagamento = 'pago mediante link de pagamento emitido pela plataforma InfinitePay.';
      break;
    case 'ASAAS':
      descricaoFormaPagamento = 'pago mediante boleto, PIX ou link de pagamento emitido pela plataforma ASAAS.';
      break;
    case 'Stripe':
      descricaoFormaPagamento = 'pago mediante link de pagamento emitido pela plataforma Stripe.';
      break;
    case 'Cartão de Crédito - Maquininha PagSeguro':
      descricaoFormaPagamento = 'pago mediante cartão de crédito na maquininha da PagSeguro.';
      break;
    default:
      descricaoFormaPagamento = 'pago conforme condições acordadas.';
  }

  // Construct fixed portion summary
  let fixedDetailStr = '';
  if (formaPagamento === 'À vista') {
    fixedDetailStr = `mencionado valor de R$ ${honorarioFixoValor} pago à vista, mediante ${descricaoFormaPagamento}`;
  } else if (formaPagamento === 'Parcelado') {
    fixedDetailStr = `mencionado valor de R$ ${honorarioFixoValor} parcelado em ${quantidadeParcelas} vezes mensais e sucessivas de R$ ${valorParcela}, vencendo-se a primeira em ${dataPrimeiroVencimento} e as demais todo dia ${diaVencimento} dos meses subsequentes, mediante ${descricaoFormaPagamento}`;
  } else if (formaPagamento === 'Entrada + Parcelado') {
    fixedDetailStr = `mencionado valor de R$ ${honorarioFixoValor}, com sinal de R$ ${valorEntrada} a título de entrada e saldo em ${quantidadeParcelas} parcelas mensais e sucessivas de R$ ${valorParcela}, vencendo-se a primeira em ${dataPrimeiroVencimento} e as demais todo dia ${diaVencimento} dos meses subsequentes, mediante ${descricaoFormaPagamento}`;
  } else {
    fixedDetailStr = `mencionado valor de R$ ${honorarioFixoValor} pago conforme condições da forma ${formaPagamento}`;
  }

  // Check normalized model first
  if (modeloHonorarios === 'fixo') {
    return `Cláusula Segunda: A título de honorários advocatícios contratuais, fica estabelecido o valor fixo de R$ ${honorarioFixoValor}, que será ${fixedDetailStr}.`;
  } else if (modeloHonorarios === 'exito_simples') {
    return `Cláusula Segunda: A título de honorários advocatícios em caso de êxito na demanda, fica estabelecido o percentual de ${percentualExito} sobre o proveito econômico efetivo obtido pela PARTE CONTRATANTE, devido apenas em caso de desfecho favorável.`;
  } else if (modeloHonorarios === 'exito_completo_trabalhista') {
    return `Cláusula Segunda: A título de honorários advocatícios em caso de êxito na demanda, fica estabelecido o percentual de ${percentualExito} incidentes sobre todos os valores efetivamente recebidos pela PARTE CONTRATANTE ou apurados em liquidação, acordo, alvará ou depósitos judiciais, apurados minuciosamente conforme tabela analítica de rateio.`;
  } else if (modeloHonorarios === 'exito_completo_previdenciario') {
    const parcelasStr = qtdParcelasFuturas > 0 ? `, bem como o valor equivalente a ${qtdParcelasFuturas} parcelas mensais do benefício previdenciário concedido após sua implantação` : '';
    return `Cláusula Segunda: A título de honorários advocatícios em caso de êxito na correspondente demanda previdenciária, fica estabelecido o percentual de ${percentualExitoRetroativo} incidentes sobre o montante total de valores atrasados (retroativos) recebidos pela PARTE CONTRATANTE${parcelasStr}, em conformidade com as regras de proveito previdenciário.`;
  } else if (modeloHonorarios === 'fixo_mais_exito_simples') {
    return `Cláusula Segunda: A título de honorários advocatícios, pactua-se de forma cumulada: (a) o valor fixo de R$ ${honorarioFixoValor}, sendo ${fixedDetailStr}; e (b) o percentual de ${percentualExito} sobre o proveito econômico final obtido pela PARTE CONTRATANTE como honorários de êxito.`;
  } else if (modeloHonorarios === 'fixo_mais_exito_completo_trabalhista') {
    return `Cláusula Segunda: A título de honorários advocatícios, pactua-se de forma cumulada: (a) o valor fixo de R$ ${honorarioFixoValor}, sendo ${fixedDetailStr}; e (b) o percentual de ${percentualExito} incidentes sobre todos os valores recebidos ou apurados em liquidação, acordo, alvará ou depósitos judiciais vinculados ao processo trabalhista, apurados em tabela analítica.`;
  } else if (modeloHonorarios === 'fixo_mais_exito_completo_previdenciario') {
    const parcelasStr = qtdParcelasFuturas > 0 ? `, cumulado ainda com o valor de ${qtdParcelasFuturas} parcelas do benefício previdenciário implantado` : '';
    return `Cláusula Segunda: A título de honorários advocatícios, pactua-se de forma cumulada: (a) o valor fixo de R$ ${honorarioFixoValor}, sendo ${fixedDetailStr}; e (b) o percentual de ${percentualExitoRetroativo} incidentes sobre os montante de parcelas atrasadas (retroativos)${parcelasStr}.`;
  }

  // Legacy fallback behaviors
  if (tipoHonorario === 'Êxito') {
    return `Cláusula Segunda: A título de honorários advocatícios, fica estabelecido o percentual de ${honorarioExitoPercentual} sobre o proveito econômico obtido pela PARTE CONTRATANTE, percentual este devido apenas em caso de êxito na demanda.`;
  } else if (tipoHonorario === 'Honorários Fixos' && formaPagamento === 'À vista') {
    return `Cláusula Segunda: A título de honorários advocatícios, fica estabelecido o valor total de R$ ${honorarioFixoValor}, a ser pago à vista, mediante ${descricaoFormaPagamento}`;
  } else if (tipoHonorario === 'Honorários Fixos' && formaPagamento === 'Parcelado') {
    return `Cláusula Segunda: A título de honorários advocatícios, fica estabelecido o valor total de R$ ${honorarioFixoValor}, que será pago em ${quantidadeParcelas} parcelas mensais e sucessivas de R$ ${valorParcela}, vencendo-se a primeira em ${dataPrimeiroVencimento} e as demais todo dia ${diaVencimento} dos meses subsequentes, mediante ${descricaoFormaPagamento}`;
  } else if (tipoHonorario === 'Honorários Fixos' && formaPagamento === 'Entrada + Parcelado') {
    return `Cláusula Segunda: A título de honorários advocatícios, fica estabelecido o valor total de R$ ${honorarioFixoValor}, sendo R$ ${valorEntrada} pagos a título de entrada e o saldo remanescente dividido em ${quantidadeParcelas} parcelas mensais e sucessivas de R$ ${valorParcela}, vencendo-se a primeira em ${dataPrimeiroVencimento} e as demais todo dia ${diaVencimento} dos meses subsequentes, mediante ${descricaoFormaPagamento}`;
  } else if (tipoHonorario === 'Misto (Fixo + Êxito)') {
    return `Cláusula Segunda: A título de honorários advocatícios, fica estabelecido o valor fixo de R$ ${honorarioFixoValor}, pago mediante ${descricaoFormaPagamento}, bem como o percentual de ${honorarioExitoPercentual} sobre o proveito econômico obtido pela PARTE CONTRATANTE em caso de êxito na demanda.`;
  }
  return '';
}

function buildDatosBancariosClienteStr(clientData: any): string {
  if (!clientData) return "Não informado";
  const b = clientData.bancario_bancoPix || clientData.banco || "";
  const key = clientData.bancario_chavePix || clientData.chavePix || clientData.pix || "";
  if (b || key) {
    const ag = clientData.bancario_agencia || clientData.agencia || "N/A";
    const cc = clientData.bancario_conta || clientData.conta || "N/A";
    const tipo = clientData.bancario_tipoConta || clientData.tipoConta || "N/A";
    const tit = clientData.bancario_titular || clientData.titular || clientData.nomeCompleto || clientData.nome || "";
    return `Banco: ${b} — Chave PIX: ${key} — Agência: ${ag} — Conta: ${cc} — Tipo: ${tipo} — Titular: ${tit}`;
  }
  return "Não informado";
}

function buildTabelaAnaliticaResumo(tabela?: any[]): string {
  if (!tabela || !Array.isArray(tabela) || tabela.length === 0) return "Nenhum lançamento cadastrado.";
  return tabela.map((row, idx) => {
    return `${idx + 1}. [${row.descricao || row.rowTipo || 'Parcela'}] Origem: ${row.origem || row.rowOrigem || 'N/A'}, Valor: R$ ${row.valor || row.valorLiquido || '0,00'}, Destino: ${row.destino || row.rowDadosBancariosDestino || 'N/A'}, Status: ${row.status || row.rowStatus || 'Pendente'}, Data: ${row.data || row.dataVencimento || row.dataPrevista || 'N/A'}`;
  }).join('\n');
}

function buildRateioFinalResumo(fin: any): string {
  if (!fin) return "A apurar";
  const totAdv = fin.totalAdvogado || fin.financeiroRateio?.totalAdvogado || '0,00';
  const totCli = fin.totalCliente || fin.financeiroRateio?.totalCliente || '0,00';
  const contratual = fin.totalHonorariosContratuais || fin.financeiroRateio?.totalHonorariosContratuais || '0,00';
  const sucumbencial = fin.totalHonorariosSucumbenciais || fin.financeiroRateio?.totalHonorariosSucumbenciais || '0,00';
  return `Valor Total do Advogado: R$ ${totAdv} (Contratuais: R$ ${contratual}, Sucumbenciais: R$ ${sucumbencial}) — Valor Líquido do Cliente: R$ ${totCli}`;
}

export function buildContratoHonorariosPfPlaceholders(clientData: any, caseData: any, financialData?: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  const solved = resolvePfClientData(clientData);
  
  const fin = financialData || caseData?.financeiro || {};
  
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dataAssinaturaFormated = `${day}/${month}/${year}`;

  const cl2 = buildClausulaSegunda(fin, caseData);

  const modeloLabels: Record<string, string> = {
    fixo: "Honorários Fixos",
    exito_simples: "Êxito Simples",
    exito_completo_trabalhista: "Êxito Completo — Trabalhista",
    exito_completo_previdenciario: "Êxito Completo — Previdenciário",
    fixo_mais_exito_simples: "Fixo + Êxito Simples",
    fixo_mais_exito_completo_trabalhista: "Fixo + Êxito Completo — Trabalhista",
    fixo_mais_exito_completo_previdenciario: "Fixo + Êxito Completo — Previdenciário"
  };
  const mHon = fin?.modeloHonorarios || caseData?.modeloHonorarios || "";
  const modelLabel = mHon ? (modeloLabels[mHon] || mHon) : (fin?.tipoHonorario || caseData?.tipoHonorario || "Honorários Fixos");

  return {
    ...global,
    ...client,
    ...casePls,
    "{{TIPO_SERVICO}}": fin?.tipoServicoContratado || fin?.tipoServico || caseData?.tipoServicoContratado || caseData?.tipoServico || "Serviço de Assessoria Jurídica",
    "{{FORMA_COBRANCA}}": fin?.formaPagamento || fin?.formaCobranca || "Parcelado",
    "{{VALOR_HONORARIOS}}": fin?.honorarioFixoValor || fin?.valorTotal || fin?.valorHonorarios || "A combinar",
    "{{ENTRADA}}": fin?.valorEntrada || fin?.entrada || "Não aplicável",
    "{{PARCELAS}}": String(fin?.quantidadeParcelas || fin?.parcelas || "1"),
    "{{VENCIMENTO}}": fin?.dataPrimeiroVencimento || fin?.vencimento || fin?.vencimentoPrimeiraParcela || "A vencer",
    "{{CLAUSULAS_ESPECIFICAS}}": fin?.clausulas || "Nenhuma cláusula especial cadastrada.",

    // OUTORGANTE MAPPINGS
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
    "{{OUTORGANTE_EMAIL}}": solved.email || client["{{EMAIL}}"] || "",

    // NEW FINANCIAL PLACEHOLDERS
    "{{TIPO_SERVICO_CONTRATADO}}": fin?.tipoServicoContratado || caseData?.tipoServicoContratado || fin?.tipoServico || caseData?.tipoServico || "Serviços Advocatícios",
    "{{TIPO_HONORARIO}}": fin?.tipoHonorario || caseData?.tipoHonorario || "Honorários Fixos",
    "{{HONORARIOS_PERCENTUAL}}": fin?.honorarioExitoPercentual || caseData?.honorarioExitoPercentual || "0%",
    "{{HONORARIO_EXITO_PERCENTUAL}}": fin?.honorarioExitoPercentual || caseData?.honorarioExitoPercentual || "0%",
    "{{HONORARIOS_VALOR_FIXO}}": fin?.honorarioFixoValor || caseData?.honorarioFixoValor || "0,00",
    "{{HONORARIO_FIXO_VALOR}}": fin?.honorarioFixoValor || caseData?.honorarioFixoValor || "0,00",
    "{{FORMA_PAGAMENTO}}": fin?.formaPagamento || caseData?.formaPagamento || "À vista",
    "{{TIPO_RECEBIMENTO}}": fin?.tipoRecebimento || caseData?.tipoRecebimento || "PIX",
    "{{PIX_BANCO}}": fin?.pixBanco || caseData?.pixBanco || "Nubank",
    "{{PIX_CHAVE}}": fin?.pixChave || caseData?.pixChave || "",
    "{{QUANTIDADE_PARCELAS}}": String(fin?.quantidadeParcelas || caseData?.quantidadeParcelas || "1"),
    "{{VALOR_PARCELA}}": fin?.valorParcela || caseData?.valorParcela || "0,00",
    "{{DIA_VENCIMENTO}}": fin?.diaVencimento || caseData?.diaVencimento || "10",
    "{{VALOR_ENTRADA}}": fin?.valorEntrada || caseData?.valorEntrada || "0,00",
    "{{DATA_PRIMEIRO_VENCIMENTO}}": fin?.dataPrimeiroVencimento || caseData?.dataPrimeiroVencimento || "A combinar",
    "{{CLAUSULA_SEGUNDA}}": cl2,

    // BRAND NEW PLACEHOLDERS
    "{{MODELO_HONORARIOS}}": modelLabel,
    "{{CATEGORIA_EXITO}}": fin?.categoriaExito || caseData?.categoriaExito || "N/A",
    "{{CLASSE_EXITO}}": fin?.classeExito || caseData?.classeExito || "N/A",
    "{{PERCENTUAL_EXITO}}": fin?.percentualExito || caseData?.percentualExito || fin?.honorarioExitoPercentual || "0%",
    "{{BASE_CALCULO_EXITO}}": fin?.baseCalculoExito || caseData?.baseCalculoExito || "N/A",
    "{{VALOR_CREDITO_LIQUIDO_EXEQUENTE}}": fin?.financeiroApuracaoTrabalhista?.creditoLiquido || fin?.creditoLiquido || "0,00",
    "{{VALOR_FGTS_CONTA_VINCULADA}}": fin?.financeiroApuracaoTrabalhista?.fgtsContaVinculada || fin?.fgtsContaVinculada || "0,00",
    "{{VALOR_INSS}}": fin?.financeiroApuracaoTrabalhista?.inssRecolhimento || fin?.inssRecolhimento || "0,00",
    "{{HOUVE_SUCUMBENCIA}}": fin?.financeiroApuracaoTrabalhista?.houveSucumbencia || fin?.houveSucumbencia || "não",
    "{{VALOR_SUCUMBENCIA}}": fin?.financeiroApuracaoTrabalhista?.valorSucumbencia || fin?.valorSucumbencia || "0,00",
    "{{HOUVE_ACORDO}}": fin?.financeiroApuracaoTrabalhista?.houveAcordo || fin?.houveAcordo || "não",
    "{{LOCAL_ACORDO_PROCESSO}}": fin?.financeiroApuracaoTrabalhista?.localAcordoProcesso || fin?.localAcordoProcesso || "N/A",
    "{{LOCAL_DECISAO_HOMOLOGATORIA_ACORDO}}": fin?.financeiroApuracaoTrabalhista?.localDecisaoHomologatoriaAcordo || fin?.localDecisaoHomologatoriaAcordo || "N/A",
    "{{FORMA_PAGAMENTO_ACORDO}}": fin?.financeiroApuracaoTrabalhista?.formaPagamentoAcordo || fin?.formaPagamentoAcordo || "N/A",
    "{{VALOR_TOTAL_DEPOSITO_CONTA}}": fin?.financeiroApuracaoTrabalhista?.valorTotalDepositoConta || fin?.valorTotalDepositoConta || "0,00",
    "{{HAVERA_ALVARA}}": fin?.financeiroApuracaoTrabalhista?.haveraAlvara || fin?.haveraAlvara || "não",
    "{{VALOR_ALVARA}}": fin?.financeiroApuracaoTrabalhista?.valorAlvara || fin?.valorAlvara || "0,00",
    "{{QUANTIDADE_PARCELAS_ACORDO}}": String(fin?.financeiroApuracaoTrabalhista?.quantidadeParcelasAcordo || fin?.quantidadeParcelasAcordo || "1"),
    "{{VALOR_CADA_PARCELA}}": fin?.financeiroApuracaoTrabalhista?.valorCadaParcela || fin?.valorCadaParcela || "0,00",
    "{{DATAS_PAGAMENTO_PARCELAS}}": fin?.financeiroApuracaoTrabalhista?.datasPagamentoParcelas || fin?.datasPagamentoParcelas || "N/A",
    "{{DADOS_BANCARIOS_ADVOGADO}}": "PIX Nubank CPF: 099.356.706-19 ou BB direito.rgr@gmail.com | Banco do Brasil, Agência: 0428-6, C/C: 61.954-x, Titular: Rodrigo Giffoni Rodrigues",
    "{{DADOS_BANCARIOS_CLIENTE}}": buildDatosBancariosClienteStr(clientData),
    "{{VALOR_RETROATIVO_PREVIDENCIARIO}}": fin?.financeiroApuracaoPrevidenciaria?.valorRetroativo || fin?.valorRetroativoPrevidenciaria || "0,00",
    "{{PERCENTUAL_EXITO_RETROATIVO}}": fin?.percentualExitoSobreRetroativo || caseData?.percentualExitoSobreRetroativo || "0%",
    "{{QUANTIDADE_PARCELAS_EXITO_PREVIDENCIARIO}}": String(fin?.quantidadeParcelasExitoPrevidenciario || caseData?.quantidadeParcelasExitoPrevidenciario || "0"),
    "{{VALOR_HONORARIOS_RETROATIVO}}": fin?.financeiroApuracaoPrevidenciaria?.valorHonorariosRetroativo || fin?.valorHonorariosRetroativo || "0,00",
    "{{VALOR_HONORARIOS_PARCELAS_FUTURAS}}": fin?.financeiroApuracaoPrevidenciaria?.valorHonorariosParcelasFuturas || fin?.valorHonorariosParcelasFuturas || "0,00",
    "{{TABELA_ANALITICA_RESUMO}}": buildTabelaAnaliticaResumo(fin?.tabelaAnalitica || caseData?.tabelaAnalitica),
    "{{RATEIO_FINAL_ADVOGADO_CLIENTE}}": buildRateioFinalResumo(fin || caseData),

    "{{DATA_ASSINATURA}}": dataAssinaturaFormated,
    "<<data da assinatura>>": dataAssinaturaFormated,
  };
}

export function buildContratoHonorariosPjPlaceholders(clientData: any, caseData: any, financialData?: any): Record<string, string> {
  const global = buildGlobalPlaceholders();
  const client = buildClientCommonPlaceholders(clientData);
  const casePls = buildCaseCommonPlaceholders(caseData);
  
  const fin = financialData || caseData?.financeiro || {};
  const cl2 = buildClausulaSegunda(fin, caseData);

  const modeloLabels: Record<string, string> = {
    fixo: "Honorários Fixos",
    exito_simples: "Êxito Simples",
    exito_completo_trabalhista: "Êxito Completo — Trabalhista",
    exito_completo_previdenciario: "Êxito Completo — Previdenciário",
    fixo_mais_exito_simples: "Fixo + Êxito Simples",
    fixo_mais_exito_completo_trabalhista: "Fixo + Êxito Completo — Trabalhista",
    fixo_mais_exito_completo_previdenciario: "Fixo + Êxito Completo — Previdenciário"
  };
  const mHon = fin?.modeloHonorarios || caseData?.modeloHonorarios || "";
  const modelLabel = mHon ? (modeloLabels[mHon] || mHon) : (fin?.tipoHonorario || caseData?.tipoHonorario || "Honorários Fixos");

  return {
    ...global,
    ...client,
    ...casePls,
    "{{TIPO_SERVICO}}": fin?.tipoServicoContratado || fin?.tipoServico || caseData?.tipoServicoContratado || caseData?.tipoServico || "Serviço de Assessoria Jurídica Empresarial",
    "{{FORMA_COBRANCA}}": fin?.formaPagamento || fin?.formaCobranca || "Parcelado",
    "{{VALOR_HONORARIOS}}": fin?.honorarioFixoValor || fin?.valorTotal || fin?.valorHonorarios || "A combinar",
    "{{ENTRADA}}": fin?.valorEntrada || fin?.entrada || "Não aplicável",
    "{{PARCELAS}}": String(fin?.quantidadeParcelas || fin?.parcelas || "1"),
    "{{VENCIMENTO}}": fin?.dataPrimeiroVencimento || fin?.vencimento || fin?.vencimentoPrimeiraParcela || "A vencer",
    "{{CLAUSULAS_ESPECIFICAS}}": fin?.clausulas || "Nenhuma cláusula especial cadastrada.",

    // NEW FINANCIAL PLACEHOLDERS
    "{{TIPO_SERVICO_CONTRATADO}}": fin?.tipoServicoContratado || caseData?.tipoServicoContratado || "Serviços Advocatícios",
    "{{TIPO_HONORARIO}}": fin?.tipoHonorario || caseData?.tipoHonorario || "Honorários Fixos",
    "{{HONORARIOS_PERCENTUAL}}": fin?.honorarioExitoPercentual || caseData?.honorarioExitoPercentual || "0%",
    "{{HONORARIO_EXITO_PERCENTUAL}}": fin?.honorarioExitoPercentual || caseData?.honorarioExitoPercentual || "0%",
    "{{HONORARIOS_VALOR_FIXO}}": fin?.honorarioFixoValor || caseData?.honorarioFixoValor || "0,00",
    "{{HONORARIO_FIXO_VALOR}}": fin?.honorarioFixoValor || caseData?.honorarioFixoValor || "0,00",
    "{{FORMA_PAGAMENTO}}": fin?.formaPagamento || caseData?.formaPagamento || "À vista",
    "{{TIPO_RECEBIMENTO}}": fin?.tipoRecebimento || caseData?.tipoRecebimento || "PIX",
    "{{PIX_BANCO}}": fin?.pixBanco || caseData?.pixBanco || "Nubank",
    "{{PIX_CHAVE}}": fin?.pixChave || caseData?.pixChave || "",
    "{{QUANTIDADE_PARCELAS}}": String(fin?.quantidadeParcelas || caseData?.quantidadeParcelas || "1"),
    "{{VALOR_PARCELA}}": fin?.valorParcela || caseData?.valorParcela || "0,00",
    "{{DIA_VENCIMENTO}}": fin?.diaVencimento || caseData?.diaVencimento || "10",
    "{{VALOR_ENTRADA}}": fin?.valorEntrada || caseData?.valorEntrada || "0,00",
    "{{DATA_PRIMEIRO_VENCIMENTO}}": fin?.dataPrimeiroVencimento || caseData?.dataPrimeiroVencimento || "A combinar",
    "{{CLAUSULA_SEGUNDA}}": cl2,

    // BRAND NEW PLACEHOLDERS
    "{{MODELO_HONORARIOS}}": modelLabel,
    "{{CATEGORIA_EXITO}}": fin?.categoriaExito || caseData?.categoriaExito || "N/A",
    "{{CLASSE_EXITO}}": fin?.classeExito || caseData?.classeExito || "N/A",
    "{{PERCENTUAL_EXITO}}": fin?.percentualExito || caseData?.percentualExito || fin?.honorarioExitoPercentual || "0%",
    "{{BASE_CALCULO_EXITO}}": fin?.baseCalculoExito || caseData?.baseCalculoExito || "N/A",
    "{{VALOR_CREDITO_LIQUIDO_EXEQUENTE}}": fin?.financeiroApuracaoTrabalhista?.creditoLiquido || fin?.creditoLiquido || "0,00",
    "{{VALOR_FGTS_CONTA_VINCULADA}}": fin?.financeiroApuracaoTrabalhista?.fgtsContaVinculada || fin?.fgtsContaVinculada || "0,00",
    "{{VALOR_INSS}}": fin?.financeiroApuracaoTrabalhista?.inssRecolhimento || fin?.inssRecolhimento || "0,00",
    "{{HOUVE_SUCUMBENCIA}}": fin?.financeiroApuracaoTrabalhista?.houveSucumbencia || fin?.houveSucumbencia || "não",
    "{{VALOR_SUCUMBENCIA}}": fin?.financeiroApuracaoTrabalhista?.valorSucumbencia || fin?.valorSucumbencia || "0,00",
    "{{HOUVE_ACORDO}}": fin?.financeiroApuracaoTrabalhista?.houveAcordo || fin?.houveAcordo || "não",
    "{{LOCAL_ACORDO_PROCESSO}}": fin?.financeiroApuracaoTrabalhista?.localAcordoProcesso || fin?.localAcordoProcesso || "N/A",
    "{{LOCAL_DECISAO_HOMOLOGATORIA_ACORDO}}": fin?.financeiroApuracaoTrabalhista?.localDecisaoHomologatoriaAcordo || fin?.localDecisaoHomologatoriaAcordo || "N/A",
    "{{FORMA_PAGAMENTO_ACORDO}}": fin?.financeiroApuracaoTrabalhista?.formaPagamentoAcordo || fin?.formaPagamentoAcordo || "N/A",
    "{{VALOR_TOTAL_DEPOSITO_CONTA}}": fin?.financeiroApuracaoTrabalhista?.valorTotalDepositoConta || fin?.valorTotalDepositoConta || "0,00",
    "{{HAVERA_ALVARA}}": fin?.financeiroApuracaoTrabalhista?.haveraAlvara || fin?.haveraAlvara || "não",
    "{{VALOR_ALVARA}}": fin?.financeiroApuracaoTrabalhista?.valorAlvara || fin?.valorAlvara || "0,00",
    "{{QUANTIDADE_PARCELAS_ACORDO}}": String(fin?.financeiroApuracaoTrabalhista?.quantidadeParcelasAcordo || fin?.quantidadeParcelasAcordo || "1"),
    "{{VALOR_CADA_PARCELA}}": fin?.financeiroApuracaoTrabalhista?.valorCadaParcela || fin?.valorCadaParcela || "0,00",
    "{{DATAS_PAGAMENTO_PARCELAS}}": fin?.financeiroApuracaoTrabalhista?.datasPagamentoParcelas || fin?.datasPagamentoParcelas || "N/A",
    "{{DADOS_BANCARIOS_ADVOGADO}}": "PIX Nubank CPF: 099.356.706-19 ou BB direito.rgr@gmail.com | Banco do Brasil, Agência: 0428-6, C/C: 61.954-x, Titular: Rodrigo Giffoni Rodrigues",
    "{{DADOS_BANCARIOS_CLIENTE}}": buildDatosBancariosClienteStr(clientData),
    "{{VALOR_RETROATIVO_PREVIDENCIARIO}}": fin?.financeiroApuracaoPrevidenciaria?.valorRetroativo || fin?.valorRetroativoPrevidenciaria || "0,00",
    "{{PERCENTUAL_EXITO_RETROATIVO}}": fin?.percentualExitoSobreRetroativo || caseData?.percentualExitoSobreRetroativo || "0%",
    "{{QUANTIDADE_PARCELAS_EXITO_PREVIDENCIARIO}}": String(fin?.quantidadeParcelasExitoPrevidenciario || caseData?.quantidadeParcelasExitoPrevidenciario || "0"),
    "{{VALOR_HONORARIOS_RETROATIVO}}": fin?.financeiroApuracaoPrevidenciaria?.valorHonorariosRetroativo || fin?.valorHonorariosRetroativo || "0,00",
    "{{VALOR_HONORARIOS_PARCELAS_FUTURAS}}": fin?.financeiroApuracaoPrevidenciaria?.valorHonorariosParcelasFuturas || fin?.valorHonorariosParcelasFuturas || "0,00",
    "{{TABELA_ANALITICA_RESUMO}}": buildTabelaAnaliticaResumo(fin?.tabelaAnalitica || caseData?.tabelaAnalitica),
    "{{RATEIO_FINAL_ADVOGADO_CLIENTE}}": buildRateioFinalResumo(fin || caseData),
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
