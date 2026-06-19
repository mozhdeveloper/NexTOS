import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Star, MessageSquare, AlertCircle, CheckCircle2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface TechnicianRatingFormProps {
  serviceRecordId: number;
  clientId: string | number;
  technician: string;
  canRate?: boolean;
}

export function TechnicianRatingForm({ serviceRecordId, clientId, technician, canRate }: TechnicianRatingFormProps) {
  const trpcUtils = trpc.useUtils();
  
  // Fetch existing ratings
  const { data: ratingsData, isLoading } = trpc.seedRatings.list.useQuery();
  
  // Find if this record has been rated already
  const existingRating = ratingsData?.ratings?.find(
    (r: any) => r.serviceRecordId === serviceRecordId
  );

  const addRatingMutation = trpc.seedRatings.add.useMutation({
    onSuccess: () => {
      trpcUtils.seedRatings.list.invalidate();
      toast.success("Feedback submitted successfully!", {
        description: `Thank you for rating ${technician}.`,
      });
    },
    onError: (err) => {
      toast.error("Failed to submit feedback", {
        description: err.message,
      });
    },
  });

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comments, setComments] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#66B2B2] border-t-transparent" />
      </div>
    );
  }

  // If already rated, show the submitted feedback in a premium details block
  if (existingRating) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50/20 p-5 mt-4 space-y-3 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h4 className="text-sm font-bold text-gray-950">Service Feedback Submitted</h4>
          </div>
          <span className="text-[10px] text-gray-400 font-mono-tech">
            {new Date(existingRating.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= existingRating.rating
                  ? "text-amber-400 fill-amber-400"
                  : "text-gray-200"
              }`}
            />
          ))}
          <span className="text-xs font-black text-gray-900 ml-1.5">{existingRating.rating} / 5 stars</span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-400 font-semibold block mb-0.5">Technician Rated</span>
            <span className="text-gray-900 font-bold">{existingRating.technician}</span>
          </div>

          {existingRating.comments && (
            <div className="rounded-lg bg-white/60 p-3 border border-gray-100">
              <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-wider block mb-1">
                Your Review
              </span>
              <p className="text-gray-800 italic leading-relaxed">"{existingRating.comments}"</p>
            </div>
          )}

          {existingRating.suggestions && (
            <div className="rounded-lg bg-white/60 p-3 border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block mb-1">
                Suggestions / Concerns
              </span>
              <p className="text-gray-600 leading-relaxed">{existingRating.suggestions}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!canRate) {
    return null;
  }

  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.warning("Rating Required", {
        description: "Please select a star rating between 1 and 5.",
      });
      return;
    }
    if (!comments.trim()) {
      toast.warning("Feedback Comments Required", {
        description: "Please share comments about the service quality.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addRatingMutation.mutateAsync({
        serviceRecordId,
        clientId,
        technician,
        rating,
        comments: comments.trim(),
        suggestions: suggestions.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-5 mt-4 space-y-4 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <Heart className="w-5 h-5 text-[#66B2B2] fill-[#66B2B2]/10" />
        <div>
          <h4 className="text-sm font-bold text-gray-950">Rate Service Quality</h4>
          <p className="text-[10px] text-gray-500">Provide feedback for technician {technician}</p>
        </div>
      </div>

      {/* Star Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">
          Technician Rating *
        </label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform active:scale-90 focus:outline-none"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= (hoverRating || rating)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-200 hover:text-amber-300"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-xs font-black text-gray-900 ml-2">
              {rating} star{rating > 1 ? "s" : ""} selected
            </span>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">
          Feedback / Comments *
        </label>
        <Textarea
          placeholder="How was the service? Was the technician polite and professional?"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="text-xs min-h-[70px] resize-none bg-slate-50 border-slate-100 focus:bg-white focus:border-[#66B2B2] rounded-lg transition-all"
        />
      </div>

      {/* Suggestions / Concerns */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">
          Additional Suggestions or Concerns (Optional)
        </label>
        <Textarea
          placeholder="Any other comments or things we could improve?"
          value={suggestions}
          onChange={(e) => setSuggestions(e.target.value)}
          className="text-xs min-h-[60px] resize-none bg-slate-50 border-slate-100 focus:bg-white focus:border-[#66B2B2] rounded-lg transition-all"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold h-9 text-xs rounded-xl shadow-sm"
      >
        {isSubmitting ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          "Submit Feedback"
        )}
      </Button>
    </form>
  );
}
