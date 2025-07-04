import { logout } from "./utils/authUtils.js";
import { getStatusIcon, appendMessage } from "./utils/helper.js";
import { initializeSocket } from "./utils/socketUtils.js";

document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");
    let criteria;

    const socket = initializeSocket();

    // Retrieve user privilege from sessionStorage
    const privilege = sessionStorage.getItem("privilege");
    console.log("User privilege:", privilege);

    // Determine the page and set the criteria based on the pathname
    const currentPage = window.location.pathname;

    switch (currentPage) {
        case "/home":
            criteria = "Name";
            break;
        case "/public":
            criteria = "PublicMessages";
            break;
        case "/announcement":
            criteria = "Announcements";
            break;
        case "/privateChat":
            criteria = "PrivateMessages";
            break;
        default:
            criteria = ""; // Default or empty if not on a specified page
            break;
    }

    console.log(`Current page: ${currentPage}, Criteria: ${criteria}`);

    // Fetch and insert header.html
    fetch("/header.html")
        .then((response) => response.text())
        .then((data) => {
            document.body.insertAdjacentHTML("afterbegin", data);

            // Now that header.html is inserted, initialize the page
            initializePage();
        });

    function initializePage() {
        // Now we can access elements from header.html
        // const searchResultContainer = document.getElementById("search-results");
        const statusButton = document.getElementById("status-button");
        const shareStatusMenu = document.getElementById("share-status");
        const chooseStatusMenu = document.getElementById("choose-status");
        const shareStatusOption = document.querySelector(
            "#share-status .dropdown-item"
        );
        const searchInput = document.getElementById("header-search-input");
        const searchForm = document.getElementById("headerSearchForm");
        const moreButton = document.querySelector(".popup-footer .more-button");
        const stopButton = document.getElementById("stop");
        const alertButton = document.getElementById("alert-button");

        // Get references to new elements
        const searchOverlay = document.getElementById("search-overlay");
        const closeButton = document.getElementById("close-search-popup");
        const searchResultContainer = document.getElementById(
            "search-results-content"
        );
        // const allUsersDropdownButton = document.getElementById(
        //     "listAllUsersDropdown"
        // );
        const searchSection = document.querySelector(".search-section");

        // make the "Load more" button invisible by default
        moreButton.style.display = "none";

        setupHeaderEvents();
        getUserStatusAndUpdateIcon();
        getPostAlertAndUpdateIcon();

        const adminButtonContainer = document.getElementById(
            "admin-button-container"
        );
        const adminIconButton = document.getElementById("admin-icon-button");

        adminIconButton.style.display = "none";

        console.log(adminButtonContainer.style.display);
        if (privilege !== "citizen") {
            adminIconButton.style.display = "flex";
        }

        if (privilege === "administrator") {
            if (adminButtonContainer) {
                const adminButton = document.createElement("button");
                adminButton.className = "btn btn-primary mx-1";
                adminButton.id = "admin-button";
                adminButton.textContent = "Admin";
                adminButton.addEventListener("click", function () {
                    window.location.href = "/admin";
                });
                adminButtonContainer.appendChild(adminButton);
                const speedTestButton = document.createElement("button");
                speedTestButton.className = "btn btn-primary mx-1";
                speedTestButton.id = "speed-test-button"; // Changed id to avoid duplication
                speedTestButton.textContent = "Speed Test";
                speedTestButton.addEventListener("click", function () {
                    window.location.href = "/speedTest";
                });
                adminButtonContainer.appendChild(speedTestButton);
            } else {
                console.error("Admin button container not found");
            }
        }

        searchForm.addEventListener("submit", function (event) {
            event.preventDefault();
            searchSection.classList.add("fullscreen-height");

            searchResultContainer.innerHTML = ""; // Clear previous results

            offset = 10; // Reset the offset value

            const query = searchInput.value;

            if (currentPage === "/home") {
                if (
                    query === "ok" ||
                    query === "emergency" ||
                    query === "help" ||
                    query === "undefined"
                ) {
                    criteria = "Status";
                } else {
                    criteria = "Name";
                }
            }

            const sender = sessionStorage.getItem("username");
            const recipient = sessionStorage.getItem("recipient");

            // Perform the search
            console.log(`Searching for "${query}" by "${criteria}"`);

            fetch(`users/searchCriteria/${criteria}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query, sender, recipient }),
            })
                .then(async (response) => {
                    if (!response.ok) {
                        const errorData = await response.json();
                        searchResultContainer.innerHTML = `
                            <div class="error-message">
                                <p>No results found.</p>
                            </div>
                        `;
                        errorMessagePopup(errorData.message);
                        throw new Error(`Error: ${errorData.message}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    if (data.results.length === 0) {
                        moreButton.style.display = "none";
                        searchResultContainer.innerHTML =
                            "<p>No results found.</p>";
                        errorMessagePopup("No results found.");
                    } else {
                        // Call the appropriate display function based on criteria
                        if (
                            [
                                "Announcements",
                                "PublicMessages",
                                "PrivateMessages",
                            ].includes(criteria)
                        ) {
                            if (query == "status") {
                                searchResultContainer.innerHTML = "";
                                displayPrivateMessageSearchStatusResults(
                                    data.results,
                                    false
                                );

                                // Show the popup results
                                searchOverlay.style.display = "block";
                            } else {
                                searchResultContainer.innerHTML = "";
                                displaySearchMessagesResults(
                                    data.results,
                                    false
                                );

                                // Show the popup results
                                searchOverlay.style.display = "block";
                            }
                        } else {
                            searchResultContainer.innerHTML = "";
                            displaySearchResults(data.results, false);

                            // Show the popup results
                            searchOverlay.style.display = "block";
                        }
                    }
                })
                .catch((error) => {
                    console.error("Error during search:", error);
                });
        });

        // Add close button functionality
        closeButton.addEventListener("click", () => {
            searchOverlay.style.display = "none";
        });

        // Close popup when clicking outside
        searchOverlay.addEventListener("click", (event) => {
            if (event.target === searchOverlay) {
                searchOverlay.style.display = "none";
            }
        });

        alertButton.addEventListener("click", function () {
            const alertIcon = document.getElementById("alert-icon");
            alertIcon.textContent = "notifications";
            alertIcon.style.color = "green";
        });

        statusButton.addEventListener("click", function () {
            const isVisible = shareStatusMenu.style.display === "block";
            shareStatusMenu.style.display = isVisible ? "none" : "block";
            chooseStatusMenu.style.display = "none";
        });

        shareStatusOption.addEventListener("click", function (event) {
            event.preventDefault();
            const isVisible = chooseStatusMenu.style.display === "block";
            chooseStatusMenu.style.display = isVisible ? "none" : "block";
        });

        document.addEventListener("click", function (event) {
            if (
                !statusButton.contains(event.target) &&
                !shareStatusMenu.contains(event.target) &&
                !chooseStatusMenu.contains(event.target)
            ) {
                shareStatusMenu.style.display = "none";
                chooseStatusMenu.style.display = "none";
            }
        });

        const statusOptions = document.querySelectorAll(
            "#choose-status .dropdown-item"
        );
        statusOptions.forEach((option) => {
            option.addEventListener("click", function (event) {
                event.preventDefault();
                const status = this.getAttribute("data-status");
                updateStatus(status);
            });
        });

        function displaySearchMessagesResults(results, keepContent) {
            if (!keepContent) {
                searchResultContainer.innerHTML = "";
            }
            results.forEach((result) => {
                appendMessage(searchResultContainer, result);
            });
            // Show the "Load more" button if there are more results
            if (results.length <= 0) {
                errorMessagePopup("No more results found.");
            } else if (results.length >= 10) {
                moreButton.style.display = "block";
            } else {
                moreButton.style.display = "none";
            }
        }

        function displaySearchResults(results, keepContent) {
            // Get the content container inside the popup
            const searchResultsContent = document.getElementById(
                "search-results-content"
            );

            if (!keepContent) {
                searchResultsContent.innerHTML = "";
            }

            // Sort results by onlineStatus and alphabetic order
            results.sort((a, b) => {
                if (
                    a.onlineStatus === "online" &&
                    b.onlineStatus !== "online"
                ) {
                    return -1;
                }
                if (
                    a.onlineStatus !== "online" &&
                    b.onlineStatus === "online"
                ) {
                    return 1;
                }
                return a.username.localeCompare(b.username);
            });

            results.forEach((result) => {
                const resultItem = document.createElement("div");
                resultItem.classList.add(
                    "search-result-item",
                    "d-flex",
                    "align-items-center",
                    "mb-2"
                );

                // Make offline user grey
                if (result.onlineStatus === "offline") {
                    resultItem.style.backgroundColor = "gray";
                }

                // Get status icon
                const iconData = getStatusIcon(result.citizenStatus);

                // Create icon element
                const statusIcon = document.createElement("span");
                statusIcon.classList.add("material-symbols-outlined");
                statusIcon.textContent = iconData.icon;
                statusIcon.style.color = iconData.color;
                resultItem.appendChild(statusIcon);

                // Create and add username element
                const usernameElement = document.createElement("strong");
                usernameElement.textContent = ` ${result.username}`;
                usernameElement.style.marginLeft = "10px";
                resultItem.appendChild(usernameElement);

                // Append to the content container inside the popup
                searchResultsContent.appendChild(resultItem);
            });
        }

        function displayPrivateMessageSearchStatusResults(
            results,
            keepContent
        ) {
            if (!keepContent) {
                searchResultContainer.innerHTML = "";
            }
            results.forEach((result) => {
                const resultItem = document.createElement("div");
                resultItem.classList.add(
                    "search-result-item",
                    "d-flex",
                    "align-items-center",
                    "mb-2"
                );

                // Get status icon
                const iconData = getStatusIcon(result.citizenStatus);

                // Create icon element
                const statusIcon = document.createElement("span");
                statusIcon.classList.add("material-symbols-outlined");
                statusIcon.textContent = iconData.icon;
                statusIcon.style.color = iconData.color;
                resultItem.appendChild(statusIcon);

                // Create and add username element
                const usernameElement = document.createElement("strong");
                usernameElement.textContent = ` ${result.username}`;
                usernameElement.style.marginLeft = "10px";
                resultItem.appendChild(usernameElement);

                // Create and add time element
                const timeElement = document.createElement("small");
                const messageDate = new Date(result.statusTimestamp);
                const formattedTime = `${messageDate.toLocaleDateString()} ${messageDate.toLocaleTimeString()}`;

                timeElement.textContent = formattedTime;
                timeElement.style.marginLeft = "auto";
                timeElement.style.fontSize = "0.9em";
                resultItem.appendChild(timeElement);

                searchResultContainer.appendChild(resultItem);

                if (results.length <= 0) {
                    errorMessagePopup("No more results found.");
                } else if (results.length >= 10) {
                    moreButton.style.display = "block";
                } else {
                    moreButton.style.display = "none";
                }
            });
        }

        // Event listener for the "Stop" button which has no functions yet
        stopButton.addEventListener("click", function (event) {
            errorMessagePopup("No search process can stop.");
        });

        // Initial offset value
        let offset = 10;
        const limit = 10; // Number of results to load per request

        // Event listener for the "Load more" button
        moreButton.addEventListener("click", function (event) {
            event.preventDefault();

            const query = searchInput.value;
            const sender = sessionStorage.getItem("username");
            const recipient = sessionStorage.getItem("recipient");

            console.log(
                `Searching for "${query}" by "${criteria}" with offset ${offset}`
            );

            // Fetch more results with the updated offset
            fetch(
                `/users/searchCriteria/${criteria}?offset=${offset}&limit=${limit}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${sessionStorage.getItem(
                            "token"
                        )}`,
                    },
                    body: JSON.stringify({ query, sender, recipient }),
                }
            )
                .then(async (response) => {
                    if (!response.ok) {
                        const errorData = await response.json();
                        searchResultContainer.innerHTML = `
                    <div class="error-message">
                        <p>No results found.</p >
                    </div>
                    `;
                        errorMessagePopup(errorData.message);
                        throw new Error(`Error: ${errorData.message}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    if (query === "status") {
                        displayPrivateMessageSearchStatusResults(
                            data.results,
                            true
                        );
                    }
                    displaySearchMessagesResults(data.results, true);
                    offset += limit; // Update offset for the next request
                    console.log(`Offset updated to ${offset}`);

                    // Check if results exist and show/hide the "Load more" button accordingly
                    if (results.length <= 0) {
                        errorMessagePopup("No more results found.");
                    } else if (results.length >= 10) {
                        moreButton.style.display = "block";
                    } else {
                        moreButton.style.display = "none";
                    }
                })
                .catch((error) => {
                    console.error("Error fetching more results:", error);
                    //moreButton.style.display = 'none'; // Optionally hide the button on error
                });
        });

        // Utility function to show error message
        function errorMessagePopup(message) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: message,
            });
        }

        function showElement(element) {
            element.style.display = "block";
        }

        function hideElement(element) {
            element.style.display = "none";
        }

        function setupHeaderEvents() {
            const logoutButton = document.getElementById("logout-button");

            if (logoutButton) {
                logoutButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    console.log("logout button clicked");
                    logout();
                });
            }
        }

        // Fetch the user's current status and update the status icon
        function getUserStatusAndUpdateIcon() {
            const username = sessionStorage.getItem("username");

            fetch(`/users/${username}/citizenStatus`, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((response) => response.json())
                .then((user) => {
                    console.log("User data fetched:", user.citizenStatus);
                    const statusIcon = document.getElementById("status-icon");
                    updateStatusIcon(user.citizenStatus, statusIcon);
                    sessionStorage.setItem("citizenStatus", user.citizenStatus);
                    console.log("User status:", user.citizenStatus);
                    sessionStorage.setItem("userid", user.userid);
                })
                .catch((error) => {
                    console.error("Error fetching user status:", error);
                });
        }

        // receive socket event and update the alert icon -shangchien
        function getPostAlertAndUpdateIcon() {
            const username = sessionStorage.getItem("username");
            socket.on("newComment", function (data) {
                console.log("getPostAlertAndUpdateIcon", "ALERT TRIGGER");
                if (data.sender_name != username) {
                    getPostAlertAndUpdateIcon();
                }
                const alertIcon = document.getElementById("alert-icon");
                alertIcon.textContent = "notifications_active";
                alertIcon.style.color = "red";
            });
        }

        // Function to update the icon based on the citizenStatus
        function updateStatusIcon(citizenStatus, iconElement) {
            switch (citizenStatus) {
                case "OK":
                    iconElement.textContent = "check_circle";
                    iconElement.style.color = "green";
                    break;
                case "Help":
                    iconElement.textContent = "warning";
                    iconElement.style.color = "yellow";
                    break;
                case "Emergency":
                    iconElement.textContent = "e911_emergency";
                    iconElement.style.color = "red";
                    break;
                default:
                    iconElement.textContent = "help_center";
                    iconElement.style.color = "lightgrey";
                    break;
            }
        }

        // Update user's citizen status
        function updateStatus(newStatus) {
            const username = sessionStorage.getItem("username");
            console.log("Updating status for user:", username);
            console.log("New status:", newStatus);
            sessionStorage.setItem("citizenStatus", newStatus);
            const citizenzStatus = sessionStorage.getItem("citizenStatus");
            console.log(
                "sessionStoragesessionStoragesessionStoragesessionStoragesessionStorage",
                citizenzStatus
            );
            const requestBody = {
                username: username,
                citizenStatus: newStatus,
            };

            fetch(`/users/${username}/citizenStatus`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            })
                .then((response) => {
                    if (response.ok) {
                        console.log(`Status updated to ${newStatus}`);
                        const statusIcon =
                            document.getElementById("status-icon");
                        updateStatusIcon(newStatus, statusIcon);
                    } else {
                        console.error(
                            `Failed to update status: ${response.status}`
                        );
                    }
                })
                .catch((error) => {
                    console.error("Error updating status:", error);
                });
        }
    }
});
