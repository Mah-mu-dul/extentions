function hidePlyrLogo() {
    const logo = document.getElementById("plyr-logo");
    if (logo) {
        logo.style.display = "none"; // Hide the logo
    }
}

// Continuously check for the logo every 500 milliseconds
setInterval(hidePlyrLogo, 10);
