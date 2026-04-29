import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    setOpen(false);
    navigate("/auth");
  };

  // Extract initial (first letter of name or email)
  const initial =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "?";

  return (
    <div className="relative">
      {/* Avatar Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.9 }}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 
                   text-black font-bold flex items-center justify-center 
                   shadow-lg hover:shadow-yellow-500/20 transition"
      >
        {initial}
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-40 rounded-xl 
                       bg-[#111111]/80 backdrop-blur-lg border border-gray-800 
                       shadow-xl text-gray-200 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-gray-700 text-sm">
              {user?.displayName || user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 transition"
            >
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
