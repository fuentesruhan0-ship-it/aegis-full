import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/PageHeader";
import { Bot, Send, Loader2, ShieldCheck, AlertTriangle, User } from "lucide-react";

const SUGGESTIONS = [
  "What should I do during an earthquake?",
  "How do I prepare a go-bag?",
  "What are the signs of structural damage after an earthquake?",
  "How do I make a household evacuation plan?",
  "What should I do immediately after the shaking stops?",
];

function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-blue-600 text-white" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-blue-600 text-white"
            : "rounded-tl-sm bg-white/55 text-slate-700 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/40"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    const userMsg = { role: "user", content: message };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    try {
      const res = await base44.functions.invoke("aegisAssistant", {
        message,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = res?.data?.reply || res?.data?.error || "I'm having trouble responding right now. Please try again.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "The assistant is temporarily unavailable. For emergencies, use the SOS button or call 911." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-0px)] max-w-3xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="AI Emergency Assistant"
        description="Verified earthquake preparedness & response guidance"
        icon={Bot}
        accent="blue"
      />

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/30 shadow-sm backdrop-blur-xl backdrop-saturate-150">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">How can I help you stay safe?</h3>
              <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                Ask me anything about earthquake preparedness, response, or recovery. I only share verified guidance.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-white/40 bg-white/55 backdrop-blur-xl backdrop-saturate-150 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white/55 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/40">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/40 bg-white/55 backdrop-blur-xl backdrop-saturate-150 p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about earthquake safety..."
              rows={1}
              className="max-h-32 resize-none"
              disabled={sending}
            />
            <Button
              onClick={() => send()}
              disabled={sending || !input.trim()}
              className="h-11 shrink-0 bg-blue-600 hover:bg-blue-700"
              size="icon"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3 w-3" />
            AI guidance is informational. For emergencies, use SOS or call 911.
          </p>
        </div>
      </div>
    </div>
  );
}