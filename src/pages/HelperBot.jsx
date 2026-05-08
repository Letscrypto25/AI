import React from 'react';
import ChatInterface from '@/components/helperbot/ChatInterface';

export default function HelperBot() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto h-[80vh] flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">Helper Bot</h1>
          <p className="text-slate-600">Connected to Crypto-bot-2 Backend</p>
        </div>
        
        <div className="flex-1 min-h-0">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
