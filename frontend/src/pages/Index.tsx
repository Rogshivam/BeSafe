import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, MapPin, Camera, ArrowRight, Shield, Eye } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import heroBg from '@/assets/hero-bg.jpg';
import dashboardPreview from '@/assets/dashboard-preview.jpg';
import mapPreview from '@/assets/map-preview.jpg';
import mobilePreview from '@/assets/mobile-app-preview.jpg';

const features = [
  { icon: Shield, title: 'AI Threat Detection', desc: 'All-in-one safety solution for every family.' },
  { icon: MapPin, title: 'Child Safety Tracking', desc: 'All-in-one safety solutions and real-time tracking.' },
  { icon: Camera, title: 'Evidence Capture', desc: 'Captures and stores safety evidence securely.' },
];

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/40" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-background"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">Be-Safe</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              BeSafe AI Safety Platform
            </h1>
            <p className="text-xl opacity-80 mb-8 max-w-lg">
              Protecting Adults, Parents and Children with intelligent monitoring.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login" className="px-8 py-4 gradient-primary text-primary-foreground rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center gap-2">
                Start Monitoring <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/dashboard/select" className="px-8 py-4 bg-background text-foreground rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95">
                View Dashboard
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-background/20">
              <img src={dashboardPreview} alt="Dashboard Preview" className="w-full" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              viewport={{ once: true }}
              className="bg-background rounded-2xl p-6 shadow-depth hover:shadow-depth-hover hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Child Safety Overview (green section) */}
    <section className="mx-4 my-12 gradient-primary rounded-4xl overflow-hidden">
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex items-start justify-between mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-3">Child Safety Overview</h2>
            <p className="text-lg text-primary-foreground/80">Monitor your child's location easily</p>
          </div>
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-2xl"
          >
            <img src={mapPreview} alt="Map Tracking" className="w-full h-80 object-cover" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-2xl"
          >
            <img src={mobilePreview} alt="Mobile App" className="w-full h-80 object-cover" />
          </motion.div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 text-center">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Monitor, Protect, Respond</h2>
        <p className="text-muted-foreground mb-8">All-in-one safety solution for every family.</p>
        <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 gradient-primary text-primary-foreground rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95">
          Get Started <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>

    <Footer />
  </div>
);

export default Index;
