import React from 'react';
import { motion } from 'motion/react';

export default function Privacy() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-4 space-y-8"
    >
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white text-center">Privacy Policy</h1>
      
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/10 prose prose-slate dark:prose-invert max-w-none">
        <p className="text-sm text-gray-500 mb-6">Last Updated: March 15, 2026</p>
        
        <section>
          <h2 className="text-xl font-bold">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, place an order, or contact support. This includes your name, email address, phone number, and delivery address.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. How We Use Your Information</h2>
          <p>We use your information to process orders, provide customer support, and improve our services. We may also send you updates about your orders and promotional offers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Third-Party Services</h2>
          <p>We use third-party services for payments (Razorpay) and notifications (Twilio). These services have their own privacy policies regarding how they handle your data.</p>
        </section>
      </div>
    </motion.div>
  );
}
