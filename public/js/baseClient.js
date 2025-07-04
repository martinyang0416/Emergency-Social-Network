// baseClient.js
import { appendMessage } from "./utils/helper.js";
import {
    handleSpeedTestEvent,
    initializeSocket,
    handleLogoutEvent,
} from "./utils/socketUtils.js";
import { logout, verifyTokenAndRedirect } from "./utils/authUtils.js";

export function initializePage(index, displayStatus = true) {
    const messageForm = document.getElementById("messageForm");
    const messageInput = document.getElementById("messageInput");
    const messageContainer = document.getElementById("message-container");
    const fixedBottomContainer = document.getElementById(
        "fixed-bottom-container"
    );

    // Retrieve token from sessionStorage
    const token = sessionStorage.getItem("token");
    verifyTokenAndRedirect(token);

    // Retrieve user privilege from sessionStorage
    const privilege = sessionStorage.getItem("privilege");

    const socket = initializeSocket();

    if (index == 1) {
        socket.on("broadcast message", function (msg) {
            console.log("Broadcast message received:", msg);
            console.log("messag");
            appendMessage(messageContainer, msg, displayStatus);
            scrollToBottom();
        });
    } else {
        if (privilege === "citizen") {
            messageInput.disabled = true;
            messageInput.placeholder =
                "You are not allowed to send annoucements";
            // fixedBottomContainer.style.display = "none";
        }
        socket.on("broadcast annoucement", function (msg) {
            console.log("Broadcast message received:", msg);
            appendMessage(messageContainer, msg, displayStatus);
            scrollToBottom();
        });
    }

    handleLogoutEvent(socket);

    handleSpeedTestEvent(socket, logout);

    console.log(
        `Page with index ${index} loaded. Fetching previous messages...`
    );
    fetch(`/messages?messageId=${index}`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    })
        .then((response) => response.json())
        .then((messages) => {
            // console.log("Messages received from server:", messages);
            messageContainer.innerHTML = "";
            messages.forEach(function (msg) {
                // console.log("messageContainer: ", messageContainer);
                appendMessage(messageContainer, msg, displayStatus);
            });
            scrollToBottom();
        })
        .catch((error) => console.error("Error fetching messages:", error));

    messageForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const messageText = messageInput.value;

        if (messageText) {
            const requestBody = {
                message: messageText,
                sender: sessionStorage.getItem("username") || "Anonymous",
                index: index,
            };

            fetch(`/messages${index === 2 ? "/announcement" : ""}`, {
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
                    messageInput.value = "";
                })
                .catch((error) =>
                    console.error("Error sending message:", error)
                );
        }
    });
}

function scrollToBottom() {
    setTimeout(() => {
        const messageContainer = document.getElementById("message-container");
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 100);
}
