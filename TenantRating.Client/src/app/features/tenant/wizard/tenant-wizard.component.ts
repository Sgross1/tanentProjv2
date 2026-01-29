import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RequestService } from '../../../core/services/request.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-tenant-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  percentileBars: number[] = [];
  userPercentileIndex = -1;

  constructor(private router: Router, private requestService: RequestService) { }

  // City Logic
  searchCities() {
    if (!this.citySearchQuery.trim()) {
      this.filteredCities = [];
      return;
    }
    this.filteredCities = this.availableCities.filter(city =>
      city.includes(this.citySearchQuery) && !this.requestData.cities.includes(city)
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

    // 1. Analyze Payslips (Real OCR) then 2. Create Request using RxJS switchMap
    this.requestService.analyzePayslip(this.uploadedFiles, this.requestData.desiredRent || 0).pipe(
      switchMap((ocrResult) => {
        // Debug Phase: Show result
        this.debugOcrData = ocrResult;
        this.showDebugModal = true;

        // 2. Create the request in the backend with analyzed data AND user inputs
        const requestDto = {
          // Spread the results from OCR first
          ...ocrResult,
          // Then overwrite with user inputs
          desiredRent: this.requestData.desiredRent!,
          cityName: this.requestData.cities.join(', ')
        };

        return this.requestService.createRequest(requestDto);
      })
    ).subscribe({
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
        console.error('Error processing request:', err);
        this.isProcessing = false;

        let errorMessage = 'שגיאה בעיבוד הבקשה';
        if (err.error instanceof ProgressEvent) {
          errorMessage = 'שגיאת תקשורת עם השרת (האם השרת דולק?)';
        } else if (typeof err.error === 'string') {
          errorMessage = err.error;
        } else if (err.error?.title) {
          errorMessage = err.error.title;
        } else if (err.message) {
          errorMessage = err.message;
        }

        alert(`אירעה שגיאה: ${errorMessage}`);
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
    const bars = [];
    for (let i = 0; i < 50; i++) {
      // Create a curve that rises sharply at the end (like the example provided by user)
      // The example graph is exponential.
      const value = Math.pow(1.15, i);
      bars.push(value);
    }
    this.percentileBars = bars;

    // Calculate where the user sits (0 to 49)
    // Assuming score range 0-1000. 
    // Map 0-1000 to 0-49 index.
    const index = Math.floor((score / 1000) * 50);
    this.userPercentileIndex = Math.min(Math.max(index, 0), 49);
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
}
