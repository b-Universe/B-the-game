import { CHAT_CONFIG } from './chat-config.js?v=cache-bust-005';
import { CommandHandler } from './command-handler.js?v=cache-bust-005';

export class ChatManager {
  constructor(engine) {
    this.engine = engine;
    this.history = [];
    this.historyIndex = 0;
    this.sendChannel = CHAT_CONFIG.defaultSendChannel;
    this.input = document.getElementById('chat-input');
    this.dropdownListener = null;

    this.tabCompleting = false;
    this.tabMatches = [];
    this.tabIndex = 0;
    this.tabBase = '';
    this.commandHandler = new CommandHandler(engine, this);

    this.setupUI();
  }

  setupUI() {
    const btnChatChannel = document.getElementById('btn-chat-channel');
    const chatChannelDropdown = document.getElementById('chat-channel-dropdown');

    if (btnChatChannel && chatChannelDropdown) {
      btnChatChannel.addEventListener('click', (e) => {
        e.stopPropagation();
        chatChannelDropdown.style.display = chatChannelDropdown.style.display === 'none' ? 'flex' : 'none';
      });

      this.dropdownListener = (e) => {
        if (chatChannelDropdown.style.display === 'flex' && !e.target.closest('.chat-channel-selector')) {
          chatChannelDropdown.style.display = 'none';
        }
      };
      document.addEventListener('click', this.dropdownListener);

      chatChannelDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          this.sendChannel = e.target.dataset.channel;
          const config = CHAT_CONFIG.channels[this.sendChannel];
          btnChatChannel.innerText = config.label.substring(0, 3) + ' ▾';
          btnChatChannel.style.color = config.color;
          chatChannelDropdown.style.display = 'none';
          if (this.input) this.input.focus();
        });
      });
    }

    if (this.input) {
      this.input.addEventListener('focus', () => {
        if (this.engine.player) this.engine.player.isTyping = true;
        if (this.engine.network) this.engine.network.sendPlayerTyping(true);
      });

      this.input.addEventListener('blur', () => {
        if (this.engine.player) this.engine.player.isTyping = false;
        if (this.engine.network) this.engine.network.sendPlayerTyping(false);
      });

      this.input.onkeydown = (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const val = this.input.value;
          if (!this.tabCompleting) {
            this.tabCompleting = true;
            this.tabBase = val;
            this.tabMatches = this.commandHandler.handleTabComplete(val);
            this.tabIndex = 0;
            if (this.tabMatches.length === 0) this.tabCompleting = false;
          }
          if (this.tabCompleting && this.tabMatches.length > 0) {
            this.input.value = this.tabMatches[this.tabIndex];
            this.tabIndex = (this.tabIndex + 1) % this.tabMatches.length;
          }
          return;
        } else if (e.key !== 'Shift') {
          this.tabCompleting = false;
        }

        if (e.key === 'Enter') {
          e.stopPropagation();
          const msg = this.input.value.trim();
          if (msg) {
            if (this.history[this.history.length - 1] !== msg) this.history.push(msg);
            this.historyIndex = this.history.length;

            if (msg.startsWith('/')) {
              this.commandHandler.processCommand(msg);
            } else {
              this.addMessage(this.sendChannel, this.engine.playerData.name, msg);
              this.engine.network.sendChatMessage({ type: this.sendChannel, text: msg });
              if (!this.engine.player.chatBubbles) this.engine.player.chatBubbles = [];
              this.engine.player.chatBubbles.push({ text: msg, timer: 4000, opacity: 0 });
            }
            this.input.value = '';
          }
          this.input.blur();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (this.historyIndex > 0) {
            this.historyIndex--;
            this.input.value = this.history[this.historyIndex];
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.input.value = this.history[this.historyIndex];
          } else if (this.historyIndex === this.history.length - 1) {
            this.historyIndex++;
            this.input.value = '';
          }
        }
      };
    }
  }

  createMessageBase(type, name) {
    const channelConfig = CHAT_CONFIG.channels[type] || CHAT_CONFIG.channels.system;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    msgDiv.dataset.type = type;

    const typeSpan = document.createElement('span');
    typeSpan.className = 'chat-channel-tag';
    typeSpan.style.color = channelConfig.color;
    typeSpan.innerText = `[${channelConfig.label}] `;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-name';

    const isDev = name && this.engine.permissions?.dev && (this.engine.permissions.dev.includes('*') || this.engine.permissions.dev.includes(name.toLowerCase()));
    if (isDev) {
      nameSpan.classList.add('dev-user');
      nameSpan.innerText = `[DEV] ${name}`;
    } else if (name === 'System' || name === 'Combat') {
      nameSpan.style.color = channelConfig.color;
      nameSpan.innerText = name;
    } else {
      nameSpan.innerText = name;
    }

    msgDiv.appendChild(typeSpan);
    msgDiv.appendChild(nameSpan);
    return msgDiv;
  }

  addMessage(type, name, text) {
    const chatMsgs = document.getElementById('chat-messages');
    if (!chatMsgs) return;
    const msgDiv = this.createMessageBase(type, name);
    msgDiv.appendChild(document.createTextNode(`: ${text}`));
    chatMsgs.appendChild(msgDiv);
    while (chatMsgs.children.length > 50) {
      chatMsgs.removeChild(chatMsgs.firstChild);
    }
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  drawBubbles(ctx, x, y, bubbles) {
    if (!bubbles || bubbles.length === 0) return;

    ctx.save();
    ctx.font = 'bold 12px monospace';
    const maxWidth = 180;
    const lineHeight = 16;
    const padding = 8;
    const pointerHeight = 8;

    let currentTargetY = 0;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (!b.lines) {
        b.lines = this.wrapText(ctx, b.text, maxWidth);
        b.width = Math.max(...b.lines.map(l => ctx.measureText(l).width)) + padding * 2;
        b.height = b.lines.length * lineHeight + padding * 2;
      }

      b.targetY = currentTargetY;
      currentTargetY += b.height + 5;
    }

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, b.opacity || 1));

      const bubbleY = y - (b.currentY || 0) - pointerHeight;

      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - b.width / 2, bubbleY - b.height, b.width, b.height, 6);
      else ctx.rect(x - b.width / 2, bubbleY - b.height, b.width, b.height);
      ctx.fill();
      ctx.stroke();

      if (i === bubbles.length - 1) {
        ctx.beginPath();
        ctx.moveTo(x - 6, bubbleY);
        ctx.lineTo(x + 6, bubbleY);
        ctx.lineTo(x, bubbleY + pointerHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();


        ctx.beginPath();
        ctx.moveTo(x - 5, bubbleY - 2);
        ctx.lineTo(x + 5, bubbleY - 2);
        ctx.lineTo(x, bubbleY + pointerHeight - 2);
        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      ctx.fillStyle = '#111';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      b.lines.forEach((line, lineIndex) => {
        const lineY = bubbleY - b.height + padding + (lineIndex * lineHeight) + (lineHeight / 2);
        ctx.fillText(line, x, lineY);
      });
    }
    ctx.restore();
  }
}
