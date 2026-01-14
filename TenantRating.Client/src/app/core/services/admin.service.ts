import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SystemStats {
    totalUsers: number;
    totalRequests: number;
    totalLandlords: number;
    totalTenants: number;
    recentRequests: RecentRequest[];
}

export interface RecentRequest {
    requestId: number;
    tenantName: string;
    cityName: string;
    finalScore: number;
    dateCreated: string;
}

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = 'http://localhost:5000/api/admin';

    constructor(private http: HttpClient) { }

    getStats(): Observable<SystemStats> {
        return this.http.get<SystemStats>(`${this.apiUrl}/stats`);
    }

    getGraphStats(): Observable<GraphStats> {
        return this.http.get<GraphStats>(`${this.apiUrl}/stats/graphs`);
    }

    getUsers(search?: string, role?: number, isActive?: boolean): Observable<UserDto[]> {
        let params: any = {};
        if (search) params.search = search;
        if (role !== undefined) params.role = role;
        if (isActive !== undefined) params.isActive = isActive;
        return this.http.get<UserDto[]>(`${this.apiUrl}/users`, { params });
    }

    toggleUserStatus(userId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/users/${userId}/toggle-status`, {});
    }

    resetPassword(userId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/users/${userId}/reset-password`, {});
    }

    getRequests(status?: number): Observable<AdminRequestDto[]> {
        let params: any = {};
        if (status !== undefined) params.status = status;
        return this.http.get<AdminRequestDto[]>(`${this.apiUrl}/requests`, { params });
    }

    updateRequest(requestId: number, update: { status?: number, reviewerId?: number }): Observable<any> {
        return this.http.put(`${this.apiUrl}/requests/${requestId}`, update);
    }
}

export interface UserDto {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: number; // 0=Tenant, 1=Landlord, 2=Admin
    isActive: boolean;
    dateJoined: string;
}

export interface AdminRequestDto {
    requestId: number;
    tenantName: string;
    cityName: string;
    finalScore: number;
    dateCreated: string;
    status: number; // 0=Pending, etc.
    reviewerName: string;
}

export interface GraphStats {
    requestsByMonth: { year: number, month: number, count: number }[];
    requestsByStatus: { status: number, count: number }[];
    scoreDistribution: { label: string, count: number }[];
}
