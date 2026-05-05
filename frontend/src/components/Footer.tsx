import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const Footer = () => (
  <footer className="bg-foreground text-background py-12">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Be-Safe</span>
          </div>
          <p className="text-sm opacity-60">AI-powered safety monitoring for everyone.</p>
        </div>
        <div>
          <h4 className="font-bold mb-3">Product</h4>
          <div className="space-y-2 text-sm opacity-60">
            <Link to="/" className="block hover:opacity-100">Home</Link>
            <Link to="/about" className="block hover:opacity-100">About</Link>
            <Link to="/contact" className="block hover:opacity-100">Contact</Link>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-3">Features</h4>
          <div className="space-y-2 text-sm opacity-60">
            <p>AI Threat Detection</p>
            <p>Child Safety Tracking</p>
            <p>Evidence Capture</p>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-3">Contact</h4>
          <div className="space-y-2 text-sm opacity-60">
            <p>help@besafe.com</p>
            <p>@besafe</p>
            <p>123-456-7890</p>
          </div>
        </div>
      </div>
      <div className="border-t border-background/10 mt-8 pt-8 text-center text-sm opacity-40">
        © 2026 Be-Safe. All rights reserved.
      </div>
    </div>
  </footer>
);
