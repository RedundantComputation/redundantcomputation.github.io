/**
 * 3D Scribble Scene — Nurture-inspired floating line art
 * Mix of dense tornado-like scribbles and sparser wisps,
 * biased to the right, each rotating around its own axis.
 */
(function () {
    const canvas = document.getElementById('scribble-canvas');
    if (!canvas) return;

    // ── Renderer ──────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();

    // ── Camera ────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.z = 12;

    // ── Helpers ───────────────────────────────────────
    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    // ── Generate a full-height scribble ───────────────
    // density: 'tornado' = tight dense spiraling, 'wisp' = looser noodle
    function generateStrand(baseX, density) {
        const points = [];
        const isTornado = density === 'tornado';
        const NUM_POINTS = isTornado ? 800 : 300;
        const HEIGHT = 30;

        const NUM_LAYERS = isTornado ? 10 : 6;
        const freqs = [];
        const phases = [];
        const amps = [];

        for (let l = 0; l < NUM_LAYERS; l++) {
            freqs.push({
                x: randomRange(isTornado ? 4.0 : 2.0, isTornado ? 20.0 : 10.0),
                z: randomRange(isTornado ? 4.0 : 1.5, isTornado ? 18.0 : 6.0),
            });
            phases.push({
                x: randomRange(0, Math.PI * 2),
                z: randomRange(0, Math.PI * 2),
            });
            // Tornado: higher amplitudes that decay slower
            const decay = isTornado ? Math.pow(l + 1, 0.3) : Math.sqrt(l + 1);
            amps.push({
                x: randomRange(isTornado ? 0.5 : 0.4, isTornado ? 1.8 : 1.2) / decay,
                z: randomRange(isTornado ? 0.4 : 0.15, isTornado ? 1.4 : 0.6) / decay,
            });
        }

        const scratchAmp = isTornado ? randomRange(0.1, 0.25) : randomRange(0.06, 0.15);

        // Corkscrew loops — the strand curls back on itself in y
        const loopCount = isTornado ? Math.floor(randomRange(14, 18)) : Math.floor(randomRange(2, 5));
        const loopAmpY = isTornado ? randomRange(0.6, 1.5) : randomRange(0.3, 0.8);
        const loopAmpX = isTornado ? randomRange(0.8, 1.8) : randomRange(0.4, 1.0);
        const loopAmpZ = isTornado ? randomRange(0.6, 1.4) : randomRange(0.3, 0.8);
        const loopPhaseX = randomRange(0, Math.PI * 2);
        const loopPhaseZ = randomRange(0, Math.PI * 2);

        for (let i = 0; i < NUM_POINTS; i++) {
            const t = i / NUM_POINTS;
            // Base upward motion + looping back on itself
            const y = (t - 0.5) * HEIGHT
                + Math.sin(t * Math.PI * 2 * loopCount) * loopAmpY;

            let x = baseX;
            let z = 0;

            // Corkscrew: circular motion that creates the crossover loops
            x += Math.cos(t * Math.PI * 2 * loopCount + loopPhaseX) * loopAmpX;
            z += Math.sin(t * Math.PI * 2 * loopCount + loopPhaseZ) * loopAmpZ;

            for (let l = 0; l < NUM_LAYERS; l++) {
                x += Math.sin(t * Math.PI * freqs[l].x + phases[l].x) * amps[l].x;
                z += Math.cos(t * Math.PI * freqs[l].z + phases[l].z) * amps[l].z;
            }

            x += randomRange(-scratchAmp, scratchAmp);
            z += randomRange(-scratchAmp, scratchAmp);

            points.push(new THREE.Vector3(x, y, z));
        }

        return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    }

    // ── Build the strands ─────────────────────────────
    // Each strand gets its own pivot group so it rotates
    // around its own position, not the viewport center.
    const strands = [];

    const config = [
        // Tornados — dense, chaotic
        { density: 'tornado', baseX: 3,   rotSpeed: 0.12 },
        { density: 'tornado', baseX: 5.5, rotSpeed: -0.10 },
        { density: 'tornado', baseX: 1.5, rotSpeed: 0.08 },
        { density: 'tornado', baseX: 4,   rotSpeed: -0.14 },
        // Wisps — sparser, filling gaps
        { density: 'wisp', baseX: 0,   rotSpeed: 0.06 },
        { density: 'wisp', baseX: 1,   rotSpeed: -0.05 },
        { density: 'wisp', baseX: 2.5, rotSpeed: 0.07 },
        { density: 'wisp', baseX: 4.5, rotSpeed: -0.04 },
        { density: 'wisp', baseX: 6,   rotSpeed: 0.05 },
        { density: 'wisp', baseX: -0.5, rotSpeed: -0.06 },
    ];

    const TUBE_RADIUS = 0.008; // ← tweak this for line thickness

    for (const cfg of config) {
        const curve = generateStrand(0, cfg.density);
        const tubeSegments = cfg.density === 'tornado' ? 800 : 500;
        const geometry = new THREE.TubeGeometry(curve, tubeSegments, TUBE_RADIUS, 4, false);

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: cfg.density === 'tornado' ? randomRange(0.5, 0.8) : randomRange(0.2, 0.5),
        });

        const line = new THREE.Mesh(geometry, material);

        // Pivot group centered on this strand's position
        const pivot = new THREE.Group();
        pivot.position.x = cfg.baseX;
        pivot.add(line);
        scene.add(pivot);

        strands.push({ pivot, rotSpeed: cfg.rotSpeed });
    }

    // ── Animation loop ────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();

        // Each strand rotates around its own axis
        for (const s of strands) {
            s.pivot.rotation.y = elapsed * s.rotSpeed;
        }

        renderer.render(scene, camera);
    }

    animate();

    // ── Resize ────────────────────────────────────────
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();
