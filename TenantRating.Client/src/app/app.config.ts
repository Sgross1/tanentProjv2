// App Configuration
import { ApplicationConfig } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { jwtInterceptor } from './core/jwt.interceptor';
import { HomeComponent } from './features/home/home.component';
import { TenantDashboardComponent } from './features/tenant/tenant-dashboard.component';
import { TenantWizardComponent } from './features/tenant/wizard/tenant-wizard.component';
import { LandlordSearchComponent } from './features/landlord/search/landlord-search.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';

import { adminGuard } from './core/guards/admin.guard';

// Routes Configuration
const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'tenant/dashboard', component: TenantDashboardComponent, canActivate: [] },
    { path: 'tenant/wizard', component: TenantWizardComponent, canActivate: [] },
    { path: 'landlord/search', component: LandlordSearchComponent, canActivate: [] },
    { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
    { path: '**', redirectTo: '' }
];

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideAnimations()
    ]
};
