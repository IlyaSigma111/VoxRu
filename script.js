import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, push, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ===== Firebase =====
const firebaseConfig = {
  apiKey:"AIzaSyD9aQcvK58mF2byEach9002M8AED8Mit6g",
  authDomain:"rucord-c222d.firebaseapp.com",
  projectId:"rucord-c222d",
  storageBucket:"rucord-c222d.firebasestorage.app",
  messagingSenderId:"21205944885",
  appId:"1:21205944885:web:28ee133fa547c8e21bff7c"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

let currentUser=null;
let currentChannel='general';
let currentServer='home';

// ===== DOM =====
const loginScreen=document.getElementById('loginScreen');
const nicknameModal=document.getElementById('nicknameModal');
const nicknameInput=document.getElementById('nicknameInput');
const nicknameSubmit=document.getElementById('nicknameSubmit');

document.getElementById('googleLoginBtn').addEventListener('click', googleLogin);
nicknameSubmit.addEventListener('click', saveNickname);
document.getElementById('messageForm').addEventListener('submit', sendMessage);

// ===== Авторизация =====
async function googleLogin(){
  try{
    const result=await signInWithPopup(auth,provider);
    currentUser=result.user;
    const snapshot=await get(ref(db,`users/${currentUser.uid}`));
    if(!snapshot.exists()||!snapshot.val().nickname) nicknameModal.style.display='flex';
    else enterApp(snapshot.val());
  }catch(e){ showNotification(e.message,'error'); }
}

async function saveNickname(){
  const nickname=nicknameInput.value.trim();
  if(!nickname){ showNotification('Введите ник','error'); return; }
  const avatar=generateAvatar(nickname);
  await set(ref(db,`users/${currentUser.uid}`),{
    uid:currentUser.uid,
    email:currentUser.email,
    nickname,
    avatar,
    status:'online',
    createdAt:Date.now()
  });
  nicknameModal.style.display='none';
  enterApp({nickname,avatar});
  showNotification(`Добро пожаловать, ${nickname}!`,'success');
}

function enterApp(userData){
  loginScreen.style.display='none';
  document.getElementById('app').style.display='flex';
  updateUserUI(userData);
  loadChannels();
  loadMessages();
  setupRealtimeListeners();
}

function updateUserUI(userData){
  const avatarEl=document.getElementById('userAvatar');
  const nameEl=document.getElementById('userName');
  avatarEl.style.background=userData.avatar.color;
  avatarEl.textContent=userData.avatar.emoji||userData.nickname.charAt(0).toUpperCase();
  nameEl.textContent=userData.nickname;
}

// ===== Утилиты =====
function generateAvatar(username){
  const colors=['#5865f2','#3ba55d','#faa81a','#ed4245','#9b59b6','#e91e63','#00bcd4','#ff9800','#4caf50','#2196f3'];
  const emojis=['😊','😎','🤖','🎮','🎵','📚','🎨','🚀','🌟','💻'];
  return {color:colors[Math.floor(Math.random()*colors.length)],emoji:emojis[Math.floor(Math.random()*emojis.length)],text:username.charAt(0).toUpperCase()};
}

function showNotification(msg,type='info'){
  const n=document.createElement('div'); n.className='notification';
  n.style.background=type==='error'? '#ed4245':type==='success'? '#3ba55d':'#5865f2'; n.textContent=msg;
  document.body.appendChild(n);
  setTimeout(()=>{ n.style.animation='slideOut 0.3s ease'; setTimeout(()=>n.remove(),300); },3000);
}

// ===== Текстовый чат =====
async function sendMessage(e){
  e.preventDefault();
  const input=document.getElementById('messageInput'); const text=input.value.trim();
  if(!text) return;
  const msg={text,userId:currentUser.uid,nickname:document.getElementById('userName').textContent,timestamp:Date.now(),channel:currentChannel};
  await push(ref(db,`messages/${currentServer}/${currentChannel}`),msg);
  input.value=''; scrollMessages();
}

function scrollMessages(){
  const container=document.getElementById('messagesContainer'); if(container) container.scrollTop=container.scrollHeight;
}

async function loadMessages(){
  const container=document.getElementById('messagesContainer'); if(!container) return;
  container.innerHTML='';
  const snapshot=await get(ref(db,`messages/${currentServer}/${currentChannel}`));
  snapshot.forEach(child=>{
    const msg=child.val();
    const div=document.createElement('div'); div.className='message';
    div.innerHTML=`<div class="message-avatar">${msg.nickname.charAt(0).toUpperCase()}</div>
                   <div class="message-content"><div class="message-header"><span>${msg.nickname}</span><span>${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div>
                   <div class="message-text">${msg.text}</div></div>`;
    container.appendChild(div);
  });
  scrollMessages();
}

// ===== Сервера и каналы =====
async function loadChannels(){
  const textChannelsEl=document.getElementById('textChannels'); if(!textChannelsEl) return;
  textChannelsEl.innerHTML='';
  const channels=['general','memes','help']; // пример
  channels.forEach(ch=>{
    const a=document.createElement('a'); a.href='#'; a.className='channel'; a.textContent='# '+ch; a.onclick=()=>switchChannel(ch);
    if(ch===currentChannel) a.classList.add('active');
    textChannelsEl.appendChild(a);
  });
}

function switchChannel(ch){currentChannel=ch; loadMessages(); loadChannels();}

// ===== Realtime =====
function setupRealtimeListeners(){
  onValue(ref(db,`messages/${currentServer}/${currentChannel}`),snapshot=>{
    loadMessages();
  });
}

onAuthStateChanged(auth,user=>{
  if(user){
    currentUser=user;
    get(child(ref(db),`users/${user.uid}`)).then(snapshot=>{
      if(!snapshot.exists()||!snapshot.val().nickname) nicknameModal.style.display='flex';
      else enterApp(snapshot.val());
    });
  } else { loginScreen.style.display='flex'; document.getElementById('app').style.display='none'; }
});
