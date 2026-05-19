import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useExtensionDownload } from '@/hooks/useExtensionDownload';
import { useExtensionV7Download } from '@/hooks/useExtensionV7Download';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw, Download, Eye, Code, Loader2, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// ==========================================
// V5 Default Template (same as before)
// ==========================================
const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ilimitado Lov - Remote UI</title>
<style>
:root {
  --bg: #000000;
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #111111;
  --bg-input: #1c1c1e;
  --border: rgba(139,92,246,0.12);
  --border-focus: rgba(139,92,246,0.4);
  --text: #f5f5f7;
  --text-secondary: rgba(255,255,255,0.55);
  --text-muted: rgba(255,255,255,0.3);
  --accent: #8B5CF6;
  --accent-hover: #A78BFA;
  --accent-glow: rgba(139,92,246,0.15);
  --green: #30D158;
  --red: #FF453A;
  --radius: 12px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
*::-webkit-scrollbar { width: 3px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.15); border-radius: 10px; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;
  height: 100vh;
  overflow: hidden;
  display: flex; flex-direction: column;
  -webkit-font-smoothing: antialiased;
}
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  background: linear-gradient(180deg, rgba(139,92,246,0.08) 0%, var(--bg-secondary) 100%);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(20px);
}
.header-left { display: flex; align-items: center; gap: 10px; }
.header-logo { height: 16px; border-radius: 10px; object-fit: contain; }
.header-right { display: flex; align-items: center; gap: 6px; }
.license-badge {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 100px;
  background: rgba(48,209,88,0.08);
  font-size: 10px; font-weight: 600; color: var(--green);
  border: 1px solid rgba(48,209,88,0.12);
  backdrop-filter: blur(10px);
}
.license-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--green);
  box-shadow: 0 0 6px rgba(48,209,88,0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(48,209,88,0.6); }
  50% { opacity: 0.6; box-shadow: 0 0 2px rgba(48,209,88,0.3); }
}
.publish-btn {
  padding: 5px 14px; border-radius: 100px;
  background: linear-gradient(135deg, var(--accent), #A78BFA);
  color: white;
  font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
  border: none; cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(139,92,246,0.25);
}
.publish-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.35); }
.publish-btn:active { transform: translateY(0); }
.icon-btn {
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid transparent;
  color: var(--text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.icon-btn:hover { background: rgba(255,255,255,0.08); border-color: var(--border); color: var(--text); }
.icon-btn.danger:hover { color: var(--red); background: rgba(255,69,58,0.08); border-color: rgba(255,69,58,0.15); }
.tab-bar {
  display: flex; gap: 0;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
}
.tab-btn {
  padding: 10px 16px;
  font-size: 13px; font-weight: 500;
  color: var(--text-muted);
  background: none; border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn:hover { color: var(--text-secondary); }
.tab-btn.active { color: var(--text); border-bottom-color: var(--accent); }
.banner { width: 100%; overflow: hidden; border-bottom: 1px solid var(--border); }
.banner img { width: 100%; height: auto; display: block; }

/* ===== CHAT PREMIUM ===== */
.chat-container {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
  background: linear-gradient(180deg, #0a0a0a 0%, #0d0618 25%, #120822 50%, #1a0b38 80%, #2d1065 100%);
  position: relative;
}
.chat-container::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 40% at 50% 80%, rgba(139,92,246,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.chat-container.hidden { display: none; }

.history {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px 14px;
  position: relative; z-index: 1;
}

/* Message wrapper with avatar */
.message-wrapper {
  display: flex; align-items: flex-start; gap: 10px;
  animation: msgSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.message-wrapper.user { flex-direction: row-reverse; }
@keyframes msgSlideIn {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Avatars */
.msg-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
}
.message-wrapper:not(.user) .msg-avatar {
  background: linear-gradient(135deg, var(--accent), #7c3aed);
  color: white;
  box-shadow: 0 2px 10px rgba(139,92,246,0.3);
}
.message-wrapper.user .msg-avatar {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.08);
}

/* Message body */
.msg-body { max-width: 82%; min-width: 0; display: flex; flex-direction: column; gap: 3px; }

/* Bubbles */
.bubble {
  padding: 11px 16px;
  border-radius: 18px;
  font-size: 13.5px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word;
}
.bubble.bot {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.06);
  border-bottom-left-radius: 4px;
  color: rgba(255,255,255,0.92);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.bubble.user {
  background: linear-gradient(135deg, var(--accent), #7c3aed);
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 3px 12px rgba(139,92,246,0.3);
}

/* Markdown in bot messages */
.bubble.bot code {
  background: rgba(139,92,246,0.1); color: #c4b5fd;
  padding: 1px 5px; border-radius: 4px; font-size: 12px;
  font-family: 'SF Mono', ui-monospace, monospace;
}
.bubble.bot pre {
  background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px; padding: 10px 14px; margin: 6px 0;
  overflow-x: auto; font-size: 12px; line-height: 1.5;
  font-family: 'SF Mono', ui-monospace, monospace;
}
.bubble.bot pre code { background: transparent; padding: 0; color: rgba(255,255,255,0.8); }
.bubble.bot strong { color: #c4b5fd; font-weight: 700; }
.bubble.bot a { color: #a78bfa; text-decoration: none; }
.bubble.bot a:hover { text-decoration: underline; }
.bubble.bot ul, .bubble.bot ol { padding-left: 16px; margin: 4px 0; }
.bubble.bot li { margin: 2px 0; }
.bubble.bot h1, .bubble.bot h2, .bubble.bot h3 {
  font-size: 14px; font-weight: 700; color: #e9e3ff; margin: 6px 0 2px;
}

/* Message timestamp */
.msg-meta {
  display: flex; align-items: center; gap: 6px; padding: 0 4px;
}
.message-wrapper.user .msg-meta { justify-content: flex-end; }
.msg-time { font-size: 9px; color: rgba(255,255,255,0.18); font-weight: 500; }

/* Typing indicator */
.typing-indicator {
  display: flex; align-items: center; gap: 10px;
  animation: msgSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.typing-dots {
  display: flex; gap: 4px; padding: 12px 16px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px; border-bottom-left-radius: 4px;
}
.typing-dots span {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(139,92,246,0.5);
  animation: typingBounce 1.4s ease-in-out infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* Empty state */
.empty-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100%; text-align: center; padding: 32px;
}
.empty-logo {
  width: 72px; height: 72px; border-radius: 18px; object-fit: contain;
  margin-bottom: 16px; opacity: 0.6;
  filter: drop-shadow(0 0 20px rgba(139,92,246,0.15));
}
.empty-state h3 {
  font-size: 16px; font-weight: 600;
  background: linear-gradient(135deg, #f5f5f7, #a78bfa);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.empty-state p { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.empty-suggestions {
  display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;
  margin-top: 16px; max-width: 320px;
}
.empty-suggestions button {
  padding: 6px 14px; border-radius: 100px;
  background: rgba(139,92,246,0.08);
  border: 1px solid rgba(139,92,246,0.15);
  color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease;
  font-family: inherit;
}
.empty-suggestions button:hover {
  background: rgba(139,92,246,0.15);
  border-color: rgba(139,92,246,0.3);
  color: rgba(255,255,255,0.85);
}

/* Watermark */
.watermark-badge {
  margin-left: auto; display: flex; align-items: center;
  background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.08));
  border: 1px solid rgba(139,92,246,0.25); border-radius: 100px;
  height: 26px; padding: 0 10px; cursor: pointer;
  transition: all 0.25s ease; gap: 6px;
}
.watermark-badge:hover { border-color: rgba(139,92,246,0.5); background: linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.12)); box-shadow: 0 0 12px rgba(139,92,246,0.15); }
.watermark-badge-cta {
  display: flex; align-items: center; gap: 5px;
  height: 100%;
  font-size: 10px; font-weight: 600; color: rgba(139,92,246,0.9);
  border: none; background: none; cursor: pointer; white-space: nowrap;
  font-family: inherit; letter-spacing: 0.02em; text-transform: uppercase;
}
.watermark-badge:hover .watermark-badge-cta { color: #a78bfa; }

/* Input area */
.input-area {
  padding: 10px 12px 14px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.5));
  position: relative; z-index: 1;
}
.input-wrapper {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 8px 8px 8px 14px;
  background: rgba(28,28,30,0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139,92,246,0.1);
  border-radius: 22px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.input-wrapper:focus-within {
  border-color: rgba(139,92,246,0.35);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 20px rgba(139,92,246,0.08);
}
.input-wrapper textarea {
  flex: 1; min-height: 60px; max-height: 200px;
  resize: none; border: none; background: transparent;
  color: var(--text); font-size: 14px;
  font-family: inherit; line-height: 1.4;
  padding: 0; outline: none;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  transition: height 0.1s ease;
}
.input-wrapper textarea::placeholder { color: var(--text-muted); }
.input-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.attach-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: transparent; color: var(--text-secondary);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.attach-btn:hover { color: var(--accent); }
.file-preview {
  display: none; flex-wrap: wrap; gap: 6px;
  padding: 6px 14px 0;
}
.file-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 8px;
  background: var(--accent-glow); border: 1px solid var(--border);
  font-size: 11px; color: var(--text-secondary);
}
.file-chip button {
  background: none; border: none; color: var(--text-muted);
  cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px;
}
.file-chip button:hover { color: var(--red); }
.send-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #7c3aed);
  color: white;
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(139,92,246,0.25);
}
.send-btn:hover { box-shadow: 0 3px 12px rgba(139,92,246,0.4); transform: scale(1.05); }
.send-btn:disabled { background: var(--bg-tertiary); color: var(--text-muted); cursor: not-allowed; opacity: 0.4; box-shadow: none; transform: none; }

/* Templates */
.templates-container { display: none; flex-direction: column; flex: 1; min-height: 0; overflow-y: auto; padding: 16px; gap: 12px; }
.templates-container.visible { display: flex; }
.template-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: 10px; background: rgba(255,255,255,0.03);
  border: 1px solid var(--border); border-radius: 14px;
  cursor: pointer; transition: all 0.15s ease;
  backdrop-filter: blur(8px);
}
.template-card:hover { background: rgba(255,255,255,0.06); border-color: var(--border-focus); }
.template-thumb { width: 100%; height: 140px; border-radius: 10px; background: var(--bg-input); object-fit: cover; display: flex; align-items: center; justify-content: center; font-size: 28px; overflow: hidden; }
.template-thumb img, .template-thumb video { width: 100%; height: 100%; border-radius: 10px; object-fit: cover; }
.template-bottom { display: flex; align-items: center; gap: 8px; }
.template-info { flex: 1; min-width: 0; }
.template-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.template-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.template-use {
  flex-shrink: 0; padding: 6px 14px; border-radius: 100px;
  background: var(--accent); color: white;
  font-size: 12px; font-weight: 600; border: none; cursor: pointer;
}
.template-category { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 4px 0; }
.powered-by { text-align: center; padding: 6px; font-size: 10px; color: var(--text-muted); }
</style>
</head>
<body>
<header class="header">
  <div class="header-left">
    <img class="header-logo" src="https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/public-assets/extension-logo.png" alt="Logo" />
  </div>
  <div class="header-right">
    <div class="license-badge" id="licenseBadge"><span class="license-dot"></span><span id="licenseInfo">Ativo</span></div>
    <button class="icon-btn" id="downloadBtn" title="Download Projeto">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </button>
    <button class="publish-btn" id="publishBtn">Publish</button>
    <button class="icon-btn danger" id="logoutBtn" title="Sair">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    </button>
  </div>
</header>
<div class="banner"><img src="https://wvelcefgihlxcnrmslul.supabase.co/storage/v1/object/public/public-assets/extension-banner.png?v=4" alt="Banner" /></div>
<div class="tab-bar">
  <button class="tab-btn active" id="tabChat" data-tab="chat">Chat</button>
  <button class="tab-btn" id="tabTemplates" data-tab="templates">Templates</button>
  <div class="watermark-badge" id="removeWatermarkBtn">
    <button class="watermark-badge-cta">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      <span>TIRAR MARCA D'ÁGUA</span>
    </button>
  </div>
</div>
<div class="chat-container" id="chatPanel">
  <div class="history" id="history">
    <div class="empty-state">
      <img class="empty-logo" src="https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/public-assets/extension-logo.png" alt="" />
      <h3>Pronto para começar</h3>
      <p>Envie uma mensagem para interagir</p>
      <div class="empty-suggestions">
        <button onclick="document.getElementById('message').value='Crie um site de portfólio';document.getElementById('message').focus();">🎨 Portfólio</button>
        <button onclick="document.getElementById('message').value='Crie uma landing page';document.getElementById('message').focus();">🚀 Landing Page</button>
        <button onclick="document.getElementById('message').value='Crie um dashboard';document.getElementById('message').focus();">📊 Dashboard</button>
      </div>
    </div>
  </div>
  <div class="input-area">
    <input type="file" id="fileInput" multiple style="display:none">
    <div id="filePreview" class="file-preview"></div>
    <div class="input-wrapper">
      <button class="attach-btn" id="attachBtn" title="Anexar arquivo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </button>
      <textarea id="message" placeholder="Mensagem..." rows="1"></textarea>
      <div class="input-actions">
        <button class="send-btn" id="sendBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  </div>
</div>
<div class="templates-container" id="templatesPanel"></div>
<div class="powered-by">Powered by Ilimitado Lov</div>
<script src="remote-ui.js"><\/script>
</body>
</html>`;
// ==========================================
// V7 Default Template — Chat via postMessage
// ==========================================
const DEFAULT_V7_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bubbly Chat v7</title>
<style>
:root {
  --bg: #050505;
  --bg-card: #111111;
  --bg-input: #161616;
  --bg-hover: #1a1a1a;
  --border: rgba(255,255,255,0.06);
  --border-light: rgba(255,255,255,0.1);
  --text: #f0f0f0;
  --text-secondary: rgba(255,255,255,0.55);
  --text-muted: rgba(255,255,255,0.25);
  --primary: #8B5CF6;
  --primary-dim: rgba(139,92,246,0.12);
  --primary-glow: rgba(139,92,246,0.35);
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
*::-webkit-scrollbar { width: 3px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
body {
  width: 100%; height: 100vh;
  background: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  color: var(--text);
  display: flex; flex-direction: column;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Messages area */
.messages {
  flex: 1; overflow-y: auto;
  padding: 14px 12px;
  display: flex; flex-direction: column; gap: 10px;
}

/* Message bubble */
.msg { display: flex; gap: 8px; animation: msgIn 0.3s cubic-bezier(0.16,1,0.3,1); }
.msg.user { flex-direction: row-reverse; }
@keyframes msgIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

.msg-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
}
.msg.ai .msg-avatar {
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  color: white; box-shadow: 0 2px 8px rgba(139,92,246,0.25);
}
.msg.user .msg-avatar {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

.msg-body { max-width: 88%; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

.msg-bubble {
  padding: 10px 14px; font-size: 12.5px; line-height: 1.55;
  border-radius: 16px; word-break: break-word; white-space: pre-wrap;
}
.msg.ai .msg-bubble {
  background: var(--bg-card); color: rgba(255,255,255,0.9);
  border: 1px solid var(--border); border-bottom-left-radius: 4px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}
.msg.user .msg-bubble {
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  color: white; border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(139,92,246,0.25);
}

.msg-meta {
  display: flex; align-items: center; gap: 6px; padding: 0 4px;
}
.msg.user .msg-meta { justify-content: flex-end; }
.msg-time { font-size: 9px; color: rgba(255,255,255,0.18); font-weight: 500; }
.msg-provider { font-size: 9px; color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); padding: 1px 6px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.04); }
.msg-copy {
  opacity: 0; transition: opacity 0.15s; background: none; border: none;
  color: rgba(255,255,255,0.25); cursor: pointer; padding: 2px;
}
.msg:hover .msg-copy { opacity: 1; }
.msg-copy:hover { color: rgba(255,255,255,0.5); }

/* Markdown rendering in AI messages */
.msg.ai .msg-bubble code {
  background: rgba(139,92,246,0.1); color: #c4b5fd;
  padding: 1px 5px; border-radius: 4px; font-size: 11px;
  font-family: 'SF Mono', ui-monospace, monospace;
}
.msg.ai .msg-bubble pre {
  background: #0a0a0a; border: 1px solid var(--border);
  border-radius: 8px; padding: 10px 12px; margin: 6px 0;
  overflow-x: auto; font-size: 11px; line-height: 1.5;
  font-family: 'SF Mono', ui-monospace, monospace;
}
.msg.ai .msg-bubble pre code { background: transparent; padding: 0; color: rgba(255,255,255,0.8); }
.msg.ai .msg-bubble strong { color: #c4b5fd; font-weight: 700; }
.msg.ai .msg-bubble a { color: #a78bfa; text-decoration: none; }
.msg.ai .msg-bubble a:hover { text-decoration: underline; }
.msg.ai .msg-bubble ul, .msg.ai .msg-bubble ol { padding-left: 16px; margin: 4px 0; }
.msg.ai .msg-bubble li { margin: 2px 0; }
.msg.ai .msg-bubble h1, .msg.ai .msg-bubble h2, .msg.ai .msg-bubble h3 {
  font-size: 13px; font-weight: 700; color: #c4b5fd; margin: 8px 0 4px;
}
.msg.ai .msg-bubble p { margin: 3px 0; }
.msg.ai .msg-bubble blockquote {
  border-left: 3px solid var(--primary); padding-left: 10px;
  margin: 6px 0; color: var(--text-secondary);
}

/* Rich result card */
.rich-result { display: flex; flex-direction: column; gap: 6px; }
.rich-summary { display: flex; align-items: center; gap: 6px; color: var(--success); font-weight: 700; font-size: 13px; }
.rich-file {
  display: flex; align-items: center; gap: 6px; font-size: 11px;
  padding: 5px 8px; border-radius: 6px;
  border: 1px solid var(--border); background: rgba(255,255,255,0.02);
  animation: fileIn 0.2s ease;
}
@keyframes fileIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
.rich-file .file-path { font-family: monospace; color: #c4b5fd; font-weight: 600; font-size: 10px; }
.rich-file .file-desc { color: rgba(255,255,255,0.45); }
.rich-commit {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #a78bfa; font-weight: 600;
  padding: 4px 10px; border-radius: 6px;
  background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2);
  text-decoration: none; width: fit-content;
}
.rich-commit:hover { background: rgba(139,92,246,0.2); }

/* Plan card */
.plan-card { display: flex; flex-direction: column; gap: 6px; }
.plan-title { font-weight: 700; font-size: 13px; color: #c4b5fd; }
.plan-step {
  display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px;
  animation: fileIn 0.2s ease;
}
.plan-step-num {
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(139,92,246,0.15); color: #a78bfa;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0; margin-top: 1px;
}
.plan-files { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.plan-file-tag {
  font-size: 9px; padding: 2px 7px; border-radius: 100px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--border);
  font-family: monospace; color: rgba(255,255,255,0.45);
}
.plan-risk { font-size: 11px; color: var(--warning); margin-top: 4px; }

/* Progress steps */
.progress-steps { display: flex; flex-direction: column; gap: 4px; }
.progress-step {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: rgba(255,255,255,0.55);
  animation: fileIn 0.15s ease;
}
.progress-dot {
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(139,92,246,0.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 8px;
}

/* Typing indicator */
.typing { display: flex; align-items: center; gap: 4px; padding: 4px 0; }
.typing-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--primary); animation: typeDot 1.2s ease infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes typeDot { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-5px); opacity: 1; } }

/* Action buttons */
.action-btns {
  display: flex; gap: 8px; padding-left: 36px; animation: msgIn 0.25s ease;
}
.btn-commit {
  padding: 7px 14px; border-radius: 8px; font-size: 11px; font-weight: 700;
  background: linear-gradient(135deg, var(--success), #059669);
  color: #000; border: none; cursor: pointer;
  box-shadow: 0 2px 8px rgba(52,211,153,0.2);
  transition: all 0.15s;
}
.btn-commit:hover { filter: brightness(1.1); transform: translateY(-1px); }
.btn-discard {
  padding: 7px 14px; border-radius: 8px; font-size: 11px; font-weight: 700;
  background: rgba(248,113,113,0.1); color: var(--error);
  border: 1px solid rgba(248,113,113,0.2);
  cursor: pointer; transition: all 0.15s;
}
.btn-discard:hover { background: rgba(248,113,113,0.2); }

/* Input bar */
.input-bar {
  padding: 8px 10px 10px; border-top: 1px solid var(--border);
  background: #0c0c0c;
}
.input-row {
  display: flex; align-items: flex-end; gap: 8px;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 14px; padding: 6px 10px;
  transition: border-color 0.2s;
}
.input-row:focus-within { border-color: rgba(139,92,246,0.35); box-shadow: 0 0 0 2px rgba(139,92,246,0.08); }
.input-row textarea {
  flex: 1; border: none; background: transparent; color: var(--text);
  font-size: 12.5px; font-family: inherit; line-height: 1.4;
  resize: none; outline: none; min-height: 20px; max-height: 90px;
  padding: 2px 0;
}
.input-row textarea::placeholder { color: var(--text-muted); }
.input-send {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--primary); color: white; border: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s;
}
.input-send:hover { background: #a78bfa; }
.input-send:disabled { background: var(--bg-hover); color: var(--text-muted); cursor: not-allowed; }

/* Welcome message */
.welcome { padding: 24px 16px; text-align: center; animation: msgIn 0.4s ease; }
.welcome-icon { font-size: 32px; margin-bottom: 8px; }
.welcome h3 { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.welcome p { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.welcome .modes { margin-top: 10px; display: flex; flex-direction: column; gap: 3px; text-align: left; padding: 0 8px; }
.welcome .mode-item { font-size: 11.5px; color: var(--text-secondary); }
.welcome .mode-item strong { color: #c4b5fd; }
</style>
</head>
<body>

<div class="messages" id="messages">
  <div class="welcome">
    <div class="welcome-icon">👋</div>
    <h3>Olá! Sou o Bubbly</h3>
    <p>Modifico código direto no GitHub via IA.</p>
    <div class="modes">
      <div class="mode-item">🚀 <strong>Auto</strong> — gera e commita automaticamente</div>
      <div class="mode-item">📋 <strong>Planejar</strong> — planeja antes de executar</div>
      <div class="mode-item">🔍 <strong>Revisar</strong> — gera proposta para aprovar</div>
      <div class="mode-item">💬 <strong>Chat</strong> — conversa livre com a IA</div>
    </div>
  </div>
</div>

<div class="input-bar">
  <div class="input-row">
    <textarea id="chat-input" placeholder="Mensagem..." rows="1"></textarea>
    <button class="input-send" id="send-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
  </div>
</div>

<script>
// ============================
// Bubbly Chat v7 — postMessage Bridge
// ============================
(function() {
  var messagesEl = document.getElementById('messages');
  var inputEl = document.getElementById('chat-input');
  var sendBtn = document.getElementById('send-btn');
  var isLoading = false;
  var streamingEl = null;
  var pendingAction = null;

  function scrollToBottom() {
    requestAnimationFrame(function() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function timeStr() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Simple markdown: bold, code, links, lists
  function renderMarkdown(text) {
    if (!text) return '';
    var html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Code blocks
      .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
      // Bold
      .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
      // Links
      .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Lists
      .replace(/^[\\-\\*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\\/li>)/gs, '<ul>$1</ul>')
      // Paragraphs
      .replace(/\\n\\n/g, '</p><p>')
      .replace(/\\n/g, '<br>');
    return '<p>' + html + '</p>';
  }

  function createMsgEl(role, content, meta) {
    var msg = document.createElement('div');
    msg.className = 'msg ' + role;

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'ai' ? 'B' : '👤';

    var body = document.createElement('div');
    body.className = 'msg-body';

    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (role === 'ai') {
      bubble.innerHTML = renderMarkdown(content);
    } else {
      bubble.textContent = content;
    }

    body.appendChild(bubble);

    var metaDiv = document.createElement('div');
    metaDiv.className = 'msg-meta';
    if (role === 'user') metaDiv.style.justifyContent = 'flex-end';

    var time = document.createElement('span');
    time.className = 'msg-time';
    time.textContent = timeStr();
    metaDiv.appendChild(time);

    if (meta && meta.provider) {
      var prov = document.createElement('span');
      prov.className = 'msg-provider';
      prov.textContent = meta.provider + '/' + (meta.model || '');
      metaDiv.appendChild(prov);
    }

    if (role === 'ai' && content) {
      var copyBtn = document.createElement('button');
      copyBtn.className = 'msg-copy';
      copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      copyBtn.onclick = function() {
        navigator.clipboard.writeText(content);
        copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        setTimeout(function() {
          copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        }, 2000);
      };
      metaDiv.appendChild(copyBtn);
    }

    body.appendChild(metaDiv);
    msg.appendChild(avatar);
    msg.appendChild(body);
    return msg;
  }

  function createRichResult(data) {
    var div = document.createElement('div');
    div.className = 'rich-result';
    if (data.summary) {
      var sum = document.createElement('div');
      sum.className = 'rich-summary';
      sum.textContent = '✅ ' + data.summary;
      div.appendChild(sum);
    }
    if (data.changesDescription) {
      data.changesDescription.forEach(function(ch, i) {
        var f = document.createElement('div');
        f.className = 'rich-file';
        f.style.animationDelay = (i * 0.05) + 's';
        f.innerHTML = '📄 <span class="file-path">' + ch.path + '</span> <span class="file-desc">— ' + ch.description + '</span>';
        div.appendChild(f);
      });
    }
    if (data.commitUrl) {
      var link = document.createElement('a');
      link.className = 'rich-commit';
      link.href = data.commitUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = '🔗 Ver commit';
      div.appendChild(link);
    }
    return div;
  }

  function createPlanCard(data) {
    var div = document.createElement('div');
    div.className = 'plan-card';
    var title = document.createElement('div');
    title.className = 'plan-title';
    title.textContent = '📋 Plano de Execução';
    div.appendChild(title);
    if (data.plan) {
      var desc = document.createElement('div');
      desc.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.8);';
      desc.textContent = data.plan;
      div.appendChild(desc);
    }
    if (data.steps) {
      data.steps.forEach(function(s, i) {
        var step = document.createElement('div');
        step.className = 'plan-step';
        step.style.animationDelay = (i * 0.06) + 's';
        step.innerHTML = '<span class="plan-step-num">' + (i + 1) + '</span><span style="color:rgba(255,255,255,0.8)">' + s + '</span>';
        div.appendChild(step);
      });
    }
    if (data.filesToModify || data.filesToCreate) {
      var files = document.createElement('div');
      files.className = 'plan-files';
      (data.filesToModify || []).forEach(function(f) {
        var tag = document.createElement('span');
        tag.className = 'plan-file-tag';
        tag.textContent = '📝 ' + f;
        files.appendChild(tag);
      });
      (data.filesToCreate || []).forEach(function(f) {
        var tag = document.createElement('span');
        tag.className = 'plan-file-tag';
        tag.textContent = '➕ ' + f;
        files.appendChild(tag);
      });
      div.appendChild(files);
    }
    if (data.risks) {
      var risk = document.createElement('div');
      risk.className = 'plan-risk';
      risk.textContent = '⚠️ ' + data.risks;
      div.appendChild(risk);
    }
    return div;
  }

  function addAIMessage(content, extra) {
    // Remove welcome
    var welcome = messagesEl.querySelector('.welcome');
    if (welcome) welcome.remove();

    var msg = document.createElement('div');
    msg.className = 'msg ai';

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'B';

    var body = document.createElement('div');
    body.className = 'msg-body';

    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (extra && extra.richData) {
      bubble.appendChild(createRichResult(extra.richData));
    } else if (extra && extra.planData) {
      bubble.appendChild(createPlanCard(extra.planData));
    } else {
      bubble.innerHTML = renderMarkdown(content || '');
    }

    body.appendChild(bubble);

    var metaDiv = document.createElement('div');
    metaDiv.className = 'msg-meta';
    var time = document.createElement('span');
    time.className = 'msg-time';
    time.textContent = timeStr();
    metaDiv.appendChild(time);

    if (extra && extra.meta && extra.meta.provider) {
      var prov = document.createElement('span');
      prov.className = 'msg-provider';
      prov.textContent = extra.meta.provider + '/' + (extra.meta.model || '');
      metaDiv.appendChild(prov);
    }

    body.appendChild(metaDiv);
    msg.appendChild(avatar);
    msg.appendChild(body);
    messagesEl.appendChild(msg);
    scrollToBottom();

    // Action buttons
    if (extra && (extra.showCommitBtn || extra.showPlanBtns)) {
      pendingAction = extra.showCommitBtn ? 'commit' : 'plan';
      var btns = document.createElement('div');
      btns.className = 'action-btns';
      btns.id = 'action-btns';
      var commitLabel = pendingAction === 'commit' ? '✅ Commitar alterações' : '🚀 Executar plano';
      var commitAction = pendingAction === 'commit' ? 'commit_proposal' : 'execute_plan';
      var discardAction = pendingAction === 'commit' ? 'discard_proposal' : 'discard_plan';
      btns.innerHTML = '<button class="btn-commit" id="btn-action-go">' + commitLabel + '</button><button class="btn-discard" id="btn-action-discard">❌ Descartar</button>';
      messagesEl.appendChild(btns);
      document.getElementById('btn-action-go').onclick = function() {
        postToParent('chat:action', { action: commitAction });
        btns.remove();
      };
      document.getElementById('btn-action-discard').onclick = function() {
        postToParent('chat:action', { action: discardAction });
        btns.remove();
      };
      scrollToBottom();
    }
  }

  function addUserMessage(text) {
    var welcome = messagesEl.querySelector('.welcome');
    if (welcome) welcome.remove();
    var el = createMsgEl('user', text);
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function showTyping() {
    var existing = document.getElementById('typing-indicator');
    if (existing) return;
    var msg = document.createElement('div');
    msg.className = 'msg ai';
    msg.id = 'typing-indicator';
    msg.innerHTML = '<div class="msg-avatar">B</div><div class="msg-body"><div class="msg-bubble"><div class="typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>';
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function startStreaming() {
    hideTyping();
    var welcome = messagesEl.querySelector('.welcome');
    if (welcome) welcome.remove();
    var msg = document.createElement('div');
    msg.className = 'msg ai';
    msg.id = 'streaming-msg';
    msg.innerHTML = '<div class="msg-avatar">B</div><div class="msg-body"><div class="msg-bubble" id="streaming-bubble"><div class="typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>';
    messagesEl.appendChild(msg);
    streamingEl = document.getElementById('streaming-bubble');
    scrollToBottom();
  }

  function appendStreamDelta(delta) {
    if (!streamingEl) return;
    if (!streamingEl._text) {
      streamingEl._text = '';
      streamingEl.innerHTML = '';
    }
    streamingEl._text += delta;
    streamingEl.innerHTML = renderMarkdown(streamingEl._text);
    scrollToBottom();
  }

  function endStreaming(meta) {
    if (streamingEl) {
      var msgEl = document.getElementById('streaming-msg');
      if (msgEl) msgEl.removeAttribute('id');
      if (meta && meta.provider) {
        var body = streamingEl.parentElement;
        var metaDiv = document.createElement('div');
        metaDiv.className = 'msg-meta';
        var time = document.createElement('span');
        time.className = 'msg-time';
        time.textContent = timeStr();
        metaDiv.appendChild(time);
        var prov = document.createElement('span');
        prov.className = 'msg-provider';
        prov.textContent = meta.provider + '/' + (meta.model || '');
        metaDiv.appendChild(prov);
        body.appendChild(metaDiv);
      }
      streamingEl = null;
    }
    isLoading = false;
  }

  function showProgress(message) {
    var container = document.getElementById('progress-container');
    if (!container) {
      var msg = document.createElement('div');
      msg.className = 'msg ai';
      msg.id = 'progress-msg';
      msg.innerHTML = '<div class="msg-avatar">B</div><div class="msg-body"><div class="msg-bubble"><div class="progress-steps" id="progress-container"></div></div></div>';
      messagesEl.appendChild(msg);
      container = document.getElementById('progress-container');
    }
    var step = document.createElement('div');
    step.className = 'progress-step';
    step.innerHTML = '<span class="progress-dot">⚡</span>' + message;
    container.appendChild(step);
    scrollToBottom();
  }

  function clearProgress() {
    var el = document.getElementById('progress-msg');
    if (el) el.remove();
  }

  // postMessage to parent (shell)
  function postToParent(type, payload) {
    window.parent.postMessage({ type: type, payload: payload || {} }, '*');
  }

  // Send message
  function handleSend() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;
    addUserMessage(text);
    inputEl.value = '';
    inputEl.style.height = 'auto';
    isLoading = true;
    postToParent('chat:user_send', { message: text });
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  inputEl.addEventListener('input', function() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + 'px';
  });

  // Listen for messages from parent shell
  window.addEventListener('message', function(event) {
    var data = event.data || {};
    var type = data.type;
    var payload = data.payload || {};

    switch (type) {
      case 'chat:ai_message':
        hideTyping();
        isLoading = false;
        addAIMessage(payload.content, payload);
        break;
      case 'chat:stream_start':
        isLoading = true;
        startStreaming();
        break;
      case 'chat:stream_delta':
        appendStreamDelta(payload.delta);
        break;
      case 'chat:stream_end':
        endStreaming(payload.meta);
        break;
      case 'chat:stream_error':
        if (streamingEl) {
          if (!streamingEl._text) streamingEl.innerHTML = '';
          streamingEl.innerHTML += '<div style="color:var(--error)">❌ ' + (payload.error || 'Erro') + '</div>';
          streamingEl = null;
        }
        isLoading = false;
        break;
      case 'chat:progress':
        showProgress(payload.message);
        break;
      case 'chat:progress_end':
        clearProgress();
        break;
      case 'chat:typing':
        if (payload.show) showTyping(); else hideTyping();
        isLoading = !!payload.show;
        break;
      case 'chat:clear':
        messagesEl.innerHTML = '';
        break;
      case 'chat:action_dismissed':
        var ab = document.getElementById('action-btns');
        if (ab) ab.remove();
        pendingAction = null;
        break;
    }
  });

  // Signal parent that we're ready
  postToParent('chat:ready');
})();
<\/script>
</body>
</html>`;

export default function ExtensionFront() {
  const [html, setHtml] = useState('');
  const [htmlV7, setHtmlV7] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingV7, setLoadingV7] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingV7, setSavingV7] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [version, setVersion] = useState<'v5' | 'v7'>('v7');
  const [previewTemplates, setPreviewTemplates] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    code: string;
    image_url: string | null;
    video_url: string | null;
    category: string | null;
  }>>([]);
  const { toast } = useToast();
  const { isDownloading, progress, status, downloadExtension } = useExtensionDownload();
  const { isDownloading: isDownloadingV7, progress: progressV7, status: statusV7, downloadExtension: downloadExtensionV7 } = useExtensionV7Download();

  useEffect(() => {
    loadHtml();
    loadHtmlV7();
    loadPreviewTemplates();
  }, []);

  async function loadHtml() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'extension_front_html')
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        const isOldTemplate = data.value.includes('waitForBridge') || (data.value.includes('--bg:') && !data.value.includes('bridge._call'));
        if (isOldTemplate) {
          setHtml(DEFAULT_TEMPLATE);
          await supabase.from('system_config').update({ value: DEFAULT_TEMPLATE, updated_at: new Date().toISOString() }).eq('key', 'extension_front_html');
          toast({ title: 'Template v5 atualizado', description: 'HTML antigo substituído pelo template compatível.' });
        } else {
          let upgraded = data.value;
          // Auto-inject watermark removal badge if missing
          if (!upgraded.includes('removeWatermarkBtn')) {
            // Force update to new template with badge
            upgraded = DEFAULT_TEMPLATE;
            setHtml(upgraded);
            await supabase.from('system_config').update({ value: upgraded, updated_at: new Date().toISOString() }).eq('key', 'extension_front_html');
            toast({ title: 'Template v5 atualizado', description: 'Badge "Tirar Marca d\'Água" adicionado.' });
          } else {
            setHtml(upgraded);
          }
        }
      } else {
        setHtml(DEFAULT_TEMPLATE);
        await supabase.from('system_config').insert({ key: 'extension_front_html', value: DEFAULT_TEMPLATE, description: 'HTML da interface remota da extensão v5' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao carregar v5', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function loadHtmlV7() {
    setLoadingV7(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'extension_front_html_v7')
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        setHtmlV7(data.value);
      } else {
        setHtmlV7(DEFAULT_V7_TEMPLATE);
        await supabase.from('system_config').insert({ key: 'extension_front_html_v7', value: DEFAULT_V7_TEMPLATE, description: 'HTML do chat da extensão v7 (postMessage)' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao carregar v7', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingV7(false);
    }
  }

  async function saveHtml() {
    setSaving(true);
    try {
      const { error } = await supabase.from('system_config').update({ value: html, updated_at: new Date().toISOString() }).eq('key', 'extension_front_html');
      if (error) throw error;
      toast({ title: 'Salvo!', description: 'HTML v5 atualizado.' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function saveHtmlV7() {
    setSavingV7(true);
    try {
      const { data } = await supabase.from('system_config').select('id').eq('key', 'extension_front_html_v7').maybeSingle();
      if (data) {
        const { error } = await supabase.from('system_config').update({ value: htmlV7, updated_at: new Date().toISOString() }).eq('key', 'extension_front_html_v7');
        if (error) throw error;
      } else {
        const { error } = await supabase.from('system_config').insert({ key: 'extension_front_html_v7', value: htmlV7, description: 'HTML do chat da extensão v7 (postMessage)' });
        if (error) throw error;
      }
      toast({ title: 'Salvo!', description: 'HTML v7 atualizado.' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSavingV7(false);
    }
  }

  async function loadPreviewTemplates() {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name, description, code, image_url, video_url, category')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setPreviewTemplates(data ?? []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar templates', description: err.message, variant: 'destructive' });
    }
  }

  function restoreDefault() {
    if (version === 'v5') {
      setHtml(DEFAULT_TEMPLATE);
    } else {
      setHtmlV7(DEFAULT_V7_TEMPLATE);
    }
    toast({ title: 'Template restaurado', description: 'Clique em Salvar para aplicar.' });
  }

  const currentHtml = version === 'v5' ? html : htmlV7;
  const currentLoading = version === 'v5' ? loading : loadingV7;
  const currentSaving = version === 'v5' ? saving : savingV7;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Front da Extensão</h1>
            <p className="text-muted-foreground text-sm">
              Edite o HTML remoto carregado pela extensão
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={restoreDefault}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar Padrão
            </Button>
            {version === 'v5' ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" size="sm" 
                  onClick={downloadExtension} 
                  disabled={isDownloading && status !== 'done'}
                  className={`transition-all duration-300 ${status === 'done' ? 'border-green-500 text-green-500' : ''}`}
                >
                  {status === 'done' ? <><Check className="h-4 w-4 mr-1" />Pronto!</> : 
                   status === 'idle' ? <><Download className="h-4 w-4 mr-1" />Baixar v5</> :
                   <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{progress}%</>}
                </Button>
                {isDownloading && status !== 'idle' && (
                  <Progress value={progress} className="h-2 w-24 animate-fade-in" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" size="sm" 
                  onClick={downloadExtensionV7} 
                  disabled={isDownloadingV7 && statusV7 !== 'done'}
                  className={`transition-all duration-300 ${statusV7 === 'done' ? 'border-green-500 text-green-500' : ''}`}
                >
                  {statusV7 === 'done' ? <><Check className="h-4 w-4 mr-1" />Pronto!</> : 
                   statusV7 === 'idle' ? <><Download className="h-4 w-4 mr-1" />Baixar v7</> :
                   <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{progressV7}%</>}
                </Button>
                {isDownloadingV7 && statusV7 !== 'idle' && (
                  <Progress value={progressV7} className="h-2 w-24 animate-fade-in" />
                )}
              </div>
            )}
            <Button size="sm" onClick={version === 'v5' ? saveHtml : saveHtmlV7} disabled={currentSaving || currentLoading}>
              <Save className="h-4 w-4 mr-1" />
              {currentSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* Version selector */}
        <div className="flex gap-2">
          <Button
            variant={version === 'v5' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVersion('v5')}
          >
            📦 Extensão v5 (Painel)
          </Button>
          <Button
            variant={version === 'v7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVersion('v7')}
          >
            🚀 Extensão v7 (Chat IA)
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="editor">
              <Code className="h-4 w-4 mr-1" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {version === 'v5' ? 'HTML Remoto v5 (Painel Lovable)' : 'HTML Chat v7 (postMessage)'}
                </CardTitle>
                <CardDescription>
                  {version === 'v5' 
                    ? 'HTML servido pela Edge Function para a extensão v5. Inclui o SDK bridge.'
                    : 'HTML do chat renderizado no iframe da v7. Comunica via postMessage com o shell.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentLoading ? (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">
                    Carregando...
                  </div>
                ) : (
                  <Textarea
                    value={version === 'v5' ? html : htmlV7}
                    onChange={(e) => version === 'v5' ? setHtml(e.target.value) : setHtmlV7(e.target.value)}
                    className="font-mono text-xs min-h-[600px] resize-y"
                    spellCheck={false}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview {version === 'v7' ? 'Chat v7' : 'v5'}</CardTitle>
                <CardDescription>
                  {version === 'v5' ? 'Preview da interface remota (bridge mockado)' : 'Preview do chat v7 (postMessage mockado)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg overflow-hidden mx-auto w-full max-w-[400px]" style={{ height: 700 }}>
                  {version === 'v5' ? (
                    <iframe
                      srcDoc={(() => {
                        const realTemplates = JSON.stringify(previewTemplates);
                        const withoutScript = html.replace(/<script[^>]*src=["']remote-ui\.js["'][^>]*>\s*<\/script>/gi, '');
                        const inlineScript = `<script>
window.bridge = {
  _call: function(cmd) {
    if (cmd === 'templates.getAll') return Promise.resolve({ templates: ${realTemplates} });
    if (cmd === 'storage.get') return Promise.resolve({});
    if (cmd === 'storage.set') return Promise.resolve();
    if (cmd === 'license.getInfo') return Promise.resolve({ licenseInfo: { days_remaining: 30 } });
    if (cmd === 'project.getActive') return Promise.resolve({ projectId: 'preview-mock-id' });
    if (cmd === 'lovable.sendMessage') return Promise.resolve({ reply: 'Preview: mensagem recebida' });
    if (cmd === 'lovable.publish') return Promise.resolve({ success: true });
    return Promise.resolve({});
  },
  storage: { get: function() { return window.bridge._call('storage.get'); }, set: function() { return Promise.resolve(); } },
  auth: { getToken: function() { return Promise.resolve({ token: 'mock', sessionId: 'mock' }); } },
  project: { getActive: function() { return window.bridge._call('project.getActive'); } },
  license: { getInfo: function() { return window.bridge._call('license.getInfo'); }, revalidate: function() { return Promise.resolve({ valid: true }); }, logout: function() { return Promise.resolve(); } },
  lovable: { sendMessage: function() { return window.bridge._call('lovable.sendMessage'); }, publish: function() { return window.bridge._call('lovable.publish'); }, downloadProject: function() { return Promise.resolve({ success: true }); } },
  templates: { getAll: function() { return window.bridge._call('templates.getAll'); } },
  runtime: { openUrl: function() { return Promise.resolve(); } },
};
var history = [];
var historyEl = document.getElementById('history');
var messageEl = document.getElementById('message');
var sendBtn = document.getElementById('sendBtn');
function addMessage(role, content) {
  history.push({ role: role, content: content });
  if (history.length > 50) history.shift();
  renderHistory();
}
function renderHistory() {
  if (!historyEl) return;
  historyEl.innerHTML = '';
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="empty-state"><h3>Pronto para começar</h3><p>Envie uma mensagem para interagir</p></div>';
    return;
  }
  history.forEach(function(m) {
    var w = document.createElement('div');
    w.className = 'message-wrapper ' + m.role;
    var b = document.createElement('div');
    b.className = 'bubble ' + m.role;
    b.textContent = m.content;
    w.appendChild(b);
    historyEl.appendChild(w);
  });
  historyEl.scrollTop = historyEl.scrollHeight;
}
var tabChat = document.getElementById('tabChat');
var tabTemplates = document.getElementById('tabTemplates');
var chatPanel = document.getElementById('chatPanel');
var templatesPanel = document.getElementById('templatesPanel');
var templatesLoaded = false;
function switchTab(tab) {
  if (tab === 'chat') {
    tabChat && tabChat.classList.add('active');
    tabTemplates && tabTemplates.classList.remove('active');
    chatPanel && chatPanel.classList.remove('hidden');
    templatesPanel && templatesPanel.classList.remove('visible');
  } else {
    tabTemplates && tabTemplates.classList.add('active');
    tabChat && tabChat.classList.remove('active');
    chatPanel && chatPanel.classList.add('hidden');
    templatesPanel && templatesPanel.classList.add('visible');
    if (!templatesLoaded) loadTemplates();
  }
}
tabChat && tabChat.addEventListener('click', function() { switchTab('chat'); });
tabTemplates && tabTemplates.addEventListener('click', function() { switchTab('templates'); });
function loadTemplates() {
  bridge.templates.getAll().then(function(result) {
    templatesLoaded = true;
    renderTemplateCards((result && result.templates) || []);
  });
}
function renderTemplateCards(templates) {
  if (!templatesPanel) return;
  templatesPanel.innerHTML = '';
  if (templates.length === 0) { templatesPanel.innerHTML = '<div class="templates-empty"><p>Nenhum template</p></div>'; return; }
  templates.forEach(function(t) {
    var card = document.createElement('div'); card.className = 'template-card';
    var thumb = document.createElement('div'); thumb.className = 'template-thumb';
    if (t.image_url) { var img = document.createElement('img'); img.src = t.image_url; thumb.appendChild(img); } else { thumb.textContent = '📄'; }
    card.appendChild(thumb);
    var bottom = document.createElement('div'); bottom.className = 'template-bottom';
    var info = document.createElement('div'); info.className = 'template-info';
    var name = document.createElement('div'); name.className = 'template-name'; name.textContent = t.name; info.appendChild(name);
    if (t.description) { var desc = document.createElement('div'); desc.className = 'template-desc'; desc.textContent = t.description; info.appendChild(desc); }
    bottom.appendChild(info);
    card.appendChild(bottom);
    card.addEventListener('click', function() { switchTab('chat'); if (messageEl) { messageEl.value = t.code; messageEl.focus(); } });
    templatesPanel.appendChild(card);
  });
}
if (sendBtn) sendBtn.addEventListener('click', function() {
  var text = messageEl && messageEl.value && messageEl.value.trim();
  if (!text) return;
  addMessage('user', text);
  messageEl.value = '';
  bridge.lovable.sendMessage(text).then(function(r) { addMessage('bot', (r && r.reply) || '✅ Processado!'); });
});
if (messageEl) messageEl.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn && sendBtn.click(); }
});
var licenseInfoEl = document.getElementById('licenseInfo');
if (licenseInfoEl) licenseInfoEl.textContent = '30 dias';
</script>`;
                        return withoutScript.replace('</body>', inlineScript + '</body>');
                      })()}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Extension Preview v5"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : (
                    <iframe
                      srcDoc={(() => {
                        // For v7 preview, inject a mock postMessage responder
                        const mockScript = `<script>
// Intercept postToParent so messages stay inside the iframe for preview
var _origParentPost = window.parent.postMessage.bind(window.parent);
window.parent.postMessage = function(data, origin) {
  // Forward to self so the mock handler below receives it
  window.postMessage(data, '*');
};

window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'chat:user_send') {
    var msg = e.data.payload.message;
    setTimeout(function() {
      window.postMessage({ type: 'chat:stream_start', payload: {} }, '*');
      var response = '✅ Preview: recebi sua mensagem "' + msg.substring(0, 50) + '"\\n\\nEste é um **preview** do chat v7. No ambiente real, a resposta viria da IA via streaming.';
      var words = response.split(' ');
      var i = 0;
      var iv = setInterval(function() {
        if (i >= words.length) {
          clearInterval(iv);
          window.postMessage({ type: 'chat:stream_end', payload: { meta: { provider: 'preview', model: 'mock' } } }, '*');
          return;
        }
        window.postMessage({ type: 'chat:stream_delta', payload: { delta: (i > 0 ? ' ' : '') + words[i] } }, '*');
        i++;
      }, 50);
    }, 500);
  }
});
</script>`;
                        return htmlV7.replace('</body>', mockScript + '</body>');
                      })()}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Chat Preview v7"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
