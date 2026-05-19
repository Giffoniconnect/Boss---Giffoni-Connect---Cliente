import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BossLayout } from '../../components/Layout';
import { 
  ChevronLeft, Calendar, FileText, DollarSign, MessageSquare, 
  Plus, AlertCircle, Info, Scale, Beaker, Users, Clock, Send, CheckCircle2 
} from 'lucide-react';
import CaseEventsPanel from '../../modules/cases/components/CaseEventsPanel';
import CasePendingTasksPanel from '../../modules/cases/components/CasePendingTasksPanel';
import CaseExplanationsPanel from '../../modules/cases/components/CaseExplanationsPanel';
import CaseCommunicationsPanel from '../../modules/cases/components/CaseCommunicationsPanel';
import CaseFinancialsPanel from '../../modules/cases/components/CaseFinancialsPanel';
import CaseEDRPPanel from '../../modules/cases/components/CaseEDRPPanel';

export default function BossCaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = React.useState<any>(null);
  const [client, setClient] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function fetchData() {
      if (!caseId) return;
      try {
        const caseDoc = await getDoc(doc(db, 'cases', caseId));
        if (caseDoc.exists()) {
          const data = caseDoc.data();
          setCaseData({ id: caseDoc.id, ...data });
          
          // Fetch client
          const clientDoc = await getDoc(doc(db, 'clients', data.clientId));
          if (clientDoc.exists()) setClient(clientDoc.data());
        }
      } catch (error) {
        console.error('Error fetching case data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [caseId]);

  if (loading) return <BossLayout><div className="animate-pulse flex flex-col gap-8"><div className="h-20 bg-gray-100 rounded-2xl" /><div className="grid grid-cols-3 gap-8"><div className="h-64 bg-gray-100 rounded-2xl" /><div className="col-span-2 h-64 bg-gray-100 rounded-2xl" /></div></div></BossLayout>;
  if (!caseData) return <BossLayout><div>Caso não encontrado</div></BossLayout>;

  return (
    <BossLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (caseData?.clientId) {
                  navigate(`/boss-giffoni-clientes/clientes/${caseData.clientId}/casos`);
                } else {
                  navigate('/boss-giffoni-clientes/casos');
                }
              }}
              className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{caseData.title}</h1>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest rounded-full border border-blue-100">
                  {caseData.status}
                </span>
                <button
                  onClick={async () => {
                    const newValue = !caseData.visibleToClient;
                    await updateDoc(doc(db, 'cases', caseId!), { visibleToClient: newValue, updatedAt: serverTimestamp() });
                    setCaseData({ ...caseData, visibleToClient: newValue });
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    caseData.visibleToClient 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-red-50 text-red-600 border border-red-100'
                  }`}
                >
                  {caseData.visibleToClient ? 'Visível no Portal' : 'Oculto no Portal'}
                </button>
              </div>
              <p className="text-gray-500 font-medium">
                Cliente: <span className="text-gray-900">{client?.type === 'PF' ? client.pfData?.pf_nomeCompleto : client?.pjData?.pj_razaoSocial}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
             <button className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Editar Dados
              </button>
              <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                Ações Rápidas
              </button>
          </div>
        </div>

        {/* EDRP Operational Pipeline Panel */}
        <CaseEDRPPanel 
          caseId={caseId!} 
          caseData={caseData} 
          onUpdate={(updated) => setCaseData(updated)} 
        />

        {/* 3-Column Grid as Requested */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUNA ESQUERDA - 3/12 */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Dados do Caso */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info size={16} /> Dados Centrais
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Parte Adversa</label>
                  <p className="text-sm font-bold text-gray-900">{caseData.adverseParty || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Tipo/Ação</label>
                  <p className="text-sm font-bold text-gray-900">{caseData.caseType || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Categoria</label>
                  <p className="text-sm font-black text-blue-600 uppercase italic">{caseData.actionCategory || 'N/A'}</p>
                </div>
                {caseData.actionCategory === 'judicial' && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Processo</label>
                    <p className="text-sm font-mono font-bold text-gray-900">{caseData.processNumber || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Tribunal</label>
                  <p className="text-sm font-bold text-gray-900">{caseData.tribunal || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Advogado</label>
                  <p className="text-sm font-bold text-gray-900">{caseData.responsibleLawyer || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Agenda de Eventos */}
            <CaseEventsPanel 
              caseId={caseId!} 
              clientId={caseData.clientId} 
              isAdmin={true} 
            />
          </div>

          {/* COLUNA CENTRAL - 6/12 */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* Andamento e Comunicados (Modularized) */}
            <CaseCommunicationsPanel 
              caseId={caseId!} 
              clientId={caseData.clientId} 
              isAdmin={true} 
            />
            
            {/* Pendências do Cliente */}
            <CasePendingTasksPanel 
              caseId={caseId!} 
              clientId={caseData.clientId} 
              isAdmin={true} 
            />
          </div>

          {/* COLUNA DIREITA - 3/12 */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Giffoni Explica Admin */}
            <CaseExplanationsPanel 
              caseId={caseId!} 
              clientId={caseData.clientId} 
              isAdmin={true} 
            />

            {/* Financeiro do Caso (Modularized) */}
            <CaseFinancialsPanel 
              caseId={caseId!} 
              clientId={caseData.clientId} 
              isAdmin={true} 
            />
          </div>

        </div>
      </div>
    </BossLayout>
  );
}
