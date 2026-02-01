import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, NgZone, AfterViewInit } from '@angular/core';
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
export class ThreeCubeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef;
  @Input() mode: 'hero' | 'loading' = 'hero';

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private cube!: RubiksCube;
  private animationId!: number;

  constructor(private ngZone: NgZone) { }

  ngOnInit(): void {
    // Moved to AfterViewInit
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
    this.cube = new RubiksCube(this.scene, this.mode);

    // 6. Animation Loop
    this.ngZone.runOutsideAngular(() => {
      this.animate();
    });

    // Handle Resize
    window.addEventListener('resize', () => this.onResize());
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update Cube Animation Manually
    const now = performance.now();
    this.cube.update(now);

    // Global rotation logic
    const time = now * 0.0001872;
    const radius = 9;

    const theta = time * 2;
    const phi = Math.sin(time * 1.5) * 1.2;

    this.camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
    this.camera.position.y = radius * Math.sin(phi);
    this.camera.position.z = radius * Math.cos(theta) * Math.cos(phi);

    this.camera.up.set(Math.sin(time * 0.5) * 0.2, 1, Math.cos(time * 0.5) * 0.2);
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    if (!this.canvasContainer) return;
    const width = this.canvasContainer.nativeElement.clientWidth;
    const height = this.canvasContainer.nativeElement.clientHeight;

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

  // Animation State
  private isAnimating = false;
  private pivot: THREE.Group | null = null;
  private animStartTime = 0;
  private animDuration = 600; // ms
  private targetRotation = 0;
  private animAxis: 'x' | 'y' | 'z' = 'x';
  private activeCubies: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, mode: 'hero' | 'loading' = 'hero') {
    this.mode = mode;
    this.group = new THREE.Group();
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
    this.animDuration = 800; // Slower for visibility
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
    setTimeout(() => this.startRotation(), 500);
  }

  private initGeometry() {
    const size = 0.85;
    const gap = 0.04;
    const geometry = new THREE.BoxGeometry(size, size, size);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const material = this.getMaterial();
          const mesh = new THREE.Mesh(geometry, material);

          const edges = new THREE.EdgesGeometry(geometry);
          const line = new THREE.LineSegments(edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: true, opacity: 0.3 }));
          mesh.add(line);

          mesh.position.set(x * this.offset, y * this.offset, z * this.offset);

          this.group.add(mesh);
          this.cubies.push(mesh);
        }
      }
    }
  }

  private createTextures() {
    const createTex = (type: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 512, 512);

      if (type === 'mesh') {
        ctx.fillStyle = '#222';
        for (let i = 0; i < 512; i += 16) {
          for (let j = 0; j < 512; j += 16) {
            ctx.beginPath();
            ctx.arc(i, j, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (type === 'brushed') {
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 500; i++) {
          ctx.beginPath();
          ctx.moveTo(0, Math.random() * 512);
          ctx.lineTo(512, Math.random() * 512);
          ctx.stroke();
        }
      } else if (type === 'noise') {
        for (let i = 0; i < 50000; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#1a1a1a' : '#0a0a0a';
          ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    return {
      mesh: createTex('mesh'),
      brushed: createTex('brushed'),
      noise: createTex('noise')
    };
  }

  private getMaterial() {
    // Unified Style: Bright Cyan/White/Metallic (Hero Style) for all modes
    // This matches the user request to have the same cube everywhere.

    // Original Hero Logic:
    const rand = Math.random();
    let map = null, roughness = 0.1, color = new THREE.Color(0.0, 0.8, 0.8); // Cyan base

    if (rand < 0.25) {
      map = this.textures.mesh;
      color = new THREE.Color(0.8, 0.9, 1.0); // Whitish
      roughness = 0.4;
    } else if (rand < 0.5) {
      map = this.textures.brushed;
      color = new THREE.Color(0.0, 0.6, 0.7); // Darker Cyan
      roughness = 0.2;
    } else if (rand < 0.75) {
      map = this.textures.noise;
      color = new THREE.Color(0.2, 0.9, 0.9); // Bright Cyan
      roughness = 0.5;
    } else {
      color = new THREE.Color(1.0, 1.0, 1.0); // Pure White accents
      roughness = 0.05;
    }

    return new THREE.MeshStandardMaterial({
      color: color, map: map, bumpMap: map, bumpScale: 0.02,
      roughness: roughness, metalness: 0.9, envMapIntensity: 3.0,
      emissive: new THREE.Color(0.0, 0.2, 0.2), emissiveIntensity: 0.2
    });
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
