import { useMemo } from "react";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { trpc } from "@/providers/trpc";
import { Trophy, Medal, Star, ShieldCheck } from "lucide-react";

export function TechnicianLeaderboard() {
  const { serviceRecords } = useOperationsStore();
  const { data: ratingsData, isLoading } = trpc.seedRatings.list.useQuery();

  const leaderboard = useMemo(() => {
    // 1. Group completed service records by technician to get total completed jobs and safety score
    const techStats: Record<string, { name: string; jobs: number; safetyScore: number; safetyCount: number; ratingsSum: number; ratingsCount: number }> = {};

    serviceRecords.forEach((record) => {
      if (record.status !== "completed" || !record.technician || record.technician === "Unassigned" || record.technician === "Pending Assignment") {
        return;
      }
      if (!techStats[record.technician]) {
        techStats[record.technician] = { name: record.technician, jobs: 0, safetyScore: 0, safetyCount: 0, ratingsSum: 0, ratingsCount: 0 };
      }
      techStats[record.technician].jobs += 1;
      
      if (record.safetyChecklist) {
        techStats[record.technician].safetyCount += 1;
        let score = 0;
        if (record.safetyChecklist.ppeChecked) score += 25;
        if (record.safetyChecklist.engineOff) score += 25;
        if (record.safetyChecklist.areaSecured) score += 25;
        if (record.safetyChecklist.lotoApplied) score += 25;
        techStats[record.technician].safetyScore += score;
      }
    });

    // 2. Add ratings
    if (ratingsData?.ratings) {
      ratingsData.ratings.forEach((rating: any) => {
        if (!techStats[rating.technician]) {
           // It's possible a tech got a rating but isn't in local serviceRecords store yet if it wasn't fetched, but fallback
           techStats[rating.technician] = { name: rating.technician, jobs: 0, safetyScore: 0, safetyCount: 0, ratingsSum: 0, ratingsCount: 0 };
        }
        techStats[rating.technician].ratingsSum += rating.rating;
        techStats[rating.technician].ratingsCount += 1;
      });
    }

    // 3. Calculate final metrics and sort
    const techs = Object.values(techStats).map((tech) => {
      const avgRating = tech.ratingsCount > 0 ? tech.ratingsSum / tech.ratingsCount : 0;
      const avgSafety = tech.safetyCount > 0 ? tech.safetyScore / tech.safetyCount : 100;
      
      // Calculate a Power Score for tie breaking and absolute ranking: 
      // heavily weights average rating (if any) and total jobs completed.
      const ratingWeight = tech.ratingsCount > 0 ? avgRating * 20 : 60; // assume 3 stars if no ratings
      const powerScore = ratingWeight + Math.min(tech.jobs, 100) * 0.5;

      return {
        ...tech,
        avgRating,
        avgSafety,
        powerScore
      };
    });

    return techs.sort((a, b) => b.powerScore - a.powerScore);
  }, [serviceRecords, ratingsData]);

  if (isLoading) {
    return (
      <div className="data-card p-4 h-[300px] flex items-center justify-center">
         <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#66B2B2] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="data-card p-0 overflow-hidden bg-white border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Technician Leaderboard</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Ranked by overall performance</p>
          </div>
        </div>
        <div className="px-2.5 py-1 bg-[#66B2B2]/10 text-[#66B2B2] rounded-lg text-xs font-bold shadow-sm border border-[#66B2B2]/20">
          {leaderboard.length} Active Techs
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
              <th className="px-4 py-3 font-semibold text-center w-16">Rank</th>
              <th className="px-4 py-3 font-semibold">Technician</th>
              <th className="px-4 py-3 font-semibold">Avg Rating</th>
              <th className="px-4 py-3 font-semibold">Reviews</th>
              <th className="px-4 py-3 font-semibold">Completed Jobs</th>
              <th className="px-4 py-3 font-semibold text-right">Power Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaderboard.map((tech, index) => {
              const isTop3 = index < 3;
              return (
                <tr key={tech.name} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3 align-middle text-center">
                    {index === 0 ? (
                      <div className="flex justify-center"><Medal className="w-5 h-5 text-amber-500" /></div>
                    ) : index === 1 ? (
                      <div className="flex justify-center"><Medal className="w-5 h-5 text-gray-400" /></div>
                    ) : index === 2 ? (
                      <div className="flex justify-center"><Medal className="w-5 h-5 text-amber-700" /></div>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                        index === 0 ? 'bg-amber-500 text-white' : 
                        index === 1 ? 'bg-gray-400 text-white' : 
                        index === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">{tech.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-1.5">
                      <Star className={`w-4 h-4 ${tech.ratingsCount > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      <span className="font-bold text-gray-900">{tech.ratingsCount > 0 ? tech.avgRating.toFixed(1) : "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle text-gray-500 text-xs font-bold">
                    {tech.ratingsCount} {tech.ratingsCount === 1 ? 'review' : 'reviews'}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-md font-mono-tech text-xs font-bold">
                      {tech.jobs}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="font-black text-gray-900">{tech.powerScore.toFixed(0)}</div>
                    {tech.safetyCount > 0 && (
                      <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-gray-400 mt-0.5">
                        <ShieldCheck className="w-3 h-3 text-green-500" />
                        {tech.avgSafety.toFixed(0)}% Safety
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 italic">
                  No technician performance data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
