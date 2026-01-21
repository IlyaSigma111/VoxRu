// ========== CONFIG ==========
const firebaseConfig = {
    apiKey: "AIzaSyD9aQcvK58mF2byEach9002M8AED8Mit6g",
    authDomain: "rucord-c222d.firebaseapp.com",
    projectId: "rucord-c222d",
    databaseURL: "https://rucord-c222d-default-rtdb.firebaseio.com", // Убедись, что URL верный
    storageBucket: "rucord-c222d.appspot.com",
    messagingSenderId: "21205944885",
    appId: "1:21205944885:web:28ee133fa547c8e21bff7c"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// State
let state = {
    user: null,
    nickname: "",
    server: "home",
    channel: "general",
    listeners: []
};

// DOM Elements
const UI = {
    login: document.getElementById("loginScreen"),
    nick: document.getElementById("nickScreen"),
    app: document.getElementById("app"),
    messages: document.getElementById("messagesContainer"),
    form: document.getElementById("messageForm"),
    input: document.getElementById("messageInput")
};

// ========== AUTH LOGIC ==========
auth.onAuthStateChanged(async (user) => {
    if (user) {
        state.user = user;
        const snap = await db.ref(`users/${user.uid}`).once("value");
        if (snap.exists()) {
            state.nickname = snap.val().username;
            showApp();
        } else {
            UI.login.classList.add("hidden");
            UI.nick.classList.remove("hidden");
        }
    } else {
        UI.app.classList.add("hidden");
        UI.login.classList.remove("hidden");
    }
});

// Кнопки логина
document.getElementById("loginBtn").onclick = () => authAction('login');
document.getElementById("registerBtn").onclick = () => authAction('register');

async function authAction(type) {
    const email = document.getElementById("emailInput").value;
    const pass = document.getElementById("passwordInput").value;
    try {
        if (type === 'login') await auth.signInWithEmailAndPassword(email, pass);
        else await auth.createUserWithEmailAndPassword(email, pass);
    } catch (e) { document.getElementById("loginError").innerText = e.message; }
}

// Сохранение ника
document.getElementById("saveNickBtn").onclick = async () => {
    const nick = document.getElementById("nicknameInput").value.trim();
    if (!nick) return;
    state.nickname = nick;
    await db.ref(`users/${state.user.uid}`).set({ username: nick, status: 'online' });
    showApp();
};

// ========== CORE FUNCTIONS ==========
function showApp() {
    UI.nick.classList.add("hidden");
    UI.login.classList.add("hidden");
    UI.app.classList.remove("hidden");
    document.getElementById("myUsername").innerText = state.nickname;
    document.getElementById("userAvatar").innerText = state.nickname[0].toUpperCase();
    initChat();
}

function initChat() {
    // Очистка слушателей перед входом
    db.ref(`messages/${state.server}/${state.channel}`).off();
    
    // Загрузка истории
    db.ref(`messages/${state.server}/${state.channel}`).limitToLast(50).on("child_added", (snap) => {
        renderMessage(snap.val());
    });
}

function renderMessage(data) {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `
        <div class="avatar-small" style="background:${stringToColor(data.username)}">${data.username[0].toUpperCase()}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${data.username}</span>
                <span style="font-size:10px; color:gray; margin-left:8px;">${new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-text">${data.text}</div>
        </div>
    `;
    UI.messages.appendChild(div);
    UI.messages.scrollTop = UI.messages.scrollHeight;
}

UI.form.onsubmit = (e) => {
    e.preventDefault();
    const text = UI.input.value.trim();
    if (!text) return;
    db.ref(`messages/${state.server}/${state.channel}`).push({
        text,
        username: state.nickname,
        timestamp: Date.now(),
        uid: state.user.uid
    });
    UI.input.value = "";
};

// Красивый цвет для аватарки
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 60%, 50%)`;
}

// Выход
document.getElementById("logoutBtn").onclick = () => auth.signOut();
