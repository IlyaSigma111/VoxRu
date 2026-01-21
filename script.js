// ВСТАВЬ СВОЙ КОНФИГ ТУТ
const firebaseConfig = {
    apiKey: "AIzaSyD9aQcvK58mF2byEach9002M8AED8Mit6g",
    databaseURL: "https://rucord-c222d-default-rtdb.firebaseio.com",
    projectId: "rucord-c222d",
    appId: "1:21205944885:web:28ee133fa547c8e21bff7c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// State
let state = {
    userId: localStorage.getItem('rucord_uid') || 'u' + Math.floor(Math.random() * 1000000),
    nickname: localStorage.getItem('rucord_nick') || '',
    roleColor: localStorage.getItem('rucord_color') || '#ffffff',
    server: "home",
    channel: "general"
};
localStorage.setItem('rucord_uid', state.userId);

const UI = {
    nickScreen: document.getElementById("nickScreen"),
    app: document.getElementById("app"),
    messages: document.getElementById("messagesContainer"),
    input: document.getElementById("messageInput"),
    nickInput: document.getElementById("nicknameInput"),
    form: document.getElementById("messageForm")
};

// --- AUTH / ENTRY ---
if (state.nickname) enterApp();

document.getElementById("saveNickBtn").onclick = () => {
    const nick = UI.nickInput.value.trim();
    if (nick.length < 2) return alert("Никнейм слишком короткий!");
    state.nickname = nick;
    localStorage.setItem('rucord_nick', nick);
    enterApp();
};

function enterApp() {
    UI.nickScreen.classList.add("hidden");
    UI.app.classList.remove("hidden");
    document.getElementById("myUsername").innerText = state.nickname;
    updateAvatar();

    // Presence
    const userRef = db.ref(`users/${state.userId}`);
    userRef.set({ username: state.nickname, color: state.roleColor, status: "online" });
    userRef.onDisconnect().remove();

    initChat();
    loadMembers();
    watchTyping();
}

// --- CHAT LOGIC ---
function initChat() {
    db.ref(`messages/${state.server}/${state.channel}`).off();
    db.ref(`messages/${state.server}/${state.channel}`).limitToLast(50).on("child_added", (snap) => {
        renderMessage(snap.val());
    });
}

function renderMessage(data) {
    const div = document.createElement("div");
    div.className = "message";
    
    // Эмодзи парсинг
    let text = data.text
        .replace(/:\)/g, '😊').replace(/:\(/g, '☹️')
        .replace(/<3/g, '❤️').replace(/:fire:/g, '🔥');

    div.innerHTML = `
        <div class="avatar-small" style="background:${stringToColor(data.username)}">${data.username[0]}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author" style="color:${data.color || '#fff'}">${data.username}</span>
                <span style="font-size:10px; color:gray; margin-left:8px;">${new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-text">${text}</div>
        </div>
    `;
    UI.messages.appendChild(div);
    UI.messages.scrollTop = UI.messages.scrollHeight;
}

UI.form.onsubmit = (e) => {
    e.preventDefault();
    if (!UI.input.value.trim()) return;

    db.ref(`messages/${state.server}/${state.channel}`).push({
        text: UI.input.value,
        username: state.nickname,
        color: state.roleColor,
        timestamp: Date.now()
    });
    UI.input.value = "";
    db.ref(`typing/${state.server}/${state.channel}/${state.userId}`).remove();
};

// --- TYPING ---
let typeTimeout;
UI.input.oninput = () => {
    db.ref(`typing/${state.server}/${state.channel}/${state.userId}`).set(state.nickname);
    clearTimeout(typeTimeout);
    typeTimeout = setTimeout(() => {
        db.ref(`typing/${state.server}/${state.channel}/${state.userId}`).remove();
    }, 2000);
};

function watchTyping() {
    db.ref(`typing/${state.server}/${state.channel}`).on("value", (snap) => {
        const typers = Object.values(snap.val() || {}).filter(n => n !== state.nickname);
        document.getElementById("typingIndicator").innerText = typers.length ? `${typers.join(", ")} печатает...` : "";
    });
}

// --- SETTINGS ---
document.getElementById("openSettings").onclick = () => {
    document.getElementById("editNickname").value = state.nickname;
    document.getElementById("roleColor").value = state.roleColor;
    document.getElementById("settingsModal").classList.remove("hidden");
};

document.getElementById("saveSettingsBtn").onclick = () => {
    state.nickname = document.getElementById("editNickname").value;
    state.roleColor = document.getElementById("roleColor").value;
    localStorage.setItem('rucord_nick', state.nickname);
    localStorage.setItem('rucord_color', state.roleColor);
    
    db.ref(`users/${state.userId}`).update({ 
        username: state.nickname, 
        color: state.roleColor 
    });
    
    document.getElementById("settingsModal").classList.add("hidden");
    location.reload();
};

document.getElementById("closeSettings").onclick = () => {
    document.getElementById("settingsModal").classList.add("hidden");
};

// --- HELPERS ---
function loadMembers() {
    db.ref("users").on("value", (snap) => {
        const list = document.getElementById("memberList");
        list.innerHTML = "";
        Object.values(snap.val() || {}).forEach(u => {
            list.innerHTML += `<div class="member" style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                <div class="avatar-small" style="background:${stringToColor(u.username)}; width:24px; height:24px; font-size:12px">${u.username[0]}</div>
                <span style="color:${u.color}">${u.username}</span>
            </div>`;
        });
    });
}

function updateAvatar() {
    const av = document.getElementById("userAvatar");
    av.innerText = state.nickname[0].toUpperCase();
    av.style.background = stringToColor(state.nickname);
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 65%, 50%)`;
}
