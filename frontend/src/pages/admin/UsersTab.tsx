import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch } from '@/app/hook';
import {
  getUsersApi,
  updateUserRoleApi,
  updateUserActiveApi,
  deleteUserApi,
  type AdminUser,
} from '@/features/admin/adminApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';

export function UsersTab() {
  const dispatch = useAppDispatch();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const loadUsers = useCallback(async (searchValue?: string) => {
    setLoading(true);
    try {
      const data = await dispatch(getUsersApi({ search: searchValue })).unwrap();
      setUsers(data);
    } catch {
      toast.error('Không tải được danh sách user');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleRole = async (user: AdminUser) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await dispatch(updateUserRoleApi({ id: user._id, role: nextRole })).unwrap();
      toast.success('Đã cập nhật role');
      loadUsers(search);
    } catch {
      toast.error('Không thể đổi role (có thể bạn đang thao tác trên chính tài khoản của mình)');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await dispatch(updateUserActiveApi({ id: user._id, isActive: !user.isActive })).unwrap();
      toast.success(user.isActive ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      loadUsers(search);
    } catch {
      toast.error('Không thể cập nhật trạng thái (có thể bạn đang thao tác trên chính tài khoản của mình)');
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await dispatch(deleteUserApi({ id: pendingDeleteId })).unwrap();
      toast.success('Đã xóa user');
      loadUsers(search);
    } catch {
      toast.error('Không thể xóa user');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Tìm theo tên hoặc email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') loadUsers(search); }}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                  {user.isActive ? 'Active' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleToggleRole(user)}>
                  {user.role === 'admin' ? 'Hạ quyền' : 'Cấp admin'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleToggleActive(user)}>
                  {user.isActive ? 'Khóa' : 'Mở khóa'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setPendingDeleteId(user._id)}>
                  Xóa
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!loading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Không có user nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="Xóa user"
        message="Bạn có chắc muốn xóa user này? Hành động này không thể hoàn tác."
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
