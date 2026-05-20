import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Sliders, Building2, Settings, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Fluxo de Produção',
      description: 'Gerencie o andamento dos casos jurídicos em progresso.',
      path: '/boss-giffoni-clientes/fluxo-producao',
      icon: ListChecks,
      color: 'blue',
    },
    {
      title: 'Central de Controle',
      description: 'Acompanhe métricas, convites e controle geral do sistema.',
      path: '/boss-giffoni-clientes/central-controle',
      icon: Sliders,
      color: 'emerald',
    },
    {
      title: 'Setores do Escritório',
      description: 'Estruturação dos departamentos e atribuição de setores.',
      path: '/boss-giffoni-clientes/setores',
      icon: Building2,
      color: 'purple',
    },
    {
      title: 'Configurações',
      description: 'Ajustes gerais de sistema, perfis e parâmetros.',
      path: '/boss-giffoni-clientes/configuracoes',
      icon: Settings,
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in" id="boss-dashboard">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Principal</h1>
        <p className="text-gray-500 mt-2">Visão geral do escritório em preparação.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.path}
              id={`dashboard-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer"
              onClick={() => navigate(card.path)}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl bg-${card.color}-50 text-${card.color}-600`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">{card.title}</h3>
              <p className="text-sm text-gray-500 mt-2">{card.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
