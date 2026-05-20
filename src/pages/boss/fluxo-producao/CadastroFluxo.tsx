import React, { useState } from 'react';
import FluxoStepLayout from './components/FluxoStepLayout';
import { 
  UserPlus, 
  Briefcase, 
  Search, 
  ArrowRight, 
  HelpCircle, 
  Sparkles,
  Info
} from 'lucide-react';

type CadastroPath = 'novo-cliente' | 'novo-caso' | 'continuar';

export default function CadastroFluxo() {
  const [selectedPath, setSelectedPath] = useState<CadastroPath>('novo-cliente');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // Paths descriptions
  const paths = [
    {
      id: 'novo-cliente' as CadastroPath,
      label: 'Novo Cliente',
      desc: 'Primeiro cadastro do cliente.',
      icon: UserPlus
    },
    {
      id: 'novo-caso' as CadastroPath,
      label: 'Novo Caso',
      desc: 'Caso para cliente existente.',
      icon: Briefcase
    },
    {
      id: 'continuar' as CadastroPath,
      label: 'Continuar Fluxo',
      desc: 'Retomar de onde parou.',
      icon: Search
    }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Visual alert only
    setShowAlert(true);
  };

  const handleSaveAndAdvance = () => {
    setShowAlert(true);
  };

  return (
    <FluxoStepLayout stepName="Cadastro Geral" statusText="estrutura preparada">
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Qual é o caminho desejado?</h3>
          <p className="text-xs text-gray-500 mt-1">
            Selecione uma modalidade ativa para estruturar o fluxo de dados correspondente.
          </p>
        </div>

        {/* Path Chooser Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paths.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPath === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPath(p.id);
                  setShowAlert(false);
                }}
                className={`flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-gray-950 text-white border-transparent shadow-md' 
                    : 'bg-white text-gray-700 border-gray-150 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-50 text-gray-500'
                }`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-tight">{p.label}</h4>
                  <p className={`text-[11px] leading-relaxed mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                    {p.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Mecanismo de Busca Preliminar</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
              O sistema permite a indexação rápida para evitar duplicidade estrutural de CPFs/CNPJs na base corporativa.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por CPF, CNPJ, nome, e-mail, telefone, WhatsApp, slug ou número do processo..."
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-250 rounded-xl focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all font-medium text-xs text-gray-800"
              />
            </div>
            <div className="text-[10px] font-medium text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
              <span className="bg-gray-150 px-2 py-0.5 rounded">Filtros Ativos:</span>
              <span>• CPF / CNPJ</span>
              <span>• Nome</span>
              <span>• E-mail / Celular</span>
              <span>• Slug</span>
              <span>• Nº Processo</span>
            </div>
          </form>
        </div>

        {/* PLACEHOLDER NOTIFICATION */}
        {showAlert && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3 text-blue-900 animate-fadeIn">
            <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-black uppercase tracking-wider font-sans">Aviso de Arquitetura (Build 1)</h5>
              <p className="text-xs font-medium leading-relaxed">
                A criação real e persistência do <strong>caseId</strong>, validação de duplicidade fática de CPF/CNPJ, geração automática de slug e indexação no banco de dados serão implementados no <strong>Build 2</strong>.
              </p>
            </div>
          </div>
        )}

        {/* NAVIGATION BOTTOM BAR */}
        <div className="flex sm:justify-end border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={handleSaveAndAdvance}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <span>Salvar e Avançar</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </FluxoStepLayout>
  );
}
