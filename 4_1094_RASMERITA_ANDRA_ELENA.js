
const canvasImage = document.getElementById("canvasPrincipal");
const context = canvasImage.getContext("2d");

const canvasHistograma = document.getElementById("canvasHisto");
const contextHisto = canvasHistograma.getContext("2d");

// Elementele de control din pagina 
const inputFisier = document.getElementById("inputFisier");
const zonaDrop = document.getElementById("zonaDrop");

// Variabile in care tinem minte starea aplicatiei
let image = new Image(); 
let pixelDataOriginal = null; 
let imagineIncarcata = false; 

// Variabile pentru selectia cu mouse-ul 
let selectie = {
    x: 0, y: 0, w: 0, h: 0, activ: false
};
let startMouse = { x: 0, y: 0 }; 
let seTrageMouse = false; 
let seMutaSelectia = false; 

// Incarcare imagine
function proceseazaFisier(file) {
    const reader = new FileReader(); 

    reader.addEventListener("load", function(e) {
        const dataUrl = e.target.result; 
        
        image = document.createElement("img"); 
        
        // Asteptam sa se incarce imaginea in memorie
        image.addEventListener("load", function(e) {
            canvasImage.height = image.naturalHeight;
            canvasImage.width = image.naturalWidth;
            
            context.drawImage(image, 0, 0);

            // Salvam starea initiala a pixelilor in variabila noastra globala
            pixelDataOriginal = context.getImageData(0, 0, canvasImage.width, canvasImage.height);
            imagineIncarcata = true;

            // Resetam totul pentru noua imagine
            reseteazaSelectie();
            actualizeazaHistograma();
            actualizeazaInputuriScalare();
        });

        image.src = dataUrl; 
    });

    reader.readAsDataURL(file); 
}

// Eveniment cand alegem un fisier din butonul clasic
inputFisier.addEventListener("change", function(e) {
    if(e.target.files.length > 0) {
        proceseazaFisier(e.target.files[0]);
    }
});

// Drag & Drop
// Cand tragem imaginea peste zona 
zonaDrop.addEventListener("dragover", function(e) {
    e.preventDefault(); 
    zonaDrop.classList.add('activ');
});

// Cand iesim cu imaginea din zona
zonaDrop.addEventListener("dragleave", function(e) {
    zonaDrop.classList.remove('activ');
});

// Cand dam drumul la imagine
zonaDrop.addEventListener("drop", function(e) {
    e.preventDefault();
    zonaDrop.classList.remove('activ');
    
    const files = e.dataTransfer.files; 
    if(files.length > 0) {
        proceseazaFisier(files[0]);
    }
});


// Histograma
// Functia care calculeaza frecventa culorilor R, G, B
function actualizeazaHistograma() {
    // Luam coordonatele selectiei curente
    const sx = Math.floor(selectie.x);
    const sy = Math.floor(selectie.y);
    const sw = Math.floor(selectie.w);
    const sh = Math.floor(selectie.h);

    // Daca selectia e invalida, nu facem nimic
    if (sw <= 0 || sh <= 0) return;

    // Luam pixelii doar din zona selectata
    const data = context.getImageData(sx, sy, sw, sh).data;

    let vR = [];
    let vG = [];
    let vB = [];

    for(let i = 0; i < 256; i++) {
        vR.push(0);
        vG.push(0);
        vB.push(0);
    }

    // Parcurgem pixelii din imagine
    for(let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        // Incrementam contorul pentru valoarea gasita
        vR[r]++;
        vG[g]++;
        vB[b]++;
    }

    // Apelam functia care deseneaza graficul 
    deseneazaGrafic(vR, vG, vB);
}

// Functia care deseneaza efectiv barele histogramei
function deseneazaGrafic(vR, vG, vB) {
    contextHisto.clearRect(0, 0, canvasHistograma.width, canvasHistograma.height);
    
    let maxVal = 0;
    for(let i=0; i<256; i++) {
        if(vR[i] > maxVal) maxVal = vR[i];
        if(vG[i] > maxVal) maxVal = vG[i];
        if(vB[i] > maxVal) maxVal = vB[i];
    }

    const latimeBara = canvasHistograma.width / 256;

    contextHisto.globalCompositeOperation = 'screen'; 

    for(let i = 0; i < 256; i++) {
        let x = i * latimeBara;

        // Desenam bara rosie
        contextHisto.fillStyle = 'rgba(255, 0, 0, 0.6)';
        // Calculam inaltimea relativa la maxim
        let hR = (vR[i] / maxVal) * canvasHistograma.height;
        contextHisto.fillRect(x, canvasHistograma.height - hR, latimeBara, hR);

        // Desenam bara verde
        contextHisto.fillStyle = 'rgba(0, 255, 0, 0.6)';
        let hG = (vG[i] / maxVal) * canvasHistograma.height;
        contextHisto.fillRect(x, canvasHistograma.height - hG, latimeBara, hG);

        // Desenam bara albastra
        contextHisto.fillStyle = 'rgba(0, 0, 255, 0.6)';
        let hB = (vB[i] / maxVal) * canvasHistograma.height;
        contextHisto.fillRect(x, canvasHistograma.height - hB, latimeBara, hB);
    }
    
    // Resetam modul de desenare la normal
    contextHisto.globalCompositeOperation = 'source-over';
}


// Mouse si Selectie
// Functie care calculeaza pozitia mouse-ului relativa la canvas
function getMousePos(e) {
    const rect = canvasImage.getBoundingClientRect();
    const scaleX = canvasImage.width / rect.width;
    const scaleY = canvasImage.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Cand apasam click
canvasImage.addEventListener("mousedown", function(e) {
    if (!imagineIncarcata) return;
    const pos = getMousePos(e);

    // Verificam daca tinem Shift apasat ca sa mutam selectia existenta
    if (e.shiftKey && punctInSelectie(pos.x, pos.y)) {
        seMutaSelectia = true;
        // Calculam diferenta dintre mouse si coltul selectiei
        startMouse = { x: pos.x - selectie.x, y: pos.y - selectie.y };
    } else {
        seTrageMouse = true;
        selectie.activ = true;
        startMouse = { x: pos.x, y: pos.y };
        selectie.x = pos.x;
        selectie.y = pos.y;
        selectie.w = 0;
        selectie.h = 0;
    }
});

// Cand miscam mouse-ul
canvasImage.addEventListener("mousemove", function(e) {
    if (!imagineIncarcata) return;
    const pos = getMousePos(e);

    if (seMutaSelectia) {
        // Actualizam pozitia selectiei
        selectie.x = pos.x - startMouse.x;
        selectie.y = pos.y - startMouse.y;
        redeseneazaInterfata();
    } else if (seTrageMouse) {
        // Calculam latimea si inaltimea in timp ce tragem
        let wCurent = pos.x - startMouse.x;
        let hCurent = pos.y - startMouse.y;

        // Tratare caz cand tragem spre stanga
        if (wCurent < 0) {
            selectie.x = pos.x;
            selectie.w = Math.abs(wCurent);
        } else {
            selectie.x = startMouse.x;
            selectie.w = wCurent;
        }

        // Tratare caz cand tragem in sus 
        if (hCurent < 0) {
            selectie.y = pos.y;
            selectie.h = Math.abs(hCurent);
        } else {
            selectie.y = startMouse.y;
            selectie.h = hCurent;
        }
        redeseneazaInterfata();
    }
});

window.addEventListener("mouseup", function() {
    seTrageMouse = false;
    seMutaSelectia = false;
    
    // Actualizam casutele de text cu coordonatele
    if(selectie.w > 0) {
        document.getElementById("pozitieX").value = Math.floor(selectie.x + 20);
        document.getElementById("pozitieY").value = Math.floor(selectie.y + selectie.h/2);
    }
});

function punctInSelectie(x, y) {
    return x >= selectie.x && x <= selectie.x + selectie.w &&
           y >= selectie.y && y <= selectie.y + selectie.h;
}

// Functie care reseteaza selectia la toata imaginea
function reseteazaSelectie() {
    selectie = { x: 0, y: 0, w: canvasImage.width, h: canvasImage.height, activ: true };
    redeseneazaInterfata();
}

// Functia principala care redeseneaza tot canvas-ul
function redeseneazaInterfata() {
    if (!pixelDataOriginal) return;

    // Punem imaginea originala
    context.putImageData(pixelDataOriginal, 0, 0);

    // Desenam conturul selectiei peste ea
    if (selectie.activ && selectie.w > 0) {
        context.beginPath();
        // Desenam cu linie punctata alba
        context.setLineDash([6, 4]);
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.strokeRect(selectie.x, selectie.y, selectie.w, selectie.h);
        
        // Desenam inca o data cu negru si ca sa se vada pe orice fundal
        context.setLineDash([6, 4]);
        context.lineDashOffset = 5;
        context.strokeStyle = 'black';
        context.strokeRect(selectie.x, selectie.y, selectie.w, selectie.h);
        
        // Resetam linia la normal
        context.setLineDash([]);
        
        // Actualizam histograma doar pentru zona asta
        actualizeazaHistograma();
    }
}


// Filtre si efecte
document.getElementById("btnAplica").addEventListener("click", function() {
    if (!imagineIncarcata) return;
    
    const efect = document.getElementById("selectEfect").value;
    
    let sx = Math.floor(selectie.x);
    let sy = Math.floor(selectie.y);
    let sw = Math.floor(selectie.w);
    let sh = Math.floor(selectie.h);
    
    // Daca nu exista selectie, aplicam filtrul pe toata imaginea
    if (sw <= 0 || sh <= 0) {
        sx = 0; sy = 0;
        sw = canvasImage.width;
        sh = canvasImage.height;
    }

    // Luam datele pixelilor din zona tinta
    const imageData = context.getImageData(sx, sy, sw, sh);
    const data = imageData.data;

    // Trecem prin fiecare pixel si ii modificam culoarea
    for(let i = 0; i < data.length; i += 4) {
        let r = data[i];     // Rosu
        let g = data[i+1];   // Verde
        let b = data[i+2];   // Albastru

        if (efect === "albnegru") {
            // Facem media aritmetica a culorilor
            let avg = (r + g + b) / 3;
            r = g = b = avg;
        } 
        else if (efect === "invers") {
            // Inversam culorile (negativ)
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
        } 
        else if (efect === "sepia") {
            // Formula standard pentru Sepia
            let tr = 0.393*r + 0.769*g + 0.189*b;
            let tg = 0.349*r + 0.686*g + 0.168*b;
            let tb = 0.272*r + 0.534*g + 0.131*b;
            r = Math.min(255, tr);
            g = Math.min(255, tg);
            b = Math.min(255, tb);
        }
        else if (efect === "luminozitate") {
            // Crestem valorile cu 40%
            r = Math.min(255, r * 1.4);
            g = Math.min(255, g * 1.4);
            b = Math.min(255, b * 1.4);
        }
        else if (efect === "contrast") {
            // Algoritm pentru cresterea contrastului
            const factor = (259 * (128 + 255)) / (255 * (259 - 128));
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;
            
            // Ne asiguram ca valorile raman intre 0 si 255
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
        }

        data[i] = r;
        data[i+1] = g;
        data[i+2] = b;
    }

    context.putImageData(imageData, sx, sy);
    pixelDataOriginal = context.getImageData(0, 0, canvasImage.width, canvasImage.height);
    actualizeazaHistograma();
});


// Redimensionare
const inputLatime = document.getElementById("inputLatime");
const inputInaltime = document.getElementById("inputInaltime");

function actualizeazaInputuriScalare() {
    inputLatime.value = canvasImage.width;
    inputInaltime.value = canvasImage.height;
}

// Calculam automat inaltimea cand schimbam latimea
inputLatime.addEventListener("input", function() {
    if(!imagineIncarcata) return;
    let raport = canvasImage.height / canvasImage.width;
    inputInaltime.value = Math.round(inputLatime.value * raport);
});

inputInaltime.addEventListener("input", function() {
    if(!imagineIncarcata) return;
    let raport = canvasImage.width / canvasImage.height;
    inputLatime.value = Math.round(inputInaltime.value * raport);
});

document.getElementById("btnScalare").addEventListener("click", function() {
    if(!imagineIncarcata) return;

    let w = parseInt(inputLatime.value);
    let h = parseInt(inputInaltime.value);

    // Folosim un canvas temporar ca sa facem redimensionarea corecta
    let tempC = document.createElement("canvas");
    tempC.width = w;
    tempC.height = h;
    let tempCtx = tempC.getContext("2d");

    tempCtx.drawImage(canvasImage, 0, 0, w, h);

    // Copiem inapoi pe canvasul principal
    canvasImage.width = w;
    canvasImage.height = h;
    context.drawImage(tempC, 0, 0);

    // Actualizam datele originale
    pixelDataOriginal = context.getImageData(0, 0, w, h);
    reseteazaSelectie();
});


// Butonul de Crop
document.getElementById("btnTaiere").addEventListener("click", function() {
    if(!imagineIncarcata || selectie.w <= 0) return;

    // Luam datele doar din selectie
    let dataCrop = context.getImageData(selectie.x, selectie.y, selectie.w, selectie.h);
    
    // Micsoram canvasul
    canvasImage.width = selectie.w;
    canvasImage.height = selectie.h;
    
    // Punem imaginea taiata
    context.putImageData(dataCrop, 0, 0);
    pixelDataOriginal = context.getImageData(0, 0, canvasImage.width, canvasImage.height);
    
    reseteazaSelectie();
    actualizeazaInputuriScalare();
});

// Butonul de Stergere 
document.getElementById("btnStergere").addEventListener("click", function() {
    context.fillStyle = "#FFFFFF"; 
    context.fillRect(selectie.x, selectie.y, selectie.w, selectie.h);
    
    // Actualizam memoria
    pixelDataOriginal = context.getImageData(0, 0, canvasImage.width, canvasImage.height);
    actualizeazaHistograma();
});

// Butonul de Text
document.getElementById("btnText").addEventListener("click", function() {
    if(!imagineIncarcata) return;

    let text = document.getElementById("inputText").value;
    let x = parseInt(document.getElementById("pozitieX").value);
    let y = parseInt(document.getElementById("pozitieY").value);
    let size = document.getElementById("marimeText").value;
    let color = document.getElementById("culoareText").value;

    // Setam fontul si culoarea
    context.font = "bold " + size + "px Verdana";
    context.fillStyle = color;
    context.fillText(text, x, y);

    // Salvam modificarea 
    pixelDataOriginal = context.getImageData(0, 0, canvasImage.width, canvasImage.height);
});

// Butonul de Salvare
document.getElementById("btnSalvare").addEventListener("click", function() {
    const link = document.createElement("a"); 
    link.download = "proiect_imagine.png"; 
    
    link.href = canvasImage.toDataURL("image/png");
    link.click(); 
});

// Butonul de Reset
document.getElementById("btnReset").addEventListener("click", function() {
    if(!imagineIncarcata) return;

    // Revenim la dimensiunile naturale ale imaginii incarcate
    canvasImage.width = image.naturalWidth;
    canvasImage.height = image.naturalHeight;

    // Desenam imaginea originala din elementul <img>
    context.drawImage(image, 0, 0);
    
    // Actualizam memoria interna
    pixelDataOriginal = context.getImageData(0, 0, canvasImage.width, canvasImage.height);

    reseteazaSelectie();
    actualizeazaInputuriScalare();
});