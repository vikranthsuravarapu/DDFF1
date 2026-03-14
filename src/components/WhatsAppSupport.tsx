import React from 'react';
import { motion } from 'motion/react';

export default function WhatsAppSupport() {
  const whatsappNumber = process.env.VITE_SUPPORT_WHATSAPP;
  
  if (!whatsappNumber || whatsappNumber === '919XXXXXXXXX') {
    console.warn("WhatsApp Support number is not configured. Please set VITE_SUPPORT_WHATSAPP in your environment variables.");
    return null;
  }

  const message = encodeURIComponent("Hi! I need help with my DDFF order.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <div className="fixed bottom-24 right-6 md:bottom-6 md:right-24 z-[100] group">
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
        Chat with us on WhatsApp 💬
        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-900" />
      </div>

      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl shadow-green-500/20 hover:shadow-green-500/40 transition-shadow ring-4 ring-white dark:ring-slate-900"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .011 5.403.008 12.039a11.81 11.81 0 001.532 5.795L0 24l6.363-1.67a11.804 11.804 0 005.683 1.448h.005c6.635 0 12.04-5.403 12.043-12.04a11.82 11.82 0 00-3.48-8.513z"/>
        </svg>
      </motion.a>
    </div>
  );
}
