import { useEffect, useState } from 'react';
import styles from './Campaigns.module.scss';
import EmailTemplate from '@/pages/email-template/EmailTemplate';
import type { Campaign, CampaignCreateInput } from '@/schema/campaign';
import { useAppDispatch } from '@/app/hook';
import { createCampaignApi, getCampaignsApi, updateCampaignApi } from '@/features/campaign/campaignApi';
import { DuplicateIcon } from '@/assets/icons';

const Campaigns = () => {
    const dispatch = useAppDispatch();
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);

    useEffect(() => {
        // Fetch campaigns from API or use mock data
        const fetchCampaigns = async () => {
            try {
                const res = await dispatch(getCampaignsApi()).unwrap();
                setCampaigns(res);
            } catch (error) {
                console.error('Failed to fetch campaigns:', error);
            }
        };
        fetchCampaigns();
    }, []);

    const handleCreateCampaign = () => {
        setSelectedCampaign(null);
        setIsCreatingNew(true);
    };

    const handleCampaignClick = (campaignId: string) => {
        const campaign = campaigns.find(c => c._id === campaignId);
        if (campaign) {
            setSelectedCampaign(campaign);
            setIsCreatingNew(false);
        }
    };

    const handleBackToCampaigns = () => {
        setSelectedCampaign(null);
        setIsCreatingNew(false);
    };

    const handleCreateCampaignSubmit = async (newCampaign: CampaignCreateInput) => {
        try {
            const res = await dispatch(createCampaignApi(newCampaign)).unwrap();
            setCampaigns([res, ...campaigns]);
            setSelectedCampaign(null);
            setIsCreatingNew(false);
            console.log('Campaign created:', newCampaign);
        } catch (error) {
            console.error('Failed to create campaign:', error);
        }
    };

    const handleUpdateCampaign = async (updatedCampaign: Campaign) => {
        try {
            // TODO: Call API to update campaign
            await dispatch(updateCampaignApi(updatedCampaign)).unwrap();
            setCampaigns(campaigns.map(c =>
                c._id === updatedCampaign._id ? updatedCampaign : c
            ));
            setSelectedCampaign(null);
            setIsCreatingNew(false);
            console.log('Campaign updated:', updatedCampaign);
        } catch (error) {
            console.error('Failed to update campaign:', error);
        }
    };

    const handleDuplicateCampaign = async (campaign: Campaign, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event
        try {
            const duplicatedCampaign: CampaignCreateInput = {
                name: `${campaign.name} (Copy)`,
                subject: campaign.subject,
                content: campaign.content,
                recipients: campaign.recipients
            };
            const res = await dispatch(createCampaignApi(duplicatedCampaign)).unwrap();
            setCampaigns([res, ...campaigns]);
            console.log('Campaign duplicated:', res);
        } catch (error) {
            console.error('Failed to duplicate campaign:', error);
        }
    };

    if (selectedCampaign || isCreatingNew) {
        return (
            <div className={styles.campaignEditor}>
                <EmailTemplate
                    campaign={selectedCampaign}
                    onBack={handleBackToCampaigns}
                    onCreate={handleCreateCampaignSubmit}
                    onUpdate={handleUpdateCampaign}
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Campaigns</h1>
                <button className={styles.createButton} onClick={handleCreateCampaign}>
                    + Tạo Campaign
                </button>
            </div>

            <div className={styles.campaignList}>
                {campaigns.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Chưa có campaign nào. Tạo campaign đầu tiên của bạn!</p>
                    </div>
                ) : (
                    campaigns.map((campaign, index) => (
                        <div
                            key={campaign._id || `campaign-${index}`}
                            className={styles.campaignCard}
                            onClick={() => handleCampaignClick(campaign._id)}
                        >
                            <div className={styles.campaignCardHeader}>
                                <h3>{campaign.name}</h3>
                                <button
                                    className={styles.duplicateButton}
                                    onClick={(e) => handleDuplicateCampaign(campaign, e)}
                                    title="Duplicate campaign"
                                >
                                    <DuplicateIcon className={styles.duplicateIcon} />
                                </button>
                                {/* <span className={`${styles.statusBadge} ${getStatusBadgeClass(campaign.status)}`}>
                                    {getStatusText(campaign.status)}
                                </span> */}
                            </div>
                            <p className={styles.campaignSubject}>{campaign.subject}</p>
                            <div className={styles.campaignMeta}>
                                <span>👥 {campaign.recipients.length} người nhận</span>
                                <span>📅 {campaign.createdAt}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Campaigns;
