import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, User, Bot } from 'lucide-react';
import { chatWithDmowski, ChatMessage } from '../services/geminiService';
import { useGraphStore } from '../state/graphStore';

export const DmowskiChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { graph } = useGraphStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const graphContext = {
        nodes: graph.nodes().map(n => graph.getNodeAttribute(n, 'label')),
        edges: graph.edges().map(e => {
            const source = graph.source(e);
            const target = graph.target(e);
            const type = graph.getEdgeAttribute(e, 'type');
            const sLabel = graph.getNodeAttribute(source, 'label');
            const tLabel = graph.getNodeAttribute(target, 'label');
            return `${sLabel} --[${type}]--> ${tLabel}`;
        })
      };

      const responseText = await chatWithDmowski([...messages, userMsg], graphContext);
      
      const botMsg: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Przepraszam, wystąpił błąd połączenia.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-64 w-12 h-12 bg-archival-navy text-white rounded-full shadow-xl flex items-center justify-center hover:bg-opacity-90 transition-transform hover:scale-105 z-50 border-2 border-archival-gold"
        title="Chat with Roman Dmowski"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-24 w-80 h-96 bg-archival-paper border-2 border-archival-navy rounded-t-lg shadow-2xl flex flex-col font-serif z-40">
      {/* Header */}
      <div className="bg-archival-navy text-white p-3 flex justify-between items-center rounded-t-sm">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-archival-paper rounded-full flex items-center justify-center overflow-hidden border border-archival-gold">
                <span className="text-archival-navy font-bold text-xs">RD</span>
            </div>
            <div>
                <h3 className="font-bold text-sm">Roman Dmowski</h3>
                <div className="text-[0.6rem] text-archival-gold uppercase tracking-wider">Historical Persona</div>
            </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:text-archival-gold">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white/50">
        {messages.length === 0 && (
            <div className="text-center text-archival-sepia text-sm italic mt-10">
                "Jestem Polakiem, więc mam obowiązki polskie..." <br/>
                Zadaj mi pytanie o historię ruchu narodowego.
            </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <Bot size={16} className="mt-1 text-archival-navy flex-shrink-0" />}
            <div 
              className={`max-w-[80%] p-2 rounded text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-archival-navy text-white rounded-br-none' 
                  : 'bg-white text-archival-ink border border-archival-sepia/20 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
            {msg.role === 'user' && <User size={16} className="mt-1 text-archival-sepia flex-shrink-0" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 justify-start">
             <Bot size={16} className="mt-1 text-archival-navy" />
             <div className="bg-white p-2 rounded text-sm border border-archival-sepia/20 italic text-gray-500">
                Piszę...
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-archival-sepia/20 bg-white flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Zapytaj o Endecję..."
          className="flex-1 p-2 border border-archival-sepia/30 rounded text-sm focus:outline-none focus:border-archival-navy bg-archival-paper/30"
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="bg-archival-navy text-white p-2 rounded hover:bg-opacity-90 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};