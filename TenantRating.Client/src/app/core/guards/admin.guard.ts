import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUserValue();

  if (user && user.role === 'Admin') {
    return true;
  }

  // Not an admin? Redirect to home
  console.warn('Access denied: User is not an admin');
  router.navigate(['/']);
  return false;
};
