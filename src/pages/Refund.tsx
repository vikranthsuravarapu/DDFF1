import React from 'react';
import { motion } from 'motion/react';

export default function Refund() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-4 space-y-8"
    >
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white text-center">Refund Policy</h1>
      
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/10 prose prose-slate dark:prose-invert max-w-none">
        <p className="text-sm text-gray-500 mb-6">Last Updated: March 15, 2026</p>
        
        <section>
          <h2 className="text-xl font-bold">1. Perishable Goods</h2>
          <p>Due to the perishable nature of our products (fruits, vegetables, etc.), we generally do not accept returns. However, if you receive a damaged or spoiled product, please contact us within 2 hours of delivery.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Damaged or Incorrect Items</h2>
          <p>If you receive an incorrect or damaged item, please provide a photo of the product via our support channel. We will either issue a refund to your wallet or send a replacement.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Refund Process</h2>
          <p>Approved refunds will be credited to your DDFF wallet within 24 hours. Wallet balance can be used for future purchases on our platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Cancellations</h2>
          <p>Orders can be cancelled before they are out for delivery. Once an order is out for delivery, it cannot be cancelled or refunded.</p>
        </section>
      </div>
    </motion.div>
  );
}
