import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import workspaceIllustration from '@/assets/workspace-illustration.png';

const Contact = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <img src={workspaceIllustration} alt="Workspace" className="max-h-[450px] object-contain mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gradient-primary italic">
            Connect<br />with Us
          </h1>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="text-lg font-medium text-primary">help@besafe.com</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Social</p>
              <p className="text-lg font-medium text-foreground">@be-safe</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone</p>
              <p className="text-lg font-medium text-primary">123-456-7890</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
    <Footer />
  </div>
);

export default Contact;
