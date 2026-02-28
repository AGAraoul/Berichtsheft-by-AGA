// js/sakura.js
function createSakura() {
    // Falls das Script mehrmals ausgeführt wird
    if (document.getElementById('sakura-container')) return;

    const container = document.createElement('div');
    container.id = 'sakura-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1'; // Hinter dem restlichen Inhalt
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    const petalCount = 45; // Anzahl der Kirschblüten

    for (let i = 0; i < petalCount; i++) {
        const petal = document.createElement('div');
        petal.classList.add('sakura-petal');

        // Zufällige Eigenschaften für jede Blüte
        const left = Math.random() * 100; // 0 bis 100 vw
        const animationDurationFall = 8 + Math.random() * 7; // 8 bis 15 Sekunden (entspannt)
        const animationDelay = Math.random() * 10; // 0 bis 10s
        const width = 10 + Math.random() * 12; // 10 bis 22px
        const height = width * 1.5; // Leicht ovale Blüten
        const opacity = 0.5 + Math.random() * 0.4; // 0.5 bis 0.9

        // Sway Eigenschaften für seitlichen Wind
        const swayDuration = 3 + Math.random() * 4; // 3 bis 7s

        petal.style.left = `${left}vw`;
        petal.style.width = `${width}px`;
        petal.style.height = `${height}px`;
        petal.style.opacity = opacity;

        // Wir übergeben Custom Properties an CSS
        petal.style.setProperty('--fall-duration', `${animationDurationFall}s`);
        petal.style.setProperty('--delay', `${animationDelay}s`);
        petal.style.setProperty('--sway-duration', `${swayDuration}s`);

        // Eine zufällige Rotation als Start- und Endwert
        petal.style.setProperty('--random-rotation-start', `${Math.random() * 360}deg`);
        petal.style.setProperty('--random-rotation-end', `${360 + Math.random() * 360}deg`);
        // Eine zufällige Verschiebung für den "Wind" (sway) Effekt
        petal.style.setProperty('--sway-x', `${(Math.random() - 0.5) * 80}px`);

        container.appendChild(petal);
    }
}

document.addEventListener('DOMContentLoaded', createSakura);
