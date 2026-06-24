'use client';
import { Suspense } from 'react';
import DashboardInner from './DashboardInner';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading... ✈️</div>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
