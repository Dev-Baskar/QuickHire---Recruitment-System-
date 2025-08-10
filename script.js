document.addEventListener("mousemove", (e) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const offsetX = (e.clientX - centerX) / centerX;
    const offsetY = (e.clientY - centerY) / centerY;

    document.querySelectorAll(".floating-logo").forEach((logo, index) => {
        const movementStrength = 15;
        const moveX = offsetX * movementStrength * (index + 1) * 0.6;
        const moveY = offsetY * movementStrength * (index + 1) * 0.6;

        // Apply mouse movement as CSS variable
        logo.style.setProperty('--moveX', `${moveX}px`);
        logo.style.setProperty('--moveY', `${moveY}px`);
    });
});
