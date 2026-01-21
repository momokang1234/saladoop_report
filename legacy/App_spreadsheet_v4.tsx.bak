
import React, { useState, useRef, useEffect } from 'react';
import {
  ReporterName,
  ShiftStage,
  FormData,
  ReportSchema,
  BusyLevel,
  ViewMode
} from './types';

// 최신 배포된 Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2Ou_x2IwUrnkpADetI_52jciPlF4Q_AJIzDT9d6gmOOmWO3QNbX5M_Uap09HW1EA9/exec";

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

// 고화질 이미지 압축 함수 (GAS용 최적화)
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 가장 안정적인 1280px 해상도로 조정 (4장 전송 시에도 GAS 한도 10MB 절대 안넘음)
      const MAX_WIDTH = 1280;
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

      // JPEG 품질을 0.8로 설정 (용량 대비 선명도 최적화)
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    reporterName: ReporterName.KBK,
    shiftStage: ShiftStage.OPEN,
    busyLevel: '보통',
    issues: '',
    summaryForBoss: '',
    checklist: {},
    photos: [],
  });

  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [reports, setReports] = useState<ReportSchema[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportSchema | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('daily_reports_v5');
    if (saved) {
      try { setReports(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleShiftChange = (stage: ShiftStage) => {
    setFormData(prev => ({ ...prev, shiftStage: stage, photos: [], checklist: {} }));
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

    if (!formData.summaryForBoss.trim()) {
      alert("사장님 요약 내용은 필수입니다.");
      return;
    }

    const checkedCount = Object.values(formData.checklist).filter(v => v).length;
    if (checkedCount === 0) {
      if (!confirm("체크리스트가 하나도 선택되지 않았습니다. 이대로 제출하시겠습니까?")) {
        return;
      }
    }

    if (isSending) return;
    setIsSending(true);

    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
      const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });

      const currentItems = CHECKLIST_ITEMS[formData.shiftStage] || [];
      const checklistText = currentItems.map(item => {
        return `${formData.checklist[item.id] ? '●' : '○'} ${item.label}`;
      }).join('\n');

      const payload = {
        date: dateStr,
        time: timeStr,
        reporter: formData.reporterName,
        stage: formData.shiftStage,
        summary: formData.summaryForBoss,
        details: formData.issues,
        checklist: checklistText,
        photos: formData.photos.filter(p => typeof p === 'string' && p.startsWith('data:image'))
      };

      console.dir(payload); // '오픈' 단계 무반응 디버깅을 위해 콘솔에 페이로드 출력


      // 초고화질 전송을 위해 타임아웃 120초로 대폭 확장
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const jsonPayload = JSON.stringify(payload);
      console.log(`전송 페이로드 크기: ${(jsonPayload.length / 1024 / 1024).toFixed(2)} MB`);

      console.log("서버 전송 시작...");

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: 'no-cors',
        headers: { "Content-Type": "text/plain" },
        body: jsonPayload,
        signal: controller.signal
      });

      console.log("서버 응답 수신 완료 (opaque)");
      clearTimeout(timeoutId);

      const newReport: ReportSchema = {
        id: Date.now().toString(), // 호환성을 위해 UUID 대신 타임스탬프 사용
        date: dateStr,
        timestamp: timeStr,
        reporter_name: formData.reporterName,
        shift_stage: formData.shiftStage,
        has_photo: payload.photos.length > 0,
        photos: payload.photos,
        busy_level: formData.busyLevel,
        issues: formData.issues,
        checklist: { ...formData.checklist },
        summary_for_boss: formData.summaryForBoss,
      };

      const updatedReports = [newReport, ...reports];
      setReports(updatedReports);

      // 로컬 스토리지에 사진을 포함하면 용량 초과 에러가 발생하므로 텍스트 기록만 저장합니다.
      const storageReports = updatedReports.map(r => ({ ...r, photos: [] }));
      localStorage.setItem('daily_reports_v5', JSON.stringify(storageReports));

      setViewMode('success');
      setFormData({
        reporterName: ReporterName.KBK,
        shiftStage: ShiftStage.OPEN,
        busyLevel: '보통',
        issues: '',
        summaryForBoss: '',
        checklist: {},
        photos: [],
      });
    } catch (err: any) {
      console.error("전송 에러 상세:", err);
      alert(`[전송 실패 에러]\n${err?.message || err?.toString() || "알 수 없는 오류"}\n\n[주요 원인]\n1. 구글 서버 일시적 장애\n2. 앱스 스크립트 배포 문제\n3. 네트워크 차단`);
    } finally {
      setIsSending(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPhotoSlotCount = (stage: ShiftStage) => stage === ShiftStage.MIDDLE ? 4 : 1;

  return (
    <div className="max-w-md mx-auto px-4 py-8 min-h-screen flex flex-col font-sans bg-slate-50">
      {isSending && (
        <div className="fixed inset-0 z-[100] bg-indigo-950/70 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
          <p className="font-black text-white text-lg tracking-tight">고화질(2K) 데이터 전송 중...</p>
          <p className="text-white/60 text-xs mt-2 font-medium">서비스 한도 내 최적화된 고화질 처리 중입니다. (최대 30초 소요)</p>
        </div>
      )}


      <header className="mb-8 flex flex-col items-center sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-4 border-b border-slate-200/50">
        <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Saladoop Report</h1>
        <div className="mt-4 flex bg-slate-200/50 p-1.5 rounded-2xl w-full max-w-sm border border-slate-200 shadow-inner">
          <button onClick={() => setViewMode('form')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'form' || viewMode === 'success' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>작성하기</button>
          <button onClick={() => setViewMode('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'history' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>기록보기</button>
        </div>
      </header>

      <main className="flex-1 pb-10">
        {viewMode === 'form' && (
          <form onSubmit={handleSubmit} className="bg-white shadow-2xl shadow-indigo-100 rounded-[2.5rem] p-8 space-y-8 border border-slate-100">
            <section>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">1. 담당자 선택</label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Object.values(ReporterName).map(name => (
                  <button key={name} type="button" onClick={() => setFormData(prev => ({ ...prev, reporterName: name }))} className={`py-4 rounded-2xl font-black border-2 transition-all ${formData.reporterName === name ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-100 text-slate-300'}`}>{name}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(ShiftStage).map((stage) => (
                  <button key={stage} type="button" onClick={() => handleShiftChange(stage)} className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${formData.shiftStage === stage ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>{stage}</button>
                ))}
              </div>
            </section>

            <section>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">2. 초고화질 4K 사진 ({formData.shiftStage})</label>
              <div className={`grid ${getPhotoSlotCount(formData.shiftStage) > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {Array.from({ length: getPhotoSlotCount(formData.shiftStage) }).map((_, i) => (
                  <div key={i} onClick={() => fileInputRefs.current[i]?.click()} className="relative aspect-video rounded-[1.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100 transition-all shadow-sm">
                    {formData.photos[i] ? <img src={formData.photos[i]} alt="Preview" className="w-full h-full object-cover" /> : <div className="text-center"><span className="text-2xl text-slate-200">+</span><p className="text-[9px] text-slate-300 font-bold mt-1">4K 추가</p></div>}
                    <input type="file" ref={el => { fileInputRefs.current[i] = el; }} onChange={(e) => handleFileChange(e, i)} accept="image/*" capture="environment" className="hidden" />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9px] text-slate-400 font-medium">* 한 장당 약 3~5MB의 고화질로 전송됩니다.</p>
            </section>

            <section className="bg-slate-50/50 p-6 rounded-[2rem] space-y-3 border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase block tracking-widest mb-2">3. 필수 체크리스트</label>
              {CHECKLIST_ITEMS[formData.shiftStage].map((item) => (
                <label key={item.id} className="flex items-center space-x-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer active:scale-95 transition-all">
                  <input type="checkbox" checked={!!formData.checklist[item.id]} onChange={() => setFormData(prev => ({ ...prev, checklist: { ...prev.checklist, [item.id]: !prev.checklist[item.id] } }))} className="w-5 h-5 rounded-md text-indigo-600 border-slate-200 focus:ring-0" />
                  <span className="text-sm font-bold text-slate-700">{item.label}</span>
                </label>
              ))}
            </section>

            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">4. 업무 상세 보고</label>
              <input name="summaryForBoss" value={formData.summaryForBoss} onChange={handleInputChange} required placeholder="사장님께 드릴 한 줄 요약" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black focus:border-indigo-600 outline-none transition-all shadow-inner" />
              <textarea name="issues" value={formData.issues} onChange={handleInputChange} rows={3} placeholder="추가 전달사항 및 특이사항 (선택)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-600 outline-none resize-none transition-all shadow-inner" />
            </section>

            <button type="submit" disabled={isSending} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50">
              {isSending ? '초고화질 전송 중...' : '보고서 제출하기'}
            </button>
          </form>
        )}

        {viewMode === 'success' && (
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-500 text-3xl">✓</div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">전송 완료!</h2>
            <p className="text-slate-400 text-sm mb-10 font-bold leading-relaxed">기록이 시트에 안전하게 저장되었습니다.<br />오늘도 수고하셨습니다!</p>
            <button onClick={() => setViewMode('form')} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 transition-all">확인</button>
          </div>
        )}

        {viewMode === 'history' && (
          <div className="space-y-4">
            {Object.keys(reports.reduce((acc, r) => ({ ...acc, [r.date]: [] }), {} as any)).sort().reverse().map(date => (
              <div key={date} className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
                <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center"><span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>{date}</h3>
                <div className="space-y-2">
                  {reports.filter(r => r.date === date).map(report => (
                    <div key={report.id} onClick={() => setSelectedReport(report)} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group">
                      <span className="text-sm font-black text-slate-700 group-hover:text-indigo-700">{report.reporter_name} - {report.shift_stage}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{report.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {reports.length === 0 && <div className="text-center py-20 text-slate-300 font-black">최근 제출한 보고서가 없습니다.</div>}
          </div>
        )}
      </main>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="font-black text-indigo-950">보고 내역 상세</h2>
              <button onClick={() => setSelectedReport(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="bg-indigo-50/50 p-6 rounded-3xl border-l-4 border-indigo-500 shadow-inner">
                <p className="text-[10px] text-indigo-400 font-black mb-1 uppercase">사장님 요약</p>
                <p className="text-base font-black text-indigo-950 leading-tight tracking-tight">"{selectedReport.summary_for_boss}"</p>
              </div>

              {selectedReport.photos.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">제출 사진 (고화질)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReport.photos.map((p, i) => <img key={i} src={p} className="rounded-2xl w-full aspect-square object-cover border shadow-sm" alt="report" />)}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">상세 기록</p>
                <div className="text-sm text-slate-700 leading-relaxed font-bold bg-slate-50 p-5 rounded-2xl whitespace-pre-wrap">
                  {selectedReport.issues || "전달된 특이사항이 없습니다."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default App;
