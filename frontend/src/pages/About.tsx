import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import familySilhouette from '@/assets/family-silhouette.png';

const FloatingLeaf = () => (
  <motion.div
    animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    className="absolute top-20 right-20 text-primary/40"
  >
    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
    </svg>
  </motion.div>
);

const About = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <section className="relative py-20 overflow-hidden">
      <FloatingLeaf />
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center min-h-[70vh]">
        {/* Left: illustration */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 opacity-60 -top-10 -left-10" />
          <div className="absolute w-56 h-56 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 opacity-50 top-20 left-20" />
          <div className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 opacity-40 bottom-10 right-10" />
          <img src={familySilhouette} alt="Family" className="relative z-10 max-h-[500px] object-contain" />
        </motion.div>

        {/* Right: content */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <p className="text-muted-foreground text-sm tracking-widest uppercase">Be-Safe</p>
          <h1 className="text-5xl md:text-7xl font-bold text-foreground">Safety</h1>
          <p className="text-xl text-muted-foreground uppercase tracking-wider">Your Presenter</p>
          <div className="w-32 h-1 gradient-primary rounded-full" />
          <p className="text-muted-foreground leading-relaxed max-w-md">
            Be-Safe is an AI-powered safety monitoring platform designed to protect adults, parents, and children.
            Our intelligent monitoring system provides real-time threat detection, child location tracking, and evidence capture.
          </p>
        </motion.div>
      </div>
    </section>
    <Footer />
  </div>
);

export default About;
