import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/app/hook';
import { getCampaignsApi, getCampaignByIdApi } from '@/features/campaign/campaignApi';
import { updateCampaign as updateCampaignInStore } from '@/features/campaign/campaignSlice';
import type { Campaign } from '@/schema/campaign';

const POLL_INTERVAL_MS = 8000;

/**
 * Polls campaigns that are in 'sending' state.
 * mode 'list' — fetches full campaign list via GET /campaigns and replaces store (for campaign list page).
 * mode 'full' — fetches full campaign including email_jobs (for detail modal).
 *               Returns the latest Campaign via onUpdate callback.
 */
export function useSendingCampaignPolling(
    campaignIds: string[],
    mode: 'list' | 'full',
    options?: { onUpdate?: (campaign: Campaign) => void },
) {
    const dispatch = useAppDispatch();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activeIdsRef = useRef<string[]>(campaignIds);
    activeIdsRef.current = campaignIds;

    useEffect(() => {
        if (campaignIds.length === 0) return;

        const poll = async () => {
            if (activeIdsRef.current.length === 0) return;

            try {
                if (mode === 'list') {
                    await dispatch(getCampaignsApi());
                } else {
                    await Promise.all(
                        activeIdsRef.current.map(async (id) => {
                            try {
                                const action = await dispatch(getCampaignByIdApi({ id }));
                                if (getCampaignByIdApi.fulfilled.match(action) && action.payload) {
                                    dispatch(updateCampaignInStore(action.payload));
                                    options?.onUpdate?.(action.payload);
                                }
                            } catch {
                                // network errors are transient — silently skip this tick
                            }
                        }),
                    );
                }
            } catch {
                // network errors are transient — silently skip this tick
            }
        };

        poll();
        timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [campaignIds.join(','), mode]);
}
