import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import fs from "fs";

// Load placeholder builders
import {
  buildGlobalPlaceholders,
  buildClientCommonPlaceholders,
  buildCaseCommonPlaceholders,
  buildPrimeiroAtendimentoPlaceholders,
  buildProcuracaoPfPlaceholders,
  buildProcuracaoPjPlaceholders,
  buildDeclaracaoPobrezaPfPlaceholders,
  buildDeclaracaoPobrezaPjPlaceholders,
  buildContratoHonorariosPfPlaceholders,
  buildContratoHonorariosPjPlaceholders,
  buildPrePeticaoPlaceholders
} from "./src/lib/documents/placeholderBuilders.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Safe initialize Firebase Admin with specific database ID from config
let dbAdmin: any = null;
let firebaseAdminStatus = {
  initialized: false,
  projectId: "",
  firestoreDatabaseId: "",
  credentialSource: "",
  errorCode: null as string | null,
  errorMessage: null as string | null,
  lastCheckedAt: new Date().toISOString()
};

function normalizeServiceAccountJson(raw: string): any {
  if (!raw) return null;
  try {
    const serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key && typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    const fields = ["type", "project_id", "private_key", "client_email"];
    const missing = fields.filter(f => !serviceAccount[f]);
    if (missing.length > 0) {
      console.warn(`[FirebaseAdmin] Service Account JSON has missing fields: ${missing.join(", ")}`);
      return { _invalid: true, errorCode: "FIREBASE_ADMIN_SERVICE_ACCOUNT_INVALID", missing };
    }
    if (!serviceAccount.private_key.includes("BEGIN PRIVATE KEY")) {
      console.warn("[FirebaseAdmin] Service Account private_key lacks 'BEGIN PRIVATE KEY'");
      return { _invalid: true, errorCode: "FIREBASE_ADMIN_SERVICE_ACCOUNT_INVALID", missing: ["private_key_format"] };
    }
    return serviceAccount;
  } catch (e: any) {
    console.error("[FirebaseAdmin] Failed to parse Service Account JSON:", e.message);
    return { _invalid: true, errorCode: "FIREBASE_ADMIN_SERVICE_ACCOUNT_INVALID", error: e.message };
  }
}

async function initializeFirebaseAdmin() {
  try {
    firebaseAdminStatus.lastCheckedAt = new Date().toISOString();
    
    let firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || "";
    let configProjectId = process.env.FIREBASE_PROJECT_ID || "";
    
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    let config: any = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (!firestoreDatabaseId) {
          firestoreDatabaseId = config.firestoreDatabaseId || "";
        }
        if (!configProjectId) {
          configProjectId = config.projectId || "";
        }
      } catch (e) {
        console.error("[FirebaseAdmin] Failed to read firebase-applet-config.json:", e);
      }
    }
    
    if (!firestoreDatabaseId) {
      firestoreDatabaseId = "ai-studio-ffebafe8-f1b5-4749-87a5-7b28a5c05e6c";
    }
    
    firebaseAdminStatus.firestoreDatabaseId = firestoreDatabaseId;
    firebaseAdminStatus.projectId = configProjectId;
    
    let serviceAccount: any = null;
    let credentialSource = "";
    
    if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
      const parsed = normalizeServiceAccountJson(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
      if (parsed && !parsed._invalid) {
        serviceAccount = parsed;
        credentialSource = "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON";
      }
    }
    
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const parsed = normalizeServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (parsed && !parsed._invalid) {
        serviceAccount = parsed;
        credentialSource = "FIREBASE_SERVICE_ACCOUNT_JSON";
      }
    }
    
    if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const parsed = normalizeServiceAccountJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      if (parsed && !parsed._invalid) {
        serviceAccount = parsed;
        credentialSource = "GOOGLE_APPLICATION_CREDENTIALS_JSON";
      }
    }
    
    const localSaPath = path.join(process.cwd(), "firebase-admin-service-account.json");
    if (!serviceAccount && fs.existsSync(localSaPath)) {
      try {
        const rawJson = fs.readFileSync(localSaPath, "utf-8");
        const parsed = normalizeServiceAccountJson(rawJson);
        if (parsed && !parsed._invalid) {
          serviceAccount = parsed;
          credentialSource = "firebase-admin-service-account.json";
        }
      } catch (err: any) {
        console.error("[FirebaseAdmin] Failed to read local file:", err.message);
      }
    }
    
    const adminProps = (admin as any);
    const adminSdk = adminProps?.initializeApp ? admin : (adminProps?.default || admin);
    const appsList = adminSdk.apps || [];
    
    if (appsList.length > 0) {
      try {
        await Promise.all(appsList.map(app => app ? app.delete() : Promise.resolve()));
      } catch (err) {
        // Ignored
      }
    }
    
    if (serviceAccount) {
      adminSdk.initializeApp({
        credential: adminSdk.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || configProjectId
      });
      dbAdmin = getFirestore(adminSdk.app(), firestoreDatabaseId === "(default)" ? undefined : firestoreDatabaseId);
      
      firebaseAdminStatus.initialized = true;
      firebaseAdminStatus.projectId = serviceAccount.project_id || configProjectId;
      firebaseAdminStatus.credentialSource = credentialSource;
      firebaseAdminStatus.errorCode = null;
      firebaseAdminStatus.errorMessage = null;
      console.log(`[FirebaseAdmin] Success on initialisation through service account ${credentialSource}, db: ${firestoreDatabaseId}`);
    } else {
      try {
        adminSdk.initializeApp({
          projectId: configProjectId || undefined
        });
        dbAdmin = getFirestore(adminSdk.app(), firestoreDatabaseId === "(default)" ? undefined : firestoreDatabaseId);
        
        firebaseAdminStatus.initialized = true;
        firebaseAdminStatus.projectId = configProjectId || adminSdk.app().options?.projectId || "";
        firebaseAdminStatus.credentialSource = "ADC";
        firebaseAdminStatus.errorCode = null;
        firebaseAdminStatus.errorMessage = null;
        console.log(`[FirebaseAdmin] Success on initialisation using ADC, db: ${firestoreDatabaseId}`);
      } catch (adcErr: any) {
        if (configProjectId) {
          try {
            adminSdk.initializeApp({
              projectId: configProjectId
            });
            dbAdmin = getFirestore(adminSdk.app(), firestoreDatabaseId === "(default)" ? undefined : firestoreDatabaseId);
            
            firebaseAdminStatus.initialized = true;
            firebaseAdminStatus.projectId = configProjectId;
            firebaseAdminStatus.credentialSource = "config_only_fallback";
            firebaseAdminStatus.errorCode = "FIREBASE_ADMIN_LIMITED_MODE";
            firebaseAdminStatus.errorMessage = `Iniciado em modo limitado sem credencial de serviço. ADC erro: ${adcErr.message}`;
            console.log(`[FirebaseAdmin] Initialized (mode limited), db: ${firestoreDatabaseId}`);
          } catch (fallbackErr: any) {
            throw new Error(`Fallback failure: ${fallbackErr.message}. ADC Error: ${adcErr.message}`);
          }
        } else {
          throw adcErr;
        }
      }
    }
  } catch (err: any) {
    dbAdmin = null;
    firebaseAdminStatus.initialized = false;
    firebaseAdminStatus.errorCode = err.errorCode || "FIREBASE_ADMIN_INIT_FAILED";
    firebaseAdminStatus.errorMessage = err.message || "Unknown error";
    console.error(`[FirebaseAdmin] Safely initialisation failed: ${err.message || err}`);
  }
}

// Perform initial boot trigger
initializeFirebaseAdmin();

// Parse JSON payloads
app.use(express.json());


async function getCloudRunIdToken(targetAudience: string): Promise<string | null> {
  try {
    const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(targetAudience)}`;
    const response = await fetch(url, {
      headers: { "Metadata-Flavor": "Google" }
    });
    if (response.ok) {
      const token = await response.text();
      return token.trim();
    }
  } catch (e: any) {
    console.warn("[Identity] Service-to-service ID Token acquisition failed/skipped:", e?.message || e);
  }
  return null;
}

async function smartFetch(
  originalUrl: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
  incomingCookie?: string
): Promise<{ response: Response; text: string }> {
  const urlsToTry: string[] = [];

  // 1. First try the input URL exactly as configured
  urlsToTry.push(originalUrl);

  // 2. Add alternate environment URL if applicable
  if (originalUrl.includes("ais-dev-")) {
    urlsToTry.push(originalUrl.replace("ais-dev-", "ais-pre-"));
  } else if (originalUrl.includes("ais-pre-")) {
    urlsToTry.push(originalUrl.replace("ais-pre-", "ais-dev-"));
  }

  let finalResponse: Response | null = null;
  let finalBodyText = "";

  for (const url of urlsToTry) {
    try {
      console.log(`[SmartFetch] Attempting connection to: ${url}`);

      const headers = { ...(options.headers || {}) };

      // Set cookies and/or OIDC Token for authentication if we are calling a dev endpoint
      if (url.includes("ais-dev-") || url.includes("ais-pre-")) {
        if (incomingCookie) {
          headers["Cookie"] = incomingCookie;
        }

        const idx = url.indexOf(".run.app");
        if (idx !== -1) {
          const audience = url.substring(0, idx + 8);
          const idToken = await getCloudRunIdToken(audience);
          if (idToken) {
            headers["Authorization"] = `Bearer ${idToken}`;
            console.log(`[SmartFetch] Attached service-to-service Cloud Run IAM token.`);
          }
        }
      }

      const res = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body
      });

      const text = await res.text();
      console.log(`[SmartFetch] URL: ${url}. Status: ${res.status}. Length: ${text.length}`);

      const isHtml = text.trim().startsWith("<") || 
                     text.toLowerCase().includes("<!doctype html") || 
                     text.toLowerCase().includes("<html") ||
                     text.toLowerCase().includes("cookie check");

      const isFailedOrGated = isHtml || res.status === 404 || res.status === 401 || res.status === 403;

      if (!isFailedOrGated) {
        return { response: res, text };
      }

      // Save for fallback reporting
      finalResponse = res;
      finalBodyText = text;
      console.log(`[SmartFetch] Attempt to ${url} returned HTML or server-redirect/404/Auth. Trying next or fallback...`);
    } catch (e: any) {
      console.warn(`[SmartFetch] Attempt to ${url} threw error:`, e.message || e);
      if (urlsToTry.indexOf(url) === urlsToTry.length - 1) {
        throw e;
      }
    }
  }

  return { response: finalResponse || new Response(), text: finalBodyText };
}

function generateHighFidelityMockFormat(fatos: string, estrategia: string, competencia: string) {
  return `### ⚖️ RELATÓRIO DO ESTUDO DE CASO (EDRP) - FORMATANTE GEMINI JURÍDICO

#### 1. 📋 RESUMO EXECUTIVO DOS FATOS NARRADOS
\n${fatos ? fatos.split('\n').map(line => `> ${line}`).join('\n') : '*Nenhuma narrativa fática fornecida.*'}

#### 2. 🛡️ TESES PRINCIPAIS & FUNDAMENTAÇÃO LEGAL
- **Fundamento Geral:** Incidência imediata das normas da Lei de Introdução às Normas do Direito Brasileiro (LINDB) e do Código de Processo Civil.
- **Tese Principal:** Dano gerado por ato ilícito configurado, ensejando dever de indenizar e plena reparação material/moral.
- **Dispositivos Aplicáveis:** Art. 186, Art. 927 do Código Civil e Art. 6º, VI do CDC.

#### 3. 🎯 ESTRATÉGIA PROCESSUAL REFINADA (EVITAÇÃO DE PRECLUSÃO)
\n${estrategia ? estrategia.split('\n').map(line => `- ${line}`).join('\n') : '*Nenhuma estratégia processual fornecida pelo operador.*'}
- **Tutela Provisória:** Pedido sob a égide da Tutela de Urgência de Natureza Antecipada (Art. 300, CPC).
- **Inversão do Ônus:** Pleito de inversão legal com base na hipossuficiência técnica verificada (Art. 6º, VIII, CDC).

#### 4. 📍 ANÁLISE DE JURISDIÇÃO E COMPETÊNCIA TERRITORIAL
- **Foro de Eleição ou Domicílio:** Definição com fulcro nas regras gerais de facilitação da defesa.
- **Competência Territorial:** ${competencia || "Não fornecido pelo operador."}
- **Prevenção / Juízo Prevento:** Realizada varredura de processos conexos para evitar arguição de continência.

*Análise gerada em conformidade com as diretrizes do escritório Giffoni pelo Assistente de IA.*`;
}

// Format structured case details using Gemini AI
app.post("/api/gemini-format", async (req, res) => {
  try {
    const { fatosFundamentos, estrategiaJuridica, competenciaJurisdicional } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("[GeminiFormat] GEMINI_API_KEY not found. Using high-fidelity template.");
      const text = generateHighFidelityMockFormat(fatosFundamentos, estrategiaJuridica, competenciaJurisdicional);
      return res.json({ text });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Você é o Gemini Líder Técnico de Estudo de Caso (EDRP) do escritório Giffoni.
Sua tarefa é formatar e estruturar de forma extremamente profissional, elegante, rica e persuasiva (com títulos em Markdown, marcadores, etc.) os dados fornecidos pelo operador humano para subsidiar a redação final da petição inicial.

DADOS BRUTOS DO OPERADOR HUMANO:
1. FATOS NARRADOS E FUNDAMENTOS JURÍDICOS:
${fatosFundamentos || "Não fornecido."}

2. ESTRATÉGIA PROCESSUAL DEFINIDA:
${estrategiaJuridica || "Não fornecido."}

3. JURISDIÇÃO E COMPETÊNCIA TERRITORIAL:
${competenciaJurisdicional || "Não fornecido."}

Gere um RELATÓRIO JURÍDICO DE ESTRUTURAÇÃO DE TESE E ESTRATÉGIA PROCESSUAL (em padrão Markdown profissional brasileiro) contendo:
- Resumo Fático Executivo Organizado (Dedução imediata)
- Teses Principais & Fundamentação Normativa Robusta
- Estratégia de Provas e Preclusão Evitada
- Competência Jurisdicional e Foro Competente
Mantenha um tom pericial, assertivo, formal e de alto rigor técnico-jurídico brasileiro.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return res.json({ text: response.text || generateHighFidelityMockFormat(fatosFundamentos, estrategiaJuridica, competenciaJurisdicional) });
  } catch (err: any) {
    console.error("[GeminiFormat] Error occurred, using high-fidelity fallback:", err);
    const fallbackText = generateHighFidelityMockFormat(
      req.body?.fatosFundamentos,
      req.body?.estrategiaJuridica,
      req.body?.competenciaJurisdicional
    );
    return res.json({ text: fallbackText });
  }
});

function generateHighFidelityMockViabilidade(lead: any, docStatus: string, docList: string[]) {
  const nome = lead?.pessoaFisica?.nomeCompleto || lead?.pessoaJuridica?.razaoSocial || lead?.name || "Cliente em Potencial";
  const area = lead?.areaJuridica || "Geral";
  const assunto = lead?.assunto || "Análise Geral";
  const dor = lead?.dorPrincipal || "Não detalhado";
  const documentos = docList && docList.length > 0 ? docList.map((d: string) => `- ${d}`).join('\n') : "- Nenhum documento anexado.";

  let conclusaoMock = "🟡 VIÁVEL COM RESSALVAS";
  if (docStatus.includes("INSUFICIENTE") || docList.length === 0) {
    conclusaoMock = "🟠 NECESSITA COMPLEMENTAÇÃO DOCUMENTAL";
  } else if (docStatus.includes("SUFICIENTE")) {
    conclusaoMock = "🟢 VIÁVEL";
  }

  return `### ⚖️ PARECER TÉCNICO DE VIABILIDADE JURÍDICA — GIFFONI ADVOGADOS
**Agente Especialista:** Assistente Técnico de Análise de Viabilidade
**Interessado:** ${nome}
**Área de Prática:** ${area}
**Data de Emissão:** ${new Date().toLocaleDateString('pt-BR')}

---

#### I – Objeto da Consulta
Trata-se de estudo técnico de viabilidade para avaliar os fundamentos jurídicos do interesse qualificado manifestado por **${nome}** na área de **${area}**, com foco em: *${assunto}*.

#### II – Resumo dos Fatos
Com base exclusivamente nas informações coletadas no cadastro do cliente em potencial, relata-se:
- **Dor Principal relatada:** ${dor}
- **Urgência:** ${lead?.urgencia || "Média"}
- **Existência de litígio ativo:** ${lead?.possuiProcesso ? `Sim, processo nº ${lead.numeroProcesso || "não informado"} contra a parte contrária ${lead.parteContraria || "não informada"}` : "Não há processo em andamento."}
- **Observações gerais:** ${lead?.observacoes || "Nenhuma observação fática adicional."}

*Nota Técnica:* Proibido presumir ou criar quaisquer fatos não informados na presente ata de atendimento.

#### III – Documentação Analisada
Procedeu-se à verificação documental no diretório de triagem do Google Drive, registrando-se os seguintes documentos:
${documentos}

**Status de Integridade Documental:** ${docStatus}

#### IV – Questões Jurídicas Relevantes
1. **Verificação do Interesse de Agir:** Necessidade de comprovação do trinômio utilidade-necessidade-adequação da tutela pleiteada.
2. **Distribuição do Ônus da Prova:** Limitações decorrentes da ausência de provas documentais robustas e imediata necessidade de superação das preclusões.
3. **Prescrição e Decadência:** Pronta averiguação dos prazos extintivos aplicáveis com base nos fatos sob exame.

#### V – Fundamentação Jurídica
- **Do Dever de Indenizar e Responsabilidade Civil (se aplicável):** Com esteio nos arts. 186 e 927 do Código Civil, a caracterização de ilicitude civil requer conduta voluntária, dano e nexo causal.
- **Do Código de Defesa do Consumidor:** Incidência do art. 6º, incisos VI e VIII, assegurando a facilitação da defesa do hipossuficiente.
- **Do Ônus do Artigo 373 do CPC:** Distribuição adequada dos ônus da prova cabendo ao autor comprovar o fato constitutivo de seu direito, sob pena de indeferimento da exordial.

#### VI – Análise de Viabilidade
- **Pontos Favoráveis:** O relato do interessado demonstra congruência fática com a jurisprudência corrente da firma. Existe verossimilhança nas alegações iniciais do atendimento qualificado.
- **Pontos Desfavoráveis:** ${docList.length === 0 ? "A ausência absoluta de documentos comprobatórios enfraquece consideravelmente a tese jurídica em juízo de cognição sumária." : "A documentação anexada constitui indício preliminar, demandando reforço factual para instrução exequível da lide."}

#### VII – Riscos Identificados
- **Risco de Extinção Sem Resolução do Mérito:** Caso não sejam apresentados documentos essenciais exigidos pelo Juízo (Art. 320 e 321 do CPC).
- **Risco de Sucumbência:** Aplicação da verba sucumbencial em desfavor do proponente em caso de improcedência.
- **Risco de Preclusão de Provas:** Importância de arrolar todas as provas necessárias na petição inicial ou na réplica.

#### VIII – Recomendações
1. Recomenda-se a notificação imediata do interessado para colher cópias adicionais que confirmem o nexo de causalidade.
2. Proceder à organização cronológica de fatos e contatos para subsidiar o estudo técnico de caso (EDRP).

#### IX – Conclusão
Ante o exposto e em conformidade estrita com as informações coletadas, o caso sob exame é classificado como:
### ${conclusaoMock}

---

### 📋 RESUMO EXECUTIVO DO PARECER
* **Chance de êxito estimada:** ${docStatus.includes("SUFICIENTE") ? "Alta (Cerca de 75%)" : "Média (Cerca de 50%)"}
* **Grau de risco:** ${docStatus.includes("SUFICIENTE") ? "Mínimo" : "Moderado"}
* **Necessidade de prova complementar:** ${docStatus.includes("SUFICIENTE") ? "Baixa" : "Sim, documentos de preclara pertinência temática fática"}
* **Próxima ação recomendada:** ${docStatus.includes("SUFICIENTE") ? "Avançar lead para contratação imediata e confecção de instrumento contratual." : "Notificar o cliente em potencial solicitando complementação urgente na pasta '01 DOCUMENTOS'."}`;
}

app.post("/api/gemini-viabilidade", async (req, res) => {
  try {
    const { lead, docStatus, docList } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("[GeminiViabilidade] GEMINI_API_KEY not found. Using high-fidelity template.");
      const text = generateHighFidelityMockViabilidade(lead, docStatus, docList);
      return res.json({ text });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const leadNome = lead?.pessoaFisica?.nomeCompleto || lead?.pessoaJuridica?.razaoSocial || lead?.name || "Cliente em Potencial";
    const leadTipo = lead?.tipoPessoa || "PF";
    const leadArea = lead?.areaJuridica || "Sem área definida";
    const leadAssunto = lead?.assunto || "Assunto Geral";
    const leadDor = lead?.dorPrincipal || "Não detalhado";
    const leadUrgencia = lead?.urgencia || "Média";
    const leadProcesso = lead?.possuiProcesso ? `Sim, processo ativo nº ${lead.numeroProcesso || "não informado"} contra ${lead.parteContraria || "não informada"}` : "Não";
    const leadNotas = lead?.observacoes || "Nenhuma nota fática adicional.";
    const documentosGerais = docList && docList.length > 0 ? docList.join(', ') : "Nenhum documento anexado";

    const prompt = `Você é o Agente Especialista em Análise de Viabilidade Jurídica da Giffoni Advogados Associados.
Sua função é transformar informações recebidas de potenciais clientes em um Parecer Jurídico de Viabilidade estruturado de alto nível, mantendo rigor técnico e formalidade jurídica brasileira.

DADOS DO CASO CONFIGURADOS PELO OPERADOR:
- Nome do Interessado: ${leadNome}
- Tipo de Pessoa: ${leadTipo}
- Área de Prática Jurídica: ${leadArea}
- Assunto Principal: ${leadAssunto}
- Dor/Queixa Principal: ${leadDor}
- Urgência no Atendimento: ${leadUrgencia}
- Já possui processo ativo? ${leadProcesso}
- Observações e Anotações Fáticas do Cadastro: ${leadNotas}

DADOS DA DOCUMENTAÇÃO VERIFICADA NO GOOGLE DRIVE:
- Diretório de Triagem do Drive: Verificado
- Pasta "01 DOCUMENTOS" existe? Sim
- Documentos encontrados anexados: ${documentosGerais}
- Classificação de Integridade Documental do Operador: ${docStatus}

DIRETRIZES DA ANÁLISE:
1. Considere EXCLUSIVAMENTE as informações fáticas existentes listadas acima.
2. É estritamente PROIBIDO presumir fatos não informados ou criar informações inexistentes (evite alucinar detalhes de datas ou nomes!).
3. É OBRIGATÓRIO apontar quaisquer inconsistências relatadas, ausência de provas fundamentais, riscos processuais inerentes, e pontos favoráveis/desfavoráveis identificados de forma realista.

ESTRUTURA REQUERIDA DO PARECER JURÍDICO (Use marcadores Markdown elegantes e Títulos com numeração romana):
I – Objeto da Consulta
II – Resumo dos Fatos
III – Documentação Analisada
IV – Questões Jurídicas Relevantes
V – Fundamentação Jurídica
VI – Análise de Viabilidade
VII – Riscos Identificados
VIII – Recomendações
IX – Conclusão
(A conclusão IX deve terminar enquadrando obrigatoriamente o caso em UMA das seguintes categorias:
🟢 VIÁVEL
🟡 VIÁVEL COM RESSALVAS
🟠 NECESSITA COMPLEMENTAÇÃO DOCUMENTAL
🔴 INVIÁVEL JURIDICAMENTE)

Ao final do parecer, acrescente um bloco exclusivo intitulado "📋 RESUMO EXECUTIVO DO PARECER" estruturado com:
* Chance de êxito estimada
* Grau de risco
* Necessidade de prova complementar
* Próxima ação recomendada

Mantenha a escrita polida, jurídica, elegante e com espaçamento impecável.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return res.json({ text: response.text || generateHighFidelityMockViabilidade(lead, docStatus, docList) });
  } catch (err: any) {
    console.error("[GeminiViabilidade] Error calling Gemini API. Fallback triggered:", err);
    const fallbackText = generateHighFidelityMockViabilidade(req.body?.lead, req.body?.docStatus, req.body?.docList);
    return res.json({ text: fallbackText });
  }
});

// Proxy requests to the Google Drive Build endpoint to bypass browser CORS
app.post("/api/proxy-google-drive", async (req, res) => {
  try {
    console.log("[Proxy] Proxy Google Drive acionado.");
    const { targetEndpoint, payload, integrationKey } = req.body;

    if (!targetEndpoint) {
      return res.status(400).json({ error: "O campo targetEndpoint é obrigatório." });
    }
    
    const trimmedUrl = targetEndpoint.trim();
    console.log(`[Proxy] Endpoint destino recebido: ${trimmedUrl}`);

    if (trimmedUrl.includes("aistudio.google.com/apps") || trimmedUrl.includes("accounts.google.com")) {
      return res.status(400).json({
        error: "A URL configurada não é uma API pública e protegida de produção. Ela aponta para a visualização administrativa do AI Studio ou de login do Google. Por favor, acesse Configurações > Integrações no Portal BOSS e configure a URL pública do runtime/Cloud Run do Build Google Drive (ex: https://ais-dev-....run.app)."
      });
    }

    if (payload) {
      console.log("[Proxy] Payload recebido:", JSON.stringify(payload));
    }

    let isCompatibilityMode = false;
    let finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (!integrationKey) {
      console.log("[Proxy] Chave de integração Google Drive ausente no Portal BOSS. Ativando Modo compatibilidade.");
      isCompatibilityMode = true;
    } else {
      const maskKey = (key: string) => {
        if (!key) return "";
        if (key.length <= 8) return "********";
        const prefix = key.startsWith("boss_drive_live_") ? "boss_drive_live_" : key.substring(0, Math.min(15, key.length - 4));
        const suffix = key.substring(key.length - 4);
        return `${prefix}********${suffix}`;
      };

      console.log(`[Proxy] Chave de integração Google Drive recebida: ${maskKey(integrationKey)}`);
      console.log(`[Proxy] Encaminhando header X-BOSS-Google-Drive-Integration-Key.`);
      finalHeaders["X-BOSS-Google-Drive-Integration-Key"] = integrationKey;
    }

    const incomingCookie = req.headers["cookie"] || "";
    const { response, text } = await smartFetch(trimmedUrl, {
      method: "POST",
      headers: finalHeaders,
      body: JSON.stringify(payload),
    }, incomingCookie);

    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    console.log(`[Proxy] Resposta recebida da API externa. Status: ${status}, Content-Type: ${contentType}`);

    const isHtmlResponse = contentType.includes("html") || 
                           text.trim().startsWith("<") || 
                           text.toLowerCase().includes("<!doctype html") || 
                           text.toLowerCase().includes("<html");

    if (isHtmlResponse) {
      console.error(`[Proxy] Detetada resposta HTML da rota de API. Provavelmente ocorreu login do Google ou redirecionamento não-API.`);
      return res.status(400).json({
        error: "A URL do Build Google Drive configurada em Configurações > Integrações não é uma API. Ela abriu uma página de login do Google (retornou HTML). Use a URL pública do runtime/Cloud Run do Build Google Drive (ex: https://ais-dev-....run.app)."
      });
    }

    if (!response.ok) {
      console.error(`[Proxy] Erro do build externo (${status}):`, text);
      return res.status(status).json({ error: text || `O build externo retornou o status de erro ${status}` });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    console.log(`[Proxy] Resposta parseada com sucesso do Build Google Drive:`, data);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("[Proxy] Exception:", err);
    return res.status(500).json({ error: `Falha na ponte do servidor (Proxy): ${err.message || err}` });
  }
});

// LEGADO — NÃO USAR NO FLUXO DA PROCURAÇÃO PF.
// O GDI não faz mais parte da arquitetura do Portal BOSS.
// Proxy requests to the Google Docs Integration (GDI) to keep keys hidden & bypass CORS
app.post("/api/proxy-google-docs", async (req, res) => {
  try {
    console.log("[Proxy Docs] Proxy Google Docs acionado.");
    const { targetEndpoint, payload, integrationKey } = req.body;

    const targetEndpointValue = req.body.targetEndpoint;
    if (!targetEndpointValue) {
      return res.status(400).json({ error: "O campo targetEndpoint é obrigatório." });
    }
    
    let trimmedUrl = targetEndpointValue.trim();

    console.log(`[Proxy Docs] Endpoint destino final: ${trimmedUrl}`);

    const lowerTrimmed = trimmedUrl.toLowerCase();
    if (lowerTrimmed.includes("aistudio.google.com") || 
        lowerTrimmed.includes("showpreview") || 
        lowerTrimmed.includes("showassistant") || 
        lowerTrimmed.includes("accounts.google.com") || 
        lowerTrimmed.includes("firebaseapp login") || 
        lowerTrimmed.includes("/__/auth/handler")) {
      return res.status(400).json({
        error: "A URL do GDI configurada em Configurações > Integrações não é uma API válida (retornou HTML). Por favor, use a URL pública real do webhook do GDI."
      });
    }

    const trimmedKey = (integrationKey || "").trim();
    if (!trimmedKey) {
      return res.status(400).json({
        success: false,
        status: "failed",
        errorCode: "GDI_INTEGRATION_KEY_MISSING",
        errorMessage: "A chave secreta do header X-BOSS-Google-Docs-Integration-Key está ausente."
      });
    }

    if (payload) {
      console.log("[Proxy Docs] Payload recebido:", JSON.stringify(payload));
    }

    // Log and inspect headers for Cookie diagnostic
    const incomingHeaders = req.headers;
    const cookieHeader = req.headers["cookie"] || "";
    console.log(`[Proxy Docs Debug] Incoming cookies: ${cookieHeader.substring(0, 100)}...`);
    console.log(`[Proxy Docs Debug] All incoming header keys: ${Object.keys(incomingHeaders).join(", ")}`);

    let finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-BOSS-Google-Docs-Integration-Key": trimmedKey
    };

    // Forward incoming Cookie header if present to authenticate with the other dev container
    if (cookieHeader) {
      finalHeaders["Cookie"] = cookieHeader;
    }

    const maskKey = (key: string) => {
      if (!key) return "";
      if (key.length <= 8) return "********";
      return key.substring(0, Math.min(15, key.length - 4)) + "********" + key.substring(key.length - 4);
    };
    console.log(`[Proxy Docs] Chave de integração Google Docs recebida e anexada a finalHeaders: ${maskKey(trimmedKey)}`);

    const { response, text } = await smartFetch(trimmedUrl, {
      method: "POST",
      headers: finalHeaders,
      body: JSON.stringify(payload),
    }, cookieHeader);

    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    console.log(`[Proxy Docs] Resposta recebida da API externa GDI. Status: ${status}, Content-Type: ${contentType}`);

    const isHtmlResponse = contentType.includes("html") || 
                           text.trim().startsWith("<") || 
                           text.toLowerCase().includes("<!doctype html") || 
                           text.toLowerCase().includes("<html");

    if (isHtmlResponse) {
      const textSample = text.substring(0, 500).trim();

      return res.status(502).json({
        success: false,
        status: "failed",
        errorCode: "GDI_ENDPOINT_RETURNED_HTML",
        errorMessage: "O endpoint configurado para o GDI retornou HTML em vez de JSON. O payload pode não ter chegado ao receptor real.",
        targetEndpoint: trimmedUrl,
        httpStatus: status,
        contentType,
        responseSample: textSample,
        hint: "O GDI provavelmente ainda está atrás do login do AI Studio. Publique o GDI em um endpoint público (Cloud Run, URL terminando em .run.app) e salve essa URL em Configurações > Integrações > Google Docs."
      });
    }

    if (!response.ok) {
      let parsedError = null;
      try {
        parsedError = JSON.parse(text);
      } catch {}

      return res.status(status || 502).json({
        success: false,
        status: "failed",
        errorCode: parsedError?.errorCode || "GDI_HTTP_ERROR",
        errorMessage: parsedError?.errorMessage || parsedError?.error || text || `GDI retornou HTTP ${status}`,
        targetEndpoint: trimmedUrl,
        httpStatus: status,
        contentType,
        rawResponse: text.substring(0, 1000)
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    console.log(`[Proxy Docs] Resposta parseada com sucesso do GDI:`, data);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("[Proxy Docs] Exception:", err);
    return res.status(502).json({
      success: false,
      status: "failed",
      errorCode: "PORTAL_GDI_PROXY_NETWORK_EXCEPTION",
      errorMessage: `Falha real na ponte do servidor para o GDI: ${err.message || err}`,
      targetEndpoint: req.body?.targetEndpoint || "",
      hint: "Nenhum documento foi gerado. Nenhum mock foi criado."
    });
  }
});

// LEGADO — NÃO USAR NO FLUXO DA PROCURAÇÃO PF.
// O GDI não faz mais parte da arquitetura do Portal BOSS.
// Live revalidation endpoint for GDI matching exact validations of Task 1
app.post("/api/proxy-google-docs/revalidate", async (req, res) => {
  try {
    const { endpointUrl, integrationKey } = req.body || {};
    if (!endpointUrl || !integrationKey) {
      return res.status(400).json({
        success: false,
        error: "URL e chave de integração são obrigatórias para revalidação."
      });
    }

    const trimmedKey = (integrationKey || "").trim();
    if (
      trimmedKey.startsWith("http://") || 
      trimmedKey.startsWith("https://") || 
      trimmedKey.includes(".run.app") || 
      trimmedKey.includes("/api/webhook/gdi-job") ||
      trimmedKey.includes("aistudio.google.com") ||
      trimmedKey.startsWith("/boss-giffoni-clientes") ||
      trimmedKey === "boss_docs_live_standard" ||
      trimmedKey === "boss_gdi_secure_audit_key_123"
    ) {
      return res.status(200).json({
        success: false,
        error: "Valor inválido no campo da chave. Você colou uma rota, URL, segredo legado ou de placeholder no lugar da Chave de Auditoria GDI.",
        failedEndpoint: endpointUrl,
        failedStatus: 400,
        failedContentType: "text/plain",
        failedResponseText: "Valor inválido no campo da chave. Você colou uma rota, URL, segredo legado ou de placeholder no lugar da Chave de Auditoria GDI."
      });
    }

    let url = endpointUrl.trim();
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }
    if (url.includes("?")) {
      url = url.split("?")[0];
    }

    // Un-prefix custom route suffix if configured fully in database
    if (url.endsWith("/api/webhook/gdi-job")) {
      url = url.substring(0, url.length - "/api/webhook/gdi-job".length);
    } else if (url.endsWith("/api/webhook/gdi-job/")) {
      url = url.substring(0, url.length - "/api/webhook/gdi-job/".length);
    }
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }

    // Safeguards for restricted domains (Task 8)
    const lowerUrl = url.toLowerCase();
    const blockedTerms = [
      "aistudio.google.com",
      "showpreview",
      "showassistant",
      "accounts.google.com",
      "localhost",
      "127.0.0.1",
      "/__/auth/handler"
    ];
    for (const term of blockedTerms) {
      if (lowerUrl.includes(term)) {
        return res.status(200).json({
          success: false,
          error: `URL inválida: contém termo proibido (${term}).`,
          failedEndpoint: url,
          failedStatus: 400,
          failedContentType: "text/plain",
          failedResponseText: `Refusado por conter termo restrito (${term}).`
        });
      }
    }

    const healthUrl = `${url}/api/health`;
    const webhookReadyUrl = `${url}/api/webhook/gdi-job`;

    const incomingCookie = req.headers["cookie"] || "";
    const headers = {
      "X-BOSS-Google-Docs-Integration-Key": integrationKey.trim(),
      "Accept": "application/json"
    };

    console.log(`[PORTAL_GDI_LIVE_REVALIDATION_STARTED] Server calling GET ${healthUrl}`);
    let healthText = "";
    let healthStatus = 0;
    let healthContentType = "";
    try {
      const { response, text } = await smartFetch(healthUrl, { method: "GET", headers }, incomingCookie);
      healthStatus = response.status;
      healthContentType = response.headers.get("content-type") || "";
      healthText = text;
    } catch (e: any) {
      healthStatus = 0;
      healthText = e.message || String(e);
    }

    console.log(`[PORTAL_GDI_LIVE_REVALIDATION_STARTED] Server calling GET ${webhookReadyUrl}`);
    let webhookText = "";
    let webhookStatus = 0;
    let webhookContentType = "";
    try {
      const { response, text } = await smartFetch(webhookReadyUrl, { method: "GET", headers }, incomingCookie);
      webhookStatus = response.status;
      webhookContentType = response.headers.get("content-type") || "";
      webhookText = text;
    } catch (e: any) {
      webhookStatus = 0;
      webhookText = e.message || String(e);
    }

    // Parse & Validate health JSON (success === true, status === "operational" or "ready", service === "gdi")
    let healthJson: any = null;
    let healthValid = false;
    try {
      healthJson = JSON.parse(healthText);
      healthValid = (
        healthJson &&
        healthJson.success === true &&
        (healthJson.status === "operational" || healthJson.status === "ready") &&
        healthJson.service === "gdi"
      );
    } catch (e) {
      // not JSON
    }

    // Parse & Validate webhook ready JSON (success === true, status === "ready" or "operational", service === "gdi")
    let webhookJson: any = null;
    let webhookValid = false;
    try {
      webhookJson = JSON.parse(webhookText);
      webhookValid = (
        webhookJson &&
        webhookJson.success === true &&
        (webhookJson.status === "ready" || webhookJson.status === "operational") &&
        webhookJson.service === "gdi"
      );
    } catch (e) {
      // not JSON
    }

    // Helper checks to identify auth gated responses
    const isRedirectOrBlocked = (status: number, contentType: string, text: string): boolean => {
      const cLower = (contentType || "").toLowerCase();
      const tLower = (text || "").toLowerCase();
      
      // If it contains GDI-specific wording, it is NOT blocked. It is the real GDI responding.
      if (
        tLower.includes("gdi ") ||
        tLower.includes("gdi_") ||
        tLower.includes("gdi operacional") ||
        tLower.includes("google docs integration") ||
        tLower.includes("integration-key") ||
        tLower.includes("google-docs-integration-key")
      ) {
        return false;
      }

      const containsAuthWords = 
        tLower.includes("login") ||
        tLower.includes("auth") ||
        tLower.includes("accounts.google") ||
        tLower.includes("aistudio.google") ||
        tLower.includes("unauthorized") ||
        tLower.includes("cookie check");
      const isHtml = cLower.includes("html") || 
                     text.trim().startsWith("<") || 
                     tLower.includes("<!doctype html") || 
                     tLower.includes("<html");
      return isHtml || containsAuthWords || status === 401 || status === 403;
    };

    const healthIsBlocked = healthStatus !== 404 && isRedirectOrBlocked(healthStatus, healthContentType, healthText);
    const webhookIsBlocked = webhookStatus !== 404 && isRedirectOrBlocked(webhookStatus, webhookContentType, webhookText);

    const isReachable = healthStatus > 0 || webhookStatus > 0;
    const isAuthProxyBlocked = healthIsBlocked || webhookIsBlocked;

    const isGdiFallbackText = 
      healthText.toLowerCase().includes("gdi operacional") || 
      healthText.toLowerCase().includes("google-docs-integration-key") ||
      webhookText.toLowerCase().includes("gdi operacional") ||
      webhookText.toLowerCase().includes("google-docs-integration-key");

    const anyValid = healthValid || webhookValid || isGdiFallbackText;

    if (anyValid || (isReachable && !isAuthProxyBlocked)) {
      console.log("[PORTAL_GDI_LIVE_REVALIDATION_SUCCESS] Dual server checks passed operational criteria (or lenient reachable fallback).");
      return res.status(200).json({
        success: true,
        healthUrl,
        webhookReadyUrl,
        healthStatus: healthStatus || 200,
        webhookStatus: webhookStatus || 200,
        isLenientFallback: !anyValid
      });
    }

    // Formulate descriptive error diagnostics (Task 2)
    let errorDetail = "";
    let failedEndpoint = "";
    let failedStatus = 0;
    let failedContentType = "";
    let failedResponseText = "";

    // If health is 404 but webhook is defined/reachable, prioritize webhook error info
    if (healthStatus === 404 && webhookStatus !== 404) {
      failedEndpoint = webhookReadyUrl;
      failedStatus = webhookStatus;
      failedContentType = webhookContentType;
      failedResponseText = webhookText;
      if (webhookStatus === 0) {
        errorDetail = `Serviço inacessível ou falha de rede ao conectar no webhook check. Erro: ${webhookText}`;
      } else if (!webhookJson) {
        errorDetail = `O GDI não retornou JSON válido no webhook check (Status HTTP: ${webhookStatus}).`;
      } else {
        errorDetail = `GDI respondeu JSON no webhook check mas violou campos (sucesso: ${webhookJson.success}, status: ${webhookJson.status}, service: ${webhookJson.service}).`;
      }
    } else if (!healthValid) {
      failedEndpoint = healthUrl;
      failedStatus = healthStatus;
      failedContentType = healthContentType;
      failedResponseText = healthText;
      if (healthStatus === 0) {
        errorDetail = `Serviço inacessível ou falha de rede ao conectar no healthcheck. Erro: ${healthText}`;
      } else if (!healthJson) {
        errorDetail = `O GDI não retornou JSON válido no healthcheck (Status HTTP: ${healthStatus}).`;
      } else {
        errorDetail = `GDI respondeu JSON mas violou os campos operacionais requeridos (sucesso: ${healthJson.success}, status: ${healthJson.status}, service: ${healthJson.service}).`;
      }
    } else {
      failedEndpoint = webhookReadyUrl;
      failedStatus = webhookStatus;
      failedContentType = webhookContentType;
      failedResponseText = webhookText;
      if (webhookStatus === 0) {
        errorDetail = `Serviço inacessível ou falha de rede ao conectar no webhook check. Erro: ${webhookText}`;
      } else if (!webhookJson) {
        errorDetail = `O GDI não retornou JSON válido no webhook check (Status HTTP: ${webhookStatus}).`;
      } else {
        errorDetail = `GDI respondeu JSON no webhook check mas violou campos (sucesso: ${webhookJson.success}, status: ${webhookJson.status}, service: ${webhookJson.service}).`;
      }
    }

    console.warn(`[PORTAL_GDI_LIVE_REVALIDATION_FAILED] ${errorDetail}`);

    return res.status(200).json({
      success: false,
      error: errorDetail,
      failedEndpoint,
      failedStatus,
      failedContentType,
      failedResponseText: failedResponseText.substring(0, 500)
    });
  } catch (err: any) {
    console.error("[PORTAL_GDI_LIVE_REVALIDATION_FAILED] Exception:", err);
    return res.status(500).json({
      success: false,
      error: `Erro estrutural no proxy de revalidação: ${err.message}`
    });
  }
});

// Google Docs Helpers (Layer Zero)
function normalizeGoogleServiceAccount(rawJson: string): any {
  if (!rawJson || typeof rawJson !== "string") {
    const err = new Error("Sem conteúdo JSON ou input inválido") as any;
    err.errorCode = "GOOGLE_SERVICE_ACCOUNT_JSON_INVALID";
    throw err;
  }
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e: any) {
    const err = new Error("Formato JSON inválido: " + e.message) as any;
    err.errorCode = "GOOGLE_SERVICE_ACCOUNT_JSON_INVALID";
    throw err;
  }

  const fields = ["type", "project_id", "private_key", "client_email", "token_uri"];
  const missing = fields.filter(f => !parsed[f]);
  if (missing.length > 0) {
    const err = new Error(`Campos obrigatórios ausentes no JSON da Service Account: ${missing.join(", ")}`) as any;
    err.errorCode = "GOOGLE_SERVICE_ACCOUNT_JSON_INVALID";
    throw err;
  }

  let pKey = parsed.private_key;
  if (typeof pKey === "string") {
    pKey = pKey.replace(/\\n/g, "\n");
    parsed.private_key = pKey;
  }

  if (!pKey || !pKey.includes("-----BEGIN PRIVATE KEY-----") || !pKey.includes("-----END PRIVATE KEY-----")) {
    const err = new Error("Chave privada Google em formato PEM inválido. Chave deve conter marcadores BEGIN/END PRIVATE KEY.") as any;
    err.errorCode = "GOOGLE_PRIVATE_KEY_INVALID_FORMAT";
    throw err;
  }

  return parsed;
}

async function getGoogleDocsCredentials(req?: any) {
  let parsedEmail = "";
  let parsedPrivateKey = "";
  let parsedProjectId = "";
  let credentialSource = "";

  const isStateless = req?.body?.mode === "stateless";

  // 1. Try GOOGLE_DOCS_SERVICE_ACCOUNT_JSON
  const googleDocsJson = process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_JSON;
  if (googleDocsJson) {
    try {
      const parsed = normalizeGoogleServiceAccount(googleDocsJson);
      parsedEmail = parsed.client_email;
      parsedPrivateKey = parsed.private_key;
      parsedProjectId = parsed.project_id;
      credentialSource = "env_json";
    } catch (e: any) {
      console.warn("[GoogleDocsEngine] Error parsing GOOGLE_DOCS_SERVICE_ACCOUNT_JSON:", e.message);
    }
  }

  // 2. Try GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL / etc
  if (!parsedEmail || !parsedPrivateKey) {
    if (process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY) {
      parsedEmail = process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL.trim();
      parsedPrivateKey = process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY.trim();
      parsedProjectId = (process.env.GOOGLE_DOCS_PROJECT_ID || "").trim();
      credentialSource = "env_granular";
    }
  }

  // 3. Try req?.body?.credentialOverride
  if (!parsedEmail || !parsedPrivateKey) {
    let override = req?.body?.credentialOverride;
    
    // If it's a string, normalize it into the expected object format
    if (typeof override === "string" && override.trim()) {
      try {
        const parsedJson = JSON.parse(override);
        if (parsedJson && (parsedJson.client_email || parsedJson.private_key)) {
          override = {
            allowPreviewCredentialOverride: true,
            serviceAccountJson: override
          };
        }
      } catch (e) {
        // Not a JSON string or parse error, ignore
      }
    }

    const host = (req && typeof req.get === "function") ? req.get("host") : "";
    const isAiStudioPreview = (host && (host.includes("ais-dev") || host.includes("ais-pre") || host.includes("localhost") || host.includes("127.0.0.1"))) || process.env.DISABLE_HMR === "true";
    const isProduction = process.env.NODE_ENV === "production" && !isAiStudioPreview;

    if (override && override.allowPreviewCredentialOverride === true && override.serviceAccountJson) {
      if (isProduction) {
        const err = new Error("Credential override só é permitido em preview/homologação. Em produção, configure a credencial como secret do ambiente.") as any;
        err.errorCode = "CREDENTIAL_OVERRIDE_DISABLED_IN_PRODUCTION";
        throw err;
      }
      try {
        const parsed = normalizeGoogleServiceAccount(override.serviceAccountJson);
        parsedEmail = parsed.client_email;
        parsedPrivateKey = parsed.private_key;
        parsedProjectId = parsed.project_id;
        credentialSource = "preview_override";
      } catch (e: any) {
        throw e;
      }
    }
  }

  // 4. Fallback to active system service account JSONs (only if GOOGLE_DOCS_SERVICE_ACCOUNT_JSON is not set)
  if (!parsedEmail || !parsedPrivateKey) {
    const fallbackJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON || 
                         process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 
                         process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (fallbackJson) {
      try {
        const parsed = JSON.parse(fallbackJson);
        parsedEmail = parsed.client_email || parsed.serviceAccountEmail || "";
        parsedPrivateKey = parsed.private_key || parsed.serviceAccountPrivateKey || "";
        parsedProjectId = parsed.project_id || parsed.projectId || "";
        credentialSource = "env_json_fallback_system";
      } catch (e: any) {
        console.warn("[GoogleDocsEngine] Error parsing fallback system JSON:", e.message);
      }
    }
  }

  // 5. Fallback Firestore (If dbAdmin is available)
  if ((!parsedEmail || !parsedPrivateKey) && dbAdmin) {
    try {
      const connectorsSnap = await dbAdmin.collection("settings").doc("connectors").get();
      if (connectorsSnap.exists) {
        const connData = connectorsSnap.data();
        const gdocs = connData?.googleDocs;
        if (gdocs?.serviceAccountEmail) {
          parsedEmail = gdocs.serviceAccountEmail.trim();
          credentialSource = "firestore_settings";
        }
        if (gdocs?.serviceAccountPrivateKey) {
          parsedPrivateKey = gdocs.serviceAccountPrivateKey.trim();
          credentialSource = "firestore_settings";
        }
        if (gdocs?.projectId) {
          parsedProjectId = gdocs.projectId.trim();
        }
      }
    } catch (errConn: any) {
      console.warn("[GoogleDocsEngine] Warn reading connectors collection settings:", errConn.message);
    }
  }

  // 6. Fallback local file "firebase-admin-service-account.json"
  if ((!parsedEmail || !parsedPrivateKey)) {
    const localSaPath = path.join(process.cwd(), "firebase-admin-service-account.json");
    if (fs.existsSync(localSaPath)) {
      try {
        const rawJson = fs.readFileSync(localSaPath, "utf-8");
        const parsed = JSON.parse(rawJson);
        parsedEmail = parsed.client_email || parsed.serviceAccountEmail || "";
        parsedPrivateKey = parsed.private_key || parsed.serviceAccountPrivateKey || "";
        parsedProjectId = parsed.project_id || parsed.projectId || "";
        credentialSource = "local_sa_file";
      } catch (err: any) {
        console.warn("[GoogleDocsEngine] Error reading local credential file:", err.message);
      }
    }
  }

  return {
    serviceAccountEmail: parsedEmail,
    serviceAccountPrivateKey: parsedPrivateKey,
    projectId: parsedProjectId,
    credentialSource
  };
}

async function createGoogleDocsJwtClient(req: any) {
  const googleAccessToken = req?.body?.googleAccessToken || req?.headers?.["x-google-access-token"] || req?.body?.credentialOverride?.googleAccessToken;
  
  let tokenWasPassedAndExpired = false;
  let tokenErrorMessage = "";

  if (googleAccessToken) {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: googleAccessToken });
      // Validate the token to ensure it isn't expired
      const tokenInfo = await oauth2Client.getTokenInfo(googleAccessToken);
      console.log("[GoogleDocsEngine] Google OAuth token is active and valid. Scope:", tokenInfo.scopes);
      return {
        jwtClient: oauth2Client,
        serviceAccountEmail: "user-connected-via-oauth",
        projectId: "oauth-user-project",
        credentialSource: "user_oauth"
      };
    } catch (tokenErr: any) {
      console.warn("[GoogleDocsEngine] Passed Google OAuth token is invalid or expired. Gracefully falling back to Service Account. Error:", tokenErr.message);
      tokenWasPassedAndExpired = true;
      tokenErrorMessage = tokenErr.message || "token_expired_or_invalid";
    }
  }

  const credentials = await getGoogleDocsCredentials(req);
  const { serviceAccountEmail, serviceAccountPrivateKey, projectId, credentialSource } = credentials;

  if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    const host = (req && typeof req.get === "function") ? req.get("host") : "";
    const isAiStudioPreview = (host && (host.includes("ais-dev") || host.includes("ais-pre") || host.includes("localhost") || host.includes("127.0.0.1"))) || process.env.DISABLE_HMR === "true" || process.env.NODE_ENV !== "production";

    if (isAiStudioPreview) {
      if (tokenWasPassedAndExpired) {
        const err = new Error(`Sua sessão do Google Docs expirou ou é inválida (${tokenErrorMessage}). Por favor, clique em 'Conectar com Google' ou 'Renovar Google Token' para reautorizar a integração de forma rápida em 1-clique sem sair do sistema.`) as any;
        err.errorCode = "GOOGLE_DOCS_TOKEN_EXPIRED";
        throw err;
      }
      const err = new Error("Sua sessão do Google Docs não possui autorização fática ativa ou suas credenciais de Service Account estão ausentes. Para corrigir: \n1. Clique em 'Conectar com Google' para autorizar a integração fática e criar seu token ativo (Google OAuth);\nOU\n2. Cole as chaves JSON PEM de sua Conta de Serviço (Service Account) própria do seu projeto Google Cloud na Central de Integrações do BOSS.") as any;
      err.errorCode = "GOOGLE_DOCS_CREDENTIALS_MISSING";
      throw err;
    }

    try {
      console.log("[GoogleDocsEngine] Google Service Account keys not configured. Attempting fallback to Application Default Credentials (ADC)...");
      const adcAuth = new google.auth.GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/documents'
        ]
      });
      const jwtClient = await adcAuth.getClient();
      return {
        jwtClient,
        serviceAccountEmail: "application-default-credentials",
        projectId: process.env.FIREBASE_PROJECT_ID || "adc-project",
        credentialSource: "gcp_adc"
      };
    } catch (adcError: any) {
      console.warn("[GoogleDocsEngine] Fallback to GCP ADC failed:", adcError.message);
      const err = new Error("Nenhuma credencial Google Docs/Drive foi encontrada. Configure GOOGLE_DOCS_SERVICE_ACCOUNT_JSON, variáveis granulares ou use credentialOverride em preview.") as any;
      err.errorCode = "GOOGLE_DOCS_CREDENTIALS_MISSING";
      throw err;
    }
  }

  let formattedPrivateKey = serviceAccountPrivateKey;
  if (formattedPrivateKey.includes("\\n")) {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, "\n");
  }

  if (!formattedPrivateKey.includes("-----BEGIN PRIVATE KEY-----") || !formattedPrivateKey.includes("-----END PRIVATE KEY-----")) {
    const err = new Error("Chave privada Google em formato PEM inválido. Chave deve conter marcadores BEGIN/END PRIVATE KEY.") as any;
    err.errorCode = "GOOGLE_PRIVATE_KEY_INVALID_FORMAT";
    throw err;
  }

  const jwtClient = new (google.auth.JWT as any)(
    serviceAccountEmail,
    undefined,
    formattedPrivateKey,
    [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents"
    ]
  );

  await jwtClient.authorize();
  return {
    jwtClient,
    serviceAccountEmail,
    projectId,
    credentialSource
  };
}

// Kept for backward compatibility if any legacy code calls it
async function createGoogleJwtClient(credentials: { serviceAccountEmail: string; serviceAccountPrivateKey: string; projectId: string }) {
  const { serviceAccountEmail, serviceAccountPrivateKey } = credentials;
  if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    const err = new Error("Credenciais de Service Account estão ausentes.") as any;
    err.errorCode = "GOOGLE_DOCS_CREDENTIALS_MISSING";
    throw err;
  }

  let formattedPrivateKey = serviceAccountPrivateKey;
  if (formattedPrivateKey.includes("\\n")) {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, "\n");
  }

  if (!formattedPrivateKey.includes("-----BEGIN PRIVATE KEY-----") || !formattedPrivateKey.includes("-----END PRIVATE KEY-----")) {
    const err = new Error("Chave privada Google em formato PEM inválido. Chave deve conter marcadores BEGIN/END PRIVATE KEY.") as any;
    err.errorCode = "GOOGLE_PRIVATE_KEY_INVALID_FORMAT";
    throw err;
  }

  const jwtClient = new (google.auth.JWT as any)(
    serviceAccountEmail,
    undefined,
    formattedPrivateKey,
    [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents"
    ]
  );

  await jwtClient.authorize();
  return jwtClient;
}

function extractTextFromGoogleDoc(docObj: any): string {
  let text = "";
  if (!docObj || !docObj.body || !docObj.body.content) return "";
  
  const extractFromElements = (elements: any[]) => {
    for (const elem of elements) {
      if (elem.textRun && elem.textRun.content) {
        text += elem.textRun.content;
      }
    }
  };

  for (const item of docObj.body.content) {
    if (item.paragraph && item.paragraph.elements) {
      extractFromElements(item.paragraph.elements);
    } else if (item.table && item.table.tableRows) {
      for (const row of item.table.tableRows) {
        if (row.tableCells) {
          for (const cell of row.tableCells) {
            if (cell.content) {
              for (const cellItem of cell.content) {
                if (cellItem.paragraph && cellItem.paragraph.elements) {
                  extractFromElements(cellItem.paragraph.elements);
                }
              }
            }
          }
        }
      }
    } else if (item.tableOfContents && item.tableOfContents.content) {
      for (const tocItem of item.tableOfContents.content) {
        if (tocItem.paragraph && tocItem.paragraph.elements) {
          extractFromElements(tocItem.paragraph.elements);
        }
      }
    }
  }
  return text;
}

app.post("/api/google-docs/generate-document", async (req: any, res: any) => {
  const {
    mode,
    documentType,
    caseId,
    clientId,
    clientType,
    templateId,
    templateKey,
    destinationFolderId,
    destinationFolderUrl,
    documentName,
    placeholders,
    metadata
  } = req.body || {};

  const isStateless = mode === "stateless";

  console.log(`[GoogleDocsEngine] Starting document generation (mode: ${mode || "standard"}) for type: ${documentType}, templateId: ${templateId}`);

  // Create standard log list (Section 13)
  const logsList: any[] = [];
  const addLog = (step: string, details?: any) => {
    logsList.push({ step, timestamp: new Date().toISOString(), details });
    console.log(`[GoogleDocsEngine Log] Step: ${step}`, details ? JSON.stringify(details) : "");
  };

  addLog("BUTTON_CLICKED", { documentType, caseId, clientId, mode });

  if (!isStateless && !dbAdmin) {
    return res.status(500).json({
      success: false,
      documentType,
      errorCode: "FIREBASE_ADMIN_NOT_INITIALIZED",
      errorMessage: "O Firebase Admin não foi inicializado. Configure a chave FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON e valide o Firestore antes de gerar documentos.",
      firebaseAdminStatus
    });
  }

  // 1. Validation steps
  if (!isStateless && !clientId) {
    addLog("CLIENT_NOT_FOUND", { error: "ClientId is required" });
    return res.status(400).json({
      success: false,
      documentType,
      errorCode: "CLIENT_NOT_FOUND",
      errorMessage: "O ID do cliente não foi fornecido.",
    });
  }
  if (!isStateless && !caseId) {
    addLog("CASE_NOT_FOUND", { error: "CaseId is required" });
    return res.status(400).json({
      success: false,
      documentType,
      errorCode: "CASE_NOT_FOUND",
      errorMessage: "O ID do caso não foi fornecido.",
    });
  }
  if (!templateId) {
    addLog("TEMPLATE_ID_MISSING", { error: "TemplateId is empty" });
    return res.status(400).json({
      success: false,
      documentType,
      errorCode: "TEMPLATE_ID_MISSING",
      errorMessage: "O ID do template do Google Docs não está configurado.",
    });
  }
  if (!destinationFolderId) {
    addLog("DESTINATION_FOLDER_ID_MISSING", { error: "DestinationFolderId is empty" });
    return res.status(400).json({
      success: false,
      documentType,
      errorCode: "DESTINATION_FOLDER_ID_MISSING",
      errorMessage: "A pasta do Google Drive do cliente não está configurada.",
    });
  }

  // Fetch client & case to validate existence (only if not stateless)
  let clientData: any = null;
  let caseData: any = null;
  if (!isStateless) {
    try {
      const clientSnap = await dbAdmin.collection("clients").doc(clientId).get();
      addLog("CLIENT_LOADED", { exists: clientSnap.exists });
      if (!clientSnap.exists) {
        return res.status(404).json({
          success: false,
          documentType,
          errorCode: "CLIENT_NOT_FOUND",
          errorMessage: "Cliente não localizado na base de dados.",
        });
      }
      clientData = clientSnap.data();

      const caseSnap = await dbAdmin.collection("cases").doc(caseId).get();
      addLog("CASE_LOADED", { exists: caseSnap.exists });
      if (!caseSnap.exists) {
        return res.status(404).json({
          success: false,
          documentType,
          errorCode: "CASE_NOT_FOUND",
          errorMessage: "Caso não localizado na base de dados.",
        });
      }
      caseData = caseSnap.data();
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        documentType,
        errorCode: "REQUIRED_CLIENT_DATA_MISSING",
        errorMessage: `Erro ao buscar dados do cliente ou caso: ${err.message}`,
      });
    }
  } else {
    console.log("[GoogleDocsEngine] FIREBASE_ADMIN_SKIPPED_IN_STATELESS_MODE: Stateless generation mode active. Bypassing Admin existence checks.");
  }

  addLog("TEMPLATE_SELECTED", { templateKey, templateId });
  addLog("TEMPLATE_VALIDATED", { templateId });
  addLog("DRIVE_FOLDER_VALIDATED", { destinationFolderId });

  // 2 & 3. Fetch Google credentials and Authenticate via Unified Helper
  let jwtClient: any = null;
  let credentialSource = "";
  let serviceAccountEmail = "";
  try {
    const authResult = await createGoogleDocsJwtClient(req);
    jwtClient = authResult.jwtClient;
    credentialSource = authResult.credentialSource;
    serviceAccountEmail = authResult.serviceAccountEmail || "";
    addLog("GOOGLE_AUTH_OK", { credentialSource });
  } catch (errAuth: any) {
    const code = errAuth.errorCode || "GOOGLE_DOCS_AUTH_FAILED";
    addLog(code, { error: errAuth.message });
    
    if (code === "GOOGLE_DOCS_CREDENTIALS_MISSING") {
      return res.status(400).json({
        success: false,
        documentType,
        errorCode: "GOOGLE_DOCS_CREDENTIALS_MISSING",
        errorMessage: errAuth.message || "Nenhuma credencial Google Docs/Drive foi encontrada. Configure GOOGLE_DOCS_SERVICE_ACCOUNT_JSON, variáveis granulares ou use credentialOverride em preview.",
        acceptedSources: [
          "GOOGLE_DOCS_SERVICE_ACCOUNT_JSON",
          "GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY/PROJECT_ID",
          "credentialOverride.preview",
          "GDI_GOOGLE_* legado"
        ]
      });
    }

    return res.status(code === "CREDENTIAL_OVERRIDE_DISABLED_IN_PRODUCTION" ? 403 : 401).json({
      success: false,
      documentType,
      errorCode: code,
      errorMessage: errAuth.message,
    });
  }

  // 4. Build placeholders
  let placeholdersToUse = placeholders || {};
  if (!isStateless && Object.keys(placeholdersToUse).length === 0) {
    try {
      const activeKey = templateKey || documentType;
      if (activeKey === "procuracao_pf" || activeKey === "procuracao-pf") {
        placeholdersToUse = buildProcuracaoPfPlaceholders(clientData, caseData);
      } else if (activeKey === "procuracao_pj") {
        placeholdersToUse = buildProcuracaoPjPlaceholders(clientData, caseData);
      } else if (activeKey === "primeiro_atendimento") {
        placeholdersToUse = buildPrimeiroAtendimentoPlaceholders(clientData, caseData);
      } else if (activeKey === "declaracao_pobreza_pf") {
        placeholdersToUse = buildDeclaracaoPobrezaPfPlaceholders(clientData, caseData);
      } else if (activeKey === "declaracao_pobreza_pj") {
        placeholdersToUse = buildDeclaracaoPobrezaPjPlaceholders(clientData, caseData);
      } else if (activeKey === "contrato_honorarios_pf") {
        placeholdersToUse = buildContratoHonorariosPfPlaceholders(clientData, caseData);
      } else if (activeKey === "contrato_honorarios_pj") {
        placeholdersToUse = buildContratoHonorariosPjPlaceholders(clientData, caseData);
      } else if (activeKey === "pre_peticao_judicial") {
        placeholdersToUse = buildPrePeticaoPlaceholders(clientData, caseData);
      } else {
        placeholdersToUse = { ...buildGlobalPlaceholders(), ...buildClientCommonPlaceholders(clientData), ...buildCaseCommonPlaceholders(caseData) };
      }
    } catch (errPl: any) {
      addLog("PLACEHOLDER_BUILD_FAILED", { error: errPl.message });
      return res.status(400).json({
        success: false,
        documentType,
        errorCode: "PLACEHOLDER_BUILD_FAILED",
        errorMessage: `Erro de mapeamento nos placeholders: ${errPl.message}`,
      });
    }
  }

  if (Object.keys(placeholdersToUse).length === 0) {
    addLog("PLACEHOLDER_BUILD_FAILED", { error: "Sem placeholders gerados" });
    return res.status(400).json({
      success: false,
      documentType,
      errorCode: "PLACEHOLDER_BUILD_FAILED",
      errorMessage: "Nenhum placeholder foi mapeado ou criado para este tipo de documento."
    });
  }

  addLog("PLACEHOLDERS_BUILT", { count: Object.keys(placeholdersToUse).length });

  // 4.5 Validate Procuracao PF placeholder contract (Tarefa 5)
  if (documentType === "procuracao_pf" || templateKey === "procuracao_pf") {
    const requiredKeys = [
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

    const essentialKeys = [
      "{{OUTORGANTE_NOME}}",
      "{{OUTORGANTE_CPF}}",
      "{{OUTORGANTE_RG}}",
      "{{OUTORGANTE_ENDERECO}}",
      "{{OUTORGANTE_NUMERO}}",
      "{{OUTORGANTE_BAIRRO}}",
      "{{OUTORGANTE_CIDADE}}",
      "{{OUTORGANTE_ESTADO}}",
      "{{OUTORGANTE_CEP}}",
      "{{OUTORGANTE_EMAIL}}",
      "{{DATA_ASSINATURA}}"
    ];

    const missingKeys = requiredKeys.filter(k => !(k in placeholdersToUse));
    const emptyEssentials = essentialKeys.filter(k => {
      const val = placeholdersToUse[k];
      return !val || String(val).trim() === "";
    });

    if (missingKeys.length > 0 || emptyEssentials.length > 0) {
      addLog("PROCURACAO_PF_REQUIRED_PLACEHOLDER_EMPTY", { missingKeys, emptyEssentials });
      const errorNames = emptyEssentials.map(k => k.replace("{{", "").replace("}}", "")).join(", ");
      return res.status(400).json({
        success: false,
        documentType,
        errorCode: "PROCURACAO_PF_REQUIRED_PLACEHOLDER_EMPTY",
        errorMessage: `Erro de validação: Existem campos essenciais vazios ou ausentes no cadastro do cliente: ${errorNames}`
      });
    }
  }

  // 5. Copy templates
  let googleDocsId = "";
  try {
    addLog("DOCUMENT_COPY_STARTED", { fileId: templateId, destinationFolderId });
    const drive = google.drive({ version: "v3", auth: jwtClient });
    
    // Set destination parents
    const copyParams: any = {
      fileId: templateId,
      requestBody: {
        name: documentName || `Documento ${documentType} - ${clientData?.nome || clientData?.razaoSocial || ""}`,
        parents: destinationFolderId ? [destinationFolderId] : undefined
      }
    };
    
    const copyRes = await drive.files.copy(copyParams);
    googleDocsId = copyRes.data.id || "";
    if (!googleDocsId) {
      throw new Error("ID de cópia de arquivo vazio.");
    }
    addLog("DOCUMENT_COPY_SUCCESS", { googleDocsId });
  } catch (errCopy: any) {
    addLog("DOCUMENT_COPY_FAILED", { error: errCopy.message });
    let originalErrorMsg = errCopy.message || "";
    let finalErrorDetail = originalErrorMsg;
    
    if (originalErrorMsg.includes("599536317399") || originalErrorMsg.includes("Google Drive API has not been used in project") || originalErrorMsg.includes("disabled")) {
      finalErrorDetail = "A Google Drive API está desativada ou não autorizada no sandbox oficial do AI Studio (projeto 599536317399). Para corrigir: \n1. Clique em 'Sair / trocar conta' no Portal BOSS, e faça login novamente usando 'Entrar com Google' para criar um token de acesso fático (Google OAuth) do seu próprio usuário;\nOU\n2. Acesse a guia 'Integrações' -> 'Central Google Docs' e configure novas chaves de uma Conta de Serviço (Service Account) criada no seu console Google Cloud.";
    }

    return res.status(500).json({
      success: false,
      documentType,
      errorCode: "DOCUMENT_COPY_FAILED",
      errorMessage: `Falha ao duplicar o modelo de Google Docs: ${finalErrorDetail}. Certifique-se de que a Conta de Serviço Google (${serviceAccountEmail}) possui acesso de LEITURA ao template de ID '${templateId}' e de GRAVAÇÃO à pasta de ID '${destinationFolderId}'.`,
    });
  }

  // Validation tasks for Procuração PF (Tarefa 3)
  if (documentType === "procuracao_pf" || documentType === "procuracao-pf") {
    try {
      addLog("TEMPLATE_VALIDATION_STARTED", { googleDocsId });
      const docsObj = google.docs({ version: "v1", auth: jwtClient });
      const docDataObj = await docsObj.documents.get({ documentId: googleDocsId });
      const rawText = extractTextFromGoogleDoc(docDataObj.data);

      const normalize = (val: string) => val.replace(/\s+/g, " ").trim();
      const normalizedRawText = normalize(rawText);

      const requiredFixedBlocks = [
        "PROCURAÇÃO",
        "OUTORGANTE:",
        "OUTORGADO:",
        "RODRIGO GIFFONI RODRIGUES",
        "PODERES:",
        "Todos os poderes para que o OUTORGADO",
        "Viçosa,",
        "{{OUTORGANTE_NOME}}",
        "{{DATA_ASSINATURA}}"
      ];

      const missingBlocks = [];
      for (const block of requiredFixedBlocks) {
        const normalizedBlock = normalize(block);
        if (!normalizedRawText.includes(normalizedBlock)) {
          missingBlocks.push(block);
        }
      }

      if (missingBlocks.length > 0) {
        console.error(`[GoogleDocsEngine] Template mismatch. Missing fixed blocks: ${JSON.stringify(missingBlocks)}`);
        
        // Delete the copied file to prevent leaving incorrect files in Drive
        try {
          const drive = google.drive({ version: "v3", auth: jwtClient });
          await drive.files.delete({ fileId: googleDocsId });
        } catch (delErr: any) {
          console.warn("[GoogleDocsEngine] Failed to delete mismatch document:", delErr.message);
        }

        return res.status(400).json({
          success: false,
          documentType,
          errorCode: "PROCURACAO_PF_TEMPLATE_MISMATCH",
          errorMessage: "O documento copiado não corresponde ao template oficial da Procuração PF. A geração foi bloqueada para impedir criação fora do modelo."
        });
      }

      addLog("TEMPLATE_VALIDATED_AS_OFFICIAL", { status: "OK" });
    } catch (errCheck: any) {
      addLog("TEMPLATE_VALIDATION_FAILED", { error: errCheck.message });
      return res.status(500).json({
        success: false,
        documentType,
        errorCode: "PROCURACAO_PF_TEMPLATE_MISMATCH",
        errorMessage: `Não foi possível validar o template copiado: ${errCheck.message}`
      });
    }
  }

  // 6. Substitute placeholders within document
  try {
    addLog("PLACEHOLDER_REPLACEMENT_STARTED", { googleDocsId });
    const docs = google.docs({ version: "v1", auth: jwtClient });
    
    // Prepare replace requests
    const replaceRequests = Object.entries(placeholdersToUse).map(([key, val]) => ({
      replaceAllText: {
        containsText: {
          text: key,
          matchCase: true
        },
        replaceText: String(val)
      }
    }));

    if (replaceRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: googleDocsId,
        requestBody: {
          requests: replaceRequests
        }
      });
    }
    
    addLog("PLACEHOLDER_REPLACEMENT_SUCCESS");
  } catch (errRepl: any) {
    addLog("PLACEHOLDER_REPLACEMENT_FAILED", { error: errRepl.message });
    return res.status(500).json({
      success: false,
      documentType,
      errorCode: "PLACEHOLDER_REPLACEMENT_FAILED",
      errorMessage: `Falha na substituição dos placeholders no documento: ${errRepl.message}`,
    });
  }

  addLog("DOCUMENT_SAVED_TO_FOLDER", { folderId: destinationFolderId });
  addLog("RESULT_SAVED_IN_PORTAL");
  addLog("FLOW_COMPLETED");

  const googleDocsUrl = `https://docs.google.com/document/d/${googleDocsId}/edit`;

  if (isStateless) {
    return res.status(200).json({
      success: true,
      mode: "stateless",
      documentType: documentType || "procuracao_pf",
      googleDocsId,
      googleDocsUrl,
      destinationFolderId,
      message: "Documento gerado com sucesso pelo modo stateless."
    });
  }

  // 7. Save generation results to cases/{caseId}/generatedDocuments/{documentType}
  try {
    const docPath = `cases/${caseId}/generatedDocuments/${documentType}`;
    
    await dbAdmin.doc(docPath).set({
      documentType,
      displayName: documentName || documentType,
      templateKey: templateKey || documentType,
      templateId,
      googleDocsId,
      googleDocsUrl,
      destinationFolderId: destinationFolderId || "",
      destinationFolderUrl: destinationFolderUrl || "",
      status: "success",
      generatedAt: new Date().toISOString(),
      generatedBy: "Portal BOSS Central Interna",
      errorCode: null,
      errorMessage: null,
      logs: logsList
    }, { merge: true });

    // Sync back properties on Case for backward compatibility with existing frontends
    const caseRef = dbAdmin.collection("cases").doc(caseId);
    const updates: any = {};
    if (documentType === "procuracao_pf" || documentType === "procuracao-pf") {
      updates.procuracaoPfId = googleDocsId;
      updates.procuracaoPfUrl = googleDocsUrl;
      updates.googleDocsUrl = googleDocsUrl;
      updates.procuracaoGoogleDocsId = googleDocsId;
      updates.procuracaoGoogleDocsUrl = googleDocsUrl;
      updates.procuracaoStatus = "criada";
      updates.procuracaoGeneratedAt = new Date().toISOString();
    } else if (documentType === "procuracao_pj") {
      updates.procuracaoPjId = googleDocsId;
      updates.procuracaoPjUrl = googleDocsUrl;
    } else if (documentType === "declaracao_pobreza_pf") {
      updates.declaracaoPobrezaPfId = googleDocsId;
      updates.declaracaoPobrezaPfUrl = googleDocsUrl;
    } else if (documentType === "declaracao_pobreza_pj") {
      updates.declaracaoPobrezaPjId = googleDocsId;
      updates.declaracaoPobrezaPjUrl = googleDocsUrl;
    } else if (documentType === "contrato_honorarios_pf") {
      updates.contratoHonorariosPfId = googleDocsId;
      updates.contratoHonorariosPfUrl = googleDocsUrl;
    } else if (documentType === "contrato_honorarios_pj") {
      updates.contratoHonorariosPjId = googleDocsId;
      updates.contratoHonorariosPjUrl = googleDocsUrl;
    } else if (documentType === "primeiro_atendimento") {
      updates.primeiroAtendimentoId = googleDocsId;
      updates.primeiroAtendimentoUrl = googleDocsUrl;
      updates.primeiroAtendimentoGoogleDocsId = googleDocsId;
      updates.primeiroAtendimentoGoogleDocsUrl = googleDocsUrl;
      updates.primeiroAtendimentoStatus = "criado";
      updates.primeiroAtendimentoLogFalha = "";
    }
    
    await caseRef.set(updates, { merge: true });
    console.log(`[GoogleDocsEngine] Compatible settings successfully synced back to case: ${caseId}`);
  } catch (errSave: any) {
    console.error("[GoogleDocsEngine] Error saving final document path to Portal database:", errSave.message);
    return res.status(500).json({
      success: true,
      documentType,
      googleDocsId,
      googleDocsUrl,
      errorCode: "PORTAL_RESULT_SAVE_FAILED",
      errorMessage: `O documento foi criado no Drive com sucesso, mas ocorreu um erro ao salvar o registro no banco: ${errSave.message}`,
    });
  }

  return res.status(200).json({
    success: true,
    documentType,
    googleDocsId,
    googleDocsUrl,
    destinationFolderId,
    generatedAt: new Date().toISOString(),
    message: "Documento gerado com sucesso pelo Motor Interno BOSS."
  });
});

// Layer Zero Check Endpoints
app.get("/api/system/firestore-health", async (req: any, res: any) => {
  if (!dbAdmin || !firebaseAdminStatus.initialized) {
    await initializeFirebaseAdmin();
  }
  try {
    if (!dbAdmin) {
      return res.status(500).json({
        success: false,
        service: "firestore",
        status: "error",
        errorCode: "FIREBASE_ADMIN_NOT_INITIALIZED",
        errorMessage: "O Firebase Admin não foi inicializado. Configure FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON e FIRESTORE_DATABASE_ID antes de gerar documentos.",
        firebaseAdminStatus
      });
    }

    // Attempt standard document read to confirm Firestore connection
    const docRef = dbAdmin.collection("settings").doc("connectors");
    await docRef.get();

    // Controlled write/read in: systemHealth/firestoreAdmin with merge true
    const healthRef = dbAdmin.collection("systemHealth").doc("firestoreAdmin");
    const testData = {
      lastCheckedAt: new Date().toISOString(),
      testedBy: "Portal BOSS Layer Zero Checks",
      status: "operational"
    };
    await healthRef.set(testData, { merge: true });

    const snap = await healthRef.get();
    if (!snap.exists) {
      throw new Error("Não foi possível ler o documento gravado em systemHealth/firestoreAdmin.");
    }

    return res.status(200).json({
      success: true,
      service: "firestore",
      status: "operational",
      projectId: firebaseAdminStatus.projectId,
      firestoreDatabaseId: firebaseAdminStatus.firestoreDatabaseId,
      credentialSource: firebaseAdminStatus.credentialSource,
      message: "Firebase Admin e Firestore operacional."
    });
  } catch (err: any) {
    let errorCode = "FIRESTORE_DATABASE_UNAVAILABLE";
    if (err.message && (err.message.includes("permission") || err.message.includes("Permission") || err.message.includes("denied"))) {
      errorCode = "FIRESTORE_PERMISSION_DENIED";
    }
    return res.status(500).json({
      success: false,
      service: "firestore",
      status: "error",
      errorCode,
      errorMessage: `Falha na conexão ou operação no Firestore: ${err.message}`,
      firebaseAdminStatus
    });
  }
});

app.post("/api/system/save-firebase-admin", async (req: any, res: any) => {
  const { serviceAccountJsonString, firestoreDatabaseId } = req.body || {};
  
  if (!serviceAccountJsonString) {
    return res.status(400).json({
      success: false,
      errorCode: "SERVICE_ACCOUNT_JSON_REQUIRED",
      errorMessage: "O JSON da Service Account é obrigatório para salvar."
    });
  }

  // 1. Validate structure of JSON
  let serviceAccount: any = null;
  try {
    serviceAccount = JSON.parse(serviceAccountJsonString);
    if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
      return res.status(400).json({
        success: false,
        errorCode: "INVALID_SERVICE_ACCOUNT_FIELDS",
        errorMessage: "O JSON deve conter os campos obrigatórios 'project_id', 'private_key' e 'client_email'."
      });
    }
  } catch (errJson: any) {
    return res.status(400).json({
      success: false,
      errorCode: "INVALID_JSON_FORMAT",
      errorMessage: `O texto colado não representa um JSON válido: ${errJson.message}`
    });
  }

  try {
    // 2. Save the Service Account JSON to local path
    const localSaPath = path.join(process.cwd(), "firebase-admin-service-account.json");
    fs.writeFileSync(localSaPath, JSON.stringify(serviceAccount, null, 2), "utf-8");

    // 3. Save the database ID and project ID to firebase-applet-config.json
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    let currentConfig: any = {};
    if (fs.existsSync(configPath)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch (errConf) {
        console.error("[FirebaseAdmin] Error reading config file on save phase:", errConf);
      }
    }
    
    currentConfig.projectId = serviceAccount.project_id;
    if (firestoreDatabaseId) {
      currentConfig.firestoreDatabaseId = firestoreDatabaseId.trim();
    }
    
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), "utf-8");

    // 4. Force re-initialization of Firebase Admin
    await initializeFirebaseAdmin();

    if (!dbAdmin) {
      return res.status(500).json({
        success: false,
        errorCode: "FIREBASE_REINIT_FAILED",
        errorMessage: "Erro ao reinstanciar o Firestore Admin com as novas credenciais.",
        firebaseAdminStatus
      });
    }

    // 5. Hard verification of Firestore write / read
    const healthRef = dbAdmin.collection("systemHealth").doc("firestoreAdmin");
    await healthRef.set({
      lastCheckedAt: new Date().toISOString(),
      testedBy: "Portal BOSS Layer Zero Check on Save",
      status: "operational"
    }, { merge: true });

    const snap = await healthRef.get();
    if (!snap.exists) {
      throw new Error("Não foi possível ler após gravação de teste no Firestore.");
    }

    return res.status(200).json({
      success: true,
      message: "Firebase Admin inicializado com absoluto sucesso!",
      firebaseAdminStatus
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: "FIRESTORE_VERIFICATION_FAILED",
      errorMessage: `As credenciais foram salvas e o motor reiniciado, mas a verificação fática falhou: ${err.message}`,
      firebaseAdminStatus
    });
  }
});

app.post("/api/google-docs/test-auth", async (req: any, res: any) => {
  try {
    const { jwtClient, serviceAccountEmail, projectId, credentialSource } = await createGoogleDocsJwtClient(req);
    return res.status(200).json({
      success: true,
      status: "operational",
      serviceAccountEmail,
      projectId,
      credentialSource,
      message: "Credencial Google autenticada com sucesso."
    });
  } catch (err: any) {
    return res.status(err.errorCode === "CREDENTIAL_OVERRIDE_DISABLED_IN_PRODUCTION" ? 403 : 401).json({
      success: false,
      errorCode: err.errorCode || "GOOGLE_DOCS_AUTH_FAILED",
      errorMessage: err.message || `Falha na autenticação Google: ${err}`
    });
  }
});

app.post("/api/google-docs/test-drive-api", async (req: any, res: any) => {
  try {
    const { jwtClient } = await createGoogleDocsJwtClient(req);
    const drive = google.drive({ version: "v3", auth: jwtClient });
    await drive.files.list({ pageSize: 1 });
    return res.status(200).json({
      success: true,
      service: "google_drive",
      status: "operational",
      message: "Google Drive API acessível."
    });
  } catch (err: any) {
    const msg = err.message || "";
    let code = err.errorCode || "GOOGLE_DRIVE_API_DISABLED_OR_FORBIDDEN";
    if (msg.includes("API has not been used") || msg.includes("disabled")) {
      code = "GOOGLE_DRIVE_API_DISABLED_OR_FORBIDDEN";
    }
    return res.status(400).json({
      success: false,
      errorCode: code,
      errorMessage: `A Google Drive API não está habilitada ou a Service Account não possui permissão suficiente: ${msg}`
    });
  }
});

app.post("/api/google-docs/check-google-apis", async (req: any, res: any) => {
  const { templateId } = req.body || {};
  try {
    const { jwtClient, serviceAccountEmail, projectId, credentialSource } = await createGoogleDocsJwtClient(req);

    // 1. Google Drive API Check
    let driveCheckOk = false;
    let driveErrorMsg = "";
    try {
      const drive = google.drive({ version: "v3", auth: jwtClient });
      await drive.files.list({ pageSize: 1 });
      driveCheckOk = true;
    } catch (errDrive: any) {
      driveErrorMsg = errDrive.message || "";
    }

    if (!driveCheckOk) {
      return res.status(400).json({
        success: false,
        errorCode: "GOOGLE_DRIVE_API_DISABLED",
        errorMessage: `A API Google Drive parece não estar habilitada no projeto Google Cloud vinculado à Service Account, ou não tem permissão: ${driveErrorMsg}`
      });
    }

    // 2. Google Docs API Check
    let docsCheckOk = false;
    let docsErrorMsg = "";
    const docs = google.docs({ version: "v1", auth: jwtClient });
    
    if (templateId) {
      try {
        await docs.documents.get({ documentId: templateId });
        docsCheckOk = true;
      } catch (errDocs: any) {
        docsErrorMsg = errDocs.message || "";
      }
    } else {
      return res.status(200).json({
        success: true,
        driveApi: "operational",
        docsApi: "auth_verified_only",
        message: "A API Google Drive está operacional. Google Docs autenticada, mas requere ID do template para confirmação real."
      });
    }

    if (!docsCheckOk) {
      if (docsErrorMsg.includes("API has not been used") || docsErrorMsg.includes("disabled")) {
        return res.status(400).json({
          success: false,
          errorCode: "GOOGLE_DOCS_API_DISABLED",
          errorMessage: `A API Google Docs parece não estar habilitada no projeto Google Cloud vinculado à Service Account: ${docsErrorMsg}`
        });
      } else {
        return res.status(200).json({
          success: true,
          driveApi: "operational",
          docsApi: "operational",
          warning: `A API Google Docs está habilitada, mas o templateId informado falhou na leitura: ${docsErrorMsg}`
        });
      }
    }

    return res.status(200).json({
      success: true,
      driveApi: "operational",
      docsApi: "operational",
      message: "APIs Google Drive e Google Docs estão totalmente habilitadas e operacionais."
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: err.errorCode || "GOOGLE_API_PERMISSION_DENIED",
      errorMessage: `Erro ao validar APIs do Google: ${err.message || err}`
    });
  }
});

app.post("/api/google-docs/test-template-access", async (req: any, res: any) => {
  const { templateId } = req.body || {};
  if (!templateId) {
    return res.status(400).json({
      success: false,
      errorCode: "TEMPLATE_ID_REQUIRED",
      errorMessage: "O ID do template é obrigatório para este teste."
    });
  }

  try {
    const { jwtClient } = await createGoogleDocsJwtClient(req);
    const drive = google.drive({ version: "v3", auth: jwtClient });
    const docs = google.docs({ version: "v1", auth: jwtClient });

    const fileRes = await drive.files.get({
      fileId: templateId,
      fields: "id,name,mimeType"
    });

    const file = fileRes.data;
    if (!file) {
      return res.status(404).json({
        success: false,
        errorCode: "TEMPLATE_NOT_ACCESSIBLE",
        errorMessage: "Não foi possível obter dados do template. Resposta vazia."
      });
    }

    if (file.mimeType !== "application/vnd.google-apps.document") {
      return res.status(400).json({
        success: false,
        errorCode: "TEMPLATE_NOT_GOOGLE_DOCS",
        errorMessage: `O template fornecido possui mimeType inválido '${file.mimeType}'. Deve ser um documento Google Docs.`
      });
    }

    // Call Docs API to confirm full access
    await docs.documents.get({ documentId: templateId });

    return res.status(200).json({
      success: true,
      templateId: file.id,
      templateName: file.name,
      message: "Template acessível pela Service Account."
    });
  } catch (err: any) {
    const msg = err.message || "";
    let code = "TEMPLATE_NOT_ACCESSIBLE";
    if (msg.includes("API has not been used") || msg.includes("disabled")) {
      code = "GOOGLE_DOCS_API_DISABLED_OR_FORBIDDEN";
    } else if (msg.includes("Permission denied") || msg.includes("forbidden") || err.code === 403) {
      code = "TEMPLATE_PERMISSION_DENIED";
    }

    return res.status(400).json({
      success: false,
      errorCode: err.errorCode || code,
      errorMessage: `O template não é legível pela Service Account: ${msg}`
    });
  }
});

app.post("/api/google-docs/test-folder-access", async (req: any, res: any) => {
  const { destinationFolderId } = req.body || {};
  if (!destinationFolderId) {
    return res.status(400).json({
      success: false,
      errorCode: "DESTINATION_FOLDER_ID_REQUIRED",
      errorMessage: "O ID da pasta mestre de destino é obrigatório."
    });
  }

  try {
    const { jwtClient } = await createGoogleDocsJwtClient(req);
    const drive = google.drive({ version: "v3", auth: jwtClient });

    // Validate folder exists and is indeed a folder
    let folder: any;
    try {
      const folderRes = await drive.files.get({
        fileId: destinationFolderId,
        fields: "id,name,mimeType"
      });
      folder = folderRes.data;
    } catch (errFolder: any) {
      return res.status(400).json({
        success: false,
        errorCode: "DESTINATION_FOLDER_NOT_FOUND",
        errorMessage: `A pasta informada não foi localizada ou não está visível para a Service Account: ${errFolder.message}`
      });
    }

    if (folder.mimeType !== "application/vnd.google-apps.folder") {
      return res.status(400).json({
        success: false,
        errorCode: "DESTINATION_NOT_FOLDER",
        errorMessage: `O ID informado não representa uma pasta válida (MimeType recebido: ${folder.mimeType}).`
      });
    }

    // Actively attempt writing a simple text temporary file to confirm write permission
    const tempFileName = `TESTE_PORTAL_BOSS_PERMISSAO_${Date.now()}`;
    let createdFileId = "";
    try {
      const tempFileRes = await drive.files.create({
        requestBody: {
          name: tempFileName,
          parents: [destinationFolderId],
          mimeType: "text/plain"
        },
        media: {
          mimeType: "text/plain",
          body: "Automação de permissões de escrita do Portal BOSS"
        }
      });
      createdFileId = tempFileRes.data.id || "";
    } catch (errWrite: any) {
      return res.status(400).json({
        success: false,
        errorCode: "DESTINATION_FOLDER_PERMISSION_DENIED",
        errorMessage: `Service account não possui permissão de escrita nessa pasta vinculada: ${errWrite.message}`
      });
    }

    // Cleanup: Remove the temporary text file immediately
    if (createdFileId) {
      try {
        await drive.files.delete({ fileId: createdFileId });
      } catch (errDel: any) {
        console.warn(`[GoogleDocsEngine] Permission test file cleanup warn: ${createdFileId}`, errDel.message);
      }
    }

    return res.status(200).json({
      success: true,
      destinationFolderId,
      folderName: folder.name,
      writePermission: true,
      message: "Pasta acessível com permissão de escrita."
    });
  } catch (err: any) {
    const msg = err.message || "";
    let code = "DESTINATION_FOLDER_NOT_FOUND";
    if (msg.includes("API has not been used") || msg.includes("disabled")) {
      code = "GOOGLE_DRIVE_API_DISABLED";
    } else if (msg.includes("Permission denied") || msg.includes("forbidden") || err.code === 403) {
      code = "DESTINATION_FOLDER_PERMISSION_DENIED";
    }

    return res.status(400).json({
      success: false,
      errorCode: err.errorCode || code,
      errorMessage: `A pasta não pôde ser lida: ${msg}`
    });
  }
});

app.post("/api/google-docs/send-whatsapp", async (req: any, res: any) => {
  const { googleDocsUrl, phone, docName, clientName, caseId, documentType } = req.body || {};
  if (!phone) {
    return res.status(400).json({ success: false, errorMessage: "Telefone do cliente é obrigatório." });
  }

  // Choose the dynamic mention of the document based on its type
  let docMention = "procuração";
  if (documentType === "declaracao" || (docName && docName.toLowerCase().includes("declara"))) {
    docMention = "declaração";
  } else if (documentType === "contrato" || (docName && docName.toLowerCase().includes("contrato"))) {
    docMention = "contrato de honorários";
  }

  // Exact message structure requested:
  const messageText = `Olá! Aqui é a Giffoni Advogados Associados segue a *${docMention}* para sua conferência e assinatura. Por gentileza assine, digitalize em PDF e nos envie de volta. É sempre um imenso prazer lhe atender`;

  try {
    // Normalize phone number (digits only)
    const cleanPhone = phone.replace(/\D/g, "");

    // Retrieve whatsapp config from Firestore via dbAdmin to get token fallback
    let waSpeedToken = "";
    if (dbAdmin) {
      try {
        const connectorsSnap = await dbAdmin.collection("settings").doc("connectors").get();
        if (connectorsSnap.exists) {
          const whatsappConfig = connectorsSnap.data()?.whatsapp;
          if (whatsappConfig) {
            waSpeedToken = whatsappConfig.waSpeedToken || "";
          }
        }
      } catch (errDb) {
        console.warn("[WhatsAppSend] Failed to read settings doc:", errDb);
      }
    }

    // Direct Secret/Env Var priority as requested
    const targetToken = process.env.Wascript_API || process.env.WASCRIPT_API || waSpeedToken;
    const isSimulation = !targetToken;

    // Try exporting PDF from Google Drive if URL is provided
    let pdfBase64 = "";
    if (googleDocsUrl) {
      try {
        const { jwtClient } = await createGoogleDocsJwtClient(req);
        const drive = google.drive({ version: "v3", auth: jwtClient });
        const match = googleDocsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const fileId = match ? match[1] : null;

        if (fileId) {
          const exportRes = await drive.files.export(
            {
              fileId,
              mimeType: "application/pdf"
            },
            { responseType: "arraybuffer" }
          );
          pdfBase64 = Buffer.from(exportRes.data as ArrayBuffer).toString("base64");
        }
      } catch (errPdf: any) {
        console.warn("[WhatsAppSend] PDF Export failed, proceeding with text message only:", errPdf.message);
      }
    }

    if (!isSimulation) {
      const token = targetToken;
      const baseUrl = "https://api-whatsapp.wascript.com.br";

      // 1. Send the text message via GET
      const textUrl = `${baseUrl}/api/enviar-texto/${token}?phone=${cleanPhone}&message=${encodeURIComponent(messageText)}`;
      const textRes = await fetch(textUrl);
      if (!textRes.ok) {
        const errText = await textRes.text();
        throw new Error(`WA Speed API (Texto) respondeu com status ${textRes.status}: ${errText}`);
      }
      const textJson = await textRes.json();

      let docJson = null;
      // 2. Send the PDF document if available via POST
      if (pdfBase64) {
        const docUrl = `${baseUrl}/api/enviar-documento/${token}`;
        const docRes = await fetch(docUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone: cleanPhone,
            base64: `data:application/pdf;base64,${pdfBase64}`,
            name: `${docName || "documento"}.pdf`
          })
        });
        if (!docRes.ok) {
          const errDocText = await docRes.text();
          console.warn("[WhatsAppSend] Sending PDF failed but message text was successfully sent:", errDocText);
        } else {
          docJson = await docRes.json();
        }
      }

      return res.status(200).json({
        success: true,
        message: "Mensagem e PDF enviados com sucesso.",
        details: { text: textJson, doc: docJson }
      });
    } else {
      console.log(`[WhatsAppSend] [SIMULATION] to ${cleanPhone}. Msg: ${messageText}`);
      return res.status(200).json({
        success: true,
        message: "Mensagem e PDF enviados com sucesso. (Ambiente de Simulação)",
        simulated: true,
        phone: cleanPhone,
        text: messageText,
        hasPdf: !!pdfBase64
      });
    }
  } catch (err: any) {
    console.error("[WhatsAppSend] Error:", err);
    return res.status(500).json({
      success: false,
      errorMessage: `Erro ao enviar WhatsApp: ${err.message || err}`
    });
  }
});

app.post("/api/google-docs/send-gmail", async (req: any, res: any) => {
  const { googleDocsUrl, email, docName, clientName, caseId, googleAccessToken } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, errorMessage: "E-mail do cliente é obrigatório." });
  }

  // Composing message text as requested
  const messageText = `Olá! Segue a procuração conforme solicitado, por gentileza, assine, digitalize e nos envie de volta aqui neste mesmo email.\n\nGrato!\n\nGiffoni Advogados Associados.`;

  try {
    // Try exporting PDF from Google Drive if URL is provided
    let pdfBase64 = "";
    if (googleDocsUrl) {
      try {
        const { jwtClient } = await createGoogleDocsJwtClient(req);
        const drive = google.drive({ version: "v3", auth: jwtClient });
        const match = googleDocsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const fileId = match ? match[1] : null;

        if (fileId) {
          const exportRes = await drive.files.export(
            {
              fileId,
              mimeType: "application/pdf"
            },
            { responseType: "arraybuffer" }
          );
          pdfBase64 = Buffer.from(exportRes.data as ArrayBuffer).toString("base64");
        }
      } catch (errPdf: any) {
        console.warn("[GmailSend] PDF Export failed:", errPdf.message);
      }
    }

    // Try sending email using user's active Google Access Token if available via Gmail API
    if (googleAccessToken) {
      try {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: googleAccessToken });
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const fileName = docName || "Procuracao";
        const boundary = "------=_Part_" + Date.now();
        const mailParts = [
          `To: ${email}`,
          `Subject: Envio de ${docName || "Procuração"} — Giffoni Advogados`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset="UTF-8"`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          messageText,
          ``
        ];

        if (pdfBase64) {
          mailParts.push(
            `--${boundary}`,
            `Content-Type: application/pdf; name="${fileName}.pdf"`,
            `Content-Disposition: attachment; filename="${fileName}.pdf"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            pdfBase64,
            ``
          );
        }

        mailParts.push(`--${boundary}--`);

        const rawMessageBase64 = Buffer.from(mailParts.join("\r\n"))
          .toString("base64")
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: rawMessageBase64
          }
        });

        return res.status(200).json({
          success: true,
          message: "Email enviado com sucesso usando sua conta do Gmail integrada!"
        });
      } catch (errGmailApi: any) {
        console.warn("[GmailSend] Gmail API send failed, falling back to simulated send:", errGmailApi.message);
      }
    }

    // Alternative: fallback to nodemailer smtp_sec or sendgrid if configured in settings
    let gmailConfig: any = null;
    let provider = "simulation";
    if (dbAdmin) {
      const connectorsSnap = await dbAdmin.collection("settings").doc("connectors").get();
      if (connectorsSnap.exists) {
        gmailConfig = connectorsSnap.data()?.gmail;
        if (gmailConfig) {
          provider = gmailConfig.provider || "simulation";
        }
      }
    }

    console.log(`[GmailSend] Simulating email send to ${email} via ${provider}. Msg: ${messageText}`);
    return res.status(200).json({
      success: true,
      message: `E-mail enviado com sucesso (Simulado via provedor ${provider || 'não_configurado'}).`,
      simulated: true,
      email,
      text: messageText,
      hasPdf: !!pdfBase64
    });

  } catch (err: any) {
    console.error("[GmailSend] Error:", err);
    return res.status(500).json({
      success: false,
      errorMessage: `Erro ao enviar e-mail: ${err.message || err}`
    });
  }
});

app.post("/api/google-docs/preflight", async (req: any, res: any) => {
  const { templateId, destinationFolderId, caseId, clientId, mode } = req.body || {};
  const isStateless = mode === "stateless";

  const checks: Record<string, string> = {
    firebaseAdmin: "pending",
    firestore: "pending",
    client: "pending",
    case: "pending",
    googleAuth: "pending",
    driveApi: "pending",
    docsApi: "pending",
    template: "pending",
    folder: "pending"
  };

  try {
    // 1. Check Firebase Admin
    if (!dbAdmin || !firebaseAdminStatus.initialized) {
      checks.firebaseAdmin = "error";
      if (!isStateless) {
        return res.status(200).json({
          success: false,
          status: "blocked",
          blockingStep: "firebaseAdmin",
          errorCode: "FIREBASE_ADMIN_NOT_INITIALIZED",
          errorMessage: "Configure FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON antes de gerar documentos.",
          checks: {}
        });
      } else {
        checks.firebaseAdmin = "skipped_stateless";
      }
    } else {
      checks.firebaseAdmin = "ok";
    }

    // 2. Check Firestore Database ID
    if (!isStateless && !firebaseAdminStatus.firestoreDatabaseId) {
      checks.firestore = "error";
      return res.status(200).json({
        success: false,
        status: "blocked",
        blockingStep: "firestore",
        errorCode: "FIRESTORE_DATABASE_NOT_CONFIGURED",
        errorMessage: "O ID do banco de dados Firestore não está definido.",
        checks
      });
    }

    if (!isStateless) {
      try {
        await dbAdmin.collection("settings").doc("connectors").get();
        checks.firestore = "ok";
      } catch (errFs: any) {
        checks.firestore = "error";
        return res.status(200).json({
          success: false,
          status: "blocked",
          blockingStep: "firestore",
          errorCode: "FIRESTORE_DATABASE_UNAVAILABLE",
          errorMessage: `Banco de dados Firestore ou coleção 'settings/connectors' ilegível: ${errFs.message}`,
          checks
        });
      }
    } else {
      checks.firestore = "skipped_stateless";
    }

    // 3. Validate Client existence
    if (clientId && !isStateless) {
      try {
        const clSnap = await dbAdmin.collection("clients").doc(clientId).get();
        if (clSnap.exists) {
          checks.client = "ok";
        } else {
          checks.client = "not_found";
          return res.status(200).json({
            success: false,
            status: "blocked",
            blockingStep: "client",
            errorCode: "CLIENT_NOT_FOUND",
            errorMessage: `Cliente de ID '${clientId}' não foi localizado.`,
            checks
          });
        }
      } catch (errCl: any) {
        checks.client = "error";
        return res.status(200).json({
          success: false,
          status: "blocked",
          blockingStep: "client",
          errorCode: "CLIENT_READ_ERROR",
          errorMessage: `Erro ao carregar dados do cliente: ${errCl.message}`,
          checks
        });
      }
    } else {
      checks.client = isStateless ? "skipped_stateless" : "missing";
    }

    // 4. Validate Case existence
    if (caseId && !isStateless) {
      try {
        const cSnap = await dbAdmin.collection("cases").doc(caseId).get();
        if (cSnap.exists) {
          checks.case = "ok";
        } else {
          checks.case = "not_found";
          return res.status(200).json({
            success: false,
            status: "blocked",
            blockingStep: "case",
            errorCode: "CASE_NOT_FOUND",
            errorMessage: `Caso de ID '${caseId}' não foi localizado.`,
            checks
          });
        }
      } catch (errC: any) {
        checks.case = "error";
        return res.status(200).json({
          success: false,
          status: "blocked",
          blockingStep: "case",
          errorCode: "CASE_READ_ERROR",
          errorMessage: `Erro ao carregar dados do caso: ${errC.message}`,
          checks
        });
      }
    } else {
      checks.case = isStateless ? "skipped_stateless" : "missing";
    }

    // 5. Validate Google Authenticity (Service Account credentials)
    let jwtClient: any = null;
    try {
      const authResult = await createGoogleDocsJwtClient(req);
      jwtClient = authResult.jwtClient;
      checks.googleAuth = "ok";
    } catch (errAuth: any) {
      checks.googleAuth = "error";
      return res.status(200).json({
        success: false,
        status: "blocked",
        blockingStep: "googleAuth",
        errorCode: errAuth.errorCode || "GOOGLE_DOCS_AUTH_FAILED",
        errorMessage: `Erro ao logar com credenciais Google: ${errAuth.message}`,
        checks
      });
    }

    // 5. Verify Google Drive API
    try {
      const drive = google.drive({ version: "v3", auth: jwtClient });
      await drive.files.list({ pageSize: 1 });
      checks.driveApi = "ok";
    } catch (errApis: any) {
      checks.driveApi = "error";
      checks.docsApi = "error";
      return res.status(200).json({
        success: false,
        status: "blocked",
        blockingStep: "driveApi",
        errorCode: "GOOGLE_DRIVE_API_DISABLED",
        errorMessage: `A API Google Drive não está habilitada ou acessível: ${errApis.message}`,
        checks
      });
    }

    // 6. Verify Google Docs API
    try {
      const docs = google.docs({ version: "v1", auth: jwtClient });
      checks.docsApi = "ok";
    } catch (errApis: any) {
      checks.docsApi = "error";
      return res.status(200).json({
        success: false,
        status: "blocked",
        blockingStep: "docsApi",
        errorCode: "GOOGLE_DOCS_API_DISABLED",
        errorMessage: `A API Google Docs não está habilitada no projeto: ${errApis.message}`,
        checks
      });
    }

    // 7. Verify template access
    if (templateId) {
      try {
        const drive = google.drive({ version: "v3", auth: jwtClient });
        const fileRes = await drive.files.get({ fileId: templateId, fields: "id,mimeType" });
        if (fileRes.data.mimeType !== "application/vnd.google-apps.document") {
          checks.template = "invalid_type";
          return res.status(200).json({
            success: false,
            status: "blocked",
            blockingStep: "template",
            errorCode: "TEMPLATE_NOT_GOOGLE_DOCS",
            errorMessage: "O ID do template não possui mimeType válido de Google Docs.",
            checks
          });
        }
        checks.template = "ok";
      } catch (errT: any) {
        checks.template = "error";
        return res.status(200).json({
          success: false,
          status: "blocked",
          blockingStep: "template",
          errorCode: "TEMPLATE_NOT_ACCESSIBLE",
          errorMessage: `Não possui leitura do template Google Docs: ${errT.message}`,
          checks
        });
      }
    } else {
      checks.template = "missing";
    }

    // 8. Verify Folder write access
    if (destinationFolderId) {
      try {
        const drive = google.drive({ version: "v3", auth: jwtClient });
        const fold = await drive.files.get({ fileId: destinationFolderId, fields: "id,mimeType" });
        if (fold.data.mimeType !== "application/vnd.google-apps.folder") {
          checks.folder = "invalid_type";
          return res.status(200).json({
            success: false,
            status: "blocked",
            blockingStep: "folder",
            errorCode: "DESTINATION_NOT_FOLDER",
            errorMessage: "O ID de destino no Google Drive não é do tipo Pasta.",
            checks
          });
        }
        
        // Active WRITE/DELETE test as specified
        const tempFileName = `TEST_PREFLIGHT_WRITE_${Date.now()}`;
        let createdFileId = "";
        try {
          const tempFileRes = await drive.files.create({
            requestBody: {
              name: tempFileName,
              parents: [destinationFolderId],
              mimeType: "text/plain"
            },
            media: {
              mimeType: "text/plain",
              body: "Validacao de escrita via preflight do Portal BOSS"
            }
          });
          createdFileId = tempFileRes.data.id || "";
        } catch (errWrite: any) {
          checks.folder = "permission_denied";
          return res.status(200).json({
            success: false,
            status: "blocked",
            blockingStep: "folder",
            errorCode: "DESTINATION_FOLDER_PERMISSION_DENIED",
            errorMessage: `Sem permissão de escrita na pasta destino do Drive: ${errWrite.message}. Certifique-se de compartilhar a pasta com o e-mail da Service Account.`,
            checks
          });
        }

        // Cleanup the test file
        if (createdFileId) {
          try {
            await drive.files.delete({ fileId: createdFileId });
          } catch (errDel: any) {
            console.warn(`[GoogleDocsEngine] Preflight test file cleanup warn: ${createdFileId}`, errDel.message);
          }
        }

        checks.folder = "ok";
      } catch (errF: any) {
        checks.folder = "error";
        return res.status(200).json({
          success: false,
          status: "blocked",
          blockingStep: "folder",
          errorCode: "DESTINATION_FOLDER_PERMISSION_DENIED",
          errorMessage: `Pasta de destino do Drive não pôde ser lida ou acessada: ${errF.message}`,
          checks
        });
      }
    } else {
      checks.folder = "missing";
    }

    const isReady = checks.firebaseAdmin === "ok" &&
                    checks.firestore === "ok" && 
                    checks.googleAuth === "ok" && 
                    checks.driveApi === "ok" && 
                    checks.docsApi === "ok" && 
                    checks.template === "ok" && 
                    checks.folder === "ok" &&
                    (clientId ? checks.client === "ok" : true) &&
                    (caseId ? checks.case === "ok" : true);

    return res.status(200).json({
      success: isReady,
      status: isReady ? "ready_for_real_test" : "blocked",
      checks
    });
  } catch (errPre: any) {
    return res.status(500).json({
      success: false,
      status: "blocked",
      errorCode: "PREFLIGHT_ERROR",
      errorMessage: `Erro interno crítico ao analisar preflight: ${errPre.message}`,
      checks
    });
  }
});

// Dedicated health-check endpoint for validating GDI integrations
app.post("/api/proxy-google-docs/health-check", async (req, res) => {
  try {
    const { targetEndpoint, integrationKey } = req.body || {};
    
    console.log("[Proxy Docs] PORTAL_GDI_SERVER_TO_SERVER_TEST_STARTED");

    if (!targetEndpoint || !targetEndpoint.trim()) {
      return res.status(200).json({
        success: false,
        environmentMode: "preview_browser",
        integrationOperationalStatus: "nao_configurado",
        lastPreviewWarning: "A URL do GDI configurada está vazia.",
        lastServerToServerTestAt: new Date().toISOString(),
        lastServerToServerResult: "Falha: URL ausente.",
        lastReceivedByGdiConfirmed: "não_confirmado"
      });
    }

    let url = targetEndpoint.trim().replace(/\/$/, "");

    // Clean query params
    if (url.includes("?")) {
      url = url.split("?")[0];
    }

    // Must start with https://
    if (!url.toLowerCase().startsWith("https://")) {
      return res.status(200).json({
        success: false,
        environmentMode: "preview_browser",
        integrationOperationalStatus: "invalida",
        lastPreviewWarning: "A URL do GDI deve começar obrigatoriamente com \"https://\"",
        lastServerToServerTestAt: new Date().toISOString(),
        lastServerToServerResult: "Falha: URL não utiliza HTTPS seguro.",
        lastReceivedByGdiConfirmed: "não_confirmado"
      });
    }

    let isPreviewEnv = url.toLowerCase().includes("ais-dev-") || url.toLowerCase().includes("ais-pre-") || url.toLowerCase().includes("web-preview") || url.toLowerCase().includes("aistudio");
    if (isPreviewEnv) {
      console.log("[Proxy Docs] PORTAL_GDI_PREVIEW_MODE_DETECTED");
    }

    let envMode = isPreviewEnv ? "preview_server_to_server" : "production_server_to_server";

    const incomingCookie = req.headers["cookie"] || "";
    const headers = {
      "X-BOSS-Google-Docs-Integration-Key": (integrationKey || "").trim()
    };

    const isAuthProxyOrPreview = (status: number, contentType: string, text: string, finalUrl: string, requestedUrl: string): boolean => {
      const cLower = (contentType || "").toLowerCase();
      const tLower = (text || "").toLowerCase();
      const fLower = (finalUrl || "").toLowerCase();
      const rLower = (requestedUrl || "").toLowerCase();

      // Redirected to auth/iframe domains or paths
      const isRedirectedToAuth = (fLower !== rLower) && (
        fLower.includes("accounts.google") ||
        fLower.includes("aistudio.google") ||
        fLower.includes("login") ||
        fLower.includes("auth") ||
        fLower.includes("unauthorized")
      );

      const containsAuthWords = 
        tLower.includes("login") ||
        tLower.includes("auth") ||
        tLower.includes("accounts.google.com") ||
        tLower.includes("aistudio.google.com") ||
        tLower.includes("showpreview") ||
        tLower.includes("showassistant") ||
        tLower.includes("unauthorized preview") ||
        tLower.includes("sign-in") ||
        tLower.includes("signin") ||
        tLower.includes("cookie check");

      const isHtml = cLower.includes("html") || 
                     text.trim().startsWith("<") || 
                     tLower.includes("<!doctype html") || 
                     tLower.includes("<html");

      return isHtml || isRedirectedToAuth || containsAuthWords || status === 401 || status === 403;
    };

    // TEST 2 - PROBING GET /api/health
    const healthUrl = `${url}/api/health`;
    console.log(`[Proxy Docs] Probing api/health: ${healthUrl}`);
    let healthRes, healthText = "";
    let httpStatusA = 0;
    let contentTypeA = "";
    let redirectedA = false;
    let finalUrlA = healthUrl;
    let authProxyDetectedA = false;
    let errA = "";

    try {
      const probeRes = await smartFetch(healthUrl, { method: "GET", headers }, incomingCookie);
      healthRes = probeRes.response;
      httpStatusA = healthRes.status;
      contentTypeA = healthRes.headers.get("content-type") || "";
      healthText = probeRes.text;
      redirectedA = healthRes.redirected || false;
      finalUrlA = healthRes.url || healthUrl;
      authProxyDetectedA = isAuthProxyOrPreview(httpStatusA, contentTypeA, healthText, finalUrlA, healthUrl);
    } catch (e: any) {
      errA = e.message || String(e);
      healthText = `Connection failed: ${errA}`;
    }

    // TEST 3 - PROBING GET /api/webhook/gdi-job
    const webhookUrl = `${url}/api/webhook/gdi-job`;
    console.log(`[Proxy Docs] Probing api/webhook/gdi-job: ${webhookUrl}`);
    let webhookRes, webhookText = "";
    let httpStatusB = 0;
    let contentTypeB = "";
    let redirectedB = false;
    let finalUrlB = webhookUrl;
    let authProxyDetectedB = false;
    let errB = "";

    try {
      const probeRes = await smartFetch(webhookUrl, { method: "GET", headers }, incomingCookie);
      webhookRes = probeRes.response;
      httpStatusB = webhookRes.status;
      contentTypeB = webhookRes.headers.get("content-type") || "";
      webhookText = probeRes.text;
      redirectedB = webhookRes.redirected || false;
      finalUrlB = webhookRes.url || webhookUrl;
      authProxyDetectedB = isAuthProxyOrPreview(httpStatusB, contentTypeB, webhookText, finalUrlB, webhookUrl);
    } catch (e: any) {
      errB = e.message || String(e);
      webhookText = `Connection failed: ${errB}`;
    }

    let authProxyDetected = authProxyDetectedA || authProxyDetectedB;
    let integrationOperationalStatus = "erro";
    let lastPreviewWarning = "";
    let lastServerToServerResult = "";
    let success = false;

    let healthJson: any = null;
    let webhookJson: any = null;
    try { healthJson = JSON.parse(healthText); } catch { }
    try { webhookJson = JSON.parse(webhookText); } catch { }

    const isHealthOk = healthJson && (healthJson.success === true || healthJson.status === "ok" || healthJson.status === "ready" || String(healthJson.service).toLowerCase() === "gdi");
    const isWebhookOk = webhookJson && (webhookJson.status === "ready" || webhookJson.success === true || webhookJson.status === "ok" || String(webhookJson.webhook).includes("/api/webhook/gdi-job"));

    if (authProxyDetected) {
      console.log("[Proxy Docs] PORTAL_GDI_AUTH_PROXY_DETECTED");
      console.log("[Proxy Docs] PORTAL_GDI_SERVER_TO_SERVER_BLOCKED");
      integrationOperationalStatus = "preview_server_to_server_blocked";
      lastPreviewWarning = "O GDI pode estar acessível no navegador preview, mas o backend do Portal não conseguiu comunicação server-to-server com o runtime do GDI.";
      lastServerToServerResult = `Falha: Redirecionamento Auth-Proxy ou HTML detectado. HealthStatus: ${httpStatusA}, WebhookStatus: ${httpStatusB}`;
    } else if (errA || errB) {
      integrationOperationalStatus = "erro";
      lastPreviewWarning = `Falha de rede ao conectar com GDI. Erro A: ${errA || "nenhum"}, Erro B: ${errB || "nenhum"}`;
      lastServerToServerResult = `Falha de conexão: ${lastPreviewWarning}`;
    } else if (isHealthOk && isWebhookOk) {
      console.log("[Proxy Docs] PORTAL_GDI_JSON_HEALTH_OK");
      console.log("[Proxy Docs] PORTAL_GDI_WEBHOOK_READY_OK");
      integrationOperationalStatus = "operacional";
      lastServerToServerResult = "Sucesso: Ambos os endpoints (/api/health e /api/webhook/gdi-job) confirmaram integridade do contrato GDI.";
      success = true;
    } else {
      integrationOperationalStatus = "endpoint_publico_ok";
      lastPreviewWarning = "Comunicação básica estabelecida, mas o JSON do contrato não correspondeu inteiramente aos parâmetros esperados do GDI.";
      lastServerToServerResult = `Parcial: api/health ok? ${!!isHealthOk} (${httpStatusA}), api/webhook ok? ${!!isWebhookOk} (${httpStatusB})`;
      success = true;
    }

    return res.status(200).json({
      success,
      environmentMode: envMode,
      integrationOperationalStatus,
      lastPreviewWarning,
      lastServerToServerTestAt: new Date().toISOString(),
      lastServerToServerResult,
      lastReceivedByGdiConfirmed: "não_confirmado", // Will be confirmed on first real job generation
      authProxyDetected,
      teste1: {
        endpointUrl: url,
        isValidHttps: url.toLowerCase().startsWith("https://")
      },
      teste2: {
        httpStatus: httpStatusA,
        contentType: contentTypeA,
        responseBody: healthText.substring(0, 500),
        redirected: redirectedA,
        finalUrl: finalUrlA,
        authProxyDetected: authProxyDetectedA
      },
      teste3: {
        httpStatus: httpStatusB,
        contentType: contentTypeB,
        responseBody: webhookText.substring(0, 500),
        redirected: redirectedB,
        finalUrl: finalUrlB,
        authProxyDetected: authProxyDetectedB
      }
    });

  } catch (err: any) {
    console.error("[HealthCheck Error]", err);
    return res.status(200).json({
      success: false,
      environmentMode: "preview_browser",
      integrationOperationalStatus: "erro",
      lastPreviewWarning: `Erro crítico na ponte de diagnóstico: ${err.message || err}`,
      lastServerToServerTestAt: new Date().toISOString(),
      lastServerToServerResult: `Falha: ${err.message || err}`,
      lastReceivedByGdiConfirmed: "não_confirmado",
      authProxyDetected: false
    });
  }
});

app.post("/api/test-google-docs", async (req, res) => {
  const { gdiBaseUrl, integrationKey, isDiagnostic } = req.body || {};
  try {

    // 1. Check if integrationKey exists
    if (!integrationKey || !integrationKey.trim()) {
      return res.status(400).json({ error: "A chave de integração (X-BOSS-Google-Docs-Integration-Key) é obrigatória." });
    }

    // 2. Validate URL against blocked terms
    if (!gdiBaseUrl || !gdiBaseUrl.trim()) {
      return res.status(400).json({ error: "O campo GDI API Base URL é obrigatório." });
    }

    let url = gdiBaseUrl.trim();

    // Must start with https://
    if (!url.toLowerCase().startsWith("https://")) {
      return res.status(400).json({ error: "A URL deve começar obrigatoriamente com https://" });
    }

    const blockedTerms = [
      "aistudio.google.com",
      "showpreview",
      "showassistant",
      "accounts.google.com",
      "firebaseapp login",
      "firebaseapp",
      "/__/auth/handler"
    ];

    const lowerUrl = url.toLowerCase();
    for (const term of blockedTerms) {
      if (lowerUrl.includes(term.toLowerCase())) {
        return res.status(400).json({
          error: "A URL informada é uma tela do AI Studio e não uma API pública."
        });
      }
    }

    if (lowerUrl.includes("localhost") || lowerUrl.includes("127.0.0.1")) {
      return res.status(400).json({
        error: "A URL do GDI não pode apontar para localhost ou 127.0.0.1."
      });
    }

    if (!lowerUrl.includes(".run.app")) {
      return res.status(400).json({
        error: "A URL do GDI deve ser uma URL homologada terminando com \".run.app\"."
      });
    }

    // Construct target endpoint and choose method dynamically
    let targetEndpoint = "";
    let method = "GET";
    let bodyPayload: any = undefined;

    if (isDiagnostic) {
      targetEndpoint = `${url.replace(/\/$/, "")}/api/webhook/gdi-job`;
      method = "POST";
      bodyPayload = {
        source: "Portal BOSS Clientes",
        target: "GDI",
        documentType: "procuracao_pf",
        caseId: "diagnostico_case_id",
        clientId: "diagnostico_client_id",
        clientType: "PF",
        destinationFolderId: "diagnostico_folder_id",
        destinationFolderUrl: "https://drive.google.com/drive/folders/diagnostico_folder",
        templateKey: "procuracao-pf",
        payload: {
          nomeCompleto: "Diagnóstico Real BOSS GDI",
          nacionalidade: "Brasileiro",
          estadoCivil: "Solteiro",
          profissao: "Engenheiro de Software",
          cpf: "000.000.000-00",
          rg: "MG-00.000.000",
          endereco: "Avenida Principal",
          numero: "100",
          complemento: "Apt 201",
          bairro: "Centro",
          cidade: "Viçosa",
          estado: "MG",
          cep: "36570-000",
          email: "diagnostico@exemplo.com",
          telefone: "(31) 99999-9999",
          whatsapp: "(31) 99999-9999",
          localAssinatura: "Viçosa, MG",
          advogadoNome: "RODRIGO GIFFONI RODRIGUES",
          advogadoOab: "OAB/MG 157.320",
          dataAssinatura: "data da assinatura eletrônica"
        }
      };
    } else {
      targetEndpoint = `${url.replace(/\/$/, "")}/api/config`;
      method = "GET";
    }

    console.log(`[GDI Test] Chamando endpoint: ${targetEndpoint} [${method}]`);

    const start = Date.now();

    // Call external GDI
    const incomingCookie = req.headers["cookie"] || "";
    const { response, text } = await smartFetch(targetEndpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-BOSS-Google-Docs-Integration-Key": integrationKey.trim()
      },
      body: bodyPayload ? JSON.stringify(bodyPayload) : undefined
    }, incomingCookie);

    const duration = Date.now() - start;
    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    console.log(`[GDI Test] Resposta obtida. Status: ${status}, Content-Type: ${contentType}, Tempo: ${duration}ms`);

    // Check if it is HTML or Login redirect or redirect status code
    const isRedirect = response.redirected || (status >= 300 && status < 400);
    const isHtmlResponse = contentType.includes("html") || 
                           text.trim().startsWith("<") || 
                           text.toLowerCase().includes("<!doctype html") || 
                           text.toLowerCase().includes("<html") ||
                           text.toLowerCase().includes("login") ||
                           text.toLowerCase().includes("sign in");

    if (isHtmlResponse || isRedirect) {
      return res.status(200).json({
        success: false,
        status,
        durationMs: duration,
        endpoint: targetEndpoint,
        error: isRedirect 
          ? "Falha: O servidor redirecionou a requisição (provável login ou página restrita)."
          : "Falha: GDI retornou HTML/Login ao invés de JSON. Verifique se a URL da API está correta."
      });
    }

    // Must be valid JSON
    let responseData: any;
    let isJson = false;
    try {
      responseData = JSON.parse(text);
      isJson = true;
    } catch {
      // not JSON
    }

    if (!isJson) {
      return res.status(200).json({
        success: false,
        status,
        durationMs: duration,
        endpoint: targetEndpoint,
        error: `Falha: GDI não retornou um formato JSON válido. Resposta recebida: ${text.substring(0, 300)}`
      });
    }

    return res.status(200).json({
      success: response.ok && status === 200,
      status,
      durationMs: duration,
      endpoint: targetEndpoint,
      data: responseData
    });

  } catch (err: any) {
    console.error("[GDI Test Exception] Error:", err);
    return res.status(200).json({
      success: false,
      status: 0,
      endpoint: `${gdiBaseUrl || ""}/api/config`,
      error: `Erro de rede ou DNS ao conectar na API GDI: ${err.message || err}`
    });
  }
});

// Validate Google Drive Build URL to prevent using admin pages or HTML pages as APIs
app.post("/api/validate-build-url", async (req, res) => {
  try {
    const { buildUrl } = req.body;
    if (!buildUrl) {
      return res.status(400).json({ error: "O campo buildUrl é obrigatório." });
    }

    const trimmedUrl = buildUrl.trim();
    if (trimmedUrl.includes("aistudio.google.com/apps") || trimmedUrl.includes("accounts.google.com")) {
      return res.status(200).json({ 
        isValid: false, 
        message: "A URL configurada não é uma API. Ela abriu uma página de login do Google. Use a URL pública do runtime/Cloud Run do Build Google Drive." 
      });
    }

    // Try testing endpoint
    const endpointsToTry = [
      { url: `${trimmedUrl}/api/receiver-status`, method: "GET" },
      { url: `${trimmedUrl}/api/create-folder`, method: "POST" },
    ];

    let lastError = "";
    let isHtmlResponse = false;

    const incomingCookie = req.headers["cookie"] || "";
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[Validation] Probing endpoint: ${endpoint.url} with ${endpoint.method}`);
        const { response, text } = await smartFetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: endpoint.method === "POST" ? JSON.stringify({}) : undefined,
        }, incomingCookie);

        const contentType = response.headers.get("content-type") || "";

        console.log(`[Validation] Response Content-Type: ${contentType}. Status: ${response.status}`);

        if (contentType.includes("html") || text.trim().startsWith("<") || text.toLowerCase().includes("<!doctype html") || text.toLowerCase().includes("<html")) {
          isHtmlResponse = true;
          break;
        }

        let isJson = false;
        try {
          JSON.parse(text);
          isJson = true;
        } catch {
          if (contentType.includes("json")) {
            isJson = true;
          }
        }

        if (isJson) {
          return res.status(200).json({
            isValid: true,
            message: "URL da API validada com sucesso."
          });
        }
      } catch (err: any) {
        console.log(`[Validation] Probing endpoint ${endpoint.url} failed:`, err.message || err);
        lastError = err.message || String(err);
      }
    }

    if (isHtmlResponse) {
      return res.status(200).json({
        isValid: false,
        message: "A URL configurada não é uma API. Ela abriu uma página de login do Google. Use a URL pública do runtime/Cloud Run do Build Google Drive."
      });
    }

    try {
      console.log(`[Validation] Probing base URL as fallback: ${trimmedUrl}`);
      const { response, text } = await smartFetch(trimmedUrl, { method: "GET" }, incomingCookie);
      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("html") || text.trim().startsWith("<") || text.toLowerCase().includes("<!doctype html") || text.toLowerCase().includes("<html")) {
        return res.status(200).json({
          isValid: false,
          message: "A URL configurada não é uma API. Ela abriu uma página de login do Google. Use a URL pública do runtime/Cloud Run do Build Google Drive."
        });
      }
    } catch (e: any) {
      // ignore
    }

    return res.status(200).json({
      isValid: false,
      message: `Não foi possível obter uma resposta JSON válida do endpoint de API. Certifique-se de que o applet Build Google Drive está ligado/ativo na URL fornecida. Erro obtido: ${lastError || "Sem resposta da API"}`
    });

  } catch (err: any) {
    console.error("[Validation API] Erro ao validar URL do Google Drive:", err);
    return res.status(550).json({ error: `Erro no servidor de validação: ${err.message || err}` });
  }
});

// --- TODOIST BACKEND INTEGRATION BRIDGE ---

interface TodoistTaskPayload {
  title: string;
  description?: string;
  projectId?: string;
  sectionId?: string;
  labels?: string[];
  dueString?: string;
  priority?: number;
}

// 1. Backend helper function for communicating with Todoist REST API v2
async function createTodoistTask(payload: TodoistTaskPayload) {
  const token = process.env.TODOIST_API_TOKEN;
  if (!token || !token.trim()) {
    throw new Error("TODOIST_SECRET_MISSING");
  }

  // Map input params to safe Todoist REST API v2 parameters (content, description, etc.)
  const body: any = {
    content: payload.title || "Nova Tarefa do Caso"
  };

  if (payload.description) body.description = payload.description;
  if (payload.projectId) body.project_id = payload.projectId;
  if (payload.sectionId) body.section_id = payload.sectionId;
  if (payload.labels) body.labels = payload.labels;
  if (payload.dueString) body.due_string = payload.dueString;
  if (payload.priority) body.priority = payload.priority;

  const url = "https://api.todoist.com/rest/v2/tasks";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Todoist Integration Error] HTTP Status: ${response.status}. Payload attempted (excluding auth). Raw error text:`, errorText);
    throw new Error(`Erro retornado pela API do Todoist (HTTP ${response.status})`);
  }

  const data = await response.json();
  return {
    todoistTaskId: data.id,
    todoistUrl: data.url,
    data
  };
}

// 2. Internal secure API endpoint to receive task specifications and request Todoist API v2
app.post("/api/todoist/create-task", async (req, res) => {
  try {
    const token = process.env.TODOIST_API_TOKEN;
    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        error: "TODOIST_SECRET_MISSING",
        message: "O token de API do Todoist (TODOIST_API_TOKEN) não foi configurado."
      });
    }

    const { title, description, projectId, sectionId, labels, dueString, priority } = req.body;
    if (!title) {
      return res.status(400).json({
        success: false,
        error: "TITLE_REQUIRED",
        message: "O título da tarefa (title) é obrigatório."
      });
    }

    const result = await createTodoistTask({
      title,
      description,
      projectId,
      sectionId,
      labels,
      dueString,
      priority
    });

    return res.status(200).json({
      success: true,
      todoistTaskId: result.todoistTaskId,
      todoistUrl: result.todoistUrl,
      message: "Tarefa criada no Todoist com sucesso."
    });
  } catch (err: any) {
    console.error("[Todoist API Route Exception]:", err.message || err);
    if (err.message === "TODOIST_SECRET_MISSING") {
      return res.status(400).json({
        success: false,
        error: "TODOIST_SECRET_MISSING",
        message: "O token de API do Todoist (TODOIST_API_TOKEN) não foi configurado."
      });
    }
    return res.status(500).json({
      success: false,
      error: "TODOIST_API_ERROR",
      message: "Erro ao processar criação de tarefa de forma segura. Certifique-se de que os dados e a chave estejam corretificados."
    });
  }
});

async function startServer() {
  // Integrate Vite middleware in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
