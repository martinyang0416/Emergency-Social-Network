// publicClient.js
import { initializePage } from "./baseClient.js";

document.addEventListener("DOMContentLoaded", function () {
    console.log(sessionStorage.getItem("username"));
    const publicWallIndex = 1;
    initializePage(publicWallIndex, true); // Display status for the public wall
});
