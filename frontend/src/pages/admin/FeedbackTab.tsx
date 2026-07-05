import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch } from '@/app/hook';
import {
  getFeedbackApi,
  updateFeedbackStatusApi,
  deleteFeedbackApi,
  type AdminFeedback,
} from '@/features/admin/adminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'resolved';
type TypeFilter = 'all' | 'bug' | 'feature' | 'general';

export function FeedbackTab() {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dispatch(getFeedbackApi({
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })).unwrap();
      setItems(data);
    } catch {
      toast.error('Không tải được danh sách feedback');
    } finally {
      setLoading(false);
    }
  }, [dispatch, typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: AdminFeedback['status']) => {
    try {
      await dispatch(updateFeedbackStatusApi({ id, status })).unwrap();
      toast.success('Đã cập nhật trạng thái');
      load();
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await dispatch(deleteFeedbackApi({ id: pendingDeleteId })).unwrap();
      toast.success('Đã xóa feedback');
      load();
    } catch {
      toast.error('Không thể xóa feedback');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="feature">Feature Request</SelectItem>
            <SelectItem value="general">General Feedback</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loại</TableHead>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Người gửi</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item._id}>
              <TableCell><Badge variant="secondary">{item.type}</Badge></TableCell>
              <TableCell>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-1">{item.message}</div>
              </TableCell>
              <TableCell>{item.user_id?.email ?? '—'}</TableCell>
              <TableCell>
                <Select value={item.status} onValueChange={(v) => handleStatusChange(item._id, v as AdminFeedback['status'])}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="destructive" onClick={() => setPendingDeleteId(item._id)}>
                  Xóa
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Không có feedback nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="Xóa feedback"
        message="Bạn có chắc muốn xóa feedback này?"
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
