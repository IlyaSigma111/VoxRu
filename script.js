import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvqVxSb9ayY3ngcWATR-He04bGm8m6lZg",
  authDomain: "voxru-d4874.firebaseapp.com",
  projectId: "voxru-d4874",
  storageBucket: "voxru-d4874.firebasestorage.app",
  messagingSenderId: "551341878771",
  appId: "1:551341878771:web:43e1d6b0930ea6b4af7686"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// элементы
const login = document.getElementById("login");
const appEl = document.getElementById("app");
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("usernameInput");

const chatEl = document.getElementById("chat");
const sendBtn = document.getElementById("sendBtn");
const inputEl = document.getElementById("messageInput");
const usernameEl = document.getElementById("username");
const avatarEl = document.getElementById("avatar");

let currentUser = null;

// LOGIN
loginBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Введи ник");

  currentUser = {
    name,
    color: "#" + Math.floor(Math.random()*16777215).toString(16)
  };

  localStorage.setItem("voxruUser", JSON.stringify(currentUser));
  startApp();
};

function startApp() {
  login.classList.add("hidden");
  appEl.classList.remove("hidden");

  usernameEl.textContent = currentUser.name;
  avatarEl.textContent = currentUser.name[0].toUpperCase();
  avatarEl.style.background = currentUser.color;
}

// авто-логин
const saved = localStorage.getItem("voxruUser");
if (saved) {
  currentUser = JSON.parse(saved);
  startApp();
}

// SEND
sendBtn.onclick = async () => {
  const text = inputEl.value.trim();
  if (!text) return;

  await addDoc(collection(db, "messages"), {
    text,
    author: currentUser.name,
    color: currentUser.color,
    createdAt: Date.now()
  });

  inputEl.value = "";
};

// RECEIVE
const q = query(collection(db, "messages"), orderBy("createdAt"));

onSnapshot(q, (snap) => {
  chatEl.innerHTML = "";
  snap.forEach((doc) => {
    const m = doc.data();
    const div = document.createElement("div");
    div.className = "message";
    if (m.author === currentUser?.name) div.classList.add("me");

    div.innerHTML = `
      <div class="author" style="color:${m.color}">${m.author}</div>
      <div>${m.text}</div>
    `;
    chatEl.appendChild(div);
  });
  chatEl.scrollTop = chatEl.scrollHeight;
});
