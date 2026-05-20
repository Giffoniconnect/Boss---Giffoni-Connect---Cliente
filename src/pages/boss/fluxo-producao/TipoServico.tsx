import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Info, 
  Scale, 
  FileText, 
  FileSignature, 
  FolderOpen, 
  AlertCircle,
  Loader2,
  CheckCircle,
  Briefcase
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface ServiceTypeItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<any>;
}

export default function TipoServico() {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const clientId = searchParams.get('clientId');
  const safeCaseId = caseId || '';

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [clientSlug, setClientSlug] = useState<string>('');

  const serviceTypes: ServiceTypeItem[] = [
    { 
      id: 'peticao_inicial', 
      label: 'Petição Inicial', 
      desc: 'Elaboração de peça inaugural para distribuição perante os tribunais.',
      icon: FileText 
    },
    { 
      id: 'requerimento_adm', 
      label: 'Requerimento Administrativo', 
      desc: 'Petição direta com trâmite fático perante autarquias e órgãos públicos.',
      icon: FileSignature 
    },
    { 
      id: 'extrajudicial', 
      label: 'Extrajudicial', 
      desc: 'Notificações formais, assessoria contratual e tratativas diplomáticas.',
      icon: Scale 
    },
    { 
      id: 'jud_andamento', 
      label: 'Processo Judicial em Andamento', 
      desc: 'Habilitação e condução ativa sob rito de distribuição fática em processos preexistentes.',
      icon: FolderOpen 
    },
    { 
      id: 'jud_ajuizado', 
      label: 'Processo Judicial Ajuizado', 
      desc: 'Peças contestatórias, recursos fáticos judiciais e patrocínio completo de defesa.',
      icon: Briefcase 
    }
  ];

  // Map actionCategory
  const mapActionCategory = (serviceId: string): string => {
    switch (serviceId) {
      case 'peticao_inicial':
        return 'judicial';
      case 'requerimento_adm':
        return 'administrativo';
      case 'extrajudicial':
        return 'extrajudicial';
      case 'jud_andamento':
        return 'judicial';
      case 'jud_ajuizado':
        return 'judicial';
      default:
        return 'judicial';
    }
  };

  // Map statusPublicoCliente
  const mapStatusPublicoCliente = (serviceId: string): string => {
    switch (serviceId) {
      case 'peticao_inicial':
        return 'Aguardando distribuição';
      case 'requerimento_adm':
        return 'Requerimento pendente';
      case 'extrajudicial':
        return 'Tratativa extrajudicial pendente';
      case 'jud_andamento':
        return 'Aguardando número do processo';
      case 'jud_ajuizado':
        return 'Aguardando número do processo';
      default:
        return 'Em análise';
    }
  };

  useEffect(() => {
    async function loadContext() {
      setError(null);
      setFetching(true);

      try {
        if (safeCaseId) {
          // Editing existing case
          const caseSnap = await getDoc(doc(db, 'cases', safeCaseId));
          if (caseSnap.exists()) {
            const data = caseSnap.data();
            const regType = data.registrationType || '';
            const match = serviceTypes.find(s => s.label === regType || s.id === regType);
            if (match) setSelectedService(match.id);

            // Fetch matched client label
            const cliSnap = await getDoc(doc(db, 'clients', data.clientId));
            if (cliSnap.exists()) {
              const cData = cliSnap.data();
              setClientSlug(cData.slug || '');
              setClientName(cData.type === 'PF' 
                ? (cData.pfDadosPessoais?.pf_nomeCompleto || cData.pfData?.pf_nomeCompleto || '')
                : (cData.pjDadosEmpresa?.pj_razaoSocial || cData.pjData?.pj_razaoSocial || '')
              );
            }
          } else {
            setError(`O caso ${safeCaseId} solicitado não foi encontrado no sistema.`);
          }
        } else if (clientId) {
          // Creating dynamic flow starting with clientId
          const cliSnap = await getDoc(doc(db, 'clients', clientId));
          if (cliSnap.exists()) {
            const cData = cliSnap.data();
            setClientSlug(cData.slug || '');
            setClientName(cData.type === 'PF' 
              ? (cData.pfDadosPessoais?.pf_nomeCompleto || cData.pfData?.pf_nomeCompleto || '')
              : (cData.pjDadosEmpresa?.pj_razaoSocial || cData.pjData?.pj_razaoSocial || '')
            );
          } else {
            setError(`O código de cliente [${clientId}] fornecido não pôde ser localizado.`);
          }
        } else {
          setError('Nenhum parâmetro identificador de caso ou de cliente foi fornecido.');
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erro de comunicação com o sistema de dados: ${err.message || err}`);
      } finally {
        setFetching(false);
      }
    }
    loadContext();
  }, [safeCaseId, clientId]);

  const handleSaveAndAdvance = async () => {
    if (!selectedService) {
      setError('Por favor, selecione uma das opções de classificação acima para continuar.');
      return;
    }

    const serviceItem = serviceTypes.find(s => s.id === selectedService);
    if (!serviceItem) return;

    setError(null);
    setLoading(true);

    try {
      const now = new Date().toISOString();
      const actionCat = mapActionCategory(selectedService);
      const publicStatus = mapStatusPublicoCliente(selectedService);
      
      if (safeCaseId) {
        // Mode 1: Edit existing case
        await updateDoc(doc(db, 'cases', safeCaseId), {
          registrationType: serviceItem.label,
          actionCategory: actionCat,
          statusPublicoCliente: publicStatus,
          updatedAt: now
        });
        
        navigate(`/boss-giffoni-clientes/fluxo-producao/${safeCaseId}/dados-caso`);
      } else if (clientId) {
        // Mode 2: Create brand new case draft
        const collectionRef = collection(db, 'cases');
        const caseRef = doc(collectionRef);
        const autoCaseId = caseRef.id;

        const payload = {
          clientId: clientId,
          clientSlug: clientSlug,
          registrationType: serviceItem.label,
          actionCategory: actionCat,
          title: "RASCUNHO DE PRODUÇÃO",
          status: "rascunho",
          statusInterno: "Em produção",
          statusPublicoCliente: publicStatus,
          visibleToClient: true,
          productionStatus: "em_producao",
          productionStage: "dados-caso",
          caseLifecycle: "edrp",
          createdAt: now,
          updatedAt: now
        };

        await setDoc(caseRef, payload);

        navigate(`/boss-giffoni-clientes/fluxo-producao/${autoCaseId}/dados-caso`);
      } else {
        setError('Impossível prosseguir sem um identificador fático ativo.');
      }
    } catch (err: any) {
      console.error(err);
      setError(`Houve um erro grave durante o salvamento do rascunho de caso: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FluxoStepLayout stepName="Tipo de Serviço" caseId={safeCaseId || undefined}>
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Categorização Técnica da Demanda</h3>
          {clientName && (
            <p className="text-[11px] text-indigo-600 font-bold font-mono tracking-wide mt-1 uppercase">
              Cliente Selecionado: {clientName} ({clientSlug})
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Selecione o tipo de rito fático desejado para estruturar o fluxo de dados deste caso.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {fetching ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-500" size={24} />
            <span className="text-xs font-bold font-mono">Pesquisando dados cadastrais...</span>
          </div>
        ) : (
          /* Custom Radio Grid list */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedService === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(type.id);
                    setError(null);
                  }}
                  className={`p-5 rounded-2xl border text-left flex gap-4 items-start transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50/50 border-blue-600 ring-1 ring-blue-600' 
                      : 'bg-white border-gray-150 hover:border-gray-250'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${
                    isSelected ? 'bg-blue-600 text-white border-transparent' : 'bg-gray-50 text-gray-500 border-gray-100'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs tracking-tight uppercase text-gray-900 font-sans">{type.label}</h4>
                    <p className="text-[10.5px] text-gray-400 leading-relaxed font-medium">{type.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* BOTTOM NAV BAR */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao/cadastro')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 px-6 py-3 rounded-xl font-bold transition-all text-xs hover:bg-gray-50 cursor-pointer"
            >
              <Save size={14} />
              Sair
            </button>
            <button
              type="button"
              disabled={loading || fetching}
              onClick={handleSaveAndAdvance}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Gerando Caso...</span>
                </>
              ) : (
                <>
                  <span>Salvar e Avançar</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </FluxoStepLayout>
  );
}
