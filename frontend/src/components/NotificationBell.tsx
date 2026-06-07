import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReplies } from '@/hooks/useReplies';
import { markReplyRead } from '@/features/reply/replyApi';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell = () => {
  const { replies, reload } = useReplies();
  const navigate = useNavigate();
  const unreadCount = replies.length;

  const handleClick = async (replyId: string, campaignId: string | { _id: string; name: string }) => {
    await markReplyRead(replyId);
    reload();
    const cid = typeof campaignId === 'string' ? campaignId : campaignId._id;
    navigate(`/campaigns/${cid}`);
  };

  const getCampaignName = (reply: (typeof replies)[0]) => {
    if (typeof reply.campaignId === 'string') return 'Campaign';
    return reply.campaignId.name;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {replies.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No new replies
          </div>
        ) : (
          replies.map((reply) => (
            <DropdownMenuItem
              key={reply._id}
              className="flex flex-col items-start gap-1 p-3 cursor-pointer"
              onClick={() => handleClick(reply._id, reply.campaignId)}
            >
              <div className="flex w-full justify-between">
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {reply.recipientEmail}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(reply.receivedAt), { addSuffix: true })}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {getCampaignName(reply)}
              </span>
              {reply.snippet && (
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {reply.snippet}
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
