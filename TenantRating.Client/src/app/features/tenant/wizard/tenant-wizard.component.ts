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

  // Step 3 Data (Result)
  finalScore = 0;
  createdRequestId = 0; // For notifications

  // Debug Modal Data
  debugOcrData: any = null;
  showDebugModal = false;

  // Graph Data
  percentileBars: number[] = [];
  userPercentileIndex = -1;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private citiesService: CitiesService,
  ) {}

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
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.uploadedFiles.push(files[i]);
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
    this.uploadedFiles.splice(index, 1);

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

    this.requestService.analyzePayslip(this.uploadedFiles).subscribe({
      next: (ocrResult) => {
        // Debug Phase: Show result
        this.debugOcrData = ocrResult;
        this.showDebugModal = true;

        // 2. Create the request in the backend with analyzed data AND user inputs
        const requestDto = {
          // Spread the results from OCR first
          ...ocrResult,
          // Then overwrite with user inputs
          desiredRent: this.requestData.desiredRent!,
          cityName: this.requestData.cities.join(", "),
        };

        this.requestService.createRequest(requestDto).subscribe({
          next: (result) => {
            this.isProcessing = false;
            this.finalScore = result.finalScore;
            // Capture Max Affordable Rent from backend
            this.maxAffordableRent = result.maxAffordableRent || 0;
            this.createdRequestId = result.requestId;

            // Initialize slider and calculation
            this.sliderValue = Math.round(this.finalScore);
            this.updateRentCalculation();

            this.generatePercentileGraph(this.finalScore);
            this.currentStep = 4; // Result view
          },
          error: (err) => {
            console.error("Error creating request:", err);
            this.isProcessing = false;
            const errorMessage =
              err.error?.title ||
              err.error ||
              err.message ||
              "שגיאה ביצירת הבקשה";
            alert(`אירעה שגיאה ביצירת הבקשה: ${JSON.stringify(errorMessage)}`);
            this.currentStep = 2; // Go back
          },
        });
      },
      error: (err) => {
        console.error("Error analyzing payslips:", err);
        this.isProcessing = false;
        const errorMessage =
          err.error?.title ||
          err.error ||
          err.message ||
          "שגיאה בפענוח התלושים";
        alert(`אירעה שגיאה בפענוח התלושים: ${JSON.stringify(errorMessage)}`);
        this.currentStep = 2; // Go back
      },
    });
  }

  private handleError(err: any, defaultMsg: string) {
    this.isProcessing = false;
    let errorMessage = defaultMsg;
    if (err.error instanceof ProgressEvent) {
      errorMessage = "שגיאת תקשורת עם השרת (האם השרת דולק?)";
    } else {
      errorMessage =
        err.error?.title ||
        err.error ||
        err.message ||
        JSON.stringify(err) ||
        defaultMsg;
    }

    // Handle object error message
    if (typeof errorMessage === "object") {
      errorMessage = JSON.stringify(errorMessage);
    }

    alert(`אירעה שגיאה: ${errorMessage}`);
    this.currentStep = 2; // Go back
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
  distributionBars: { height: number; isUser: boolean }[] = [];

  // Dynamic Rent Calculation Logic
  maxAffordableRent = 0;
  sliderValue = 0;
  calculatedRent = 0;

  updateRentCalculation() {
    if (this.sliderValue <= 0) {
      this.calculatedRent = 0;
      return;
    }
    // Formula: Score = (MaxRent / RequestRent) * 100
    // Therefore: RequestRent = (MaxRent * 100) / Score
    this.calculatedRent = Math.round(
      (this.maxAffordableRent * 100) / this.sliderValue,
    );
  }

  generatePercentileGraph(score: number) {
    // Generate a mock distribution (bell curve-ish)
    const bars = [];
    // User percentile logic (0-100) - simpler approximation
    this.userPercentile = Math.min(Math.round((score / 1000) * 100), 99);

    // Create visual bars
    for (let i = 0; i < 40; i++) {
      // Create a random-ish distribution curve
      let height = 20 + Math.random() * 50;
      // Peak around 700-800 score
      if (i > 25 && i < 35) height += 30;

      // Identify if this bar represents the user
      // Map user score (0-1000) to bar index (0-39)
      const userBarIndex = Math.floor((score / 1000) * 40);
      const isUser = i === userBarIndex;

      bars.push({ height: Math.min(height, 100), isUser });
    }
    this.distributionBars = bars;
  }

  finish() {
    this.router.navigate(["/tenant/dashboard"]);
  }

  sendSms() {
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
