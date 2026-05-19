import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp, Square, FolderTree, Map, Brain, FileCheck, Download,
  AlertTriangle, Sparkles, Check, Loader2, Clock, GitBranch,
  ExternalLink, GitCommitHorizontal, RefreshCw
} from 'lucide-react';

// ── Icon mapping ──
const STEP_ICONS: Record<string, React.ElementType> = {
  'folder-tree': FolderTree,
  'map': Map,
  'brain': Brain,
  'file-check': FileCheck,
  'download': Download,
  'alert-triangle': AlertTriangle,
  'sparkles': Sparkles,
  'check': Check,
  'git-commit': GitCommitHorizontal,
  'refresh-cw': RefreshCw,
};

// ── Types ──
interface ProgressStep {
  id: string;
  icon: string;
  message: string;
  status: 'active' | 'done';
  timestamp: number;
  duration?: number; // seconds this step took
}

interface RichData {
  summary?: string;
  changesDescription?: { path: string; description: string }[];
  commitUrl?: string;
  provider?: string;
  model?: string;
}

interface PlanData {
  plan?: string;
  steps?: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  richData?: RichData;
  planData?: PlanData;
  showCommitBtn?: boolean;
  showPlanBtns?: boolean;
  meta?: { provider?: string; model?: string };
}

// ── Progress Pipeline Component ──
const ProgressPipeline: React.FC<{ steps: ProgressStep[]; elapsed: number }> = ({ steps, elapsed }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}
      className="mx-3 mb-3"
    >
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '14px 16px',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence mode="popLayout">
            {steps.map((step, i) => {
              const IconComponent = STEP_ICONS[step.icon] || Sparkles;
              const isDone = step.status === 'done';

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 0',
                  }}
                >
                  {/* Icon container */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: isDone
                      ? 'rgba(52, 211, 153, 0.12)'
                      : 'rgba(139, 92, 246, 0.12)',
                    border: `1px solid ${isDone ? 'rgba(52,211,153,0.25)' : 'rgba(139,92,246,0.25)'}`,
                    transition: 'all 0.3s ease',
                  }}>
                    {isDone ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <Check size={14} style={{ color: '#34d399' }} />
                      </motion.div>
                    ) : (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        style={{ display: 'flex' }}
                      >
                        <Loader2 size={14} style={{ color: '#8B5CF6' }} />
                      </motion.div>
                    )}
                  </div>

                  {/* Step icon */}
                  <IconComponent size={14} style={{
                    color: isDone ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)',
                    flexShrink: 0,
                    transition: 'color 0.3s ease',
                  }} />

                  {/* Message */}
                  {isDone ? (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.4)',
                      flex: 1,
                      lineHeight: 1.3,
                      transition: 'color 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      {step.message}
                      {step.duration != null && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>
                          {step.duration}s
                        </span>
                      )}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        flex: 1,
                        lineHeight: 1.3,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(139,92,246,0.9) 40%, rgba(255,255,255,0.85) 60%, rgba(139,92,246,0.9) 100%)',
                        backgroundSize: '200% 100%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        animation: 'shimmer-text 2s ease-in-out infinite',
                      }}
                    >
                      {step.message}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Elapsed time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Clock size={11} style={{ color: 'rgba(255,255,255,0.25)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>
            {elapsed}s
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ── Rich Result Card ──
const RichResultCard: React.FC<{
  richData: RichData;
  onCommit?: () => void;
  showCommitBtn?: boolean;
}> = ({ richData, onCommit, showCommitBtn }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(52,211,153,0.02))',
      border: '1px solid rgba(52,211,153,0.15)',
      borderRadius: 14,
      padding: 16,
      margin: '4px 0',
    }}
  >
    {/* Files modified - shown first */}
    {richData.changesDescription && richData.changesDescription.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
        }}>
          Arquivos modificados ({richData.changesDescription.length})
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 2,
          background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '8px 10px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {richData.changesDescription.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
              padding: '4px 0',
              borderBottom: i < richData.changesDescription!.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <FileCheck size={12} style={{ color: '#34d399', flexShrink: 0 }} />
              <code style={{
                color: '#c4a6ff', background: 'rgba(139,92,246,0.1)',
                padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              }}>{c.path}</code>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Changes description - below files */}
    {richData.changesDescription && richData.changesDescription.some(c => c.description && c.description !== 'Modificado' && c.description !== 'Commitado') && (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          O que mudou
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {richData.changesDescription.filter(c => c.description && c.description !== 'Modificado' && c.description !== 'Commitado').map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.5,
              padding: '3px 0',
            }}>
              <span style={{ color: 'rgba(139,92,246,0.6)', flexShrink: 0 }}>•</span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{c.path.split('/').pop()}: </span>
                {c.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Summary */}
    {richData.summary && (
      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
        borderTop: (richData.changesDescription && richData.changesDescription.length > 0) ? '1px solid rgba(255,255,255,0.06)' : 'none',
        paddingTop: (richData.changesDescription && richData.changesDescription.length > 0) ? 10 : 0,
        marginBottom: 10,
      }}>
        {richData.summary}
      </p>
    )}

    {/* Footer: commit link, apply button, model */}
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {richData.commitUrl && (
        <a
          href={richData.commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: '#8B5CF6', textDecoration: 'none',
          }}
        >
          <GitBranch size={12} /> Ver commit <ExternalLink size={10} />
        </a>
      )}
      {showCommitBtn && onCommit && (
        <button
          onClick={onCommit}
          style={{
            padding: '6px 14px', borderRadius: 8,
            background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            border: 'none', color: '#fff', fontSize: 11, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Aplicar commit
        </button>
      )}
      {richData.model && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
          {richData.model}
        </span>
      )}
    </div>
  </motion.div>
);

// ── Chat Bubble ──
const ChatBubble: React.FC<{
  message: ChatMessage;
  onAction?: (action: string) => void;
}> = ({ message, onAction }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, paddingLeft: 40, paddingRight: 12 }}
      >
        <div style={{
          padding: '10px 14px',
          borderRadius: '16px 16px 4px 16px',
          background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
          color: '#fff',
          fontSize: 13,
          lineHeight: 1.5,
          maxWidth: '85%',
          wordBreak: 'break-word',
        }}>
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16, paddingRight: 40, paddingLeft: 12 }}
    >
      <div style={{ maxWidth: '90%' }}>
        {message.richData ? (
          <RichResultCard
            richData={message.richData}
            showCommitBtn={message.showCommitBtn}
            onCommit={() => onAction?.('commit_proposal')}
          />
        ) : message.planData ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(139,92,246,0.02))',
              border: '1px solid rgba(139,92,246,0.15)',
              borderRadius: 14, padding: 16,
            }}
          >
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {message.planData.plan}
            </p>
            {message.showPlanBtns && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => onAction?.('execute_plan')}
                  style={{
                    padding: '7px 16px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Executar plano
                </button>
                <button
                  onClick={() => onAction?.('discard_plan')}
                  style={{
                    padding: '7px 16px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Descartar
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <div style={{
            padding: '10px 14px',
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 13,
            lineHeight: 1.6,
            wordBreak: 'break-word',
          }}
            className="prose prose-invert prose-sm max-w-none"
          >
            {message.content ? (
              message.isStreaming ? (
                <span>{message.content}<span className="animate-pulse">▎</span></span>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              )
            ) : (
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ display: 'flex', gap: 4, padding: '4px 0' }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
              </motion.div>
            )}
          </div>
        )}

        {message.meta?.model && !message.richData && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 4, display: 'block', paddingLeft: 4 }}>
            {message.meta.model}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ── Main Component ──
const ExtensionChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => scrollToBottom(), [messages, progressSteps, scrollToBottom]);

  // Listen for postMessage from parent (sidepanel.js)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      if (!type) return;

      switch (type) {
        case 'chat:stream_start':
          setIsProcessing(true);
          setProgressSteps([]);
          setElapsed(0);
          startTimeRef.current = Date.now();
          elapsedRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }, 1000);
          break;

        case 'chat:progress': {
          const { message, icon, step } = payload;
          // Strip any remaining emojis from message
          const cleanMessage = message?.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim() || message;
          setProgressSteps(prev => {
            const now = Date.now();
            // Mark previous active steps as done with duration
            const updated = prev.map(s => s.status === 'active'
              ? { ...s, status: 'done' as const, duration: Math.round((now - s.timestamp) / 100) / 10 }
              : s
            );
            updated.push({
              id: `${step}_${now}`,
              icon: icon || 'sparkles',
              message: cleanMessage,
              status: 'active',
              timestamp: now,
            });
            return updated;
          });
          break;
        }

        case 'chat:progress_end':
          setProgressSteps(prev => {
            const now = Date.now();
            return prev.map(s => s.status === 'active'
              ? { ...s, status: 'done' as const, duration: Math.round((now - s.timestamp) / 100) / 10 }
              : { ...s, status: 'done' as const }
            );
          });
          if (elapsedRef.current) clearInterval(elapsedRef.current);
          setTimeout(() => setProgressSteps([]), 800);
          break;

        case 'chat:stream_delta': {
          const { delta } = payload;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && last?.isStreaming) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, content: last.content + delta };
              return updated;
            }
            // Create new streaming message
            return [...prev, {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content: delta,
              isStreaming: true,
            }];
          });
          break;
        }

        case 'chat:stream_end': {
          setIsProcessing(false);
          if (elapsedRef.current) clearInterval(elapsedRef.current);
          setProgressSteps([]);
          if (payload?.cancelled) {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last?.isStreaming) {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, isStreaming: false };
                return updated;
              }
              return prev;
            });
          } else {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last?.isStreaming) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...last,
                  isStreaming: false,
                  meta: payload?.meta,
                };
                return updated;
              }
              return prev;
            });
          }
          break;
        }

        case 'chat:stream_error':
          setIsProcessing(false);
          if (elapsedRef.current) clearInterval(elapsedRef.current);
          setProgressSteps([]);
          setMessages(prev => [...prev, {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Erro: ${payload?.error || 'Desconhecido'}`,
          }]);
          break;

        case 'chat:ai_message':
          setIsProcessing(false);
          if (elapsedRef.current) clearInterval(elapsedRef.current);
          setProgressSteps([]);
          setMessages(prev => [...prev, {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: payload?.content || '',
            richData: payload?.richData,
            planData: payload?.planData,
            showCommitBtn: payload?.showCommitBtn,
            showPlanBtns: payload?.showPlanBtns,
            meta: payload?.meta,
          }]);
          break;

        case 'chat:typing':
          setIsProcessing(!!payload?.show);
          break;

        case 'chat:action_dismissed':
          setMessages(prev => prev.map(m => ({
            ...m,
            showCommitBtn: false,
            showPlanBtns: false,
          })));
          break;

        case 'chat:clear':
          setMessages([]);
          setProgressSteps([]);
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isProcessing) return;

    setMessages(prev => [...prev, {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
    }]);
    setInputValue('');

    // Send to parent (sidepanel.js)
    window.parent.postMessage({ type: 'chat:user_send', payload: { message: text } }, '*');
  };

  const handleAction = (action: string) => {
    window.parent.postMessage({ type: 'chat:action', payload: { action } }, '*');
  };

  const handleCancel = () => {
    window.parent.postMessage({ type: 'chat:cancel' }, '*');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#050505',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes shimmer-text {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: 12,
        paddingBottom: 8,
      }}>
        {messages.length === 0 && progressSteps.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255,255,255,0.2)',
            fontSize: 13,
          }}>
            Envie uma mensagem para começar
          </div>
        )}

        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} onAction={handleAction} />
        ))}

        {/* Progress pipeline */}
        <AnimatePresence>
          {progressSteps.length > 0 && (
            <ProgressPipeline steps={progressSteps} elapsed={elapsed} />
          )}
        </AnimatePresence>

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '4px 4px 4px 14px',
        }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite sua mensagem..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isProcessing}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f0f0f0',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
          {isProcessing ? (
            <button
              onClick={handleCancel}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(248,113,113,0.15)',
                border: '1px solid rgba(248,113,113,0.3)',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: inputValue.trim()
                  ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                  : 'rgba(255,255,255,0.05)',
                border: 'none',
                color: inputValue.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                cursor: inputValue.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtensionChat;
