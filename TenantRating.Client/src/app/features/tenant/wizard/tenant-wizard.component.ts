import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { RequestService } from "../../../core/services/request.service";
import { CitiesService } from "../../../core/services/cities.service";

import { ThreeCubeComponent } from "../../../shared/components/three-cube/three-cube.component";
import { WheelComponent } from "../../../shared/components/wheel/wheel.component";

@Component({
  selector: "app-tenant-wizard",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ThreeCubeComponent,
    WheelComponent,
  ],
  templateUrl: "./tenant-wizard.component.html",
  styleUrls: ["./tenant-wizard.component.scss"],
})
export class TenantWizardComponent implements OnInit {
  currentStep = 1;
  isProcessing = false;

  // Step 1 Data
  requestData = {
    cities: [] as string[],
    desiredRent: null as number | null,
    idNumber: "",
  };
  idNumberError = "";
  isIdNumberValid = false;
  desiredRentCompleted = false;

  // Autocomplete Data
  citySearchQuery = "";
  filteredCities: string[] = [];
  availableCities: string[] = []; // Will be loaded from service

  // Step 2 Data
  uploadedFiles: File[] = [];
  fileStatuses: { [fileName: string]: 'loading' | 'done' } = {};

  // Step 3 Data (Result)
  finalScore = 0;
  createdRequestId = 0; // For notifications
  smsMockMode = true; // למחוק או לעשות פולס כדי להחזיר שליחת SMS אמיתית

  // Graph Data
  percentileBars: number[] = [];
  userPercentileIndex = -1;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private citiesService: CitiesService,
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

  // City Logic
  searchCities() {
    if (!this.citySearchQuery.trim()) {
      this.filteredCities = [];
      return;
    }
    this.filteredCities = this.availableCities.filter(
      (city) =>
        city.includes(this.citySearchQuery) &&
        !this.requestData.cities.includes(city),
    );
  }

  addCity(city: string) {
    if (!this.requestData.cities.includes(city)) {
      this.requestData.cities.push(city);
    }
    this.citySearchQuery = "";
    this.filteredCities = [];
  }

  removeCity(city: string) {
    this.requestData.cities = this.requestData.cities.filter((c) => c !== city);
  }

  nextStep() {
    if (this.currentStep === 1) {
      this.onIdNumberBlur();

      // Validate Step 1
      if (
        this.requestData.cities.length === 0 ||
        !this.requestData.desiredRent ||
        !this.requestData.idNumber ||
        !this.isIdNumberValid
      ) {
        alert("אנא מלא את כל שדות החובה");
        return;
      }
    }

    if (this.currentStep === 2) {
      this.processRequest();
    } else {
      this.currentStep++;
    }
  }

  prevStep() {
    this.currentStep--;
  }

  // Spouse Logic
  askSpouse = false;
  spouseFilesRequested = false;

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.uploadedFiles.push(file);

        // Simulating the "fake load" animation from the provided design
        this.fileStatuses[file.name] = 'loading';
        const simulatedLoadTime = 1500 + (i * 800);
        setTimeout(() => {
          this.fileStatuses[file.name] = 'done';
        }, simulatedLoadTime);
      }
    }

    // Trigger spouse prompt if we have 3 files and haven't asked yet
    if (
      this.uploadedFiles.length >= 3 &&
      !this.spouseFilesRequested &&
      !this.askSpouse
    ) {
      setTimeout(() => (this.askSpouse = true), 500);
    }
  }

  removeFile(index: number) {
    const fileName = this.uploadedFiles[index].name;
    this.uploadedFiles.splice(index, 1);
    delete this.fileStatuses[fileName];

    // Reset spouse logic if we drop below 3 files
    if (this.uploadedFiles.length < 3) {
      this.askSpouse = false;
      this.spouseFilesRequested = false;
    }
  }

  acceptSpouseUpload() {
    this.askSpouse = false;
    this.spouseFilesRequested = true;
  }

  declineSpouseUpload() {
    this.askSpouse = false;
  }

  processRequest() {
    // Validation: 3 or 6 files
    if (this.uploadedFiles.length !== 3 && this.uploadedFiles.length !== 6) {
      alert("אנא העלה בדיוק 3 או 6 תלושי שכר (3 עבור יחיד, 6 עבור זוג).");
      return;
    }

    this.currentStep = 3; // Processing view
    this.isProcessing = true;

    this.requestService
      .submitRequest(
        this.uploadedFiles,
        this.requestData.idNumber,
        this.requestData.desiredRent!,
        this.requestData.cities.join(", "),
      )
      .subscribe({
        next: (result) => {
          this.isProcessing = false;
          this.finalScore = result.finalScore;
          // Set userPercentile from backend
          this.userPercentile = result.percentile;
          this.maxAffordableRent = result.maxAffordableRent || 0;
          this.createdRequestId = result.requestId;

          this.sliderValue = Math.round(this.finalScore);
          this.updateRentCalculation();

          this.generatePercentileGraph(this.finalScore);
          this.currentStep = 4;
        },
        error: (err) => {
          console.error("Error submitting request:", err);
          this.isProcessing = false;

          // Show the actual error the backend returned (e.g. invalid ID or OCR fail)
          const serverValidationMsg = typeof err.error === 'string' ? err.error : (err.error?.title || err.message);
          alert("השרת סירב לבקשה בגלל השגיאה הבאה:\n\n" + serverValidationMsg);

          // Return to step where they can fix the issue
          this.currentStep = 2;
        },
      });
  }

  onDesiredRentBlur() {
    this.desiredRentCompleted =
      this.requestData.desiredRent !== null && this.requestData.desiredRent > 0;
  }

  // Helper Methods for Template
  calculateProgress(): number {
    let progress = 0;

    if (this.isIdNumberValid) {
      progress += 25;
    }

    if (this.requestData.cities.length > 0) {
      progress += 25;
    }

    if (this.desiredRentCompleted) {
      progress += 25;
    }

    if (this.uploadedFiles.length === 3 || this.uploadedFiles.length === 6) {
      progress += 25;
    }

    return progress;
  }

  getProgressText(): string {
    switch (this.currentStep) {
      case 1:
        return "פרטים";
      case 2:
        return "מסמכים";
      case 3:
        return "עיבוד";
      case 4:
        return "סיום";
      default:
        return "";
    }
  }

  onIdNumberBlur() {
    const digitsOnly = (this.requestData.idNumber || "")
      .replace(/\D/g, "")
      .slice(0, 9);
    this.requestData.idNumber = digitsOnly;

    this.isIdNumberValid =
      digitsOnly.length === 9 && this.isValidIsraeliId(digitsOnly);
    this.idNumberError = this.isIdNumberValid ? "" : "מספר הזהות לא תקין";
  }

  private isValidIsraeliId(idNumber: string): boolean {
    if (!/^\d{9}$/.test(idNumber)) {
      return false;
    }

    const sum = idNumber
      .split("")
      .map((char, index) => {
        const digit = Number(char);
        const multiplied = digit * ((index % 2) + 1);
        return multiplied > 9 ? multiplied - 9 : multiplied;
      })
      .reduce((acc, curr) => acc + curr, 0);

    return sum % 10 === 0;
  }

  // Missing Properties for Result View
  userPercentile = 0;

  // Dynamic Rent Calculation Logic
  maxAffordableRent = 0;
  sliderValue = 0;
  calculatedRent = 0;

  updateRentCalculation() {
    if (this.sliderValue <= 0) {
      this.calculatedRent = 0;
      return;
    }
    // Formula: The higher the score requested, the higher the affordable rent becomes.
    // Therefore: RequestRent = (MaxRent * Score) / 100
    this.calculatedRent = Math.round(
      (this.maxAffordableRent * this.sliderValue) / 100,
    );
  }

  generatePercentileGraph(score: number) {
    // True percentile calculation (0-100) is now calculated by the backend 
    // based on peers with similar rent. The `userPercentile` is already 
    // mapped from `result.percentile` inside `processRequest`.
    // However, we ensure it's not above 99 or below 1 for the UI chart.
    this.userPercentile = Math.min(Math.max(this.userPercentile, 1), 99);
  }

  finish() {
    this.router.navigate(["/tenant/dashboard"]);
  }

  sendSms() {
    // מכאן נוסף רק כדי לעשות סימולציה של שליחת SMS בלי לקרוא לשרת.
    if (this.smsMockMode) {
      if (!this.createdRequestId) return;
      console.log(
        `[SMS MOCK] Skipped real SMS send for requestId=${this.createdRequestId}`,
      );
      alert("הודעת SMS סומנה כנשלחה (מצב סימולציה)");
      return;
    }
    //ע ד כאן.
    if (this.createdRequestId) {
      this.requestService.sendSms(this.createdRequestId).subscribe({
        next: (response) => {
          alert(response?.message ?? "SMS נשלח!");
        },
        error: (error) => {
          const serverError = error?.error?.error ?? "שליחת SMS נכשלה";
          alert(serverError);
        },
      });
    }
    if (!this.createdRequestId) return;
    this.requestService.sendSms(this.createdRequestId).subscribe(() => {
      alert("הודעת SMS נשלחה בהצלחה!");
    });
  }

  sendEmail() {
    if (!this.createdRequestId) return;
    this.requestService.sendEmail(this.createdRequestId).subscribe(() => {
      alert("הודעת אימייל נשלחה בהצלחה!");
    });
  }
}
