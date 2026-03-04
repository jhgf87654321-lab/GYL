import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  ArrowLeft,
  Instagram, 
  Twitter, 
  Mail,
  Menu,
  X,
  Linkedin,
  Dribbble
} from 'lucide-react';
import { uploadToCos } from './cosClient';
import { getContentMap, setContentKey as persistContentKey, mergeContentMap, type ContentMap } from './contentStore';

// --- Admin context: only admins can see upload controls ---
const AdminContext = createContext<{
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
}>({
  isAdmin: false,
  login: () => {},
  logout: () => {},
});

function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('isAdmin') === 'true';
  });

  const login = () => {
    if (typeof window === 'undefined') return;
    const pwd = window.prompt('Admin password');
    if (!pwd) return;
    const expected = (import.meta as any).env?.VITE_ADMIN_PASSWORD as string | undefined;
    if (expected && pwd === expected) {
      setIsAdmin(true);
      window.localStorage.setItem('isAdmin', 'true');
    } else {
      window.alert('Wrong password');
    }
  };

  const logout = () => {
    setIsAdmin(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('isAdmin');
    }
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

function useAdmin() {
  return useContext(AdminContext);
}

// --- Content store context (CloudBase DB so Vercel/any device sees same media) ---
const ContentStoreContext = createContext<{
  contentMap: ContentMap;
  setContentKey: (key: string, url: string) => Promise<void>;
  isLoaded: boolean;
}>({
  contentMap: {},
  setContentKey: async () => {},
  isLoaded: false,
});

function ContentStoreProvider({ children }: { children: React.ReactNode }) {
  const [contentMap, setContentMap] = useState<ContentMap>({});
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    getContentMap().then((map) => {
      // 若云端为空，并且是在本地开发环境，则用 localStorage 做一次性回退并写入云端，实现「自动导入旧版本配置」。
      if (typeof window !== 'undefined' && Object.keys(map).length === 0 && window.location.hostname === 'localhost') {
        const prefix = ['resume-url', 'brand-identity-', 'philosophy-', 'process-img-', 'art-direction-', 'motion-design-', 'concord-video-'];
        const local: ContentMap = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (!key) continue;
          if (key === prefix[0] || prefix.some((p) => p !== 'resume-url' && key.startsWith(p))) {
            const v = window.localStorage.getItem(key);
            if (v) local[key] = v;
          }
        }
        if (Object.keys(local).length > 0) {
          mergeContentMap(local)
            .then((next) => {
              setContentMap(next);
              setLoaded(true);
            })
            .catch(() => {
              setContentMap(local);
              setLoaded(true);
            });
          return;
        }
      }
      setContentMap(map);
      setLoaded(true);
    });
  }, []);

  const setContentKey = async (key: string, url: string) => {
    setContentMap((prev) => ({ ...prev, [key]: url }));
    if (typeof window !== 'undefined') window.localStorage.setItem(key, url);
    await persistContentKey(key, url);
  };

  return (
    <ContentStoreContext.Provider value={{ contentMap, setContentKey, isLoaded }}>
      {children}
    </ContentStoreContext.Provider>
  );
}

function useContent() {
  return useContext(ContentStoreContext);
}

// --- Components ---

const Navbar = () => {
  const { isAdmin, login, logout } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
      <div className="font-serif text-2xl tracking-tighter font-medium text-white">fridie gu</div>
      
      <div className="hidden md:flex gap-10 text-[11px] uppercase tracking-[0.2em] font-medium text-white/80 items-center">
        {['Works', 'Philosophy', 'Contact'].map(item => {
          const href =
            item === 'Works'
              ? '#expertise'
              : `#${item.toLowerCase()}`;
          return (
            <a
              key={item}
              href={href}
              className="hover:text-white transition-colors"
            >
              {item}
            </a>
          );
        })}
        <button
          onClick={isAdmin ? logout : login}
          className="text-[10px] uppercase tracking-[0.2em] border border-white/30 rounded-full px-3 py-1 hover:bg-white hover:text-black transition-colors"
        >
          {isAdmin ? 'Admin Logout' : 'Admin Login'}
        </button>
      </div>

      <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </nav>
  );
};

const Hero = ({ onNavigate }: { onNavigate: (route: string) => void }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  
  return (
    <section className="relative h-screen overflow-hidden flex items-center justify-end px-12 md:px-24">
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2067&auto=format&fit=crop" 
          alt="fridie gu Hero" 
          className="w-full h-full object-cover brightness-50"
          referrerPolicy="no-referrer"
        />
      </motion.div>
      
      <div className="relative z-10 max-w-2xl text-right space-y-8">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="font-serif text-6xl md:text-9xl leading-[0.85] tracking-tighter"
        >
          Creative Director <br />
          <span className="italic">& Visual Artist.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-serenity-muted text-lg font-light leading-relaxed max-w-lg ml-auto"
        >
          Crafting timeless visual identities and immersive digital experiences for brands that value purpose and craft.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-end gap-6"
        >
          <button
            className="pill-button border-white/20 text-white hover:bg-white hover:text-black"
            onClick={() => onNavigate('brand-identity')}
          >
            View Selected Works
          </button>
        </motion.div>
      </div>
    </section>
  );
};

const Expertise = ({ onNavigate }: { onNavigate: (route: string) => void }) => {
  const services = [
    { name: 'Brand Identity', img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2071&auto=format&fit=crop', route: 'brand-identity' },
    { name: 'Digital Experience', img: 'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=1964&auto=format&fit=crop', route: 'digital-experience' },
    { name: 'Art Direction', img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop', route: 'art-direction' },
    { name: 'Motion Design', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop', route: 'motion-design' },
  ];

  const { contentMap, setContentKey } = useContent();
  const { isAdmin } = useAdmin();
  const resumeUrl = contentMap['resume-url'] ?? (typeof window !== 'undefined' ? window.localStorage.getItem('resume-url') : null) ?? null;
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { url } = await uploadToCos(file);
      await setContentKey('resume-url', url);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      event.target.value = '';
    }
  };

  const handleDownloadResume = () => {
    if (!resumeUrl) {
      if (typeof window !== 'undefined') {
        window.alert('请先上传简历 PDF。');
      }
      return;
    }
    if (typeof window !== 'undefined') {
      window.open(resumeUrl, '_blank');
    }
  };

  return (
    <section id="expertise" className="py-32 px-6 text-center space-y-20">
      <div className="space-y-4 max-w-2xl mx-auto">
        <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold">Expertise</span>
        <p className="text-serenity-muted text-sm leading-relaxed">
          A multidisciplinary approach to design, blending strategic thinking with artistic intuition to solve complex visual challenges.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-12 md:gap-20">
        {services.map((service, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            onClick={() => service.route ? onNavigate(service.route) : null}
            className={`group ${service.route ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden mb-6 border border-serenity-accent/20">
              <img 
                src={service.img} 
                alt={service.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-serenity-bg/20 group-hover:bg-transparent transition-colors" />
              
              {/* Overlay for clickable item */}
              {service.route && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                  <span className="text-white text-[10px] uppercase tracking-widest border border-white/50 px-4 py-2 rounded-full">View Project</span>
                </div>
              )}
            </div>
            <h3 className="font-serif text-2xl italic opacity-80 group-hover:opacity-100 transition-opacity">
              {service.name}
            </h3>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-4">
          <button
            className="pill-button"
            onClick={handleDownloadResume}
          >
            Download Resume PDF
          </button>
          {isAdmin && (
            <button
              className="pill-button border border-serenity-text/30 bg-transparent text-serenity-text hover:bg-serenity-text hover:text-serenity-bg"
              onClick={() => resumeInputRef.current?.click()}
            >
              Upload Resume PDF
            </button>
          )}
        </div>
        {isAdmin && (
          <input
            ref={resumeInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleResumeUpload}
          />
        )}
      </div>
    </section>
  );
};

const philosophyCardBase = [
  { title: 'panda planet', desc: 'Stripping away the unnecessary to reveal the core essence of a brand. Clarity over clutter, always.', route: 'philosophy-minimalism' },
  { title: 'Fabrique', desc: 'Every pixel and every line must serve a reason. Design is not just how it looks, but how it functions.', route: 'philosophy-purpose' },
  { title: 'Concord', desc: 'A relentless pursuit of detail. We believe that the smallest elements define the overall quality of the work.', route: 'philosophy-craft' },
  { title: 'YOUVW', desc: 'Pushing boundaries by embracing new technologies while respecting the timeless principles of art.', route: 'philosophy-innovation' },
] as Array<{ title: string; desc: string; route: string; img?: string | null }>;

const Philosophy = ({ onNavigate }: { onNavigate: (route: string) => void }) => {
  const { contentMap, setContentKey } = useContent();
  const values = philosophyCardBase.map((v, i) => ({
    ...v,
    img: contentMap[`philosophy-card-${v.title}`] ?? (typeof window !== 'undefined' ? window.localStorage.getItem(`philosophy-card-${v.title}`) : null) ?? `https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop&sig=${i}`,
  }));

  return (
    <section id="philosophy" className="relative min-h-screen bg-serenity-bg border-y border-serenity-text/10 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 h-full">
        <div className="p-12 md:p-24 border-r border-serenity-text/10 flex flex-col justify-between">
          <h2 className="font-serif text-5xl md:text-7xl tracking-tighter">Design <br /> Philosophy</h2>
          <div className="relative w-full aspect-square mt-20">
             <img 
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" 
              alt="Philosophy background" 
              className="w-full h-full object-cover opacity-70"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2">
          {values.map((v, i) => (
            <div 
              key={i} 
              onClick={() => v.route ? onNavigate(v.route) : null}
              className={`p-12 border-b border-r border-serenity-text/10 group hover:bg-serenity-accent/5 transition-colors ${v.route ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold">{v.title}</span>
                  {v.route && <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-serenity-accent" />}
                </div>
                <p className="text-serenity-muted text-sm leading-relaxed font-light">
                  {v.desc}
                </p>
              </div>
              <div className="mt-20 relative h-64 overflow-hidden rounded-lg">
                <img 
                  src={v.img || ''}
                  alt="Philosophy visual" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {useAdmin().isAdmin && (
                  <label
                    className="absolute bottom-3 right-3 z-20 cursor-pointer bg-black/70 hover:bg-black/90 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/40"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                          const { url } = await uploadToCos(file);
                          await setContentKey(`philosophy-card-${philosophyCardBase[i].title}`, url);
                        } catch (e) {
                          // eslint-disable-next-line no-console
                          console.error(e);
                        } finally {
                          event.target.value = '';
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const processDefaultImgs = [
  "https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2071&auto=format&fit=crop",
];

const Process = () => {
  const { contentMap, setContentKey } = useContent();
  const imgs = processDefaultImgs.map((fallback, i) =>
    contentMap[`process-img-${i}`] ?? (typeof window !== 'undefined' ? window.localStorage.getItem(`process-img-${i}`) : null) ?? fallback
  );

  const updateImg = async (index: number, url: string) => {
    await setContentKey(`process-img-${index}`, url);
  };

  const aspectClasses = [
    'w-full aspect-[3/4] object-cover rounded-2xl transition-all duration-700',
    'w-full aspect-square object-cover rounded-2xl transition-all duration-700',
    'w-full aspect-square object-cover rounded-2xl transition-all duration-700',
    'w-full aspect-[3/4] object-cover rounded-2xl transition-all duration-700',
  ];

  return (
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-12">
          <h2 className="font-serif text-5xl md:text-7xl tracking-tighter leading-none">
            The <span className="italic">process</span> of <br /> Creation...
          </h2>
          
          <p className="text-serenity-muted text-lg font-light leading-relaxed">
            From initial discovery to final execution, every project follows a rigorous strategic path. We begin by understanding the core values of the brand, followed by deep research and conceptualization. The result is a visual language that is both unique and impactful.
          </p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6 pt-20">
              {[0, 1].map((i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden group">
                  <img 
                    src={imgs[i]} 
                    alt={`Process ${i + 1}`} 
                    className={aspectClasses[i]}
                    referrerPolicy="no-referrer"
                  />
                  <label className="absolute bottom-3 right-3 z-10 cursor-pointer bg-black/70 hover:bg-black/90 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/30 text-white">
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { url } = await uploadToCos(file);
                          updateImg(i, url);
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          console.error(err);
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="space-y-6">
              {[2, 3].map((i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden group">
                  <img 
                    src={imgs[i]} 
                    alt={`Process ${i + 1}`} 
                    className={aspectClasses[i]}
                    referrerPolicy="no-referrer"
                  />
                  <label className="absolute bottom-3 right-3 z-10 cursor-pointer bg-black/70 hover:bg-black/90 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/30 text-white">
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { url } = await uploadToCos(file);
                          updateImg(i, url);
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          console.error(err);
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-serenity-accent/20 rounded-full pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

type CosUploadPlaceholderProps = {
  onUploaded: (url: string) => void;
  label?: string;
};

const CosUploadPlaceholder: React.FC<CosUploadPlaceholderProps> = ({ onUploaded, label }) => {
  const { isAdmin } = useAdmin();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setError(null);

    try {
      const { url } = await uploadToCos(file);
      onUploaded(url);
      setStatus('uploaded');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="relative z-10 flex flex-col items-center gap-4">
      <label className="cursor-pointer flex flex-col items-center gap-4 opacity-60 hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 border border-dashed border-white/50 rounded-full flex items-center justify-center">
          <span className="text-2xl font-light">+</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-center px-4 leading-relaxed">
          {label ?? 'Upload Image / Video'}
        </span>
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleChange}
        />
      </label>
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        {status === 'idle' && 'Select file to upload'}
        {status === 'uploading' && 'Uploading to COS...'}
        {status === 'uploaded' && 'Uploaded'}
        {status === 'error' && (error ?? 'Upload error')}
      </span>
    </div>
  );
};

const Footer = () => {
  return (
    <footer id="contact" className="py-20 px-8 border-t border-serenity-text/10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="space-y-6">
          <div className="font-serif text-3xl tracking-tighter">fridie gu</div>
          <p className="text-serenity-muted text-sm max-w-xs font-light">
            Based in Milan, working globally. Available for select projects and collaborations.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24">
          <div className="space-y-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-serenity-accent">Navigation</span>
            <ul className="space-y-2 text-sm text-serenity-muted font-light">
              <li><a href="#works" className="hover:text-serenity-text transition-colors">Works</a></li>
              <li><a href="#expertise" className="hover:text-serenity-text transition-colors">Expertise</a></li>
              <li><a href="#philosophy" className="hover:text-serenity-text transition-colors">Philosophy</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-serenity-accent">Social</span>
            <ul className="space-y-2 text-sm text-serenity-muted font-light">
              <li><a href="#" className="flex items-center gap-2 hover:text-serenity-text transition-colors"><Instagram size={14} /> Instagram</a></li>
              <li><a href="#" className="flex items-center gap-2 hover:text-serenity-text transition-colors"><Twitter size={14} /> Twitter</a></li>
              <li><a href="#" className="flex items-center gap-2 hover:text-serenity-text transition-colors"><Linkedin size={14} /> LinkedIn</a></li>
              <li><a href="#" className="flex items-center gap-2 hover:text-serenity-text transition-colors"><Dribbble size={14} /> Dribbble</a></li>
            </ul>
          </div>
          <div className="space-y-4 col-span-2 md:col-span-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-serenity-accent">Contact</span>
            <div className="space-y-2">
              <a href="mailto:jhgf876@sina.com" className="text-lg font-serif italic hover:text-serenity-accent transition-colors">jhgf876@sina.com</a>
              <p className="text-serenity-muted text-xs font-light">+18918585513</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-serenity-text/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest text-serenity-muted">
        <p>© 2024 fridie gu. All rights reserved.</p>
        <div className="flex gap-8">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

// --- New Project Page Component ---

const BrandIdentityProject: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { isAdmin } = useAdmin();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { contentMap, setContentKey } = useContent();
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const [heroUnmuted, setHeroUnmuted] = useState(false);
  const brandIdentityBase = [
    { name: 'Swiss Airmen', type: 'Watch', desc: 'Black Carbon & Technical Polymer', img: null as string | null },
    { name: 'Diamond Pendant', type: 'Jewelry', desc: '18k White Gold', img: null as string | null },
    { name: 'Onyx Ring', type: 'Jewelry', desc: 'Matte Black Finish', img: null as string | null },
    { name: 'Classic Timepiece', type: 'Watch', desc: 'Leather & Silver', img: null as string | null },
  ];
  const artifacts = brandIdentityBase.map((item) => ({
    ...item,
    img: (contentMap[`brand-identity-${item.name}`] ?? (typeof window !== 'undefined' ? window.localStorage.getItem(`brand-identity-${item.name}`) : null)) as string | null,
  }));
  const heroVideo = contentMap['brand-identity-hero-video'] ?? (typeof window !== 'undefined' ? window.localStorage.getItem('brand-identity-hero-video') : null) ?? null;

  useEffect(() => {
    const el = heroVideoRef.current;
    if (!el) return;
    const seekAndPlay = async () => {
      try {
        // 从第 1 秒开始播放（静音，保证自动播放兼容）
        el.currentTime = 1;
        await el.play();
      } catch {
        // ignore autoplay errors
      }
    };
    if (el.readyState >= 1) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      seekAndPlay();
    } else {
      const handler = () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        seekAndPlay();
        el.removeEventListener('loadedmetadata', handler);
      };
      el.addEventListener('loadedmetadata', handler);
      return () => el.removeEventListener('loadedmetadata', handler);
    }
  }, [heroVideo]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-black text-white font-sans"
    >
      {/* Minimal Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Portfolio
        </button>
        <div className="font-serif text-2xl tracking-tighter font-medium text-white">fridie gu</div>
      </nav>

      {/* Hero Video Section */}
      <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        <video 
          ref={heroVideoRef}
          autoPlay 
          loop 
          muted={!heroUnmuted}
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          src={
            heroVideo ??
            'https://assets.mixkit.co/videos/preview/mixkit-particles-of-gold-dust-floating-in-the-air-26563-large.mp4'
          }
          onClick={() => {
            const el = heroVideoRef.current;
            if (!el) return;
            setHeroUnmuted(true);
            if (el.paused) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              el.play().catch(() => {});
            } else {
              el.pause();
            }
          }}
        />
        
        {/* Gradient overlay to transition smoothly into the black section below */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black pointer-events-none" />
        
        <div className="absolute bottom-24 left-12 md:left-24 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold mb-4 block">Brand Identity</span>
            <h1 className="font-serif text-6xl md:text-8xl tracking-tighter leading-none">
              LOKADA <br /> <span className="italic">Collection in C4d</span>
            </h1>
          </motion.div>
        </div>
        
        {isAdmin && (
          <div className="absolute bottom-10 right-10 z-10">
            <CosUploadPlaceholder
              label="Upload Collection Intro Video"
              onUploaded={(url) => setContentKey('brand-identity-hero-video', url)}
            />
          </div>
        )}
      </section>

      {/* PNG Showcase Section (Black Background) */}
      <section className="bg-black py-32 px-6 md:px-24 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-24 md:w-1/2">
            <h2 className="font-serif text-4xl md:text-5xl mb-6">The Artifacts</h2>
            <p className="text-white/50 font-light leading-relaxed">
              A dedicated showcase for the collection's finest pieces. The pure black background is designed to enhance metallic reflections and highlight the intricate details of transparent PNG assets.
            </p>
          </div>

          {/* Grid for Jewelry & Watch PNGs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-32">
            {artifacts.map((item, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="group flex flex-col items-center"
              >
                {/* Image Container with subtle glow for PNGs */}
                <div className="relative w-full aspect-[4/5] bg-[#050505] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors overflow-hidden">
                  {/* Subtle background glow to make PNGs pop */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-serenity-accent/5 rounded-full blur-3xl group-hover:bg-serenity-accent/10 transition-colors" />
                  
                  {/* Content */}
                  {item.img ? (
                    <>
                      <img 
                        src={item.img} 
                        alt={item.name} 
                        className="relative z-10 w-4/5 h-4/5 object-contain group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      {isAdmin && (
                        <label className="absolute bottom-4 right-4 z-20 cursor-pointer bg-black/60 hover:bg-black/80 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/30">
                          Change
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              try {
                                const { url } = await uploadToCos(file);
                                await setContentKey(`brand-identity-${artifacts[i].name}`, url);
                              } catch (e) {
                                // eslint-disable-next-line no-console
                                console.error(e);
                              } finally {
                                event.target.value = '';
                              }
                            }}
                          />
                        </label>
                      )}
                    </>
                  ) : (
                    isAdmin ? (
                      <CosUploadPlaceholder
                        label={`${item.type} PNG / Video`}
                        onUploaded={(url) => setContentKey(`brand-identity-${artifacts[i].name}`, url)}
                      />
                    ) : null
                  )}
                </div>
                
                {/* Caption */}
                <div className="mt-10 text-center">
                  <h3 className="font-serif text-3xl italic">{item.name}</h3>
                  <p className="text-white/40 text-sm mt-3 tracking-widest uppercase text-[10px]">{item.desc}</p>
                  <div className="w-12 h-[1px] bg-serenity-accent/30 mx-auto mt-6" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
};

// --- Digital Experience Project Page Component ---

const DigitalExperienceProject: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const websites = [
    {
      title: "AI Station for Fashion",
      url: "https://mpf520.icu",
      desc: "A modern web experience focusing on fluid interactions and responsive design.",
      tags: ["Web Design", "Frontend Development", "Interactive"]
    },
    {
      title: "Pantone referees",
      url: "https://mpfff.icu",
      desc: "An experimental digital platform exploring new paradigms in user interface.",
      tags: ["UI/UX", "Creative Coding", "Web GL"]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-serenity-bg text-serenity-text font-sans"
    >
      {/* Minimal Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Portfolio
        </button>
        <div className="font-serif text-2xl tracking-tighter font-medium text-white">fridie gu</div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[60vh] w-full flex items-end pb-24 px-12 md:px-24 border-b border-serenity-text/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=1964&auto=format&fit=crop" 
            alt="Digital Experience Hero" 
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-serenity-bg to-transparent" />
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold mb-4 block">Digital Experience</span>
            <h1 className="font-serif text-6xl md:text-8xl tracking-tighter leading-none">
              Web <span className="italic">Creations</span>
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Websites Showcase Section */}
      <section className="py-32 px-6 md:px-24">
        <div className="max-w-7xl mx-auto space-y-40">
          {websites.map((site, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="flex flex-col gap-12"
            >
              {/* Project Info */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                <div className="space-y-4 max-w-xl">
                  <h2 className="font-serif text-4xl md:text-5xl">{site.title}</h2>
                  <p className="text-serenity-muted font-light leading-relaxed">{site.desc}</p>
                  <div className="flex flex-wrap gap-3 pt-4">
                    {site.tags.map(tag => (
                      <span key={tag} className="text-[9px] uppercase tracking-widest border border-serenity-accent/30 px-3 py-1 rounded-full text-serenity-accent">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <a 
                  href={site.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-bold text-serenity-bg bg-serenity-accent px-8 py-4 rounded-full hover:bg-white transition-colors"
                >
                  Visit Live Site <ArrowRight size={16} />
                </a>
              </div>

              {/* Browser Mockup */}
              <div className="w-full rounded-xl border border-serenity-text/10 bg-[#1a1a1a] shadow-2xl overflow-hidden flex flex-col">
                {/* Browser Chrome */}
                <div className="h-12 border-b border-serenity-text/10 bg-[#222] flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <div className="ml-4 px-4 py-1 bg-[#111] rounded text-[10px] font-mono text-white/50 tracking-wider flex-1 max-w-md text-center truncate">
                    {site.url}
                  </div>
                </div>
                {/* Iframe Container */}
                <div className="relative w-full aspect-[16/10] md:aspect-[16/9] bg-black">
                  <iframe 
                    src={site.url} 
                    title={site.title}
                    className="absolute inset-0 w-full h-full border-none"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

// --- Art Direction Project Page Component ---

const StackedImageGallery = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="relative w-full aspect-[4/5] md:aspect-square cursor-pointer group" onClick={nextImage}>
      <AnimatePresence mode="popLayout">
        {images.map((img, i) => {
          // Calculate position in stack
          const position = (i - currentIndex + images.length) % images.length;
          const isVisible = position < 3; // Show top 3 images

          if (!isVisible) return null;

          return (
            <motion.div
              key={img}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ 
                opacity: 1 - position * 0.3, 
                scale: 1 - position * 0.05, 
                y: position * -20,
                zIndex: images.length - position,
                filter: 'none'
              }}
              exit={{ opacity: 0, scale: 1.1, x: 100, rotate: 10 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-0 rounded-2xl overflow-hidden border border-serenity-text/10 bg-serenity-bg"
            >
              <img 
                src={img} 
                alt="Gallery" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-serenity-accent/5 pointer-events-none" />
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* Interaction Hint */}
      <div className="absolute bottom-6 right-6 z-50 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-[10px] uppercase tracking-widest text-white border border-white/20">
        Click to Slide
      </div>
    </div>
  );
};

const artDirectionBase = [
  { title: "ROMANO", subtitle: "AI-Generated Visual Identity", desc: "Exploring the intersection of machine learning and classical art direction. This project utilizes custom-trained models to generate a cohesive brand language that evolves in real-time.", images: ["https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop", "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2070&auto=format&fit=crop", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2070&auto=format&fit=crop"], tags: ["Stable Diffusion", "Midjourney", "Art Direction"] },
  { title: "GAOTU", subtitle: "Conceptual Architecture", desc: "A series of architectural visualizations generated through latent space exploration. The project challenges traditional notions of form and structure by leveraging AI's ability to dream up impossible geometries.", images: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1964&auto=format&fit=crop", "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1964&auto=format&fit=crop"], tags: ["Generative Design", "3D Visualization", "AI Research"] },
  { title: "BAILIAN", subtitle: "Organic Algorithms", desc: "A visual study on the simulation of natural growth patterns using recursive neural networks. This project aims to create a digital ecosystem that feels both alien and deeply familiar.", images: ["https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop", "https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=1974&auto=format&fit=crop", "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1974&auto=format&fit=crop"], tags: ["Algorithmic Art", "Nature Simulation", "AI Art"] },
];

const ArtDirectionProject: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { contentMap, setContentKey } = useContent();
  const aiProjects = artDirectionBase.map((project) => ({
    ...project,
    images: project.images.map((img, idx) =>
      contentMap[`art-direction-${project.title}-${idx}`] ?? (typeof window !== 'undefined' ? window.localStorage.getItem(`art-direction-${project.title}-${idx}`) : null) ?? img
    ),
  }));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-serenity-bg text-serenity-text font-sans"
    >
      {/* Minimal Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Portfolio
        </button>
        <div className="font-serif text-2xl tracking-tighter font-medium text-white">fridie gu</div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[60vh] w-full flex items-end pb-24 px-12 md:px-24 border-b border-serenity-text/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" 
            alt="Art Direction Hero" 
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-serenity-bg to-transparent" />
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold mb-4 block">Art Direction</span>
            <h1 className="font-serif text-6xl md:text-8xl tracking-tighter leading-none">
              AI <span className="italic">Explorations</span>
            </h1>
          </motion.div>
        </div>
      </section>

      {/* AI Projects Showcase */}
      <section className="divide-y divide-serenity-text/10">
        {aiProjects.map((project, index) => (
          <div key={index} className="py-32 px-6 md:px-24">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className={`space-y-8 ${index % 2 === 1 ? 'lg:order-2' : ''}`}
              >
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold">{project.subtitle}</span>
                  <h2 className="font-serif text-5xl md:text-7xl tracking-tighter leading-none">{project.title}</h2>
                </div>
                
                <p className="text-serenity-muted text-lg font-light leading-relaxed">
                  {project.desc}
                </p>

                <div className="flex flex-wrap gap-3 pt-4">
                  {project.tags.map(tag => (
                    <span key={tag} className="text-[9px] uppercase tracking-widest border border-serenity-accent/30 px-3 py-1 rounded-full text-serenity-accent">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="relative space-y-6"
              >
                <StackedImageGallery images={project.images} />

                <div className="flex flex-wrap gap-4">
                  {project.images.map((_, imgIndex) => (
                    <div key={imgIndex} className="w-32">
                      <CosUploadPlaceholder
                        label={`Upload ${imgIndex + 1}`}
                        onUploaded={(url) => setContentKey(`art-direction-${aiProjects[index].title}-${imgIndex}`, url)}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        ))}
      </section>
    </motion.div>
  );
};

// --- Motion Design Project Page Component ---

const motionDesignBase = [
  { title: "Kinetic Vessel", desc: "An exploration of fluid dynamics in glass-like polymers.", img: "https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=2000&auto=format&fit=crop" },
  { title: "Neural Fabric", desc: "Simulating organic growth patterns in synthetic textiles.", img: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=2000&auto=format&fit=crop" },
  { title: "Prismatic Core", desc: "Light refraction studies on crystalline structures.", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop" },
  { title: "Obsidian Flow", desc: "High-viscosity liquid simulations on dark surfaces.", img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop" },
  { title: "Aetherial Form", desc: "Weightless structures suspended in a digital void.", img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000&auto=format&fit=crop" },
  { title: "Carbon Rhythm", desc: "Rhythmic patterns in woven carbon fiber composites.", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2000&auto=format&fit=crop" },
];

const MotionDesignProject: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { contentMap, setContentKey } = useContent();
  const experimentalProducts = motionDesignBase.map((item) => ({
    ...item,
    img: contentMap[`motion-design-${item.title}`] ?? (typeof window !== 'undefined' ? window.localStorage.getItem(`motion-design-${item.title}`) : null) ?? item.img,
  }));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-serenity-bg text-serenity-text font-sans"
    >
      {/* Minimal Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Portfolio
        </button>
        <div className="font-serif text-2xl tracking-tighter font-medium text-white">fridie gu</div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[60vh] w-full flex items-end pb-24 px-12 md:px-24 border-b border-serenity-text/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" 
            alt="Motion Design Hero" 
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-serenity-bg to-transparent" />
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold mb-4 block">Motion Design</span>
            <h1 className="font-serif text-6xl md:text-8xl tracking-tighter leading-none">
              Experimental <br /> <span className="italic">Artifacts</span>
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Square Grid Showcase */}
      <section className="py-32 px-6 md:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {experimentalProducts.map((product, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="group flex flex-col space-y-6"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-serenity-text/5 bg-black/5">
                  <img 
                    src={product.img} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-serenity-accent/5 group-hover:bg-transparent transition-colors pointer-events-none" />

                  <label className="absolute bottom-4 right-4 z-20 cursor-pointer bg-black/70 hover:bg-black/90 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/30">
                    Change
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                          const { url } = await uploadToCos(file);
                          await setContentKey(`motion-design-${experimentalProducts[index].title}`, url);
                        } catch (e) {
                          // eslint-disable-next-line no-console
                          console.error(e);
                        } finally {
                          event.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl italic opacity-80 group-hover:opacity-100 transition-opacity">
                    {product.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
};

// --- Philosophy Detail Page Component ---

const PhilosophyDetail: React.FC<{ 
  title: string; 
  subtitle: string; 
  desc: string; 
  videoUrl: string;
  artifacts: { name: string; type: string; desc: string; img: string | null }[];
  onBack: () => void;
}> = ({ title, subtitle, desc, videoUrl, artifacts, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { contentMap, setContentKey } = useContent();
  const heroImage = contentMap[`philosophy-hero-${title}`] ?? (typeof window !== 'undefined' ? window.localStorage.getItem(`philosophy-hero-${title}`) : null) ?? null;
  const localArtifacts = artifacts.map((item) => ({
    ...item,
    img: (contentMap[`philosophy-${title}-${item.name}`] ?? (typeof window !== 'undefined' ? window.localStorage.getItem(`philosophy-${title}-${item.name}`) : null) ?? item.img) as string | null,
  }));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-black text-white font-sans"
    >
      {/* Minimal Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Portfolio
        </button>
        <div className="font-serif text-2xl tracking-tighter font-medium text-white">fridie gu</div>
      </nav>

      {/* Hero Video Section */}
      <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black" />
        
        <div className="absolute bottom-20 left-12 md:left-24 z-10 max-w-3xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold mb-4 block">
              Philosophy / {title}
            </span>
            <h1 className="font-serif text-6xl md:text-8xl tracking-tighter leading-none">
              {title} <br /> <span className="italic">{subtitle}</span>
            </h1>
          </motion.div>

          <div className="relative w-full max-w-xl aspect-[4/3] rounded-2xl border border-white/15 bg-black/40 overflow-hidden">
            {heroImage ? (
              <>
                <img
                  src={heroImage}
                  alt={`${title} Hero`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <label className="absolute bottom-3 right-3 z-20 cursor-pointer bg-black/70 hover:bg-black/90 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/40">
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const { url } = await uploadToCos(file);
                        await setContentKey(`philosophy-hero-${title}`, url);
                      } catch (e) {
                        // eslint-disable-next-line no-console
                        console.error(e);
                      } finally {
                        event.target.value = '';
                      }
                    }}
                  />
                </label>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CosUploadPlaceholder
                  label="Upload Philosophy Hero Image"
                  onUploaded={(url) => setContentKey(`philosophy-hero-${title}`, url)}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-black py-32 px-6 md:px-24 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-24 md:w-1/2">
            <h2 className="font-serif text-4xl md:text-5xl mb-6">NFT</h2>
            <p className="text-white/50 font-light leading-relaxed">
              {desc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-32">
            {localArtifacts.map((item, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="group flex flex-col items-center"
              >
                <div className="relative w-full aspect-[4/5] bg-[#050505] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-serenity-accent/5 rounded-full blur-3xl group-hover:bg-serenity-accent/10 transition-colors" />
                  
                  {item.img ? (
                    <img 
                      src={item.img} 
                      alt={item.name} 
                      className="relative z-10 w-4/5 h-4/5 object-contain group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <CosUploadPlaceholder
                      label={`${item.type} Visual`}
                      onUploaded={(url) => setContentKey(`philosophy-${title}-${localArtifacts[i].name}`, url)}
                    />
                  )}
                </div>
                
                <div className="mt-10 text-center">
                  <h3 className="font-serif text-3xl italic">{item.name}</h3>
                  <p className="text-white/40 text-sm mt-3 tracking-widest uppercase text-[10px]">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
};

// --- Philosophy Craft Page Component ---

const PhilosophyCraft: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const defaultVideos = [
    "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-person-working-on-a-watch-4286-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-craftsman-working-on-a-leather-piece-4285-large.mp4"
  ];

  const { contentMap, setContentKey } = useContent();
  const videos = defaultVideos.map((fallback, i) =>
    contentMap[`concord-video-${i}`] ?? (typeof window !== 'undefined' ? window.localStorage.getItem(`concord-video-${i}`) : null) ?? fallback
  );

  const videoLabels = ["Micro-Mechanical Detail", "Tactile Materiality"];
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [unmuted, setUnmuted] = useState<[boolean, boolean]>([false, false]);

  useEffect(() => {
    // Autoplay only the first video (muted) on mount / url change
    const el = videoRefs.current[0];
    if (!el) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    el.play().catch(() => {});
  }, [videos]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-black text-white font-sans"
    >
      {/* Minimal Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Portfolio
        </button>
        <div className="font-serif text-2xl tracking-tighter font-medium text-white">fridie gu</div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-12 md:px-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.3em] text-serenity-accent font-bold mb-4 block">Philosophy / Concord</span>
          <h1 className="font-serif text-6xl md:text-8xl tracking-tighter leading-none">
            shooting and <br /> <span className="italic">cutting</span>
          </h1>
          <p className="mt-12 text-white/50 font-light leading-relaxed max-w-2xl text-lg">
            Concord is the bridge between a good idea and a great product. It is the relentless pursuit of perfection in every detail, from the invisible internal mechanics to the tactile surface finish.
          </p>
        </div>
      </section>

      {/* Stacked Videos Section */}
      <section className="bg-black py-24 px-6 md:px-24 space-y-24">
        {videos.map((url, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: i * 0.2 }}
            className="max-w-7xl mx-auto space-y-6"
          >
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black/40">
              {url ? (
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el;
                  }}
                  autoPlay={i === 0}
                  loop
                  muted={!unmuted[i]}
                  playsInline
                  className="w-full h-full object-cover"
                  src={url}
                  onClick={() => {
                    const el = videoRefs.current[i];
                    if (!el) return;
                    setUnmuted((prev) => {
                      const next: [boolean, boolean] = [...prev] as [boolean, boolean];
                      next[i] = true;
                      return next;
                    });
                    if (el.paused) {
                      // eslint-disable-next-line @typescript-eslint/no-floating-promises
                      el.play().catch(() => {});
                    } else {
                      el.pause();
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CosUploadPlaceholder
                    label={`Upload Video ${i + 1}`}
                    onUploaded={(newUrl) => setContentKey(`concord-video-${i}`, newUrl)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-6 px-2">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-medium">
                  Study 0{i + 1}
                </span>
                <h3 className="font-serif text-2xl italic text-white mt-2">
                  {videoLabels[i]}
                </h3>
              </div>

              <label className="cursor-pointer bg-black/70 hover:bg-black/90 text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-white/40">
                Change Video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const { url: newUrl } = await uploadToCos(file);
                      await setContentKey(`concord-video-${i}`, newUrl);
                    } catch (e) {
                      // eslint-disable-next-line no-console
                      console.error(e);
                    } finally {
                      event.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </motion.div>
        ))}
      </section>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'home' | 'brand-identity' | 'digital-experience' | 'art-direction' | 'motion-design' | 'philosophy-minimalism' | 'philosophy-purpose' | 'philosophy-innovation' | 'philosophy-craft'>('home');

  return (
    <ContentStoreProvider>
    <AdminProvider>
    <AnimatePresence mode="wait">
      {currentRoute === 'home' ? (
        <motion.div 
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="min-h-screen bg-serenity-bg text-serenity-text font-sans scroll-smooth"
        >
          <Navbar />
          <main>
            <Hero onNavigate={setCurrentRoute} />
            <Expertise onNavigate={setCurrentRoute} />
            <Philosophy onNavigate={setCurrentRoute} />
            <Process />
          </main>
          <Footer />
        </motion.div>
      ) : currentRoute === 'brand-identity' ? (
        <BrandIdentityProject key="brand-identity" onBack={() => setCurrentRoute('home')} />
      ) : currentRoute === 'digital-experience' ? (
        <DigitalExperienceProject key="digital-experience" onBack={() => setCurrentRoute('home')} />
      ) : currentRoute === 'art-direction' ? (
        <ArtDirectionProject key="art-direction" onBack={() => setCurrentRoute('home')} />
      ) : currentRoute === 'motion-design' ? (
        <MotionDesignProject key="motion-design" onBack={() => setCurrentRoute('home')} />
      ) : currentRoute === 'philosophy-minimalism' ? (
        <PhilosophyDetail 
          key="minimalism"
          title="panda planet"
          subtitle="Pure Form"
          desc="panda planet is not the absence of something, but the perfect amount of it. We strip away the noise to find the signal, creating timeless visual languages that speak through silence."
          videoUrl="https://assets.mixkit.co/videos/preview/mixkit-abstract-white-waves-background-4458-large.mp4"
          artifacts={[
            { name: 'Void 01', type: 'Concept', desc: 'Negative Space Study', img: null },
            { name: 'Monolith', type: 'Concept', desc: 'Geometric Purity', img: null }
          ]}
          onBack={() => setCurrentRoute('home')}
        />
      ) : currentRoute === 'philosophy-purpose' ? (
        <PhilosophyDetail 
          key="purpose"
          title="Fabrique"
          subtitle="Intentional Design"
          desc="Every design choice is a strategic decision. We believe that beauty is a byproduct of function, and that true impact comes from understanding the 'why' behind every pixel."
          videoUrl="https://assets.mixkit.co/videos/preview/mixkit-ink-in-water-swirling-7945-large.mp4"
          artifacts={[
            { name: 'Logic Flow', type: 'Concept', desc: 'Strategic Mapping', img: null },
            { name: 'Core', type: 'Concept', desc: 'Functional Foundation', img: null }
          ]}
          onBack={() => setCurrentRoute('home')}
        />
      ) : currentRoute === 'philosophy-craft' ? (
        <PhilosophyCraft key="craft" onBack={() => setCurrentRoute('home')} />
      ) : (
        <PhilosophyDetail 
          key="innovation"
          title="YOUVW"
          subtitle="Future Craft"
          desc="YOUVW is the bridge between tradition and the unknown. We leverage cutting-edge technology to express timeless human emotions, constantly redefining what is possible in the digital realm."
          videoUrl="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blue-and-purple-lines-21415-large.mp4"
          artifacts={[
            { name: 'Neural Grid', type: 'Concept', desc: 'AI Assisted Form', img: null },
            { name: 'Cyber Organic', type: 'Concept', desc: 'Technological Growth', img: null }
          ]}
          onBack={() => setCurrentRoute('home')}
        />
      )}
    </AnimatePresence>
    </AdminProvider>
    </ContentStoreProvider>
  );
}
