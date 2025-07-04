// announcementClient.js
import { initializePage } from "./baseClient.js";

document.addEventListener("DOMContentLoaded", function () {
    const announcementIndex = 2;
    initializePage(announcementIndex, false); // Do not display status for the announcement page
});
