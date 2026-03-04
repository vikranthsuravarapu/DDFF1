import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Star, Package, ShieldCheck } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function FarmerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/farmers/${id}`)
      .then(res => res.json())
      .then(data => {
        setFarmer(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-3xl transition-colors" />;
  if (!farmer) return <div className="text-center py-20 dark:text-white">Farmer not found</div>;

  return (
    <div className="space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-[#D4820A] transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm transition-colors">
        <div className="h-48 bg-gradient-to-r from-[#D4820A] to-[#B87008]" />
        <div className="px-8 pb-8 -mt-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
              <div className="w-32 h-32 rounded-3xl border-4 border-white dark:border-slate-800 overflow-hidden bg-gray-100 dark:bg-slate-700 shadow-xl transition-colors">
                <img 
                  src={farmer.image_url || `https://picsum.photos/seed/farmer${farmer.id}/400/400`} 
                  alt={farmer.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center md:text-left space-y-1">
                <h1 className="text-3xl font-bold dark:text-slate-100">{farmer.name}</h1>
                <div className="flex items-center justify-center md:justify-start space-x-2 text-gray-500 dark:text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{farmer.location}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-2xl flex items-center space-x-2 font-bold text-sm transition-colors">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Farmer</span>
              </div>
              <div className="bg-[#D4820A]/10 text-[#D4820A] px-4 py-2 rounded-2xl flex items-center space-x-2 font-bold text-sm">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(farmer.joined_at).getFullYear()}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-xl font-bold dark:text-slate-100">About the Farmer</h2>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                {farmer.bio || "This farmer is dedicated to providing the freshest organic products directly from their village farms to your doorstep."}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-black/5 dark:border-white/5 space-y-4 transition-colors">
              <h3 className="font-bold dark:text-slate-100">Farmer Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-slate-400">
                    <Package className="w-4 h-4" />
                    <span>Products</span>
                  </div>
                  <span className="font-bold dark:text-slate-100">{farmer.products?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-slate-400">
                    <Star className="w-4 h-4" />
                    <span>Rating</span>
                  </div>
                  <span className="font-bold dark:text-slate-100">4.9/5.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Farmer's Products */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold dark:text-white">Products from {farmer.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {farmer.products?.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
