// pb_public/js/bus-3d.js
// Three.js r128 Procedural Luxury Sleeper Bus & Scroll-Driven Spline Animation (LAND-01)

(function () {
  const container = document.getElementById("hero-bus-canvas-container");
  if (!container) return;

  // 1. Scene, Camera, Renderer Setup
  const scene = new THREE.Scene();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || 480;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 3, 14);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 2. Lighting
  const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.8); // warm cream
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffedd5, 1.4);
  sunLight.position.set(10, 15, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xd97706, 0.7); // saffron rim
  fillLight.position.set(-10, -5, -10);
  scene.add(fillLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.5);
  scene.add(hemiLight);

  // 3. Procedural Luxury Sleeper Bus Model
  const busGroup = new THREE.Group();

  // Materials
  const saffronBodyMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.65,
    roughness: 0.25,
    envMapIntensity: 1.0
  });

  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.15
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.4,
    roughness: 0.5
  });

  const windowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.82,
    metalness: 0.9,
    roughness: 0.1,
    transmission: 0.3
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.1
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.8
  });

  const ledHeadlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });

  const tailLightMat = new THREE.MeshBasicMaterial({
    color: 0xef4444
  });

  // A. Main Coach Body (Upper Sleeper & Lower Decks)
  // Length: 10, Height: 3.2, Width: 2.8
  const bodyGeom = new THREE.BoxGeometry(2.8, 2.7, 10);
  const bodyMesh = new THREE.Mesh(bodyGeom, saffronBodyMat);
  bodyMesh.position.y = 1.9;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  busGroup.add(bodyMesh);

  // Lower bumper / skirt
  const skirtGeom = new THREE.BoxGeometry(2.82, 0.7, 9.9);
  const skirtMesh = new THREE.Mesh(skirtGeom, darkTrimMat);
  skirtMesh.position.y = 0.8;
  busGroup.add(skirtMesh);

  // Aerodynamic Rooftop & AC Unit
  const roofGeom = new THREE.BoxGeometry(2.6, 0.35, 9.6);
  const roofMesh = new THREE.Mesh(roofGeom, goldAccentMat);
  roofMesh.position.y = 3.35;
  busGroup.add(roofMesh);

  const acUnitGeom = new THREE.BoxGeometry(1.6, 0.45, 3.2);
  const acUnitMesh = new THREE.Mesh(acUnitGeom, darkTrimMat);
  acUnitMesh.position.set(0, 3.65, 0.5);
  busGroup.add(acUnitMesh);

  // B. Windows (Sleeper Panoramic Windows along sides)
  // Left side windows (upper & lower sleeper tiers)
  const windowStripGeom = new THREE.BoxGeometry(0.05, 1.8, 8.2);
  const leftWindowMesh = new THREE.Mesh(windowStripGeom, windowGlassMat);
  leftWindowMesh.position.set(-1.41, 2.1, 0.4);
  busGroup.add(leftWindowMesh);

  const rightWindowMesh = new THREE.Mesh(windowStripGeom, windowGlassMat);
  rightWindowMesh.position.set(1.41, 2.1, 0.4);
  busGroup.add(rightWindowMesh);

  // Front Windshield (curved sloped glass)
  const windshieldGeom = new THREE.BoxGeometry(2.6, 1.6, 0.1);
  const windshieldMesh = new THREE.Mesh(windshieldGeom, windowGlassMat);
  windshieldMesh.position.set(0, 2.3, -4.95);
  windshieldMesh.rotation.x = 0.22;
  busGroup.add(windshieldMesh);

  // Rear Window
  const rearWindowGeom = new THREE.BoxGeometry(2.4, 1.2, 0.1);
  const rearWindowMesh = new THREE.Mesh(rearWindowGeom, windowGlassMat);
  rearWindowMesh.position.set(0, 2.4, 4.95);
  busGroup.add(rearWindowMesh);

  // C. Front Grille, Chrome Trim & Headlights
  const grilleGeom = new THREE.BoxGeometry(2.0, 0.65, 0.15);
  const grilleMesh = new THREE.Mesh(grilleGeom, chromeMat);
  grilleMesh.position.set(0, 1.0, -5.02);
  busGroup.add(grilleMesh);

  // Headlights
  const headlightGeom = new THREE.BoxGeometry(0.45, 0.25, 0.15);
  const leftHeadlight = new THREE.Mesh(headlightGeom, ledHeadlightMat);
  leftHeadlight.position.set(-1.0, 1.0, -5.02);
  busGroup.add(leftHeadlight);

  const rightHeadlight = new THREE.Mesh(headlightGeom, ledHeadlightMat);
  rightHeadlight.position.set(1.0, 1.0, -5.02);
  busGroup.add(rightHeadlight);

  // Taillights
  const tailLightGeom = new THREE.BoxGeometry(0.25, 0.9, 0.15);
  const leftTail = new THREE.Mesh(tailLightGeom, tailLightMat);
  leftTail.position.set(-1.15, 1.6, 5.02);
  busGroup.add(leftTail);

  const rightTail = new THREE.Mesh(tailLightGeom, tailLightMat);
  rightTail.position.set(1.15, 1.6, 5.02);
  busGroup.add(rightTail);

  // D. Wheels (6 wheels: 2 front, 4 dual-axle rear)
  function createWheel(x, y, z) {
    const wheelGroup = new THREE.Group();
    // Tire
    const tireGeom = new THREE.CylinderGeometry(0.62, 0.62, 0.42, 24);
    tireGeom.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeom, tireMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Chrome Rim Hub
    const rimGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.44, 16);
    rimGeom.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, chromeMat);
    wheelGroup.add(rim);

    wheelGroup.position.set(x, y, z);
    return wheelGroup;
  }

  // Front wheels
  busGroup.add(createWheel(-1.35, 0.62, -3.2));
  busGroup.add(createWheel(1.35, 0.62, -3.2));

  // Dual Rear Axles
  busGroup.add(createWheel(-1.35, 0.62, 2.4));
  busGroup.add(createWheel(1.35, 0.62, 2.4));
  busGroup.add(createWheel(-1.35, 0.62, 3.8));
  busGroup.add(createWheel(1.35, 0.62, 3.8));

  // E. Golden Livery Swoosh Decals (Side accents)
  const stripeGeom = new THREE.BoxGeometry(0.04, 0.18, 8.8);
  const leftStripe = new THREE.Mesh(stripeGeom, goldAccentMat);
  leftStripe.position.set(-1.42, 1.0, 0.2);
  busGroup.add(leftStripe);

  const rightStripe = new THREE.Mesh(stripeGeom, goldAccentMat);
  rightStripe.position.set(1.42, 1.0, 0.2);
  busGroup.add(rightStripe);

  scene.add(busGroup);

  // 4. Ground Shadow Plate & Road Glow
  const roadGeom = new THREE.PlaneGeometry(16, 32);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.9,
    metalness: 0.1
  });
  const roadMesh = new THREE.Mesh(roadGeom, roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.y = 0;
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // 5. Spline Path & Scroll Interpolation (LAND-01)
  // Define 3D Catmull-Rom curve for bus motion
  const splinePoints = [
    new THREE.Vector3(2.5, 0, 1.0),
    new THREE.Vector3(0.5, 0, -1.0),
    new THREE.Vector3(-1.8, 0, -2.5),
    new THREE.Vector3(-0.5, 0, -4.0),
    new THREE.Vector3(1.2, 0, -5.5)
  ];
  const busSpline = new THREE.CatmullRomCurve3(splinePoints);

  // Track scroll position
  let scrollProgress = 0;
  let targetProgress = 0;

  function updateScroll() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const heroHeight = container.parentElement ? container.parentElement.offsetHeight : window.innerHeight;
    const progress = Math.min(Math.max(scrollY / Math.max(heroHeight, 500), 0), 1);
    targetProgress = progress;
  }

  window.addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();

  // 6. Viewport Visibility & Render Loop
  let isVisible = true;
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);
  }

  // Initial bus pose
  busGroup.rotation.y = -Math.PI / 5;
  busGroup.position.set(1.8, 0, 0);

  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    if (!isVisible) return;

    const delta = clock.getDelta();
    // Smooth lerp for scroll position
    scrollProgress += (targetProgress - scrollProgress) * 0.08;

    // Evaluate spline curve based on scroll
    const t = Math.min(Math.max(scrollProgress, 0.001), 0.999);
    const point = busSpline.getPointAt(t);
    const tangent = busSpline.getTangentAt(t);

    // Apply translation with subtle idle suspension breathing
    const idleSuspension = Math.sin(clock.getElapsedTime() * 2) * 0.03;
    busGroup.position.x = point.x + 1.2 * (1 - scrollProgress);
    busGroup.position.y = idleSuspension;
    busGroup.position.z = point.z + 1.5;

    // Angle towards tangent with hero perspective bias
    const targetAngle = Math.atan2(tangent.x, -tangent.z) - 0.4 * (1 - scrollProgress);
    busGroup.rotation.y += (targetAngle - busGroup.rotation.y) * 0.06;

    // Subtle bank / roll during curve steering
    busGroup.rotation.z = -tangent.x * 0.08;

    renderer.render(scene, camera);
  }

  animate();

  // 7. Responsive Resizing
  function onWindowResize() {
    const newWidth = container.clientWidth || window.innerWidth;
    const newHeight = container.clientHeight || 480;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  }

  window.addEventListener("resize", onWindowResize);
})();
