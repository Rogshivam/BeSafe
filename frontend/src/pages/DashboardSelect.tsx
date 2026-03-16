import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, Baby } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import adultImg from '@/assets/adult-monitoring.jpg';
import parentImg from '@/assets/parent-monitoring.jpg';
import childImg from '@/assets/child-safety.jpg';

const dashboards = [
  { title: 'Adult Monitoring', desc: 'AI & Manual Monitoring', icon: Shield, img: adultImg, url: '/dashboard/adult', color: 'from-blue-500 to-blue-700' },
  { title: 'Parent Monitoring', desc: 'Child Location Tracking', icon: Users, img: parentImg, url: '/dashboard/parent', color: 'from-green-500 to-green-700' },
  { title: 'Child Safety Mode', desc: 'Advanced Child Protection', icon: Baby, img: childImg, url: '/dashboard/child', color: 'from-teal-500 to-teal-700' },
];

const DashboardSelect = () => (
  <div className="min-h-screen bg-secondary/30">
    <Navbar />
    <div className="max-w-5xl mx-auto px-6 py-16">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-center text-foreground mb-12"
      >
        Select Dashboard
      </motion.h1>
      <div className="grid md:grid-cols-3 gap-8">
        {dashboards.map((d, i) => (
          <motion.div
            key={d.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="bg-background rounded-2xl shadow-depth overflow-hidden hover:shadow-depth-hover hover:-translate-y-1 transition-all"
          >
            <div className="h-48 overflow-hidden">
              <img src={d.img} alt={d.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 gradient-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 -mt-12 relative z-10 border-4 border-background">
                <d.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-foreground">{d.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{d.desc}</p>
              <Link
                to={d.url}
                className="inline-block px-6 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95"
              >
                Switch to {d.title.split(' ')[0]} Dashboard
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default DashboardSelect;
