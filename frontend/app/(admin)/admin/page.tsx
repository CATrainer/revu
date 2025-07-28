'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Clock, Shield } from 'lucide-react';

// Simple loading spinner component
const LoadingSpinner = ({ size = 'md', className = "" }: { size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };
  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

// Simple table components to avoid import issues
const Table = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className="relative w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className}`}>
      {children}
    </table>
  </div>
);

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="[&_tr]:border-b">
    {children}
  </thead>
);

const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="[&_tr:last-child]:border-0">
    {children}
  </tbody>
);

const TableRow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <tr className={`border-b transition-colors hover:bg-muted/50 ${className}`}>
    {children}
  </tr>
);

const TableHead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground ${className}`}>
    {children}
  </th>
);

const TableCell = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`p-4 align-middle ${className}`}>
    {children}
  </td>
);

interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  access_status: 'waiting_list' | 'early_access' | 'full_access';
  joined_waiting_list_at: string | null;
  early_access_granted_at: string | null;
  created_at: string;
}

interface AdminStats {
  total_users: number;
  waiting_list_users: number;
  early_access_users: number;
  full_access_users: number;
  admin_users: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    waiting_list_users: 0,
    early_access_users: 0,
    full_access_users: 0,
    admin_users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      const userData = response.data;
      setUsers(userData);
      
      // Calculate stats
      const newStats = {
        total_users: userData.length,
        waiting_list_users: userData.filter((u: User) => !u.is_admin && u.access_status === 'waiting_list').length,
        early_access_users: userData.filter((u: User) => !u.is_admin && u.access_status === 'early_access').length,
        full_access_users: userData.filter((u: User) => !u.is_admin && u.access_status === 'full_access').length,
        admin_users: userData.filter((u: User) => u.is_admin).length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = async (userId: string, currentStatus: string, isAdmin: boolean) => {
    // Don't allow changing admin users
    if (isAdmin) {
      return;
    }
    
    setActionLoading(userId);
    try {
      let newStatus: "waiting_list" | "early_access" | "full_access";
      // Cycle through: waiting_list -> early_access -> full_access -> waiting_list
      if (currentStatus === 'waiting_list') {
        newStatus = 'early_access';
      } else if (currentStatus === 'early_access') {
        newStatus = 'full_access';
      } else { // full_access or any other status
        newStatus = 'waiting_list';
      }

      await api.post(`/admin/users/${userId}/access`, {
        access_status: newStatus
      });
      
      // Update the specific user in state without refetching all users
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, access_status: newStatus }
            : user
        )
      );
      
      // Update stats to reflect the change
      setStats(() => {
        const updatedUsers = users.map(user => 
          user.id === userId 
            ? { ...user, access_status: newStatus }
            : user
        );
        
        return {
          total_users: updatedUsers.length,
          waiting_list_users: updatedUsers.filter(u => !u.is_admin && u.access_status === 'waiting_list').length,
          early_access_users: updatedUsers.filter(u => !u.is_admin && u.access_status === 'early_access').length,
          full_access_users: updatedUsers.filter(u => !u.is_admin && u.access_status === 'full_access').length,
          admin_users: updatedUsers.filter(u => u.is_admin).length,
        };
      });
    } catch (error) {
      console.error('Failed to update user access:', error);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getStatusBadge = (status: string, isAdmin: boolean) => {
    // Show "Admin" for admin users regardless of their access_status
    if (isAdmin) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">Admin</Badge>;
    }
    
    switch (status) {
      case 'waiting_list':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Waiting List</Badge>;
      case 'early_access':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Early Access</Badge>;
      case 'full_access':
        return <Badge variant="default" className="bg-green-100 text-green-800">Full Access</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getNextAction = (status: string, isAdmin: boolean) => {
    // Admin users can't have their access changed
    if (isAdmin) {
      return 'Admin Account';
    }
    
    switch (status) {
      case 'waiting_list':
        return 'Grant Early Access';
      case 'early_access':
        return 'Grant Full Access';
      case 'full_access':
        return 'Reset to Waiting List';
      default:
        return 'Update Status';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting List</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting_list_users}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Early Access</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.early_access_users}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Full Access</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.full_access_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.admin_users}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user access levels and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {getStatusBadge(user.access_status, user.is_admin)}
                  </TableCell>
                  <TableCell>
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Badge variant="destructive">Admin</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleAccess(user.id, user.access_status, user.is_admin)}
                      disabled={actionLoading === user.id || user.is_admin}
                    >
                      {actionLoading === user.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        getNextAction(user.access_status, user.is_admin)
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
