import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import SplashScreen from "./components/SplashScreen";
import Home from "./pages/Home";
import Rent from "./pages/Rent";
import RentDetail from "./pages/RentDetail";
import Sell from "./pages/Sell";
import PostAd from "./pages/PostAd";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import News from "./pages/News";
import MyAds from "./pages/MyAds";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import RentDashboard from "./pages/RentDashboard";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  function handleSplashDone() {
    setShowSplash(false);
  }

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 antialiased dark:bg-zinc-900 dark:text-zinc-100">
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rent" element={<Rent />} />
                <Route path="/rent-detail" element={<RentDetail />} />
                <Route path="/sell" element={<Sell />} />
                <Route path="/post-ad" element={<PostAd />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/about" element={<About />} />
                <Route path="/news" element={<News />} />
                <Route path="/my-ads" element={<MyAds />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/rent-dashboard" element={<RentDashboard />} />
              </Routes>
            </>
          }
        />
      </Routes>
    </div>
  );
}
