import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Edit2, Trash2, MapPin, Info, Image as ImageIcon, Search, Loader2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Farmer {
  id: number;
  name: string;
  location: string;
  bio: string;
  image_url: string;
  story: string;
  farming_since: number;
  speciality: string;
  video_url: string;
  created_at: string;
}

export default function AdminFarmers() {
  console.log('[AdminFarmers] Rendering component');
  const { token, apiFetch } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    bio: '',
    image_url: '',
    story: '',
    farming_since: new Date().getFullYear(),
    speciality: '',
    video_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/farmers');
      const data = await res.json();
      setFarmers(data);
    } catch (e) {
      console.error('Failed to fetch farmers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (farmer?: Farmer) => {
    if (farmer) {
      setEditingFarmer(farmer);
      setFormData({
        name: farmer.name,
        location: farmer.location,
        bio: farmer.bio || '',
        image_url: farmer.image_url || '',
        story: farmer.story || '',
        farming_since: farmer.farming_since || new Date().getFullYear(),
        speciality: farmer.speciality || '',
        video_url: farmer.video_url || ''
      });
    } else {
      setEditingFarmer(null);
      setFormData({
        name: '',
        location: '',
        bio: '',
        image_url: '',
        story: '',
        farming_since: new Date().getFullYear(),
        speciality: '',
        video_url: ''
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const url = editingFarmer ? `/api/admin/farmers/${editingFarmer.id}` : '/api/admin/farmers';
    const method = editingFarmer ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchFarmers();
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (e) {
      setError('Failed to save farmer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    console.log('[AdminFarmers] Deleting farmer:', id);
    setIsDeleting(true);
    setError(null);
    try {
      let res = await apiFetch(`/api/admin/farmers/${id}`, {
        method: 'DELETE'
      });

      // Fallback to POST if DELETE is not allowed
      if (res.status === 405 || res.status === 404) {
        res = await apiFetch(`/api/admin/farmers/${id}/delete`, {
          method: 'POST'
        });
      }

      const data = await res.json();
      if (res.ok) {
        console.log('[AdminFarmers] Farmer deleted successfully');
        setDeleteConfirmId(null);
        fetchFarmers();
      } else {
        console.error('[AdminFarmers] Delete failed:', data.error);
        setError(data.error || 'Failed to delete farmer');
      }
    } catch (e) {
      console.error('[AdminFarmers] Network error during delete:', e);
      setError('Failed to delete farmer');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFarmers = farmers.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 p-8 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Delete Farmer?</h3>
                <p className="text-gray-500 dark:text-slate-400">
                  Are you sure you want to delete this farmer? This action cannot be undone and will fail if they have active products.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/30">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 rounded-2xl border border-black/5 dark:border-white/10 text-gray-600 dark:text-slate-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-[#D4820A]/10 p-3 rounded-2xl">
            <span className="text-2xl">👨‍🌾</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Farmer Management</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Add and manage farmer profiles for the platform.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-[#D4820A] text-white px-6 py-3 rounded-2xl hover:bg-[#B87008] transition-all shadow-xl shadow-[#D4820A]/20 font-bold"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Farmer</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Search by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all font-medium"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#D4820A] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFarmers.map((farmer) => (
            <motion.div 
              layout
              key={farmer.id}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-slate-900">
                {farmer.image_url ? (
                  <img 
                    src={farmer.image_url} 
                    alt={farmer.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex space-x-2 z-30">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[AdminFarmers] Edit clicked for:', farmer.id);
                      handleOpenModal(farmer);
                    }}
                    className="p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[AdminFarmers] Trash clicked for:', farmer.id);
                      setDeleteConfirmId(farmer.id);
                    }}
                    className="p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl text-red-600 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{farmer.name}</h3>
                  <div className="flex items-center text-gray-500 dark:text-slate-400 text-sm mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{farmer.location}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {farmer.bio || "No biography provided."}
                </p>
                <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-gray-400">
                  <span>Joined {new Date(farmer.created_at).toLocaleDateString()}</span>
                  <span className="font-bold text-[#D4820A] uppercase tracking-wider flex items-center">
                    <span className="mr-1">🚜</span>
                    Farmer Profile
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#D4820A]/10 p-3 rounded-2xl">
                      <UserPlus className="w-6 h-6 text-[#D4820A]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {editingFarmer ? 'Edit Farmer Profile' : 'Add New Farmer'}
                    </h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-medium border border-red-100 dark:border-red-900/30">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Farmer Name</label>
                      <input 
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                        placeholder="e.g. Ramesh Kumar"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Location</label>
                      <input 
                        required
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                        placeholder="e.g. Guntur, Andhra Pradesh"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Image URL</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input 
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Biography (Short)</label>
                    <textarea 
                      rows={2}
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all resize-none"
                      placeholder="Short bio for cards..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Full Story (Rich Content)</label>
                    <textarea 
                      rows={4}
                      value={formData.story}
                      onChange={(e) => setFormData({...formData, story: e.target.value})}
                      className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all resize-none"
                      placeholder="Tell the farmer's full story, farming methods, etc..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Farming Since (Year)</label>
                      <input 
                        type="number"
                        value={formData.farming_since}
                        onChange={(e) => setFormData({...formData, farming_since: parseInt(e.target.value)})}
                        className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                        placeholder="e.g. 1995"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Speciality</label>
                      <input 
                        type="text"
                        value={formData.speciality}
                        onChange={(e) => setFormData({...formData, speciality: e.target.value})}
                        className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                        placeholder="e.g. Organic Mangoes"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Video URL (YouTube)</label>
                    <input 
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                      className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 rounded-2xl border border-black/5 dark:border-white/10 text-gray-600 dark:text-slate-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={isSubmitting}
                      type="submit"
                      className="flex-1 bg-[#D4820A] text-white py-4 rounded-2xl font-bold hover:bg-[#B87008] transition-all shadow-xl shadow-[#D4820A]/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      <span>{editingFarmer ? 'Update Profile' : 'Create Profile'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
