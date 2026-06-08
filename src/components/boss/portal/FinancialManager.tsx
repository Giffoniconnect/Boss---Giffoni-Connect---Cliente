import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  Coins, 
  TrendingUp, 
  Wallet 
} from 'lucide-react';

interface FinancialManagerProps {
  clientCases: any[];
  allClientFinancials: any[];
  addingFinancial: boolean;
  newChargeType: string;
  setNewChargeType: (t: string) => void;
  newAmount: string;
  setNewAmount: (a: string) => void;
  newPaymentMethod: string;
  setNewPaymentMethod: (m: string) => void;
  newInstallments: number;
  setNewInstallments: (i: number) => void;
  newDueDate: string;
  setNewDueDate: (d: string) => void;
  newFinancialStatus: string;
  setNewFinancialStatus: (s: string) => void;
  newPublicMessage: string;
  setNewPublicMessage: (msg: string) => void;
  handleCreateFinancial: (e: React.FormEvent) => Promise<void>;
  handleMarkFinancialPaid: (fin: any) => Promise<void>;
  handleDeleteFinancial: (id: string) => Promise<void>;
}

export const FinancialManager: React.FC<FinancialManagerProps> = ({
  clientCases,
  allClientFinancials,
  addingFinancial,
  newChargeType,
  setNewChargeType,
  newAmount,
  setNewAmount,
  newPaymentMethod,
  setNewPaymentMethod,
  newInstallments,
  setNewInstallments,
  newDueDate,
  setNewDueDate,
  newFinancialStatus,
  setNewFinancialStatus,
  newPublicMessage,
  setNewPublicMessage,
  handleCreateFinancial,
  handleMarkFinancialPaid,
  handleDeleteFinancial
}) => {
  const [showForm, setShowForm] = useState(false);

  // Consolidated Math
  const totalBilled = allClientFinancials.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalPaid = allClientFinancials.filter(f => f.financialStatus === 'pago').reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalOverdue = allClientFinancials.filter(f => f.financialStatus === 'vencido').reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalPending = allClientFinancials.filter(f => f.financialStatus === 'pendente').reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getChargeTypeLabel = (type: string) => {
    switch(type) {
      case 'honorarios_iniciais': return 'Honorários Iniciais';
      case 'honorarios_mensais': return 'Honorários Mensais (Ad Êxito)';
      case 'taxa_administrativa': return 'Taxa Administrativa';
      case 'custas_recursais': return 'Custas Recursais fáticas';
      default: return 'Faturamento / Cobrança';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateFinancial(e);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header and Toggle Button */}
      <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] gap-4">
        <div>
          <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block">FATURAMENTO E INTEGRAÇÃO DE MEIOS</span>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight mt-0.5 font-sans">Financeiro e Faturamento do Cliente</h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">Visão geral do faturamento dos contratos, parcelas liquidadas e lançamentos.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition font-mono self-start sm:self-center shrink-0 cursor-pointer"
        >
          {showForm ? 'Fechar Lançamento' : 'Lançar Nova Cobrança'}
        </button>
      </div>

      {/* Math Banner Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-150 p-4.5 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-650 rounded-2xl">
            <Coins size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block">Total Baturado</span>
            <span className="text-sm font-black text-slate-900 font-mono block">{formatBRL(totalBilled)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4.5 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-650 rounded-2xl">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block">Total Liquidado</span>
            <span className="text-sm font-black text-emerald-700 font-mono block">{formatBRL(totalPaid)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4.5 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-650 rounded-2xl">
            <Wallet size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block">Total Inadimplente</span>
            <span className="text-sm font-black text-rose-700 font-mono block">{formatBRL(totalOverdue || (totalBilled - totalPaid * 0))}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4.5 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-650 rounded-2xl">
            <CreditCard size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block">Total Futuro / Pendente</span>
            <span className="text-sm font-black text-amber-700 font-mono block">{formatBRL(totalPending)}</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6 animate-fade-in">
          <div className="border-b border-gray-100 pb-3 text-left">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">Gerador de Faturamento Consolidado</h4>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Classificação do Lançamento</label>
                <select
                  value={newChargeType}
                  onChange={(e) => setNewChargeType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                >
                  <option value="honorarios_iniciais">Honorários Iniciais</option>
                  <option value="honorarios_mensais">Honorários Mensais (Ad Êxito)</option>
                  <option value="taxa_administrativa">Taxa Administrativa</option>
                  <option value="custas_recursais">Custas Recursais fáticas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Valor Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Vencimento da Parcela</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5 font-sans">Forma de Pagamento Preferencial</label>
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                >
                  <option value="boleto">Boleto Bancário</option>
                  <option value="pix">PIX Integrado fático</option>
                  <option value="cartao">Cartão de Crédito</option>
                  <option value="transferência">TED / DOC</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5 font-sans">Status Inicial da Cobrança</label>
                <select
                  value={newFinancialStatus}
                  onChange={(e) => setNewFinancialStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                >
                  <option value="pendente">Pendente / Em Aberto</option>
                  <option value="pago">Pago / Integrado Liquido</option>
                  <option value="vencido">Vencido / Em Atraso</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Quantidade de Parcelas</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newInstallments}
                  onChange={(e) => setNewInstallments(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Aviso e instrução pública para o boleto (Visível ao cliente)</label>
              <textarea
                placeholder="Ex: Pedimos que faça o pagamento até a data do vencimento. Caso necessite de segunda via ou parcelamento nos contatar imediatamente."
                value={newPublicMessage}
                onChange={(e) => setNewPublicMessage(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={addingFinancial}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition font-mono cursor-pointer"
            >
              {addingFinancial ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              Lançar Faturamento Consolidado
            </button>
          </form>
        </div>
      )}

      {/* Billings Table */}
      <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {allClientFinancials.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Coins size={32} className="mx-auto text-gray-300 mb-2.5" />
            <p className="text-xs font-black uppercase font-mono tracking-wider text-gray-850">Não há cobranças emitidas</p>
            <p className="text-xs mt-1">Esse cliente ainda não possui faturamentos cadastrados no sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-4 pl-6">Lançamento / Método</th>
                  <th className="p-4">Valor Total</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Parcelas</th>
                  <th className="p-4">Situação</th>
                  <th className="p-4 pr-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-750">
                {allClientFinancials.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 pl-6">
                        <div className="font-extrabold text-gray-950 text-xs">{getChargeTypeLabel(item.chargeType)}</div>
                        <div className="text-[10px] font-mono text-gray-400 uppercase block mt-0.5">{item.paymentMethod || 'Não selecionado'}</div>
                      </td>
                      <td className="p-4 font-mono font-black text-gray-900">{formatBRL(item.totalAmount)}</td>
                      <td className="p-4 font-mono">{item.firstDueDate || '—'}</td>
                      <td className="p-4 font-mono text-center sm:text-left">{item.installments || 1}x</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-[10px] font-extrabold uppercase font-mono ${
                          item.financialStatus === 'pago' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                          item.financialStatus === 'vencido' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          {item.financialStatus === 'pago' ? '🟢 PAGO' : item.financialStatus === 'vencido' ? '⚠️ VENCIDO' : '🟡 PENDENTE'}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.financialStatus !== 'pago' && (
                            <button
                              onClick={() => handleMarkFinancialPaid(item)}
                              className="p-1 px-2 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1"
                              title="Liquidar Pagamento"
                            >
                              <Check size={12} />
                              <span>Liquidar</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFinancial(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-100 rounded-lg transition"
                            title="Remover Faturamento"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
