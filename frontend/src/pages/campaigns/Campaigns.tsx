import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import EmailTemplate from '@/pages/email-template/EmailTemplate';
import type { Campaign, CampaignCreateInput, CampaignUpdateInput } from '@/schema/campaign';
import { useAppDispatch } from '@/app/hook';
import { createCampaignApi, getCampaignsApi, updateCampaignApi, deleteCampaignByIdApi } from '@/features/campaign/campaignApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MoreVertical, FileText, Calendar, Send, Edit } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import RenameModal from '@/components/RenameModal';

const Campaigns = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [, setIsCreatingNew] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedCampaignForAction, setSelectedCampaignForAction] = useState<Campaign | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Determine if we're on edit/create route immediately
  const isEditRoute = location.pathname.startsWith('/campaigns/') && !!id;

  useEffect(() => {
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
      setSelectedCampaign(null);
      setIsCreatingNew(false);
    }
  }, [id, campaigns]);

  const handleCreateCampaign = () => {
    navigate('/campaigns/new');
  };

  const handleCampaignClick = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleBackToCampaigns = () => {
    navigate('/campaigns');
  };

  const handleCreateCampaignSubmit = async (
    newCampaign: CampaignCreateInput,
    options?: { redirect?: boolean }
  ) => {
    try {
      const res = await dispatch(createCampaignApi(newCampaign)).unwrap();
      setCampaigns(prev => [res, ...prev]);
      if (options?.redirect !== false) {
        navigate('/campaigns');
      }
      return res;
    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw error;
    }
  };

  const handleUpdateCampaign = async (
    updatedCampaign: CampaignUpdateInput,
    options?: { redirect?: boolean }
  ) => {
    try {
      const res = await dispatch(updateCampaignApi(updatedCampaign)).unwrap();
      setCampaigns(prev => prev.map(c =>
        c._id === updatedCampaign._id ? res : c
      ));
      if (options?.redirect !== false) {
        navigate('/campaigns');
      }
      return res;
    } catch (error) {
      console.error('Failed to update campaign:', error);
      throw error;
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const duplicatedCampaign: CampaignCreateInput = {
        name: `${campaign.name} (Copy)`,
        subject: campaign.subject,
        content: campaign.content,
        recipients: campaign.recipients
      };
      const res = await dispatch(createCampaignApi(duplicatedCampaign)).unwrap();
      setCampaigns([res, ...campaigns]);
    } catch (error) {
      console.error('Failed to duplicate campaign:', error);
    }
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setSelectedCampaignForAction(campaign);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCampaignForAction) return;

    setIsActionLoading(true);
    try {
      await dispatch(deleteCampaignByIdApi({ id: selectedCampaignForAction._id })).unwrap();
      setCampaigns(campaigns.filter(c => c._id !== selectedCampaignForAction._id));
      setShowDeleteModal(false);
      setSelectedCampaignForAction(null);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRenameClick = (campaign: Campaign) => {
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
      setShowRenameModal(false);
      setSelectedCampaignForAction(null);
    } catch (error) {
      console.error('Failed to rename campaign:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter campaigns by search query
  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  // Calculate statistics
  const stats = {
    total: campaigns.length,
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    sent: campaigns.filter((c) => c.status === 'sent').length,
    drafts: campaigns.filter((c) => !c.status || c.status === 'draft').length,
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-600 hover:bg-green-600 dark:bg-green-700">Sent</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-600 hover:bg-blue-600 dark:bg-blue-700">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  // If on edit/create route, render EmailTemplate
  if (isEditRoute) {
    // Wait for campaign data before rendering (except for new campaigns)
    if (id !== 'new' && !selectedCampaign) {
      return null;
    }
    return (
      <EmailTemplate
        campaign={selectedCampaign}
        onBack={handleBackToCampaigns}
        onCreate={handleCreateCampaignSubmit}
        onUpdate={handleUpdateCampaign}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Button onClick={handleCreateCampaign}>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drafts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-[70px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading campaigns...
                  </TableCell>
                </TableRow>
              ) : currentCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No campaigns found' : 'No campaigns yet. Create your first campaign!'}
                  </TableCell>
                </TableRow>
              ) : (
                currentCampaigns.map((campaign) => (
                  <TableRow
                    key={campaign._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCampaignClick(campaign._id)}
                  >
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>{campaign.recipients?.length ?? 0}</TableCell>
                    <TableCell>{campaign.createdAt}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRenameClick(campaign)}>
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign)}>
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(campaign)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${selectedCampaignForAction?.name}"? This action cannot be undone.`}
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
