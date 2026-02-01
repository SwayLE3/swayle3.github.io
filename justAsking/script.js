const terminalBody = document.getElementById('terminalBody');
let terminalInput = document.getElementById('terminalInput');

terminalInput.focus();

terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const command = terminalInput.value.trim();
        
        displayCommand(command);
        
        processCommand(command);
        
        createNewPrompt();
    }
});

function displayCommand(command) {
    const prompt = document.getElementById('currentPrompt');
    const input = prompt.querySelector('.terminal_input');
    const cursor = prompt.querySelector('.terminal_cursor');
    
    const commandSpan = document.createElement('span');
    commandSpan.textContent = command;
    commandSpan.style.color = '#dddddd';
    commandSpan.style.marginLeft = '4px';
    
    input.style.display = 'none';
    cursor.style.display = 'none';
    prompt.insertBefore(commandSpan, cursor);
}

function createConfetti() {
    const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = window.innerWidth / 2 + 'px';
        confetti.style.top = window.innerHeight / 2 + 'px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        document.body.appendChild(confetti);
        
        const angle = (Math.PI * 2 * i) / confettiCount;
        const velocity = 5 + Math.random() * 5;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity - 3;
        
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        let velX = vx;
        let velY = vy;
        
        const animate = () => {
            x += velX;
            y += velY;
            velY += 0.1; // gravity
            confetti.style.left = x + 'px';
            confetti.style.top = y + 'px';
            confetti.style.opacity = Math.max(0, 1 - (y - window.innerHeight / 2) / 300);
            
            if (y < window.innerHeight + 100) {
                requestAnimationFrame(animate);
            } else {
                confetti.remove();
            }
        };
        
        animate();
    }
}

function processCommand(command) {
    const responseDiv = document.createElement('div');
    responseDiv.className = 'terminal_response';
    responseDiv.style.marginLeft = '4px';
    responseDiv.style.marginTop = '2px';
    responseDiv.style.color = '#dddddd';
    
    if (command.toLowerCase() === 'yes') {
        responseDiv.textContent = '🥳';
        createConfetti();
        const gif = document.getElementById('myImg');
        if (gif) {
            gif.classList.add('show');
        }
    }else if (command.toLowerCase() === 'no'){
        window.location.href = "https://www.youtube.com/watch?v=xvFZjo5PgG0";
    }
     else if (command !== '') {
        responseDiv.textContent = `Commande non reconnue: ${command}`;
        responseDiv.style.color = '#ee411a';
    }
    terminalBody.appendChild(responseDiv);
}

function createNewPrompt() {
    const oldPrompt = document.getElementById('currentPrompt');
    if (oldPrompt) {
        oldPrompt.removeAttribute('id');
        const oldCursor = oldPrompt.querySelector('.terminal_cursor');
        if (oldCursor) {
            oldCursor.style.display = 'none';
        }
    }
    
    const newPrompt = document.createElement('div');
    newPrompt.className = 'terminal_promt';
    newPrompt.id = 'currentPrompt';
    
    newPrompt.innerHTML = `
        <span class="terminal_user">SwayLE3@admin:</span>
        <span class="terminal_location">~</span>
        <span class="terminal_bling">$</span>
        <input type="text" class="terminal_input" id="terminalInput" autocomplete="off" spellcheck="false" />
        <span class="terminal_cursor"></span>
    `;
    
    terminalBody.appendChild(newPrompt);
    
    terminalInput = newPrompt.querySelector('#terminalInput');
    terminalInput.focus();
    
    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const command = terminalInput.value.trim();
            
            displayCommand(command);
            processCommand(command);
            createNewPrompt();
        }
    });
}

terminalBody.addEventListener('click', () => {
    const currentInput = document.getElementById('terminalInput');
    if (currentInput) {
        currentInput.focus();
    }
});
