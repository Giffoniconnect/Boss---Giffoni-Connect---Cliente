import React from 'react';

interface BankingFormProps {
  data: any;
  onChange: (data: any) => void;
  clientName: string;
}

const PIX_TYPES = ['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Aleatória'];
const ACCOUNT_TYPES = ['Corrente', 'Poupança', 'Pagamento'];

export const BankingForm: React.FC<BankingFormProps> = ({ data, onChange, clientName }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    if (name === 'bancario_titularEhCliente' && val) {
      onChange({ 
        ...data, 
        [name]: val,
        bancario_titularConta: clientName
      });
    } else {
      onChange({ ...data, [name]: val });
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">BLOCO dadosBancariosOpcional</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox"
            name="bancario_possuiDadosBancarios"
            checked={data.bancario_possuiDadosBancarios || false}
            onChange={handleChange}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-[10px] font-black uppercase text-gray-400">Possui dados bancários?</span>
        </label>
      </div>

      {data.bancario_possuiDadosBancarios && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 mb-2">
            <Select 
              label="Tipo Chave PIX" 
              name="bancario_tipoChavePix" 
              value={data.bancario_tipoChavePix || ''} 
              onChange={handleChange} 
              options={PIX_TYPES} 
            />
            <div className="md:col-span-2">
              <Input 
                label="Chave PIX" 
                name="bancario_chavePix" 
                value={data.bancario_chavePix || ''} 
                onChange={handleChange} 
                placeholder="Insira a chave PIX"
              />
            </div>
          </div>

          <Input 
            label="Banco" 
            name="bancario_banco" 
            value={data.bancario_banco || ''} 
            onChange={handleChange} 
            placeholder="Ex: Nubank, Itaú..."
          />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Agência" name="bancario_agencia" value={data.bancario_agencia || ''} onChange={handleChange} />
            <Input label="Conta" name="bancario_conta" value={data.bancario_conta || ''} onChange={handleChange} />
          </div>

          <Select 
            label="Tipo de Conta" 
            name="bancario_tipoConta" 
            value={data.bancario_tipoConta || ''} 
            onChange={handleChange} 
            options={ACCOUNT_TYPES} 
          />

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
              <label className="block text-xs font-bold text-gray-500">Titular da Conta</label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="bancario_titularEhCliente"
                  checked={data.bancario_titularEhCliente || false} 
                  onChange={handleChange}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Mesmo que o cliente?
              </label>
            </div>
            <input
              name="bancario_titularConta"
              value={data.bancario_titularConta || ''}
              onChange={handleChange}
              disabled={data.bancario_titularEhCliente}
              placeholder="Nome do titular"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300 disabled:opacity-60"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, ...props }: any) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300"
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">{label}</label>
    <select
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all"
    >
      <option value="">Selecione...</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);
