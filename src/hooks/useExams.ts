import { useState, useEffect, useCallback } from "react";
import * as examsApi from "@/lib/examsApi";
import type { ExamEntry } from "@/types/exam";

export function useExams(animalId?: string): {
  exams: ExamEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await examsApi.getExams(animalId);
    setExams(data);
    setLoading(false);
  }, [animalId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { exams, loading, refetch };
}
