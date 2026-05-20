import React from 'react';
import { BossLayout } from '../../../../components/Layout';
import FluxoSidebar from './FluxoSidebar';
import FluxoStatusBadge from './FluxoStatusBadge';

interface FluxoStepLayoutProps {
  children: React.ReactNode;
  stepName: string;
  caseId?: string;
  statusText?: string;
}

export default function FluxoStepLayout({
  children,
  stepName,
  caseId,
  statusText = 'estrutura preparada'
}: FluxoStepLayoutProps) {
  return (
    <BossLayout>
      <div className="flex flex-col gap-6">
        {/* Dynamic header inside step */}
        <div className="bg-white rounded-[2rem] border border-gray-150 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{stepName}</h2>
              <FluxoStatusBadge status={statusText} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Fluxo de Produção • Processo de formalização fática e estruturação técnica.
            </p>
          </div>

          {caseId ? (
            <div className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col text-right">
              <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-gray-400">ID do Caso</span>
              <span className="text-xs font-mono font-bold text-gray-700 mt-0.5">{caseId}</span>
            </div>
          ) : (
            <div className="px-4 py-2.5 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex flex-col md:text-right">
              <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-blue-500">Fluxo Inicial</span>
              <span className="text-xs font-semibold text-blue-700 mt-0.5">Fase de Cadastro Preliminar</span>
            </div>
          )}
        </div>

        {/* Layout with Sidebar + Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <FluxoSidebar caseId={caseId} />
          
          <div className="flex-1 w-full min-w-0 bg-white border border-gray-150 rounded-[2rem] p-8 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </BossLayout>
  );
}
