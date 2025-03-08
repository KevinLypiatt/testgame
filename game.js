const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Maze settings
const gridSize = 10; // Number of cells in the grid (10x10)
const cellSize = 40; // Size of each cell in pixels
const characterSize = 20; // Size of the character (circle)
const arrowSize = 10; // Size of arrows
const maxArrows = 3; // Maximum number of arrows allowed at once

// Game state
let character = {
    x: 5, // Starting position (column)
    y: 5, // Starting position (row)
    direction: 'right', // Initial direction
    arrows: [], // Active arrows
    speed: 1.5, // Reduced movement speed in pixels per frame
    arrowCount: maxArrows,  // Available arrows
    lastRefillTime: Date.now()  // Time of last arrow refill
};

let keysPressed = {}; // Track pressed keys

// Maze grid (1 = wall, 0 = path)
let maze = [
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 1, 1, 0]
];

// Set canvas dimensions
canvas.width = gridSize * cellSize;
canvas.height = gridSize * cellSize;

// Add focus handling
canvas.addEventListener('click', function() {
    canvas.focus();
});

function drawMaze() {
    // Clear with a dark background for better contrast
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            // Draw grid lines for better visibility
            ctx.strokeStyle = '#444';
            ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
            
            if (maze[row][col] === 1) {
                // Draw walls in white
                ctx.fillStyle = '#aaa';
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
    }
}

function drawCharacter() {
    ctx.fillStyle = '#f00'; // Red color for character
    
    // Draw a triangle indicating direction
    const centerX = character.x * cellSize + cellSize/2;
    const centerY = character.y * cellSize + cellSize/2;
    
    ctx.beginPath();
    
    switch(character.direction) {
        case 'up':
            ctx.moveTo(centerX, centerY - characterSize/2);
            ctx.lineTo(centerX - characterSize/2, centerY + characterSize/2);
            ctx.lineTo(centerX + characterSize/2, centerY + characterSize/2);
            break;
        case 'down':
            ctx.moveTo(centerX, centerY + characterSize/2);
            ctx.lineTo(centerX - characterSize/2, centerY - characterSize/2);
            ctx.lineTo(centerX + characterSize/2, centerY - characterSize/2);
            break;
        case 'left':
            ctx.moveTo(centerX - characterSize/2, centerY);
            ctx.lineTo(centerX + characterSize/2, centerY - characterSize/2);
            ctx.lineTo(centerX + characterSize/2, centerY + characterSize/2);
            break;
        case 'right':
            ctx.moveTo(centerX + characterSize/2, centerY);
            ctx.lineTo(centerX - characterSize/2, centerY - characterSize/2);
            ctx.lineTo(centerX - characterSize/2, centerY + characterSize/2);
            break;
    }
    
    ctx.closePath();
    ctx.fill();
}

function drawArrows() {
    ctx.fillStyle = '#ff0'; // Yellow for arrows
    character.arrows.forEach(arrow => {
        ctx.fillRect(arrow.x * cellSize + (cellSize - arrowSize) / 2, 
                   arrow.y * cellSize + (cellSize - arrowSize) / 2, 
                   arrowSize, arrowSize);
    });
}

// NEW GLOBAL STATE FOR BADDIES
let nests = [];        // Array of nest objects {x, y, hp}
let spiders = [];      // Array of spider objects {x, y, speed, state}
let characterLives = 3; // Character has three lives

// Function to spawn a nest at a random open cell in the maze
function spawnNest() {
    let placed = false;
    while (!placed) {
        let randRow = Math.floor(Math.random() * gridSize);
        let randCol = Math.floor(Math.random() * gridSize);
        if (maze[randRow][randCol] === 0) {
            nests.push({
                x: randCol,
                y: randRow,
                hp: 3 // Three hits required to destroy a nest
            });
            placed = true;
        }
    }
}

// Modify init() to randomly position the character in an open cell and spawn multiple nests
function init() {
    resizeCanvas();
    generateMaze();
    
    // Place character at a random open cell (maze cell value 0)
    let placed = false;
    while (!placed) {
        let randRow = Math.floor(Math.random() * gridSize);
        let randCol = Math.floor(Math.random() * gridSize);
        if (maze[randRow][randCol] === 0) {
            character.x = randCol; 
            character.y = randRow;
            placed = true;
        }
    }
    
    // Spawn multiple nests (e.g., 3 nests)
    for (let i = 0; i < 3; i++) {
        spawnNest();
    }
    
    setupControls();
    gameLoop();
}

// Function to spawn spiders from nests (called each update)
function spawnSpiders() {
    if (gameOver) return;
    nests.forEach(nest => {
        // Increased probability from 0.01 to 0.03
        if (Math.random() < 0.03) {
            spiders.push({
                x: nest.x,
                y: nest.y,
                speed: 0.05,          // Base wandering speed
                state: 'wandering'    // 'wandering' or 'chasing'
            });
        }
    });
}

// Update spiders behavior each frame
function updateSpiders() {
    spiders.forEach((spider, i) => {
        // Check if any arrow is nearby—if so, enter chasing mode.
        let nearArrow = character.arrows.some(arrow => {
            let dx = arrow.x - spider.x;
            let dy = arrow.y - spider.y;
            return Math.sqrt(dx * dx + dy * dy) < 2; // Detection range
        });
        if (nearArrow) {
            spider.state = 'chasing';
            spider.speed = character.speed * 1.1; // Slightly faster than player
        } else {
            spider.state = 'wandering';
            spider.speed = 0.05;
        }
        if (spider.state === 'chasing') {
            // Move toward character
            let angle = Math.atan2(character.y - spider.y, character.x - spider.x);
            spider.x += Math.cos(angle) * spider.speed;
            spider.y += Math.sin(angle) * spider.speed;
        } else {
            // Random wandering motion
            spider.x += (Math.random() - 0.5) * spider.speed;
            spider.y += (Math.random() - 0.5) * spider.speed;
        }
        // If spider reaches the character (touches), lose a life and remove spider
        let dx = spider.x - character.x;
        let dy = spider.y - character.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.5) {
            characterLives--;
            console.log("Character hit! Lives left:", characterLives);
            spiders.splice(i, 1);
        }
    });
}

// Check collisions of arrows with spiders or nests
function checkArrowCollisions() {
    character.arrows.forEach((arrow, aIndex) => {
        // Check against spiders
        for (let s = spiders.length - 1; s >= 0; s--) {
            let dx = arrow.x - spiders[s].x;
            let dy = arrow.y - spiders[s].y;
            if (Math.sqrt(dx * dx + dy * dy) < 1) {
                // Remove spider and arrow upon hit
                spiders.splice(s, 1);
                character.arrows.splice(aIndex, 1);
                break;
            }
        }
        // Check against nests
        nests.forEach((nest, nIndex) => {
            let dx = arrow.x - nest.x;
            let dy = arrow.y - nest.y;
            if (Math.sqrt(dx * dx + dy * dy) < 1) {
                nest.hp--;
                character.arrows.splice(aIndex, 1);
                if (nest.hp <= 0) {
                    nests.splice(nIndex, 1);
                    console.log("Nest destroyed!");
                }
            }
        });
    });
}

// Render nests and spiders
function drawBaddies() {
    // Draw nests as larger purple circles
    nests.forEach(nest => {
        ctx.fillStyle = 'purple';
        ctx.beginPath();
        ctx.arc(nest.x * cellSize + cellSize / 2, nest.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
        // (Optional: draw legs or HP indicator)
    });
    // Draw spiders as small black circles with short legs
    spiders.forEach(spider => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(spider.x * cellSize + cellSize / 2, spider.y * cellSize + cellSize / 2, cellSize / 8, 0, Math.PI * 2);
        ctx.fill();
        // Draw four simple legs
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            let angle = i * (Math.PI / 2);
            let startX = spider.x * cellSize + cellSize / 2;
            let startY = spider.y * cellSize + cellSize / 2;
            let endX = startX + Math.cos(angle) * 5;
            let endY = startY + Math.sin(angle) * 5;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    });
}

function update() {
    // --- Movement update with sliding along walls ---
    // Calculate desired movement delta
    let deltaX = 0, deltaY = 0;
    if (keysPressed['ArrowUp']) {
        // moving up: decrease row
        deltaY = -character.speed / cellSize;
    }
    if (keysPressed['ArrowDown']) {
        deltaY = character.speed / cellSize;
    }
    if (keysPressed['ArrowLeft']) {
        deltaX = -character.speed / cellSize;
    }
    if (keysPressed['ArrowRight']) {
        deltaX = character.speed / cellSize;
    }
    
    let newX = character.x + deltaX;
    let newY = character.y + deltaY;
    
    // Try full move; if collision, try sliding along X and Y separately.
    if (!collision(newX, newY)) {
        character.x = newX;
        character.y = newY;
    } else {
        if (!collision(newX, character.y)) {
            character.x = newX;
        } else if (!collision(character.x, newY)) {
            character.y = newY;
        }
        // Otherwise stop (direct hit)
    }
    
    // --- Arrow refill logic ---
    let now = Date.now();
    // Refill one arrow every 500ms if below max
    if (character.arrowCount < maxArrows && now - character.lastRefillTime >= 500) {
        character.arrowCount++;
        character.lastRefillTime = now;
    }
    
    // Update arrows positions
    character.arrows.forEach(arrow => {
        switch (arrow.direction) {
            case 'up':
                arrow.y -= 1;
                break;
            case 'down':
                arrow.y += 1;
                break;
            case 'left':
                arrow.x -= 1;
                break;
            case 'right':
                arrow.x += 1;
                break;
        }
    });

    // Remove arrows that are out of bounds or hit walls
    character.arrows = character.arrows.filter(arrow => 
        arrow.x >= 0 && arrow.x < gridSize && arrow.y >= 0 && arrow.y < gridSize && maze[arrow.y][arrow.x] === 0
    );

    // Call spawnSpiders to possibly spawn new spiders from nests:
    spawnSpiders();
    // Update spider behaviors:
    updateSpiders();
    // Check for arrow collisions with spiders/nests:
    checkArrowCollisions();
}

function gameLoop() {
    update();
    drawMaze();
    drawCharacter();
    drawArrows();
    drawBaddies();
    requestAnimationFrame(gameLoop);
}

let lastTurnTime = Date.now();
const TURN_DELAY = 300; // milliseconds

// Update event handling to use keydown on the canvas
canvas.addEventListener('keydown', (e) => {
    e.preventDefault(); // Prevent browser default actions (like scrolling)
    let now = Date.now();
    switch (e.key) {
        case 'ArrowUp':
            keysPressed['ArrowUp'] = true;
            character.direction = 'up';
            break;
        case 'ArrowDown':
            keysPressed['ArrowDown'] = true;
            character.direction = 'down';
            break;
        case 'ArrowLeft':
            keysPressed['ArrowLeft'] = true;
            if (now - lastTurnTime >= TURN_DELAY) {
                character.direction = 'left';
                lastTurnTime = now;
            }
            break;
        case 'ArrowRight':
            keysPressed['ArrowRight'] = true;
            if (now - lastTurnTime >= TURN_DELAY) {
                character.direction = 'right';
                lastTurnTime = now;
            }
            break;
        case 'f':
            if (character.arrowCount > 0) {
                // Fire arrow using available arrows (not array length)
                character.arrows.push({ 
                    x: Math.floor(character.x), 
                    y: Math.floor(character.y), 
                    direction: character.direction 
                });
                character.arrowCount--;
                // Reset refill timer after firing
                character.lastRefillTime = Date.now();
            }
            break;
    }
});

canvas.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            keysPressed['ArrowUp'] = false;
            break;
        case 'ArrowDown':
            keysPressed['ArrowDown'] = false;
            break;
        case 'ArrowLeft':
            keysPressed['ArrowLeft'] = false;
            break;
        case 'ArrowRight':
            keysPressed['ArrowRight'] = false;
            break;
    }
});

gameLoop();

function collision(x, y) {
    return maze[Math.floor(y)][Math.floor(x)] === 1;
}
