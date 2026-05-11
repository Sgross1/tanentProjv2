import {
  Component,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { AppComponent } from "../../app.component";
import { ThreeCubeComponent } from "../../shared/components/three-cube/three-cube.component";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, ThreeCubeComponent],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements AfterViewInit {
  constructor(
    private authService: AuthService,
    private router: Router,
    private appComponent: AppComponent,
  ) {}

  ngAfterViewInit() {
    this.initStickyCards();
  }

  /**
   * מאתחל את אפקט הגלילה ה"דביק" עבור הכרטיסים באזור "אודות".
   * כל כרטיס "ננעל" במקומו בזמן שהמשתמש גולל, ואז נעלם בהדרגה.
   */
  private initStickyCards() {
    const wrappers = document.querySelectorAll(".card-wrapper");
    //מוצא כל כרטיס בתוך העטיפה שלו.
    wrappers.forEach((wrapper, index) => {
      const card = wrapper.querySelector(".about-card");

      if (card) {
        // טיפול מיוחד בכרטיס האחרון: הוא לא ננעל או נעלם, אלא נשאר סטטי.
        if (index === wrappers.length - 1) {
          gsap.set(card, { opacity: 1, scale: 1 });
        } else {
          // יצירת ציר זמן (timeline) של GSAP עם ScrollTrigger לכל כרטיס אחר
          gsap
            .timeline({
              scrollTrigger: {
                trigger: wrapper, // האלמנט שמפעיל את האנימציה
                start: "top top", // האנימציה מתחילה כשהחלק העליון של ה-wrapper מגיע לחלק העליון של המסך
                end: "bottom top", // ומסתיימת כשהחלק התחתון של ה-wrapper מגיע לחלק העליון של המסך
                scrub: true, // מחבר את האנימציה בצורה חלקה למיקום הגלילה
                pin: true, // "נועץ" את ה-wrapper למסך בזמן שהאנימציה רצה
                pinSpacing: false, // מונע הוספת ריווח אוטומטי לאחר ה-pin
              },
            })
            .set(card, { opacity: 1, scale: 1 }) // מוודא שהכרטיס נראה בתחילת האנימציה
            .to(card, { opacity: 0, scale: 0.6, ease: "none" }, 0.01); // האנימציה עצמה: הכרטיס נעלם ומתכווץ
        }
      }
    });

    // חשוב: רענון ScrollTrigger לאחר השהייה קצרה.
    // זה מבטיח שכל המיקומים יחושבו מחדש לאחר שהפריסה התייצבה, ומונע באגים.
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  }

  /**
   * מטפל בלחיצה על כרטיסי התפקיד ("שוכר" / "משכיר").
   * @param role התפקיד שנלחץ.
   */
  handleRoleClick(role: "Tenant" | "Landlord") {
    if (role === "Tenant") {
      const currentUser = this.authService.getCurrentUserValue();

      // אם המשתמש לא מחובר, פותח את חלון ההתחברות/הרשמה
      if (!currentUser) {
        this.appComponent.openAuth();
        return;
      }

      // אם המשתמש מחובר, מעביר אותו לאשף השוכר
      this.router.navigate(["/tenant/wizard"]);
    } else if (role === "Landlord") {
      // תמיד מעביר את המשכיר לדף החיפוש
      this.router.navigate(["/landlord/search"]);
    }
  }
}
