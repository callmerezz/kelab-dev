const themeButton = document.querySelector(".theme-toggle");
const menuButton = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const savedTheme = localStorage.getItem("theme");

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (themeButton) {
        themeButton.textContent = theme === "dark" ? "Mod Cerah" : "Mod Gelap";
        themeButton.setAttribute(
            "aria-label",
            theme === "dark" ? "Tukar ke mod cerah" : "Tukar ke mod gelap"
        );
    }
}

setTheme(savedTheme === "dark" ? "dark" : "light");

if (themeButton) {
    themeButton.addEventListener("click", function () {
        const newTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem("theme", newTheme);
        setTheme(newTheme);
    });
}

if (menuButton && navLinks) {
    function setMenuOpen(isOpen) {
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute(
            "aria-label",
            isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"
        );
        navLinks.classList.toggle("is-open", isOpen);
    }

    menuButton.addEventListener("click", function () {
        setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });

    navLinks.addEventListener("click", function (event) {
        if (event.target.closest("a")) {
            setMenuOpen(false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            setMenuOpen(false);
        }
    });
}
