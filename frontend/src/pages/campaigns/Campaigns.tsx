import { useState } from 'react';
import styles from './Campaigns.module.scss';
import EmailTemplate from '@/pages/email-template/EmailTemplate';

interface Campaign {
    id: string;
    name: string;
    subject: string;
    status: 'draft' | 'sent' | 'scheduled';
    recipientCount: number;
    createdAt: string;
}

const Campaigns = () => {
    const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([
        {
            id: '1',
            name: 'Welcome Email Campaign',
            subject: 'Welcome to RapidMail!',
            status: 'draft',
            recipientCount: 150,
            createdAt: '2026-01-15',
        },
        {
            id: '2',
            name: 'Product Launch Announcement',
            subject: 'Introducing Our New Product',
            status: 'sent',
            recipientCount: 320,
            createdAt: '2026-01-10',
        },
        {
            id: '3',
            name: 'Monthly Newsletter',
            subject: 'January Newsletter',
            status: 'scheduled',
            recipientCount: 500,
            createdAt: '2026-01-12',
        },
    ]);

    const handleCreateCampaign = () => {
        const newCampaign: Campaign = {
            id: Date.now().toString(),
            name: 'New Campaign',
            subject: 'Email Subject',
            status: 'draft',
            recipientCount: 0,
            createdAt: new Date().toISOString().split('T')[0],
        };
        setCampaigns([newCampaign, ...campaigns]);
        setSelectedCampaign(newCampaign.id);
    };

    const handleCampaignClick = (campaignId: string) => {
        setSelectedCampaign(campaignId);
    };

    const handleCloseCampaign = () => {
        setSelectedCampaign(null);
    };

    const getStatusBadgeClass = (status: Campaign['status']) => {
        switch (status) {
            case 'draft':
                return styles.statusDraft;
            case 'sent':
                return styles.statusSent;
            case 'scheduled':
                return styles.statusScheduled;
            default:
                return '';
        }
    };

    const getStatusText = (status: Campaign['status']) => {
        switch (status) {
            case 'draft':
                return 'Nháp';
            case 'sent':
                return 'Đã gửi';
            case 'scheduled':
                return 'Đã lên lịch';
            default:
                return status;
        }
    };

    if (selectedCampaign) {
        return (
            <div className={styles.campaignEditor}>
                {/* <button className={styles.backButton} onClick={handleCloseCampaign}>
                    ← Quay lại danh sách
                </button> */}
                <EmailTemplate />
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
                    campaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            className={styles.campaignCard}
                            onClick={() => handleCampaignClick(campaign.id)}
                        >
                            <div className={styles.campaignCardHeader}>
                                <h3>{campaign.name}</h3>
                                <span className={`${styles.statusBadge} ${getStatusBadgeClass(campaign.status)}`}>
                                    {getStatusText(campaign.status)}
                                </span>
                            </div>
                            <p className={styles.campaignSubject}>{campaign.subject}</p>
                            <div className={styles.campaignMeta}>
                                <span>👥 {campaign.recipientCount} người nhận</span>
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
