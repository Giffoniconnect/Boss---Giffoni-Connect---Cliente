import React from 'react';
import { formatCPF } from '../../../../lib/masks';

interface BankingFormProps {
  data: any;
  onChange: (data: any) => void;
  clientName: string;
}

const PIX_TYPES = ['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Aleatória'];
const ACCOUNT_TYPES = ['Corrente', 'Poupança', 'Pagamento'];

const BANKS_SUGGESTIONS = [
  'Banco do Brasil',
  'Caixa Econômica Federal',
  'Itaú',
  'Bradesco',
  'Santander',
  'Nubank',
  'Inter',
  'Sicoob',
  'Sicredi',
  'C6 Bank',
  'Banco Pan',
  'Mercado Pago',
  'PagBank',
  'BTG Pactual',
  'Banco Original'
];

export const BankingForm: React.FC<BankingFormProps> = ({ data, onChange, clientName }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    let newValue = val;

    if (name === 'bancario_chavePix' && data.bancario_tipoChavePix === 'CPF') {
      newValue = formatCPF(String(val));
    }

    if (name === 'bancario_titularEhCliente' && val) {
      onChange({ 
        ...data, 
        [name]: val,
        bancario_titularConta: clientName || data.pf_nomeCompleto || data.pj_razaoSocial || ''
      });
    } else {
      onChange({ ...data, [name]: newValue });
    }
  };

  // Sync holder name when "titularEhCliente" is checked
  React.useEffect(() => {
    if (data.bancario_titularEhCliente) {
      const parentName = clientName || data.pf_nomeCompleto || data.pj_razaoSocial || '';
      if (data.bancario_titularConta !== parentName) {
        onChange({ ...data, bancario_titularConta: parentName });
      }
    }
  }, [data.bancario_titularEhCliente, clientName, data.pf_nomeCompleto, data.pj_razaoSocial]);

  // Sync CPF with PIX key when checked
  React.useEffect(() => {
    if (data.bancario_tipoChavePix === 'CPF' && data.bancario_usarCpfComoPix) {
      const clientCpf = data.pf_cpf || '';
      if (data.bancario_chavePix !== clientCpf) {
        onChange({ ...data, bancario_chavePix: clientCpf });
      }
    }
  }, [data.bancario_tipoChavePix, data.bancario_usarCpfComoPix, data.pf_cpf]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[18px] font-bold text-gray-900 uppercase tracking-wider">BLOCO dados Bancários Opcional</h3>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input 
            type="checkbox"
            name="bancario_possuiDadosBancarios"
            checked={data.bancario_possuiDadosBancarios || false}
            onChange={handleChange}
            className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="text-sm font-bold text-gray-800">Possui dados bancários?</span>
        </label>
      </div>

      {data.bancario_possuiDadosBancarios && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 mb-2">
            <div>
              <Select 
                label="Tipo Chave PIX" 
                name="bancario_tipoChavePix" 
                value={data.bancario_tipoChavePix || ''} 
                onChange={(e) => {
                  const val = e.target.value;
                  // Reset checkbox if not CPF
                  onChange({
                    ...data,
                    bancario_tipoChavePix: val,
                    bancario_usarCpfComoPix: val === 'CPF' ? data.bancario_usarCpfComoPix : false
                  });
                }} 
                options={PIX_TYPES} 
              />
              
              {data.bancario_tipoChavePix === 'CPF' && (
                <label className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-600 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    name="bancario_usarCpfComoPix"
                    checked={data.bancario_usarCpfComoPix || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChange({
                        ...data,
                        bancario_usarCpfComoPix: checked,
                        bancario_chavePix: checked ? (data.pf_cpf || '') : data.bancario_chavePix
                      });
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Usar CPF do cliente como chave PIX?</span>
                </label>
              )}
            </div>

            <div className="md:col-span-2">
              <Input 
                label="Chave PIX" 
                name="bancario_chavePix" 
                value={data.bancario_chavePix || ''} 
                onChange={handleChange} 
                disabled={data.bancario_tipoChavePix === 'CPF' && data.bancario_usarCpfComoPix}
                placeholder="Insira a chave PIX"
              />
            </div>
            
            <div>
              <AutocompleteBankInput 
                label="Qual Banco pertence esta chave pix?" 
                name="bancario_bancoPix" 
                value={data.bancario_bancoPix || ''} 
                onChange={handleChange} 
                placeholder="Ex: Nubank, Inter..."
              />
            </div>
            
            <div className="md:col-span-2">
              <Input 
                label="Quem é o titular da conta Pix?" 
                name="bancario_titularPix" 
                value={data.bancario_titularPix || ''} 
                onChange={handleChange} 
                placeholder="Nome completo do titular"
              />
            </div>
          </div>

          <AutocompleteBankInput 
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
              <label className="block text-[15px] font-bold text-gray-500">Titular da Conta</label>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-600 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  name="bancario_titularEhCliente"
                  checked={data.bancario_titularEhCliente || false} 
                  onChange={handleChange}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
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
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300 disabled:opacity-60 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, ...props }: any) => (
  <div>
    <label className="block text-[15px] font-bold text-gray-500 mb-1 ml-1">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300 text-sm"
    />
  </div>
);

const AutocompleteBankInput = ({ label, value, onChange, name, placeholder }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = BANKS_SUGGESTIONS.filter(bank =>
    bank.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[15px] font-bold text-gray-500 mb-1 ml-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value || ''}
        placeholder={placeholder}
        onChange={onChange}
        onFocus={() => setIsOpen(true)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300 text-sm"
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
          {filtered.map(bank => (
            <button
              key={bank}
              type="button"
              onClick={() => {
                onChange({ target: { name, id: name, value: bank } as any });
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-sm text-gray-700 font-semibold transition-colors cursor-pointer"
            >
              {bank}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Select = ({ label, options, ...props }: any) => (
  <div>
    <label className="block text-[15px] font-bold text-gray-500 mb-1 ml-1">{label}</label>
    <select
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all text-sm"
    >
      <option value="">Selecione...</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);
