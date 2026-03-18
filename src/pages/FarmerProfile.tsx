import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Star, Package, ShieldCheck, Leaf, Sprout, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';

export default function FarmerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, apiFetch } = useAuth();
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [user, navigate]);

  useEffect(() => {
    apiFetch(`/api/farmers/${id}`)
      .then(res => res.json())
      .then(data => {
        setFarmer(data);
        setLoading(false);
      });
  }, [id]);

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="animate-pulse space-y-8">
        <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );

  if (!farmer) return (
    <div className="text-center py-20 dark:text-white">
      <h2 className="text-2xl font-serif italic">Farmer not found</h2>
      <Link to="/products" className="text-[#D4820A] hover:underline mt-4 inline-block">Return to Store</Link>
    </div>
  );

  const embedUrl = getYoutubeEmbedUrl(farmer.video_url);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-16">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-[#D4820A] transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to products</span>
      </button>

      {/* Hero Banner Section */}
      <section className="relative">
        <div className="h-80 md:h-96 rounded-[3rem] overflow-hidden relative shadow-2xl">
          <img 
            src={farmer.image_url || `https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80`} 
            className="w-full h-full object-cover"
            alt={farmer.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <span className="bg-[#D4820A] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                  Verified Village Farmer 🌾
                </span>
                {farmer.farming_since && (
                  <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
                    Farming since {farmer.farming_since}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-5xl md:text-7xl font-serif italic text-white drop-shadow-lg">
                  {farmer.name}
                </h1>
                <div className="flex items-center text-white/80 mt-2">
                  <MapPin className="w-5 h-5 mr-2 text-[#D4820A]" />
                  <span className="text-lg font-medium">{farmer.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story & Speciality Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
        <div className="lg:col-span-2 space-y-12">
          <section className="relative">
            <div className="absolute -top-10 -left-10 text-[#D4820A]/10 select-none">
              <Leaf className="w-40 h-40 transform -rotate-12" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-serif italic text-[#3B2A1A] dark:text-white mb-8 flex items-center">
                <Sprout className="w-8 h-8 mr-3 text-[#D4820A]" />
                Our Farming Story
              </h2>
              <div className="bg-[#FDF6EC] dark:bg-slate-900 p-10 md:p-16 rounded-[3rem] border border-[#D4820A]/10 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Award className="w-32 h-32 text-[#D4820A]" />
                </div>
                <p className="text-2xl md:text-3xl font-serif italic text-[#3B2A1A] dark:text-slate-200 leading-relaxed text-center md:text-left">
                  "{farmer.story || farmer.bio || "Dedicated to preserving traditional agricultural methods, our farm focuses on sustainable practices that respect the land and provide the highest quality produce."}"
                </p>
                <div className="mt-8 flex justify-center md:justify-start">
                  <div className="h-1 w-24 bg-[#D4820A] rounded-full" />
                </div>
              </div>
            </div>
          </section>

          {embedUrl && (
            <section className="space-y-6">
              <h2 className="text-2xl font-serif italic text-[#3B2A1A] dark:text-white flex items-center">
                <Package className="w-6 h-6 mr-2 text-[#D4820A]" />
                Watch Our Farm in Action
              </h2>
              <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white dark:border-slate-800">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={embedUrl} 
                  title="Farmer Story Video" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-8 sticky top-24">
          {farmer.speciality && (
            <div className="bg-[#D4820A] p-8 rounded-[2.5rem] text-white shadow-xl shadow-[#D4820A]/20 transform hover:scale-[1.02] transition-transform">
              <div className="flex items-center space-x-3 mb-4">
                <Award className="w-8 h-8" />
                <span className="text-sm font-bold uppercase tracking-widest opacity-80">Our Speciality</span>
              </div>
              <h3 className="text-3xl font-serif italic leading-tight">
                {farmer.speciality}
              </h3>
              <p className="text-white/70 text-sm mt-4 leading-relaxed">
                Expertly grown using traditional methods passed down through generations.
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-6">
            <h3 className="font-serif italic text-xl dark:text-white">Farm Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                <div className="flex items-center text-gray-500 dark:text-slate-400">
                  <Package className="w-5 h-5 mr-3" />
                  <span className="text-sm font-medium">Total Products</span>
                </div>
                <span className="text-xl font-bold dark:text-white">{farmer.total_products || farmer.products?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                <div className="flex items-center text-gray-500 dark:text-slate-400">
                  <Star className="w-5 h-5 mr-3 text-yellow-500" />
                  <span className="text-sm font-medium">Farmer Rating</span>
                </div>
                <span className="text-xl font-bold dark:text-white">4.9/5</span>
              </div>
            </div>
            <div className="pt-4">
              <div className="flex items-center justify-center space-x-2 text-[#D4820A] font-bold uppercase tracking-widest text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified by DDFF</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Farmer's Products Grid */}
      <section className="space-y-10 pt-8">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif italic text-[#3B2A1A] dark:text-white">
            Products by {farmer.name}
          </h2>
          <div className="flex items-center justify-center space-x-4">
            <div className="h-px w-12 bg-[#D4820A]" />
            <p className="text-gray-500 dark:text-slate-400 font-medium uppercase tracking-widest text-xs">Fresh from the farm</p>
            <div className="h-px w-12 bg-[#D4820A]" />
          </div>
        </div>

        {farmer.products && farmer.products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {farmer.products.map((product: any) => (
              <ProductCard 
                key={product.id} 
                product={{ ...product, farmer_name: farmer.name }} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-black/5 dark:border-white/5">
            <Package className="w-16 h-16 text-gray-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400 font-serif italic text-xl">No products listed yet by this farmer.</p>
          </div>
        )}
      </section>
    </div>
  );
}
