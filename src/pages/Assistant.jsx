import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/PageHeader";
import { Bot, Send, Loader2, ShieldCheck, User, Wifi, WifiOff } from "lucide-react";
import { findBestMatch } from "@/lib/offlineKnowledge";

const SUGGESTIONS = [
  "What should I do during an earthquake?",
  "How do I prepare a go-bag?",
  "What are the signs of structural damage after an earthquake?",
  "How do I make a household evacuation plan?",
  "What should I do immediately after the shaking stops?",
];

function MessageBubble({ role, content, source }) {
  const isUser = role === "user";
  const isCached = source === "cached" || source === "fallback";
  
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-blue-600 text-white" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-blue-600 text-white"
              : "rounded-tl-sm bg-white/55 text-slate-700 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/40"
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {!isUser && source && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 px-1">
            {isCached ? (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Offline - Cached response</span>
              </>
            ) : (
              <>
                <Wifi className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600">Live AI response</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const scrollRef = useRef(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("✅ Back online - using live AI");
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log("📴 Offline - using cached responses");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
      if (isOnline) {
        // Try online AI first
        try {
          const res = await Promise.race([
            base44.functions.invoke("aegisAssistant", {
              message,
              history: messages.map((m) => ({ role: m.role, content: m.content })),
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("timeout")), 5000)
            )
          ]);
          
          const reply = res?.data?.reply || res?.data?.error;
          if (reply) {
            setMessages([...newMessages, { 
              role: "assistant", 
              content: reply,
              source: "online"
            }]);
            return;
          }
        } catch (onlineError) {
          console.log("Online AI failed, using cached response:", onlineError.message);
          // Fall through to offline mode
        }
      }
      
      // Use offline cached response
      const { answer, source, confidence } = findBestMatch(message);
      setMessages([...newMessages, { 
        role: "assistant", 
        content: answer,
        source: source
      }]);
      
    } catch (e) {
      console.error("Assistant error:", e);
      
      // Ultimate fallback
      const { answer } = findBestMatch(message);
      setMessages([
        ...newMessages,
        { 
          role: "assistant", 
          content: answer,
          source: "fallback"
        },
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

      {/* Online/Offline Status Badge */}
      <div className="mb-4 flex items-center justify-center">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold ${
          isOnline 
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" 
            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        }`}>
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Online Mode - Live AI</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Offline Mode - Cached Knowledge</span>
            </>
          )}
        </div>
      </div>

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
                Ask me anything about earthquake preparedness, response, or recovery. I work both online and offline!
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
            <MessageBubble key={i} role={m.role} content={m.content} source={m.source} />
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
              placeholder={isOnline ? "Ask about earthquake safety..." : "Ask about earthquake safety (offline mode)..."}
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
            {isOnline 
              ? "AI guidance is informational. For emergencies, use SOS or call 911."
              : "Working offline with cached earthquake safety knowledge. For emergencies, use SOS or call 911."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
