// Import the Firebase SDKs from a CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your CARE Firebase configuration details
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Get this from your Firebase Console settings
  authDomain: "care-8ae9e.firebaseapp.com",
  projectId: "care-8ae9e",
  storageBucket: "care-8ae9e.firebasestorage.app",
  messagingSenderId: "285081077754",
  appId: "YOUR_APP_ID" // Get this from your Firebase Console settings
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Sign-In Event
const googleBtn = document.getElementById("googleBtn");
googleBtn.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log("Logged in with Google as:", result.user.displayName);
    })
    .catch((error) => console.error("Google sign-in error:", error));
});

// Email Sign-Up Event
const emailSignUpBtn = document.getElementById("emailSignUpBtn");
emailSignUpBtn.addEventListener("click", () => {
  const email = document.getElementById("emailInput").value;
  const password = document.getElementById("passwordInput").value;
  
  createUserWithEmailAndPassword(auth, email, password)
    .then((result) => {
      console.log("Email account created for:", result.user.email);
    })
    .catch((error) => console.error("Email sign-up error:", error));
});

