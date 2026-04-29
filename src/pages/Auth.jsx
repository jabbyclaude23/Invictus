import React, { useState } from "react";
import { signup, login, logout, googleLogin } from "../auth";
import googleLogo from "../assets/google.svg"; // you'll add this file

export default function Auth() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    try {
      const action = isSignup ? signup : login;
      const result = await action(email, password);
      setUser(result.user);
      localStorage.setItem("user", JSON.stringify(result.user));
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const result = await googleLogin();
      setUser(result.user);
      localStorage.setItem("user", JSON.stringify(result.user));
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-[#0a0a0a] to-[#1a1a1a] text-white relative overflow-hidden">
      {/* Gold glow overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-gold/10 via-transparent to-transparent blur-3xl"></div>

      <div className="relative z-10 w-full max-w-sm bg-black/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold mb-6 text-center text-gold">
          {isSignup ? "Create Account" : "Welcome Back"}
        </h1>

        {error && (
          <p className="text-red-400 text-center text-sm mb-4">{error}</p>
        )}

        {!user ? (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-gold focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6 w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-gold focus:outline-none"
            />

            <button
              onClick={handleAuth}
              className="w-full bg-gold hover:bg-yellow-400 text-black font-semibold py-3 rounded-lg mb-3 transition-all"
            >
              {isSignup ? "Sign Up" : "Log In"}
            </button>

            <button
              onClick={handleGoogle}
              className="flex items-center justify-center w-full bg-white text-gray-900 py-3 rounded-lg hover:bg-gray-100 transition-all"
            >
              <img src={googleLogo} alt="Google" className="w-5 h-5 mr-2" />
              Continue with Google
            </button>

            <p
              onClick={() => setIsSignup(!isSignup)}
              className="mt-6 text-sm text-gray-400 text-center cursor-pointer hover:text-gold"
            >
              {isSignup
                ? "Already have an account? Log in"
                : "Don't have an account? Sign up"}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-6 text-center text-gold">
              Welcome, {user.email}
            </h1>
            <button
              onClick={logout}
              className="bg-gray-800 px-6 py-2 rounded w-full"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
