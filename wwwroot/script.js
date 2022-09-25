'use strict';

let isUpdatingTo = null;
let timeout = null;

const modes = ['Auto', 'Low', 'Medium', 'High'];

update();
window.setInterval(update, 5_000);

async function update() {
    let response = await fetch('/api/status');
    if (response.ok) {
        let json = await response.json();

        document.getElementById('mode').getElementsByTagName('span')[0].textContent = mode(json.mode);
        document.getElementById('mode').getElementsByTagName('span')[1].textContent = countdown(json.countdown);
        document.getElementById('mode').getElementsByTagName('span')[1].style.display = json.countdown > 0 ? 'inline' : 'none';

        document.getElementById('ventilation').getElementsByTagName('span')[0].textContent = json.ventilation;
        
        document.getElementById('fan').getElementsByTagName('span')[0].textContent = json.fan;
        
        document.getElementById('temp').getElementsByTagName('span')[0].textContent = json.temp;
        
        document.getElementById('humidity').getElementsByTagName('span')[0].textContent = json.humidity;
        

        let buttonToCheck = `mode-${json.mode}`;
        if (json.permanent && json.mode !== 0) {
            buttonToCheck = `mode-${json.mode + 10}`;
        }

        if (isUpdatingTo === null || isUpdatingTo === buttonToCheck) {
            document.getElementById(buttonToCheck).checked = true;

            if (isUpdatingTo === buttonToCheck) {
                resetUpdating();
            }
        }
    } else {
        console.error(`HTTP-Error: ${response.status}`);
    }
}

async function setVentilationMode(input) {
    if (isUpdatingTo !== null) {
        document.getElementById(isUpdatingTo).checked = true;
        return;
    }

    let response = await fetch('/api/ventmode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({mode: input.value})
    });

    if (response.ok) {
        setUpdating(input);
    } else {
        console.error(`HTTP-Error: ${response.status}`);
    }
}

function setUpdating(input) {
    input.className = 'updating';
    isUpdatingTo = input.id;
    timeout = window.setTimeout(resetUpdating, 30_000);
}

function resetUpdating() {
    if (isUpdatingTo != null) document.getElementById(isUpdatingTo).className = '';
    if (timeout != null) window.clearTimeout(timeout);

    isUpdatingTo = null;
    timeout = null;
}

function mode(mode) {
    if (mode >= 0 && mode <= 3) {
        return modes[mode];
    }

    return 'Unknown';
}

function countdown(remaining) {
    return `(${parseInt(remaining/60, 10)}m${(remaining%60).toString().padStart(2, '0')}s)`;
}
