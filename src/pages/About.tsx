import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

export default function About() {
  const { t } = useLanguage();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-4 space-y-8"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">About DDFF</h1>
        <p className="text-lg text-gray-600 dark:text-slate-400">Direct Delivery From Farmer</p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
        <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/10">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p>
            DDFF (Direct Delivery From Farmer) was founded with a simple yet powerful mission: to bridge the gap between local farmers and health-conscious consumers. We believe that everyone deserves access to fresh, organic, and traditionally grown food, while farmers deserve fair compensation for their hard work.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/10">
          <h2 className="text-2xl font-bold mb-4">Why Choose Us?</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Direct from Source:</strong> We eliminate middlemen, ensuring that products reach you directly from the farms.</li>
            <li><strong>Organic & Traditional:</strong> Our farmers use natural methods and traditional wisdom to grow food that is both healthy and flavorful.</li>
            <li><strong>Fair Trade:</strong> By buying from us, you are directly supporting rural farming communities and helping them thrive.</li>
            <li><strong>Quality Guaranteed:</strong> Every product is handpicked and checked for quality before it reaches your doorstep.</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/10">
          <h2 className="text-2xl font-bold mb-4">Our Roots</h2>
          <p>
            Based in the heart of Andhra Pradesh, we focus on sourcing the finest products from regions like Guntur and Vijayawada. From pure honey and traditional spices to fresh pulses and seasonal fruits, we bring the authentic taste of the village to your modern home.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
