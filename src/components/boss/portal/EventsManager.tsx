import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw 
} from 'lucide-react';

interface EventsManagerProps {
  type: 'audiencia' | 'pericia' | 'reuniao';
  title: string;
  description: string;
  allClientEvents: any[];
  clientCases: any[];
  addingEvent: boolean;
  newEventCaseId: string;
  setNewEventCaseId: (id: string) => void;
  newEventTitle: string;
  setNewEventTitle: (t: string) => void;
  newEventDate: string;
  setNewEventDate: (d: string) => void;
  newEventTime: string;
  setNewEventTime: (t: string) => void;
  newEventLocation: string;
  setNewEventLocation: (l: string) => void;
  newEventDesc: string;
  setNewEventDesc: (d: string) => void;
  newEventVisible: boolean;
  setNewEventVisible: (v: boolean) => void;
  handleCreateEvent: (type: 'audiencia' | 'pericia' | 'reuniao') => Promise<void>;
  handleUpdateEventStatus: (id: string, stat: string) => Promise<void>;
  handleToggleEventVisibility: (e: any) => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;
}

export const EventsManager: React.FC<EventsManagerProps> = ({
  type,
  title,
  description,
  allClientEvents,
  clientCases,
  addingEvent,
  newEventCaseId,
  setNewEventCaseId,
  newEventTitle,
  setNewEventTitle,
  newEventDate,
  setNewEventDate,
  newEventTime,
  setNewEventTime,
  newEventLocation,
  setNewEventLocation,
  newEventDesc,
  setNewEventDesc,
  newEventVisible,
  setNewEventVisible,
  handleCreateEvent,
  handleUpdateEventStatus,
  handleToggleEventVisibility,
  handleDeleteEvent
}) => {
  const [showForm, setShowForm] = useState(false);
  const eventsOfThisType = allClientEvents.filter(e => e.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateEvent(type);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header card with toggle form */}
      <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] gap-4">
        <div>
          <span className="text-[10px] font-mono font-black text-gray-400 raw-uppercase tracking-widest block uppercase">ORGANIZADOR DE AGENDA</span>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight mt-0.5">{title}</h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">{description}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition font-mono self-start sm:self-center shrink-0 cursor-pointer"
        >
          {showForm ? 'Fechar Cadastro' : `Agendar Nova ${type.charAt(0).toUpperCase() + type.slice(1)}`}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6 animate-fade-in">
          <div className="border-b border-gray-100 pb-3">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">Formulário de Agendamento</h4>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Caso / Processo Associado</label>
                <select
                  value={newEventCaseId || ''}
                  onChange={(e) => setNewEventCaseId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                >
                  <option value="">Selecione um caso...</option>
                  {clientCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.registrationType || 'Processo'} ({c.id.substring(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Título do Evento</label>
                <input
                  type="text"
                  placeholder={`Ex: ${type === 'audiencia' ? 'Audiência de Conciliação fática' : type === 'pericia' ? 'Perícia do INSS' : 'Reunião de Alinhamento'}`}
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Data</label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Horário</label>
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Local / Link do Encontro</label>
              <input
                type="text"
                placeholder="Ex: Google Meet, Fórum Central de Londrina - Sala 304, etc"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Notas / Orientações p/ Cliente</label>
              <textarea
                placeholder="Insira detalhes que aparecerão no portal, como documentos necessários que o cliente deve portar e orientações comportamentais."
                value={newEventDesc}
                onChange={(e) => setNewEventDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-3.5 border border-gray-150 rounded-2xl">
              <input
                id={`vis_${type}`}
                type="checkbox"
                checked={newEventVisible}
                onChange={(e) => setNewEventVisible(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <label htmlFor={`vis_${type}`} className="text-xs font-bold text-gray-700 cursor-pointer selection:bg-transparent select-none">
                Disponível no Portal do Cliente (o cliente recebe alerta ativo)
              </label>
            </div>

            <button
              type="submit"
              disabled={addingEvent}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition font-mono cursor-pointer"
            >
              {addingEvent ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              Salvar Evento na Agenda
            </button>
          </form>
        </div>
      )}

      {/* Events table */}
      <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {eventsOfThisType.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Calendar size={32} className="mx-auto text-gray-300 mb-2.5" />
            <p className="text-xs font-black uppercase font-mono tracking-wider text-gray-850">Nenhum registro agendado</p>
            <p className="text-xs mt-1">Nenhuma {type} foi adicionada na agenda deste cliente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-4 pl-6">Evento / Caso</th>
                  <th className="p-4">Data & Horário</th>
                  <th className="p-4">Origem / Local</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Visibilidade</th>
                  <th className="p-4 pr-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-750">
                {eventsOfThisType.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 pl-6">
                        <div className="font-extrabold text-gray-950 text-xs">{item.title}</div>
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">ID Caso: {item.caseId?.substring(0, 8)}...</div>
                      </td>
                      <td className="p-4 font-mono">
                        <div>{item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '—'}</div>
                        <div className="text-[9.5px] text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={11} /> {item.time || '—'}</div>
                      </td>
                      <td className="p-4">
                        <div className="truncate max-w-[150px]">{item.location || 'Sem Especificação'}</div>
                        <div className="text-[10px] text-gray-400 italic max-w-[150px] truncate">{item.description || 'Nenhum memo'}</div>
                      </td>
                      <td className="p-4">
                        <select
                          value={item.status || 'agendado'}
                          onChange={(e) => handleUpdateEventStatus(item.id, e.target.value)}
                          className={`px-3 py-1 border rounded-lg text-[10.1px] font-extrabold uppercase font-mono cursor-pointer ${
                            item.status === 'concluido' || item.status === 'realizado' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                            item.status === 'cancelado' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                            item.status === 'remarcado' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}
                        >
                          <option value="agendado">📅 Agendado</option>
                          <option value="realizado">✅ Realizado</option>
                          <option value="remarcado">🔄 Remarcado</option>
                          <option value="cancelado">❌ Cancelado</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleEventVisibility(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-bold uppercase transition ${
                            item.visibleToClient 
                              ? 'bg-emerald-50/50 border-emerald-150 text-emerald-700 hover:bg-emerald-50' 
                              : 'bg-gray-50 border-gray-150 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {item.visibleToClient ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{item.visibleToClient ? 'Público' : 'Privado'}</span>
                        </button>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleDeleteEvent(item.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-100 rounded-lg transition"
                          title="Remover Evento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
