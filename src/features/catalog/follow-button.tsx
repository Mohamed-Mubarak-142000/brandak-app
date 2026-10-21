import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck, UserPlus } from 'lucide-react-native';

import { api, errorMessage } from '@/api/client';
import { useSession } from '@/auth/session';
import { useIsSeller, useRequireAuth } from '@/auth/use-auth';
import { haptic } from '@/lib/haptics';
import { Button, toast } from '@/ui';

type FollowState = { following: boolean; followers: number };

/** Follow a store: its new products and sales show up in notifications and the following feed. */
export function FollowButton({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const authed = useSession((s) => s.status === 'authed');
  const seller = useIsSeller();
  const requireAuth = useRequireAuth();
  const key = ['follow', brandId, authed];
  const state = useQuery({ queryKey: key, queryFn: () => api.get<FollowState>(`/brands/${brandId}/follow`) });

  const toggle = useMutation({
    mutationFn: (on: boolean) => (on ? api.post<FollowState>(`/brands/${brandId}/follow`) : api.del<FollowState>(`/brands/${brandId}/follow`)),
    onSuccess: (next, on) => {
      haptic.success();
      qc.setQueryData(key, next);
      qc.invalidateQueries({ queryKey: ['following'] });
      if (on) toast.success('هيوصلك جديد المتجر وعروضه');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (seller) return null;
  const on = !!state.data?.following;
  const count = state.data?.followers ?? 0;
  return (
    <Button
      label={`${on ? 'بتتابعه' : 'تابع المتجر'}${count ? ` · ${count}` : ''}`}
      icon={on ? UserCheck : UserPlus}
      variant={on ? 'soft' : 'primary'}
      size="md"
      block={false}
      loading={toggle.isPending}
      onPress={() => requireAuth('سجّل عشان تتابع المتجر.', () => toggle.mutate(!on))}
    />
  );
}
