import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Module-scoped variables ---
let currentModalCategory = '';
let uniqueIdCounter = Date.now();
let fridgeContents = loadFridgeContents(); // Must be declared before DOMContentLoaded

// Define foodCategoriesDataRef globally for helper functions
const foodCategoriesDataRef = { 
    "육류": { "닭고기": 3, "소고기": 4, "돼지고기": 5, "오리고기": 6, "양고기": 4, "베이컨": 7, "소시지": 14, "햄": 5 },
    "채소류": { "감자": 30, "배추": 10, "버섯": 7, "브로콜리": 5, "상추": 7, "시금치": 7, "양파": 90, "토마토": 10, "파": 7, "피망": 10, "콩나물": 3, "오이": 7, "당근": 21, "가지": 7, "호박": 14, "고구마": 30, "무": 14 },
    "과일류": { "딸기": 5, "바나나": 7, "사과": 30, "오렌지": 20, "자몽": 14, "포도": 7, "수박": 7, "멜론": 7, "복숭아": 5, "체리": 5, "블루베리": 7, "키위": 14 },
    "유제품": { "우유": 7, "요거트": 14, "치즈": 60, "버터": 30, "생크림": 7 },
    "해산물": { "고등어": 3, "새우": 2, "오징어": 3, "명태": 4, "갈치": 3, "조개": 2, "굴": 5 },
    "곡물/견과류": { "쌀": 365, "보리": 365, "아몬드": 180, "호두": 180, "땅콩": 180, "빵": 5, "라면": 180 },
    "반찬류": { "김치": 180, "단무지": 30, "장아찌": 365, "어묵": 7, "맛살": 7 },
    "기타": { "달걀": 21, "두부": 7, "마늘": 60, "소스": 90, "잼": 60, "꿀": 365, "초콜릿": 180, "케첩": 365 }
};

// Global helper functions for localStorage
function loadFridgeContents() {
    const storedContents = localStorage.getItem('myFridgeContents');
    return storedContents ? JSON.parse(storedContents) : [];
}

function saveFridgeContents() {
    localStorage.setItem('myFridgeContents', JSON.stringify(fridgeContents));
}


document.addEventListener('DOMContentLoaded', () => {
    // --- 3D Setup ---
    let scene, camera, renderer, controls;
    let fridgeModel, topDoor, bottomDoor, topFoodItemsGroup, bottomFoodItemsGroup;
    let raycaster, pointer; // For click detection on 3D objects
    
    // State variables
    let isTopDoorOpen = false;
    let isBottomDoorOpen = false;
    let topAutoCloseTimer = null; // Timer to automatically close the top door
    let bottomAutoCloseTimer = null; // Timer to automatically close the bottom door
    let selectedFoodMesh = null; // Store the currently selected food mesh

    const pointerDownPos = new THREE.Vector2();
    let isPointerDown = false;
    let previousPointerPos = { x: 0, y: 0 };


    // Constants
    const doorOpenAngle = Math.PI / 2 * 1.1; // Outward opening
    const doorClosedAngle = 0;
    
    // Make these non-const so they can be modified by the slider initialization
    let cameraLookInsidePos = new THREE.Vector3(0, 0, 0); // Adjusted camera position for inside view (x, y will be dynamic)
    let cameraInitialPos = new THREE.Vector3(4, 3, 5); // Base position, Z will be updated by slider
    let lookAtTargetOutside = new THREE.Vector3(0, 0, 0);
    // Modified to look at the same point as outside for now to prevent zoom
    let lookAtTargetInside = new THREE.Vector3(0, 0, 0); 

    const fridgeContainer = document.querySelector('.fridge-container');

    // Fridge dimensions and wall thickness (accessible globally within DOMContentLoaded scope)
    const fridgeWidth = 2.5, fridgeHeight = 4, fridgeDepth = 2;
    const wallThickness = 0.05;

    function initThreeJS() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f5f9);

        camera = new THREE.PerspectiveCamera(50, fridgeContainer.clientWidth / (fridgeContainer.clientHeight || 500), 0.1, 1000);
        camera.position.copy(cameraInitialPos);

        renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(fridgeContainer.clientWidth, fridgeContainer.clientHeight || 500);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        fridgeContainer.insertBefore(renderer.domElement, fridgeContainer.firstChild);

        raycaster = new THREE.Raycaster();
        pointer = new THREE.Vector2();


        // --- Materials ---
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.5 }); // All white exterior as requested, render only FrontSide by default
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0xADD8E6, metalness: 0.2, roughness: 0.5 }); // Distinct material for door
        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 1.0, roughness: 0.3 });
        const interiorWallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.FrontSide }); // White interior, ensure shading
        const interiorShelfMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 }); // Gray for shelves

        // --- Fridge Model ---
        fridgeModel = new THREE.Group();
        
        // Create the outer shell (5 sides, no front)
        // Back Wall (Outer)
        const outerBackWall = new THREE.Mesh(new THREE.BoxGeometry(fridgeWidth, fridgeHeight, wallThickness), bodyMaterial);
        outerBackWall.position.z = -fridgeDepth / 2;
        outerBackWall.castShadow = true;
        outerBackWall.receiveShadow = true;
        fridgeModel.add(outerBackWall);

        // Left Wall (Outer)
        const outerLeftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, fridgeHeight, fridgeDepth), bodyMaterial);
        outerLeftWall.position.x = -fridgeWidth / 2;
        outerLeftWall.castShadow = true;
        outerLeftWall.receiveShadow = true;
        fridgeModel.add(outerLeftWall);
        
        // Right Wall (Outer)
        const outerRightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, fridgeHeight, fridgeDepth), bodyMaterial);
        outerRightWall.position.x = fridgeWidth / 2;
        outerRightWall.castShadow = true;
        outerRightWall.receiveShadow = true;
        fridgeModel.add(outerRightWall);

        // Top Wall (Outer)
        const outerTopWall = new THREE.Mesh(new THREE.BoxGeometry(fridgeWidth, wallThickness, fridgeDepth), bodyMaterial);
        outerTopWall.position.y = fridgeHeight / 2;
        outerTopWall.castShadow = true;
        outerTopWall.receiveShadow = true;
        fridgeModel.add(outerTopWall);

        // Bottom Wall (Outer)
        const outerBottomWall = new THREE.Mesh(new THREE.BoxGeometry(fridgeWidth, wallThickness, fridgeDepth), bodyMaterial);
        outerBottomWall.position.y = -fridgeHeight / 2;
        outerBottomWall.castShadow = true;
        outerBottomWall.receiveShadow = true;
        fridgeModel.add(outerBottomWall);

        // Top Fridge Section
        const topFridgeHeight = fridgeHeight / 2;
        // The top/bottom body parts are now just for positioning.
        // Outer walls already created.

        // Top Interior Walls
        createInteriorWalls(fridgeWidth, topFridgeHeight, fridgeDepth, wallThickness, interiorWallMaterial, topFridgeHeight / 2, fridgeModel);
        topFoodItemsGroup = new THREE.Group();
        fridgeModel.add(topFoodItemsGroup);


        // Top Door
        topDoor = new THREE.Group();
        topDoor.position.set(fridgeWidth / 2, topFridgeHeight / 2, fridgeDepth / 2); // Pivot top door
        topDoor.userData.name = "topDoor"; // Identifier for raycasting
        fridgeModel.add(topDoor);

        const topDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(fridgeWidth, topFridgeHeight, 0.1), doorMaterial);
        topDoorMesh.position.set(-fridgeWidth / 2, 0, 0.05);
        topDoorMesh.castShadow = true;
        topDoor.add(topDoorMesh);
        
        const topHandle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), handleMaterial);
        topHandle.position.set(-fridgeWidth / 2 + 0.1, 0, 0.15);
        topDoor.add(topHandle);
        topDoor.children.push(topDoorMesh); // Add mesh to door group for raycasting


        // Bottom Fridge Section
        const bottomFridgeHeight = fridgeHeight / 2;
        // Outer walls already created.
        
        // Bottom Interior Walls
        createInteriorWalls(fridgeWidth, bottomFridgeHeight, fridgeDepth, wallThickness, interiorWallMaterial, -bottomFridgeHeight / 2, fridgeModel);
        bottomFoodItemsGroup = new THREE.Group();
        fridgeModel.add(bottomFoodItemsGroup);


        // Bottom Door
        bottomDoor = new THREE.Group();
        bottomDoor.position.set(fridgeWidth / 2, -bottomFridgeHeight / 2, fridgeDepth / 2); // Pivot bottom door
        bottomDoor.userData.name = "bottomDoor"; // Identifier for raycasting
        fridgeModel.add(bottomDoor);

        const bottomDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(fridgeWidth, bottomFridgeHeight, 0.1), doorMaterial);
        bottomDoorMesh.position.set(-fridgeWidth / 2, 0, 0.05);
        bottomDoorMesh.castShadow = true;
        bottomDoor.add(bottomDoorMesh);
        
        const bottomHandle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), handleMaterial);
        bottomHandle.position.set(-fridgeWidth / 2 + 0.1, 0, 0.15);
        bottomDoor.add(bottomHandle);
        bottomDoor.children.push(bottomDoorMesh); // Add mesh to door group for raycasting

        scene.add(fridgeModel); // Add the entire fridge model to the scene


        // Shelf between top and bottom sections
        const shelfThickness = 0.05;
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(fridgeWidth - wallThickness * 2, shelfThickness, fridgeDepth - wallThickness * 2), interiorShelfMaterial);
        shelf.position.y = 0; // Exactly at the middle
        shelf.receiveShadow = true;
        fridgeModel.add(shelf);


        // Helper function to create interior walls for a section
        function createInteriorWalls(sectionWidth, sectionHeight, sectionDepth, thickness, material, yOffset, parentGroup) {
            // Back Wall
            const backWall = new THREE.Mesh(new THREE.BoxGeometry(sectionWidth - thickness * 2, sectionHeight - thickness * 2, thickness), material);
            backWall.position.set(0, yOffset, -sectionDepth / 2 + thickness * 1.5); // Shifted inwards more
            backWall.receiveShadow = true;
            parentGroup.add(backWall);

            // Left Wall
            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, sectionHeight - thickness * 2, sectionDepth - thickness * 2), material);
            leftWall.position.set(-sectionWidth / 2 + thickness * 1.5, yOffset, 0); // Shifted inwards more
            leftWall.receiveShadow = true;
            parentGroup.add(leftWall);
            
            // Right Wall
            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, sectionHeight - thickness * 2, sectionDepth - thickness * 2), material);
            rightWall.position.set(sectionWidth / 2 - thickness * 1.5, yOffset, 0); // Shifted inwards more
            rightWall.receiveShadow = true;
            parentGroup.add(rightWall);

            // Top Wall (relative to section)
            const topWall = new THREE.Mesh(new THREE.BoxGeometry(sectionWidth - thickness * 2, thickness, sectionDepth - thickness * 2), material);
            topWall.position.set(0, yOffset + sectionHeight / 2 - thickness * 1.5, 0); // Shifted inwards more
            topWall.receiveShadow = true;
            parentGroup.add(topWall);

            // Bottom Wall (relative to section)
            const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(sectionWidth - thickness * 2, thickness, sectionDepth - thickness * 2), material);
            bottomWall.position.set(0, yOffset - sectionHeight / 2 + thickness * 1.5, 0); // Shifted inwards more
            bottomWall.receiveShadow = true;
            parentGroup.add(bottomWall);
        }
        
        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Adjusted ambient light slightly
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Adjusted intensity
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Add interior lights for each section
        const topInteriorLight = new THREE.PointLight(0xffffff, 5.0, 10); // White light, increased intensity
        topInteriorLight.position.set(0, fridgeHeight / 2 - 0.5, fridgeDepth / 2 - 0.5); // Top-front of top interior
        topInteriorLight.castShadow = true;
        fridgeModel.add(topInteriorLight);

        const bottomInteriorLight = new THREE.PointLight(0xffffff, 5.0, 10); // White light, increased intensity
        bottomInteriorLight.position.set(0, -fridgeHeight / 2 + 0.5, fridgeDepth / 2 - 0.5); // Top-front of bottom interior
        bottomInteriorLight.castShadow = true;
        fridgeModel.add(bottomInteriorLight);


        // --- Controls ---
        // OrbitControls is created but completely disabled to isolate animation
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enabled = false;
        
        // --- Animation Loop ---
        function animate() {
            requestAnimationFrame(animate);
            
            const topDoorTargetAngle = isTopDoorOpen ? doorOpenAngle : doorClosedAngle;
            topDoor.rotation.y = THREE.MathUtils.lerp(topDoor.rotation.y, topDoorTargetAngle, 0.1);
            
            const bottomDoorTargetAngle = isBottomDoorOpen ? doorOpenAngle : doorClosedAngle;
            bottomDoor.rotation.y = THREE.MathUtils.lerp(bottomDoor.rotation.y, bottomDoorTargetAngle, 0.1);

            // Dynamically calculate camera target position to prevent zoom on door open
            let targetCameraPosition;
            let targetLookAt;
            if (isTopDoorOpen || isBottomDoorOpen) {
                targetCameraPosition = cameraLookInsidePos; // Use the pre-calculated internal view position
                targetLookAt = lookAtTargetInside;
            } else {
                targetCameraPosition = cameraInitialPos; // Use the initial external view position
                targetLookAt = lookAtTargetOutside;
            }
            camera.position.lerp(targetCameraPosition, 0.1);
            camera.lookAt(targetLookAt);

            renderer.render(scene, camera);
        }
        animate();

        // --- Event Listeners ---
        window.addEventListener('resize', onWindowResize, false);
        renderer.domElement.addEventListener('pointerdown', onPointerDown, false);
        renderer.domElement.addEventListener('pointermove', onPointerMove, false);
        renderer.domElement.addEventListener('pointerup', onPointerUp, false);
    }

    function onWindowResize() {
        if(camera && renderer && fridgeContainer) {
            camera.aspect = fridgeContainer.clientWidth / (fridgeContainer.clientHeight || 500);
            camera.updateProjectionMatrix();
            renderer.setSize(fridgeContainer.clientWidth, fridgeContainer.clientHeight || 500);
        }
    }
    
    // Functions for food item selection/deselection
    function selectFoodItem(mesh) {
        if (selectedFoodMesh) {
            unselectFoodItem();
        }
        selectedFoodMesh = mesh;
        // Highlight the selected mesh
        if (selectedFoodMesh.material.emissive) { 
            selectedFoodMesh.material.emissive.setHex(0x00ff00); // Green highlight
        }
    }

    function unselectFoodItem() {
        if (selectedFoodMesh) {
            // Restore original color (turn off emissive)
            if (selectedFoodMesh.material.emissive) {
                selectedFoodMesh.material.emissive.setHex(0x000000); 
            }
            selectedFoodMesh = null;
        }
    }

    function moveFoodItemToCompartment(foodItemId, targetGroup) {
        const itemToMove = fridgeContents.find(item => item.id === foodItemId);
        if (!itemToMove) return;

        // Determine the current group of the item
        const currentGroup = itemToMove.category === "과일류" || itemToMove.category === "유제품" || itemToMove.category === "채소류" ? topFoodItemsGroup : bottomFoodItemsGroup;

        // If trying to move to the same group, do nothing.
        if (currentGroup === targetGroup) {
            return;
        }

        // Update the item's category in the data to force it into the new targetGroup on re-render
        if (targetGroup === topFoodItemsGroup) {
            // Assign a category that would naturally go to topFoodItemsGroup (e.g., first available)
            itemToMove.category = "과일류"; 
        } else { // targetGroup === bottomFoodItemsGroup
            itemToMove.category = "육류"; // Assign a category that would naturally go to bottomFoodItemsGroup
        }

        saveFridgeContents();
        render3dFridgeContents(); // Re-render all items to apply new positions
    }


    function onPointerDown(event) {
        isPointerDown = true;
        pointerDownPos.set(event.clientX, event.clientY);
        previousPointerPos.x = event.clientX;
        previousPointerPos.y = event.clientY;
    }

    function onPointerMove(event) {
        if (!isPointerDown) return;

        const deltaX = event.clientX - previousPointerPos.x;
        const rotationSpeed = 0.005;

        // Rotate the entire fridge model
        fridgeModel.rotation.y += deltaX * rotationSpeed;

        previousPointerPos.x = event.clientX;
        previousPointerPos.y = event.clientY;
    }


    function onPointerUp(event) {
        isPointerDown = false;
        const pointerUpPos = new THREE.Vector2(event.clientX, event.clientY);
        // It's a click if the mouse hasn't moved much
        if (pointerDownPos.distanceTo(pointerUpPos) < 5) { 
            // Raycast to detect which door or food item was clicked
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            // Include all food meshes from both groups, flatten the array for intersectObjects
            const allFoodMeshes = [...topFoodItemsGroup.children.filter(child => child.isMesh), ...bottomFoodItemsGroup.children.filter(child => child.isMesh)];
            const intersectableObjects = [...allFoodMeshes, topDoor.children[0], bottomDoor.children[0]]; // topDoor.children[0] is the actual mesh

            const intersects = raycaster.intersectObjects(intersectableObjects, true); // Intersect with door groups and food meshes

            if (intersects.length > 0) {
                const clickedObject = intersects[0].object;
                
                // Check if a door was clicked
                if (clickedObject.parent === topDoor || clickedObject.parent === bottomDoor) {
                    const parentDoor = clickedObject.parent.userData.name;
                    if (selectedFoodMesh) {
                        // Move selected item to the other compartment
                        const targetCompartmentGroup = (parentDoor === "topDoor") ? bottomFoodItemsGroup : topFoodItemsGroup;
                        moveFoodItemToCompartment(selectedFoodMesh.userData.id, targetCompartmentGroup);
                        unselectFoodItem(); // Unselect after moving
                    } else {
                        // Open/close door
                        if (parentDoor === "topDoor") {
                            if (topAutoCloseTimer) { clearTimeout(topAutoCloseTimer); topAutoCloseTimer = null; }
                            isTopDoorOpen = !isTopDoorOpen;
                        } else if (parentDoor === "bottomDoor") {
                            if (bottomAutoCloseTimer) { clearTimeout(bottomAutoCloseTimer); bottomAutoCloseTimer = null; }
                            isBottomDoorOpen = !isBottomDoorOpen;
                        }
                    }
                } else if (clickedObject.isMesh) { // A food item mesh was clicked
                    if (selectedFoodMesh === clickedObject) {
                        // Clicked the same selected item, unselect it
                        unselectFoodItem();
                    } else {
                        // Select a new item
                        if (selectedFoodMesh) unselectFoodItem(); // Unselect previous
                        selectFoodItem(clickedObject);
                    }
                }
            } else { // Clicked empty space
                if (selectedFoodMesh) unselectFoodItem(); // Unselect if clicked elsewhere
            }
        }
    }

    // --- 3D Food Management ---
    const foodGeometries = {
        "육류": new THREE.BoxGeometry(0.3, 0.1, 0.4),
        "채소류": new THREE.SphereGeometry(0.15, 16, 16),
        "과일류": new THREE.SphereGeometry(0.12, 16, 16),
        "유제품": new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16),
        "해산물": new THREE.CapsuleGeometry(0.1, 0.2, 8, 16),
        "기타": new THREE.BoxGeometry(0.2, 0.2, 0.2),
    };
    const foodMaterials = {
        "육류": new THREE.MeshStandardMaterial({ color: 0xc97a63, roughness: 0.8 }),
        "채소류": new THREE.MeshStandardMaterial({ color: 0x5aab61, roughness: 0.7 }),
        "과일류": new THREE.MeshStandardMaterial({ color: 0xf06a6a, roughness: 0.6 }),
        "유제품": new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
        "해산물": new THREE.MeshStandardMaterial({ color: 0x86a5d1, roughness: 0.7 }),
        "기타": new THREE.MeshStandardMaterial({ color: 0xad8b67, roughness: 0.8 }),
    };

    function getFoodCategory(foodName) {
        for (const category in foodCategoriesDataRef) {
            if (foodCategoriesDataRef[category][foodName]) {
                return category;
            }
        }
        return "기타";
    }

    function createFoodMesh(item) {
        const category = getFoodCategory(item.name);
        const geometry = foodGeometries[category] || new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = foodMaterials[category] || new THREE.MeshStandardMaterial({ color: 0xad8b67 });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.userData.id = item.id;
        mesh.name = item.name;
        
        return mesh;
    }

    // Helper function to create a text sprite
    function makeTextSprite(message, parameters) {
        if (parameters === undefined) parameters = {};
        const fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
        const fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 20; // Further reduced fontsize
        const borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 2;
        const borderColor = parameters.hasOwnProperty("borderColor") ? parameters["borderColor"] : { r: 0, g: 0, b: 0, a: 1.0 };
        const backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : { r: 255, g: 255, b: 255, a: 1.0 };
        const textColor = parameters.hasOwnProperty("textColor") ? parameters["textColor"] : { r: 0, g: 0, b: 0, a: 1.0 };

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = "Bold " + fontsize + "px " + fontface;
        
        // get size from context.measureText()
        const metrics = context.measureText(message);
        const textWidth = metrics.width;

        const textPadding = 2; // Further reduced internal padding

        // Adjust canvas dimensions for text and border
        const canvasWidth = textWidth + textPadding * 2 + borderThickness * 2;
        const canvasHeight = fontsize + textPadding * 2 + borderThickness * 2; 
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // background color
        context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
        // border color
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

        context.lineWidth = borderThickness;
        roundRect(context, borderThickness / 2, borderThickness / 2, canvasWidth - borderThickness, canvasHeight - borderThickness, 6);

        // text color
        context.fillStyle = "rgba(" + textColor.r + ", " + textColor.g + ", " + textColor.b + ", 1.0)";
        context.fillText(message, borderThickness + textPadding, fontsize + borderThickness + textPadding);

        // canvas contents will be used for a texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true; // Added for good measure

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Scale the sprite so that X pixels on canvas = 1 unit in 3D world
        const scaleFactor = 0.01; // e.g., 1 unit = 100 pixels, so 100px text is 1 unit tall.
        sprite.scale.set(canvasWidth * scaleFactor, canvasHeight * scaleFactor, 1); 

        return sprite;
    }

    // function for drawing rounded rectangles
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    function render3dFridgeContents() {
        // Clear both groups
        while(topFoodItemsGroup.children.length > 0){ 
            topFoodItemsGroup.remove(topFoodItemsGroup.children[0]); 
        }
        while(bottomFoodItemsGroup.children.length > 0){ 
            bottomFoodItemsGroup.remove(bottomFoodItemsGroup.children[0]); 
        }
        
        // Distribute items between top and bottom for initial rendering
        fridgeContents.forEach(item => {
            add3dFoodItem(item, false); // This now decides which group to add to
        });
    }

    function add3dFoodItem(item, animateOpen) {
        const foodMesh = createFoodMesh(item);
        
        foodMesh.geometry.computeBoundingBox();
        const meshSize = new THREE.Vector3();
        foodMesh.geometry.boundingBox.getSize(meshSize);

        const actualItemWidth = meshSize.x;
        const actualItemHeight = meshSize.y;
        const actualItemDepth = meshSize.z;
        
        // Decide which section to add the food to (e.g., based on category or just alternate)
        // For simplicity, let's alternate or put all in top for now.
        // A more robust solution would categorize.
        const targetGroup = (item.category === "과일류" || item.category === "유제품" || item.category === "채소류") ? topFoodItemsGroup : bottomFoodItemsGroup;

        // Position items within their respective group's coordinate system
        // Position items within their respective group's coordinate system
        const index = targetGroup.children.length;
        const padding = 0.1; // Padding between items and walls

        const actualItemWidthWithPadding = actualItemWidth + padding;
        const xAvailable = fridgeWidth - 2 * wallThickness - 2 * padding;
        const numCols = Math.floor(xAvailable / actualItemWidthWithPadding);

        const availableHeight = (fridgeHeight / 2) - (2 * wallThickness);
        const actualItemHeightWithPadding = actualItemHeight + padding;
        const maxRowsPerLayer = Math.floor(availableHeight / actualItemHeightWithPadding);

        const maxItemsPerLayer = numCols * maxRowsPerLayer;

        const layer = Math.floor(index / maxItemsPerLayer);
        const row = Math.floor((index % maxItemsPerLayer) / numCols);
        const col = index % numCols;
        
        // X position: Arrange items horizontally, centered in the fridge width
        const x = - (xAvailable / 2) + padding + actualItemWidth / 2 + col * actualItemWidthWithPadding;

        // Y position: Arrange items vertically, stacking from bottom
        let y;
        if (targetGroup === topFoodItemsGroup) {
            // Bottom of top section is y=0 (shelf) + wallThickness
            const y_bottom_limit_top = wallThickness + padding + actualItemHeight / 2;
            y = y_bottom_limit_top + row * actualItemHeightWithPadding;
        } else { // bottomFoodItemsGroup
            // Bottom of bottom section is -fridgeHeight/2 + wallThickness
            const y_bottom_limit_bottom = -fridgeHeight / 2 + wallThickness + padding + actualItemHeight / 2;
            y = y_bottom_limit_bottom + row * actualItemHeightWithPadding;
        }

        // Z position: Arrange items in layers from front to back
        const actualItemDepthWithPadding = actualItemDepth + padding;
        const zAvailable = fridgeDepth - 2 * wallThickness - 2 * padding;
        const maxZInInterior = (fridgeDepth / 2) - wallThickness - padding - actualItemDepth / 2; // Front-most position for item center
        const z = maxZInInterior - layer * actualItemDepthWithPadding;
        
        foodMesh.position.set(x, y, z);
        
        // Create and position the text sprite
        const foodNameSprite = makeTextSprite(item.name, { fontsize: 32, backgroundColor: { r: 255, g: 255, b: 255, a: 0.6 } });
        
        // Position the sprite so its bottom edge aligns with the top of the food item
        const sprite3DHeight = foodNameSprite.scale.y;
        foodNameSprite.position.set(0, actualItemHeight / 2 + sprite3DHeight / 2, 0); 
        foodMesh.add(foodNameSprite);
        
        targetGroup.add(foodMesh);
        
        if (animateOpen) { // Animate open if specifically requested
            if (targetGroup === topFoodItemsGroup && !isTopDoorOpen) {
                isTopDoorOpen = true;
                if (topAutoCloseTimer) clearTimeout(topAutoCloseTimer);
                topAutoCloseTimer = setTimeout(() => {
                    isTopDoorOpen = false;
                    topAutoCloseTimer = null;
                }, 2000);
            } else if (targetGroup === bottomFoodItemsGroup && !isBottomDoorOpen) {
                isBottomDoorOpen = true;
                if (bottomAutoCloseTimer) clearTimeout(bottomAutoCloseTimer);
                bottomAutoCloseTimer = setTimeout(() => {
                    isBottomDoorOpen = false;
                    bottomAutoCloseTimer = null;
                }, 2000);
            }
        }
    }
    
    function remove3dFoodItem(itemId) {
        let objectToRemove = topFoodItemsGroup.children.find(child => child.userData.id === itemId);
        if (!objectToRemove) {
            objectToRemove = bottomFoodItemsGroup.children.find(child => child.userData.id === itemId);
        }
        
        if (objectToRemove) {
            if (objectToRemove.parent === topFoodItemsGroup) {
                topFoodItemsGroup.remove(objectToRemove);
            } else {
                bottomFoodItemsGroup.remove(objectToRemove);
            }
            render3dFridgeContents(); // Re-pack items
        }
    }

    // --- Original Application Logic (MODIFIED) ---
    const foodCategoriesContainer = document.getElementById('foodCategories');
    const clearAllItemsBtn = document.getElementById('clearAllItemsBtn');
    const foodSelectionModal = document.getElementById('foodSelectionModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalCategoryTitle = document.getElementById('modalCategoryTitle');
    const modalFoodItems = document.getElementById('modalFoodItems');
    const addSelectedFoodsBtn = document.getElementById('addSelectedFoodsBtn');
    const currentDateDisplay = document.getElementById('currentDateDisplay');
    const suggestRecipeBtn = document.getElementById('suggestRecipeBtn');


    function addFoodToFridge(categoryName, foodName, quantity = 1) {
        const existingItem = fridgeContents.find(item => item.name === foodName);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            const newItem = {
                id: uniqueIdCounter++,
                name: foodName,
                quantity: quantity,
                category: categoryName,
            };
            fridgeContents.push(newItem);
            add3dFoodItem(newItem, true);
        }
        saveFridgeContents();
    }

    function clearAllItems() {
        if (confirm("냉장고 안의 모든 음식을 삭제하시겠습니까?")) {
            fridgeContents = [];
            saveFridgeContents();
            render3dFridgeContents();
            isTopDoorOpen = true; // Open the door to show it's empty
            isBottomDoorOpen = true; // Open the door to show it's empty
        }
    }

    // --- UI Population and Event Listeners (Mostly unchanged) ---
    function renderFoodCategories() {
        foodCategoriesContainer.innerHTML = '';
        Object.keys(foodCategoriesDataRef).forEach(categoryName => {
            const categoryDiv = document.createElement('div');
            categoryDiv.classList.add('food-category-select');
            categoryDiv.textContent = categoryName;
            categoryDiv.dataset.category = categoryName;
            foodCategoriesContainer.appendChild(categoryDiv);
        });

        foodCategoriesContainer.addEventListener('click', (e) => {
            const clickedCategory = e.target.closest('.food-category-select');
            if (clickedCategory) {
                openFoodSelectionModal(clickedCategory.dataset.category);
            }
        });
    }

    function openFoodSelectionModal(categoryName) {
        currentModalCategory = categoryName;
        modalCategoryTitle.textContent = `${categoryName} 선택`;
        modalFoodItems.innerHTML = '';
        const foodItems = foodCategoriesDataRef[categoryName];
        
        if (!foodItems) {
            return;
        }

        Object.keys(foodItems).sort((a, b) => a.localeCompare(b, 'ko-KR')).forEach(foodName => {
            const foodItemDiv = document.createElement('div');
            foodItemDiv.classList.add('food-item-select');
            foodItemDiv.dataset.food = foodName;
            foodItemDiv.innerHTML = `<span>${foodName}</span><div class="quantity-control"><button class="quantity-btn minus-btn" data-action="minus">-</button><input type="number" class="quantity-input" value="1" min="1"><button class="quantity-btn plus-btn" data-action="plus">+</button></div>`;
            modalFoodItems.appendChild(foodItemDiv);
        });
        foodSelectionModal.style.display = 'flex';
    }
    
    function closeFoodSelectionModal() { foodSelectionModal.style.display = 'none'; }
    function updateDateDisplay() {
        const now = new Date();
        currentDateDisplay.textContent = `${now.getFullYear()}년 ${(now.getMonth() + 1).toString().padStart(2, '0')}월 ${now.getDate().toString().padStart(2, '0')}일`;
    }

    addSelectedFoodsBtn.addEventListener('click', () => {
        modalFoodItems.querySelectorAll('.food-item-select.selected-modal-item').forEach(item => {
            addFoodToFridge(item.dataset.category, item.dataset.food, parseInt(item.querySelector('.quantity-input').value));
        });
        closeFoodSelectionModal();
    });

    clearAllItemsBtn.addEventListener('click', clearAllItems);
    closeModalBtn.addEventListener('click', closeFoodSelectionModal);

    modalFoodItems.addEventListener('click', (e) => {
        if (e.target.closest('.quantity-control')) return;
        const foodItem = e.target.closest('.food-item-select');
        if (foodItem) foodItem.classList.toggle('selected-modal-item');
    });
     modalFoodItems.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('quantity-btn')) {
             const quantityInput = target.parentNode.querySelector('.quantity-input');
            let quantity = parseInt(quantityInput.value);
            if (target.dataset.action === 'minus') quantity = Math.max(1, quantity - 1);
            else if (target.dataset.action === 'plus') quantity += 1;
            quantityInput.value = quantity;
        }
    });

    // --- Initial Load ---
    function initialLoad() {
        initThreeJS();
        render3dFridgeContents();
        renderFoodCategories();
        updateDateDisplay();

        // Initialize and handle camera zoom slider
        const cameraZoomSlider = document.getElementById('cameraZoomSlider');
        const cameraZoomValue = document.getElementById('cameraZoomValue');

        // Initial setup for slider and camera
        let currentZoomLevel = parseFloat(cameraZoomSlider.value); // 20-100
        cameraZoomValue.textContent = `${currentZoomLevel}%`;
        
        // Map slider value (20-100) to camera Z position (e.g., 2.0 to 7.0)
        const mapSliderToCameraZ = (sliderValue) => {
            const minSlider = 20;
            const maxSlider = 100;
            const minCameraZ = 2.0; // Closest zoom (most zoomed in)
            const maxCameraZ = 7.0; // Farthest zoom (most zoomed out)
            return maxCameraZ - ((sliderValue - minSlider) / (maxSlider - minSlider)) * (maxCameraZ - minCameraZ);
        };
        
        let initialCameraZ = mapSliderToCameraZ(currentZoomLevel);
        
        // Update initial camera positions based on slider
        cameraInitialPos.set(4, 3, initialCameraZ);
        
        // Calculate the initial distance from external camera position to external look-at target
        const initialDistance = cameraInitialPos.distanceTo(lookAtTargetOutside);

        // Define a base internal camera position (relative to lookAtTargetInside, which is (0,0,0))
        // This is a fixed point to aim for when looking inside.
        // E.g., slightly above the center of the fridge, and slightly in front.
        let baseInternalCameraPos = new THREE.Vector3(0, 0.5, 2.5); // Adjust these values for optimal internal view

        // Calculate the vector from lookAtTargetInside to baseInternalCameraPos
        let internalVector = baseInternalCameraPos.clone().sub(lookAtTargetInside);

        // Normalize this vector and scale it by the initialDistance to maintain zoom level
        cameraLookInsidePos.copy(lookAtTargetInside).add(internalVector.normalize().multiplyScalar(initialDistance));


        cameraZoomSlider.addEventListener('input', (event) => {
            currentZoomLevel = parseFloat(event.target.value);
            cameraZoomValue.textContent = `${currentZoomLevel}%`;
            
            const newCameraZ = mapSliderToCameraZ(currentZoomLevel);
            
            // Update cameraInitialPos.z based on slider
            cameraInitialPos.z = newCameraZ;

            // Recalculate cameraLookInsidePos to maintain consistent distance
            const currentInitialDistance = cameraInitialPos.distanceTo(lookAtTargetOutside);
            let baseInternalCameraPos = new THREE.Vector3(0, 0.5, 2.5); // Use the same base as in initialLoad
            let internalVector = baseInternalCameraPos.clone().sub(lookAtTargetInside);
            cameraLookInsidePos.copy(lookAtTargetInside).add(internalVector.normalize().multiplyScalar(currentInitialDistance));
        });
    }

    initialLoad();
});