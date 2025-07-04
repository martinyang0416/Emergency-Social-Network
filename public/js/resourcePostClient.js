import { appendMessage } from "./utils/helper.js";
import { handleSpeedTestEvent, initializeSocket } from "./utils/socketUtils.js";
import { logout, verifyTokenAndRedirect } from "./utils/authUtils.js";

document.addEventListener("DOMContentLoaded", function () {
    const messageForm = document.getElementById("messageForm");
    const messageInput = document.getElementById("messageInput");
    const messageContainer = document.getElementById("message-container");
    const chatRecipientElement = document.getElementById("chat-recipient"); // Display the recipient

    // Retrieve token and recipient from sessionStorage
    const token = sessionStorage.getItem("token");
    const recipient = sessionStorage.getItem("recipient"); // The user you're chatting with
    const currentUser = sessionStorage.getItem("username"); // Current logged in user
    chatRecipientElement.textContent = recipient; // Display the recipient's name in the banner

    verifyTokenAndRedirect(token);

    const socket = initializeSocket();

    // Listen for private messages
    socket.on("private message", function (msg) {
        console.log("Private message received:", msg);
        appendMessage(messageContainer, msg);
        scrollToBottom();
    });

    socket.on("newResource", function (msg) {
        console.log("New resource received:", msg);
        appendMessage(messageContainer, msg);
        scrollToBottom();
    });

    handleSpeedTestEvent(socket, logout);

    // Scroll to bottom of chat
    function scrollToBottom() {
        setTimeout(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 100);
    }

    // Fetch previous messages for this chat
    fetch(`/messages/private/${recipient}`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Include token in Authorization header
        },
    })
        .then((response) => response.json())
        .then((messages) => {
            console.log("Messages received from server:", messages);
            messageContainer.innerHTML = "";
            messages.forEach((msg) => appendMessage(messageContainer, msg));
            scrollToBottom();
        })
        .catch((error) => console.error("Error fetching messages:", error));

    // On form submit, send the message to both sender and recipient
    messageForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const messageText = messageInput.value;

        if (messageText) {
            const requestBody = {
                message: messageText,
                sender: sessionStorage.getItem("username") || "Anonymous",
                recipient: recipient, // Send message to the recipient
            };

            fetch("/messages/private", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            })
                .then((response) => response.json())
                .then((data) => {
                    socket.emit("private message", data); // Emit the message to the server for both users
                    messageInput.value = ""; // Clear the input field
                })
                .catch((error) =>
                    console.error("Error sending message:", error)
                );
        }
    });

    // Event listener to update `receiver_read_status` when the user leaves the chat
    window.addEventListener("beforeunload", function () {
        // Prepare the data to send, including the token
        const data = JSON.stringify({ currentUser, token });

        // Create a Blob with the appropriate MIME type
        const blob = new Blob([data], { type: 'application/json' });

        // Construct the URL
        const url = `/messages/private/markRead/${recipient}`;

        // Use navigator.sendBeacon to send the data
        navigator.sendBeacon(url, blob);
    });

});
