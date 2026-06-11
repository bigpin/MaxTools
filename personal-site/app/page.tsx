import About from '@/components/About';
import Contact from '@/components/Contact';
import CursorGlow from '@/components/CursorGlow';
import Hero from '@/components/Hero';
import Navbar from '@/components/Navbar';
import Tools from '@/components/Tools';

export default function Home() {
  return (
    <>
      <CursorGlow />
      <Navbar />
      <main className="relative min-h-screen">
        <Hero />
        <About />
        <Tools />
        <Contact />
      </main>
      <footer className="text-center py-6 text-[#475569] text-xs border-t border-white/5">
        &copy; 2026 Max &middot; Built with Next.js &amp; Tailwind CSS
      </footer>
    </>
  );
}
