import { useEffect } from 'react';
import { useAuthStore } from '@/auth/authStore';
import type { FontFamilyMeta } from '@/auth/authStore';

export function useFonts(): {
  families: FontFamilyMeta[];
  fontsLoading: boolean;
} {
  const families = useAuthStore((s) => s.fonts);
  const fontsLoading = useAuthStore((s) => s.fontsLoading);
  const ensureFontsLoaded = useAuthStore((s) => s.ensureFontsLoaded);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    void ensureFontsLoaded();
  }, [token, families, ensureFontsLoaded]);

  return { families, fontsLoading };
}
