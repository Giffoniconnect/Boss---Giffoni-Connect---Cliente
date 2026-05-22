import React from 'react';
import { formatCPF, formatCEP, formatPhone, fetchCEP } from '../../../../lib/masks';

const ESTADOS_CIVIS = [
  '',
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
  'Separado(a) Judicialmente'
];

const PROFISSOES_SUGESTOES = [
  'Advogado(a)',
  'Médico(a)',
  'Engenheiro(a)',
  'Professor(a)',
  'Contador(a)',
  'Empresário(a)',
  'Vendedor(a)',
  'Administrador(a)',
  'Analista de Sistemas',
  'Autônomo(a)',
  'Aposentado(a)',
  'Estudante',
  'Dona de casa',
  'Arquiteto(a)',
  'Psicólogo(a)',
  'Motorista',
  'Cozinheiro(a)',
  'Militar',
  'Funcionário Público'
];

const NACIONALIDADES_SUGESTOES = [
  'Brasileira',
  'Portuguesa',
  'Americana',
  'Italiana',
  'Espanhola',
  'Alemã',
  'Francesa',
  'Argentina',
  'Chilena',
  'Uruguaia',
  'Paraguaia',
  'Mexicana',
  'Japonesa',
  'Chinesa'
];

interface PFFormProps {
  data: any;
  onChange: (data: any) => void;
}

export const PFForm: React.FC<PFFormProps> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'pf_nomeCompleto') {
      newValue = value.toUpperCase();
    } else if (name === 'pf_cpf') {
      newValue = formatCPF(value);
    } else if (name === 'pf_cep') {
      newValue = formatCEP(value);
    } else if (name === 'pf_telefone' || name === 'pf_whatsapp') {
      newValue = formatPhone(value);
    }

    onChange({ ...data, [name]: newValue });
  };

  const handleCEPBlur = async () => {
    if (data.pf_cep?.length === 9) {
      const address = await fetchCEP(data.pf_cep);
      if (address) {
        onChange({
          ...data,
          pf_endereco: address.street || address.logradouro || data.pf_endereco,
          pf_bairro: address.neighborhood || address.bairro || data.pf_bairro,
          pf_cidade: address.city || address.localidade || data.pf_cidade,
          pf_estado: address.state || address.uf || data.pf_estado
        });
      }
    }
  };

  const handleRGNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onChange({ ...data, pf_rg: 'RG novo' });
    } else if (data.pf_rg === 'RG novo') {
      onChange({ ...data, pf_rg: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[18px] font-bold text-blue-600 uppercase tracking-wider mb-6">BLOCO pfDadosPessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome Completo" name="pf_nomeCompleto" value={data.pf_nomeCompleto || ''} onChange={handleChange} className="uppercase" required />
          <AutocompleteInput 
            label="Nacionalidade" 
            name="pf_nacionalidade" 
            value={data.pf_nacionalidade || ''} 
            onChange={handleChange} 
            suggestions={NACIONALIDADES_SUGESTOES}
          />
          <div className="md:col-span-1">
            <Select label="Estado Civil" name="pf_estadoCivil" value={data.pf_estadoCivil || ''} onChange={handleChange} options={ESTADOS_CIVIS} />
          </div>
          <AutocompleteInput 
            label="Profissão" 
            name="pf_profissao" 
            value={data.pf_profissao || ''} 
            onChange={handleChange} 
            suggestions={PROFISSOES_SUGESTOES}
          />
          
          <Input label="CPF (com máscara)" name="pf_cpf" value={data.pf_cpf || ''} onChange={handleChange} placeholder="000.000.000-00" required />
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="block text-[15px] font-bold text-gray-500 ml-1">RG</label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={data.pf_rg === 'RG novo'} 
                  onChange={handleRGNew}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                RG novo
              </label>
            </div>
            <input
              name="pf_rg"
              value={data.pf_rg || ''}
              onChange={handleChange}
              disabled={data.pf_rg === 'RG novo'}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all placeholder:text-gray-300 disabled:opacity-60"
            />
          </div>

          <Input label="Data de Nascimento" name="pf_dataNascimento" type="date" value={data.pf_dataNascimento || ''} onChange={handleChange} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[18px] font-bold text-blue-600 uppercase tracking-wider mb-6">BLOCO pfContato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="E-mail" name="pf_email" type="email" value={data.pf_email || ''} onChange={handleChange} required />
          <Input label="Telefone" name="pf_telefone" value={data.pf_telefone || ''} onChange={handleChange} placeholder="(00) 9 0000-0000" />
          
          <div className="flex flex-col gap-1 md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[15px] font-bold text-gray-500 ml-1">WhatsApp</label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={data.pf_possuiWhatsapp || false} 
                  onChange={(e) => onChange({ ...data, pf_possuiWhatsapp: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Possui WhatsApp?
              </label>
            </div>
            {data.pf_possuiWhatsapp && (
              <input
                name="pf_whatsapp"
                value={data.pf_whatsapp || ''}
                onChange={handleChange}
                placeholder="(00) 9 0000-0000"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all placeholder:text-gray-300"
              />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[18px] font-bold text-blue-600 uppercase tracking-wider mb-6">BLOCO pfEndereco</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="CEP (Smart)" name="pf_cep" value={data.pf_cep || ''} onChange={handleChange} onBlur={handleCEPBlur} placeholder="00000-000" />
          <div className="md:col-span-2">
            <Input label="Endereço" name="pf_endereco" value={data.pf_endereco || ''} onChange={handleChange} />
          </div>
          <Input label="Número" name="pf_numero" value={data.pf_numero || ''} onChange={handleChange} />
          <Input label="Complemento" name="pf_complemento" value={data.pf_complemento || ''} onChange={handleChange} />
          <Input label="Bairro" name="pf_bairro" value={data.pf_bairro || ''} onChange={handleChange} />
          <Input label="Cidade" name="pf_cidade" value={data.pf_cidade || ''} onChange={handleChange} />
          <Input label="Estado" name="pf_estado" value={data.pf_estado || ''} onChange={handleChange} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[18px] font-bold text-blue-600 uppercase tracking-wider mb-6">BLOCO pfRedesSociais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Instagram" name="pf_instagram" value={data.pf_instagram || ''} onChange={handleChange} />
          <Input label="Facebook" name="pf_facebook" value={data.pf_facebook || ''} onChange={handleChange} />
          <Input label="TikTok" name="pf_tiktok" value={data.pf_tiktok || ''} onChange={handleChange} />
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }: any) => (
  <div>
    <label className="block text-[15px] font-bold text-gray-500 mb-1 ml-1">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all placeholder:text-gray-300"
    />
  </div>
);

const AutocompleteInput = ({ label, suggestions, value, onChange, name, ...props }: any) => {
  const [suggestion, setSuggestion] = React.useState('');

  React.useEffect(() => {
    if (!value) {
      setSuggestion('');
      return;
    }

    const match = suggestions.find((s: string) => 
      s.toLowerCase().startsWith(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
    );

    if (match) {
      setSuggestion(value + match.slice(value.length));
    } else {
      setSuggestion('');
    }
  }, [value, suggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      onChange({ target: { name, value: suggestion } });
      setSuggestion('');
    }
  };

  return (
    <div className="relative">
      <label className="block text-[15px] font-bold text-gray-500 mb-1 ml-1">{label}</label>
      <div className="relative">
        {suggestion && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none select-none px-0.5 py-px">
            {suggestion}
          </div>
        )}
        <input
          {...props}
          name={name}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all placeholder:text-gray-300 relative z-10 bg-transparent"
        />
      </div>
    </div>
  );
};

const Select = ({ label, options, ...props }: any) => (
  <div>
    <label className="block text-[15px] font-bold text-gray-500 mb-1 ml-1">{label}</label>
    <select
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all"
    >
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt || 'Selecione...'}</option>
      ))}
    </select>
  </div>
);
