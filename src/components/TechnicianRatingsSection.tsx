import { useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { Star, MessageSquare, Award, CheckCircle2 } from "lucide-react";

export function TechnicianRatingsSection({ technicianName }: { technicianName: string }) {
  const { serviceRecords, equipment } = useOperationsStore();
  const { data: ratingsData, isLoading } = trpc.seedRatings.list.useQuery();

  const stats = useMemo(() => {
    // Get completed jobs for THIS technician
    const completedJobs = serviceRecords.filter(r => r.technician === technicianName && r.status === "completed");
    
    // Get ratings for THIS technician
    const techRatings = ratingsData?.ratings?.filter((r: any) => r.technician === technicianName) || [];
    
    let sum = 0;
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    techRatings.forEach((r: any) => {
      sum += r.rating;
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating] += 1;
      }
    });

    const avg = techRatings.length > 0 ? sum / techRatings.length : 0;

    return {
      totalJobs: completedJobs.length,
      totalRatings: techRatings.length,
      averageRating: avg,
      distribution,
      recentFeedback: [...techRatings].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
    };
  }, [serviceRecords, ratingsData, technicianName]);

  if (isLoading) {
    return (
      <div className="data-card p-4 h-[300px] flex items-center justify-center">
         <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#66B2B2] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="data-card border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Left side: Stats summary */}
      <div className="p-6 bg-gradient-to-br from-[#66B2B2]/5 to-transparent border-b md:border-b-0 md:border-r border-gray-100 md:w-1/3 flex flex-col justify-center items-center text-center">
        <h3 className="text-base font-bold text-gray-900 mb-6 w-full text-left flex items-center gap-2">
          <Award className="w-5 h-5 text-[#66B2B2]" />
          Performance Rating
        </h3>
        
        <div className="text-5xl font-black text-gray-900 mb-2 font-mono-tech tracking-tighter">
          {stats.averageRating.toFixed(1)}
        </div>
        
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${star <= Math.round(stats.averageRating) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
            />
          ))}
        </div>
        
        <p className="text-xs text-gray-500 font-bold mb-6">
          Based on {stats.totalRatings} client {stats.totalRatings === 1 ? 'review' : 'reviews'}
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
           <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
             <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Completed</div>
             <div className="text-xl font-black text-green-600 flex items-center justify-center gap-1.5">
               <CheckCircle2 className="w-4 h-4" />
               {stats.totalJobs}
             </div>
           </div>
           <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
             <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Reviewed</div>
             <div className="text-xl font-black text-blue-600 flex items-center justify-center gap-1.5">
               <MessageSquare className="w-4 h-4" />
               {stats.totalRatings}
             </div>
           </div>
        </div>
      </div>

      {/* Middle: Distribution */}
      <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100 md:w-1/3 flex flex-col justify-center">
        <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Rating Distribution</h4>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star];
            const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-xs font-bold text-gray-600">
                <div className="flex items-center gap-1 w-12 shrink-0">
                  <span>{star}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${star >= 4 ? 'bg-[#66B2B2]' : star === 3 ? 'bg-amber-400' : 'bg-red-400'}`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-8 text-right text-gray-400 font-mono-tech">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Recent Feedback */}
      <div className="p-6 md:w-1/3 flex flex-col h-[300px]">
        <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4 flex items-center justify-between">
          <span>Recent Feedback</span>
          {stats.recentFeedback.length > 0 && <span className="text-[#66B2B2]">{stats.recentFeedback.length} latest</span>}
        </h4>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
          {stats.recentFeedback.length > 0 ? (
            stats.recentFeedback.map((feedback: any) => {
              const record = serviceRecords.find(r => r.id === feedback.serviceRecordId);
              const equip = record ? equipment.find(e => e.id === record.equipmentId) : null;
              const equipName = equip?.name || record?.equipmentId || 'Unknown Equipment';

              return (
                <div key={feedback.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-2.5 h-2.5 ${i < feedback.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                      ))}
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Job #{String(feedback.serviceRecordId).slice(-4)}</span>
                  </div>
                  
                  <p className="text-xs text-gray-800 italic leading-relaxed break-words border-l-2 border-amber-200 pl-2">
                    "{feedback.comments}"
                  </p>

                  <div className="text-[10px] text-gray-500 bg-white p-2 rounded-lg border border-gray-100 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Equipment:</span>
                      <span className="font-medium text-gray-700 truncate max-w-[120px]">{equipName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service Type:</span>
                      <span className="font-medium text-gray-700">{record?.serviceCategory || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completed On:</span>
                      <span>{record ? new Date(record.completedDate || record.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reviewed On:</span>
                      <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 mt-1 border-t border-gray-50">
                      <span className="text-gray-400">Client:</span>
                      <span className="font-mono-tech text-[9px] text-gray-400">{feedback.clientId}</span>
                    </div>
                  </div>

                  {feedback.suggestions && (
                    <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100/50 mt-2">
                      <span className="font-bold mr-1">Concern:</span>
                      {feedback.suggestions}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <MessageSquare className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-xs text-gray-400 font-medium">No client feedback received yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
