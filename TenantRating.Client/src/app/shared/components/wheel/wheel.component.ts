import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-wheel',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="wheel-wrapper" [class.mini]="size === 'mini'" [class.small]="size === 'small'">
        <div class="ring-outer"></div>
        <div class="ring-gears"></div>
        <div class="ring-progress-bg"></div>

        <svg class="main-progress" [attr.width]="viewSize" [attr.height]="viewSize">
            <circle 
                [attr.stroke]="isComplete ? '#10b981' : '#2d7ef7'" 
                stroke-width="8" 
                fill="transparent" 
                [attr.r]="radius" 
                [attr.cx]="center" 
                [attr.cy]="center"
                [style.stroke-dasharray]="circumference" 
                [style.stroke-dashoffset]="dashOffset" 
                stroke-linecap="round" />
        </svg>

        <div class="core-reactor" [class.ready]="isComplete" (click)="onCoreClick()">
            <div class="spark"></div>
            <div class="core-text">{{ percent }}%</div>
            <div class="core-label">{{ statusText }}</div>
        </div>
    </div>
  `,
    styles: [`
    :host {
        display: block;
        --wheel-primary: #2d7ef7; /* var(--color-action-blue) */
        --wheel-secondary: #002f6c; /* var(--color-trust-blue) */
        --wheel-success: #10b981;
        --wheel-bg-ring: rgba(45, 126, 247, 0.1);
    }

    .wheel-wrapper {
        position: relative;
        width: 300px; /* Reduced from 400px for better fit */
        height: 300px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0 auto;
    }

    .wheel-wrapper.mini {
        transform: scale(0.6);
        transform-origin: center;
    }

    .wheel-wrapper.small {
        transform: scale(0.8);
        transform-origin: center;
    }

    /* Layer 1: Outer Static Ring */
    .ring-outer {
        position: absolute;
        width: 100%;
        height: 100%; /* Relative to wrapper */
        border: 1px dashed rgba(45, 126, 247, 0.3);
        border-radius: 50%;
        animation: spinSlow 60s linear infinite;
    }

    /* Layer 2: The Gears */
    .ring-gears {
        position: absolute;
        width: 85%;
        height: 85%;
        border-radius: 50%;
        border: 10px solid transparent; 
        border-top: 10px solid rgba(45, 126, 247, 0.2);
        border-bottom: 10px solid rgba(45, 126, 247, 0.2);
        /* box-shadow: 0 0 20px rgba(56, 189, 248, 0.1); remove blue glow for cleaner look? or keep soft */
        animation: spinGears 10s linear infinite reverse;
    }

    /* Layer 3: Progress Glow Ring */
    .ring-progress-bg {
        position: absolute;
        width: 70%;
        height: 70%;
        border-radius: 50%;
        border: 2px solid var(--wheel-bg-ring);
    }

    svg.main-progress {
        position: absolute;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
        /* filter: drop-shadow(0 0 5px var(--wheel-primary)); */
    }

    circle {
        transition: stroke-dashoffset 0.5s ease, stroke 0.3s;
    }

    /* Layer 4: Central Core */
    .core-reactor {
        position: absolute;
        width: 40%;
        height: 40%;
        border-radius: 50%;
        background: radial-gradient(circle, #ffffff 0%, #f0f4f8 100%);
        border: 2px solid var(--wheel-primary);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
        cursor: default;
        transition: all 0.3s;
        z-index: 10;
    }

    .core-text {
        font-family: 'Rajdhani', 'Rubik', sans-serif;
        font-size: 2rem;
        font-weight: 700;
        color: var(--wheel-secondary);
        line-height: 1;
    }

    .core-label {
        font-size: 0.7rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-top: 2px;
        font-weight: 500;
    }

    /* Spark / Active State */
    .spark {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 1px solid transparent;
        border-top-color: var(--wheel-primary);
        animation: spinFast 1s linear infinite;
        opacity: 0.5;
        pointer-events: none;
    }

    .core-reactor.ready {
        border-color: var(--wheel-success);
        background: radial-gradient(circle, #ecfdf5 0%, #ffffff 100%);
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
        cursor: pointer;
        transform: scale(1.05);
    }

    .core-reactor.ready .core-text {
        color: var(--wheel-success);
    }

    .core-reactor.ready .spark {
        border-top-color: var(--wheel-success);
        animation-duration: 0.5s;
    }

    @keyframes spinSlow { to { transform: rotate(360deg); } }
    @keyframes spinGears { to { transform: rotate(360deg); } }
    @keyframes spinFast { 
        0% { transform: rotate(0deg); opacity: 0.2; }
        50% { opacity: 0.8; }
        100% { transform: rotate(360deg); opacity: 0.2; }
    }
  `]
})
export class WheelComponent implements OnInit {
    @Input() percent: number = 0;
    @Input() statusText: string = 'PROCESSING';
    @Input() size: 'normal' | 'mini' | 'large' | 'small' = 'normal';

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

    constructor() { }

    ngOnInit(): void {
        // Optional: Auto-animate mode if percent is not controlled externally
    }

    onCoreClick() {
        if (this.isComplete) {
            // Action?
        }
    }
}
