import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const provider = new GoogleAuthProvider();

// Helper to translate Firebase error codes to friendly messages
function handleAuthError(error) {
  const errorCode = error.code;

  switch (errorCode) {
    case "auth/email-already-in-use":
      return "That email is already in use. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again later.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before completion.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// Create new user
export const signup = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    throw new Error(handleAuthError(error));
  }
};

// Log in existing user
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    throw new Error(handleAuthError(error));
  }
};
// Save user info 
export const saveUserProfile = async (user) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email,
      createdAt: new Date(),
    });
  }
};

// Log out
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error("Error logging out. Try again.");
  }
};

// Google login
export const googleLogin = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    throw new Error(handleAuthError(error));
  }
};
