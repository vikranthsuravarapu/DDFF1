import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { getAIResponse } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export default function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Namaste! I am your DDFF assistant. How can I help you today? I can suggest recipes, explain health benefits of our products, or help you find what you need.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('ai_voice_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('ai_voice_enabled', voiceEnabled.toString());
  }, [voiceEnabled]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Auto send if voice input is clear
        handleSend(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim()) return;

    const userMessage = messageToSend.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    const aiResponse = await getAIResponse(userMessage);
    const finalResponse = aiResponse || "I couldn't generate a response.";
    setMessages(prev => [...prev, { role: 'ai', content: finalResponse }]);
    setIsTyping(false);
    
    if (voiceEnabled) {
      speak(finalResponse);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#D4820A] text-white p-3.5 rounded-full shadow-2xl hover:scale-110 transition-all z-[100] group ring-4 ring-white dark:ring-slate-900"
      >
        <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-20 right-6 left-6 md:left-auto w-auto md:w-80 h-[450px] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden z-[120] transition-colors"
          >
            {/* Header */}
            <div className="p-4 bg-[#D4820A] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="w-6 h-6" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">DDFF AI Assistant</span>
                  {isSpeaking && <span className="text-[10px] animate-pulse">Speaking...</span>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const nextState = !voiceEnabled;
                    setVoiceEnabled(nextState);
                    if (!nextState) {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  title={voiceEnabled ? 'Disable Voice' : 'Enable Voice'}
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900 transition-colors">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#D4820A] text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-black/5 dark:border-white/10 rounded-tl-none shadow-sm transition-colors'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-500 p-3 rounded-2xl rounded-tl-none border border-black/5 dark:border-white/10 shadow-sm text-xs animate-pulse transition-colors">
                    Assistant is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-black/5 dark:border-white/10 flex items-center space-x-2 transition-colors">
              <button
                onClick={toggleListening}
                className={`p-3 rounded-xl transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
                title={isListening ? 'Stop Listening' : 'Voice Search'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                placeholder={isListening ? 'Listening...' : "Ask about recipes or products..."}
                className="flex-grow p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-black/5 dark:border-white/10 outline-none focus:ring-2 focus:ring-[#D4820A]/20 text-sm text-slate-900 dark:text-white transition-colors"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={() => handleSend()}
                className="p-3 bg-[#D4820A] text-white rounded-xl hover:bg-[#B87008] transition-colors shadow-lg shadow-[#D4820A]/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
