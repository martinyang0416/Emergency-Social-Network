import { getStatusIcon } from "./utils/helper.js";
import { handleSpeedTestEvent, initializeSocket } from "./utils/socketUtils.js";
import { logout, verifyTokenAndRedirect } from "./utils/authUtils.js";
console.log("old", sessionStorage.getItem("username"));

document.addEventListener("DOMContentLoaded", function () {
    const onlineUsersElement = document.getElementById("list-1");
    const offlineUsersElement = document.getElementById("list-2");
    const unreadModal = document.createElement("div"); // Create modal container

    // Append modal to body
    document.body.appendChild(unreadModal);

    // Retrieve token from sessionStorage
    const token = sessionStorage.getItem("token");
    verifyTokenAndRedirect(token);

    const socket = initializeSocket();

    socket.on("updateUserList", function () {
        console.log("Received all users:");
        displayAllUsers();
    });

    // Listen for "check unread messages" event from the server
    socket.on("check unread messages", function () {
        console.log("Check unread messages triggered");
        displayAllUsers(); // Trigger unread check again
    });

    handleSpeedTestEvent(socket, logout);

    // Fetch and display all users initially
    displayAllUsers();

    // Function to fetch and display all users
    function displayAllUsers() {
        fetch("/users/allUsers", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`, // Include the token in the Authorization header
            },
        })
            .then((response) => response.json())
            .then((users) => {
                fetchUnreadUsers(users); // Fetch unread users and update the list
            })
            .catch((error) => {
                console.error("Error fetching users:", error);
            });
    }

    // Function to fetch users who have sent unread messages
    function fetchUnreadUsers(users) {
        fetch("/messages/unread", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`, // Include the token in the Authorization header
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const unreadUsers = data.unreadUsers || [];
                updateUserList(users, unreadUsers); // Pass users and unread users to update the list
            })
            .catch((error) => {
                console.error("Error fetching unread users:", error);
            });
    }

    // Function to update the user list
    function updateUserList(users, unreadUsers) {
        onlineUsersElement.innerHTML = "";
        offlineUsersElement.innerHTML = "";

        users.sort((a, b) => a.username.localeCompare(b.username));

        users.forEach((user) => {
            const listItem = document.createElement("li");
            listItem.classList.add(
                "list-group-item",
                "d-flex",
                "align-items-center",
                "justify-content-between",
                "flex-wrap"
            );

            // Create the status icon (default: help_center)
            const statusIcon = document.createElement("span");
            statusIcon.classList.add("material-symbols-outlined");

            // Get the appropriate icon and color based on the user's status
            const iconData = getStatusIcon(user.citizenStatus);
            statusIcon.textContent = iconData.icon;
            statusIcon.style.color = iconData.color;

            // Append the status icon and username to the list item
            const userNameSpan = document.createElement("span");
            userNameSpan.textContent = user.username;
            userNameSpan.style.marginLeft = "10px";

            listItem.appendChild(statusIcon);
            listItem.appendChild(userNameSpan);
            // Create the "Unread" button if there are unread messages from this user
            if (unreadUsers.includes(user.username)) {
                //unread sign
                const unreadButton = document.createElement("button");
                unreadButton.textContent = "Unread";
                unreadButton.classList.add("btn", "btn-warning", "ms-2");

                // Add event listener to open popup with unread messages
                unreadButton.addEventListener("click", () =>
                    openUnreadPopup(user.username)
                );

                listItem.appendChild(unreadButton);
            }

            // Create the "Chat" button
            const chatButton = document.createElement("button");
            chatButton.textContent = "Chat";
            chatButton.classList.add("btn", "btn-primary", "chat-btn");

            // Redirect to private chat page on click
            chatButton.onclick = () => {
                sessionStorage.setItem("recipient", user.username); // Store the recipient's username
                window.location.href = "/privateChat"; // Redirect to private chat page
            };

            // Add the button to the right side of the list item
            listItem.appendChild(chatButton);

            if (user.onLineStatus === "online") {
                onlineUsersElement.appendChild(listItem);
            } else {
                offlineUsersElement.appendChild(listItem);
            }
        });
    }

    function openUnreadPopup(sender) {
        unreadModal.innerHTML = ""; // Clear previous content

        // Fetch unread messages between current user and the sender
        fetch(`/messages/unread/${sender}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
        })
            .then((response) => response.json())
            .then((messages) => {
                console.log("Unread messages received:", messages); // Log the messages to check if fetch works

                if (messages.length === 0) {
                    console.log("No unread messages");
                    return; // Return early if no unread messages
                }

                // Create modal content container with new square box style
                const modalContent = document.createElement("div");
                modalContent.classList.add("modal-content", "p-3");
                modalContent.style.width = "40vh";
                modalContent.style.height = "80vh";
                modalContent.style.backgroundColor = "#fff";
                modalContent.style.border = "1px solid #ccc";
                modalContent.style.position = "fixed";
                modalContent.style.top = "50%";
                modalContent.style.left = "50%";
                modalContent.style.transform = "translate(-50%, -50%)";
                modalContent.style.zIndex = "9999";
                modalContent.style.overflowY = "auto"; // Allow scrolling if messages overflow

                // Create a banner with the sender's name
                const banner = document.createElement("div");
                banner.style.backgroundColor = "#007bff"; // Blue banner color
                banner.style.color = "#fff";
                banner.style.padding = "10px";
                banner.style.textAlign = "center";
                banner.style.fontSize = "18px";
                banner.style.fontWeight = "bold";
                banner.style.marginTop = "30px";
                banner.textContent = `Unread Messages from ${sender}`;

                const closeButton = document.createElement("button");
                closeButton.innerHTML = "&times;"; // "×" symbol for close
                closeButton.style.position = "absolute";
                closeButton.style.top = "10px";
                closeButton.style.right = "10px";
                closeButton.style.fontSize = "20px";
                closeButton.style.border = "none";
                closeButton.style.background = "transparent";
                closeButton.style.cursor = "pointer";
                closeButton.onclick = () => {
                    unreadModal.innerHTML = ""; // Clear modal content
                };

                modalContent.appendChild(closeButton); // Add the close button to the modal
                modalContent.appendChild(banner);

                // Display the unread messages with sender name, timestamp, and status
                messages.forEach((message) => {
                    const cardElement = document.createElement("div");
                    cardElement.className = "card border-success mb-3";

                    // Create card header
                    const cardHeaderElement = document.createElement("div");
                    cardHeaderElement.className =
                        "card-header d-flex justify-content-between align-items-center";

                    const senderAndStatusElement =
                        document.createElement("div"); // Create sender and status element
                    senderAndStatusElement.className =
                        "sender-info d-flex align-items-center";
                    const senderElement = document.createElement("strong"); // Create sender
                    senderElement.className = "sender-name text-truncate";
                    senderElement.textContent = message.message_sender; // Set sender name

                    // Determine the icon and color based on citizenStatus using the given cases
                    const statusIconData = getStatusIcon(
                        message.message_sender_status
                    );
                    const statusElement = document.createElement("span");
                    statusElement.className = "material-symbols-outlined ms-1";
                    statusElement.textContent = statusIconData.icon;
                    statusElement.style.color = statusIconData.color;

                    senderAndStatusElement.appendChild(senderElement);
                    senderAndStatusElement.appendChild(statusElement);

                    // Append sender and status to header
                    cardHeaderElement.appendChild(senderAndStatusElement);

                    // Create timestamp element for the header
                    const timeElement = document.createElement("small");
                    timeElement.className = "text-muted timestamp";
                    const messageDate = new Date(message.message_sent_time);
                    const formattedTime = `${messageDate.toLocaleDateString()} ${messageDate.toLocaleTimeString()}`;
                    timeElement.textContent = formattedTime;

                    cardHeaderElement.appendChild(timeElement);

                    // Create the card body (message content)
                    const cardBodyElement = document.createElement("div");
                    cardBodyElement.className = "card-body";

                    const messageContentElement = document.createElement("p");
                    messageContentElement.className =
                        "card-text message-content";
                    messageContentElement.textContent = message.message_text;

                    // Append message content to the card body
                    cardBodyElement.appendChild(messageContentElement);

                    // Append the header and body to the card
                    cardElement.appendChild(cardHeaderElement);
                    cardElement.appendChild(cardBodyElement);

                    // Append each message card to the modal content
                    modalContent.appendChild(cardElement);
                });

                // Add a button to redirect to the full private chat
                const chatButton = document.createElement("button");
                chatButton.classList.add("btn", "btn-primary", "mt-3");
                chatButton.style.width = "100%"; // Full-width button
                chatButton.textContent = "Go to Chat";
                chatButton.onclick = () => {
                    sessionStorage.setItem("recipient", sender); // Store the recipient's username
                    window.location.href = "/privateChat"; // Redirect to private chat page
                };

                modalContent.appendChild(chatButton);

                unreadModal.appendChild(modalContent);

                // Close popup when clicked outside
                document.addEventListener("click", function closeModal(e) {
                    if (!modalContent.contains(e.target)) {
                        unreadModal.innerHTML = ""; // Clear modal content
                        document.removeEventListener("click", closeModal);
                    }
                });
            })
            .catch((error) => {
                console.error("Error fetching unread messages:", error);
            });
    }
});
