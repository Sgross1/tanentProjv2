import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, NgZone, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-three-cube',
  standalone: true,
  template: `<div #canvasContainer class="canvas-container"></div>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .canvas-container {
      width: 100%;
      height: 100%;
      min-height: 300px;
      display: block;
    }
  `]
})
export class ThreeCubeComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef;
  @Input() mode: 'hero' | 'loading' = 'hero';
  @Input() globalRotationSpeed: number = 1.0;
  @Input() internalRotationSpeed: number = 1.0;
  @Input() scale: number = 1.0;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private cube!: RubiksCube;
  private animationId!: number;
  private resizeObserver!: ResizeObserver;

  constructor(private ngZone: NgZone) { }

  ngOnInit(): void {
    // Moved to AfterViewInit
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scale'] && !changes['scale'].firstChange) {
      if (this.cube) {
        // Update existing cube scale
        this.cube.setScale(this.scale);
      }
    }
    if (changes['internalRotationSpeed'] && !changes['internalRotationSpeed'].firstChange) {
      if (this.cube) {
        this.cube.setSpeed(this.internalRotationSpeed);
      }
    }
  }

  ngAfterViewInit(): void {
    // Small delay to ensure layout is stable
    setTimeout(() => {
      this.initThree();
    }, 0);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    // Clean up scene objects if needed
  }

  private initThree(): void {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // 2. Camera
    const width = this.canvasContainer.nativeElement.clientWidth;
    const height = this.canvasContainer.nativeElement.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    // Initial position - will be overridden in animate
    this.camera.position.set(6, 5, 8);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Fix for color management in newer Three.js
    (this.renderer as any).outputColorSpace = 'srgb'; // or THREE.SRGBColorSpace if types allowed
    (this.renderer as any).toneMapping = THREE.ACESFilmicToneMapping;

    this.canvasContainer.nativeElement.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    const spotLight = new THREE.SpotLight(0xffffff, 3);
    spotLight.position.set(-10, 5, 5);
    spotLight.angle = 0.5;
    spotLight.penumbra = 0.5;
    this.scene.add(spotLight);

    const rimLight = new THREE.PointLight(0x3b82f6, 2, 20);
    rimLight.position.set(0, -5, -5);
    this.scene.add(rimLight);

    // 5. Cube
    this.cube = new RubiksCube(this.scene, this.mode, this.internalRotationSpeed, this.scale);

    // 6. Animation Loop
    this.ngZone.runOutsideAngular(() => {
      this.animate();
    });

    // Handle Resize using ResizeObserver for better responsiveness in any container
    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
    });
    this.resizeObserver.observe(this.canvasContainer.nativeElement);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update Cube Animation Manually
    const now = performance.now();
    this.cube.update(now);

    // Global rotation logic
    const factor = this.globalRotationSpeed || 1.0;
    const timeScaled = now * 0.0001872 * factor;

    // Fixed radius increased to 12 (from 9) to provide more breathing room for larger scales
    const radius = 12;

    const theta = timeScaled * 2;
    const phi = Math.sin(timeScaled * 1.5) * 1.2;

    this.camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
    this.camera.position.y = radius * Math.sin(phi);
    this.camera.position.z = radius * Math.cos(theta) * Math.cos(phi);

    this.camera.up.set(Math.sin(timeScaled * 0.5) * 0.2, 1, Math.cos(timeScaled * 0.5) * 0.2);
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    if (!this.canvasContainer) return;
    const width = this.canvasContainer.nativeElement.clientWidth;
    const height = this.canvasContainer.nativeElement.clientHeight;

    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

// --- HELPER CLASS ---

class RubiksCube {
  private group: THREE.Group;
  private cubies: THREE.Mesh[] = [];
  private offset: number;
  private lastAxis: 'x' | 'y' | 'z' = 'x';
  private textures: any;
  private mode: string = 'hero';
  private rotationSpeed: number = 1.0;
  private scale: number = 1.0;

  // Animation State
  private isAnimating = false;
  private pivot: THREE.Group | null = null;
  private animStartTime = 0;
  private animDuration = 600; // ms
  private targetRotation = 0;
  private animAxis: 'x' | 'y' | 'z' = 'x';
  private activeCubies: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, mode: 'hero' | 'loading' = 'hero', rotationSpeed: number = 1.0, scale: number = 1.0) {
    this.mode = mode;
    this.rotationSpeed = rotationSpeed || 1.0;
    this.scale = scale || 1.0;

    this.group = new THREE.Group();
    // Apply Scale to the entire group
    this.group.scale.set(this.scale, this.scale, this.scale);

    scene.add(this.group);

    // Inner Lights
    const innerLight = new THREE.PointLight(0xffaa00, 3, 4);
    innerLight.position.set(0, 0, 0);
    this.group.add(innerLight);

    const innerLight2 = new THREE.PointLight(0xaaccff, 3, 4);
    innerLight2.position.set(0.1, 0.1, 0.1);
    this.group.add(innerLight2);

    this.textures = this.createTextures();
    this.offset = 0.85 + 0.04; // size + gap
    this.initGeometry();

    // Start loop
    setTimeout(() => this.startRotation(), 1000);
  }

  public update(now: number) {
    if (!this.isAnimating || !this.pivot) return;

    const elapsed = now - this.animStartTime;
    const t = Math.min(Math.max(elapsed / this.animDuration, 0), 1);

    // Easing: Cubic InOut
    // t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const currentRot = eased * this.targetRotation;
    this.pivot.rotation[this.animAxis] = currentRot;

    if (t >= 1) {
      this.finishRotation();
    }
  }

  private startRotation() {
    if (this.isAnimating) return;

    const axes = ['x', 'y', 'z'] as const;
    let axisIdx;

    // Ensure distinct axis
    do {
      axisIdx = Math.floor(Math.random() * 3);
    } while (axes[axisIdx] === this.lastAxis);

    this.lastAxis = axes[axisIdx] as 'x' | 'y' | 'z';
    const axis = this.lastAxis;
    const slice = Math.floor(Math.random() * 3) - 1;

    const targetCubies = this.cubies.filter(mesh => {
      const pos = mesh.position[axis];
      // Widen tolerance to ensure we catch slightly drifting cubes
      return Math.abs(pos - (slice * this.offset)) < 0.25;
    });

    if (targetCubies.length === 0) {
      // Retry faster if we missed
      setTimeout(() => this.startRotation(), 100);
      return;
    }

    this.isAnimating = true;
    this.animStartTime = performance.now();
    // Dynamic Duration based on Speed
    this.animDuration = 600 / this.rotationSpeed;

    this.activeCubies = targetCubies;
    this.animAxis = axis;

    const dir = Math.random() > 0.5 ? 1 : -1;
    this.targetRotation = dir * (Math.PI / 2);

    this.pivot = new THREE.Group();
    this.group.add(this.pivot);
    // Attach cubies correctly
    targetCubies.forEach(mesh => this.pivot!.attach(mesh));
  }

  private finishRotation() {
    // Snap to exact angle
    if (this.pivot) {
      this.pivot.rotation[this.animAxis] = this.targetRotation;
      this.pivot.updateMatrixWorld();

      // Detach and save
      this.activeCubies.forEach(mesh => {
        this.group.attach(mesh);
        this.roundPosition(mesh);
      });

      this.group.remove(this.pivot);
      this.pivot = null;
    }

    this.isAnimating = false;

    // Dynamic Pause based on Speed
    const pause = 500 / this.rotationSpeed;
    setTimeout(() => this.startRotation(), pause);
  }

  private initGeometry() {
    const size = 0.85;
    // BoxGeometry expects materials in this order: Right, Left, Top, Bottom, Front, Back
    // x+, x-, y+, y-, z+, z-
    const geometry = new THREE.BoxGeometry(size, size, size);

    // 1. Prepare the "Deck" of 54 external faces
    // 13 Words + 41 Empty -> Updated with new words
    const wordKeys: string[] = [];
    const texts = ['פנסיה', 'נטו', 'ותק', 'ילדים', 'ברוטו', 'X', '%', '=', '+', '-', 'שכר', 'חודש', 'ממוצע', 'יציבות', 'שכר דירה'];

    texts.forEach((_, i) => wordKeys.push(`text_${i}`));

    const totalExternalFaces = 54; // 9 faces * 6 sides
    const emptyCount = totalExternalFaces - wordKeys.length; // Adjusted automatically

    const deck: string[] = [...wordKeys];

    // Fill remaining spots with a mix of Dark and Silver empty textures
    for (let i = 0; i < emptyCount; i++) {
      // Alternate or random mix. Let's do roughly half/half
      deck.push(Math.random() > 0.5 ? 'empty_dark' : 'empty_silver');
    }

    // Shuffle the deck (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    let deckIndex = 0;

    // Default internal material (dark/black)
    const internalMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1
    });

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {

          // Determine materials for 6 faces: [Right, Left, Top, Bottom, Front, Back]
          const materials = [];

          const isRight = (x === 1);
          const isLeft = (x === -1);
          const isTop = (y === 1);
          const isBottom = (y === -1);
          const isFront = (z === 1);
          const isBack = (z === -1);

          // Helper to pick texture if external, or internal mat if not
          const getFaceMat = (isExternal: boolean) => {
            if (isExternal) {
              const textureKey = deck[deckIndex++];
              // If we run out of deck (shouldn't happen for 54 faces), fallback to empty_dark
              return this.getMaterial(textureKey || 'empty_dark');
            } else {
              return internalMaterial;
            }
          };

          materials.push(getFaceMat(isRight));  // 0: Right (x+)
          materials.push(getFaceMat(isLeft));   // 1: Left (x-)
          materials.push(getFaceMat(isTop));    // 2: Top (y+)
          materials.push(getFaceMat(isBottom)); // 3: Bottom (y-)
          materials.push(getFaceMat(isFront));  // 4: Front (z+)
          materials.push(getFaceMat(isBack));   // 5: Back (z-)

          // Create mesh with array of materials
          const mesh = new THREE.Mesh(geometry, materials);

          // Edges (Black outline)
          const edges = new THREE.EdgesGeometry(geometry);
          const line = new THREE.LineSegments(edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2, transparent: true, opacity: 0.5 }));
          mesh.add(line);

          mesh.position.set(x * this.offset, y * this.offset, z * this.offset);

          this.group.add(mesh);
          this.cubies.push(mesh);
        }
      }
    }
  }

  private createTextures() {
    // --- NEW TEXT TEXTURE GENERATION ---
    const texts = ['פנסיה', 'נטו', 'ותק', 'ילדים', 'ברוטו', 'X', '%', '=', '+', '-', 'שכר', 'חודש', 'ממוצע', 'יציבות', 'שכר דירה'];
    const textures: any = {};

    // Helper to draw the base style (Dark Background + Silver Border)
    const drawBase = (ctx: CanvasRenderingContext2D, isSilver: boolean) => {
      if (isSilver) {
        // Silver/Gray Background
        ctx.fillStyle = '#444444';
        ctx.fillRect(0, 0, 512, 512);

        // Noise
        ctx.fillStyle = '#555';
        for (let i = 0; i < 512; i += 20) {
          for (let j = 0; j < 512; j += 20) {
            if (Math.random() > 0.8) ctx.fillRect(i, j, 2, 2);
          }
        }
        // Border (Lighter Silver)
        ctx.strokeStyle = '#888';
      } else {
        // Dark Metallic Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 512, 512);

        // Noise
        ctx.fillStyle = '#222';
        for (let i = 0; i < 512; i += 20) {
          for (let j = 0; j < 512; j += 20) {
            if (Math.random() > 0.8) ctx.fillRect(i, j, 2, 2);
          }
        }
        // Border (Silver/Metallic)
        ctx.strokeStyle = '#555';
      }

      ctx.lineWidth = 15;
      ctx.strokeRect(10, 10, 492, 492);
    };

    // 1. Create Text Textures
    texts.forEach((text, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Determine background color: Alternate or Random? 
      // User said "Half of the squares were silver". 
      // Let's alternate based on index to ensure even distribution.
      const isSilver = (index % 2 !== 0);
      drawBase(ctx, isSilver);

      // Text: Gold with GLOW
      ctx.fillStyle = '#FFD700'; // Gold
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // GLOW EFFECT - REDUCED INTENSITY
      ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'; // Reduced opacity
      ctx.shadowBlur = 15; // Reduced blur radius
      ctx.shadowOffsetX = 0; // Centered glow
      ctx.shadowOffsetY = 0;

      if (text === 'שכר דירה') {
        // Stack Vertically
        const fontSize = 160;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        // Draw "שכר"
        ctx.fillText('שכר', 256, 180);
        // Draw "דירה"
        ctx.fillText('דירה', 256, 380);
      } else {
        // Normal Single Line
        const fontSize = text.length > 3 ? 140 : 220;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillText(text, 256, 256);
      }

      textures[`text_${index}`] = new THREE.CanvasTexture(canvas);
    });

    // 2. Create Empty Textures (Dark and Silver)

    // Empty Dark
    const emptyDarkCanvas = document.createElement('canvas');
    emptyDarkCanvas.width = 512;
    emptyDarkCanvas.height = 512;
    const ctxDark = emptyDarkCanvas.getContext('2d')!;
    drawBase(ctxDark, false); // false = Dark
    textures['empty_dark'] = new THREE.CanvasTexture(emptyDarkCanvas);

    // Empty Silver
    const emptySilverCanvas = document.createElement('canvas');
    emptySilverCanvas.width = 512;
    emptySilverCanvas.height = 512;
    const ctxSilver = emptySilverCanvas.getContext('2d')!;
    drawBase(ctxSilver, true); // true = Silver
    textures['empty_silver'] = new THREE.CanvasTexture(emptySilverCanvas);

    return textures;
  }

  private getMaterial(textureKey: string) {
    // --- NEW LOGIC: Use specific key ---
    const map = this.textures[textureKey]; // Should always exist

    return new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      map: map,
      roughness: 0.3,
      metalness: 0.6,
      envMapIntensity: 1.0
    });
  }

  public setScale(scale: number) {
    this.scale = scale;
    if (this.group) {
      this.group.scale.set(scale, scale, scale);
    }
  }

  public setSpeed(speed: number) {
    this.rotationSpeed = speed;
  }

  private roundPosition(mesh: THREE.Mesh) {
    const off = this.offset;
    mesh.position.x = Math.round(mesh.position.x / off) * off;
    mesh.position.y = Math.round(mesh.position.y / off) * off;
    mesh.position.z = Math.round(mesh.position.z / off) * off;
    mesh.rotation.x = Math.round(mesh.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
    mesh.rotation.y = Math.round(mesh.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
    mesh.rotation.z = Math.round(mesh.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
    mesh.updateMatrixWorld();
  }
}
