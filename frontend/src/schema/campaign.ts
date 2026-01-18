export interface Recipient {
    id: string;
    Email: string;
    [key: string]: string;
}
export interface Campaign {
    _id: string;
    name: string;
    subject: string;
    content: string;
    // status: 'draft' | 'sent' | 'scheduled';
    recipients: Recipient[];
    createdAt: string;
    updatedAt: string;
}

export type CampaignCreateInput = Omit<Campaign, '_id' | 'createdAt' | 'updatedAt'>;