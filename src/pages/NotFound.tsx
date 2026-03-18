import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { motion } from 'motion/react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-6"
      >
        <div className="text-9xl font-black text-[#D4820A]/20">404</div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Page Not Found</h1>
        <p className="text-gray-600 dark:text-slate-400 max-w-md mx-auto">
          Oops! It seems like the page you are looking for has been moved or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link 
            to="/" 
            className="flex items-center space-x-2 bg-[#D4820A] text-white px-8 py-3 rounded-full font-bold hover:bg-[#B87008] transition-all"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
          <Link 
            to="/products" 
            className="flex items-center space-x-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-8 py-3 rounded-full font-bold border border-black/5 dark:border-white/10 hover:shadow-lg transition-all"
          >
            <Search className="w-5 h-5" />
            <span>Browse Products</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
