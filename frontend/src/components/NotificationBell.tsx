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
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell = () => {
  const { replies, reload } = useReplies();
  const unreadCount = replies.filter((r) => !r.isRead).length;

  const handleClick = async (replyId: string, gmailUrl: string) => {
    await markReplyRead(replyId);
    reload();
    if (gmailUrl) window.open(gmailUrl, '_blank');
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
            No replies yet
          </div>
        ) : (
          replies.map((reply) => (
            <DropdownMenuItem
              key={reply._id}
              className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!reply.isRead ? 'bg-muted/50' : ''}`}
              onClick={() => handleClick(reply._id, reply.gmailUrl)}
            >
              <div className="flex w-full justify-between items-start">
                <span className={`text-sm truncate max-w-45 ${!reply.isRead ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                  {reply.recipientEmail}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {!reply.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.receivedAt), { addSuffix: true })}
                  </span>
                </div>
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
