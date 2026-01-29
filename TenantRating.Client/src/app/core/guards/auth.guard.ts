import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const user = authService.getCurrentUserValue();

    if (user && user.token) {
        return true;
    }

    // Not logged in so redirect to home/login
    // Assuming home page has the login form or button
    router.navigate(['/']);
    alert('אנא התחבר למערכת כדי להשתמש באשף הדירוג');
    return false;
};
