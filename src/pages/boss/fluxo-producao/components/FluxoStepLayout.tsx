import React from 'react';
import { BossLayout } from '../../../../components/Layout';
import FluxoSidebar from './FluxoSidebar';

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
        {/* Fused Stepper + progress tracking in single horizontal tracker */}
        <FluxoSidebar caseId={caseId} />
        
        {/* Full-width container with generous padding for spacious typing */}
        <div className="w-full min-w-0 bg-white border border-gray-150 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
          {children}
        </div>
      </div>
    </BossLayout>
  );
}
