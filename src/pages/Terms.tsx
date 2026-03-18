import React from 'react';
import { motion } from 'motion/react';

export default function Terms() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-4 space-y-8"
    >
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white text-center">Terms of Service</h1>
      
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/10 prose prose-slate dark:prose-invert max-w-none">
        <p className="text-sm text-gray-500 mb-6">Last Updated: March 15, 2026</p>
        
        <section>
          <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
          <p>By using DDFF, you agree to be bound by these terms. If you do not agree, please do not use our services.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Product Availability</h2>
          <p>Product availability and prices are subject to change without notice. We reserve the right to limit quantities or refuse service to anyone.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Payments</h2>
          <p>All payments are processed securely. You agree to provide accurate and complete payment information for all purchases.</p>
        </section>
      </div>
    </motion.div>
  );
}
