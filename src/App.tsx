import React, { useState, useEffect } from 'react';
import { optimizeImageForWeb, OptimizationMode } from './utils/imageOptimizer';
import {
  Camera,
  FileText,
  Mail,
  Users,
  Settings,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Sliders,
  Image as ImageIcon,
  Save,
  AlertCircle,
  Upload,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Lock,
  LogOut,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

function getDefaultApiBase(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('pixel_perfect_api_base');
    if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
  }
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, '');
  return 'http://localhost:5000/api/v1';
}

let activeApiBase = getDefaultApiBase();

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('pixel_perfect_admin_token');
  const headers = new Headers(options?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const mergedOptions: RequestInit = {
    ...options,
    headers
  };

  const defaultBase = getDefaultApiBase();
  const bases = [
    activeApiBase,
    defaultBase,
    ...(defaultBase.includes('5000') ? ['http://localhost:5001/api/v1'] : [])
  ].filter((v, idx, arr) => arr.indexOf(v) === idx);

  let lastError: any = null;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, mergedOptions);
      if (res.status === 401 && !path.includes('/auth/login')) {
        localStorage.removeItem('pixel_perfect_admin_token');
        window.dispatchEvent(new Event('auth_unauthorized'));
      }
      activeApiBase = base;
      return res;
    } catch (err) {
      lastError = err;
    }
  }

  activeApiBase = defaultBase;
  throw lastError || new Error(`Backend server unreachable at ${activeApiBase}.`);
}

async function apiUpload(formData: FormData): Promise<Response> {
  const token = localStorage.getItem('pixel_perfect_admin_token');
  const uploadHeaders: Record<string, string> = {};
  if (token) {
    uploadHeaders['Authorization'] = `Bearer ${token}`;
  }

  const defaultBase = getDefaultApiBase();
  const bases = [
    activeApiBase,
    defaultBase,
    ...(defaultBase.includes('5000') ? ['http://localhost:5001/api/v1'] : [])
  ].filter((v, idx, arr) => arr.indexOf(v) === idx);

  let lastError: any = null;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/cloudinary/upload`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData
      });
      activeApiBase = base;
      return res;
    } catch (err) {
      lastError = err;
    }
  }

  activeApiBase = defaultBase;
  throw lastError || new Error(`Upload server unreachable at ${activeApiBase}.`);
}

interface PhotoItem {
  _id?: string;
  title: string;
  plateNumber: string;
  slug: string;
  location: { city: string; specificLocation: string; coordinates?: string };
  year: number;
  category: string;
  order?: number;
  cloudinary: { secureUrl: string; aspectRatio: number; width?: number; height?: number };
  exif: { camera?: string; lens?: string; focalLength?: string; shutterSpeed?: string; aperture?: string; iso?: string; filmStock?: string };
  isFeaturedOnIndex: boolean;
}

interface DispatchGalleryPhoto {
  imageUrl: string;
  caption?: string;
  title?: string;
}

interface DispatchItem {
  _id?: string;
  title: string;
  dossierNumber: string;
  slug: string;
  location: string;
  readTimeMinutes: number;
  plateCount: number;
  abstract: string;
  contentMarkdown: string;
  formatTag: string;
  leadCoverPhotoUrl?: string;
  galleryPhotos?: DispatchGalleryPhoto[];
  atmosphericLog?: { temperature?: string; barometer?: string; cloudCover?: string; wind?: string };
  published: boolean;
}

interface InquiryItem {
  _id: string;
  fullName: string;
  email: string;
  classification: string;
  projectScope: string;
  status: 'PENDING' | 'REVIEWED' | 'ARCHIVED';
  createdAt: string;
}

interface SubscriberItem {
  _id: string;
  email: string;
  status: string;
  subscribedAt: string;
}

interface SiteConfigState {
  websiteName: string;
  photographerName: string;
  photographerEmail: string;
  tagline: string;
  operationalNodes: string;
  heroPlate: {
    plateNumber: string;
    title: string;
    location: string;
    specificLocation: string;
    year: number;
    imageUrl: string;
    coordinates?: string;
  };
  aboutPhoto: {
    label: string;
    title: string;
    imageUrl: string;
    caption: string;
    coordinates?: string;
    bio: string;
  };
  contact: {
    directDesk: string;
    signal: string;
    fieldArchive: string;
  };
}

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<'curation' | 'photos' | 'dispatches' | 'inquiries' | 'subscribers' | 'settings'>('curation');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Site Config Curation State
  const [siteConfig, setSiteConfig] = useState<SiteConfigState>({
    websiteName: 'PIXEL PERFECT',
    photographerName: 'Abhishek Gangwar',
    photographerEmail: 'abhishek.work329@gmail.com',
    tagline: 'DOCUMENTARY STREET PHOTOGRAPHY & FIELD PROSE',
    operationalNodes: 'NEW DELHI / MUMBAI / GLOBAL',
    heroPlate: {
      plateNumber: 'PL. 01',
      title: 'STREET & MOMENT',
      location: 'NEW DELHI // METROPOLITAN FOLIO',
      specificLocation: 'Ambient street recording',
      coordinates: '',
      year: 2025,
      imageUrl: ''
    },
    aboutPhoto: {
      label: 'PLATE 01 / AUTOPORTRAIT',
      title: 'Abhishek Gangwar with Canon EOS R10',
      imageUrl: '',
      caption: 'NEW DELHI METROPOLITAN AREA - AMBIENT DAWN LIGHT',
      coordinates: '',
      bio: 'Based between New Delhi and Mumbai. Documenting transient human moments, architectural tensions, and urban solitude strictly under ambient natural illumination across the Indian subcontinent since 2018. Photographed with the Canon EOS R10.'
    },
    contact: {
      directDesk: 'abhishek.work329@gmail.com',
      signal: '+91 98-PIXEL-PERFECT',
      fieldArchive: '@pixelperfect.raw'
    }
  });

  // Edit / Add Photo State
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [photoForm, setPhotoForm] = useState({
    title: '',
    plateNumber: '',
    city: 'New Delhi',
    specificLocation: '',
    coordinates: '',
    year: new Date().getFullYear(),
    category: 'STREETS',
    imageUrl: '',
    camera: 'Canon EOS R10',
    lens: 'Canon RF 35mm f/1.8 Macro IS STM',
    focalLength: '35mm',
    shutterSpeed: '1/320s',
    aperture: 'f/2.8',
    iso: 'ISO 400',
    filmStock: '24.2MP CMOS (High-Contrast Monochrome RAW)',
    isFeaturedOnIndex: false
  });
  const [exifExtracted, setExifExtracted] = useState<boolean>(false);

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pixel_perfect_admin_token'));
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginIdentifier, setLoginIdentifier] = useState('abhishek');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Target API Server Endpoint Configuration
  const [apiServerUrl, setApiServerUrl] = useState(() => getDefaultApiBase());
  const [showApiServerConfig, setShowApiServerConfig] = useState(false);

  const handleSaveApiServerUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let clean = apiServerUrl.trim().replace(/\/+$/, '');
    if (!clean) return;
    if (!clean.endsWith('/api/v1')) {
      clean = `${clean}/api/v1`;
    }
    localStorage.setItem('pixel_perfect_api_base', clean);
    activeApiBase = clean;
    setApiServerUrl(clean);
    notify(`Target API endpoint configured: ${clean}`);
    setShowApiServerConfig(false);
    setLoginError('');
  };

  // Drag-and-Drop & Visual Registry State
  const [photoViewMode, setPhotoViewMode] = useState<'grid' | 'table'>('grid');
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);
  const [dragOverPhotoIndex, setDragOverPhotoIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);

  // Dispatch Form State (Add / Edit)
  const [showAddDispatch, setShowAddDispatch] = useState(false);
  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null);
  const [dispatchGalleryUploading, setDispatchGalleryUploading] = useState<boolean>(false);
  const [newDispatch, setNewDispatch] = useState<{
    title: string;
    dossierNumber: string;
    location: string;
    readTimeMinutes: number;
    plateCount: number;
    abstract: string;
    contentMarkdown: string;
    formatTag: string;
    leadCoverPhotoUrl: string;
    galleryPhotos: DispatchGalleryPhoto[];
  }>({
    title: '',
    dossierNumber: 'VOL. IV — DOSSIER 10',
    location: 'New Delhi, India',
    readTimeMinutes: 10,
    plateCount: 1,
    abstract: '',
    contentMarkdown: '',
    formatTag: '24.2MP APS-C MONOCHROMATIC',
    leadCoverPhotoUrl: '',
    galleryPhotos: []
  });

  // In-Browser Archival Image Optimizer Mode
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('archival');

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 6000);
  };

  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [photoCloudinaryData, setPhotoCloudinaryData] = useState<{
    publicId?: string;
    secureUrl?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
  } | null>(null);

  const handleDirectUpload = async (file: File, target: 'hero' | 'about' | 'photo' | 'dispatch') => {
    if (!file) return;
    setUploadingTarget(target);

    try {
      let fileToUpload = file;
      if (file.size > 800 * 1024 && optimizationMode !== 'original') {
        const origMB = (file.size / (1024 * 1024)).toFixed(1);
        notify(`Optimizing ${file.name} (${origMB} MB) to 4K archival plate...`);
        const opt = await optimizeImageForWeb(file, optimizationMode, (msg) => {
          notify(`${msg} [${origMB} MB]`);
        });
        fileToUpload = opt.file;
        if (opt.wasOptimized) {
          notify(`Optimized: ${opt.summary}. Transmitting to Cloudinary...`);
        }
      } else {
        notify('Transmitting image to Cloudinary...');
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('folder', target === 'dispatch' ? 'pixel_perfect/dispatches' : 'pixel_perfect');

      const res = await apiUpload(formData);
      const d = await res.json();
      if (d.success && d.data?.secureUrl) {
        const url = d.data.secureUrl;
        if (target === 'hero') {
          setSiteConfig(prev => ({
            ...prev,
            heroPlate: { ...prev.heroPlate, imageUrl: url }
          }));
          notify('Hero photo uploaded to Cloudinary & applied!');
        } else if (target === 'about') {
          setSiteConfig(prev => ({
            ...prev,
            aboutPhoto: { ...prev.aboutPhoto, imageUrl: url }
          }));
          notify('About portrait uploaded to Cloudinary & applied!');
        } else if (target === 'photo') {
          const ex = d.data.exif;
          if (ex && ex.hasExif) {
            setPhotoForm(prev => ({
              ...prev,
              imageUrl: url,
              camera: ex.camera || prev.camera,
              lens: ex.lens || prev.lens,
              focalLength: ex.focalLength || prev.focalLength,
              shutterSpeed: ex.shutterSpeed || prev.shutterSpeed,
              aperture: ex.aperture || prev.aperture,
              iso: ex.iso || prev.iso,
              filmStock: ex.filmStock || prev.filmStock,
              year: ex.year || prev.year
            }));
            setExifExtracted(true);
            const summaryParts = [
              ex.camera,
              ex.shutterSpeed,
              ex.aperture,
              ex.iso
            ].filter(Boolean).join(' • ');
            notify(`Photo uploaded & EXIF extracted! (${summaryParts})`);
          } else {
            setPhotoForm(prev => ({ ...prev, imageUrl: url }));
            setExifExtracted(false);
            notify('Photo uploaded to Cloudinary & linked to registry form!');
          }
          setPhotoCloudinaryData(d.data);
        } else if (target === 'dispatch') {
          setNewDispatch(prev => ({ ...prev, leadCoverPhotoUrl: url }));
          notify('Story cover photo uploaded to Cloudinary!');
        }
      } else {
        notify(d.error || 'Upload to Cloudinary failed', 'error');
      }
    } catch (err: any) {
      notify(`Upload error: ${err.message}`, 'error');
    } finally {
      setUploadingTarget(null);
    }
  };

  const renderUploadZone = (target: 'hero' | 'about' | 'photo' | 'dispatch', label = 'CHOOSE FILE FROM COMPUTER (OR DRAG & DROP)') => (
    <div className="space-y-1.5">
      <div className="relative border-2 border-dashed border-black p-4 bg-[#FAFAFA] hover:bg-[#F0F0F0] transition-colors text-center cursor-pointer group">
        <input
          type="file"
          accept="image/*"
          disabled={uploadingTarget === target}
          onChange={e => {
            if (e.target.files?.[0]) handleDirectUpload(e.target.files[0], target);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-1.5">
          <Upload className={`w-5 h-5 text-black ${uploadingTarget === target ? 'animate-bounce text-emerald-600' : 'group-hover:-translate-y-0.5 transition-transform'}`} />
          <span className="font-bold text-xs uppercase tracking-wider text-black">
            {uploadingTarget === target ? 'OPTIMIZING & TRANSMITTING...' : label}
          </span>
          <span className="text-[10px] text-[#737373]">
            Direct upload (JPG, PNG, WEBP) • Automatic in-browser 4K optimization (EXIF preserved)
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[9px] text-[#737373] px-1 font-mono gap-1">
        <span className="uppercase flex items-center space-x-1.5 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>AUTO-OPTIMIZE 10MB+ PLATES:</span>
        </span>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setOptimizationMode('archival'); }}
            className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
              optimizationMode === 'archival'
                ? 'bg-black text-white font-bold'
                : 'bg-neutral-200 text-[#525252] hover:text-black'
            }`}
            title="Max 2560px (4K Retina) at 92% quality with 100% EXIF preserved"
          >
            4K Archival (92%)
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setOptimizationMode('ultra'); }}
            className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
              optimizationMode === 'ultra'
                ? 'bg-black text-white font-bold'
                : 'bg-neutral-200 text-[#525252] hover:text-black'
            }`}
            title="Max 3840px (Ultra 4K) at 95% quality"
          >
            Master 4K (95%)
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setOptimizationMode('original'); }}
            className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
              optimizationMode === 'original'
                ? 'bg-black text-white font-bold'
                : 'bg-neutral-200 text-[#525252] hover:text-black'
            }`}
            title="Bypass client-side compression (raw file size)"
          >
            Raw Original
          </button>
        </div>
      </div>
    </div>
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [resP, resD, resI, resS, resC] = await Promise.all([
        apiFetch(`/photos?limit=100`),
        apiFetch(`/dispatches`),
        apiFetch(`/inquiries`),
        apiFetch(`/subscribers`),
        apiFetch(`/site-config`)
      ]);

      if (resP.ok) {
        const d = await resP.json();
        setPhotos(d.data || []);
      }
      if (resD.ok) {
        const d = await resD.json();
        setDispatches(d.data || []);
      }
      if (resI.ok) {
        const d = await resI.json();
        setInquiries(d.data || []);
      }
      if (resS.ok) {
        const d = await resS.json();
        setSubscribers(d.data || []);
      }
      if (resC.ok) {
        const d = await resC.json();
        if (d.data) setSiteConfig(d.data);
      }
    } catch (err: any) {
      console.warn('API error, make sure backend is running:', err);
    } finally {
      setLoading(false);
    }
  };

  // Authentication Listeners and Initial Load
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setCurrentUser(null);
      notify('Authentication expired. Please log in again.', 'error');
    };
    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('pixel_perfect_admin_token');
    if (!stored) {
      setAuthChecking(false);
      return;
    }
    apiFetch('/auth/me')
      .then(res => {
        if (res.ok) {
          return res.json().then(d => {
            setCurrentUser(d.user);
            setToken(stored);
            loadAll();
          });
        } else {
          localStorage.removeItem('pixel_perfect_admin_token');
          setToken(null);
        }
      })
      .catch(() => {
        setToken(stored);
        loadAll();
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError('');

    try {
      const res = await apiFetch(`/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('pixel_perfect_admin_token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        notify(`Authenticated as ${data.user.name || 'Abhishek Gangwar'}. Welcome.`);
        loadAll();
      } else {
        setLoginError(data.error || 'Authentication rejected. Verify credentials.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication server unreachable.');
      setShowApiServerConfig(true);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pixel_perfect_admin_token');
    setToken(null);
    setCurrentUser(null);
    notify('Logged out of Registry Console.', 'success');
  };

  // Reordering & Drag-and-Drop Handlers
  const handleReorderPhotos = async (newOrderedList: PhotoItem[]) => {
    setPhotos(newOrderedList);
    setIsSavingOrder(true);
    try {
      const photoIds = newOrderedList.map(p => p._id || p.slug || p.plateNumber);
      const res = await apiFetch('/photos/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds })
      });
      if (res.ok) {
        notify('Photo sequence updated! Main website now reflects this new order.', 'success');
      } else {
        const err = await res.json();
        notify(err.error || 'Failed to save new order', 'error');
      }
    } catch (err: any) {
      notify(`Reorder error: ${err.message}`, 'error');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch (err) {
      // ignore
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPhotoIndex !== index) {
      setDragOverPhotoIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPhotoIndex === null || draggedPhotoIndex === targetIndex) {
      setDraggedPhotoIndex(null);
      setDragOverPhotoIndex(null);
      return;
    }
    const updated = [...photos];
    const [moved] = updated.splice(draggedPhotoIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setDraggedPhotoIndex(null);
    setDragOverPhotoIndex(null);
    handleReorderPhotos(updated);
  };

  const movePhoto = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;
    const updated = [...photos];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    handleReorderPhotos(updated);
  };

  // Save Site Curation (Hero image, About photo, Brand, Email, Bio)
  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/site-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteConfig)
      });
      if (res.ok) {
        notify('Site Curation, Hero Plate, and About images updated successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        notify(err.error || 'Failed to update site configuration', 'error');
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Open Edit Modal for a Photo
  const handleOpenEdit = (photo: PhotoItem) => {
    setEditingPhotoId(photo._id || photo.slug || photo.plateNumber);
    setPhotoCloudinaryData(photo.cloudinary ? {
      publicId: (photo.cloudinary as any).publicId || '',
      secureUrl: photo.cloudinary.secureUrl,
      width: photo.cloudinary.width,
      height: photo.cloudinary.height,
      aspectRatio: photo.cloudinary.aspectRatio
    } : null);
    setPhotoForm({
      title: photo.title,
      plateNumber: photo.plateNumber,
      city: photo.location.city,
      specificLocation: photo.location.specificLocation,
      coordinates: photo.location.coordinates || '',
      year: photo.year,
      category: photo.category,
      imageUrl: photo.cloudinary?.secureUrl || '',
      camera: photo.exif?.camera || 'Canon EOS R10',
      lens: photo.exif?.lens || 'Canon RF 35mm f/1.8 Macro IS STM',
      focalLength: photo.exif?.focalLength || '35mm',
      shutterSpeed: photo.exif?.shutterSpeed || '1/320s',
      aperture: photo.exif?.aperture || 'f/2.8',
      iso: photo.exif?.iso || 'ISO 400',
      filmStock: photo.exif?.filmStock || '24.2MP CMOS RAW',
      isFeaturedOnIndex: Boolean(photo.isFeaturedOnIndex)
    });
    setExifExtracted(false);
    setShowAddPhoto(true);
  };

  // Save Photo (Create or Update)
  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoForm.imageUrl) {
      notify('Please upload a photo or provide an image URL.', 'error');
      return;
    }
    if (photoForm.imageUrl.startsWith('data:image/')) {
      notify('This image is pending upload to Cloudinary. Please use the Direct Image Upload button so it stores in Cloudinary.', 'error');
      return;
    }
    try {
      const payload = {
        title: photoForm.title,
        plateNumber: photoForm.plateNumber,
        location: {
          city: photoForm.city,
          specificLocation: photoForm.specificLocation,
          coordinates: photoForm.coordinates
        },
        year: Number(photoForm.year),
        category: photoForm.category,
        imageUrl: photoForm.imageUrl,
        cloudinaryData: photoCloudinaryData || undefined,
        exif: {
          camera: photoForm.camera,
          lens: photoForm.lens,
          focalLength: photoForm.focalLength,
          shutterSpeed: photoForm.shutterSpeed,
          aperture: photoForm.aperture,
          iso: photoForm.iso,
          filmStock: photoForm.filmStock
        },
        isFeaturedOnIndex: photoForm.isFeaturedOnIndex
      };

      let res;
      if (editingPhotoId) {
        res = await apiFetch(`/photos/${editingPhotoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch(`/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        notify(editingPhotoId ? 'Archival plate updated!' : 'Archival plate registered!');
        setShowAddPhoto(false);
        setEditingPhotoId(null);
        loadAll();
      } else {
        const err = await res.json();
        notify(err.error || 'Operation failed', 'error');
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm('Permanently delete this plate from Archival Registry?')) return;
    try {
      const res = await apiFetch(`/photos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('Plate removed from registry.');
        loadAll();
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Set any photo as Hero Plate instantly
  const handleSetAsHero = async (photo: PhotoItem) => {
    const newHero = {
      plateNumber: photo.plateNumber,
      title: photo.title,
      location: `${photo.location.city.toUpperCase()} // METROPOLITAN FOLIO`,
      specificLocation: photo.location.specificLocation,
      year: photo.year,
      imageUrl: photo.cloudinary?.secureUrl,
      coordinates: photo.location.coordinates || ''
    };
    const updated = { ...siteConfig, heroPlate: newHero };
    setSiteConfig(updated);
    try {
      await apiFetch(`/site-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      notify(`Plate ${photo.plateNumber} (${photo.title}) is now set as the Landing Page Hero!`);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Set any photo as About Autoportrait
  const handleSetAsAboutPhoto = async (photo: PhotoItem) => {
    const newAboutPhoto = {
      ...siteConfig.aboutPhoto,
      imageUrl: photo.cloudinary?.secureUrl,
      caption: `${photo.location.city.toUpperCase()} - AMBIENT NATURAL ILLUMINATION`,
      coordinates: photo.location.coordinates || siteConfig.aboutPhoto.coordinates
    };
    const updated = { ...siteConfig, aboutPhoto: newAboutPhoto };
    setSiteConfig(updated);
    try {
      await apiFetch(`/site-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      notify(`Plate ${photo.plateNumber} is now set as the About Page Autoportrait!`);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleOpenAddDispatch = () => {
    setEditingDispatchId(null);
    setNewDispatch({
      title: '',
      dossierNumber: `VOL. ${dispatches.length + 1} — DOSSIER ${String(dispatches.length + 1).padStart(2, '0')}`,
      location: 'New Delhi, India',
      readTimeMinutes: 8,
      plateCount: 1,
      abstract: '',
      contentMarkdown: '',
      formatTag: '24.2MP APS-C MONOCHROMATIC',
      leadCoverPhotoUrl: '',
      galleryPhotos: []
    });
    setShowAddDispatch(true);
  };

  const handleOpenEditDispatch = (d: DispatchItem) => {
    setEditingDispatchId(d._id || d.slug);
    setNewDispatch({
      title: d.title || '',
      dossierNumber: d.dossierNumber || '',
      location: d.location || 'India',
      readTimeMinutes: d.readTimeMinutes || 8,
      plateCount: d.plateCount || d.galleryPhotos?.length || 1,
      abstract: d.abstract || '',
      contentMarkdown: d.contentMarkdown || '',
      formatTag: d.formatTag || '24.2MP APS-C MONOCHROMATIC',
      leadCoverPhotoUrl: d.leadCoverPhotoUrl || '',
      galleryPhotos: Array.isArray(d.galleryPhotos) ? [...d.galleryPhotos] : []
    });
    setShowAddDispatch(true);
  };

  const handleDeleteDispatch = async (d: DispatchItem) => {
    const id = d._id || d.slug;
    if (!id) {
      notify('Unable to determine dispatch identity', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete "${d.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await apiFetch(`/dispatches/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
      if (res.ok) {
        notify(`Journal story "${d.title}" deleted.`);
        loadAll();
      } else {
        const err = await res.json().catch(() => ({}));
        notify(err.error || 'Failed to delete dispatch', 'error');
      }
    } catch (err: any) {
      notify(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newDispatch,
        plateCount: newDispatch.galleryPhotos.length > 0 ? newDispatch.galleryPhotos.length : newDispatch.plateCount
      };

      if (editingDispatchId) {
        const res = await apiFetch(`/dispatches/${encodeURIComponent(String(editingDispatchId))}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          notify(`Journal story "${newDispatch.title}" updated successfully!`);
          setShowAddDispatch(false);
          setEditingDispatchId(null);
          loadAll();
        } else {
          const err = await res.json().catch(() => ({}));
          notify(err.error || 'Failed to update journal story', 'error');
        }
      } else {
        const res = await apiFetch(`/dispatches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          notify(`Field dispatch "${newDispatch.title}" published!`);
          setShowAddDispatch(false);
          setEditingDispatchId(null);
          loadAll();
        } else {
          const err = await res.json().catch(() => ({}));
          notify(err.error || 'Failed to publish story', 'error');
        }
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleBatchGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setDispatchGalleryUploading(true);
    notify(`Preparing ${fileList.length} image(s) for story gallery...`);

    const newUploadedPhotos: DispatchGalleryPhoto[] = [];
    let failureCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        let fileToUpload = file;
        if (file.size > 800 * 1024 && optimizationMode !== 'original') {
          const origMB = (file.size / (1024 * 1024)).toFixed(1);
          notify(`Optimizing plate ${i + 1}/${fileList.length}: ${file.name} (${origMB} MB)...`);
          const opt = await optimizeImageForWeb(file, optimizationMode);
          fileToUpload = opt.file;
        }

        notify(`Uploading plate ${i + 1}/${fileList.length} to Cloudinary...`);
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('folder', 'pixel_perfect/dispatches');

        const res = await apiUpload(formData);
        const data = await res.json();
        if (data.success && data.data?.secureUrl) {
          newUploadedPhotos.push({
            imageUrl: data.data.secureUrl,
            caption: '',
            title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
          });
        } else {
          failureCount++;
        }
      } catch (err) {
        failureCount++;
      }
    }

    if (newUploadedPhotos.length > 0) {
      setNewDispatch(prev => {
        const updated = [...prev.galleryPhotos, ...newUploadedPhotos];
        return {
          ...prev,
          galleryPhotos: updated,
          plateCount: updated.length
        };
      });
      notify(
        `Added ${newUploadedPhotos.length} photo(s) to story gallery!` +
        (failureCount > 0 ? ` (${failureCount} failed)` : '')
      );
    } else {
      notify('Failed to upload gallery images. Verify connection.', 'error');
    }
    setDispatchGalleryUploading(false);
  };

  const handleRemoveGalleryPhoto = (indexToRemove: number) => {
    setNewDispatch(prev => {
      const updated = prev.galleryPhotos.filter((_, idx) => idx !== indexToRemove);
      return { ...prev, galleryPhotos: updated, plateCount: updated.length || 1 };
    });
  };

  const handleUpdateGalleryPhoto = (index: number, field: 'title' | 'caption', val: string) => {
    setNewDispatch(prev => {
      const updated = [...prev.galleryPhotos];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: val };
      }
      return { ...prev, galleryPhotos: updated };
    });
  };

  const handleUpdateInquiryStatus = async (id: string, status: 'PENDING' | 'REVIEWED' | 'ARCHIVED') => {
    try {
      const res = await apiFetch(`/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        notify(`Inquiry updated to ${status}`);
        loadAll();
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleReseed = async () => {
    if (!confirm('Re-seed the registry with canonical Indian street photography & Canon R10 essays?')) return;
    try {
      const res = await apiFetch(`/seed`, { method: 'POST' });
      if (res.ok) {
        notify('Registry reset to canonical state.');
        loadAll();
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const filteredPhotos = photos.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 1. Initial Auth Checking State
  if (authChecking) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs space-y-3">
        <RefreshCw className="w-5 h-5 animate-spin text-white" />
        <span className="tracking-widest uppercase text-[#A3A3A3]">VERIFYING REGISTRY AUTHENTICATION...</span>
      </div>
    );
  }

  // 2. Unauthenticated State: Bauhaus Registry Login Portal
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-mono flex flex-col justify-between p-4 sm:p-10 select-none">
        {/* Top Minimal Strip */}
        <div className="max-w-md w-full mx-auto flex items-center justify-between border-b border-[#262626] pb-3 text-[10px] text-[#737373] tracking-widest uppercase">
          <span>PIXEL PERFECT // ACCESS CONTROL</span>
          <span className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>RESTRICTED</span>
          </span>
        </div>

        {/* Center Curatorial Auth Card */}
        <div className="max-w-md w-full mx-auto border border-[#262626] bg-black p-6 sm:p-10 space-y-6 shadow-2xl my-auto">
          <div className="space-y-2">
            <div className="text-[9px] text-[#737373] uppercase tracking-widest font-mono">
              CURATORIAL DESK AUTHENTICATION
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-sans tracking-tight">
              REGISTRY CONSOLE
            </h1>
            <p className="text-xs text-[#8C8C8C] leading-relaxed">
              Curatorial identity verification for Abhishek Gangwar. Access archive curation, live plate sequencing, and field journals.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-start space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Target API Server Switcher */}
          <div className="border border-[#262626] bg-[#0D0D0D] p-3 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#A3A3A3] uppercase tracking-wider flex items-center space-x-1.5 font-bold">
                <span className={`w-1.5 h-1.5 rounded-full ${apiServerUrl.includes('localhost') ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                <span>API TARGET: {apiServerUrl.includes('localhost') ? 'LOCAL (5000/5001)' : 'RENDER / CLOUD'}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowApiServerConfig(!showApiServerConfig)}
                className="text-white hover:underline text-[9px] uppercase tracking-wider"
              >
                {showApiServerConfig ? '[COLLAPSE]' : '[CONFIGURE / SWITCH]'}
              </button>
            </div>

            <div className="text-[10px] text-[#737373] truncate font-mono">
              ENDPOINT: <span className="text-white select-all">{apiServerUrl}</span>
            </div>

            {showApiServerConfig && (
              <div className="pt-2.5 border-t border-[#1F1F1F] space-y-2.5">
                <p className="text-[10px] text-[#8C8C8C] leading-relaxed">
                  Enter your deployed Render backend URL (e.g. <span className="text-white font-mono">https://your-service.onrender.com</span>) to authenticate directly with Render without running a local server.
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={apiServerUrl}
                    onChange={(e) => setApiServerUrl(e.target.value)}
                    placeholder="https://your-backend.onrender.com/api/v1"
                    className="flex-1 px-3 py-2 bg-black border border-[#333] text-white text-[11px] focus:outline-none focus:border-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveApiServerUrl()}
                    className="px-3.5 py-2 bg-white text-black font-bold uppercase text-[10px] tracking-wider hover:bg-neutral-200 transition-colors"
                  >
                    APPLY
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 text-[9px]">
                  <button
                    type="button"
                    onClick={() => {
                      setApiServerUrl('http://localhost:5000/api/v1');
                      localStorage.setItem('pixel_perfect_api_base', 'http://localhost:5000/api/v1');
                      activeApiBase = 'http://localhost:5000/api/v1';
                      notify('Reset API to Localhost (5000)');
                      setShowApiServerConfig(false);
                      setLoginError('');
                    }}
                    className="text-[#737373] hover:text-white uppercase tracking-wider underline"
                  >
                    Reset to Localhost (5000)
                  </button>
                  <span className="text-[#525252]">SAVED IN LOCALSTORAGE</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs font-mono">
            <div className="space-y-1">
              <label className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider block">
                ADMIN IDENTIFIER (USERNAME OR EMAIL)
              </label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="abhishek or abhishek.work329@gmail.com"
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] text-white placeholder:text-[#525252] focus:outline-none focus:border-white text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider block">
                  REGISTRY PASSPHRASE
                </label>
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="text-[9px] text-[#737373] hover:text-white uppercase tracking-wider font-mono"
                >
                  {showLoginPassword ? '[HIDE]' : '[SHOW]'}
                </button>
              </div>
              <input
                type={showLoginPassword ? 'text' : 'password'}
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] text-white placeholder:text-[#525252] focus:outline-none focus:border-white text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full py-3.5 bg-white text-black font-mono text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors flex items-center justify-center space-x-2 mt-6"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loginSubmitting ? 'AUTHENTICATING...' : 'ACCESS REGISTRY CONSOLE'}</span>
            </button>
          </form>

          <div className="border-t border-[#1F1F1F] pt-4 text-center text-[10px] text-[#525252] tracking-wider uppercase font-mono">
            ABHISHEK GANGWAR • CANON EOS R10 PLATFORM
          </div>
        </div>

        {/* Bottom Colophon Strip */}
        <div className="max-w-md w-full mx-auto flex items-center justify-between border-t border-[#262626] pt-3 text-[9px] text-[#525252] tracking-wider uppercase">
          <span>© {new Date().getFullYear()} PIXEL PERFECT</span>
          <span>HS256 ENCRYPTED SESSION</span>
        </div>

        {/* Global Floating Notification Toast (High Z-Index above all screens) */}
        {notification && (
          <div className="fixed top-5 right-5 sm:right-8 z-[99999] max-w-md w-[92vw] sm:w-auto shadow-2xl pointer-events-auto">
            <div className={`p-4 font-mono text-xs flex items-center justify-between space-x-3.5 border-2 bg-[#0A0A0A] text-white ${
              notification.type === 'success' ? 'border-emerald-500 shadow-emerald-950/50' : 'border-red-500 shadow-red-950/50'
            }`}>
              <div className="flex items-center space-x-2.5 min-w-0">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span className="font-bold tracking-tight text-white leading-snug break-words">
                  {notification.message}
                </span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-[#737373] hover:text-white text-[10px] uppercase tracking-wider flex-shrink-0 border border-[#333] px-1.5 py-0.5 hover:bg-[#222]"
                title="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-black text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#262626]">
        <div className="flex items-center space-x-3">
          <span className="font-extrabold tracking-tight text-sm uppercase">
            {siteConfig.websiteName} <span className="text-[#737373] font-normal">/</span> REGISTRY CONSOLE
          </span>
          <span className="bg-[#262626] text-emerald-400 font-mono text-[9px] px-2 py-0.5 tracking-widest uppercase hidden sm:inline">
            AUTHENTICATED // {currentUser?.name || siteConfig.photographerName}
          </span>
          <span className="bg-[#171717] text-[#A3A3A3] border border-[#2B2B2B] font-mono text-[9px] px-2 py-0.5 tracking-wider uppercase hidden md:inline" title={getDefaultApiBase()}>
            API: {getDefaultApiBase().replace(/^https?:\/\//, '').slice(0, 30)}
          </span>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4 font-mono text-xs">
          <button
            onClick={loadAll}
            className="flex items-center space-x-1.5 text-[#A3A3A3] hover:text-white transition-colors"
            title="Refresh database state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">SYNC</span>
          </button>

          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 border border-[#404040] px-3 py-1 text-[10px] tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
          >
            <span>VIEW FOLIO</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 bg-[#262626] hover:bg-red-900 text-white px-2.5 py-1 text-[10px] tracking-wider uppercase transition-colors"
            title="Log out of Registry Console"
          >
            <LogOut className="w-3 h-3 text-red-400" />
            <span className="hidden sm:inline">LOGOUT</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-6 flex space-x-8 font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('curation')}
          className={`py-3.5 flex items-center space-x-2 border-b-2 font-bold tracking-wider transition-colors ${
            activeTab === 'curation' ? 'border-black text-black' : 'border-transparent text-[#737373] hover:text-black'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-emerald-600" />
          <span>WEBSITE & IMAGES</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`py-3.5 flex items-center space-x-2 border-b-2 font-bold tracking-wider transition-colors ${
            activeTab === 'photos' ? 'border-black text-black' : 'border-transparent text-[#737373] hover:text-black'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>PHOTO ARCHIVE ({photos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dispatches')}
          className={`py-3.5 flex items-center space-x-2 border-b-2 font-bold tracking-wider transition-colors ${
            activeTab === 'dispatches' ? 'border-black text-black' : 'border-transparent text-[#737373] hover:text-black'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>JOURNAL & STORIES ({dispatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`py-3.5 flex items-center space-x-2 border-b-2 font-bold tracking-wider transition-colors ${
            activeTab === 'inquiries' ? 'border-black text-black' : 'border-transparent text-[#737373] hover:text-black'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>WORK INQUIRIES ({inquiries.filter(i => i.status === 'PENDING').length} PENDING)</span>
        </button>

        <button
          onClick={() => setActiveTab('subscribers')}
          className={`py-3.5 flex items-center space-x-2 border-b-2 font-bold tracking-wider transition-colors ${
            activeTab === 'subscribers' ? 'border-black text-black' : 'border-transparent text-[#737373] hover:text-black'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>SUBSCRIBERS ({subscribers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3.5 flex items-center space-x-2 border-b-2 font-bold tracking-wider transition-colors ${
            activeTab === 'settings' ? 'border-black text-black' : 'border-transparent text-[#737373] hover:text-black'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>SETTINGS & DB</span>
        </button>
      </nav>

      {/* Main Tab Content */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
        {/* TAB 0: SITE CURATION & IMAGES (FULL AUTONOMY) */}
        {activeTab === 'curation' && (
          <form onSubmit={handleSaveSiteConfig} className="space-y-8 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5E5] gap-4">
              <div>
                <h2 className="text-xl font-black text-black uppercase font-sans tracking-tight">
                  CURATION AUTONOMY // LANDING PAGE, ABOUT & FOLIO
                </h2>
                <p className="text-[#737373] text-[11px] mt-0.5">
                  Directly manage every prominent image and biographical datum shown on the public site.
                </p>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest flex items-center space-x-2 hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>SAVE SITE CURATION</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* SECTION A: LANDING PAGE HERO PLATE */}
              <div className="border border-black p-6 bg-white space-y-4">
                <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-2">
                  <span className="font-bold text-black uppercase text-sm font-sans flex items-center space-x-2">
                    <span>1. HOMEPAGE HERO PHOTOGRAPH</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">LIVE ON ( / )</span>
                </div>

                {/* Hero Preview */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-[#737373] uppercase tracking-wider block font-bold">IMAGE PREVIEW (16:9 HERO CROP)</label>
                    <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 uppercase tracking-wider font-semibold">
                      AUTO-CROPS TO 16:9
                    </span>
                  </div>
                  <div className="aspect-[16/9] bg-[#0A0A0A] overflow-hidden border border-black relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={siteConfig.heroPlate.imageUrl}
                      alt={siteConfig.heroPlate.title}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/80 text-white font-mono text-[9px] px-2 py-0.5 uppercase tracking-wider">
                      16:9 HERO FRAME PREVIEW
                    </div>
                  </div>
                </div>

                {/* Direct Image Upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">DIRECT IMAGE UPLOAD (CLOUDINARY)</label>
                  {renderUploadZone('hero', 'UPLOAD HERO IMAGE FILE (AUTO-CROPPED TO 16:9)')}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#737373] uppercase">OR PASTE DIRECT IMAGE URL</label>
                  <input
                    type="url"
                    required
                    value={siteConfig.heroPlate.imageUrl}
                    onChange={e => setSiteConfig({
                      ...siteConfig,
                      heroPlate: { ...siteConfig.heroPlate, imageUrl: e.target.value }
                    })}
                    className="w-full p-2.5 bg-[#F4F4F4] border border-[#E5E5E5] text-xs focus:outline-none focus:border-black font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black uppercase">PHOTO NUMBER / LABEL</label>
                    <input
                      type="text"
                      value={siteConfig.heroPlate.plateNumber}
                      onChange={e => setSiteConfig({
                        ...siteConfig,
                        heroPlate: { ...siteConfig.heroPlate, plateNumber: e.target.value }
                      })}
                      className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black uppercase">YEAR</label>
                    <input
                      type="number"
                      value={siteConfig.heroPlate.year}
                      onChange={e => setSiteConfig({
                        ...siteConfig,
                        heroPlate: { ...siteConfig.heroPlate, year: Number(e.target.value) }
                      })}
                      className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">TITLE *</label>
                  <input
                    type="text"
                    required
                    value={siteConfig.heroPlate.title}
                    onChange={e => setSiteConfig({
                      ...siteConfig,
                      heroPlate: { ...siteConfig.heroPlate, title: e.target.value }
                    })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">LOCATION LABEL</label>
                  <input
                    type="text"
                    value={siteConfig.heroPlate.location}
                    onChange={e => setSiteConfig({
                      ...siteConfig,
                      heroPlate: { ...siteConfig.heroPlate, location: e.target.value }
                    })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">SPECIFIC STREET / INTERSECTION</label>
                  <input
                    type="text"
                    value={siteConfig.heroPlate.specificLocation}
                    onChange={e => setSiteConfig({
                      ...siteConfig,
                      heroPlate: { ...siteConfig.heroPlate, specificLocation: e.target.value }
                    })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
              </div>

              {/* SECTION B: ABOUT PAGE PORTRAIT & BIO */}
              <div className="border border-black p-6 bg-white space-y-4">
                <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-2">
                  <span className="font-bold text-black uppercase text-sm font-sans">
                    2. ABOUT PAGE PORTRAIT & BIO
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">LIVE ON ( /about )</span>
                </div>

                {/* About Preview */}
                <div className="space-y-1">
                  <label className="text-[10px] text-[#737373] uppercase tracking-wider block">IMAGE PREVIEW (ASPECT 4:5)</label>
                  <div className="aspect-[4/5] max-h-72 bg-[#0A0A0A] overflow-hidden border border-[#E5E5E5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={siteConfig.aboutPhoto.imageUrl}
                      alt={siteConfig.photographerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Direct Image Upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">DIRECT IMAGE UPLOAD (CLOUDINARY)</label>
                  {renderUploadZone('about', 'UPLOAD ABOUT PORTRAIT (JPG, PNG, WEBP)')}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#737373] uppercase">OR PASTE DIRECT IMAGE URL</label>
                  <input
                    type="url"
                    required
                    value={siteConfig.aboutPhoto.imageUrl}
                    onChange={e => setSiteConfig({
                      ...siteConfig,
                      aboutPhoto: { ...siteConfig.aboutPhoto, imageUrl: e.target.value }
                    })}
                    className="w-full p-2.5 bg-[#F4F4F4] border border-[#E5E5E5] text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">LOCATION CAPTION STAMP</label>
                  <input
                    type="text"
                    value={siteConfig.aboutPhoto.caption}
                    onChange={e => setSiteConfig({
                      ...siteConfig,
                      aboutPhoto: { ...siteConfig.aboutPhoto, caption: e.target.value }
                    })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">PROVENANCE & BIO NARRATIVE *</label>
                  <textarea
                    rows={4}
                    required
                    value={siteConfig.aboutPhoto.bio}
                    onChange={e => setSiteConfig({
                      ...siteConfig,
                      aboutPhoto: { ...siteConfig.aboutPhoto, bio: e.target.value }
                    })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5] text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION C: IDENTITY & COMMUNICATIONS */}
            <div className="border border-[#E5E5E5] p-6 bg-[#FAFAFA] space-y-4">
              <div className="font-bold text-black uppercase text-sm font-sans border-b border-[#E5E5E5] pb-2">
                3. IDENTITY, BRAND & CURATORIAL DESK
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">WEBSITE BRAND NAME *</label>
                  <input
                    type="text"
                    required
                    value={siteConfig.websiteName}
                    onChange={e => setSiteConfig({ ...siteConfig, websiteName: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E5E5E5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">PHOTOGRAPHER FULL NAME *</label>
                  <input
                    type="text"
                    required
                    value={siteConfig.photographerName}
                    onChange={e => setSiteConfig({ ...siteConfig, photographerName: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E5E5E5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">CURATORIAL DESK EMAIL *</label>
                  <input
                    type="email"
                    required
                    value={siteConfig.photographerEmail}
                    onChange={e => setSiteConfig({
                      ...siteConfig,
                      photographerEmail: e.target.value,
                      contact: { ...siteConfig.contact, directDesk: e.target.value }
                    })}
                    className="w-full p-2 bg-white border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                  TRANSMIT & APPLY SITE CURATION
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 1: PHOTOS (ARCHIVE PLATES REGISTRY) */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            {/* Action Bar: Search, View Switcher, Reorder Status, Add Button */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, plate, or city..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F4F4F4] border border-[#E5E5E5] text-xs font-mono focus:outline-none focus:border-black"
                  />
                </div>

                {/* View Mode Switcher */}
                <div className="flex border border-black divide-x divide-black font-mono text-xs self-start">
                  <button
                    type="button"
                    onClick={() => setPhotoViewMode('grid')}
                    className={`px-3 py-1.5 flex items-center space-x-1.5 transition-colors text-[10px] uppercase font-bold ${
                      photoViewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F4F4F4]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>DRAG & DROP ORDER</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoViewMode('table')}
                    className={`px-3 py-1.5 flex items-center space-x-1.5 transition-colors text-[10px] uppercase font-bold ${
                      photoViewMode === 'table' ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F4F4F4]'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>TABLE VIEW</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {isSavingOrder && (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-1 font-bold uppercase tracking-wider animate-pulse flex items-center space-x-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>SAVING LIVE ORDER...</span>
                  </span>
                )}

                <button
                  onClick={() => {
                    setEditingPhotoId(null);
                    setPhotoCloudinaryData(null);
                    setPhotoForm({
                      title: '',
                      plateNumber: `PL. ${String(photos.length + 1).padStart(2, '0')}`,
                      city: 'New Delhi',
                      specificLocation: '',
                      coordinates: '',
                      year: new Date().getFullYear(),
                      category: 'STREETS',
                      imageUrl: '',
                      camera: 'Canon EOS R10',
                      lens: 'Canon RF 35mm f/1.8 Macro IS STM',
                      focalLength: '35mm',
                      shutterSpeed: '1/320s',
                      aperture: 'f/2.8',
                      iso: 'ISO 400',
                      filmStock: '24.2MP CMOS RAW',
                      isFeaturedOnIndex: false
                    });
                    setExifExtracted(false);
                    setShowAddPhoto(true);
                  }}
                  className="px-4 py-2 bg-black text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-2 hover:bg-neutral-800 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD NEW PHOTO</span>
                </button>
              </div>
            </div>

            {/* Reorder Guidance Banner */}
            <div className="bg-[#FAFAFA] border border-[#E5E5E5] p-3 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono gap-2">
              <div className="flex items-center space-x-2 text-[#525252]">
                <GripVertical className="w-4 h-4 text-black flex-shrink-0" />
                <span>
                  <strong className="text-black uppercase">Drag & Drop Sequence Mode:</strong> Drag cards or use the [<span className="text-black font-bold">←</span> / <span className="text-black font-bold">→</span>] arrows. The order here immediately dictates how plates appear on the public Landing Page and Archive.
                </span>
              </div>
              <div className="text-[10px] text-[#737373] uppercase tracking-wider whitespace-nowrap">
                {photos.length} PLATES IN REGISTRY
              </div>
            </div>

            {/* 1. VISUAL DRAG & DROP GRID VIEW */}
            {photoViewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPhotos.map((photo, idx) => {
                  const isDragging = draggedPhotoIndex === idx;
                  const isOver = dragOverPhotoIndex === idx && draggedPhotoIndex !== idx;

                  return (
                    <div
                      key={photo._id || photo.slug || photo.plateNumber}
                      draggable={!searchQuery}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={() => {
                        setDraggedPhotoIndex(null);
                        setDragOverPhotoIndex(null);
                      }}
                      className={`border transition-all duration-150 bg-white flex flex-col justify-between select-none ${
                        isDragging
                          ? 'opacity-40 scale-95 border-dashed border-2 border-black'
                          : isOver
                          ? 'border-2 border-black bg-neutral-100 ring-2 ring-black scale-[1.02]'
                          : 'border-[#E5E5E5] hover:border-black shadow-sm'
                      }`}
                    >
                      {/* Card Top Strip: Drag Handle & Order Badge */}
                      <div className="bg-[#FAFAFA] border-b border-[#E5E5E5] p-2 flex items-center justify-between font-mono text-[10px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="bg-black text-white px-1.5 py-0.5 font-bold tracking-wider">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="font-bold text-black uppercase">{photo.plateNumber}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {/* Quick arrow move buttons */}
                          <button
                            type="button"
                            disabled={idx === 0 || Boolean(searchQuery)}
                            onClick={() => movePhoto(idx, 'prev')}
                            className="p-1 hover:bg-black hover:text-white border border-[#E5E5E5] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-colors"
                            title="Move Earlier in Sequence"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === photos.length - 1 || Boolean(searchQuery)}
                            onClick={() => movePhoto(idx, 'next')}
                            className="p-1 hover:bg-black hover:text-white border border-[#E5E5E5] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-colors"
                            title="Move Later in Sequence"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>

                          <div
                            className="cursor-grab active:cursor-grabbing p-1 text-[#737373] hover:text-black"
                            title="Click and drag to reorder"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Uncropped Framed Photo Container */}
                      <div className="p-2.5 bg-white aspect-[4/3] flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.cloudinary?.secureUrl}
                          alt={photo.title}
                          className="max-h-full max-w-full object-contain pointer-events-none"
                        />
                      </div>

                      {/* Metadata & Actions */}
                      <div className="p-3 border-t border-[#E5E5E5] space-y-2 bg-white">
                        <div>
                          <h4 className="font-bold text-black text-xs font-sans uppercase truncate">
                            {photo.title}
                          </h4>
                          <div className="text-[10px] text-[#737373] font-mono uppercase truncate">
                            {photo.location?.city} • {photo.year} • {photo.category}
                          </div>
                        </div>

                        <div className="text-[9px] text-[#525252] font-mono border-t border-[#F0F0F0] pt-1.5 flex justify-between">
                          <span className="truncate">{photo.exif?.camera || 'Canon EOS R10'}</span>
                          <span className="font-semibold text-black">{photo.exif?.shutterSpeed || ''} {photo.exif?.aperture || ''}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-[9px] font-mono">
                          <div className="space-x-1">
                            <button
                              type="button"
                              onClick={() => handleSetAsHero(photo)}
                              className="px-1.5 py-0.5 border border-black hover:bg-black hover:text-white font-bold uppercase tracking-wider"
                              title="Set as Homepage Hero"
                            >
                              HERO
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAsAboutPhoto(photo)}
                              className="px-1.5 py-0.5 border border-[#737373] text-[#525252] hover:bg-black hover:text-white uppercase tracking-wider"
                              title="Set as About Autoportrait"
                            >
                              ABOUT
                            </button>
                          </div>

                          <div className="space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(photo)}
                              className="p-1 border border-[#E5E5E5] hover:bg-black hover:text-white transition-colors"
                              title="Edit plate"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(photo._id || photo.slug || photo.plateNumber)}
                              className="p-1 border border-[#E5E5E5] hover:bg-red-600 hover:text-white transition-colors"
                              title="Delete plate"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. DETAILED DATA TABLE VIEW */}
            {photoViewMode === 'table' && (
              <div className="border border-[#E5E5E5] overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] text-[#737373] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">ORDER</th>
                      <th className="p-3">PREVIEW</th>
                      <th className="p-3">PHOTO NO.</th>
                      <th className="p-3">TITLE / LOCATION</th>
                      <th className="p-3">CATEGORY</th>
                      <th className="p-3">CAMERA & SETTINGS</th>
                      <th className="p-3">HOMEPAGE</th>
                      <th className="p-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {filteredPhotos.map((photo, idx) => (
                      <tr key={photo.plateNumber + (photo._id || '')} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-3 font-bold text-black">
                          <div className="flex items-center space-x-1">
                            <span>#{String(idx + 1).padStart(2, '0')}</span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={idx === 0 || Boolean(searchQuery)}
                                onClick={() => movePhoto(idx, 'prev')}
                                className="text-[#737373] hover:text-black disabled:opacity-20"
                                title="Move up"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === photos.length - 1 || Boolean(searchQuery)}
                                onClick={() => movePhoto(idx, 'next')}
                                className="text-[#737373] hover:text-black disabled:opacity-20"
                                title="Move down"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="w-14 h-10 bg-black overflow-hidden border border-[#E5E5E5]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.cloudinary?.secureUrl}
                              alt={photo.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="p-3 font-bold text-black">{photo.plateNumber}</td>
                        <td className="p-3">
                          <div className="font-bold text-black uppercase font-sans text-xs">{photo.title}</div>
                          <div className="text-[10px] text-[#737373]">
                            {photo.location.city.toUpperCase()} • {photo.location.specificLocation} ({photo.year})
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="border border-[#E5E5E5] px-2 py-0.5 text-[9px] uppercase">
                            {photo.category}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] text-[#525252]">
                          <div className="text-black font-semibold">{photo.exif?.camera}</div>
                          <div>{photo.exif?.lens} • {photo.exif?.shutterSpeed} {photo.exif?.aperture}</div>
                        </td>
                        <td className="p-3">
                          {photo.isFeaturedOnIndex ? (
                            <span className="text-emerald-700 font-bold text-[10px] uppercase">★ FEATURED (04)</span>
                          ) : (
                            <span className="text-[#A3A3A3] text-[10px] uppercase">ARCHIVE ONLY</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleSetAsHero(photo)}
                            className="px-2 py-1 text-[9px] border border-black hover:bg-black hover:text-white uppercase tracking-wider font-bold"
                            title="Set this photo as the Landing Page Hero plate"
                          >
                            SET HERO
                          </button>
                          <button
                            onClick={() => handleSetAsAboutPhoto(photo)}
                            className="px-2 py-1 text-[9px] border border-[#737373] text-[#525252] hover:bg-black hover:text-white uppercase tracking-wider"
                            title="Set this photo as the About Page Autoportrait"
                          >
                            SET ABOUT
                          </button>
                          <button
                            onClick={() => handleOpenEdit(photo)}
                            className="p-1 border border-[#E5E5E5] hover:bg-black hover:text-white transition-colors"
                            title="Edit plate image and parameters"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(photo._id || photo.slug || photo.plateNumber)}
                            className="p-1 border border-[#E5E5E5] hover:bg-red-600 hover:text-white transition-colors"
                            title="Delete plate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DISPATCHES */}
        {activeTab === 'dispatches' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
              <div>
                <div className="font-mono text-xs text-black font-bold uppercase">
                  JOURNAL STORIES & FIELD DISPATCHES ({dispatches.length})
                </div>
                <div className="font-mono text-[10px] text-[#737373]">
                  DOCUMENTARY PHOTO ESSAYS // CANON EOS R10 // FIELD ARCHIVE
                </div>
              </div>
              <button
                onClick={handleOpenAddDispatch}
                className="px-4 py-2 bg-black text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 hover:bg-neutral-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>WRITE NEW DISPATCH</span>
              </button>
            </div>

            {dispatches.length === 0 ? (
              <div className="p-12 border border-[#E5E5E5] text-center font-mono text-xs text-[#737373] space-y-3">
                <p className="uppercase tracking-wider">No journal dispatches published yet.</p>
                <button
                  onClick={handleOpenAddDispatch}
                  className="px-4 py-2 border border-black text-black font-bold uppercase hover:bg-black hover:text-white transition-colors"
                >
                  CREATE FIRST DISPATCH
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {dispatches.map((d) => (
                  <div key={d.slug || d._id} className="border border-black p-5 sm:p-6 bg-white flex flex-col justify-between space-y-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start font-mono text-[10px] text-[#737373]">
                        <span className="text-black font-bold uppercase">{d.dossierNumber}</span>
                        <span className="border border-black px-2 py-0.5 text-black font-semibold text-[9px] uppercase">
                          {d.formatTag || 'CANON EOS R10'}
                        </span>
                      </div>

                      {/* Cover Photo Thumbnail */}
                      {d.leadCoverPhotoUrl ? (
                        <div className="bg-[#FAFAFA] border border-[#E5E5E5] p-2 flex items-center justify-center h-44 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={d.leadCoverPhotoUrl}
                            alt={d.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="bg-[#F8F8F8] border border-dashed border-[#CCCCCC] p-4 text-center font-mono text-[10px] text-[#888888] h-20 flex items-center justify-center">
                          NO COVER PHOTO UPLOADED
                        </div>
                      )}

                      <h3 className="text-lg sm:text-xl font-black text-black uppercase font-sans tracking-tight leading-snug">
                        {d.title}
                      </h3>

                      <p className="font-mono text-xs text-[#525252] line-clamp-2">
                        {d.abstract}
                      </p>

                      <div className="font-mono text-[10px] text-[#737373] flex flex-wrap gap-x-3 gap-y-1">
                        <span>LOCATION: <strong className="text-black uppercase">{d.location}</strong></span>
                        <span>•</span>
                        <span>READ: <strong className="text-black">{d.readTimeMinutes} MIN</strong></span>
                        <span>•</span>
                        <span>
                          PLATES: <strong className="text-black">{d.galleryPhotos?.length || d.plateCount || 1}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-between font-mono text-xs gap-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditDispatch(d)}
                          className="px-3 py-1.5 border border-black text-black hover:bg-black hover:text-white transition-colors flex items-center space-x-1.5 font-bold text-[10px] uppercase"
                        >
                          <Edit className="w-3 h-3" />
                          <span>EDIT</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDispatch(d)}
                          className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors flex items-center space-x-1.5 font-bold text-[10px] uppercase"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>DELETE</span>
                        </button>
                      </div>

                      <a
                        href={`http://localhost:3000/essays/${d.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black font-bold hover:underline flex items-center space-x-1 text-[10px] uppercase"
                      >
                        <span>VIEW ON SITE</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INQUIRIES */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <div className="border-b border-[#E5E5E5] pb-4 font-mono text-xs text-[#737373]">
              COMMISSIONS & PRINT ACQUISITIONS FOR ABHISHEK GANGWAR ({siteConfig.photographerEmail})
            </div>

            <div className="space-y-4">
              {inquiries.length === 0 ? (
                <div className="p-8 border border-[#E5E5E5] text-center font-mono text-xs text-[#737373]">
                  No inquiries recorded at curatorial desk.
                </div>
              ) : (
                inquiries.map((inq) => (
                  <div key={inq._id} className="border border-[#E5E5E5] p-5 bg-white space-y-3 font-mono text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5E5] pb-2">
                      <div>
                        <span className="font-bold text-black uppercase">{inq.fullName}</span>
                        <span className="text-[#737373] ml-2">({inq.email})</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="bg-[#F4F4F4] border border-[#E5E5E5] px-2 py-0.5 text-[9px] font-bold">
                          {inq.classification}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
                          inq.status === 'PENDING' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          inq.status === 'REVIEWED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          'bg-neutral-100 text-neutral-700 border border-neutral-300'
                        }`}>
                          {inq.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-[#333333] leading-relaxed bg-[#FAFAFA] p-3 border border-[#E5E5E5]">
                      {inq.projectScope}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-[#737373]">
                      <span>TRANSMITTED: {new Date(inq.createdAt).toLocaleString()}</span>
                      <div className="space-x-2">
                        {inq.status !== 'REVIEWED' && (
                          <button
                            onClick={() => handleUpdateInquiryStatus(inq._id, 'REVIEWED')}
                            className="px-2.5 py-1 bg-black text-white uppercase tracking-wider text-[9px]"
                          >
                            MARK REVIEWED
                          </button>
                        )}
                        {inq.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleUpdateInquiryStatus(inq._id, 'ARCHIVED')}
                            className="px-2.5 py-1 border border-black uppercase tracking-wider text-[9px]"
                          >
                            ARCHIVE
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SUBSCRIBERS */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            <div className="border-b border-[#E5E5E5] pb-4 flex justify-between items-center font-mono text-xs">
              <span className="text-[#737373]">ACTIVE POSTAL DISPATCH RECIPIENTS</span>
              <span className="font-bold text-black uppercase">TOTAL: {subscribers.length}</span>
            </div>

            <div className="border border-[#E5E5E5]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] text-[#737373] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">RECIPIENT EMAIL</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3">REGISTRATION DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {subscribers.map((s) => (
                    <tr key={s._id || s.email} className="hover:bg-[#FAFAFA]">
                      <td className="p-3 font-bold text-black">{s.email}</td>
                      <td className="p-3 text-[10px] text-emerald-700 font-bold uppercase">{s.status || 'ACTIVE'}</td>
                      <td className="p-3 text-[10px] text-[#737373]">
                        {s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString() : 'Active'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS & DB */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8 font-mono text-xs">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-black uppercase font-sans">
                {siteConfig.websiteName} ENGINE & CLOUDINARY CONFIGURATION
              </h3>
              <p className="text-[#737373] text-[11px]">
                Engine endpoints, Mongoose schema state, and database reset controls.
              </p>
            </div>

            <div className="border border-[#E5E5E5] p-5 space-y-3 bg-[#FAFAFA]">
              <div className="flex justify-between">
                <span className="text-[#737373]">REST API STATUS:</span>
                <span className="text-emerald-700 font-bold">ONLINE (http://localhost:5000/api/v1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">DATA RETENTION MODE:</span>
                <span className="text-black font-semibold">MongoDB Atlas / Resilient Store</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">PHOTOGRAPHER:</span>
                <span className="text-black font-semibold">{siteConfig.photographerName} ({siteConfig.photographerEmail})</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E5E5] space-y-4">
              <div className="text-black font-bold uppercase">DATABASE OPERATIONS</div>
              <button
                onClick={handleReseed}
                className="px-6 py-3 bg-red-600 text-white font-mono text-xs font-bold tracking-widest uppercase hover:bg-red-700 transition-colors"
              >
                RESET CANONICAL ARCHIVAL DATA
              </button>
              <p className="text-[10px] text-[#737373]">
                Restores the standard 15 Indian street photographs and 5 field dispatches from New Delhi, Mumbai, Varanasi, and Kolkata captured on Canon EOS R10.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD / EDIT PHOTO */}
      {showAddPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full border border-black p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-3">
              <span className="font-bold text-black uppercase text-sm font-sans">
                {editingPhotoId ? 'EDIT PHOTO DETAILS & IMAGE' : 'ADD NEW PHOTO TO ARCHIVE'}
              </span>
              <button onClick={() => setShowAddPhoto(false)} className="text-[#737373] hover:text-black">
                [ESC / CLOSE]
              </button>
            </div>

            {/* Live Image Preview */}
            {photoForm.imageUrl && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-black uppercase">LIVE PREVIEW</label>
                  {photoForm.imageUrl.includes('cloudinary.com') ? (
                    <span className="font-mono text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 uppercase tracking-wider font-semibold">
                      ● Stored in Cloudinary (URL will be saved to MongoDB)
                    </span>
                  ) : photoForm.imageUrl.startsWith('data:image/') ? (
                    <span className="font-mono text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 uppercase tracking-wider font-semibold">
                      ⚠️ Uploading to Cloudinary...
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] text-[#525252] bg-neutral-100 border border-neutral-300 px-2 py-0.5 uppercase tracking-wider">
                      External Image URL
                    </span>
                  )}
                </div>
                <div className="aspect-[16/10] max-h-48 bg-[#F4F4F4] overflow-hidden border border-[#E5E5E5] flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoForm.imageUrl}
                    alt={photoForm.title || 'Preview'}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleSavePhoto} className="space-y-4">
              {/* Direct Photo File Upload */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-black uppercase">DIRECT IMAGE UPLOAD (CLOUDINARY)</label>
                {renderUploadZone('photo', 'UPLOAD PHOTO FROM COMPUTER (JPG, PNG, WEBP)')}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#737373] uppercase">OR PASTE DIRECT IMAGE URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://res.cloudinary.com/... or paste image URL"
                  value={photoForm.imageUrl}
                  onChange={e => setPhotoForm({ ...photoForm, imageUrl: e.target.value })}
                  className="w-full p-2.5 bg-[#F4F4F4] border border-[#E5E5E5] focus:outline-none focus:border-black font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">PLATE NUMBER *</label>
                  <input
                    type="text"
                    required
                    placeholder="PL. 01"
                    value={photoForm.plateNumber}
                    onChange={e => setPhotoForm({ ...photoForm, plateNumber: e.target.value })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">PLATE TITLE *</label>
                  <input
                    type="text"
                    required
                    placeholder="CROSSING CURRENTS"
                    value={photoForm.title}
                    onChange={e => setPhotoForm({ ...photoForm, title: e.target.value })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">CITY *</label>
                  <input
                    type="text"
                    required
                    value={photoForm.city}
                    onChange={e => setPhotoForm({ ...photoForm, city: e.target.value })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">SPECIFIC LOCATION *</label>
                  <input
                    type="text"
                    required
                    value={photoForm.specificLocation}
                    onChange={e => setPhotoForm({ ...photoForm, specificLocation: e.target.value })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">CHRONOLOGY (YEAR)</label>
                  <input
                    type="number"
                    value={photoForm.year}
                    onChange={e => setPhotoForm({ ...photoForm, year: Number(e.target.value) })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-black uppercase">CATEGORY *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STREETS, PEOPLE, COMPOSITION, ARCHITECTURE..."
                  value={photoForm.category}
                  onChange={e => setPhotoForm({ ...photoForm, category: e.target.value })}
                  className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5] uppercase font-mono text-xs"
                />
              </div>

              {/* Optical Formulary & EXIF Metadata Section */}
              <div className="border border-[#E5E5E5] p-4 bg-[#FAFAFA] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5E5] pb-2">
                  <div className="font-bold text-black uppercase text-[11px] font-sans">
                    OPTICAL FORMULARY & EXIF METADATA
                  </div>
                  {exifExtracted ? (
                    <span className="font-mono text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 uppercase tracking-wider font-bold">
                      ● AUTO-EXTRACTED FROM IMAGE EXIF
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] text-[#737373] uppercase tracking-wider">
                      Auto-fills when photo is uploaded
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black uppercase">CAMERA BODY</label>
                    <input
                      type="text"
                      placeholder="e.g. Canon EOS R10"
                      value={photoForm.camera}
                      onChange={e => setPhotoForm({ ...photoForm, camera: e.target.value })}
                      className="w-full p-2 bg-white border border-[#E5E5E5] text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black uppercase">OPTICAL LENS</label>
                    <input
                      type="text"
                      placeholder="e.g. Canon RF 35mm f/1.8 Macro IS STM"
                      value={photoForm.lens}
                      onChange={e => setPhotoForm({ ...photoForm, lens: e.target.value })}
                      className="w-full p-2 bg-white border border-[#E5E5E5] text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black uppercase">SHUTTER SPEED</label>
                    <input
                      type="text"
                      placeholder="e.g. 1/320s"
                      value={photoForm.shutterSpeed}
                      onChange={e => setPhotoForm({ ...photoForm, shutterSpeed: e.target.value })}
                      className="w-full p-2 bg-white border border-[#E5E5E5] text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black uppercase">APERTURE</label>
                    <input
                      type="text"
                      placeholder="e.g. f/2.8"
                      value={photoForm.aperture}
                      onChange={e => setPhotoForm({ ...photoForm, aperture: e.target.value })}
                      className="w-full p-2 bg-white border border-[#E5E5E5] text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black uppercase">ISO RATING</label>
                    <input
                      type="text"
                      placeholder="e.g. ISO 400"
                      value={photoForm.iso}
                      onChange={e => setPhotoForm({ ...photoForm, iso: e.target.value })}
                      className="w-full p-2 bg-white border border-[#E5E5E5] text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black uppercase">FOCAL LENGTH</label>
                    <input
                      type="text"
                      placeholder="e.g. 35mm"
                      value={photoForm.focalLength}
                      onChange={e => setPhotoForm({ ...photoForm, focalLength: e.target.value })}
                      className="w-full p-2 bg-white border border-[#E5E5E5] text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">SENSOR / EMULSION SPECIFICATION</label>
                  <input
                    type="text"
                    placeholder="e.g. 24.2MP CMOS RAW"
                    value={photoForm.filmStock}
                    onChange={e => setPhotoForm({ ...photoForm, filmStock: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E5E5E5] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="featIdx"
                  checked={photoForm.isFeaturedOnIndex}
                  onChange={e => setPhotoForm({ ...photoForm, isFeaturedOnIndex: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="featIdx" className="text-black font-bold uppercase cursor-pointer">
                  FEATURE IN SELECTED PLATES (04) ON LANDING PAGE
                </label>
              </div>

              <div className="pt-4 border-t border-[#E5E5E5] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddPhoto(false)}
                  className="px-4 py-2 border border-black uppercase tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-black text-white font-bold uppercase tracking-wider hover:bg-neutral-800"
                >
                  {editingPhotoId ? 'UPDATE PLATE' : 'TRANSMIT TO REGISTRY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT JOURNAL STORY */}
      {showAddDispatch && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-white max-w-3xl w-full border border-black p-5 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-3">
              <span className="font-bold text-black uppercase text-sm sm:text-base font-sans">
                {editingDispatchId ? 'EDIT JOURNAL STORY DOSSIER' : 'PUBLISH NEW JOURNAL STORY'}
              </span>
              <button
                onClick={() => {
                  setShowAddDispatch(false);
                  setEditingDispatchId(null);
                }}
                className="text-[#737373] hover:text-black font-bold"
              >
                [ESC / CLOSE]
              </button>
            </div>

            <form onSubmit={handleSaveDispatch} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">SERIES / ENTRY NUMBER *</label>
                  <input
                    type="text"
                    required
                    value={newDispatch.dossierNumber}
                    onChange={e => setNewDispatch({ ...newDispatch, dossierNumber: e.target.value })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">TITLE *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MONSOON CROSSINGS: CST TO BALLARD PIER"
                    value={newDispatch.title}
                    onChange={e => setNewDispatch({ ...newDispatch, title: e.target.value })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">LOCATION</label>
                  <input
                    type="text"
                    value={newDispatch.location}
                    onChange={e => setNewDispatch({ ...newDispatch, location: e.target.value })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">READ TIME (MIN)</label>
                  <input
                    type="number"
                    value={newDispatch.readTimeMinutes}
                    onChange={e => setNewDispatch({ ...newDispatch, readTimeMinutes: Number(e.target.value) })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-black uppercase">FORMAT TAG</label>
                  <input
                    type="text"
                    value={newDispatch.formatTag}
                    onChange={e => setNewDispatch({ ...newDispatch, formatTag: e.target.value })}
                    className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5]"
                  />
                </div>
              </div>

              {/* 1. LEAD COVER HERO PHOTO */}
              <div className="space-y-2 border border-[#E5E5E5] p-4 bg-[#FAFAFA]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-black uppercase">
                    1. LEAD COVER PHOTO (HERO IMAGE ON INDEX & ESSAY READER)
                  </label>
                  {newDispatch.leadCoverPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setNewDispatch(prev => ({ ...prev, leadCoverPhotoUrl: '' }))}
                      className="text-[10px] text-red-600 hover:underline uppercase font-bold"
                    >
                      REMOVE COVER
                    </button>
                  )}
                </div>

                {newDispatch.leadCoverPhotoUrl ? (
                  <div className="bg-white border border-[#E5E5E5] p-3 flex items-center justify-center h-44 overflow-hidden">
                    <img
                      src={newDispatch.leadCoverPhotoUrl}
                      alt="Cover Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  renderUploadZone('dispatch', 'UPLOAD STORY COVER PHOTO (JPG, PNG, WEBP)')
                )}

                <div className="space-y-1 pt-1">
                  <label className="text-[9px] font-bold text-[#737373] uppercase">OR PASTE DIRECT COVER IMAGE URL</label>
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/..."
                    value={newDispatch.leadCoverPhotoUrl}
                    onChange={e => setNewDispatch({ ...newDispatch, leadCoverPhotoUrl: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E5E5E5] text-xs font-mono"
                  />
                </div>
              </div>

              {/* 2. MULTIPLE PHOTO ESSAY PLATES */}
              <div className="space-y-3 border border-[#E5E5E5] p-4 bg-[#FAFAFA]">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                  <label className="text-[10px] font-bold text-black uppercase">
                    2. MULTIPLE PHOTO ESSAY PLATES ({newDispatch.galleryPhotos.length} ATTACHED)
                  </label>
                  <span className="text-[9px] text-[#737373] uppercase">
                    SHOWCASED IN ARTICLE GALLERY
                  </span>
                </div>

                {/* Multiple Upload Dropzone */}
                <div className="space-y-1.5">
                  <div className="relative border-2 border-dashed border-black p-4 bg-white hover:bg-[#F9F9F9] transition-colors text-center cursor-pointer group">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={dispatchGalleryUploading}
                      onChange={e => handleBatchGalleryUpload(e.target.files)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <Upload className={`w-5 h-5 text-black ${dispatchGalleryUploading ? 'animate-bounce text-emerald-600' : 'group-hover:-translate-y-0.5 transition-transform'}`} />
                      <span className="font-bold text-xs uppercase tracking-wider text-black">
                        {dispatchGalleryUploading ? 'OPTIMIZING & TRANSMITTING GALLERY PLATES...' : 'SELECT MULTIPLE IMAGES FOR THIS JOURNAL'}
                      </span>
                      <span className="text-[10px] text-[#737373]">
                        Click or drag multiple files at once • Auto-optimizes 10MB+ images to 4K web plates
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[9px] text-[#737373] px-1 font-mono gap-1">
                    <span className="uppercase flex items-center space-x-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>AUTO-OPTIMIZE BATCH:</span>
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setOptimizationMode('archival'); }}
                        className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
                          optimizationMode === 'archival'
                            ? 'bg-black text-white font-bold'
                            : 'bg-neutral-200 text-[#525252] hover:text-black'
                        }`}
                        title="Max 2560px at 92% quality with EXIF preserved"
                      >
                        4K Archival (92%)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setOptimizationMode('ultra'); }}
                        className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
                          optimizationMode === 'ultra'
                            ? 'bg-black text-white font-bold'
                            : 'bg-neutral-200 text-[#525252] hover:text-black'
                        }`}
                        title="Max 3840px (Ultra 4K) at 95% quality"
                      >
                        Master 4K (95%)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setOptimizationMode('original'); }}
                        className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
                          optimizationMode === 'original'
                            ? 'bg-black text-white font-bold'
                            : 'bg-neutral-200 text-[#525252] hover:text-black'
                        }`}
                        title="Bypass client-side compression"
                      >
                        Raw Original
                      </button>
                    </div>
                  </div>
                </div>

                {/* List of uploaded gallery plates */}
                {newDispatch.galleryPhotos.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="text-[10px] font-bold text-[#525252] uppercase">
                      STORY GALLERY PLATES (EDIT CAPTION OR REMOVE):
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {newDispatch.galleryPhotos.map((photo, pIdx) => (
                        <div key={pIdx} className="bg-white border border-[#E5E5E5] p-2.5 flex items-center space-x-3">
                          <div className="w-16 h-14 bg-neutral-100 border border-[#E5E5E5] flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                            <input
                              type="text"
                              placeholder={`Plate ${pIdx + 1} Title`}
                              value={photo.title || ''}
                              onChange={e => handleUpdateGalleryPhoto(pIdx, 'title', e.target.value)}
                              className="p-1 bg-[#FAFAFA] border border-[#E5E5E5]"
                            />
                            <input
                              type="text"
                              placeholder="Optional Caption / Context"
                              value={photo.caption || ''}
                              onChange={e => handleUpdateGalleryPhoto(pIdx, 'caption', e.target.value)}
                              className="p-1 bg-[#FAFAFA] border border-[#E5E5E5]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryPhoto(pIdx)}
                            className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                            title="Remove plate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-black uppercase">STORY ABSTRACT / SHORT SUMMARY *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="What happened, what you observed, how the place felt..."
                  value={newDispatch.abstract}
                  onChange={e => setNewDispatch({ ...newDispatch, abstract: e.target.value })}
                  className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-black uppercase">STORY TEXT / FIELD NOTES (MARKDOWN) *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="To walk down the street at dawn...\n\nEvery city has its rhythm..."
                  value={newDispatch.contentMarkdown}
                  onChange={e => setNewDispatch({ ...newDispatch, contentMarkdown: e.target.value })}
                  className="w-full p-2 bg-[#F4F4F4] border border-[#E5E5E5] font-mono text-xs"
                />
              </div>

              <div className="pt-4 border-t border-[#E5E5E5] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDispatch(false);
                    setEditingDispatchId(null);
                  }}
                  className="px-4 py-2 border border-black uppercase tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={dispatchGalleryUploading}
                  className="px-6 py-2 bg-black text-white font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50"
                >
                  {editingDispatchId ? 'UPDATE STORY DOSSIER' : 'PUBLISH STORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Floating Notification Toast (High Z-Index so it appears directly above all modals, cards, and upload dialogs) */}
      {notification && (
        <div className="fixed top-5 right-5 sm:right-8 z-[99999] max-w-md w-[92vw] sm:w-auto shadow-2xl pointer-events-auto">
          <div className={`p-4 font-mono text-xs flex items-center justify-between space-x-3.5 border-2 bg-[#0A0A0A] text-white ${
            notification.type === 'success' ? 'border-emerald-500 shadow-emerald-950/50' : 'border-red-500 shadow-red-950/50'
          }`}>
            <div className="flex items-center space-x-2.5 min-w-0">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span className="font-bold tracking-tight text-white leading-snug break-words">
                {notification.message}
              </span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-[#737373] hover:text-white text-[10px] uppercase tracking-wider flex-shrink-0 border border-[#333] px-1.5 py-0.5 hover:bg-[#222]"
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
