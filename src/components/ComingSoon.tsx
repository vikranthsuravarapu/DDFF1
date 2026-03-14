import React from 'react';
import { motion } from 'motion/react';
import { MapPin, ArrowRight, Construction } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ComingSoon() {
  const { userLocation, setIsLocationModalOpen } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-8">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-[#D4820A]/10 rounded-full flex items-center justify-center text-[#D4820A]"
      >
        <Construction className="w-12 h-12" />
      </motion.div>

      <div className="max-w-xl space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
          🚜 We haven't reached <span className="text-[#D4820A]">{userLocation || 'your area'}</span> yet — but we're on our way!
        </h1>
        <p className="text-lg text-gray-600 dark:text-slate-400">
          We're working hard to expand our delivery network. We'll notify you as soon as we deliver to your area.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button 
          onClick={() => setIsLocationModalOpen(true)}
          className="bg-[#D4820A] text-white px-8 py-4 rounded-full font-bold flex items-center space-x-2 hover:bg-[#B87008] transition-all shadow-lg shadow-[#D4820A]/20"
        >
          <MapPin className="w-5 h-5" />
          <span>Change Location</span>
        </button>
        
        <button className="text-gray-600 dark:text-slate-400 font-bold flex items-center space-x-1 hover:text-[#D4820A] transition-colors">
          <span>Notify Me</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/10">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Expanding Fast</h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">Adding new villages every week across Guntur district.</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/10">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Quality First</h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">Ensuring our logistics maintain farm-fresh quality.</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/10">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Direct Sourcing</h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">Connecting more farmers directly to your doorstep.</p>
        </div>
      </div>
    </div>
  );
}
