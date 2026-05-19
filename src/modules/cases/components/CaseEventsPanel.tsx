import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { Calendar, Clock, MapPin, Plus, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CaseEvent {
  id: string;
  caseId: string;
  clientId: string;
  type: 'audiencia' | 'pericia' | 'reuniao' | 'prazo' | 'compromisso' | 'revisao' | 'protocolo';
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  status: 'agendado' | 'realizado' | 'cancelado' | 'remarcado';
  visibleToClient: boolean;
  createdAt: any;
  updatedAt: any;
}

interface Props {
  caseId: string;
  clientId: string;
  isAdmin?: boolean;
}

export default function CaseEventsPanel({ caseId, clientId, isAdmin = false }: Props) {
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    type: 'audiencia',
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    status: 'agendado',
    visibleToClient: true
  });

  useEffect(() => {
    if (!caseId) return;

    const q = query(
      collection(db, 'caseEvents'),
      where('caseId', '==', caseId),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseEvent));
      // Filter for client if needed (though rules should handle it, double check logic)
      setEvents(isAdmin ? docs : docs.filter(ev => ev.visibleToClient));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'caseEvents');
      setLoading(false);
    });

    return unsubscribe;
  }, [caseId, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await addDoc(collection(db, 'caseEvents'), {
        ...formData,
        caseId,
        clientId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowForm(false);
      setFormData({
        type: 'audiencia',
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        status: 'agendado',
        visibleToClient: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'caseEvents');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVisibility = async (event: CaseEvent) => {
    try {
      await updateDoc(doc(db, 'caseEvents', event.id), {
        visibleToClient: !event.visibleToClient,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `caseEvents/${event.id}`);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm('Excluir este evento?')) return;
    try {
      await deleteDoc(doc(db, 'caseEvents', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `caseEvents/${id}`);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audiencia': return <div className="bg-red-50 text-red-600 p-2 rounded-lg"><Calendar size={18} /></div>;
      case 'pericia': return <div className="bg-purple-50 text-purple-600 p-2 rounded-lg"><CheckCircle2 size={18} /></div>;
      case 'reuniao': return <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Clock size={18} /></div>;
      default: return <div className="bg-gray-50 text-gray-600 p-2 rounded-lg"><Calendar size={18} /></div>;
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-gray-400" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Cronograma & Agendas</h3>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-blue-600 font-bold text-xs hover:underline"
          >
            {showForm ? 'Fechar' : 'Agendar Novo'}
            <Plus size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-100 bg-gray-50/30"
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="audiencia">Audiência</option>
                    <option value="pericia">Perícia</option>
                    <option value="reuniao">Reunião</option>
                    <option value="prazo">Prazo Processual</option>
                    <option value="compromisso">Compromisso</option>
                    <option value="revisao">Revisão</option>
                    <option value="protocolo">Protocolo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título</label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Audiência de Instrução"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data</label>
                  <input 
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Horário</label>
                  <input 
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Local/Link</label>
                <input 
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Sala Virtual / Fórum de Curitiba"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded text-blue-600"
                    checked={formData.visibleToClient}
                    onChange={e => setFormData({ ...formData, visibleToClient: e.target.checked })}
                  />
                  <span className="text-xs font-bold text-gray-600">Visível no Portal</span>
                </label>
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Compromisso'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="divide-y divide-gray-50">
        {events.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-xs italic">Nenhum evento agendado.</div>
        ) : (
          events.map(event => (
            <div key={event.id} className={`p-5 flex gap-4 group transition-colors hover:bg-gray-50/50 ${!event.visibleToClient && isAdmin ? 'opacity-60' : ''}`}>
              {getTypeIcon(event.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-gray-900 truncate text-sm">{event.title}</h4>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => toggleVisibility(event)}
                          className={`p-1.5 rounded-lg transition-all ${event.visibleToClient ? 'text-blue-600 hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-200'}`}
                          title={event.visibleToClient ? 'Visível para o cliente' : 'Oculto para o cliente'}
                        >
                          {event.visibleToClient ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button 
                          onClick={() => deleteEvent(event.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{new Date(event.date + 'T12:00:00').toLocaleDateString()}</span>
                  </div>
                  {event.time && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{event.time}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1 truncate max-w-[150px]">
                      <MapPin size={12} />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
