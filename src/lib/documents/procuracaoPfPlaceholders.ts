/**
 * Builds placeholders Map for the Procuracao PF document generation.
 * LOGS PREFIX CODE: PORTAL_PROC_PF_PLACEHOLDERS_BUILT
 */
export function buildProcuracaoPfPlaceholders(client: any): Record<string, string> {
  const getField = (fieldName: string): string => {
    const val = client?.pfDadosPessoais?.[fieldName] ?? client?.pfData?.[fieldName];
    if (val === undefined || val === null) {
      return "";
    }
    return String(val).trim();
  };

  const nomeCompleto = getField("pf_nomeCompleto") || client?.nomeCompleto || client?.pfDadosPessoais?.pf_nomeCompleto || client?.pfData?.pf_nomeCompleto || "";
  const cpf = getField("pf_cpf") || client?.cpf || client?.pfDadosPessoais?.pf_cpf || client?.pfData?.pf_cpf || "";

  if (!nomeCompleto) {
    throw new Error("Não é possível gerar a Procuração porque o Nome Completo do cliente está ausente no cadastro.");
  }
  if (!cpf) {
    throw new Error("Não é possível gerar a Procuração porque o CPF do cliente está ausente no cadastro.");
  }

  const placeholders: Record<string, string> = {
    "{{OUTORGANTE_NOME}}": nomeCompleto,
    "{{OUTORGANTE_NACIONALIDADE}}": getField("pf_nacionalidade"),
    "{{OUTORGANTE_ESTADO_CIVIL}}": getField("pf_estadoCivil"),
    "{{OUTORGANTE_PROFISSAO}}": getField("pf_profissao"),
    "{{OUTORGANTE_CPF}}": cpf,
    "{{OUTORGANTE_RG}}": getField("pf_rg"),
    "{{OUTORGANTE_ORGAO_EMISSOR}}": getField("pf_orgaoEmissor") || getField("pf_orgao") || "",
    "{{OUTORGANTE_ENDERECO}}": getField("pf_endereco"),
    "{{OUTORGANTE_NUMERO}}": getField("pf_numero"),
    "{{OUTORGANTE_COMPLEMENTO}}": getField("pf_complemento"),
    "{{OUTORGANTE_BAIRRO}}": getField("pf_bairro"),
    "{{OUTORGANTE_CIDADE}}": getField("pf_cidade"),
    "{{OUTORGANTE_ESTADO}}": getField("pf_estado"),
    "{{OUTORGANTE_CEP}}": getField("pf_cep"),
    "{{OUTORGANTE_EMAIL}}": getField("pf_email"),
    "{{OUTORGANTE_TELEFONE}}": getField("pf_telefone"),
    "{{OUTORGANTE_WHATSAPP}}": getField("pf_whatsapp"),
    "{{LOCAL_ASSINATURA}}": "Viçosa, MG",
    "{{ADVOGADO_NOME}}": "RODRIGO GIFFONI RODRIGUES",
    "{{ADVOGADO_OAB}}": "OAB/MG 157.320",
    "{{DATA_ASSINATURA}}": "data da assinatura eletrônica"
  };

  console.log(`[PORTAL_PROC_PF_PLACEHOLDERS_BUILT] Placeholders parsed with absolute success:`, placeholders);
  return placeholders;
}
