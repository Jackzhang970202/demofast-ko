/**
 * Claudeck 嵌入模式支持
 * 用于在 iframe 中只显示对话区域
 */

(function() {
  'use strict';

  // 检测嵌入模式
  const urlParams = new URLSearchParams(window.location.search);
  const embedMode = urlParams.get('embed');
  const cwd = urlParams.get('cwd');
  const projectId = urlParams.get('projectId');
  const token = urlParams.get('token');

  // 如果是嵌入模式
  if (embedMode === 'chat-only') {
    console.log('[Embed] Chat-only mode enabled');
    console.log('[Embed] cwd:', cwd);
    console.log('[Embed] projectId:', projectId);

    // 清除旧的 session 和 cwd，确保从新项目开始
    // 这必须在 sessions.js 模块加载前执行，否则 IIFE 会恢复错误的 sessionId
    localStorage.removeItem("claudeck-session-id");
    if (cwd) {
      localStorage.setItem("claudeck-cwd", cwd);
    }

    // 设置全局变量供 main.js 使用
    window.EMBED_CWD = cwd;
    window.EMBED_PROJECT_ID = projectId;
    window.EMBED_TOKEN = token;

    // 等待 DOM 加载完成
    document.addEventListener('DOMContentLoaded', function() {
      // 添加嵌入模式类
      document.body.classList.add('embed-chat-only');

      // 隐藏非对话区域
      const elementsToHide = [
        'header.top-header',
        '.sidebar',
        'aside.sidebar',
        '#sidebar',
        '#tips-feed-panel',
        '#right-panel',
        '#agent-sidebar',
        '#home-page',
        '.bot-bubble',           // Assistant Bot 按钮
        'claudeck-status-bar',   // 状态栏
        '.status-bar',           // 状态栏备用选择器
      ];

      elementsToHide.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          el.style.display = 'none';
        }
      });

      // 显示聊天区域
      const chatArea = document.querySelector('.chat-area-main');
      if (chatArea) {
        chatArea.classList.remove('hidden');
      }

      // 调整布局
      const layout = document.querySelector('.layout');
      if (layout) {
        layout.style.padding = '0';
        layout.style.margin = '0';
      }

      // 关闭欢迎页与占位空态
      localStorage.setItem('claudeck-welcome-seen', '1');
      const welcomeOverlay = document.getElementById('welcome-overlay');
      if (welcomeOverlay) {
        welcomeOverlay.classList.add('hidden');
        welcomeOverlay.remove();
      }
      const whalyPlaceholder = document.querySelector('.whaly-placeholder');
      if (whalyPlaceholder) {
        whalyPlaceholder.remove();
      }

      // 调整消息区域为 flex 布局，不写死高度
      const messagesEl = document.querySelector('#messages');
      if (messagesEl instanceof HTMLElement) {
        messagesEl.style.height = 'auto';
        messagesEl.style.flex = '1 1 auto';
        messagesEl.style.minHeight = '0';
        messagesEl.style.paddingBottom = '4px';
      }

      const chatAreaMain = document.querySelector('.chat-area-main');
      if (chatAreaMain instanceof HTMLElement) {
        chatAreaMain.style.display = 'flex';
        chatAreaMain.style.flexDirection = 'column';
        chatAreaMain.style.minHeight = '0';
      }

      const inputBar = document.querySelector('.input-bar');
      if (inputBar instanceof HTMLElement) {
        inputBar.style.flex = '0 0 auto';
      }

      const inputToolbar = document.querySelector('.input-toolbar');
      if (inputToolbar instanceof HTMLElement) {
        inputToolbar.style.display = 'flex';
      }

      const sendGroup = document.querySelector('.send-history-group');
      if (sendGroup instanceof HTMLElement) {
        sendGroup.style.position = 'absolute';
      }

      const inputWrap = document.querySelector('.input-textarea-wrap');
      if (inputWrap instanceof HTMLElement) {
        inputWrap.style.position = 'relative';
      }

      const input = document.getElementById('message-input');
      if (input instanceof HTMLTextAreaElement) {
        input.style.paddingRight = '52px';
      }

      const voiceIndicator = document.querySelector('.voice-recording-indicator');
      if (voiceIndicator instanceof HTMLElement) {
        voiceIndicator.style.display = 'none';
      }

      const inputWaiting = document.getElementById('input-waiting');
      if (inputWaiting instanceof HTMLElement) {
        inputWaiting.style.display = 'none';
      }

      if (messagesEl && messagesEl.children.length === 0) {
        messagesEl.innerHTML = '';
      }

      const topHeader = document.querySelector('.top-header');
      if (topHeader instanceof HTMLElement) {
        topHeader.style.display = 'none';
      }

      const sidebar = document.querySelector('.sidebar');
      if (sidebar instanceof HTMLElement) {
        sidebar.style.display = 'none';
      }

      const statusBar = document.querySelector('claudeck-status-bar');
      if (statusBar instanceof HTMLElement) {
        statusBar.style.display = 'none';
      }

      const botBubble = document.querySelector('.bot-bubble');
      if (botBubble instanceof HTMLElement) {
        botBubble.style.display = 'none';
      }

      const botPanel = document.querySelector('.bot-panel');
      if (botPanel instanceof HTMLElement) {
        botPanel.style.display = 'none';
      }

      const homePage = document.getElementById('home-page');
      if (homePage instanceof HTMLElement) {
        homePage.style.display = 'none';
      }

      const tipsPanel = document.getElementById('tips-feed-panel');
      if (tipsPanel instanceof HTMLElement) {
        tipsPanel.style.display = 'none';
      }

      const rightPanel = document.getElementById('right-panel');
      if (rightPanel instanceof HTMLElement) {
        rightPanel.style.display = 'none';
      }

      const agentSidebar = document.getElementById('agent-sidebar');
      if (agentSidebar instanceof HTMLElement) {
        agentSidebar.style.display = 'none';
      }

      const welcomeHost = document.querySelector('claudeck-welcome-overlay');
      if (welcomeHost instanceof HTMLElement && !welcomeHost.innerHTML.trim()) {
        welcomeHost.style.display = 'none';
      }

      const body = document.body;
      body.style.margin = '0';
      body.style.padding = '0';
      body.style.overflow = 'hidden';
      body.style.background = '#fff';

      const layout = document.querySelector('.layout');
      if (layout instanceof HTMLElement) {
        layout.style.height = '100vh';
        layout.style.padding = '0';
        layout.style.margin = '0';
      }

      const chatArea = document.querySelector('.chat-area');
      if (chatArea instanceof HTMLElement) {
        chatArea.style.height = '100vh';
      }

      const placeholder = document.querySelector('.whaly-placeholder');
      if (placeholder instanceof HTMLElement) {
        placeholder.style.display = 'none';
      }

      if (messagesEl instanceof HTMLElement && messagesEl.querySelector('.whaly-placeholder')) {
        messagesEl.querySelector('.whaly-placeholder')?.remove();
      }

      if (messagesEl instanceof HTMLElement && messagesEl.textContent?.trim() === '') {
        messagesEl.innerHTML = '';
      }

      const inputBarParent = inputBar?.parentElement;
      if (inputBarParent instanceof HTMLElement) {
        inputBarParent.style.display = 'flex';
        inputBarParent.style.flexDirection = 'column';
      }

      if (inputToolbar instanceof HTMLElement) {
        inputToolbar.style.marginTop = '6px';
      }

      if (sendGroup instanceof HTMLElement) {
        sendGroup.style.right = '14px';
        sendGroup.style.top = '10px';
        sendGroup.style.bottom = 'auto';
      }

      if (inputBar instanceof HTMLElement) {
        inputBar.style.padding = '4px 10px 6px';
      }

      if (input instanceof HTMLTextAreaElement) {
        input.style.height = '50px';
      }

      const inputStrip = document.getElementById('image-preview-strip');
      if (inputStrip instanceof HTMLElement) {
        inputStrip.style.margin = '0';
      }

      const slashAutocomplete = document.getElementById('slash-autocomplete');
      if (slashAutocomplete instanceof HTMLElement) {
        slashAutocomplete.style.bottom = '58px';
      }

      const historyPopover = document.getElementById('history-popover');
      if (historyPopover instanceof HTMLElement) {
        historyPopover.style.bottom = '58px';
      }

      const toolboxPanel = document.getElementById('toolbox-panel');
      if (toolboxPanel instanceof HTMLElement) {
        toolboxPanel.style.bottom = '58px';
      }

      const workflowPanel = document.getElementById('workflow-panel');
      if (workflowPanel instanceof HTMLElement) {
        workflowPanel.style.bottom = '58px';
      }

      const attachBadge = document.getElementById('attach-badge');
      if (attachBadge instanceof HTMLElement) {
        attachBadge.style.display = attachBadge.classList.contains('hidden') ? 'none' : '';
      }

      const sendBtn = document.getElementById('send-btn');
      if (sendBtn instanceof HTMLElement) {
        sendBtn.style.width = '34px';
        sendBtn.style.height = '34px';
      }

      const stopBtn = document.getElementById('stop-btn');
      if (stopBtn instanceof HTMLElement) {
        stopBtn.style.width = '34px';
        stopBtn.style.height = '34px';
      }

      const historyBtn = document.getElementById('history-btn');
      if (historyBtn instanceof HTMLElement) {
        historyBtn.style.display = 'none';
      }

      const sessionControls = document.getElementById('session-controls');
      if (sessionControls instanceof HTMLElement) {
        sessionControls.style.display = 'none';
      }

      const folderPicker = document.querySelector('.folder-picker');
      if (folderPicker instanceof HTMLElement) {
        folderPicker.style.display = 'none';
      }

      const sessionsSection = document.querySelector('.sessions-section');
      if (sessionsSection instanceof HTMLElement) {
        sessionsSection.style.display = 'none';
      }

      const sidebarBackdrop = document.getElementById('sidebar-backdrop');
      if (sidebarBackdrop instanceof HTMLElement) {
        sidebarBackdrop.style.display = 'none';
      }

      const rightPanelResize = document.getElementById('right-panel-resize');
      if (rightPanelResize instanceof HTMLElement) {
        rightPanelResize.style.display = 'none';
      }

      const tipsResize = document.getElementById('tips-feed-resize');
      if (tipsResize instanceof HTMLElement) {
        tipsResize.style.display = 'none';
      }

      const fileExplorerToolbar = document.querySelector('.file-explorer-toolbar');
      if (fileExplorerToolbar instanceof HTMLElement) {
        fileExplorerToolbar.style.display = 'none';
      }

      const toastContainer = document.getElementById('toast-container');
      if (toastContainer instanceof HTMLElement) {
        toastContainer.style.pointerEvents = 'none';
      }

      const inputMeta = document.querySelector('.input-meta');
      if (inputMeta instanceof HTMLElement) {
        inputMeta.style.display = 'flex';
      }

      const toolboxStrip = document.querySelector('.toolbox-strip');
      if (toolboxStrip instanceof HTMLElement) {
        toolboxStrip.style.display = 'flex';
      }

      const inputToolbarParent = inputToolbar?.parentElement;
      if (inputToolbarParent instanceof HTMLElement) {
        inputToolbarParent.style.display = 'block';
      }

      const inputBarTextareaWrap = document.querySelector('.input-textarea-wrap');
      if (inputBarTextareaWrap instanceof HTMLElement) {
        inputBarTextareaWrap.style.display = 'block';
      }

      const imageBtn = document.getElementById('image-btn');
      if (imageBtn instanceof HTMLElement) {
        imageBtn.style.display = '';
      }

      const attachBtn = document.getElementById('attach-btn');
      if (attachBtn instanceof HTMLElement) {
        attachBtn.style.display = '';
      }

      const agentBtn = document.getElementById('agent-btn');
      if (agentBtn instanceof HTMLElement) {
        agentBtn.style.display = '';
      }

      const micBtn = document.getElementById('mic-btn');
      if (micBtn instanceof HTMLElement) {
        micBtn.style.display = '';
      }

      const worktreeBtn = document.getElementById('worktree-btn');
      if (worktreeBtn instanceof HTMLElement) {
        worktreeBtn.style.display = '';
      }

      const toolboxBtn = document.getElementById('toolbox-btn');
      if (toolboxBtn instanceof HTMLElement) {
        toolboxBtn.style.display = '';
      }

      const messageInput = document.getElementById('message-input');
      if (messageInput instanceof HTMLTextAreaElement) {
        messageInput.style.paddingBottom = '10px';
      }

      const waiting = document.getElementById('input-waiting');
      if (waiting instanceof HTMLElement) {
        waiting.style.margin = '0';
      }

      const bodyWelcomeHost = document.querySelector('claudeck-welcome-overlay');
      if (bodyWelcomeHost instanceof HTMLElement) {
        bodyWelcomeHost.style.display = 'none';
      }

      const welcomeSeen = document.body.dataset.welcomeSeen;
      if (!welcomeSeen) {
        document.body.dataset.welcomeSeen = '1';
      }

      const root = document.documentElement;
      root.style.background = '#fff';

      const messages = document.querySelector('.messages');
      if (messages instanceof HTMLElement) {
        messages.style.background = '#fff';
      }

      const inputTextWrap = document.querySelector('.input-textarea-wrap');
      if (inputTextWrap instanceof HTMLElement) {
        inputTextWrap.style.minWidth = '0';
      }

      const inputBarNode = document.querySelector('.input-bar');
      if (inputBarNode instanceof HTMLElement) {
        inputBarNode.style.alignItems = 'stretch';
      }

      const inputToolbarNode = document.querySelector('.input-toolbar');
      if (inputToolbarNode instanceof HTMLElement) {
        inputToolbarNode.style.alignItems = 'center';
      }

      const sendGroupNode = document.querySelector('.send-history-group');
      if (sendGroupNode instanceof HTMLElement) {
        sendGroupNode.style.display = 'flex';
      }

      const toolbarStripNode = document.querySelector('.toolbox-strip');
      if (toolbarStripNode instanceof HTMLElement) {
        toolbarStripNode.style.flexWrap = 'wrap';
      }

      const inputMetaNode = document.querySelector('.input-meta');
      if (inputMetaNode instanceof HTMLElement) {
        inputMetaNode.style.flexWrap = 'wrap';
      }

      const messagesNode = document.getElementById('messages');
      if (messagesNode instanceof HTMLElement) {
        messagesNode.style.paddingTop = '8px';
      }

      const inputNode = document.getElementById('message-input');
      if (inputNode instanceof HTMLTextAreaElement) {
        inputNode.style.paddingTop = '12px';
      }

      const inputBarElement = document.querySelector('.input-bar');
      if (inputBarElement instanceof HTMLElement) {
        inputBarElement.style.marginTop = '0';
      }

      const toolboxPanelNode = document.getElementById('toolbox-panel');
      if (toolboxPanelNode instanceof HTMLElement) {
        toolboxPanelNode.style.maxHeight = '40vh';
      }

      const workflowPanelNode = document.getElementById('workflow-panel');
      if (workflowPanelNode instanceof HTMLElement) {
        workflowPanelNode.style.maxHeight = '40vh';
      }

      const imageStripNode = document.getElementById('image-preview-strip');
      if (imageStripNode instanceof HTMLElement) {
        imageStripNode.style.padding = '0';
      }

      const inputBarWrap = document.querySelector('.input-bar');
      if (inputBarWrap instanceof HTMLElement) {
        inputBarWrap.style.paddingBottom = '2px';
      }

      const textareaWrap = document.querySelector('.input-textarea-wrap');
      if (textareaWrap instanceof HTMLElement) {
        textareaWrap.style.paddingBottom = '0';
      }

      const messagesWrap = document.querySelector('.messages');
      if (messagesWrap instanceof HTMLElement) {
        messagesWrap.style.paddingBottom = '4px';
      }

      const bodyNode = document.body;
      bodyNode.classList.add('embed-chat-ready');

      const emptyMessages = document.querySelector('.messages:empty');
      if (emptyMessages instanceof HTMLElement) {
        emptyMessages.style.display = 'block';
      }

      const sendBtnNode = document.getElementById('send-btn');
      if (sendBtnNode instanceof HTMLElement) {
        sendBtnNode.style.borderRadius = '9999px';
      }

      const stopBtnNode = document.getElementById('stop-btn');
      if (stopBtnNode instanceof HTMLElement) {
        stopBtnNode.style.borderRadius = '9999px';
      }

      const inputToolbarMeta = document.querySelector('.input-meta-shortcuts');
      if (inputToolbarMeta instanceof HTMLElement) {
        inputToolbarMeta.style.display = 'flex';
      }

      const topHeaderNode = document.querySelector('.top-header');
      if (topHeaderNode instanceof HTMLElement) {
        topHeaderNode.style.display = 'none';
      }

      const sidebarNode = document.querySelector('.sidebar');
      if (sidebarNode instanceof HTMLElement) {
        sidebarNode.style.display = 'none';
      }

      const statusBarNode = document.querySelector('.status-bar');
      if (statusBarNode instanceof HTMLElement) {
        statusBarNode.style.display = 'none';
      }

      const messagesMain = document.querySelector('#messages');
      if (messagesMain instanceof HTMLElement) {
        messagesMain.style.marginTop = '0';
      }

      const inputToolbarSpacing = document.querySelector('.input-toolbar');
      if (inputToolbarSpacing instanceof HTMLElement) {
        inputToolbarSpacing.style.paddingTop = '4px';
      }

      const inputTextArea = document.getElementById('message-input');
      if (inputTextArea instanceof HTMLTextAreaElement) {
        inputTextArea.style.borderRadius = '14px';
      }

      const sendGroupSpacing = document.querySelector('.send-history-group');
      if (sendGroupSpacing instanceof HTMLElement) {
        sendGroupSpacing.style.gap = '0';
      }

      const inputToolbarContainer = document.querySelector('.input-toolbar');
      if (inputToolbarContainer instanceof HTMLElement) {
        inputToolbarContainer.style.marginBottom = '0';
      }

      const messageStrip = document.querySelector('.messages');
      if (messageStrip instanceof HTMLElement) {
        messageStrip.style.marginBottom = '0';
      }

      const slashNode = document.getElementById('slash-autocomplete');
      if (slashNode instanceof HTMLElement) {
        slashNode.style.maxHeight = '40vh';
      }

      const historyNode = document.getElementById('history-popover');
      if (historyNode instanceof HTMLElement) {
        historyNode.style.maxHeight = '40vh';
      }

      const inputBarFinal = document.querySelector('.input-bar');
      if (inputBarFinal instanceof HTMLElement) {
        inputBarFinal.style.paddingTop = '0';
      }

      const inputTextFinal = document.getElementById('message-input');
      if (inputTextFinal instanceof HTMLTextAreaElement) {
        inputTextFinal.style.paddingBottom = '8px';
      }

      const inputToolbarFinal = document.querySelector('.input-toolbar');
      if (inputToolbarFinal instanceof HTMLElement) {
        inputToolbarFinal.style.marginTop = '4px';
      }

      const messagesFinal = document.querySelector('.messages');
      if (messagesFinal instanceof HTMLElement) {
        messagesFinal.style.paddingBottom = '2px';
      }

      const sendFinal = document.querySelector('.send-history-group');
      if (sendFinal instanceof HTMLElement) {
        sendFinal.style.top = '8px';
      }

      const inputBarBottom = document.querySelector('.input-bar');
      if (inputBarBottom instanceof HTMLElement) {
        inputBarBottom.style.paddingBottom = '0';
      }

      const messageInputFinal = document.getElementById('message-input');
      if (messageInputFinal instanceof HTMLTextAreaElement) {
        messageInputFinal.style.marginBottom = '0';
      }

      const toolbarFinal = document.querySelector('.input-toolbar');
      if (toolbarFinal instanceof HTMLElement) {
        toolbarFinal.style.paddingBottom = '0';
      }

      const messagesLast = document.querySelector('.messages');
      if (messagesLast instanceof HTMLElement) {
        messagesLast.style.paddingTop = '4px';
      }

      const bodyLast = document.body;
      bodyLast.style.background = '#fff';

      const inputBarLast = document.querySelector('.input-bar');
      if (inputBarLast instanceof HTMLElement) {
        inputBarLast.style.background = '#fff';
      }

      const toolbarKeep = document.querySelector('.input-toolbar');
      if (toolbarKeep instanceof HTMLElement) {
        toolbarKeep.style.display = 'flex';
      }

      const textKeep = document.querySelector('.input-meta');
      if (textKeep instanceof HTMLElement) {
        textKeep.style.display = 'flex';
      }

      const iconKeep = document.querySelector('.toolbox-strip');
      if (iconKeep instanceof HTMLElement) {
        iconKeep.style.display = 'flex';
      }

      // 设置主题为亮色
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');

      // 自动聚焦输入框
      const focusInput = () => {
        const input = document.getElementById('message-input');
        if (input instanceof HTMLTextAreaElement) {
          input.focus();
        }
      };
      focusInput();
      setTimeout(focusInput, 50);
      setTimeout(focusInput, 300);

      // 通知父窗口已加载
      window.parent.postMessage({ type: 'embed-ready' }, '*');

      // 输入区最终布局补丁
      requestAnimationFrame(() => {
        focusInput();
      });

      const observer = new MutationObserver(() => {
        const overlay = document.getElementById('welcome-overlay');
        if (overlay) {
          overlay.classList.add('hidden');
          overlay.remove();
        }
        const placeholder = document.querySelector('.whaly-placeholder');
        if (placeholder) {
          placeholder.remove();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 5000);
    });

    // 导出嵌入模式状态
    window.EMBED_MODE = true;
  }
})();