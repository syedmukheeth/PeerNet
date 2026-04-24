const fs = require('fs');
const filePath = 'e:/PeerNet/frontend/src/index.css';
let content = fs.readFileSync(filePath, 'utf8');

// The Definitive Sanitizer - Keep only the core system (Instagram layout, tokens, etc.)
// Anything containing "dm-" is purged.
let lines = content.split('\n');
let cleanLines = lines.filter(line => !line.includes('.dm-') && !line.includes('dm-'));

const messagingCSS = `
/* ═══════════════════════════════════════════════════════════
   PeerNet - OFFICIAL MESSAGING SYSTEM v1.0
   The definitive, production-hardened design system.
   ═══════════════════════════════════════════════════════════ */

/* 1. Root & Layout */
.dm-premium-container {
  display: flex !important;
  height: 100vh !important;
  width: 100% !important;
  background: #000 !important;
  color: #fff !important;
  overflow: hidden !important;
}

.dm-premium-content {
  display: flex !important;
  flex: 1 !important;
  height: 100% !important;
  min-width: 0 !important;
}

/* 2. Sidebar (The List Panel) */
.dm-list-panel {
  width: 380px !important;
  min-width: 380px !important;
  display: flex !important;
  flex-direction: column !important;
  background: #000 !important;
  border-right: 1px solid rgba(255,255,255,0.1) !important;
  height: 100% !important;
}

.dm-list-header {
  padding: 40px 24px 20px !important;
}

.dm-list-header-top {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 24px !important;
}

.dm-list-title {
  font-family: var(--font-display) !important;
  font-size: 28px !important;
  font-weight: 900 !important;
  letter-spacing: -0.06em !important;
  margin: 0 !important;
}

.dm-new-btn {
  width: 40px !important;
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: rgba(255,255,255,0.05) !important;
  transition: 0.2s !important;
}

.dm-new-btn:hover { background: rgba(255,255,255,0.1) !important; }

.dm-search-wrap {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
}

.dm-search-icon {
  position: absolute !important;
  left: 14px !important;
  color: #71717a !important;
  z-index: 5 !important;
}

.dm-search-input {
  width: 100% !important;
  background: #121214 !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 12px !important;
  padding: 12px 12px 12px 42px !important;
  color: #fff !important;
  font-size: 15px !important;
}

.dm-list-scroll {
  flex: 1 !important;
  overflow-y: auto !important;
}

.dm-convo-item {
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 14px 24px !important;
  cursor: pointer !important;
  transition: 0.2s !important;
}

.dm-convo-item:hover { background: rgba(255,255,255,0.03) !important; }
.dm-convo-item.active { background: rgba(124, 58, 237, 0.1) !important; }

.dm-avatar {
  width: 56px !important;
  height: 56px !important;
  border-radius: 50% !important;
  object-fit: cover !important;
}

.dm-convo-info { min-width: 0 !important; flex: 1 !important; }
.dm-convo-row { display: flex !important; justify-content: space-between !important; align-items: center !important; }
.dm-username { font-weight: 700 !important; color: #fff !important; font-size: 15px !important; }
.dm-last-msg { color: #a1a1aa !important; font-size: 13px !important; margin: 0 !important; }

/* 3. Chat Area (The Main Root) */
.dm-chat-area-root {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  background: #000 !important;
  min-width: 0 !important;
  height: 100% !important;
}

.dm-chat-header {
  height: 72px !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 24px !important;
  border-bottom: 1px solid rgba(255,255,255,0.08) !important;
  background: rgba(0,0,0,0.8) !important;
  backdrop-filter: blur(20px) !important;
}

.dm-avatar-sm {
  width: 44px !important;
  height: 44px !important;
  border-radius: 50% !important;
  object-fit: cover !important;
}

.dm-header-user { display: flex !important; align-items: center !important; gap: 12px !important; cursor: pointer !important; }
.dm-user-name { font-weight: 700 !important; color: #fff !important; font-size: 16px !important; }

.dm-messages-scroll {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 20px 0 !important;
}

.dm-messages-inner {
  max-width: 900px !important;
  margin: 0 auto !important;
  padding: 0 40px !important;
  display: flex !important;
  flex-direction: column !important;
}

.dm-messages-header-info {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  padding: 60px 0 40px !important;
  text-align: center !important;
}

.dm-info-avatar {
  width: 110px !important;
  height: 110px !important;
  border-radius: 50% !important;
  margin-bottom: 16px !important;
  border: 4px solid #121214 !important;
}

/* 4. Bubbles - Perfect Pill */
.dm-message-row { 
  display: flex !important; 
  width: 100% !important; 
  margin-bottom: 8px !important; 
  gap: 12px !important;
}
.dm-message-row.self { justify-content: flex-end !important; }
.dm-message-row.peer { justify-content: flex-start !important; }

.dm-bubble {
  padding: 12px 18px !important;
  font-size: 15px !important;
  line-height: 1.5 !important;
  max-width: 75% !important;
  position: relative !important;
}

.dm-bubble-primary {
  background: linear-gradient(135deg, #7C3AED, #6366F1) !important;
  color: #fff !important;
  border-radius: 22px 22px 4px 22px !important;
}

.dm-bubble-secondary {
  background: #18181b !important;
  color: #fff !important;
  border-radius: 22px 22px 22px 4px !important;
}

.dm-bubble-avatar {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  align-self: flex-end !important;
  margin-bottom: 4px !important;
}

.dm-message-meta {
  font-size: 11px !important;
  color: #71717a !important;
  margin-top: 4px !important;
  font-weight: 600 !important;
}

/* 5. Composer - High Density Pill */
.dm-composer-root {
  padding: 24px 40px 40px !important;
  background: #000 !important;
}

.dm-composer-main-pill {
  display: flex !important;
  align-items: center !important;
  background: #09090b !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 40px !important;
  padding: 8px 10px 8px 24px !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
}

.dm-textarea-pill {
  flex: 1 !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: #fff !important;
  font-size: 16px !important;
  padding: 10px 0 !important;
  resize: none !important;
  max-height: 160px !important;
}

.dm-send-btn-pill {
  width: 52px !important;
  height: 52px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #7C3AED, #6366F1) !important;
  color: #fff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: none !important;
  cursor: pointer !important;
  transition: 0.2s !important;
}

.dm-send-btn-pill:hover:not(:disabled) { transform: scale(1.05) !important; }

/* 6. Mobile Helpers */
@media (max-width: 768px) {
  .dm-list-panel { width: 100% !important; position: absolute !important; inset: 0 !important; z-index: 100 !important; }
  .dm-list-mobile-hidden { display: none !important; }
  .dm-chat-mobile-hidden { display: none !important; }
}
`;

fs.writeFileSync(filePath, cleanLines.join('\n').trim() + '\n' + messagingCSS);
console.log('Successfully applied PeerNet OFFICIAL MESSAGING SYSTEM v1.0');
