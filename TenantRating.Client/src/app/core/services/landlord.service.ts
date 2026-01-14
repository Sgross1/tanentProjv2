import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TenantSearchResult {
    requestId: number;
    tenantName: string;
    finalScore: number;
    desiredRent: number;
    cityName: string;
    dateOfRating: string;
    phoneNumber?: string;
    isSaved?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class LandlordService {
    private apiUrl = 'http://localhost:5000/api/landlords';

    constructor(private http: HttpClient) { }

    searchTenants(city: string, minRent?: number, maxRent?: number): Observable<TenantSearchResult[]> {
        let params = new HttpParams();
        if (city) params = params.set('city', city);
        if (minRent) params = params.set('minRent', minRent);
        if (maxRent) params = params.set('maxRent', maxRent);

        return this.http.get<TenantSearchResult[]>(`${this.apiUrl}/search`, { params });
    }

    saveRequest(requestId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/save/${requestId}`, {});
    }

    unsaveRequest(requestId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/unsave/${requestId}`);
    }

    getSavedRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-saved`);
    }
}
