// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
    apiKey: "AIzaSyD9aQcvK58mF2byEach9002M8AED8Mit6g",
    authDomain: "rucord-c222d.firebaseapp.com",
    projectId: "rucord-c222d",
    storageBucket: "rucord-c222d.appspot.com",
    messagingSenderId: "21205944885",
    appId: "1:21205944885:web:28ee133fa547c8e21bff7c"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// GLOBALS
let currentUser=null;
let nickname="";
let currentServer="home";
let currentChannel="general";
let users={};
let voiceChannels={};
let activeVoiceChannel=null;
let microphoneEnabled=true;
let headphonesEnabled=true;

// DOM ELEMENTS
const loginScreen = document.getElementById("loginScreen");
const nickScreen = document.getElementById("nickScreen");
const appScreen = document.getElementById("app");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const saveNickBtn = document.getElementById("saveNickBtn");

// ========== AUTH ==========
googleLoginBtn.onclick = async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        currentUser = result.user;
        loginScreen.classList.add("hidden");
        nickScreen.classList.remove("hidden");
    } catch(err){ alert("Ошибка входа: "+err.message); }
};

saveNickBtn.onclick = async () => {
    const input = document.getElementById("nicknameInput");
    const nick = input.value.trim();
    if(!nick) { alert("Введите ник"); return; }
    nickname = nick;

    // Сохраняем в базе
    await database.ref("users/"+currentUser.uid).set({
        username:nickname,
        email:currentUser.email,
        status:"online",
        createdAt:Date.now()
    });

    nickScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    loadServers();
    loadChannels();
    loadMessages();
    setupRealtimeListeners();
};

// ========== SERVERS ==========
async function loadServers(){
    const serverList = document.getElementById("serverList");
    serverList.innerHTML = "";
    const snapshot = await database.ref("servers").once("value");
    const servers = snapshot.val() || {};
    Object.entries(servers).forEach(([id,s])=>{
        const btn = document.createElement("button");
        btn.className="btn";
        btn.textContent=s.name;
        btn.onclick=()=>switchServer(id);
        serverList.appendChild(btn);
    });
}

function switchServer(id){
    currentServer=id;
    loadChannels();
    loadMessages();
}

// ========== CHANNELS ==========
async function loadChannels(){
    const textChannelsDiv = document.getElementById("textChannels");
    const voiceChannelsDiv = document.getElementById("voiceChannels");
    textChannelsDiv.innerHTML = "";
    voiceChannelsDiv.innerHTML = "";

    const snapshot = await database.ref(`servers/${currentServer}/channels`).once("value");
    const channels = snapshot.val() || {};

    Object.entries(channels).forEach(([id,ch])=>{
        if(ch.type==="text"){
            const a = document.createElement("a");
            a.href="#"; a.className="channel"; a.textContent="# "+ch.name;
            a.onclick=()=>switchChannel(id);
            if(id===currentChannel) a.classList.add("active");
            textChannelsDiv.appendChild(a);
        } else {
            const div = document.createElement("div");
            div.className="voice-channel";
            div.textContent=ch.name;
            voiceChannelsDiv.appendChild(div);
        }
    });
}

function switchChannel(id){
    currentChannel=id;
    loadMessages();
}

// ========== MESSAGES ==========
async function loadMessages(){
    const container = document.getElementById("messagesContainer");
    container.innerHTML="";
    const snapshot = await database.ref(`messages/${currentServer}/${currentChannel}`).limitToLast(50).once("value");
    snapshot.forEach(child=>{
        const msg = child.val();
        const div = document.createElement("div");
        div.className="message";
        const avatar = document.createElement("div");
        avatar.className="message-avatar";
        avatar.textContent = msg.username.charAt(0).toUpperCase();
        const content = document.createElement("div");
        content.className="message-content";
        content.innerHTML = `<div class="message-header"><span class="message-author">${msg.username}</span></div><div class="message-text">${msg.text}</div>`;
        div.appendChild(avatar); div.appendChild(content);
        container.appendChild(div);
    });
}

// ========== SEND MESSAGE ==========
document.getElementById("messageForm").onsubmit = async (e)=>{
    e.preventDefault();
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if(!text) return;
    await database.ref(`messages/${currentServer}/${currentChannel}`).push({
        text:text,
        userId:currentUser.uid,
        username:nickname,
        timestamp:Date.now()
    });
    input.value="";
    loadMessages();
};

// ========== REALTIME ==========
function setupRealtimeListeners(){
    database.ref(`messages/${currentServer}/${currentChannel}`).limitToLast(1).on("child_added", loadMessages);
}
