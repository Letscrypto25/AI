import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am connected to Crypto-bot-2. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('https://lets-trade-six.vercel.app/api/bot/settings-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.message, provider: data.provider }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Error: ' + (data.error || 'Unknown error') }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Failed to connect to Crypto-bot-2 backend.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                <span className="text-xs font-semibold opacity-70">
                  {msg.role === 'user' ? 'You' : (msg.provider || 'Helper Bot')}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
