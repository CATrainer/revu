'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Users, MoreHorizontal, Edit, Trash2, UserPlus, Folder } from 'lucide-react';
import { toast } from 'sonner';

// Mock groups
const mockGroups = [
  {
    id: '1',
    name: 'Top Performers',
    description: 'High-performing creators with consistent engagement',
    color: '#22c55e',
    creatorCount: 8,
    creators: ['Alex Johnson', 'Sarah Miller', 'Mike Chen'],
  },
  {
    id: '2',
    name: 'Gaming Niche',
    description: 'Creators specializing in gaming content',
    color: '#8b5cf6',
    creatorCount: 12,
    creators: ['Chris Wilson', 'Emma Davis', 'Jake Smith'],
  },
  {
    id: '3',
    name: 'Beauty & Lifestyle',
    description: 'Beauty, fashion, and lifestyle creators',
    color: '#ec4899',
    creatorCount: 6,
    creators: ['Sarah Miller', 'Lisa Park'],
  },
  {
    id: '4',
    name: 'Tech Reviewers',
    description: 'Technology and gadget reviewers',
    color: '#3b82f6',
    creatorCount: 5,
    creators: ['Alex Johnson', 'Mike Chen'],
  },
];

export default function CreatorGroupsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    description: '',
    color: '#22c55e',
  });

  const filteredGroups = mockGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = () => {
    if (!newGroupForm.name.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    toast.success('Group created successfully');
    setShowNewGroupDialog(false);
    setNewGroupForm({ name: '', description: '', color: '#22c55e' });
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      toast.success('Group deleted');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Creator Groups</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Organize creators into groups for easier management
          </p>
        </div>
        <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a group to organize your creators
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Top Performers"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">Description</Label>
                <Textarea
                  id="group-description"
                  placeholder="Describe this group..."
                  value={newGroupForm.description}
                  onChange={(e) => setNewGroupForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-color">Color</Label>
                <div className="flex gap-2">
                  {['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308'].map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${newGroupForm.color === color ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewGroupForm(f => ({ ...f, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateGroup}>
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search groups..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map(group => (
          <Card key={group.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: group.color + '20' }}
                  >
                    <Folder className="h-5 w-5" style={{ color: group.color }} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <p className="text-sm text-gray-500">{group.creatorCount} creators</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toast.info('Edit functionality coming soon')}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Group
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info('Add members functionality coming soon')}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Members
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {group.description}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {group.creators.slice(0, 3).map((name, i) => (
                    <div
                      key={i}
                      className="h-7 w-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-900"
                    >
                      {name.charAt(0)}
                    </div>
                  ))}
                </div>
                {group.creatorCount > 3 && (
                  <span className="text-sm text-gray-500">
                    +{group.creatorCount - 3} more
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No groups found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery ? 'Try a different search' : 'Create your first group to organize creators'}
          </p>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowNewGroupDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
      )}
    </div>
  );
}
