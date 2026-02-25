import { Component, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-wheel",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./wheel.component.html",
  styleUrls: ["./wheel.component.scss"],
  /*
  קוד קודם שנשמר לבקשתך:
  template: `<div class="wheel-wrapper" ... >...</div>`
  styles: [`:host { ... } .wheel-wrapper { ... } ...`]
  (הקוד המלא הועבר ללא שינוי ל-files:
  wheel.component.html + wheel.component.scss)
  */
})
export class WheelComponent implements OnInit {
  @Input() percent: number = 0;
  @Input() statusText: string = "PROCESSING";
  @Input() size: "normal" | "mini" | "large" | "small" = "normal";

  // SVG Config
  viewSize = 300;
  center = 150;
  radius = 100; // 70% of 150 approx, aligned with CSS
  circumference = 2 * Math.PI * 100;

  get dashOffset() {
    // 100% -> 0 offset
    // 0% -> circumference
    return this.circumference - (this.percent / 100) * this.circumference;
  }

  get isComplete() {
    return this.percent >= 100;
  }

  constructor() {}

  ngOnInit(): void {
    // Optional: Auto-animate mode if percent is not controlled externally
  }

  onCoreClick() {
    if (this.isComplete) {
      // Action?
    }
  }
}
