import React, { useState, useEffect } from 'react';
import { MapPin, Check, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function LocationSelectionModal() {
  const { userLocation, setUserLocation, isLocationModalOpen, setIsLocationModalOpen } = useAuth();
  const [selected, setSelected] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [villages, setVillages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await fetch('/api/delivery-zones');
        if (res.ok) {
          const data = await res.json();
          setVillages(data.map((z: any) => z.name));
        }
      } catch (err) {
        console.error('Failed to fetch delivery zones:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVillages();
  }, []);

  useEffect(() => {
    if (userLocation) {
      setSelected(userLocation);
    }
  }, [userLocation, isLocationModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocation = isCustom ? customLocation : selected;
    if (finalLocation) {
      setUserLocation(finalLocation);
    }
  };

  return (
    <AnimatePresence>
      {isLocationModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-black/5 dark:border-white/10 relative"
          >
            {userLocation && (
              <button 
                onClick={() => setIsLocationModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            )}

            <div className="p-8 sm:p-10 space-y-8">
              <div className="text-center space-y-3">
                <div className="inline-flex p-5 bg-[#D4820A]/10 rounded-3xl text-[#D4820A] mb-2">
                  <MapPin className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {userLocation ? 'Change Location' : 'Where should we deliver?'}
                </h2>
                <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
                  To provide you with the freshest produce and accurate delivery times, please select your village.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 ml-1">
                    Select Village
                  </label>
                  <div className="relative group">
                    <select
                      value={isCustom ? 'custom' : selected}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustom(true);
                          setSelected('');
                        } else {
                          setIsCustom(false);
                          setSelected(e.target.value);
                        }
                      }}
                      className="w-full appearance-none bg-gray-50 dark:bg-slate-800/50 border border-black/5 dark:border-white/10 rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#D4820A]/50 focus:border-[#D4820A] transition-all outline-none cursor-pointer group-hover:bg-white dark:group-hover:bg-slate-800"
                    >
                      <option value="" disabled>{loading ? 'Loading villages...' : 'Choose your location...'}</option>
                      {villages.map((village) => (
                        <option key={village} value={village}>{village}</option>
                      ))}
                      <option value="custom">Other / Not Listed</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ArrowRight className="w-5 h-5 rotate-90" />
                    </div>
                  </div>
                </div>

                {isCustom && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 ml-1">
                      Enter Village Name or Pincode
                    </label>
                    <input 
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="e.g. Nallapadu or 522005"
                      className="w-full bg-gray-50 dark:bg-slate-800/50 border border-black/5 dark:border-white/10 rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#D4820A]/50 focus:border-[#D4820A] transition-all outline-none"
                      autoFocus
                    />
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isCustom ? !customLocation : (!selected || selected === userLocation)}
                  className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center space-x-3 ${
                    (isCustom ? customLocation : (selected && selected !== userLocation))
                      ? 'bg-[#D4820A] text-white hover:bg-[#F39C12] shadow-xl shadow-[#D4820A]/30 hover:-translate-y-0.5 active:translate-y-0' 
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>{userLocation ? 'Update Location' : 'Start Shopping'}</span>
                  <Check className={`w-5 h-5 transition-transform ${selected && selected !== userLocation ? 'scale-100' : 'scale-0'}`} />
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
