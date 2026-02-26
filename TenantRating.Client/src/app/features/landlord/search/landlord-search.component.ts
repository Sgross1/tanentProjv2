import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  LandlordService,
  TenantSearchResult,
} from "../../../core/services/landlord.service";
import { CitiesService } from "../../../core/services/cities.service";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-landlord-search",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./landlord-search.component.html",
  styleUrls: ["./landlord-search.component.scss"],
})
export class LandlordSearchComponent implements OnInit {
  searchCity = "";
  minRent: number | null = null;
  maxRent: number | null = null;

  results: TenantSearchResult[] = [];
  isLoading = false;
  hasSearched = false;
  showPhoneMap: { [key: number]: boolean } = {};
  savedMap: { [key: number]: boolean } = {};
  actionError = "";
  searchError = "";

  // Autocomplete Data
  filteredCities: string[] = [];
  availableCities: string[] = []; // Will be loaded from service

  constructor(
    private landlordService: LandlordService,
    private citiesService: CitiesService,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    // Load cities from MyGov API on component init
    this.citiesService.getCities().subscribe({
      next: (cities) => {
        this.availableCities = cities;
      },
      error: (err) => {
        console.error("Failed to load cities:", err);
        this.availableCities = [];
      },
    });
  }

  onSearchInput() {
    const query = this.searchCity.trim();
    this.searchError = "";

    if (!query) {
      this.filteredCities = [];
      return;
    }

    const matchingCities = this.availableCities.filter((city) =>
      city.includes(query),
    );

    this.filteredCities = matchingCities.sort((firstCity, secondCity) => {
      const firstStartsWith = firstCity.startsWith(query);
      const secondStartsWith = secondCity.startsWith(query);

      if (firstStartsWith !== secondStartsWith) {
        return firstStartsWith ? -1 : 1;
      }

      return firstCity.localeCompare(secondCity, "he");
    });
  }

  selectCity(city: string) {
    this.searchCity = city;
    this.searchError = "";
    this.filteredCities = []; // Close dropdown
    this.onSearch(); // Trigger search immediately on selection
  }

  onSearch() {
    const normalizedCity = this.searchCity.trim();

    if (!normalizedCity) {
      this.hasSearched = true;
      this.isLoading = false;
      this.results = [];
      this.filteredCities = [];
      this.searchError = "יש להזין עיר כדי לבצע חיפוש שוכרים.";
      return;
    }

    this.searchCity = normalizedCity;
    this.searchError = "";
    this.filteredCities = []; // Ensure dropdown closed
    this.isLoading = true;
    this.hasSearched = true;
    this.showPhoneMap = {}; // Reset phones on new search

    this.landlordService
      .searchTenants(
        this.searchCity,
        this.minRent || undefined,
        this.maxRent || undefined,
      )
      .subscribe({
        next: (data) => {
          this.results = data;
          // Initialize savedMap based on API results
          data.forEach((r) => {
            if (r.isSaved) this.savedMap[r.requestId] = true;
          });
          this.isLoading = false;
        },
        error: (err) => {
          console.error("Search failed", err);
          this.searchError = "החיפוש נכשל. נסה שוב בעוד רגע.";
          this.isLoading = false;
        },
      });
  }

  getScoreColor(score: number): string {
    if (score >= 850) return "#00cec9"; // Green/Teal
    if (score >= 700) return "#fdcb6e"; // Orange/Yellow
    return "#ff7675"; // Red
  }

  togglePhone(tenant: TenantSearchResult) {
    this.showPhoneMap[tenant.requestId] = true;
  }

  toggleSave(tenant: TenantSearchResult) {
    this.actionError = "";

    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser?.token) {
      this.actionError = "כדי לשמור פנייה יש להתחבר לחשבון.";
      return;
    }

    const isSaved = this.savedMap[tenant.requestId];

    if (isSaved) {
      this.landlordService.unsaveRequest(tenant.requestId).subscribe({
        next: () => {
          this.savedMap[tenant.requestId] = false;
        },
        error: (err) => {
          this.actionError = this.mapSaveError(err);
        },
      });
    } else {
      this.landlordService.saveRequest(tenant.requestId).subscribe({
        next: () => {
          this.savedMap[tenant.requestId] = true;
        },
        error: (err) => {
          this.actionError = this.mapSaveError(err);
        },
      });
    }
  }

  private mapSaveError(err: any): string {
    if (err?.status === 401) {
      return "כדי לשמור פנייה יש להתחבר לחשבון.";
    }

    if (typeof err?.error === "string" && err.error.trim()) {
      return err.error;
    }

    if (typeof err?.error?.message === "string" && err.error.message.trim()) {
      return err.error.message;
    }

    return "פעולת שמירה נכשלה. נסה שוב.";
  }
}
