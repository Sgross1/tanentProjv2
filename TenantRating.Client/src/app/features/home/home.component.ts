import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
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
  @ViewChild("scrollSection") scrollSection!: ElementRef;

  curveProgress = 0; // 0 to 100
  showContent = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private appComponent: AppComponent,
  ) { }

  ngAfterViewInit() {
    this.onWindowScroll(); // Initial check
    this.initStickyCards();
  }

  private initStickyCards() {
    const wrappers = document.querySelectorAll(".card-wrapper");

    wrappers.forEach((wrapper, index) => {
      const card = wrapper.querySelector(".about-card");

      if (card) {
        // For the last card, allow normal scroll without pinning.
        if (index === wrappers.length - 1) {
          gsap.set(card, { opacity: 1, scale: 1 });
        } else {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: wrapper,
                start: "top top",
                end: "bottom top",
                scrub: true,
                pin: true,
                pinSpacing: false,
              },
            })
            .set(card, { opacity: 1, scale: 1 })
            .to(card, { opacity: 0, scale: 0.6, ease: "none" }, 0.01);
        }
      }
    });

    // Refresh ScrollTrigger after a slight delay to ensure layout is ready
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  }

  @HostListener("window:scroll", ["$event"])
  onWindowScroll(event?: Event) {
    if (!this.scrollSection) return;

    const rect = this.scrollSection.nativeElement.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Calculate how much of the section is visible
    // When rect.top == windowHeight, progress is 0.
    // When rect.top <= windowHeight / 2, progress approaches 100.

    // Start animating when the top of the section enters the bottom of the viewport
    const startOffset = windowHeight;
    const endOffset = windowHeight * 0.2; // Finish when it's much higher up

    let progress = (startOffset - rect.top) / (startOffset - endOffset);

    // Clamp between 0 and 1
    progress = Math.max(0, Math.min(1, progress));

    this.curveProgress = progress * 100;

    // Show content only when fully expanded
    if (this.curveProgress > 80) {
      this.showContent = true;
    }
  }

  handleRoleClick(role: "Tenant" | "Landlord") {
    const currentUser = this.authService.getCurrentUserValue();

    if (role === "Tenant") {
      if (!currentUser) {
        this.appComponent.openAuth();
        return;
      }

      this.router.navigate(["/tenant/wizard"]);
    } else if (role === "Landlord") {
      this.router.navigate(["/landlord/search"]);
    }
  }
}
