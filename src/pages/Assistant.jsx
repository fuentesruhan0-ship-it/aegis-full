import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/PageHeader";
import { Bot, Send, Loader2, ShieldCheck, User, WifiOff, AlertCircle, Sparkles, X } from "lucide-react";
import { generateAIAssistantReply } from "@/lib/aegisAI";
import { queryGeminiAssistant, isGeminiConfigured } from "@/lib/geminiClient";
import { queryXKiroAssistant, isXKiroConfigured } from "@/lib/xkiroClient";

const SUGGESTIONS = [
  "What should I do during an earthquake?",
  "How do I prepare a go-bag?",
  "What are the signs of structural damage after an earthquake?",
  "How do I make a household evacuation plan?",
  "What should I do immediately after the shaking stops?",
];

function MessageBubble({ role, content, source }) {
  const isUser = role === "user";
  const isCached = source === "cached";
  const isFallback = source === "fallback";
  const isError = source === "error";
  
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-blue-600 text-white"
            : isError
            ? "bg-rose-600 text-white shadow-sm"
            : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : isError ? <AlertCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 max-w-[85%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-blue-600 text-white"
              : isError
              ? "rounded-tl-sm bg-rose-50/90 text-rose-900 border border-rose-200/80 shadow-sm"
              : "rounded-tl-sm bg-white/70 text-slate-700 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/40 shadow-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none text-inherit leading-relaxed [&>p]:mb-2.5 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul>li]:mb-1 [&>ol>li]:mb-1 [&>h3]:font-bold [&>h3]:text-sm [&>h3]:mt-3 [&>h3]:mb-1 [&_strong]:font-semibold">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && source && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 px-1">
            {isError ? (
              <>
                <AlertCircle className="h-3 w-3 text-rose-500" />
                <span className="text-rose-600 font-medium">Service Notice</span>
              </>
            ) : isFallback ? (
              <>
                <ShieldCheck className="h-3 w-3 text-blue-500" />
                <span className="text-blue-600 font-medium">AEGIS Emergency Engine</span>
              </>
            ) : isCached ? (
              <>
                <WifiOff className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600">Offline Emergency Knowledge</span>
              </>
            ) : source === "xkiro" ? (
              <>
                <Sparkles className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Live xKiro AI (Qwen)</span>
              </>
            ) : source === "gemini" ? (
              <>
                <Sparkles className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Live Gemini AI response</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Live AI response</span>
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
  const [geminiNotice, setGeminiNotice] = useState(null);
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
        // 1. Prioritize xKiro AI API if configured
        if (isXKiroConfigured()) {
          try {
            const { reply } = await queryXKiroAssistant(
              message,
              messages.map((m) => ({ role: m.role, content: m.content }))
            );
            if (reply) {
              setMessages([...newMessages, { 
                role: "assistant", 
                content: reply,
                source: "xkiro"
              }]);
              setGeminiNotice(null);
              return;
            }
          } catch (xkiroError) {
            console.warn("xKiro API notice:", xkiroError);
          }
        }

        // 2. Try Google Gemini API if configured
        if (isGeminiConfigured()) {
          try {
            const { reply } = await queryGeminiAssistant(
              message,
              messages.map((m) => ({ role: m.role, content: m.content }))
            );
            if (reply) {
              setMessages([...newMessages, { 
                role: "assistant", 
                content: reply,
                source: "gemini"
              }]);
              setGeminiNotice(null);
              return;
            }
          } catch (geminiError) {
            console.warn("Gemini API notice:", geminiError);
            const rawMsg = geminiError.message?.replace(/^Error:\s*/, "") || "Gemini API unavailable";
            const isAuth = geminiError.message?.includes("403");
            const isQuota = geminiError.message?.includes("429");
            
            // Set notice banner so user is informed without disrupting the conversation
            setGeminiNotice({
              title: isAuth
                ? "Gemini API Key Notice (HTTP 403)"
                : isQuota
                ? "Gemini Free Quota Exceeded (HTTP 429)"
                : "Gemini AI Status Notice",
              message: isAuth 
                ? "Your API key's Google Cloud project has access restrictions or the Generative Language API is disabled. AEGIS has automatically switched to the built-in Emergency Engine."
                : isQuota
                ? "The Gemini free-tier quota for this API key has been reached. AEGIS has automatically switched to the built-in Emergency Engine."
                : `Gemini service returned an error (${rawMsg}). AEGIS has automatically switched to the built-in Emergency Engine.`,
              link: "https://aistudio.google.com/app/apikey",
              linkText: "Create a fresh key at Google AI Studio"
            });
          }
        }

        // 2. Try Base44 backend function
        try {
          if (base44?.functions?.invoke) {
            const res = await Promise.race([
              base44.functions.invoke("aegisAssistant", {
                message,
                history: messages.map((m) => ({ role: m.role, content: m.content })),
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error("timeout")), 6000)
              )
            ]);
            
            const reply = res?.data?.reply;
            if (reply && !res?.data?.error) {
              setMessages([...newMessages, { 
                role: "assistant", 
                content: reply,
                source: "online"
              }]);
              return;
            }
          }
        } catch (onlineError) {
          console.log("Base44 backend function unavailable, using local AEGIS engine:", onlineError.message);
        }

        // 3. Fallback to local AEGIS Emergency Engine
        const fallbackReply = generateAIAssistantReply(message, messages);
        setMessages([...newMessages, { 
          role: "assistant", 
          content: fallbackReply,
          source: "fallback"
        }]);
        return;
      }
      
      // Offline mode
      const offlineReply = generateAIAssistantReply(message, messages);
      setMessages([...newMessages, { 
        role: "assistant", 
        content: offlineReply,
        source: "cached"
      }]);
      
    } catch (e) {
      console.error("Assistant error:", e);
      const fallbackReply = generateAIAssistantReply(message, messages);
      setMessages([
        ...newMessages,
        { 
          role: "assistant", 
          content: fallbackReply,
          source: "cached"
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
          !isOnline
            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
            : isXKiroConfigured()
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : geminiNotice
            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
            : isGeminiConfigured()
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
        }`}>
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Offline Mode - Cached Knowledge</span>
            </>
          ) : isXKiroConfigured() ? (
            <>
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Online Mode - Live AI (xKiro Active)</span>
            </>
          ) : geminiNotice ? (
            <>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Online Mode - AEGIS Emergency Engine</span>
            </>
          ) : isGeminiConfigured() ? (
            <>
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Online Mode - Live Gemini AI</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Online Mode - AEGIS Emergency Engine</span>
            </>
          )}
        </div>
      </div>

      {/* Dismissible Gemini API Status Banner if there is an API key issue */}
      {geminiNotice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/95 p-3.5 text-xs text-amber-900 shadow-sm backdrop-blur">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">{geminiNotice.title}</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">{geminiNotice.message}</p>
              {geminiNotice.link && (
                <a
                  href={geminiNotice.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 font-semibold text-amber-950 underline hover:text-black"
                >
                  {geminiNotice.linkText} &rarr;
                </a>
              )}
            </div>
          </div>
          <button
            onClick={() => setGeminiNotice(null)}
            className="rounded p-1 text-amber-700 hover:bg-amber-100 hover:text-amber-900"
            title="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
