// src/hooks/useSettings.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/api/settings";

export function useSettings() {
  const qc = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await getSettings();
      return data; // { id, sueldoMinimoMensual, recargoTarjetaPct, version }
    },
    staleTime: 5 * 60 * 1000,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await updateSettings(id, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] }); // refresca todos los que usan settings
    },
  });

  return { ...settingsQuery, update: update.mutateAsync };
}
