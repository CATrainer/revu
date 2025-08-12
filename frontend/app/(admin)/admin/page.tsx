'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserCheck, Clock, Shield, Search, Filter } from 'lucide-react';

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
  has_account: boolean;
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
  users_with_accounts: number;
  users_without_accounts: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    waiting_list_users: 0,
    early_access_users: 0,
    full_access_users: 0,
    admin_users: 0,
    users_with_accounts: 0,
    users_without_accounts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Filter and search state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter users based on status, account type, and search query
  useEffect(() => {
    let filtered = users;

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'admin') {
        filtered = filtered.filter(user => user.is_admin);
      } else {
        filtered = filtered.filter(user => !user.is_admin && user.access_status === statusFilter);
      }
    }

    // Filter by account type
    if (accountFilter !== 'all') {
      if (accountFilter === 'has_account') {
        filtered = filtered.filter(user => user.has_account);
      } else if (accountFilter === 'no_account') {
        filtered = filtered.filter(user => !user.has_account);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [users, statusFilter, accountFilter, searchQuery]);

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
        users_with_accounts: userData.filter((u: User) => u.has_account).length,
        users_without_accounts: userData.filter((u: User) => !u.has_account).length,
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
          users_with_accounts: updatedUsers.filter(u => u.has_account).length,
          users_without_accounts: updatedUsers.filter(u => !u.has_account).length,
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
  return <Badge variant="secondary" className="status-info">Early Access</Badge>;
      case 'full_access':
  return <Badge variant="default" className="status-success">Full Access</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAccountBadge = (hasAccount: boolean) => {
    return hasAccount ? (
  <Badge variant="default" className="status-success">Yes</Badge>
    ) : (
  <Badge variant="outline" className="text-secondary-dark">No</Badge>
    );
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
      <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Account</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold status-success-text">{stats.users_with_accounts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Account</CardTitle>
            <Users className="h-4 w-4 text-muted-dark" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-dark">{stats.users_without_accounts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-dark h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="waiting_list">Waiting List</SelectItem>
                  <SelectItem value="early_access">Early Access</SelectItem>
                  <SelectItem value="full_access">Full Access</SelectItem>
                  <SelectItem value="admin">Admin Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Account Filter */}
            <div className="w-full md:w-48">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="has_account">Has Account</SelectItem>
                  <SelectItem value="no_account">No Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Results count */}
          <div className="mt-4 text-sm text-secondary-dark">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>

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
                <TableHead>Has Account</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {getStatusBadge(user.access_status, user.is_admin)}
                  </TableCell>
                  <TableCell>
                    {getAccountBadge(user.has_account)}
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
              
              {filteredUsers.length === 0 && (
                <TableRow>
                  <td colSpan={7} className="p-4 text-center py-8 text-muted-dark">
                    {users.length === 0 
                      ? "No users found." 
                      : "No users match the current filters."
                    }
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
