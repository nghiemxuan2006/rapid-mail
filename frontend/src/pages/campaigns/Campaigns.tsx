import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styles from './Campaigns.module.scss';
import EmailTemplate from '@/pages/email-template/EmailTemplate';
import type { Campaign, CampaignCreateInput } from '@/schema/campaign';
import { useAppDispatch } from '@/app/hook';
import { createCampaignApi, getCampaignsApi, updateCampaignApi, deleteCampaignByIdApi } from '@/features/campaign/campaignApi';
import { DuplicateIcon, EditIcon, TrashIcon, EllipsisVerticalIcon } from '@/assets/icons';
import ConfirmModal from '@/components/ConfirmModal';
import RenameModal from '@/components/RenameModal';

const Campaigns = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [selectedCampaignForAction, setSelectedCampaignForAction] = useState<Campaign | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Determine if we're on edit/create route immediately
    const isEditRoute = location.pathname.startsWith('/campaigns/') && !!id;

    useEffect(() => {
        // Fetch campaigns from API or use mock data
        const fetchCampaigns = async () => {
            setIsLoading(true);
            try {
                const res = await dispatch(getCampaignsApi()).unwrap();
                setCampaigns(res);
            } catch (error) {
                console.error('Failed to fetch campaigns:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCampaigns();
    }, []);

    // Handle URL params for editing
    useEffect(() => {
        if (id && id === 'new') {
            setSelectedCampaign(null);
            setIsCreatingNew(true);
        } else if (id && campaigns.length > 0) {
            const campaign = campaigns.find(c => c._id === id);
            if (campaign) {
                setSelectedCampaign(campaign);
                setIsCreatingNew(false);
            }
        } else if (!id) {
            // Reset state when navigating back to list
            setSelectedCampaign(null);
            setIsCreatingNew(false);
        }
    }, [id, campaigns]);

    // Close dropdown menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-menu-container]')) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openMenuId]);

    const handleCreateCampaign = () => {
        navigate('/campaigns/new');
    };

    const handleCampaignClick = (campaignId: string) => {
        navigate(`/campaigns/${campaignId}`);
    };

    const handleBackToCampaigns = () => {
        navigate('/campaigns');
    };

    const handleCreateCampaignSubmit = async (newCampaign: CampaignCreateInput) => {
        try {
            const res = await dispatch(createCampaignApi(newCampaign)).unwrap();
            setCampaigns([res, ...campaigns]);
            console.log('Campaign created:', newCampaign);
            navigate('/campaigns');
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
            console.log('Campaign updated:', updatedCampaign);
            navigate('/campaigns');
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

    const handleDeleteClick = (campaign: Campaign, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event
        setSelectedCampaignForAction(campaign);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedCampaignForAction) return;

        setIsActionLoading(true);
        try {
            await dispatch(deleteCampaignByIdApi({ id: selectedCampaignForAction._id })).unwrap();
            setCampaigns(campaigns.filter(c => c._id !== selectedCampaignForAction._id));
            console.log('Campaign deleted:', selectedCampaignForAction);
            setShowDeleteModal(false);
            setSelectedCampaignForAction(null);
        } catch (error) {
            console.error('Failed to delete campaign:', error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRenameClick = (campaign: Campaign, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event
        setSelectedCampaignForAction(campaign);
        setShowRenameModal(true);
    };

    const handleConfirmRename = async (newName: string) => {
        if (!selectedCampaignForAction) return;

        setIsActionLoading(true);
        try {
            const updatedCampaign = { ...selectedCampaignForAction, name: newName };
            await dispatch(updateCampaignApi(updatedCampaign)).unwrap();
            setCampaigns(campaigns.map(c =>
                c._id === selectedCampaignForAction._id ? updatedCampaign : c
            ));
            console.log('Campaign renamed:', updatedCampaign);
            setShowRenameModal(false);
            setSelectedCampaignForAction(null);
        } catch (error) {
            console.error('Failed to rename campaign:', error);
        } finally {
            setIsActionLoading(false);
        }
    };

    // If on edit/create route, render EmailTemplate immediately
    if (isEditRoute) {
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
                                <div className={styles.menuContainer} data-menu-container>
                                    <button
                                        className={styles.menuButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === campaign._id ? null : campaign._id);
                                        }}
                                        title="More actions"
                                    >
                                        <EllipsisVerticalIcon className={styles.menuButtonIcon} />
                                    </button>
                                    {openMenuId === campaign._id && (
                                        <div className={styles.dropdownMenu}>
                                            <button
                                                className={styles.menuItem}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRenameClick(campaign, e);
                                                    setOpenMenuId(null);
                                                }}
                                            >
                                                <EditIcon className={styles.menuIcon} />
                                                Đổi tên
                                            </button>
                                            <button
                                                className={styles.menuItem}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDuplicateCampaign(campaign, e);
                                                    setOpenMenuId(null);
                                                }}
                                            >
                                                <DuplicateIcon className={styles.menuIcon} />
                                                Sao chép
                                            </button>
                                            <button
                                                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(campaign, e);
                                                    setOpenMenuId(null);
                                                }}
                                            >
                                                <TrashIcon className={styles.menuIcon} />
                                                Xóa
                                            </button>
                                        </div>
                                    )}
                                </div>
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

            {/* Modals */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Xóa Campaign"
                message={`Bạn có chắc chắn muốn xóa campaign "${selectedCampaignForAction?.name}" không? Hành động này không thể hoàn tác.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setShowDeleteModal(false);
                    setSelectedCampaignForAction(null);
                }}
                isLoading={isActionLoading}
            />
            <RenameModal
                isOpen={showRenameModal}
                currentName={selectedCampaignForAction?.name || ''}
                onSave={handleConfirmRename}
                onCancel={() => {
                    setShowRenameModal(false);
                    setSelectedCampaignForAction(null);
                }}
                isLoading={isActionLoading}
            />
        </div>
    );
};

export default Campaigns;
