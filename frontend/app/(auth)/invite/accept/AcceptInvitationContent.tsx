'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface InvitationDetails {
  valid: boolean;
  email?: string;
  agency_name?: string;
  agency_logo_url?: string;
  role?: string;
  expires_at?: string;
  requires_signup?: boolean;
  message?: string;
}

export default function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form for new users
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const verifyToken = useCallback(async () => {
    try {
      const response = await api.get(`/agency/team/invitations/verify/${token}`);
      setInvitation(response.data);
    } catch {
      setError('Failed to verify invitation');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setIsLoading(false);
      return;
    }

    verifyToken();
  }, [token, verifyToken]);

  const handleAccept = async () => {
    if (!token) return;

    // Validate for new users
    if (invitation?.requires_signup) {
      if (!fullName.trim()) {
        toast.error('Please enter your full name');
        return;
      }
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    setIsAccepting(true);
    try {
      const payload: Record<string, string> = { token };
      if (invitation?.requires_signup) {
        payload.full_name = fullName;
        payload.password = password;
      }

      const response = await api.post('/agency/team/invitations/accept', payload);

      if (response.data.success) {
        toast.success('Welcome to the team!');

        // If new user, store the tokens
        if (response.data.access_token) {
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }

        // Redirect to agency dashboard
        router.push('/agency');
      } else {
        toast.error(response.data.message || 'Failed to accept invitation');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-600 dark:text-gray-400">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error || 'This invitation could not be verified.'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button variant="outline">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>Invitation Issue</CardTitle>
            <CardDescription>{invitation.message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please contact the agency administrator for a new invitation.
            </p>
            <Link href="/">
              <Button variant="outline">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in but with wrong email
  if (user && user.email !== invitation.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>Different Account</CardTitle>
            <CardDescription>
              This invitation is for <strong>{invitation.email}</strong>, but you&apos;re logged in as{' '}
              <strong>{user.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please log out and sign in with the correct account, or ask for a new invitation.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/auth/logout">
                <Button variant="outline">Log Out</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleInfo = {
    admin: { label: 'Admin', icon: Shield, color: 'bg-blue-100 text-blue-700' },
    member: { label: 'Member', icon: User, color: 'bg-gray-100 text-gray-700' },
  };
  const role = roleInfo[invitation.role as keyof typeof roleInfo] || roleInfo.member;
  const RoleIcon = role.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {invitation.agency_logo_url ? (
            <Image
              src={invitation.agency_logo_url}
              alt={invitation.agency_name || 'Agency'}
              width={64}
              height={64}
              className="mx-auto rounded-lg object-cover mb-4"
            />
          ) : (
            <div className="mx-auto h-16 w-16 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
          )}
          <CardTitle>Join {invitation.agency_name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as a team member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
              <span className="text-sm font-medium">{invitation.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
              <Badge className={role.color}>
                <RoleIcon className="mr-1 h-3 w-3" />
                {role.label}
              </Badge>
            </div>
            {invitation.expires_at && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Expires</span>
                <span className="text-sm">
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Sign Up Form (for new users) */}
          {invitation.requires_signup && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Create an account to join the team
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          )}

          {/* Already logged in message */}
          {user && !invitation.requires_signup && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                You&apos;re signed in as <strong>{user.email}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Decline
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
