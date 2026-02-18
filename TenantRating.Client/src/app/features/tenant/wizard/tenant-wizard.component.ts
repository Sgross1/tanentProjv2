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
  // --- משתני מצב (State) ---
  currentStep = 1;
  isProcessing = false;
  askSpouse = false;
  spouseFilesRequested = false;
  idNumberError: string = "";

  // --- נתוני שלב 1 ---
  requestData = {
    cities: [] as string[],
    desiredRent: null as number | null,
    idNumbers: [""] as string[],
  };

  // --- נתוני Autocomplete ---
  citySearchQuery = "";
  filteredCities: string[] = [];
  availableCities: string[] = [];

  // --- נתוני שלב 2 (קבצים) ---
  uploadedFiles: File[] = [];

  // --- נתוני שלבים 3 ו-4 (תוצאות) ---
  finalScore = 0;
  createdRequestId = 0;
  maxAffordableRent = 0;
  sliderValue = 0;
  calculatedRent = 0;
  debugOcrData: any = null;
  showDebugModal = false;

  // --- נתוני גרף ---
  distributionBars: { height: number; isUser: boolean }[] = [];
  userPercentile = 0;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private citiesService: CitiesService,
  ) {}

  ngOnInit(): void {
    this.citiesService.getCities().subscribe({
      next: (cities) => (this.availableCities = cities),
      error: (err) => console.error("Failed to load cities:", err),
    });
  }

  // --- לוגיקת אימות תעודת זהות ---
  onIdNumberInput() {
    const id = this.requestData.idNumbers[0];
    if (!id) {
      this.idNumberError = "";
      return;
    }
    this.idNumberError = !this.isValidIsraeliId(id)
      ? "מספר תעודת זהות לא תקין"
      : "";
  }

  isValidIsraeliId(id: string): boolean {
    if (!/^[0-9]{5,9}$/.test(id)) return false;
    id = id.padStart(9, "0");
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let num = Number(id[i]) * ((i % 2) + 1);
      if (num > 9) num -= 9;
      sum += num;
    }
    return sum % 10 === 0;
  }

  // --- לוגיקת ערים ---
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

  // --- ניווט ---
  nextStep() {
    if (this.currentStep === 1) {
      this.onIdNumberInput(); // וודא בדיקה אחרונה לפני מעבר
      if (
        this.requestData.cities.length === 0 ||
        !this.requestData.desiredRent ||
        !this.requestData.idNumbers[0] ||
        this.idNumberError
      ) {
        alert("אנא וודא שכל השדות מלאים ותקינים");
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
    if (this.currentStep > 1) this.currentStep--;
  }

  // --- קבצים ---
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.uploadedFiles.push(files[i]);
      }
    }
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

  // --- עיבוד נתונים (OCR ושרת) ---
  processRequest() {
    if (this.uploadedFiles.length !== 3 && this.uploadedFiles.length !== 6) {
      alert("אנא העלה בדיוק 3 או 6 תלושי שכר.");
      return;
    }

    this.currentStep = 3;
    this.isProcessing = true;

    this.requestService.analyzePayslip(this.uploadedFiles).subscribe({
      next: (ocrResult) => {
        // Debug Phase: Show result
        this.debugOcrData = ocrResult;
        // this.showDebugModal = true; // Optional: show debug modal if needed

        const requestDto = {
          ...ocrResult,
          desiredRent: this.requestData.desiredRent!,
          cityName: this.requestData.cities.join(", "),
          idNumbers: this.requestData.idNumbers.filter((id) => id),
        };

        this.requestService.createRequest(requestDto).subscribe({
          next: (result) => {
            this.isProcessing = false;
            this.finalScore = result.finalScore;
            this.maxAffordableRent = result.maxAffordableRent || 0;
            this.createdRequestId = result.requestId;
            this.sliderValue = Math.round(this.finalScore);
            this.updateRentCalculation();
            this.generatePercentileGraph(this.finalScore);
            this.currentStep = 4;
          },
          error: (err) => this.handleError(err, "שגיאה ביצירת הבקשה"),
        });
      },
      error: (err) => this.handleError(err, "שגיאה בפענוח התלושים"),
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

  updateRentCalculation() {
    if (this.sliderValue <= 0) {
      this.calculatedRent = 0;
      return;
    }
    this.calculatedRent = Math.round(
      (this.maxAffordableRent * 100) / this.sliderValue,
    );
  }

  generatePercentileGraph(score: number) {
    const bars: { height: number; isUser: boolean }[] = [];
    const userIndex = Math.min(
      Math.max(Math.floor((score / 1000) * 50), 0),
      49,
    );
    this.userPercentile = Math.min(99, Math.round(score / 10));

    for (let i = 0; i < 50; i++) {
      const x = i - 25;
      const height = Math.exp(-(x * x) / (2 * 100)) * 100;
      bars.push({
        height: Math.max(5, height * (0.8 + Math.random() * 0.4)),
        isUser: i === userIndex,
      });
    }
    this.distributionBars = bars;
  }

  finish() {
    this.router.navigate(["/tenant/dashboard"]);
  }

  sendSms() {
    if (this.createdRequestId) {
      this.requestService
        .sendSms(this.createdRequestId)
        .subscribe({
          next: (response) => {
            alert(response?.message ?? "SMS נשלח!");
          },
          error: (error) => {
            const serverError = error?.error?.error ?? "שליחת SMS נכשלה";
            alert(serverError);
          },
        });
    }
  }

  sendEmail() {
    if (this.createdRequestId) {
      this.requestService
        .sendEmail(this.createdRequestId)
        .subscribe(() => alert("אימייל נשלח!"));
    }
  }

  calculateProgress(): number {
    if (this.currentStep >= 3) return 100;
    let progress = 0;
    if (this.currentStep === 1) {
      if (this.requestData.idNumbers[0]?.length >= 8) progress += 15;
      if (this.requestData.cities.length > 0) progress += 15;
      if (this.requestData.desiredRent) progress += 20;
    } else if (this.currentStep === 2) {
      progress = 50 + Math.min((this.uploadedFiles.length / 3) * 50, 50);
    }
    return Math.round(progress);
  }

  getProgressText(): string {
    const texts = ["הזנת פרטים", "העלאת מסמכים", "מעבד נתונים", "הושלם"];
    return texts[this.currentStep - 1] || "";
  }
}
