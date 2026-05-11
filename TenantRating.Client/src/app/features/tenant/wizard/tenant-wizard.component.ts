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
  protected readonly Math = Math;
  private readonly spouseMustDifferError =
    "מספר הזהות של בן/בת הזוג חייב להיות שונה מהמספר הראשי.";

  currentStep = 1;
  isProcessing = false;

  // Step 1 Data
  requestData = {
    cities: [] as string[],
    desiredRent: null as number | null,
    idNumber: "",
    spouseIdNumber: "",
  };
  idNumberError = "";
  isIdNumberValid = false;
  spouseIdNumberError = "";
  isSpouseIdNumberValid = false;
  desiredRentCompleted = false;
  stepErrors: string[] = [];
  actionMessage = "";
  actionMessageType: "success" | "error" | "info" = "info";

  // Autocomplete Data
  citySearchQuery = "";
  filteredCities: string[] = [];
  availableCities: string[] = []; // Will be loaded from service

  // Step 2 Data
  uploadedFiles: File[] = [];
  fileStatuses: { [fileName: string]: "loading" | "done" } = {};

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
    const query = this.citySearchQuery.trim();

    if (!query) {
      this.filteredCities = [];
      return;
    }

    const matchingCities = this.availableCities.filter(
      (city) => city.includes(query) && !this.requestData.cities.includes(city),
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
    this.stepErrors = [];

    if (this.currentStep === 1) {
      this.onIdNumberBlur();
      const errors: string[] = [];

      // Validate Step 1
      if (this.requestData.cities.length === 0) {
        errors.push("יש לבחור לפחות יישוב אחד.");
      }

      if (!this.requestData.desiredRent || this.requestData.desiredRent <= 0) {
        errors.push("יש להזין שכר דירה רצוי תקין.");
      }

      if (!this.requestData.idNumber || !this.isIdNumberValid) {
        errors.push("מספר הזהות הראשי אינו תקין.");
      }

      if (errors.length > 0) {
        this.stepErrors = errors;
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

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDropFiles(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!event.dataTransfer?.files?.length) {
      return;
    }

    this.addSelectedFiles(event.dataTransfer.files);
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    this.addSelectedFiles(files);
  }

  private addSelectedFiles(files: FileList | null) {
    if (!files) return;

    const startIndex = this.uploadedFiles.length;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.uploadedFiles.push(file);

      // Simulating the "fake load" animation from the provided design
      this.fileStatuses[file.name] = "loading";
      const simulatedLoadTime = 1500 + (startIndex + i) * 800;
      setTimeout(() => {
        this.fileStatuses[file.name] = "done";
      }, simulatedLoadTime);
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
    this.stepErrors = [];

    const errors: string[] = [];

    // Validation: 3 or 6 files
    if (this.uploadedFiles.length !== 3 && this.uploadedFiles.length !== 6) {
      errors.push("יש להעלות בדיוק 3 או 6 תלושי שכר.");
    }

    if (this.spouseFilesRequested && this.uploadedFiles.length < 6) {
      errors.push('בחרת להוסיף תלושי בן/בת זוג — יש להעלות סה"כ 6 תלושים.');
    }

    if (this.spouseFilesRequested || this.uploadedFiles.length === 6) {
      this.onSpouseIdNumberBlur();
      if (!this.requestData.spouseIdNumber || !this.isSpouseIdNumberValid) {
        errors.push("יש להזין מספר זהות תקין של בן/בת הזוג.");
      }

      if (this.requestData.spouseIdNumber === this.requestData.idNumber) {
        errors.push("מספר הזהות של בן/בת הזוג חייב להיות שונה מהמספר הראשי.");
      }
    }

    if (errors.length > 0) {
      this.stepErrors = errors;
      return;
    }

    this.currentStep = 3; // Processing view
    this.isProcessing = true;

    this.requestService
      .submitRequest(
        this.uploadedFiles,
        this.requestData.idNumber,
        this.requestData.spouseIdNumber || null,
        this.requestData.desiredRent!,
        this.requestData.cities.join(", "),
      )
      .subscribe({
        next: (result) => {
          this.isProcessing = false;
          this.finalScore = result.finalScore;
          // Set userPercentile from backend
          this.userPercentile = result.percentile;
          // Baseline for Inverse Logic: Product of rent and score
          this.maxAffordableRent =
            this.requestData.desiredRent! * result.finalScore;
          this.createdRequestId = result.requestId;

          this.sliderValue = Math.round(this.finalScore);
          this.updateRentCalculation();

          this.generatePercentileGraph(this.finalScore);
          this.currentStep = 4;
        },
        error: (err) => {
          console.error("Error submitting request:", err);
          this.isProcessing = false;
          this.stepErrors = this.extractErrorMessages(err);
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

    if (this.requestData.spouseIdNumber) {
      this.onSpouseIdNumberBlur();
    }
  }

  onSpouseIdNumberInput() {
    const digitsOnly = (this.requestData.spouseIdNumber || "")
      .replace(/\D/g, "")
      .slice(0, 9);
    this.requestData.spouseIdNumber = digitsOnly;

    if (!digitsOnly) {
      this.isSpouseIdNumberValid = false;
      this.spouseIdNumberError = "";
      return;
    }

    if (
      digitsOnly.length === 9 &&
      this.requestData.idNumber.length === 9 &&
      digitsOnly === this.requestData.idNumber
    ) {
      this.isSpouseIdNumberValid = false;
      this.spouseIdNumberError = this.spouseMustDifferError;
      return;
    }

    if (this.spouseIdNumberError === this.spouseMustDifferError) {
      this.spouseIdNumberError = "";
    }
  }

  onSpouseIdNumberBlur() {
    const digitsOnly = (this.requestData.spouseIdNumber || "")
      .replace(/\D/g, "")
      .slice(0, 9);
    this.requestData.spouseIdNumber = digitsOnly;

    if (!digitsOnly) {
      this.isSpouseIdNumberValid = false;
      this.spouseIdNumberError = "";
      return;
    }

    if (digitsOnly === this.requestData.idNumber) {
      this.isSpouseIdNumberValid = false;
      this.spouseIdNumberError = this.spouseMustDifferError;
      return;
    }

    this.isSpouseIdNumberValid =
      digitsOnly.length === 9 && this.isValidIsraeliId(digitsOnly);
    this.spouseIdNumberError = this.isSpouseIdNumberValid
      ? ""
      : "מספר הזהות של בן/בת הזוג לא תקין";
  }

  private extractErrorMessages(err: any): string[] {
    const payload = err?.error;

    if (!payload) {
      return ["אירעה שגיאה ביצירת הבקשה."];
    }

    if (typeof payload === "string") {
      return [payload];
    }

    const details = Array.isArray(payload?.details)
      ? payload.details.filter((v: unknown) => typeof v === "string")
      : [];

    const validationErrors = payload?.errors
      ? Object.values(payload.errors)
          .flat()
          .filter((v: unknown) => typeof v === "string")
      : [];

    const messages = [
      ...(typeof payload?.message === "string" ? [payload.message] : []),
      ...(typeof payload?.title === "string" ? [payload.title] : []),
      ...details,
      ...(validationErrors as string[]),
    ].filter((v, index, arr) => !!v && arr.indexOf(v) === index);

    return messages.length > 0 ? messages : ["אירעה שגיאה ביצירת הבקשה."];
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
    // Formula: Inverse Proportionality (Higher Score = Lower Budget)
    // Rent = (BaselineProduct) / Score
    this.calculatedRent = Math.round(this.maxAffordableRent / this.sliderValue);
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
    /* if (this.smsMockMode) {
      if (!this.createdRequestId) return;
      console.log(
        `[SMS MOCK] Skipped real SMS send for requestId=${this.createdRequestId}`,
      );
      this.setActionMessage("הודעת SMS סומנה כנשלחה (מצב סימולציה)", "info");
      return;
    }*/
    //ע ד כאן.
    if (!this.createdRequestId) return;
    this.requestService.sendSms(this.createdRequestId).subscribe({
      next: (response) => {
        this.setActionMessage(
          response?.message ?? "הודעת SMS נשלחה בהצלחה!",
          "success",
        );
      },
      error: (error) => {
        const serverError = error?.error?.error ?? "שליחת SMS נכשלה";
        this.setActionMessage(serverError, "error");
      },
    });
  }

  sendEmail() {
    if (!this.createdRequestId) return;
    this.requestService.sendEmail(this.createdRequestId).subscribe({
      next: () => {
        this.setActionMessage("הודעת אימייל נשלחה בהצלחה!", "success");
      },
      error: (error) => {
        const serverError = error?.error?.error ?? "שליחת אימייל נכשלה";
        this.setActionMessage(serverError, "error");
      },
    });
  }

  private setActionMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
  ) {
    this.actionMessage = message;
    this.actionMessageType = type;
  }
}
