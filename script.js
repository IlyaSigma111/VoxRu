// ============================================
// КОНФИГУРАЦИЯ FIREBASE
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyCvqVxSb9ayY3ngcWATR-He04bGm8m6lZg",
    authDomain: "voxru-d4874.firebaseapp.com",
    databaseURL: "https://voxru-d4874-default-rtdb.firebaseio.com",
    projectId: "voxru-d4874",
    storageBucket: "voxru-d4874.firebasestorage.app",
    messagingSenderId: "551341878771",
    appId: "1:551341878771:web:43e1d6b0930ea6b4af7686"
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
    showErrorMessage("Ошибка подключения к базе данных. Пожалуйста, проверьте конфигурацию Firebase.");
}

const database = firebase.database();

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И СОСТОЯНИЕ
// ============================================

const state = {
    user: {
        id: null,
        username: null,
        color: '#5865F2',
        lastSeen: null
    },
    currentServer: 'main',
    currentChannel: 'general',
    onlineUsers: {},
    typingUsers: {},
    messagesRef: null,
    usersRef: null,
    typingRef: null,
    presenceRef: null,
    userRef: null,
    isMobile: false
};

const emojiMap = {
    ":)": "😊",
    ":-)": "😊",
    "(:": "😊",
    "(-:": "😊",
    ":(": "😞",
    ":-(": "😞",
    "):": "😞",
    ")-:": "😞",
    ":D": "😃",
    ":-D": "😃",
    "D:": "😃",
    "D-:": "😃",
    ";(": "😢",
    ";-(": "😢",
    ";)": "😉",
    ";-)": "😉",
    ":P": "😛",
    ":-P": "😛",
    ":p": "😛",
    ":-p": "😛",
    ":O": "😮",
    ":-O": "😮",
    ":o": "😮",
    ":-o": "😮",
    ":*": "😘",
    ":-*": "😘",
    "<3": "❤️",
    "</3": "💔",
    ":thumbsup:": "👍",
    ":thumbsdown:": "👎",
    ":ok:": "👌",
    ":clap:": "👏"
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function showErrorMessage(message) {
    alert(message);
    console.error(message);
}

function detectMobile() {
    state.isMobile = window.innerWidth <= 768;
    return state.isMobile;
}

function updateMobileLayout() {
    const isMobile = detectMobile();
    
    // Добавляем/удаляем мобильные элементы
    if (isMobile && !document.querySelector('.mobile-menu-toggle')) {
        addMobileElements();
    }
    
    // Обновляем отображение
    if (isMobile) {
        document.body.classList.add('mobile');
    } else {
        document.body.classList.remove('mobile');
        document.querySelector('.channels-sidebar')?.classList.remove('active');
    }
}

function addMobileElements() {
    // Добавляем кнопку меню
    const channelInfo = document.querySelector('.channel-info');
    if (channelInfo && !document.querySelector('.mobile-menu-toggle')) {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'mobile-menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.title = 'Показать меню';
        menuToggle.addEventListener('click', toggleChannelsSidebar);
        channelInfo.parentNode.insertBefore(menuToggle, channelInfo);
    }
    
    // Добавляем кнопку пользователя
    const channelTools = document.querySelector('.channel-tools');
    if (channelTools && !document.querySelector('.mobile-user-toggle')) {
        const userToggle = document.createElement('button');
        userToggle.className = 'mobile-user-toggle';
        userToggle.innerHTML = '<i class="fas fa-user"></i>';
        userToggle.title = 'Показать профиль';
        userToggle.addEventListener('click', showSettings);
        channelTools.appendChild(userToggle);
    }
}

function toggleChannelsSidebar() {
    const sidebar = document.querySelector('.channels-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        
        // Добавляем затемнение фона
        if (sidebar.classList.contains('active')) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.addEventListener('click', toggleChannelsSidebar);
            document.querySelector('#chat-screen').appendChild(overlay);
            
            // Стили для overlay
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 99;
            `;
        } else {
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();
        }
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ И ВХОД
// ============================================

function checkSavedUser() {
    const savedUser = localStorage.getItem('rucord_user');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            state.user = { ...state.user, ...userData };
            enterChat();
        } catch (e) {
            console.error("Ошибка при загрузке пользователя:", e);
            localStorage.removeItem('rucord_user');
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('chat-screen').classList.add('hidden');
    
    // Фокус на поле ввода
    setTimeout(() => {
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.focus();
            
            // Для мобильных устройств предотвращаем zoom
            if (state.isMobile) {
                usernameInput.addEventListener('focus', function() {
                    setTimeout(() => {
                        this.style.fontSize = '16px';
                    }, 100);
                });
            }
        }
    }, 100);
}

function enterChat() {
    if (!state.user.id) {
        state.user.id = generateUserId();
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('rucord_user', JSON.stringify(state.user));
    
    // Показываем чат
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.remove('hidden');
    
    // Обновляем отображение
    updateUserDisplay();
    
    // Обновляем мобильный лейаут
    updateMobileLayout();
    
    // Инициализируем Firebase
    initializeFirebaseConnections();
    
    // Сохраняем пользователя в Firebase
    saveUserToFirebase();
}

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// ============================================
// РАБОТА С FIREBASE
// ============================================

function initializeFirebaseConnections() {
    try {
        // Создаем ссылки на данные
        state.messagesRef = database.ref(`servers/${state.currentServer}/channels/${state.currentChannel}/messages`);
        state.usersRef = database.ref('users');
        state.typingRef = database.ref(`servers/${state.currentServer}/channels/${state.currentChannel}/typing`);
        state.presenceRef = database.ref('presence/' + state.user.id);
        state.userRef = database.ref('users/' + state.user.id);
        
        // Устанавливаем присутствие
        setupUserPresence();
        
        // Настраиваем слушателей
        setupTypingListener();
        setupOnlineUsersListener();
        loadMessages();
        
    } catch (error) {
        console.error("Ошибка инициализации Firebase:", error);
        showErrorMessage("Ошибка подключения к серверу чата. Пожалуйста, обновите страницу.");
    }
}

function saveUserToFirebase() {
    const userData = {
        id: state.user.id,
        username: state.user.username,
        color: state.user.color,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        online: true
    };
    
    state.userRef.set(userData)
        .then(() => {
            console.log("Пользователь сохранен в Firebase");
        })
        .catch(error => {
            console.error("Ошибка сохранения пользователя:", error);
        });
}

function setupUserPresence() {
    const presenceData = {
        id: state.user.id,
        username: state.user.username,
        color: state.user.color,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        online: true
    };
    
    state.presenceRef.set(presenceData);
    
    state.presenceRef.onDisconnect().remove();
    
    state.userRef.onDisconnect().update({
        online: false,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

function setupTypingListener() {
    state.typingRef.on('value', (snapshot) => {
        const typingData = snapshot.val() || {};
        state.typingUsers = typingData;
        updateTypingIndicator();
    });
}

function setupOnlineUsersListener() {
    state.usersRef.on('value', (snapshot) => {
        const usersData = snapshot.val() || {};
        state.onlineUsers = usersData;
        updateOnlineUsersDisplay();
    });
}

// ============================================
// СООБЩЕНИЯ
// ============================================

function loadMessages() {
    state.messagesRef.limitToLast(100).on('value', (snapshot) => {
        const messages = snapshot.val() || {};
        displayMessages(messages);
    });
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    const welcomeMsg = container.querySelector('.welcome-message');
    container.innerHTML = '';
    if (welcomeMsg) {
        container.appendChild(welcomeMsg);
    }
    
    const messagesArray = Object.entries(messages)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => a.timestamp - b.timestamp);
    
    messagesArray.forEach(msg => {
        const messageElement = createMessageElement(msg);
        container.appendChild(messageElement);
    });
    
    scrollToBottom();
}

function createMessageElement(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.messageId = msg.id;
    
    const colorHash = stringToColor(msg.userId || 'unknown');
    const avatarText = (msg.username || 'U').charAt(0).toUpperCase();
    
    const time = new Date(msg.timestamp);
    const timeString = time.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let messageText = msg.text || '';
    for (const [key, emoji] of Object.entries(emojiMap)) {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        messageText = messageText.replace(regex, emoji);
    }
    
    const userColor = msg.color || state.user.color;
    
    messageDiv.innerHTML = `
        <div class="message-avatar" style="background: linear-gradient(135deg, ${userColor}, ${adjustColor(userColor, -20)})">
            ${avatarText}
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-username" style="color: ${userColor}">${msg.username}</span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-text">${escapeHtml(messageText)}</div>
        </div>
    `;
    
    return messageDiv;
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    const message = {
        userId: state.user.id,
        username: state.user.username,
        color: state.user.color,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    state.messagesRef.push(message)
        .then(() => {
            input.value = '';
            state.typingRef.child(state.user.id).remove();
            
            // Фокус обратно на поле ввода
            setTimeout(() => {
                input.focus();
            }, 50);
        })
        .catch(error => {
            console.error("Ошибка отправки сообщения:", error);
            showErrorMessage("Не удалось отправить сообщение. Попробуйте еще раз.");
        });
}

// ============================================
// ИНДИКАТОР ПЕЧАТИ
// ============================================

function updateTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    const typingUsers = Object.values(state.typingUsers);
    
    if (typingUsers.length === 0) {
        indicator.innerHTML = '';
        return;
    }
    
    const otherUsers = typingUsers.filter(user => user.userId !== state.user.id);
    
    if (otherUsers.length === 0) {
        indicator.innerHTML = '';
        return;
    }
    
    const userNames = otherUsers.map(user => `<strong style="color: ${user.color || '#5865F2'}">${user.username}</strong>`);
    
    let text = '';
    if (otherUsers.length === 1) {
        text = `${userNames[0]} печатает...`;
    } else if (otherUsers.length === 2) {
        text = `${userNames[0]} и ${userNames[1]} печатают...`;
    } else {
        text = `${userNames.slice(0, -1).join(', ')} и ${userNames[userNames.length - 1]} печатают...`;
    }
    
    indicator.innerHTML = text;
}

function startTyping() {
    const typingData = {
        userId: state.user.id,
        username: state.user.username,
        color: state.user.color,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    state.typingRef.child(state.user.id).set(typingData);
    
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
        state.typingRef.child(state.user.id).remove();
    }, 3000);
}

// ============================================
// ОНЛАЙН ПОЛЬЗОВАТЕЛИ
// ============================================

function updateOnlineUsersDisplay() {
    const onlineList = document.getElementById('online-members');
    const offlineList = document.getElementById('offline-members');
    const onlineCount = document.getElementById('online-count');
    const onlineCountDetail = document.getElementById('online-count-detail');
    const offlineCount = document.getElementById('offline-count');
    
    if (!onlineList) return;
    
    onlineList.innerHTML = '';
    offlineList.innerHTML = '';
    
    const usersArray = Object.values(state.onlineUsers);
    const onlineUsers = usersArray.filter(user => user.online === true);
    const offlineUsers = usersArray.filter(user => !user.online || user.online === false);
    
    onlineCount.textContent = onlineUsers.length;
    onlineCountDetail.textContent = onlineUsers.length;
    offlineCount.textContent = offlineUsers.length;
    
    onlineUsers.forEach(user => {
        const memberElement = createMemberElement(user, true);
        onlineList.appendChild(memberElement);
    });
    
    offlineUsers.forEach(user => {
        const memberElement = createMemberElement(user, false);
        offlineList.appendChild(memberElement);
    });
}

function createMemberElement(user, isOnline) {
    const memberDiv = document.createElement('div');
    memberDiv.className = `member ${isOnline ? 'online' : 'offline'}`;
    
    const avatarText = (user.username || 'U').charAt(0).toUpperCase();
    const userColor = user.color || '#99AAB5';
    
    memberDiv.innerHTML = `
        <div class="member-avatar" style="background: linear-gradient(135deg, ${userColor}, ${adjustColor(userColor, -20)})">
            ${avatarText}
        </div>
        <div class="member-name" style="color: ${isOnline ? userColor : '#99AAB5'}">
            ${user.username}
        </div>
    `;
    
    return memberDiv;
}

// ============================================
// НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ
// ============================================

function showSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('new-username').value = state.user.username;
    document.getElementById('user-id-display').textContent = state.user.id;
    document.getElementById('current-user-display').textContent = state.user.username;
    document.getElementById('current-color-text').textContent = state.user.color;
    
    const colorSample = document.getElementById('current-color-display');
    colorSample.style.backgroundColor = state.user.color;
    
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.color === state.user.color) {
            option.classList.add('active');
        }
    });
}

function updateUsername() {
    const newUsername = document.getElementById('new-username').value.trim();
    
    if (!newUsername) {
        showErrorMessage('Введите новый никнейм');
        return;
    }
    
    if (newUsername.length < 2 || newUsername.length > 32) {
        showErrorMessage('Никнейм должен быть от 2 до 32 символов');
        return;
    }
    
    state.user.username = newUsername;
    
    // Обновляем localStorage
    localStorage.setItem('rucord_user', JSON.stringify(state.user));
    
    // Обновляем Firebase
    if (state.userRef) {
        state.userRef.update({
            username: newUsername,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    if (state.presenceRef) {
        state.presenceRef.update({
            username: newUsername
        });
    }
    
    updateUserDisplay();
    showErrorMessage('Никнейм успешно обновлен!');
}

function changeColor(color) {
    state.user.color = color;
    localStorage.setItem('rucord_user', JSON.stringify(state.user));
    
    // Обновляем Firebase
    if (state.userRef) {
        state.userRef.update({
            color: color,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    if (state.presenceRef) {
        state.presenceRef.update({
            color: color
        });
    }
    
    updateUserDisplay();
    
    const colorSample = document.getElementById('current-color-display');
    colorSample.style.backgroundColor = color;
    document.getElementById('current-color-text').textContent = color;
    
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.color === color) {
            option.classList.add('active');
        }
    });
}

function updateUserDisplay() {
    document.getElementById('current-username').textContent = state.user.username;
    document.getElementById('user-id').textContent = '#' + (state.user.id ? state.user.id.substr(-4) : '0000');
    document.getElementById('user-avatar-text').textContent = state.user.username.charAt(0).toUpperCase();
    
    const avatar = document.querySelector('.user-avatar');
    if (avatar) {
        avatar.style.background = `linear-gradient(135deg, ${state.user.color}, ${adjustColor(state.user.color, -20)})`;
    }
}

function clearStorage() {
    if (confirm('Вы уверены? Это удалит ваши настройки и выйдет из чата.')) {
        // Удаляем из Firebase
        if (state.presenceRef) {
            state.presenceRef.remove();
        }
        
        if (state.userRef) {
            state.userRef.update({
                online: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        if (state.typingRef && state.user.id) {
            state.typingRef.child(state.user.id).remove();
        }
        
        // Очищаем localStorage
        localStorage.removeItem('rucord_user');
        
        // Перезагружаем страницу
        location.reload();
    }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
}

function adjustColor(color, amount) {
    if (color.startsWith('#')) {
        let r = parseInt(color.substr(1, 2), 16);
        let g = parseInt(color.substr(3, 2), 16);
        let b = parseInt(color.substr(5, 2), 16);
        
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// ============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================

function initEventListeners() {
    // Вход в чат
    const enterChatBtn = document.getElementById('enter-chat');
    const usernameInput = document.getElementById('username');
    
    if (enterChatBtn) {
        enterChatBtn.addEventListener('click', handleLogin);
        // Улучшаем доступность для касаний
        enterChatBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.classList.add('active');
        });
        
        enterChatBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.classList.remove('active');
            handleLogin();
        });
    }
    
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
        
        // Предотвращаем zoom на iOS
        usernameInput.addEventListener('focus', function() {
            if (state.isMobile) {
                setTimeout(() => {
                    this.style.fontSize = '16px';
                }, 100);
            }
        });
    }
    
    function handleLogin() {
        const username = usernameInput.value.trim();
        if (!username) {
            showErrorMessage('Введите никнейм');
            usernameInput.focus();
            return;
        }
        
        state.user.username = username;
        enterChat();
    }
    
    // Отправка сообщения
    const sendMessageBtn = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');
    
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Индикатор печати
        messageInput.addEventListener('input', () => {
            if (messageInput.value.trim()) {
                startTyping();
            }
        });
        
        // Предотвращаем zoom на iOS
        messageInput.addEventListener('focus', function() {
            if (state.isMobile) {
                setTimeout(() => {
                    this.style.fontSize = '16px';
                }, 100);
            }
        });
    }
    
    // Переключение каналов
    document.querySelectorAll('.channel').forEach(channel => {
        channel.addEventListener('click', (e) => {
            if (channel.classList.contains('active')) return;
            
            document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
            channel.classList.add('active');
            
            const channelName = channel.dataset.channel;
            if (channelName) {
                state.currentChannel = channelName;
                document.getElementById('current-channel').textContent = channelName;
                document.getElementById('message-input').placeholder = `Написать сообщение в #${channelName}`;
                
                // Закрываем сайдбар на мобильных
                if (state.isMobile) {
                    toggleChannelsSidebar();
                }
                
                // Отписываемся от старых слушателей
                if (state.messagesRef) {
                    state.messagesRef.off();
                }
                if (state.typingRef) {
                    state.typingRef.off();
                }
                
                // Создаем новые ссылки
                state.messagesRef = database.ref(`servers/${state.currentServer}/channels/${state.currentChannel}/messages`);
                state.typingRef = database.ref(`servers/${state.currentServer}/channels/${state.currentChannel}/typing`);
                
                // Подписываемся на новые данные
                setupTypingListener();
                loadMessages();
                
                // Очищаем индикатор печати
                document.getElementById('typing-indicator').innerHTML = '';
            }
        });
    });
    
    // Серверы
    document.querySelectorAll('.server').forEach(server => {
        server.addEventListener('click', (e) => {
            const serverName = server.dataset.server;
            if (serverName === 'main') {
                return;
            }
            
            if (server.id === 'settings-btn') {
                showSettings();
                return;
            }
            
            // Здесь можно добавить логику для переключения серверов
            showErrorMessage(`Сервер "${serverName}" в разработке. Оставайтесь на основном сервере.`);
        });
    });
    
    // Настройки
    document.getElementById('settings-btn')?.addEventListener('click', showSettings);
    
    document.querySelector('.close-modal')?.addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('hidden');
    });
    
    document.querySelector('.close-settings')?.addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('hidden');
    });
    
    document.getElementById('settings-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('settings-modal')) {
            document.getElementById('settings-modal').classList.add('hidden');
        }
    });
    
    document.getElementById('update-username')?.addEventListener('click', updateUsername);
    
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            changeColor(option.dataset.color);
        });
    });
    
    document.getElementById('clear-storage')?.addEventListener('click', clearStorage);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('settings-modal').classList.add('hidden');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                toggleChannelsSidebar();
            }
        }
    });
    
    // Мониторинг подключения Firebase
    database.ref('.info/connected').on('value', (snapshot) => {
        const isConnected = snapshot.val();
        if (isConnected) {
            console.log('Подключено к Firebase');
            
            // При восстановлении подключения обновляем статус
            if (state.userRef) {
                state.userRef.update({
                    online: true,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
            }
            
            if (state.presenceRef) {
                state.presenceRef.set({
                    id: state.user.id,
                    username: state.user.username,
                    color: state.user.color,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    online: true
                });
            }
        } else {
            console.log('Отключено от Firebase');
        }
    });
    
    // Обработка изменения размера окна
    window.addEventListener('resize', updateMobileLayout);
    
    // Обработка закрытия вкладки
    window.addEventListener('beforeunload', () => {
        if (state.userRef) {
            state.userRef.update({
                online: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        if (state.presenceRef) {
            state.presenceRef.remove();
        }
        
        if (state.typingRef && state.user.id) {
            state.typingRef.child(state.user.id).remove();
        }
    });
}

// ============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Определяем мобильное устройство
    detectMobile();
    updateMobileLayout();
    
    // Инициализируем обработчики событий
    initEventListeners();
    
    // Проверяем сохраненного пользователя
    checkSavedUser();
    
    // Добавляем стили для overlay
    const style = document.createElement('style');
    style.textContent = `
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 99;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        /* Улучшения для касаний на мобильных */
        @media (hover: none) and (pointer: coarse) {
            .btn {
                min-height: 48px;
            }
            
            input, textarea {
                min-height: 48px;
                font-size: 16px;
            }
            
            .channel, .member, .server {
                min-height: 44px;
            }
            
            .mobile-menu-toggle, .mobile-user-toggle {
                min-width: 44px;
                min-height: 44px;
            }
        }
    `;
    document.head.appendChild(style);
});
