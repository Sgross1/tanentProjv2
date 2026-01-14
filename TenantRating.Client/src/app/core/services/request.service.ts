import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface RequestResultDto {
    requestId: number;
    finalScore: number;
    tempScore: number;
    cityName: string;
    dateCreated: string;
}

export interface CreateRequestDto {
    desiredRent: number;
    cityName: string;
    netIncome: number;
    numChildren: number;
    isMarried: boolean;
    seniorityYears: number;
    pensionGrossAmount: number;
}

@Injectable({
    providedIn: 'root'
})
export class RequestService {
    private apiUrl = 'http://localhost:5000/api/requests';

    private requestsSubject = new BehaviorSubject<RequestResultDto[]>([]);
    public requests$ = this.requestsSubject.asObservable();

    constructor(private http: HttpClient) { }

    createRequest(dto: CreateRequestDto): Observable<RequestResultDto> {
        return this.http.post<RequestResultDto>(this.apiUrl, dto).pipe(
            tap(newRequest => {
                const currentRequests = this.requestsSubject.value;
                this.requestsSubject.next([...currentRequests, newRequest]);
            })
        );
    }

    sendSms(requestId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${requestId}/notify-sms`, {});
    }

    sendEmail(requestId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${requestId}/notify-email`, {});
    }

    getMyRequests(): Observable<RequestResultDto[]> {
        return this.http.get<RequestResultDto[]>(`${this.apiUrl}/my-requests`).pipe(
            tap(requests => {
                this.requestsSubject.next(requests);
            })
        );
    }
}
