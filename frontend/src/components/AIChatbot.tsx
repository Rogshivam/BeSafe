import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Phone, AlertTriangle } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  action?: { type: "call"; number: string; label: string };
}

const predefinedResponses: Record<string, { text: string; action?: Message["action"] }> = {
  hi: { text: "Hello! I'm your Be-Safe AI assistant. How can I help you stay safe today? 😊" },
  hello: { text: "Hi there! I'm here to help you. You can ask me safety tips or use the emergency features." },
  hlo: { text: "Hey! I'm Be-Safe AI. Ask me anything about staying safe!" },
  help: { text: "I can help with:\n• Emergency SOS calls\n• Safety tips\n• Sending location\n• Contacting emergency services\n\nJust type what you need!" },
  "what i do": { text: "If you feel unsafe:\n1. Stay calm\n2. Move to a safe, well-lit area\n3. Call emergency services or your parent\n4. Share your location with trusted contacts\n5. Use the SOS button on your dashboard" },
  "what should i do": { text: "First, assess your situation. If you're in immediate danger, use the SOS button. Otherwise, share your location with a trusted contact and move to a safe area." },
  "am in danger": {
    text: "🚨 I'm sorry you're in danger! Stay calm. I recommend calling emergency services immediately.",
    action: { type: "call", number: "tel:112", label: "Call Emergency (112)" },
  },
  "i am in danger": {
    text: "🚨 Please stay safe! Call for help right away. Here's a quick dial button:",
    action: { type: "call", number: "tel:112", label: "Call Emergency (112)" },
  },
  "im in danger": {
    text: "🚨 Emergency detected! Please use the button below to call for help immediately.",
    action: { type: "call", number: "tel:112", label: "Call Emergency (112)" },
  },
  "safety tips": { text: "🛡️ Safety Tips:\n• Always tell someone where you're going\n• Keep your phone charged\n• Learn your emergency numbers\n• Trust your instincts\n• Stay in well-lit, populated areas\n• Keep emergency contacts updated" },
  emergency: {
    text: "🚨 If this is an emergency, please call now:",
    action: { type: "call", number: "tel:112", label: "Call Emergency (112)" },
  },
  sos: {
    text: "🆘 Activating SOS mode! Call emergency services now:",
    action: { type: "call", number: "tel:112", label: "Call Emergency (112)" },
  },
  thanks: { text: "You're welcome! Stay safe! 💚" },
  "thank you": { text: "Happy to help! Remember, your safety is the top priority. 💚" },
  bye: { text: "Stay safe out there! Don't hesitate to reach out anytime. 👋" },
};

const AIChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "👋 Hi! I'm your Be-Safe AI assistant. I can help with safety tips, emergency calls, and more. Try saying 'help' to see what I can do!",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Find response
    setTimeout(() => {
      const key = Object.keys(predefinedResponses).find((k) =>
        text.toLowerCase().includes(k)
      );
      const response = key
        ? predefinedResponses[key]
        : {
            text: "I'm not sure about that. Try asking about 'safety tips', 'what should I do', or say 'help' to see all options. If you're in danger, type 'emergency' or 'SOS'.",
          };

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: "bot",
        action: response.action,
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">AI Safety Assistant</h2>
        <p className="text-muted-foreground text-sm mt-1">Chat with our AI for safety guidance</p>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto mt-4 space-y-3 pr-2">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex gap-2 max-w-[80%] ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.sender === "bot" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                }`}
              >
                {msg.sender === "bot" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground shadow-card"
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.text}</p>
                {msg.action && (
                  <button
                    onClick={() => window.open(msg.action!.number, "_self")}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-emergency text-emergency-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {msg.action.type === "call" ? <Phone className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {msg.action.label}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message... (try 'help', 'safety tips', 'SOS')"
          className="flex-1 px-4 py-3 rounded-2xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-card"
        />
        <button
          onClick={sendMessage}
          className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AIChatbot;
