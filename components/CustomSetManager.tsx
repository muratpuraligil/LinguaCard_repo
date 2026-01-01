
import React, { useState, useMemo, useEffect } from 'react';
import { Word } from '../types';
import { ArrowLeft, Plus, Play, Layers, Image, CheckCircle2, CircleDashed, RotateCcw, Trophy, Loader2, Pencil, Trash2, Info, Calendar, Sparkles } from 'lucide-react';
import { wordService } from '../services/supabaseClient';

interface CustomSetManagerProps {
  words: Word[];
  onExit: () => void;
  onPlaySet: (setWords: Word[]) => void;
  onUploadNewSet: (setName: string) => void;
  onRefresh: () => Promise<void>;
  onRenameCustomSetLocally: (oldName: string, newName: string) => void;
}

type SetStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

interface SetInfo {
    name: string;
    words: Word[];
    total: number;
    completed: number;
    percent: number;
    status: SetStatus;
    createdAt: string;
}

const CustomSetManager: React.FC<CustomSetManagerProps> = ({ words, onExit, onPlaySet, onUploadNewSet, onRefresh, onRenameCustomSetLocally }) => {
  const [showInput, setShowInput] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  
  const [editingSet, setEditingSet] = useState<{oldName: string, newName: string} | null>(null);
  const [setToDelete, setSetToDelete] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Setleri grupla ve istatistiklerini hesapla
  const allSets = useMemo(() => {
    const grouped: Record<string, Word[]> = {};
    words.forEach(w => {
        if (w.set_name) {
            if (!grouped[w.set_name]) grouped[w.set_name] = [];
            grouped[w.set_name].push(w);
        }
    });

    return Object.entries(grouped).map(([name, setWords]) => {
        const storageKey = `lingua_set_progress_${name.replace(/\s+/g, '_')}`;
        const saved = localStorage.getItem(storageKey);
        let completed = 0;
        if (saved) {
            const progressData = JSON.parse(saved);
            completed = Object.values(progressData).filter((p: any) => p?.status === 'CORRECT').length;
        }

        const total = setWords.length;
        const percent = Math.round((completed / total) * 100);
        let status: SetStatus = 'NOT_STARTED';
        if (completed === 0) status = 'NOT_STARTED';
        else if (completed >= total) status = 'COMPLETED';
        else status = 'IN_PROGRESS';

        const createdAt = setWords[0]?.created_at || new Date().toISOString();

        return { name, words: setWords, total, completed, percent, status, createdAt } as SetInfo;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [words]);

  const ongoingSets = allSets.filter(s => s.status !== 'COMPLETED');
  const completedSets = allSets.filter(s => s.status === 'COMPLETED');

  const handleCreateClick = () => {
      if (!newSetName.trim()) return;
      onUploadNewSet(newSetName.trim());
      setNewSetName('');
      setShowInput(false);
  };

  const handleRename = async () => {
      if (!editingSet || !editingSet.newName.trim() || isProcessing) return;
      
      setIsProcessing(true);
      try {
          const oldName = editingSet.oldName;
          const newName = editingSet.newName.trim();
          
          if (oldName === newName) {
              setEditingSet(null);
              setIsProcessing(false);
              return;
          }

          // 1. Veritabanını güncelle
          await wordService.renameCustomSet(oldName, newName);
          
          // 2. State'i anında güncelle (Optimistic Update)
          onRenameCustomSetLocally(oldName, newName);
          
          // 3. İlerlemeyi (localStorage) yeni isme taşı
          const oldStorageKey = `lingua_set_progress_${oldName.replace(/\s+/g, '_')}`;
          const newStorageKey = `lingua_set_progress_${newName.replace(/\s+/g, '_')}`;
          const savedProgress = localStorage.getItem(oldStorageKey);
          
          if (savedProgress) {
              localStorage.setItem(newStorageKey, savedProgress);
              localStorage.removeItem(oldStorageKey);
          }
          
          // KİLİT NOKTA: Modal'ı hemen kapat, onRefresh arkada çalışsın.
          // Bu, arayüzün "Kaydediliyor..." durumunda takılı kalmasını engeller.
          setEditingSet(null); 
          
          // 4. Verileri Supabase'den tazeleyelim (await etmeye gerek yok, UI zaten güncellendi)
          onRefresh();
      } catch (err) {
          console.error("Rename failed", err);
          alert("Set ismi güncellenirken bir hata oluştu.");
      } finally {
          // Eğer hata olursa ve modal kapanmamışsa loading'i durdur.
          // Başarılı durumda modal kapandığı için bu etki etmez.
          if (editingSet) setIsProcessing(false);
      }
  };

  const handleDelete = async () => {
      if (!setToDelete || isProcessing) return;
      setIsProcessing(true);
      try {
          await wordService.deleteCustomSet(setToDelete);
          localStorage.removeItem(`lingua_set_progress_${setToDelete.replace(/\s+/g, '_')}`);
          setSetToDelete(null);
          await onRefresh();
      } catch (err) {
          console.error("Delete failed", err);
          alert("Set silinirken bir hata oluştu.");
      } finally {
          setIsProcessing(false);
      }
  };

  const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const SetCard: React.FC<{ set: SetInfo }> = ({ set }) => {
    const isSampleSet = set.name === 'am-is-are';

    let statusConfig = {
        color: "text-slate-400",
        bgColor: "bg-zinc-800",
        borderColor: "border-slate-600",
        icon: <CircleDashed size={14} />,
        label: "Başlanmadı",
        btnIcon: <Play size={18} fill="currentColor" />,
        progressColor: "bg-slate-700"
    };

    if (set.status === 'IN_PROGRESS') {
        statusConfig = {
            color: "text-blue-400",
            bgColor: "bg-blue-900/20",
            borderColor: "border-blue-500/30",
            icon: <Loader2 size={14} className="animate-spin" />,
            label: "Devam Ediyor",
            btnIcon: <Play size={18} fill="currentColor" />,
            progressColor: "bg-blue-500"
        };
    } else if (set.status === 'COMPLETED') {
        statusConfig = {
            color: "text-emerald-400",
            bgColor: "bg-emerald-900/20",
            borderColor: "border-emerald-500/30",
            icon: <CheckCircle2 size={14} />,
            label: "Tamamlandı",
            btnIcon: <RotateCcw size={18} />,
            progressColor: "bg-emerald-500"
        };
    }

    return (
        <div className={`bg-zinc-900 border border-white/5 rounded-[32px] p-6 flex flex-col justify-between group transition-all relative overflow-hidden h-[340px] hover:bg-zinc-800 hover:border-white/10 shadow-xl ${isSampleSet ? 'ring-2 ring-yellow-500/20' : ''}`}>
            
            {isSampleSet && (
                <div className="absolute top-4 right-4 z-10 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1 shadow-lg backdrop-blur-sm">
                    <Sparkles size={10} fill="currentColor" />
                    <span>ÖRNEK SET</span>
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
                    {statusConfig.icon}
                    <span>{statusConfig.label}</span>
                </div>
                
                {/* Örnek set için silme/düzenleme butonlarını gizle veya sadece silmeyi engelle */}
                {!isSampleSet && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEditingSet({oldName: set.name, newName: set.name}); }}
                            className="p-2 bg-white/5 text-slate-400 hover:text-blue-400 rounded-xl transition-all"
                        >
                            <Pencil size={16} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSetToDelete(set.name); }}
                            className="p-2 bg-white/5 text-slate-400 hover:text-red-400 rounded-xl transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
            <div className="mb-4 flex-1">
                <h3 className="text-xl font-black text-white mb-1 leading-tight group-hover:text-blue-400 transition-colors tracking-tight line-clamp-2">
                  {set.name}
                </h3>
                <div className="flex items-center gap-1.5 text-slate-600 text-[10px] font-bold">
                    <Calendar size={12} />
                    <span>{formatDate(set.createdAt)}</span>
                </div>
                <p className="text-slate-500 text-xs font-medium mt-3 leading-relaxed line-clamp-2 italic">
                    {set.words[0]?.example_sentence || "Cümle seti içeriği..."}
                </p>
            </div>
            <div className="mt-auto">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-2xl font-black text-white tracking-tighter">{set.completed}<span className="text-xs text-slate-600 font-bold">/{set.total}</span></span>
                    <span className={`text-xs font-black ${statusConfig.color}`}>{set.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden mb-5">
                    <div className={`h-full ${statusConfig.progressColor} transition-all duration-700`} style={{ width: `${set.percent}%` }}></div>
                </div>
                <button 
                  onClick={() => onPlaySet(set.words)}
                  className={`w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-xs shadow-lg
                      ${set.status === 'COMPLETED' 
                          ? 'bg-zinc-950 text-white border border-white/5' 
                          : 'bg-white text-black hover:bg-blue-50'}
                  `}
                >
                    {statusConfig.btnIcon}
                    {set.status === 'COMPLETED' ? 'Tekrar Et' : 'Çalışmaya Başla'}
                </button>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans'] p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-[1400px]">
        <div className="flex items-center gap-6 mb-12">
            <button onClick={onExit} className="p-4 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all border border-white/5 group shadow-lg">
                <ArrowLeft size={24} className="text-slate-400" />
            </button>
            <div>
                <h1 className="text-4xl font-black mb-2 tracking-tight">Özel Cümle Setleri</h1>
                <p className="text-slate-500 font-bold text-lg">Çeviri çalışmaları için örnek cümleler ile alıştırma yap...</p>
            </div>
        </div>

        <div className="mb-16">
            <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                Devam Eden Çalışmalar
                <div className="h-px bg-blue-500/20 flex-1"></div>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-0.5 flex flex-col relative overflow-hidden group h-[340px] shadow-2xl hover:scale-[1.02] transition-transform duration-300">
                    <div className="bg-black/20 backdrop-blur-sm w-full h-full rounded-[30px] p-6 flex flex-col items-center justify-center relative z-10 text-center">
                        {!showInput ? (
                            <div className="flex flex-col items-center w-full">
                                <div onClick={() => setShowInput(true)} className="w-16 h-16 bg-white text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl cursor-pointer hover:rotate-90 transition-transform">
                                    <Plus size={32} strokeWidth={4} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-1">Yeni Set</h3>
                                <p className="text-blue-100 text-xs font-bold mb-8 opacity-70">Cümleleri resim ile aktar.</p>
                                <button onClick={() => setShowInput(true)} className="w-full py-4 bg-white text-blue-900 rounded-xl font-black hover:bg-blue-50 transition-all text-sm mb-4">Başla</button>
                                <div className="text-blue-200/60 text-xs font-bold text-center mt-2">
                                    <span>Cümlelerden oluşan resimler ile çalışma setleri oluştur.</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full animate-fadeIn">
                                <h3 className="text-xl font-black text-white mb-6">Setine İsim Ver</h3>
                                <input 
                                  autoFocus
                                  value={newSetName}
                                  onChange={(e) => setNewSetName(e.target.value)}
                                  placeholder="Örn: Prepositions"
                                  className="w-full bg-black/40 border border-white/20 rounded-xl p-4 text-center font-bold text-white placeholder:text-white/30 mb-6 outline-none focus:border-white transition-all"
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setShowInput(false)} className="flex-1 py-3 bg-white/10 rounded-xl font-bold text-xs">İptal</button>
                                    <button onClick={handleCreateClick} className="flex-1 py-3 bg-white text-blue-900 rounded-xl font-bold text-xs">Oluştur</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {ongoingSets.map(set => <SetCard key={set.name} set={set} />)}
            </div>
        </div>

        <div className="mb-20">
            <h2 className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                Tamamlanan Çalışmalar
                <Trophy size={14} />
                <div className="h-px bg-emerald-500/20 flex-1"></div>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                {completedSets.length > 0 ? (
                    completedSets.map(set => <SetCard key={set.name} set={set} />)
                ) : (
                    <div className="col-span-full text-center py-10 border border-dashed border-white/10 rounded-3xl bg-zinc-900/50 text-slate-500 font-bold text-sm">
                        Henüz tamamlanan bir set bulunmuyor.
                    </div>
                )}
            </div>
        </div>

        {editingSet && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[10002] flex items-center justify-center p-4">
                <div className="bg-zinc-900 w-full max-w-sm rounded-[40px] p-8 border border-white/10 shadow-2xl">
                    <h3 className="text-2xl font-black mb-6">Set İsmini Düzenle</h3>
                    <input 
                        autoFocus
                        value={editingSet.newName}
                        onChange={(e) => setEditingSet({...editingSet, newName: e.target.value})}
                        disabled={isProcessing}
                        className="w-full bg-black border border-white/10 rounded-2xl p-4 font-bold mb-8 outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                    <div className="flex gap-4">
                        <button onClick={() => setEditingSet(null)} disabled={isProcessing} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-bold disabled:opacity-50">İptal</button>
                        <button onClick={handleRename} disabled={isProcessing} className="flex-1 py-4 bg-blue-600 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                            {isProcessing && <Loader2 size={18} className="animate-spin" />}
                            {isProcessing ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {setToDelete && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[10002] flex items-center justify-center p-4">
                <div className="bg-zinc-900 w-full max-w-sm rounded-[40px] p-8 border border-white/10 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-black mb-2">Seti Sil?</h3>
                    <p className="text-slate-500 text-sm font-bold mb-8">"{setToDelete}" içindeki tüm cümleler silinecek. Bu işlem geri alınamaz.</p>
                    <div className="flex gap-4">
                        <button onClick={() => setSetToDelete(null)} disabled={isProcessing} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-bold">Vazgeç</button>
                        <button onClick={handleDelete} disabled={isProcessing} className="flex-1 py-4 bg-red-600 rounded-2xl font-bold flex items-center justify-center gap-2">
                            {isProcessing && <Loader2 size={18} className="animate-spin" />}
                            Evet, Sil
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CustomSetManager;
