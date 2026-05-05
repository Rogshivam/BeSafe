import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Phone, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface ChatbotWidgetProps {
  role: 'adult' | 'parent' | 'child';
}

const predefinedResponses: Record<string, string> = {
  'hi': "Hello! I'm Be-Safe AI. How can I help you stay safe today? 🛡️",
  'hello': "Hi there! I'm here to help. Ask me anything about your safety.",
  'hlo': "Hey! I'm Be-Safe AI assistant. Need help with anything?",
  'hey': "Hey! How can I assist you with your safety today?",
  'what i do': "Here's what you can do:\n• 📷 Capture photos for evidence\n• 🎙️ Record audio\n• 📍 Share your location\n• 📞 Call emergency contacts\n• 🚨 Send SOS alert\n• 📋 View activity logs",
  'help': "I can help you with:\n• Emergency calls\n• Location sharing\n• Safety tips\n• Evidence collection\nWhat do you need?",
  'am in danger': "🚨 STAY CALM! I'm showing you the emergency call button now. Press it immediately!",
  'i am in danger': "🚨 STAY CALM! I'm showing you the emergency call button now. Press it immediately!",
  'danger': "🚨 If you're in danger:\n1. Press the SOS button\n2. Call emergency services\n3. Share your location\nStay calm, help is coming!",
  'emergency': "🚨 Emergency options:\n• Call 100 (Police)\n• Call your emergency contacts\n• Send bulk danger alert\n• Share your live location",
  'location': "📍 Use the 'Send Location' button on the dashboard to share your GPS coordinates with emergency contacts.",
  'call': "📞 Use the Emergency Contacts section to one-tap call any saved contact.",
  'safe': "✅ Glad you're safe! Remember to keep your emergency contacts updated and location sharing on.",
  'thank you': "You're welcome! Stay safe! 🛡️",
  'thanks': "Happy to help! Stay safe out there! 🛡️",
};

const findResponse = (input: string, role: string): { text: string; showEmergency: boolean } => {
  const lower = input.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(predefinedResponses)) {
    if (lower.includes(key)) {
      const isDanger = key.includes('danger');
      return { text: value, showEmergency: isDanger };
    }
  }

  // Default responses by role
  if (role === 'child') {
    return { text: "I'm your safety buddy! If you feel unsafe, press the big SOS button. Need to call Mom or Dad? 🛡️", showEmergency: false };
  }
  if (role === 'parent') {
    return { text: "I can help you check your child's location, review safety logs, or manage alerts. What do you need?", showEmergency: false };
  }
  return { text: "I can help with threat monitoring, evidence review, and emergency protocols. What do you need assistance with?", showEmergency: false };
};

const getWelcome = (role: string) => {
  if (role === 'child') return "Hi! I'm your safety buddy! 🛡️ Need help? Just ask!";
  if (role === 'parent') return "Hello! I can help you locate your child and manage safety settings.";
  return "System assistant ready. I can help with monitoring, alerts, and emergency protocols.";
};

export const ChatbotWidget = ({ role }: ChatbotWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; isBot: boolean; showEmergency?: boolean }[]>([
    { text: getWelcome(role), isBot: true },
  ]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, isBot: false }]);
    const userInput = input;
    setInput('');
    setTimeout(() => {
      const response = findResponse(userInput, role);
      setMessages(prev => [...prev, { text: response.text, isBot: true, showEmergency: response.showEmergency }]);
    }, 500);
  };

  const callEmergency = () => {
    if (role === 'child') {
      window.open('tel:+1234567890', '_self'); // Parent's number
    } else {
      window.open('tel:100', '_self');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            <div className="gradient-dark p-4 text-primary-foreground flex justify-between items-center">
              <span className="font-bold">Be-Safe AI</span>
              <button onClick={() => setIsOpen(false)} className="opacity-60 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 h-72 overflow-y-auto space-y-3 bg-secondary/30">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                      msg.isBot
                        ? 'bg-card shadow-depth rounded-tl-none text-foreground'
                        : 'gradient-primary text-primary-foreground rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                  {msg.showEmergency && msg.isBot && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={callEmergency}
                        className="flex-1 py-2 gradient-emergency text-destructive-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
                      >
                        <Phone className="w-3 h-3" /> {role === 'child' ? 'Call Parents' : 'Call 100'}
                      </button>
                      <button
                        onClick={() => window.open('tel:100', '_self')}
                        className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
                      >
                        <AlertTriangle className="w-3 h-3" /> Call Police
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border bg-card flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 ring-primary/20 text-foreground"
              />
              <button onClick={sendMessage} className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center text-primary-foreground">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 gradient-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
};
