import React from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../lib/firebase';
import { BossLayout } from '../../components/Layout';
import { ChevronLeft, Save, Briefcase, User, Info, Scale } from 'lucide-react';

export default function BossNewCase() {
  const navigate = useNavigate();
  const { clientId: routeClientId } = useParams();
  const [searchParams] = useSearchParams();
  const initialClientId = routeClientId || searchParams.get('clientId') || '';
  
  const [loading, setLoading] = React.useState(false);
  const [clients, setClients] = React.useState<any[]>([]);

  const [formData, setFormData] = React.useState({
    clientId: initialClientId,
    title: '',
    adverseParty: '',
    caseType: '',
    actionCategory: 'judicial',
    processNumber: '',
    court: '',
    district: '',
    tribunal: '',
    responsibleLawyer: '',
    status: 'ativo',
    priority: 'media',
    description: '',
    visibleToClient: true,
  });

  const applyCNJMask = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 20);
    let masked = '';
    if (digits.length > 0) masked += digits.slice(0, 7);
    if (digits.length > 7) masked += '-' + digits.slice(7, 9);
    if (digits.length > 9) masked += '.' + digits.slice(9, 13);
    if (digits.length > 13) masked += '.' + digits.slice(13, 14);
    if (digits.length > 14) masked += '.' + digits.slice(14, 16);
    if (digits.length > 16) masked += '.' + digits.slice(16, 20);
    return masked;
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setFormData(prev => ({
      ...prev,
      clientId,
      title: client ? client.name.toUpperCase() : prev.title
    }));
  };

  React.useEffect(() => {
    async function fetchClients() {
      try {
        const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const mappedClients = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          slug: doc.data().slug,
          name: doc.data().type === 'PF' ? doc.data().pfData?.pf_nomeCompleto : doc.data().pjData?.pj_razaoSocial 
        }));
        setClients(mappedClients);
      } catch (error) {
        console.error('Error fetching clients:', error);
        if (error && (error as any).code === 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'clients');
        }
      }
    }
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }
    
    if (!formData.title) {
      alert('Por favor, defina um título para o caso.');
      return;
    }

    const selectedClient = clients.find(c => c.id === formData.clientId);

    setLoading(true);
    const currentPath = 'cases';
    try {
      const docRef = await addDoc(collection(db, currentPath), {
        ...formData,
        clientSlug: selectedClient?.slug || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUpdate: 'Caso iniciado.'
      });
      
      // Navigate directly to the new case detail
      if (routeClientId) {
        navigate(`/boss-giffoni-clientes/clientes/${routeClientId}/casos/${docRef.id}`);
      } else {
        navigate(`/boss-giffoni-clientes/casos/${docRef.id}`);
      }
    } catch (error) {
      console.error('Error creating case:', error);
      alert('Erro ao criar caso. Por favor, tente novamente.');
      if (error && (error as any).code === 'permission-denied') {
        handleFirestoreError(error, OperationType.WRITE, currentPath);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (routeClientId) {
      navigate(`/boss-giffoni-clientes/clientes/${routeClientId}/casos`);
    } else {
      navigate('/boss-giffoni-clientes/casos');
    }
  };

  const inputClasses = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all outline-none text-gray-900";
  const labelClasses = "block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider";

  return (
    <BossLayout>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para {routeClientId ? 'lista do cliente' : 'lista global'}
        </button>

        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
            <Briefcase size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Novo Caso Jurídico</h1>
            <p className="text-gray-500">Preencha as informações centrais do processo.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <User className="text-blue-600" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Vincular Cliente</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className={labelClasses}>Selecione o Cliente</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Info className="text-blue-600" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Dados do Caso</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClasses}>
                  Título amigável para {clients.find(c => c.id === formData.clientId)?.name || 'o Cliente'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value.toUpperCase() })}
                  className={inputClasses}
                  placeholder="Ex: MINHA AÇÃO TRABALHISTA - GIFFONI"
                />
              </div>

              <div>
                <label className={labelClasses}>Nome da Parte Adversa</label>
                <input
                  type="text"
                  required
                  value={formData.adverseParty}
                  onChange={(e) => setFormData({ ...formData, adverseParty: e.target.value })}
                  className={inputClasses}
                  placeholder="Ex: Empresa X, Banco Y..."
                />
              </div>

              <div>
                <label className={labelClasses}>Tipo do Caso</label>
                <input
                  type="text"
                  required
                  value={formData.caseType}
                  onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                  className={inputClasses}
                  placeholder="Ex: Indenizatória, Divórcio..."
                />
              </div>

              <div>
                <label className={labelClasses}>Categoria da Ação</label>
                <select
                  value={formData.actionCategory}
                  onChange={(e) => setFormData({ ...formData, actionCategory: e.target.value, processNumber: e.target.value !== 'judicial' ? '' : formData.processNumber })}
                  className={inputClasses}
                >
                  <option value="judicial">Judicial</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="extrajudicial">Extrajudicial</option>
                </select>
              </div>

              {formData.actionCategory === 'judicial' && (
                <div>
                  <label className={labelClasses}>Número do Processo</label>
                  <input
                    type="text"
                    required
                    value={formData.processNumber}
                    onChange={(e) => setFormData({ ...formData, processNumber: applyCNJMask(e.target.value) })}
                    className={inputClasses}
                    placeholder="0000000-00.0000.0.00.0000"
                  />
                </div>
              )}

              <div>
                <label className={labelClasses}>Prioridade</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={inputClasses}
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className={labelClasses}>Advogado Responsável</label>
                <input
                  type="text"
                  value={formData.responsibleLawyer}
                  onChange={(e) => setFormData({ ...formData, responsibleLawyer: e.target.value })}
                  className={inputClasses}
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <input
                  type="checkbox"
                  id="visibleToClient"
                  checked={formData.visibleToClient}
                  onChange={(e) => setFormData({ ...formData, visibleToClient: e.target.checked })}
                  className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="visibleToClient" className="text-sm font-bold text-blue-700 cursor-pointer">
                  Visível para o Cliente no Portal?
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Scale className="text-blue-600" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Detalhes Jurídicos</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClasses}>Tribunal</label>
                <input
                  type="text"
                  value={formData.tribunal}
                  onChange={(e) => setFormData({ ...formData, tribunal: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Vara</label>
                <input
                  type="text"
                  value={formData.court}
                  onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Comarca</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div className="md:col-span-3">
                <label className={labelClasses}>Descrição Resumida</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/boss-giffoni-clientes/casos')}
              className="px-8 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Salvando...' : 'Criar Caso'}
            </button>
          </div>
        </form>
      </div>
    </BossLayout>
  );
}
