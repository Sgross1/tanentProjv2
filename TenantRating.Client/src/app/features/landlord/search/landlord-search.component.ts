import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LandlordService, TenantSearchResult } from '../../../core/services/landlord.service';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

@Component({
    selector: 'app-landlord-search',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './landlord-search.component.html',
    styleUrls: ['./landlord-search.component.scss']
})
export class LandlordSearchComponent {
    searchCity = '';
    minRent: number | null = null;
    maxRent: number | null = null;

    results: TenantSearchResult[] = [];
    isLoading = false;
    hasSearched = false;
    showPhoneMap: { [key: number]: boolean } = {};
    savedMap: { [key: number]: boolean } = {};

    // Autocomplete Data
    filteredCities: string[] = [];
    availableCities = [
        'תל אביב - יפו', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד',
        'נתניה', 'באר שבע', 'חולון', 'בני ברק', 'רמת גן', 'רחובות', 'אשקלון',
        'בת ים', 'הרצליה', 'כפר סבא', 'חדרה', 'מודיעין-מכבים-רעות', 'לוד',
        'רעננה', 'רמלה', 'בית שמש', 'גבעתיים', 'הוד השרון', 'נהריה', 'קריית גת',
        'עפולה', 'אילת', 'קריית אתא', 'עכו', 'טבריה'
    ];

    constructor(private landlordService: LandlordService, private router: Router) { }

    onSearchInput() {
        if (!this.searchCity.trim()) {
            this.filteredCities = [];
            return;
        }
        this.filteredCities = this.availableCities.filter(city =>
            city.includes(this.searchCity)
        );
    }

    selectCity(city: string) {
        this.searchCity = city;
        this.filteredCities = []; // Close dropdown
        this.onSearch(); // Trigger search immediately on selection
    }

    onSearch() {
        this.filteredCities = []; // Ensure dropdown closed
        this.isLoading = true;
        this.hasSearched = true;
        this.showPhoneMap = {}; // Reset phones on new search

        this.landlordService.searchTenants(this.searchCity, this.minRent || undefined, this.maxRent || undefined)
            .subscribe({
                next: (data) => {
                    this.results = data;
                    // Initialize savedMap based on API results
                    data.forEach(r => {
                        if (r.isSaved) this.savedMap[r.requestId] = true;
                    });
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Search failed', err);
                    this.isLoading = false;
                }
            });
    }

    getScoreColor(score: number): string {
        if (score >= 850) return '#00cec9'; // Green/Teal
        if (score >= 700) return '#fdcb6e'; // Orange/Yellow
        return '#ff7675'; // Red
    }

    togglePhone(tenant: TenantSearchResult) {
        this.showPhoneMap[tenant.requestId] = true;
    }

    toggleSave(tenant: TenantSearchResult) {
        // Check if user is logged in
        const currentUser = localStorage.getItem('user');
        if (!currentUser) {
            if (confirm('עליך להתחבר כדי לשמור פניות. האם לעבור לדף הרשמה/התחברות?')) {
                // We should ideally redirect to login, but we don't have Router injected. 
                // Let's reload to login or use window.location for quick fix, or better: inject Router.
                this.router.navigate(['/']); // Redirect to home for login
            }
            return;
        }

        const isSaved = this.savedMap[tenant.requestId];

        if (isSaved) {
            this.landlordService.unsaveRequest(tenant.requestId).subscribe(() => {
                this.savedMap[tenant.requestId] = false;
            });
        } else {
            this.landlordService.saveRequest(tenant.requestId).subscribe(() => {
                this.savedMap[tenant.requestId] = true;
            });
        }
    }
}
