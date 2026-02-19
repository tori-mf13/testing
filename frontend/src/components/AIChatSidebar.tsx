import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  'How much are we spending on unused licenses?',
  'What happened on the network last night?',
  'Which servers are running hot?',
  'Show me our security posture summary',
  'Who has the most open tickets?',
];

// Demo responses for when no backend is available
const DEMO_RESPONSES: Record<string, string> = {
  'how much are we spending on unused licenses?':
    'Based on current data, you\'re spending approximately $2,430/month on underutilized licenses:\n\n• Notion — $2,000/mo at 22.5% utilization (45 of 200 seats used)\n• Monday.com — $300/mo at 13% utilization (2 of 15 seats used)\n• Canva — $130/mo at 30% utilization (3 of 10 seats used)\n\nReclaiming unused seats could save ~$1,300/month ($15,600/year).',
  'what happened on the network last night?':
    'Here\'s your network summary from last night:\n\n• Office AP Floor 2 (10.0.0.51) went offline at 11:42 PM and is still down — uptime dropped to 45%. This Ubiquiti U6 Pro on Floor 2 needs immediate attention.\n• All other devices stayed online with 99%+ uptime.\n• Edge Firewall handled a spike of 150 failed login attempts from IP 103.x.x.x between 2:15–2:20 AM — this was flagged as a brute force attempt.\n• Total bandwidth was normal across all other devices.',
  'which servers are running hot?':
    'Two servers need attention:\n\n🔴 aws-worker-01 — CPU at 88%, RAM at 72%. This production worker on AWS us-east-1 has been consistently high. Consider scaling horizontally or investigating the workload.\n\n🟡 prod-db-01 — RAM at 85%, CPU at 72%. Your primary database server is under heavy memory pressure. The 65% disk usage is also trending up. Consider query optimization or a RAM upgrade.',
  'show me our security posture summary':
    'Security Posture Overview:\n\n🔴 1 Critical Alert — CVE-2025-1234 (RCE in OpenSSL) on prod-web-01, currently being worked on\n🟠 2 High Alerts — Suspicious login from Russia + brute force attempt\n🟡 2 Medium Alerts — SSL cert expiring in 7 days + unencrypted data transfer\n\nCompliance: SOC 2 at 81% · ISO 27001 at 78% · NIST at 69% · GDPR at 89%\nPatch Compliance: 60% of assets up to date (3 of 5)\n\nTop priority: Patch the OpenSSL vulnerability on prod-web-01.',
  'who has the most open tickets?':
    'Current ticket distribution:\n\n• Morgan Manager — 3 open tickets (VPN issue, laptop slow, printer broken)\n• Jordan Dev — 1 urgent ticket (suspicious email received)\n• Val Viewer — 1 ticket (Salesforce access, currently in progress)\n\nThe urgent suspicious email ticket from Jordan is unassigned and should be picked up immediately. The VPN ticket from Morgan is also high priority and unassigned.',
};

function getDemoResponse(question: string): string {
  const lower = question.toLowerCase().trim();
  for (const [key, value] of Object.entries(DEMO_RESPONSES)) {
    if (lower.includes(key) || key.includes(lower.slice(0, 20))) {
      return value;
    }
  }
  // Generic fallback for unknown questions
  return `Here's what I found in your IT environment:\n\n• 5 total assets tracked (3 laptops, 1 server, 1 mobile)\n• 8 SaaS applications (6 active, 2 flagged as Shadow IT)\n• $15,980/month total SaaS spend\n• 5 open security alerts (1 critical, 2 high)\n• 6 help desk tickets (4 open, 1 in progress, 1 resolved)\n• Overall health score: 82%\n\nTry asking something more specific like "How much are we spending on unused licenses?" or "Which servers are running hot?" for deeper insights.`;
}

export default function AIChatSidebar({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your IT assistant. Ask me anything about your infrastructure, costs, security, or operations. Try something like "How much are we spending on unused licenses?"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const message = text || input.trim();
    if (!message || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: message, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<{ response: string }>('/ai/chat', { message });
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.response,
        timestamp: new Date(),
      }]);
    } catch {
      // Fallback to demo responses when backend is unavailable
      await new Promise((r) => setTimeout(r, 800)); // simulate thinking
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getDemoResponse(message),
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-96 flex flex-col bg-surface-900 border-l border-slate-800 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-400" />
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800 text-slate-200'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-2 text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Suggested questions (show only at start) */}
        {messages.length <= 1 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Try asking</p>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="block w-full text-left text-sm text-slate-400 hover:text-brand-400 hover:bg-slate-800/50 px-3 py-2 rounded-lg transition-colors"
              >
                "{q}"
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 bg-surface-850 rounded-lg px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your IT..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="text-brand-400 hover:text-brand-300 disabled:text-slate-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
