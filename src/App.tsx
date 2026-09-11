import { useState } from "react";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import MessagesPage from "./pages/MessagesPage";
import NotesPage from "./pages/NotesPage";
import GalleryPage from "./pages/GalleryPage";
import PlaylistPage from "./pages/PlaylistPage";
import BucketListPage from "./pages/BucketListPage";
import ReasonsPage from "./pages/ReasonsPage";
import PromisesPage from "./pages/PromisesPage";
import DreamsPage from "./pages/DreamsPage";
import WishlistPage from "./pages/WishlistPage";
import LoveIntro from "./components/LoveIntro";
import FloatingLilies from "./components/FloatingLilies";
import type { View } from "./types";
import "./App.css";

function MainApp() {
  const [view, setView] = useState<View>("home");

  function navigate(next: View) {
    setView(next);
    window.scrollTo(0, 0);
  }

  function goHome() {
    navigate("home");
  }

  return (
    <div className="min-h-screen bg-noir text-stone-200">
      {view === "home" && <HomePage onNavigate={navigate} />}
      {view === "messages" && <MessagesPage onBack={goHome} />}
      {view === "notes" && <NotesPage onBack={goHome} />}
      {view === "gallery" && <GalleryPage onBack={goHome} />}
      {view === "music" && <PlaylistPage onBack={goHome} />}
      {view === "bucket" && <BucketListPage onBack={goHome} />}
      {view === "reasons" && <ReasonsPage />}
      {view === "promises" && <PromisesPage />}
      {view === "dreams" && <DreamsPage />}
      {view === "wishlist" && <WishlistPage />}
      <NavBar view={view} onNavigate={navigate} />
      <FloatingLilies />
    </div>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) return <LoveIntro onFinish={() => setShowIntro(false)} />;
  return <MainApp />;
}