import { BaseWindow } from '../base-window.js?v=cache-bust-005';
import { UI_COLORS } from './constants.js?v=cache-bust-005';

export class PrivateMessageWindow extends BaseWindow {
  constructor() {
    super('pm-window', 'Private Messages', { width: 550, height: 400, x: 200, y: 200 });
    this.setContent(`
      <div style="display: flex; height: 100%; gap: 10px; padding: 5px;">
        <!-- Conversations List -->
        <div style="flex: 1; border-right: 1px solid var(--text-dim); display: flex; flex-direction: column; gap: 5px; overflow-y: auto; padding-right: 5px;" id="pm-convo-list">
          <div style="color: var(--text-dim); text-align: center; margin-top: 10px; font-family: var(--font-mono); font-size: 0.8rem;">No active chats</div>
        </div>
        <!-- Chat Area -->
        <div style="flex: 2.5; display: flex; flex-direction: column; gap: 5px;">
          <div id="pm-chat-history" style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid var(--text-dim); border-radius: 4px; padding: 8px; overflow-y: auto; font-family: var(--font-mono); font-size: 0.85rem; display: flex; flex-direction: column; gap: 5px;">
            <div style="color: var(--text-dim); text-align: center; margin-top: auto; margin-bottom: auto;">Select a conversation to start chatting.</div>
          </div>
          <div style="display: flex; gap: 5px;">
            <input type="text" id="pm-chat-input" class="b-input" style="flex: 1; font-family: var(--font-mono);" placeholder="Type a message..." disabled>
            <button id="pm-chat-send" class="b-btn btn-primary" disabled>Send</button>
          </div>
        </div>
      </div>
    `);
  }
}

export class PrivateMessageUIManager {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.window = new PrivateMessageWindow();
    this.conversations = {};
    this.activePartner = null;

    this.setupUI();
  }

  setupUI() {
    this.els = {
      convoList: document.getElementById('pm-convo-list'),
      history: document.getElementById('pm-chat-history'),
      input: document.getElementById('pm-chat-input'),
      sendBtn: document.getElementById('pm-chat-send')
    };

    const sendMessage = () => {
      if (!this.activePartner) return;
      const text = this.els.input.value.trim();
      if (text) {
        this.engine.chat.commandHandler.processCommand('/pm ' + this.activePartner + ' ' + text);
        this.els.input.value = '';
        this.els.input.focus();
      }
    };

    if (this.els.sendBtn) this.els.sendBtn.onclick = sendMessage;
    if (this.els.input) {
      this.els.input.onkeydown = (e) => {
        if (e.key === 'Enter') sendMessage();
      };
    }

    const sideHud = document.querySelector('.game-side-hud');
    if (sideHud && !document.getElementById('btn-pm-window')) {
      const btn = document.createElement('button');
      btn.id = 'btn-pm-window';
      btn.className = 'btn-secondary';
      btn.style.cssText = `width: auto; padding: 0 10px; height: 45px; font-weight: bold; background: rgba(0,0,0,0.8); border-color: ${UI_COLORS.pink}; color: ${UI_COLORS.pink}; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background 0.2s;`;
      btn.innerText = 'PMs';
      btn.title = 'Private Messages';
      btn.onclick = () => {
        if (this.window.element.style.display === 'none') {
          this.window.open();
          if (!this.activePartner && Object.keys(this.conversations).length > 0) {
             this.activePartner = this.conversations[Object.keys(this.conversations)[0]].displayName;
          }
          this.renderConvoList();
          this.renderHistory();
        } else {
          this.window.close();
        }
      };
      btn.onmouseenter = () => btn.style.background = 'rgba(224, 86, 253, 0.2)';
      btn.onmouseleave = () => btn.style.background = 'rgba(0,0,0,0.8)';

      const btnPlayerList = document.getElementById('btn-player-list');
      if (btnPlayerList) sideHud.insertBefore(btn, btnPlayerList.nextSibling);
      else sideHud.appendChild(btn);
    }
  }

  addMessage(partnerName, senderName, text) {
    const key = partnerName.toLowerCase();
    if (!this.conversations[key]) {
      this.conversations[key] = { displayName: partnerName, messages: [], unread: 0 };
    }

    this.conversations[key].messages.push({
      sender: senderName,
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if (this.activePartner && this.activePartner.toLowerCase() === key && this.window.element.style.display !== 'none') {
      this.renderHistory();
    } else {
      this.conversations[key].unread++;
    }
    this.renderConvoList();
  }

  openConversation(partnerName) {
    if (this.window.element.style.display === 'none') this.window.open();
    const key = partnerName.toLowerCase();
    if (!this.conversations[key]) this.conversations[key] = { displayName: partnerName, messages: [], unread: 0 };
    this.activePartner = partnerName;
    this.conversations[key].unread = 0;
    this.renderConvoList();
    this.renderHistory();
    this.els.input.disabled = false;
    this.els.sendBtn.disabled = false;
    this.els.input.focus();
  }

  renderConvoList() {
    if (!this.els.convoList) return;
    this.els.convoList.innerHTML = '';
    Object.values(this.conversations).forEach(convo => {
      const btn = document.createElement('button');
      const isActive = this.activePartner && this.activePartner.toLowerCase() === convo.displayName.toLowerCase();
      btn.className = 'b-btn ' + (isActive ? 'btn-primary' : 'btn-secondary');
      btn.style.cssText = 'text-align: left; padding: 6px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; border-color: var(--text-dim); margin-bottom: 4px;';
      if (isActive) btn.style.borderColor = UI_COLORS.pink;
      let unreadBadge = convo.unread > 0 ? `<span style="background: ${UI_COLORS.error}; color: #fff; border-radius: 10px; padding: 2px 6px; font-size: 0.7rem; font-weight: bold;">${convo.unread}</span>` : '';
      btn.innerHTML = `<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${convo.displayName}</span> ${unreadBadge}`;
      btn.onclick = () => { this.activePartner = convo.displayName; convo.unread = 0; this.renderConvoList(); this.renderHistory(); this.els.input.disabled = false; this.els.sendBtn.disabled = false; };
      this.els.convoList.appendChild(btn);
    });
  }

  renderHistory() {
    if (!this.els.history || !this.activePartner) return;
    const convo = this.conversations[this.activePartner.toLowerCase()];
    this.window.setTitle('Private Messages - ' + convo.displayName);
    if (convo.messages.length === 0) { this.els.history.innerHTML = '<div style="color: var(--text-dim); text-align: center; margin-top: auto; margin-bottom: auto;">No messages yet. Say hi!</div>'; return; }
    this.els.history.innerHTML = '';
    convo.messages.forEach(msg => {
      const isSelf = msg.sender.toLowerCase() === this.engine.playerData.name.toLowerCase();
      const color = isSelf ? UI_COLORS.success : UI_COLORS.pink;
      const msgDiv = document.createElement('div'); msgDiv.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
      msgDiv.innerHTML = `<div style="font-size: 0.7rem; color: #aaa; display: flex; justify-content: space-between;"><span style="color: ${color}; font-weight: bold;">${msg.sender}</span><span>${msg.timestamp}</span></div><div style="color: #fff; word-wrap: break-word;">${msg.text}</div>`;
      this.els.history.appendChild(msgDiv);
    });
    this.els.history.scrollTop = this.els.history.scrollHeight;
  }
}
