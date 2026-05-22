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

interface SocioFormProps {
  data: any;
  onChange: (data: any) => void;
}

export const SocioForm: React.FC<SocioFormProps> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'socio_nomeCompleto') {
      newValue = value.toUpperCase();
    } else if (name === 'socio_cpf') {
      newValue = formatCPF(value);
    } else if (name === 'socio_cep') {
      newValue = formatCEP(value);
    } else if (name === 'socio_telefone' || name === 'socio_whatsapp') {
      newValue = formatPhone(value);
    }

    onChange({ ...data, [name]: newValue });
  };

  const handleCEPBlur = async () => {
    if (data.socio_cep?.length === 9) {
      const address = await fetchCEP(data.socio_cep);
      if (address) {
        onChange({
          ...data,
          socio_endereco: address.street || address.logradouro || data.socio_endereco,
          socio_bairro: address.neighborhood || address.bairro || data.socio_bairro,
          socio_cidade: address.city || address.localidade || data.socio_cidade,
          socio_estado: address.state || address.uf || data.socio_estado
        });
      }
    }
  };

  const handleRGNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onChange({ ...data, socio_rg: 'RG novo' });
    } else if (data.socio_rg === 'RG novo') {
      onChange({ ...data, socio_rg: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[18px] font-bold text-emerald-600 uppercase tracking-wider mb-6">BLOCO socioAdministradorDadosPessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome Completo" name="socio_nomeCompleto" value={data.socio_nomeCompleto || ''} onChange={handleChange} className="uppercase" required />
          <AutocompleteInput 
            label="Nacionalidade" 
            name="socio_nacionalidade" 
            value={data.socio_nacionalidade || ''} 
            onChange={handleChange} 
            suggestions={NACIONALIDADES_SUGESTOES}
          />
          
          <div className="md:col-span-1">
            <Select label="Estado Civil" name="socio_estadoCivil" value={data.socio_estadoCivil || ''} onChange={handleChange} options={ESTADOS_CIVIS} />
          </div>

          <AutocompleteInput 
            label="Profissão" 
            name="socio_profissao" 
            value={data.socio_profissao || ''} 
            onChange={handleChange} 
            suggestions={PROFISSOES_SUGESTOES}
          />

          <Input label="CPF (com máscara)" name="socio_cpf" value={data.socio_cpf || ''} onChange={handleChange} placeholder="000.000.000-00" required />
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="block text-[15px] font-bold text-gray-500 ml-1">RG</label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={data.socio_rg === 'RG novo'} 
                  onChange={handleRGNew}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                RG novo
              </label>
            </div>
            <input
              name="socio_rg"
              value={data.socio_rg || ''}
              onChange={handleChange}
              disabled={data.socio_rg === 'RG novo'}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300 disabled:opacity-60"
            />
          </div>

          <Input label="Data de Nascimento" name="socio_dataNascimento" type="date" value={data.socio_dataNascimento || ''} onChange={handleChange} />
          <Input label="Cargo" name="socio_cargo" value={data.socio_cargo || ''} onChange={handleChange} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[18px] font-bold text-emerald-600 uppercase tracking-wider mb-6">BLOCO socioAdministradorContato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="E-mail" name="socio_email" type="email" value={data.socio_email || ''} onChange={handleChange} />
          <Input label="Telefone" name="socio_telefone" value={data.socio_telefone || ''} onChange={handleChange} placeholder="(00) 9 0000-0000" />
          
          <div className="flex flex-col gap-1 md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[15px] font-bold text-gray-500 ml-1">WhatsApp</label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={data.socio_possuiWhatsapp || false} 
                  onChange={(e) => onChange({ ...data, socio_possuiWhatsapp: e.target.checked })}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Possui WhatsApp?
              </label>
            </div>
            {data.socio_possuiWhatsapp && (
              <input
                name="socio_whatsapp"
                value={data.socio_whatsapp || ''}
                onChange={handleChange}
                placeholder="(00) 9 0000-0000"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300"
              />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[18px] font-bold text-emerald-600 uppercase tracking-wider mb-6">BLOCO socioAdministradorEndereco</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="CEP (Smart)" name="socio_cep" value={data.socio_cep || ''} onChange={handleChange} onBlur={handleCEPBlur} placeholder="00000-000" />
          <div className="md:col-span-2">
            <Input label="Endereço" name="socio_endereco" value={data.socio_endereco || ''} onChange={handleChange} />
          </div>
          <Input label="Número" name="socio_numero" value={data.socio_numero || ''} onChange={handleChange} />
          <Input label="Complemento" name="socio_complemento" value={data.socio_complemento || ''} onChange={handleChange} />
          <Input label="Bairro" name="socio_bairro" value={data.socio_bairro || ''} onChange={handleChange} />
          <Input label="Cidade" name="socio_cidade" value={data.socio_cidade || ''} onChange={handleChange} />
          <Input label="Estado" name="socio_estado" value={data.socio_estado || ''} onChange={handleChange} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[18px] font-bold text-emerald-600 uppercase tracking-wider mb-6">BLOCO socioAdministradorRedesSociais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Instagram" name="socio_instagram" value={data.socio_instagram || ''} onChange={handleChange} />
          <Input label="Facebook" name="socio_facebook" value={data.socio_facebook || ''} onChange={handleChange} />
          <Input label="TikTok" name="socio_tiktok" value={data.socio_tiktok || ''} onChange={handleChange} />
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
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300"
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
          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-gray-300 relative z-10 bg-transparent"
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
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all"
    >
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt || 'Selecione...'}</option>
      ))}
    </select>
  </div>
);
