import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RequestService } from '../../../core/services/request.service';
import { CitiesService } from "../../../core/services/cities.service";
import { ThreeCubeComponent } from '../../../shared/components/three-cube/three-cube.component';
import { WheelComponent } from '../../../shared/components/wheel/wheel.component';

@Component({
  selector: 'app-tenant-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ThreeCubeComponent, WheelComponent],
  templateUrl: './tenant-wizard.component.html',
  styleUrls: ['./tenant-wizard.component.scss']
})
export class TenantWizardComponent {
  currentStep = 1;
  isProcessing = false;

  // Step 1 Data
  requestData = {
    cities: [] as string[],
    desiredRent: null as number | null,
    idNumber: ''
  };

  // Autocomplete Data
  citySearchQuery = '';
  filteredCities: string[] = [];
  availableCities = [
    'תל אביב - יפו', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד',
    'נתניה', 'באר שבע', 'חולון', 'בני ברק', 'רמת גן', 'רחובות', 'אשקלון',
    'בת ים', 'הרצליה', 'כפר סבא', 'חדרה', 'מודיעין-מכבים-רעות', 'לוד',
    'רעננה', 'רמלה', 'בית שמש', 'גבעתיים', 'הוד השרון', 'נהריה', 'קריית גת',
    'עפולה', 'אילת', 'קריית אתא', 'עכו', 'טבריה'
  ];

  // Step 2 Data
  uploadedFiles: File[] = [];

  // Step 3 Data (Result)
  finalScore = 0;
  createdRequestId = 0; // For notifications

  // Debug Modal Data
  debugOcrData: any = null;
  showDebugModal = false;

  // Graph Data
  distributionBars: { height: number, isUser: boolean }[] = [];
  userPercentile = 0;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private citiesService: CitiesService
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
    this.citySearchQuery = '';
    this.filteredCities = [];
  }

  removeCity(city: string) {
    this.requestData.cities = this.requestData.cities.filter(c => c !== city);
  }

  nextStep() {
    if (this.currentStep === 1) {
      // Validate Step 1
      if (this.requestData.cities.length === 0 || !this.requestData.desiredRent || !this.requestData.idNumber) {
        alert('אנא מלא את כל שדות החובה');
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
    if (this.uploadedFiles.length >= 3 && !this.spouseFilesRequested && !this.askSpouse) {
      setTimeout(() => this.askSpouse = true, 500);
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
      alert('אנא העלה בדיוק 3 או 6 תלושי שכר (3 עבור יחיד, 6 עבור זוג).');
      return;
    }

    this.currentStep = 3; // Processing view
    this.isProcessing = true;

    // 1. Analyze Payslips (Real OCR)
    this.requestService.analyzePayslip(this.uploadedFiles).subscribe({
      next: (ocrResult) => {

        // Debug Phase: Show result
        this.debugOcrData = ocrResult;
        // this.showDebugModal = true; // Removed to prevent popup

        // 2. Create the request in the backend with analyzed data AND user inputs
        const requestDto = {
          // Spread the results from OCR first
          ...ocrResult,
          // Then overwrite with user inputs
          desiredRent: this.requestData.desiredRent!,
          cityName: this.requestData.cities.join(", "),
          idNumber: this.requestData.idNumber,
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
            console.error('Error creating request:', err);
            this.isProcessing = false;
            const errorMessage = err.error?.title || err.error || err.message || 'שגיאה ביצירת הבקשה';
            alert(`אירעה שגיאה ביצירת הבקשה: ${JSON.stringify(errorMessage)}`);
            this.currentStep = 2; // Go back
          }
        });
      },
      error: (err) => {
        console.error('Error analyzing payslips:', err);
        this.isProcessing = false;
        const errorMessage = err.error?.title || err.error || err.message || 'שגיאה בפענוח התלושים';
        alert(`אירעה שגיאה בפענוח התלושים: ${JSON.stringify(errorMessage)}`);
        this.currentStep = 2; // Go back
      }
    });
  }

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
    this.calculatedRent = Math.round((this.maxAffordableRent * 100) / this.sliderValue);
  }

  generatePercentileGraph(score: number) {
    // Generate a mock distribution (bell curve-ish)
    const bars: { height: number, isUser: boolean }[] = [];

    // Calculate where the user sits (0 to 49)
    // Assuming score range 0-1000. 
    // Map 0-1000 to 0-49 index.
    const userIndex = Math.min(Math.max(Math.floor((score / 1000) * 50), 0), 49);

    // Calculate strict percentile based on score (mock logic: score/10)
    // Real logic would require backend stats.
    this.userPercentile = Math.min(99, Math.round(score / 10));

    for (let i = 0; i < 50; i++) {
      // Create a bell curve shape
      // Center at 25 (50/2)
      const x = i - 25;
      // Gaussian function: e^(-x^2 / (2*sigma^2))
      // sigma = 10
      const height = Math.exp(-(x * x) / (2 * 100)) * 100;

      // Add some localized randomness
      const randomHeight = height * (0.8 + Math.random() * 0.4);

      bars.push({
        height: Math.max(5, randomHeight), // Min height 5%
        isUser: i === userIndex
      });
    }

    this.distributionBars = bars;
  }

  finish() {
    this.router.navigate(['/tenant/dashboard']);
  }

  sendSms() {
    if (!this.createdRequestId) return;
    this.requestService.sendSms(this.createdRequestId).subscribe(() => {
      alert('הודעת SMS נשלחה בהצלחה!');
    });
  }

  sendEmail() {
    if (!this.createdRequestId) return;
    this.requestService.sendEmail(this.createdRequestId).subscribe(() => {
      alert('הודעת אימייל נשלחה בהצלחה!');
    });
  }

  // --- Wheel Progress Logic ---
  calculateProgress(): number {
    let progress = 0;

    // Step 1: 50% max
    if (this.currentStep >= 1) {
      let step1Points = 0;
      if (this.requestData.idNumber && this.requestData.idNumber.length >= 8) step1Points += 15;
      if (this.requestData.cities.length > 0) step1Points += 15;
      if (this.requestData.desiredRent) step1Points += 20;

      progress = step1Points;
    }

    // Step 2: 50% -> 100%
    if (this.currentStep >= 2) {
      progress = 50;
      if (this.uploadedFiles.length > 0) {
        progress += (this.uploadedFiles.length / 3) * 50;
        if (progress > 100) progress = 100;
      }
    }

    if (this.currentStep >= 3) return 100;

    return Math.round(progress);
  }

  getProgressText(): string {
    if (this.currentStep === 1) return 'הזנת פרטים';
    if (this.currentStep === 2) return 'העלאת מסמכים';
    if (this.currentStep === 3) return 'מעבד נתונים';
    if (this.currentStep === 4) return 'הושלם';
    return '';
  }
}
