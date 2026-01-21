
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn,
  LogOut,
  Send,
  History,
  CheckCircle2,
  Camera,
  AlertCircle,
  ClipboardCheck,
  ChevronRight,
  User,
  Coffee,
  Check,
  X
} from 'lucide-react';
import { auth, googleProvider, db, storage } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import {
  ShiftStage,
  FormData,
  ReportSchema,
  ViewMode
} from './types';

const CHECKLIST_ITEMS: Record<ShiftStage, { id: string; label: string }[]> = {
  [ShiftStage.OPEN]: [
    { id: 'delivery_on', label: '배달 프로그램 ON' },
    { id: 'lights_on', label: '조명, 음악 ON' },
    { id: 'ac_heater', label: '에어컨 및 히터 확인' },
    { id: 'tea_water', label: '따듯한 차 및 식수 준비' },
  ],
  [ShiftStage.MIDDLE]: [
    { id: 'table_check', label: '테이블 정리 상태 확인' },
    { id: 'topping_check', label: '토핑 준비 체크리스트 확인' },
    { id: 'filling_check', label: '채우기 업무 리스트 확인' },
  ],
  [ShiftStage.CLOSE]: [
    { id: 'gas_check', label: '가스 차단기 -초록불-' },
    { id: 'warmer_check', label: '온장고 정리' },
    { id: 'fridge_check', label: '토핑 냉장고 도구 정리' },
    { id: 'floor_check', label: '바닥 청소' },
    { id: 'stove_check', label: '화구 청소' },
    { id: 'dishwasher_check', label: '식기세척기 마감' },
    { id: 'bleach_check', label: '헹주 락스' },
    { id: 'lights_door', label: '불 끄고 매장 문 잠그기' },
  ],
};

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [formData, setFormData] = useState<FormData>({
    shiftStage: ShiftStage.OPEN,
    busyLevel: '보통',
    issues: '',
    summaryForBoss: '',
    checklist: {},
    photos: [],
  });
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [reports, setReports] = useState<ReportSchema[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setViewMode('form');
        fetchHistory(currentUser.uid);
      } else {
        setViewMode('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login Error:", err);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  const handleLogout = () => signOut(auth);

  const fetchHistory = async (uid: string) => {
    let q;
    if (auth.currentUser?.email === 'daviidkang@gmail.com') {
       q = query(
        collection(db, "reports"),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(db, "reports"),
        where("reporter_uid", "==", uid),
        orderBy("createdAt", "desc")
      );
    }

    const querySnapshot = await getDocs(q);
    const history: ReportSchema[] = [];
    querySnapshot.forEach((doc) => {
      history.push({ id: doc.id, ...(doc.data() as object) } as ReportSchema);
    });
    setReports(history);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        const newPhotos = [...formData.photos];
        newPhotos[index] = compressed;
        setFormData(prev => ({ ...prev, photos: newPhotos }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.summaryForBoss.trim()) {
      alert("사장님 요약은 필수입니다.");
      return;
    }

    setIsSending(true);
    try {
      const now = new Date();
      const photoUrls: string[] = [];

      for (const [idx, photo] of formData.photos.entries()) {
        if (!photo) continue;
        const storageRef = ref(storage, `reports/${user.uid}/${Date.now()}_${idx}.jpg`);
        await uploadString(storageRef, photo, 'data_url');
        const url = await getDownloadURL(storageRef);
        photoUrls.push(url);
      }

      const reportData = {
        reporter_uid: user.uid,
        reporter_email: user.email,
        reporter_name: user.displayName || 'Unknown',
        shift_stage: formData.shiftStage,
        busy_level: formData.busyLevel,
        summary_for_boss: formData.summaryForBoss,
        issues: formData.issues,
        checklist: formData.checklist,
        photos: photoUrls,
        has_photo: photoUrls.length > 0,
        date: now.toLocaleDateString('ko-KR'),
        timestamp: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "reports"), reportData);

      fetch('/api/send-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      }).catch(err => console.error("Slack Notification Error:", err));

      setViewMode('success');
      fetchHistory(user.uid);
      setFormData(prev => ({ ...prev, photos: [], issues: '', summaryForBoss: '', checklist: {} }));
    } catch (err) {
      console.error(err);
      alert("제출 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

    return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 relative overflow-x-hidden">
      <div className="fixed inset-0 bg-dot-pattern opacity-40 pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-gradient-to-b from-slate-50/80 via-transparent to-slate-50/80 pointer-events-none -z-10" />
      
      <div className="max-w-md mx-auto px-6 py-10 relative">
        <header className="mb-10 text-center relative z-20">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-white shadow-2xl shadow-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/50 ring-1 ring-slate-100"
          >
            <Coffee className="w-8 h-8 text-indigo-600" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">SALADOOP</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">System Operational</p>
          </div>

          {user && (
            <div className="mt-8 mx-4 glass-panel p-1.5 rounded-2xl flex relative z-30">
              <button
                onClick={() => setViewMode('form')}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 relative z-10 ${viewMode === 'form' || viewMode === 'success' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {(viewMode === 'form' || viewMode === 'success') && (
                  <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white shadow-sm rounded-xl border border-slate-100" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                )}
                <span className="relative z-10 flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> 작성</span>
              </button>
              {user.email === 'daviidkang@gmail.com' && (
                <button
                  onClick={() => setViewMode('history')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 relative z-10 ${viewMode === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {viewMode === 'history' && (
                    <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white shadow-sm rounded-xl border border-slate-100" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                  )}
                  <span className="relative z-10 flex items-center gap-2"><History className="w-4 h-4" /> 기록</span>
                </button>
              )}
            </div>
          )}
        </header>

        <main className="relative z-10">
          <AnimatePresence mode="wait">
            {viewMode === 'auth' && (
              <motion.div
                key="auth"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="glass-panel p-10 rounded-[3rem] text-center"
              >
                <div className="mb-8">
                  <h2 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Access Required</h2>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">Please authenticate using your<br />Google Workspace account.</p>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 hover:shadow-2xl hover:-translate-y-1"
                >
                  <LogIn className="w-5 h-5" /> Google Login
                </button>
              </motion.div>
            )}

            {(viewMode === 'form' && user) && (
              <motion.form
                key="form"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="glass-panel p-6 rounded-[2rem] flex items-center gap-4">
                  <div className="relative">
                    <img src={user.photoURL || ''} alt="" className="w-12 h-12 rounded-full border-2 border-white shadow-md" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Operator</div>
                    <div className="text-lg font-black text-slate-900 tracking-tight">{user.displayName}</div>
                  </div>
                </div>

                <section className="space-y-3">
                   <div className="flex items-center gap-2 px-2">
                     <User className="w-4 h-4 text-slate-400" />
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Phase</label>
                   </div>
                   <div className="glass-panel p-2 rounded-[2rem] flex gap-1">
                      {Object.values(ShiftStage).map((stage) => {
                        const isSelected = formData.shiftStage === stage;
                        return (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, shiftStage: stage, checklist: {} }))}
                            className={`flex-1 py-4 rounded-[1.5rem] text-xs font-black transition-all relative ${isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="stage-active"
                                className="absolute inset-0 bg-slate-900 shadow-lg rounded-[1.5rem]"
                                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                              />
                            )}
                            <span className="relative z-10">{stage}</span>
                          </button>
                        );
                      })}
                   </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Camera className="w-4 h-4 text-slate-400" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Evidence</label>
                  </div>
                  <div className={`grid ${formData.shiftStage === ShiftStage.MIDDLE ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    {Array.from({ length: formData.shiftStage === ShiftStage.MIDDLE ? 4 : 1 }).map((_, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRefs.current[i]?.click()}
                        className="group relative aspect-video rounded-[1.5rem] bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-indigo-400 hover:bg-indigo-50/10 shadow-sm"
                      >
                        {formData.photos[i] ? (
                          <>
                            <img src={formData.photos[i]} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <div className="bg-white/90 p-2 rounded-full shadow-lg backdrop-blur-md">
                                 <Camera className="w-5 h-5 text-indigo-600" />
                               </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                              <Camera className="w-6 h-6 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-indigo-400 transition-colors">Add Photo</span>
                          </>
                        )}
                        <input type="file" ref={el => { fileInputRefs.current[i] = el; }} onChange={(e) => handleFileChange(e, i)} accept="image/*" capture="environment" className="hidden" />
                      </motion.div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Check</label>
                  </div>
                  <div className="grid gap-2">
                    {CHECKLIST_ITEMS[formData.shiftStage].map((item) => {
                      const isChecked = !!formData.checklist[item.id];
                      return (
                        <motion.label
                          key={item.id}
                          layout
                          initial={false}
                          animate={{ 
                            backgroundColor: isChecked ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.6)",
                            borderColor: isChecked ? "rgba(16, 185, 129, 0.2)" : "transparent"
                          }}
                          className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border shadow-sm group relative overflow-hidden`}
                        >
                          <div className={`absolute inset-0 bg-emerald-500/5 transition-transform duration-500 ${isChecked ? 'translate-x-0' : '-translate-x-full'}`} />
                          
                          <span className={`text-sm font-bold relative z-10 transition-colors ${isChecked ? 'text-emerald-700' : 'text-slate-600 group-hover:text-slate-900'}`}>
                            {item.label}
                          </span>
                          
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all relative z-10 ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                            <Check className={`w-3.5 h-3.5 text-white transition-all ${isChecked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} strokeWidth={4} />
                          </div>
                          
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setFormData(prev => ({ ...prev, checklist: { ...prev.checklist, [item.id]: !prev.checklist[item.id] } }))}
                            className="hidden"
                          />
                        </motion.label>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Summary</label>
                  </div>
                  <div className="glass-panel p-2 rounded-[2rem] space-y-2">
                    <div className="relative group">
                       <input
                        name="summaryForBoss"
                        value={formData.summaryForBoss}
                        onChange={handleInputChange}
                        placeholder="Executive Summary"
                        className="w-full bg-slate-50/50 border-none focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <textarea
                      name="issues"
                      value={formData.issues}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Additional Notes / Issues"
                      className="w-full bg-slate-50/50 border-none focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none resize-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                </section>

                <div className="pt-4 pb-12">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="group w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center relative overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:animate-[shimmer_1.5s_infinite]" />
                    {isSending ? (
                      <div className="flex items-center gap-3">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
                        <span className="text-sm font-bold opacity-80">Processing...</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-3">Submit Report <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {viewMode === 'success' && (
              <motion.div
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-panel p-12 rounded-[3.5rem] text-center border-white/60"
              >
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </motion.div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Report Sent</h2>
                <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed">Your report has been successfully logged<br />and synchronized with Slack.</p>
                <button
                  onClick={() => setViewMode('form')}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]"
                >
                  Return to Dashboard
                </button>
              </motion.div>
            )}

            {viewMode === 'history' && (
              <motion.div
                key="history"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6 pb-12"
              >
                <div className="glass-panel p-6 rounded-[2rem] flex flex-col items-center gap-3 sticky top-0 z-20 backdrop-blur-xl">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Selection</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-100 border-none rounded-xl px-6 py-3 font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 text-center w-full"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[ShiftStage.OPEN, ShiftStage.MIDDLE, ShiftStage.CLOSE].map((stage) => {
                    const stageReports = reports.filter(r => {
                      const reportDate = r.date.replace(/\. /g, '-').replace('.', '');
                      return reportDate === selectedDate && r.shift_stage === stage;
                    });

                    return (
                      <div key={stage} className="space-y-2">
                        <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {stage}
                        </div>
                        
                        {stageReports.length > 0 ? (
                          stageReports.map((report) => (
                            <motion.div
                              key={report.id}
                              whileHover={{ scale: 1.02, y: -2 }}
                              className="bg-white/80 p-5 rounded-[1.5rem] shadow-sm border border-slate-100 cursor-pointer relative overflow-hidden group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-black text-slate-900">{report.reporter_name}</h4>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{report.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed border-l-2 border-indigo-200 pl-3">
                                {report.summary_for_boss}
                              </p>
                              {report.has_photo && (
                                <div className="absolute bottom-4 right-4 opacity-50">
                                  <Camera className="w-4 h-4 text-slate-400" />
                                </div>
                              )}
                            </motion.div>
                          ))
                        ) : (
                          <div className="h-20 rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-slate-50/50">
                            <span className="text-[10px] text-slate-300 font-bold">No Data</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {user && (
          <footer className="mt-8 flex flex-col items-center relative z-10">
            <button onClick={handleLogout} className="px-6 py-2 rounded-full bg-white/50 border border-slate-200 text-[10px] font-black text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all flex items-center gap-2">
              <LogOut className="w-3 h-3" /> Terminate Session
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default App;
