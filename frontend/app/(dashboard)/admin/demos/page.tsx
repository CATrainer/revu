"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, CheckCircle, User, Building2, MessageSquare } from "lucide-react";

interface DemoUser {
  id: string;
  name: string;
  email: string;
  company: string;
  company_size: string;
  current_solution: string;
  demo_requested: boolean;
  demo_requested_at: string;
  demo_scheduled_at: string | null;
  demo_completed: boolean;
  demo_completed_at: string | null;
  admin_notes: string | null;
  prep_notes: string | null;
  follow_up_notes: string | null;
  created_at: string;
}

const AdminDemoPage = () => {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DemoUser[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);
  const [adminNotes, setAdminNotes] = useState({
    admin_notes: "",
    prep_notes: "",
    follow_up_notes: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch demo users
  useEffect(() => {
    fetchDemoUsers();
  }, []);

  // Filter users when filter changes
  useEffect(() => {
    const filterUsers = () => {
      let filtered = users;
      
      switch (filter) {
        case "requested":
          filtered = users.filter(user => user.demo_requested && !user.demo_scheduled_at);
          break;
        case "scheduled":
          filtered = users.filter(user => user.demo_scheduled_at && !user.demo_completed);
          break;
        case "completed":
          filtered = users.filter(user => user.demo_completed);
          break;
        default:
          filtered = users;
      }
      
      setFilteredUsers(filtered);
    };
    
    filterUsers();
  }, [users, filter]);

  const fetchDemoUsers = async () => {
    try {
      const response = await fetch('/api/v1/users?demo_requested=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching demo users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAdminNotes = async (userId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/users/${userId}/admin-notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(adminNotes)
      });

      if (response.ok) {
        // Refresh users list
        await fetchDemoUsers();
        // Close dialog
        setSelectedUser(null);
        // Reset form
        setAdminNotes({ admin_notes: "", prep_notes: "", follow_up_notes: "" });
      }
    } catch (error) {
      console.error('Error updating admin notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const markDemoCompleted = async (userId: string) => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/demo-completed`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await fetchDemoUsers();
      }
    } catch (error) {
      console.error('Error marking demo as completed:', error);
    }
  };

  const getStatusBadge = (user: DemoUser) => {
    if (user.demo_completed) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
    } else if (user.demo_scheduled_at) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Scheduled</Badge>;
    } else if (user.demo_requested) {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Requested</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  const openNotesDialog = (user: DemoUser) => {
    setSelectedUser(user);
    setAdminNotes({
      admin_notes: user.admin_notes || "",
      prep_notes: user.prep_notes || "",
      follow_up_notes: user.follow_up_notes || ""
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading demo requests...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Demo Management</h1>
        <p className="text-gray-600">Manage demo requests and track progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.demo_requested && !u.demo_scheduled_at).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.demo_scheduled_at && !u.demo_completed).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.demo_completed).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter requests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="requested">Pending</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Demo Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Requests</CardTitle>
          <CardDescription>
            Manage and track all demo requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Current Solution</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                      {user.company}
                    </div>
                  </TableCell>
                  <TableCell>{user.company_size}</TableCell>
                  <TableCell>{user.current_solution}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>
                    {new Date(user.demo_requested_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openNotesDialog(user)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Notes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Demo Notes - {selectedUser?.name}</DialogTitle>
                            <DialogDescription>
                              Add preparation notes and follow-up information
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="admin_notes">Admin Notes</Label>
                              <Textarea
                                id="admin_notes"
                                value={adminNotes.admin_notes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes({...adminNotes, admin_notes: e.target.value})}
                                placeholder="General notes about this prospect..."
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="prep_notes">Demo Preparation Notes</Label>
                              <Textarea
                                id="prep_notes"
                                value={adminNotes.prep_notes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes({...adminNotes, prep_notes: e.target.value})}
                                placeholder="Notes for demo preparation..."
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="follow_up_notes">Follow-up Notes</Label>
                              <Textarea
                                id="follow_up_notes"
                                value={adminNotes.follow_up_notes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes({...adminNotes, follow_up_notes: e.target.value})}
                                placeholder="Post-demo follow-up notes..."
                                rows={3}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => setSelectedUser(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => selectedUser && updateAdminNotes(selectedUser.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? 'Saving...' : 'Save Notes'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {user.demo_scheduled_at && !user.demo_completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markDemoCompleted(user.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No demo requests found for the selected filter
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDemoPage;
