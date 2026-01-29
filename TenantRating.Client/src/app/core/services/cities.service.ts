import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class CitiesService {
  private cachedCities: string[] | null = null;
  private readonly MYGOV_API =
    "https://data.gov.il/api/3/action/datastore_search?resource_id=5c78e9fa-c2e2-4771-93ff-7f400a12f7ba&limit=10000";

  constructor(private http: HttpClient) {}

  /**
   * Fetch cities from MyGov API with deduplication
   */
  getCities(): Observable<string[]> {
    // Return cached cities if available
    if (this.cachedCities) {
      return of(this.cachedCities);
    }

    return this.http.get<any>(this.MYGOV_API).pipe(
      map((response) => {
        // Extract city names from the API response
        // The API returns records with a 'name' field for city names
        const cities =
          response.result?.records
            ?.map((record: any) => record.שם_ישוב || record.name)
            .filter((city: string) => city) || [];

        // Remove duplicates and sort alphabetically
        const uniqueCities: string[] = [...new Set(cities as string[])].sort();

        // Cache the result
        this.cachedCities = uniqueCities;

        return uniqueCities;
      }),
      catchError(() => {
        // Fallback: return empty array if API fails
        console.warn("Failed to fetch cities from MyGov API");
        return of([]);
      }),
    );
  }

  /**
   * Get cached cities (no API call)
   */
  getCachedCities(): string[] {
    return this.cachedCities || [];
  }

  /**
   * Clear cache (useful for refresh)
   */
  clearCache(): void {
    this.cachedCities = null;
  }
}
