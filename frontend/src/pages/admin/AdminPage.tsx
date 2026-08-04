import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UsersTab } from './UsersTab';
import { FeedbackTab } from './FeedbackTab';

type Tab = 'users' | 'feedback';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Admin</h1>
      <div className="mb-6 flex gap-2 border-b">
        <Button
          variant="ghost"
          className={tab === 'users' ? 'border-b-2 border-primary rounded-none' : 'rounded-none'}
          onClick={() => setTab('users')}
        >
          Users
        </Button>
        <Button
          variant="ghost"
          className={tab === 'feedback' ? 'border-b-2 border-primary rounded-none' : 'rounded-none'}
          onClick={() => setTab('feedback')}
        >
          Feedback
        </Button>
      </div>
      {tab === 'users' ? <UsersTab /> : <FeedbackTab />}
    </div>
  );
}
