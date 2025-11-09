import toast from 'react-hot-toast';

export interface AppError {
  error: string;
  message: string;
  action?: string;
  details?: any;
}

export class ErrorHandler {
  static handle(error: any, context: string = 'Operation') {
    console.error(`${context} failed:`, error);

    // Handle API errors with structured format
    if (error.error && error.message) {
      switch (error.error) {
        case 'rate_limit_exceeded':
          toast.error(error.message, {
            duration: 5000,
            icon: '⏰',
          });
          break;

        case 'profile_required':
          toast.error(error.message, {
            duration: 5000,
            icon: '👤',
          });
          // Optionally redirect
          if (error.action === 'redirect_to_profile_setup') {
            setTimeout(() => {
              window.location.href = '/monetization/setup?return=/monetization';
            }, 2000);
          }
          break;

        case 'project_exists':
          toast.error('You already have an active project', {
            duration: 4000,
            icon: '⚠️',
          });
          setTimeout(() => {
            window.location.href = '/monetization/project';
          }, 2000);
          break;

        case 'auth_required':
          toast.error('Please sign in to continue', {
            duration: 4000,
            icon: '🔒',
          });
          setTimeout(() => {
            window.location.href = '/login?return=/monetization';
          }, 2000);
          break;

        default:
          toast.error(error.message || 'Something went wrong', {
            duration: 4000,
          });
      }
    }
    // Network errors
    else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      toast.error('Network error. Please check your connection.', {
        duration: 4000,
        icon: '📡',
      });
    }
    // Generic errors
    else {
      toast.error(`${context} failed. Please try again.`, {
        duration: 4000,
      });
    }
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string = 'Operation'
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }

  static success(message: string, icon?: string) {
    toast.success(message, {
      duration: 3000,
      ...(icon && { icon })
    });
  }

  static loading(message: string): string {
    return toast.loading(message);
  }

  static dismiss(toastId: string) {
    toast.dismiss(toastId);
  }

  static updateToast(toastId: string, message: string, type: 'success' | 'error') {
    if (type === 'success') {
      toast.success(message, { id: toastId });
    } else {
      toast.error(message, { id: toastId });
    }
  }
}
