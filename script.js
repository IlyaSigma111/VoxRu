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

// ======== GLOBALS ========
let currentUser = null;
let nickname = "";
let currentServer = "home";
let currentChannel = "general";

// ======== DOM ========
const loginScreen = document.getElementById("loginScreen");
const nickScreen = document.getElementById("nickScreen");
const appScreen = document.getElementById("app");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const saveNickBtn = document.getElementById("saveNickBtn");
const loginError = document.getElementById("loginError");

// ======== AUTH ========
loginBtn.onclick = async () => {
    const email = document.getElementById("emailInput").value.trim();
    const pass = document.getElementById("passwordInput").value.trim();
    loginError.textContent = "";
    try {
        const res = await auth.signInWithEmailAndPassword(email, pass);
        currentUser = res.user;
        nickScreen.classList.remove("hidden");
        loginScreen.classList.add("hidden");
    } catch(err){
        loginError.textContent = err.message;
    }
};

registerBtn.onclick = async () => {
    const email = document.getElementById("emailInput").value.trim();
    const pass = document.getElementById("passwordInput").value.trim();
    loginError.textContent = "";
    try {
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        currentUser = res.user;
        nickScreen.classList.remove("hidden");
        loginScreen.classList.add("hidden");
    } catch(err){
        loginError.textContent = err.message;
    }
};

// ======== NICKNAME ========
saveNickBtn.onclick = async () => {
    const nickInput = document.getElementById("nicknameInput").value.trim();
    if(!nickInput) return alert("Введите ник");
    nickname = nickInput;
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

// ======== SERVERS/CHANNELS/MESSAGES =========
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

async function loadChannels(){
    const textChannelsDiv = document.getElementById("textChannels");
    textChannelsDiv.innerHTML="";
    const snapshot = await database.ref(`servers/${currentServer}/channels`).once("value");
    const channels = snapshot.val() || {};
    Object.entries(channels).forEach(([id,ch])=>{
        if(ch.type==="text"){
            const a = document.createElement("a");
            a.href="#"; a.className="channel"; a.textContent="# "+ch.name;
            a.onclick=()=>switchChannel(id);
            textChannelsDiv.appendChild(a);
        }
    });
}

function switchChannel(id){
    currentChannel=id;
    loadMessages();
}

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
        div.appendChild(avatar);
        div.appendChild(content);
        container.appendChild(div);
        div.scrollIntoView({behavior:"smooth"});
    });
}

// ======== SEND MESSAGE ========
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
};

// ======== REALTIME LISTENERS ========
function setupRealtimeListeners(){
    database.ref(`messages/${currentServer}/${currentChannel}`).limitToLast(1).on("child_added", loadMessages);
}
