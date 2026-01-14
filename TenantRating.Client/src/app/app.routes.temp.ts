// Routes Configuration
import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { TenantDashboardComponent } from './features/tenant/tenant-dashboard.component';
import { TenantWizardComponent } from './features/tenant/wizard/tenant-wizard.component';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomeComponent },
    { path: 'tenant/dashboard', component: TenantDashboardComponent },
    { path: 'tenant/wizard', component: TenantWizardComponent },
];
