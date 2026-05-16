import React from 'react';

interface AccessFormProps {
  data: any;
  onChange: (data: any) => void;
}

export const AccessForm: React.FC<AccessFormProps> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const passwordsMatch = data.acesso_senha && data.acesso_senha === data.acesso_confirmarSenha;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">BLOCO acessoSistema</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          label="E-mail de Login" 
          name="acesso_emailLogin" 
          type="email"
          value={data.acesso_emailLogin || ''} 
          onChange={handleChange} 
          required 
          placeholder="ex: cliente@email.com"
        />
        
        <Select 
          label="Status de Acesso" 
          name="acesso_statusAcesso" 
          value={data.acesso_statusAcesso || 'pendente'} 
          onChange={handleChange} 
          options={['ativo', 'suspenso', 'pendente']} 
        />

        <div>
          <Input 
            label="Senha de Acesso" 
            name="acesso_senha" 
            type="password"
            value={data.acesso_senha || ''} 
            onChange={handleChange} 
            required 
          />
          <p className="mt-1 text-[10px] text-gray-400">Mínimo 6 caracteres.</p>
        </div>

        <div>
          <Input 
            label="Confirmar Senha" 
            name="acesso_confirmarSenha" 
            type="password"
            value={data.acesso_confirmarSenha || ''} 
            onChange={handleChange} 
            required 
          />
          {data.acesso_confirmarSenha && (
            <p className={`mt-1 text-[10px] font-bold ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'}`}>
              {passwordsMatch ? 'Senhas coincidem' : 'Senhas não coincidem'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }: any) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-100 focus:bg-white outline-none transition-all placeholder:text-gray-300"
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">{label}</label>
    <select
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-100 focus:bg-white outline-none transition-all"
    >
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
      ))}
    </select>
  </div>
);
