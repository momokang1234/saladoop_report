
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
  Sun,
  Moon
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
    const q = query(
      collection(db, "reports"),
      where("reporter_uid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const history: ReportSchema[] = [];
    querySnapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() } as ReportSchema);
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

      // 이미지 스토리지 업로드 최적화 (Firestore는 텍스트만, Storage는 사진)
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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(99,102,241,0.05)_0%,rgba(255,255,255,0)_100%)]" />

      <div className="max-w-md mx-auto px-6 py-12">
        <header className="mb-12 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-white shadow-2xl shadow-indigo-100 rounded-[1.5rem] flex items-center justify-center mb-6 border border-slate-100"
          >
            <Coffee className="w-8 h-8 text-indigo-600" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">SALADOOP</h1>
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">Intelligent Report System</p>

          {user && (
            <div className="mt-8 flex bg-white/50 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/60 shadow-sm w-full">
              <button
                onClick={() => setViewMode('form')}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${viewMode === 'form' || viewMode === 'success' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <ClipboardCheck className="w-4 h-4" /> 작성
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${viewMode === 'history' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <History className="w-4 h-4" /> 기록
              </button>
            </div>
          )}
        </header>

        <main>
          <AnimatePresence mode="wait">
            {viewMode === 'auth' && (
              <motion.div
                key="auth"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="bg-white/70 backdrop-blur-2xl p-10 rounded-[3rem] border border-white shadow-2xl shadow-indigo-100/50 text-center"
              >
                <div className="mb-8">
                  <h2 className="text-xl font-black text-slate-900 mb-3">Welcome Back</h2>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">진행하시려면 Google 계정으로<br />로그인이 필요합니다.</p>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-slate-200"
                >
                  <LogIn className="w-5 h-5" /> Google 로그인
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
                className="space-y-8"
              >
                {/* Section: Reporter */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                  <header className="flex items-center gap-2 mb-6">
                    <User className="w-4 h-4 text-indigo-500" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">담당자 및 근무 시간</label>
                  </header>
                  <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">작성자</div>
                      <div className="text-sm font-black text-slate-900">{user.displayName}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl">
                    {Object.values(ShiftStage).map((stage) => (
                      <button
                        key={stage} type="button"
                        onClick={() => setFormData(prev => ({ ...prev, shiftStage: stage, checklist: {} }))}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formData.shiftStage === stage ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Section: Photos */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                  <header className="flex items-center gap-2 mb-6">
                    <Camera className="w-4 h-4 text-indigo-500" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">현장 기록 (고화질)</label>
                  </header>
                  <div className={`grid ${formData.shiftStage === ShiftStage.MIDDLE ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    {Array.from({ length: formData.shiftStage === ShiftStage.MIDDLE ? 4 : 1 }).map((_, i) => (
                      <motion.div
                        key={i}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRefs.current[i]?.click()}
                        className="relative aspect-video rounded-[1.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100 hover:border-indigo-300 transition-all"
                      >
                        {formData.photos[i] ? (
                          <img src={formData.photos[i]} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-slate-200 mb-2" />
                            <span className="text-[10px] text-slate-400 font-bold">이미지 추가</span>
                          </>
                        )}
                        <input type="file" ref={el => { fileInputRefs.current[i] = el; }} onChange={(e) => handleFileChange(e, i)} accept="image/*" capture="environment" className="hidden" />
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Section: Checklist */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                  <header className="flex items-center gap-2 mb-6">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">필수 체크리스트</label>
                  </header>
                  <div className="space-y-3">
                    {CHECKLIST_ITEMS[formData.shiftStage].map((item) => (
                      <motion.label
                        key={item.id}
                        variants={itemVariants}
                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${formData.checklist[item.id] ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-transparent hover:border-slate-100'}`}
                      >
                        <span className={`text-sm font-bold ${formData.checklist[item.id] ? 'text-emerald-700' : 'text-slate-600'}`}>{item.label}</span>
                        <input
                          type="checkbox"
                          checked={!!formData.checklist[item.id]}
                          onChange={() => setFormData(prev => ({ ...prev, checklist: { ...prev.checklist, [item.id]: !prev.checklist[item.id] } }))}
                          className="w-5 h-5 rounded-full text-emerald-600 border-slate-200 focus:ring-0"
                        />
                      </motion.label>
                    ))}
                  </div>
                </section>

                {/* Section: Report Content */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
                  <header className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">업무 요약 및 전달</label>
                  </header>
                  <input
                    name="summaryForBoss"
                    value={formData.summaryForBoss}
                    onChange={handleInputChange}
                    placeholder="사장님께 드릴 한 줄 요약"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300"
                  />
                  <textarea
                    name="issues"
                    value={formData.issues}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="추가 특이사항 (선택)"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none resize-none transition-all placeholder:text-slate-300"
                  />
                </section>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-70"
                >
                  {isSending ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full" />
                  ) : (
                    <>보고서 제출하기 <Send className="w-5 h-5" /></>
                  )}
                </button>
              </motion.form>
            )}

            {viewMode === 'success' && (
              <motion.div
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-indigo-100 border border-slate-100 text-center"
              >
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">전송 성공!</h2>
                <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed">데이터가 안정적으로 저장되었습니다.<br />슬랙 자동 발송이 진행 중입니다.</p>
                <button
                  onClick={() => setViewMode('form')}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  확인
                </button>
              </motion.div>
            )}

            {viewMode === 'history' && (
              <motion.div
                key="history"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {reports.map((report) => (
                  <motion.div
                    key={report.id}
                    variants={itemVariants}
                    className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-50 flex items-center justify-between hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <ClipboardCheck className="w-6 h-6 text-slate-300 group-hover:text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{report.reporter_name} - {report.shift_stage}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{report.date} {report.timestamp}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-300 transition-all" />
                  </motion.div>
                ))}
                {reports.length === 0 && (
                  <div className="text-center py-20 text-slate-300 font-black">기록된 보고서가 없습니다.</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {user && (
          <footer className="mt-16 flex flex-col items-center">
            <div className="flex items-center gap-4 mb-4">
              <img src={user.photoURL || ''} alt="profile" className="w-8 h-8 rounded-full border border-slate-200" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.displayName} 로그인 중</span>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1">
              <LogOut className="w-3 h-3" /> 로그아웃
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default App;
