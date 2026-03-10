/* To do :
- 👍 add a face to the character using a texture ... hairs too ?
- 👍add scenery (obstacles + river with rocks)
- 👍move the ground in the direction of travel
- 👍 adapt the obstacles creation for the moves
- add sky ?
- move character with keyboard arrows
- too much jerkiness, code needs optimisation (précalculate objects in buffers ?)
*/

class MinecraftCharacter {
    constructor() {
        this.init();
        this.createCharacter();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Initialize environment objects array
        this.environmentObjects = [];
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(5, 3, 5);
        
        // Renderer setup
        this.canvas = document.getElementById('canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Create multiple ground segments for infinite scrolling
        this.createInfiniteGround();
        
        // Environment
        this.createEnvironment();
        
        // Animation variables
        this.clock = new THREE.Clock();
        this.isRightMouseDown = false;
        this.characterRotationSpeed = 2;
        this.movementSpeed = 800;
        
        // Turn around system based on time
        this.movementDirection = 1; // 1 for forward, -1 for backward
        this.walkDuration = 8; // Walk for 8 seconds before turning around
        this.lastTurnTime = 0; // Track when the last turn happened
        this.isTurning = false;
        this.turnStartTime = 0;
        this.turnDuration = 1.0; // 1 second to complete turn
    }

    createCharacter() {
        this.character = new THREE.Group();
        
        // Materials
        const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
        const shirtMaterial = new THREE.MeshLambertMaterial({ color: 0x3c5aa6 });
        const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const hairMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        
        // Create face texture
        const faceTexture = this.createFaceTexture();
        const faceMaterial = new THREE.MeshLambertMaterial({ map: faceTexture });
        
        // Create materials array for each face of the cube
        // Order: right, left, top, bottom, front, back
        const headMaterials = [
            skinMaterial, // right
            skinMaterial, // left  
            skinMaterial, // top
            skinMaterial, // bottom
            faceMaterial, // front (face)
            skinMaterial  // back
        ];
        
        this.head = new THREE.Mesh(headGeometry, headMaterials);
        this.head.position.set(0, 2.4, 0);
        this.head.castShadow = true;
        this.character.add(this.head);
        
        // Hair
        const hairGeometry = new THREE.BoxGeometry(0.85, 0.25, 0.85);
        this.hair = new THREE.Mesh(hairGeometry, hairMaterial);
        this.hair.position.set(0, 2.6, 0);
        this.hair.castShadow = true;
        this.head.add(this.hair);
        this.hair.position.set(0, 0.3, 0); // Position relative to head
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.4);
        this.body = new THREE.Mesh(bodyGeometry, shirtMaterial);
        this.body.position.set(0, 1.2, 0);
        this.body.castShadow = true;
        this.character.add(this.body);
        
        // Left Arm
        const armGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3);
        this.leftArm = new THREE.Mesh(armGeometry, shirtMaterial);
        this.leftArm.position.set(0.65, 1.2, 0);
        this.leftArm.castShadow = true;
        this.character.add(this.leftArm);
        
        // Right Arm
        this.rightArm = new THREE.Mesh(armGeometry, shirtMaterial);
        this.rightArm.position.set(-0.65, 1.2, 0);
        this.rightArm.castShadow = true;
        this.character.add(this.rightArm);
        
        // Left Leg
        const legGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3);
        this.leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        this.leftLeg.position.set(0.25, -0.2, 0);
        this.leftLeg.castShadow = true;
        this.character.add(this.leftLeg);
        
        // Right Leg
        this.rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        this.rightLeg.position.set(-0.25, -0.2, 0);
        this.rightLeg.castShadow = true;
        this.character.add(this.rightLeg);
        
        // Shoes
        const shoeGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.5);
        this.leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        this.leftShoe.position.set(0, -0.7, 0.1);
        this.leftShoe.castShadow = true;
        this.leftLeg.add(this.leftShoe);
        
        this.rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        this.rightShoe.position.set(0, -0.7, 0.1);
        this.rightShoe.castShadow = true;
        this.rightLeg.add(this.rightShoe);
        
        // Position character
        this.character.position.y = 1.025;
        this.scene.add(this.character);
    }

    createInfiniteGround() {
        this.groundSegments = [];
        
        // Create 5 ground segments for seamless scrolling
        for (let i = 0; i < 5; i++) {
            const groundSegment = this.createGroundSegment();
            groundSegment.position.z = i * 20 - 40; // Position segments: -40, -20, 0, 20, 40
            this.scene.add(groundSegment);
            this.groundSegments.push(groundSegment);
            this.environmentObjects.push(groundSegment);
        }
    }
    
    createGroundSegment() {
        // Create a canvas for the procedural texture
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        
        // Create grass texture with noise
        const imageData = context.createImageData(size, size);
        const data = imageData.data;
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const index = (i * size + j) * 4;
                
                // Generate noise for grass variation
                const noise1 = this.noise(i * 0.02, j * 0.02) * 0.5 + 0.5;
                const noise2 = this.noise(i * 0.05, j * 0.05) * 0.3 + 0.7;
                const noise3 = this.noise(i * 0.1, j * 0.1) * 0.2 + 0.8;
                
                // Combine noises for grass color variation
                const grassIntensity = noise1 * noise2 * noise3;
                
                // Base grass colors (different shades of green)
                const baseGreen = 0x4a7c59;
                const lightGreen = 0x6b8e5a;
                const darkGreen = 0x2d5016;
                
                let r, g, b;
                
                if (grassIntensity > 0.7) {
                    // Light grass
                    r = (lightGreen >> 16) & 0xff;
                    g = (lightGreen >> 8) & 0xff;
                    b = lightGreen & 0xff;
                } else if (grassIntensity > 0.4) {
                    // Medium grass
                    r = (baseGreen >> 16) & 0xff;
                    g = (baseGreen >> 8) & 0xff;
                    b = baseGreen & 0xff;
                } else {
                    // Dark grass/dirt patches
                    r = (darkGreen >> 16) & 0xff;
                    g = (darkGreen >> 8) & 0xff;
                    b = darkGreen & 0xff;
                }
                
                // Add some random variation
                const variation = (Math.random() - 0.5) * 30;
                r = Math.max(0, Math.min(255, r + variation));
                g = Math.max(0, Math.min(255, g + variation));
                b = Math.max(0, Math.min(255, b + variation));
                
                data[index] = r;     // Red
                data[index + 1] = g; // Green
                data[index + 2] = b; // Blue
                data[index + 3] = 255; // Alpha
            }
        }
        
        context.putImageData(imageData, 0, 0);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2); // Repeat the texture
        
        // Create ground geometry and material
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            map: texture,
            transparent: false
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        
        return ground;
    }
    
    createFaceTexture() {
        // Create a canvas for the face texture
        const canvas = document.createElement('canvas');
        const size = 64; // Minecraft-style low resolution
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        
        // Fill with skin color background
        context.fillStyle = '#fdbcb4';
        context.fillRect(0, 0, size, size);
        
        // Draw eyes
        context.fillStyle = '#000000';
        // Left eye
        context.fillRect(16, 20, 8, 8);
        // Right eye
        context.fillRect(40, 20, 8, 8);
        
        // Draw eye pupils/iris
        context.fillStyle = '#4a90e2';
        // Left eye iris
        context.fillRect(18, 22, 4, 4);
        // Right eye iris
        context.fillRect(42, 22, 4, 4);
        
        // Draw eye highlights
        context.fillStyle = '#ffffff';
        // Left eye highlight
        context.fillRect(19, 23, 2, 2);
        // Right eye highlight
        context.fillRect(43, 23, 2, 2);
        
        // Draw nose (simple shadow)
        context.fillStyle = '#e6a896';
        context.fillRect(30, 32, 4, 6);
        
        // Draw mouth
        context.fillStyle = '#8b4513';
        context.fillRect(26, 44, 12, 3);
        
        // Add some facial shading for depth
        context.fillStyle = 'rgba(230, 168, 150, 0.3)';
        // Cheek shading
        context.fillRect(8, 28, 12, 8);
        context.fillRect(44, 28, 12, 8);
        // Forehead shading
        context.fillRect(20, 8, 24, 6);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter; // Pixelated look
        texture.minFilter = THREE.NearestFilter;
        
        return texture;
    }
    
    // Simple noise function for procedural generation
    noise(x, y) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    createEnvironment() {
        // Côté gauche - Formation rocheuse
        const rockMaterials = [
            new THREE.MeshLambertMaterial({ color: 0x8b7355 }), // Brown
            new THREE.MeshLambertMaterial({ color: 0x696969 }), // Dark gray
            new THREE.MeshLambertMaterial({ color: 0x808080 }), // Gray
            new THREE.MeshLambertMaterial({ color: 0xa0522d }), // Sienna
            new THREE.MeshLambertMaterial({ color: 0x778899 })  // Light slate gray
        ];
        
        this.rockGroups = [];
        
        // Create rock formations along the left side
        for (let segment = 0; segment < 5; segment++) {
            for (let i = 0; i < 15; i++) {
                const rockGroup = new THREE.Group();
                const numRocks = Math.floor(Math.random() * 3) + 1; // 1-3 rocks per group
                
                for (let j = 0; j < numRocks; j++) {
                    const rockGeometry = new THREE.BoxGeometry(
                        Math.random() * 1.5 + 0.5, // Width: 0.5-2
                        Math.random() * 2 + 0.5,   // Height: 0.5-2.5
                        Math.random() * 1.2 + 0.4  // Depth: 0.4-1.6
                    );
                    
                    const rock = new THREE.Mesh(
                        rockGeometry, 
                        rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                    );
                    
                    rock.position.set(
                        Math.random() * 2 - 1, // Small random offset
                        rock.geometry.parameters.height / 2, // Sit on ground
                        Math.random() * 1 - 0.5 // Small depth variation
                    );
                    
                    rock.rotation.y = Math.random() * Math.PI * 2;
                    rock.castShadow = true;
                    rock.receiveShadow = true;
                    
                    rockGroup.add(rock);
                }
                
                rockGroup.position.set(-8, 0, (i - 7) * 1.5 + segment * 20 - 40); // Left side, spaced out
                this.scene.add(rockGroup);
                this.rockGroups.push(rockGroup);
            }
        }
        
        // Add rock groups to environment objects
        this.environmentObjects.push(...this.rockGroups);
        
        // Côté droit - Cours d'eau
        this.riverElements = [];
        
        for (let segment = 0; segment < 5; segment++) {
            // River bed
            const riverBedGeometry = new THREE.PlaneGeometry(4, 20);
            const riverBedMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x4a4a2a,
                transparent: true,
                opacity: 0.8
            });
            
            const riverBed = new THREE.Mesh(riverBedGeometry, riverBedMaterial);
            riverBed.rotation.x = -Math.PI / 2;
            riverBed.position.set(8, -0.15, segment * 20 - 40);
            riverBed.receiveShadow = true;
            this.scene.add(riverBed);
            this.riverElements.push(riverBed);
            
            // Water surface with animated texture
            const waterCanvas = document.createElement('canvas');
            waterCanvas.width = 256;
            waterCanvas.height = 256;
            const waterContext = waterCanvas.getContext('2d');
            
            // Create water texture with wave patterns
            const waterImageData = waterContext.createImageData(256, 256);
            const waterData = waterImageData.data;
            
            for (let i = 0; i < 256; i++) {
                for (let j = 0; j < 256; j++) {
                    const index = (i * 256 + j) * 4;
                    
                    // Create wave patterns
                    const wave1 = Math.sin(i * 0.1) * 0.5 + 0.5;
                    const wave2 = Math.sin(j * 0.15) * 0.5 + 0.5;
                    const combined = (wave1 + wave2) / 2;
                    
                    // Blue water with wave variations
                    const blue = Math.floor(100 + combined * 100);
                    const green = Math.floor(50 + combined * 50);
                    
                    waterData[index] = 30;     // Red
                    waterData[index + 1] = green; // Green
                    waterData[index + 2] = blue;  // Blue
                    waterData[index + 3] = 180;   // Alpha (semi-transparent)
                }
            }
            
            waterContext.putImageData(waterImageData, 0, 0);
            
            const waterTexture = new THREE.CanvasTexture(waterCanvas);
            waterTexture.wrapS = THREE.RepeatWrapping;
            waterTexture.wrapT = THREE.RepeatWrapping;
            waterTexture.repeat.set(2, 8);
            
            const waterGeometry = new THREE.PlaneGeometry(3.5, 20);
            const waterMaterial = new THREE.MeshLambertMaterial({ 
                map: waterTexture,
                transparent: true,
                opacity: 0.7
            });
            
            const water = new THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.set(8, 0, segment * 20 - 40);
            this.scene.add(water);
            this.riverElements.push(water);
            
            // Store water reference for animation
            if (segment === 0) {
                this.water = water;
            }
        }
        
        // Add river elements to environment objects
        this.environmentObjects.push(...this.riverElements);
        
        // Add some river stones for each segment
        this.riverStones = [];
        const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        
        for (let segment = 0; segment < 5; segment++) {
            for (let i = 0; i < 20; i++) {
                const stoneGeometry = new THREE.SphereGeometry(
                    Math.random() * 0.3 + 0.1, // Radius: 0.1-0.4
                    8, 6
                );
                
                const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
                stone.scale.y = 0.6; // Flatten the stones
                
                stone.position.set(
                    6.5 + Math.random() * 3, // Along the river
                    0.05,
                    (Math.random() - 0.5) * 18 + segment * 20 - 40 // Random position along length
                );
                
                stone.castShadow = true;
                stone.receiveShadow = true;
                this.scene.add(stone);
                this.riverStones.push(stone);
            }
        }
        
        // Add river stones to environment objects
        this.environmentObjects.push(...this.riverStones);
    }
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 2, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 15;
        this.controls.minDistance = 2;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Help modal functionality
        this.setupHelpModal();
        
        // Mouse events for character rotation
        this.canvas.addEventListener('mousedown', (event) => {
            if (event.button === 2) { // Right mouse button
                this.isRightMouseDown = true;
                this.controls.enabled = false;
                event.preventDefault();
            }
        });
        
        this.canvas.addEventListener('mouseup', (event) => {
            if (event.button === 2) { // Right mouse button
                this.isRightMouseDown = false;
                this.controls.enabled = true;
                event.preventDefault();
            }
        });
        
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.isRightMouseDown) {
                const deltaX = event.movementX || 0;
                this.character.rotation.y -= deltaX * 0.01 * this.characterRotationSpeed;
                event.preventDefault();
            }
        });
        
        // Disable context menu on right click
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    setupHelpModal() {
        const helpButton = document.getElementById('help-button');
        const modal = document.getElementById('help-modal');
        const closeBtn = document.querySelector('.close');
        
        // Open modal
        helpButton.addEventListener('click', () => {
            modal.style.display = 'block';
        });
        
        // Close modal with X button
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }

    animateWalk() {
        const elapsedTime = this.clock.getElapsedTime();
        const walkSpeed = 4;
        const armAmplitude = 0.4;
        const legAmplitude = 0.5;
        const bodyBobAmplitude = 0.08;
        const headBobAmplitude = 0.03;
        
        // Arm swinging (opposite to legs) - more natural movement
        this.leftArm.rotation.x = Math.sin(elapsedTime * walkSpeed + Math.PI) * armAmplitude;
        this.rightArm.rotation.x = Math.sin(elapsedTime * walkSpeed) * armAmplitude;
        
        // Leg swinging - more pronounced for realistic walking
        this.leftLeg.rotation.x = Math.sin(elapsedTime * walkSpeed) * legAmplitude;
        this.rightLeg.rotation.x = Math.sin(elapsedTime * walkSpeed + Math.PI) * legAmplitude;
        
        // Body bobbing - vertical movement during walk
        this.body.position.y = 1.2 + Math.sin(elapsedTime * walkSpeed * 2) * bodyBobAmplitude;
        
        // Head bobbing - follows body movement but more subtle
        this.head.position.y = 2.4 + Math.sin(elapsedTime * walkSpeed * 2) * headBobAmplitude;
        
        // Subtle body sway for more natural walking
        this.body.rotation.z = Math.sin(elapsedTime * walkSpeed) * 0.03;
        
        // Slight forward lean during walk
        this.character.rotation.x = Math.sin(elapsedTime * walkSpeed * 2) * 0.02;
        
        // Animate water if it exists
        if (this.water) {
            this.water.material.map.offset.y = elapsedTime * 0.25;
        }
    }
    
    animateInfiniteScroll() {
        const deltaTime = this.clock.getDelta();
        const currentTime = this.clock.getElapsedTime();
        
        // Check if it's time to turn around (every walkDuration seconds)
        if (!this.isTurning && (currentTime - this.lastTurnTime) >= this.walkDuration) {
            this.isTurning = true;
            this.turnStartTime = currentTime;
        }
        
        // Handle turning animation
        if (this.isTurning) {
            const turnProgress = (currentTime - this.turnStartTime) / this.turnDuration;
            
            if (turnProgress >= 1.0) {
                // Turn completed
                this.isTurning = false;
                this.movementDirection *= -1; // Reverse direction
                this.lastTurnTime = currentTime;
                this.character.rotation.y = this.movementDirection === 1 ? 0 : Math.PI;
            } else {
                // Animate the turn
                const startRotation = this.movementDirection === 1 ? 0 : Math.PI;
                const endRotation = this.movementDirection === 1 ? Math.PI : 0;
                this.character.rotation.y = startRotation + (endRotation - startRotation) * turnProgress;
                return; // Don't move environment while turning
            }
        }
        
        // Move all environment objects backward (except character)
        this.environmentObjects.forEach(obj => {
            if (obj !== this.character) {
                obj.position.z -= this.movementSpeed * deltaTime * this.movementDirection;
                
                // Reset position when object goes too far back or forward
                if (this.movementDirection === 1 && obj.position.z < -60) {
                    obj.position.z += 100; // Move to front
                } else if (this.movementDirection === -1 && obj.position.z > 40) {
                    obj.position.z -= 100; // Move to back
                }
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate = () => {
        requestAnimationFrame(this.animate);
        
        this.animateWalk();
        this.animateInfiniteScroll();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new MinecraftCharacter();
});