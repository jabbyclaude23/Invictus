import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Dumbbell, Utensils, LineChart, User, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import UserMenu from "../components/UserMenu";

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [hideNav, setHideNav] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [user, setUser] = useState(null);

  const tabs = [
    { to: "/workout", icon: <Dumbbell />, label: "Workout" },
    { to: "/meals", icon: <Utensils />, label: "Meals" },
    { to: "/", icon: <Home />, label: "Dashboard" },
    { to: "/trading", icon: <LineChart />, label: "Trading" },
    { to: "/coach", icon: <User />, label: "Coach" },
  ];

  // 🔐 Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return unsubscribe;
  }, []);

  // 🧭 Hide Nav on Scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setHideNav(currentScrollY > lastScrollY && currentScrollY > 60);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // 📱 Swipe Navigation
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let deltaY = 0;
    let isSwiping = false;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = false;
    };

    const handleTouchMove = (e) => {
      deltaX = e.touches[0].clientX - startX;
      deltaY = e.touches[0].clientY - startY;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 90) isSwiping = true;
    };

    const handleTouchEnd = (e) => {
      if (!isSwiping) return;
      const currentIndex = tabs.findIndex((t) => t.to === location.pathname);
      const direction = e.changedTouches[0].clientX < startX ? 1 : -1;
      const nextTab = tabs[currentIndex + direction];
      if (nextTab) navigate(nextTab.to);
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [location.pathname]);

  // Hide nav when on Coach screen
  const isCoach = location.pathname.includes("/coach");

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      {!isCoach && (
        <header className="flex justify-between items-center px-6 py-3 border-b border-[#222] bg-[#0b0b0b]/70 backdrop-blur-md sticky top-0 z-40 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <h1 className="text-xl font-bold tracking-[4px] text-yellow-400 drop-shadow-[0_0_8px_rgba(250,192,0,0.35)]">
            INVICTUS
          </h1>
          <div className="flex items-center space-x-3">
            {user && <UserMenu user={user} onLogout={() => navigate("/auth")} />}
          </div>
        </header>
      )}

      {/* Page transition */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Bottom Nav */}
      {!isCoach && (
        <nav
          className={`fixed bottom-0 left-0 w-full flex justify-around py-3 transition-transform duration-500 backdrop-blur-md bg-[#0b0b0b]/70 border-t border-[#222] ${
            hideNav ? "translate-y-full" : "translate-y-0"
          }`}
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center text-sm ${
                  isActive ? "text-yellow-400" : "text-gray-400"
                }`
              }
            >
              {tab.icon}
              <span className="text-xs mt-1">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}